import Phaser from 'phaser'
import { placeOfficeSprite } from './physics.js'
import { GAME_ART, DIRECTIONS, makeCharacterSheet } from './sprites.js'
import { makeRoomArt, makeDoorArt } from './room-art.js'
import { createOfficeWorld, findPath, canStand, nearInteraction, fixtureInteraction, facing, WALK_SPEED, RUN_SPEED, FOOT_RADIUS } from '../../shared/office/world.js'
import { createOfficeLife, COWORKER_SPEED } from '../../shared/office/life.js'
import { hashOf } from '../../shared/office.js'
import { gameLabel } from './labels.js'
import { officeCameraLayout } from '../../shared/office/camera.js'
import { CHARACTER, POSES, characterFrame } from '../../shared/office/character.js'
import { characterPreset } from './cast.js'
import { OFFICE_FPS, bindOfficeVisibility } from './clock.js'
import { officeLight } from '../../shared/office/lighting.js'
import { installCat } from './decor.js'
import { createOfficeView } from './view-3d.js'
import { loadOfficeCharacters } from './worker-3d.js'
import workerAsset from '../assets/office-worker/office-worker.glb'
import elevatorAsset from '../assets/elevator/elevator.glb'
import { loadOfficeElevator } from './elevator-3d.js'
import televisionAsset from '../assets/cinema/television.glb'
import { loadOfficeTelevision } from './television-3d.js'
import { inElevator } from '../../shared/office/elevator.js'
import { meetingPlaces, meetingCaption } from '../../shared/office/meeting.js'
import { createOfficeEncounter, conversationPlace } from '../../shared/office/interaction.js'

const EMOTES = {
  thinking: 'thinking', typing: 'typing', working: 'typing', reading: 'reading', waiting: 'waiting', speaking: 'speaking', away: 'away',
}

// Dev screenshot hooks can pin the scene clock; otherwise it follows local time.
const clockNow = () => typeof window !== 'undefined' && window.__OFFICE_TIME__ ? new Date(window.__OFFICE_TIME__) : new Date()

export async function createOfficeRenderer(element, { floor, lobby = false, reducedMotion = false, atElevator = false, signal, onSelect, onExit, onInteract, onCancelInteraction, onHint }) {
  const characters = await loadOfficeCharacters(workerAsset)
  let elevator, television
  try {
    signal?.throwIfAborted()
    elevator = await loadOfficeElevator(elevatorAsset); signal?.throwIfAborted()
    television = await loadOfficeTelevision(televisionAsset); signal?.throwIfAborted()
  } catch (error) { characters.dispose(); elevator?.dispose(); television?.dispose(); throw error }
  let current = floor, quiet = reducedMotion, selected = null, disposed = false, scene
  let path = [], destination = null, nearby = null, pending = null, paused = false, activity = null, interactionStation = null
  let interactionTarget = null
  let inspection = null
  let liftLatched = atElevator
  let meeting = null, meetingEntered = false
  const speech = new Map()
  const work = new Map()
  let encounter = { mode: null }, escortPath = [], escortGoal = null, escortPlanned = 0
  const keys = new Set()
  let resolveReady, rejectReady
  const ready = new Promise((resolve, reject) => { resolveReady = resolve; rejectReady = reject })

  class Office extends Phaser.Scene {
    constructor() { super('office') }
    preload() {
      for (const [name, url] of Object.entries(GAME_ART)) {
        if (name === 'dog') this.load.spritesheet(name, url, { frameWidth: 16, frameHeight: 16 })
        else this.load.image(name, url)
      }
      this.load.once('loaderror', file => rejectReady(new Error(`Could not load ${file.key}`)))
    }
    create() {
      if (disposed) return
      try {
        scene = this
        this.world = createOfficeWorld(current.members.length, lobby, current.id)
        if (atElevator) this.world.spawn = { ...this.world.elevator.center }
        this.life = createOfficeLife(this.world)
        this.encounter = createOfficeEncounter(this.world)
        this.light = officeLight(clockNow(), current.theme)
        this.view3d = createOfficeView(element, this.world, current, characters, elevator, television)
        this.images = Object.fromEntries(Object.keys(GAME_ART).map(name => [name, this.textures.get(name).getSourceImage()]))
        this.roomObjects = []
        this.paintRoom()
        const walls = this.physics.add.staticGroup()
        for (const rect of [...this.world.walls, ...this.world.furniture]) walls.add(this.add.rectangle(rect.x + rect.width / 2, rect.y + rect.height / 2, rect.width, rect.height, 0, 0))
        const b = this.world.bounds
        this.physics.world.setBounds(b.x, b.y, b.width, b.height)
        this.player = this.actor(this.outfit({ id: 'studio-visitor' }), this.world.spawn, 'You', { id: 'studio-visitor' })
        this.physics.add.collider(this.player.sprite, walls)
        this.actors = current.members.map((member, i) => {
          const actor = this.actor(this.outfit(member.bot), this.world.desks[i].home, member.bot.name, member.bot)
          actor.id = member.bot.id; actor.home = { ...this.world.desks[i].home }; actor.path = []; actor.avatarKey = JSON.stringify(member.bot.officeAvatar)
          this.physics.add.collider(actor.sprite, walls)
          return actor
        })
        this.dog = this.actor('dog', this.world.props.find(p => p.id === 'dog'), 'Momo')
        this.dog.label.setVisible(false)
        this.textures.addCanvas('door-closed', makeDoorArt(false)); this.textures.addCanvas('door-open', makeDoorArt(true))
        this.doors = this.world.doors.map(door => ({ ...door, open: false, until: 0,
          image: this.add.image(door.x, door.y - 24, 'door-closed').setOrigin(0).setDepth(door.y - 2) }))
        this.catFrames = installCat(this)
        this.cat = this.add.image(76, this.world.corridors[0].y + 30, this.catFrames[0]).setOrigin(.5, 1).setDepth(this.world.corridors[0].y + 30)
        this.marker = this.add.graphics().setDepth(2)
        this.ambient = []
        this.dust = []
        this.puffs = []
        this.lastPuff = 0
        this.buildAmbience()
        this.cameraSetup()
        this.cameras.main.fadeIn(quiet ? 0 : 280, 24, 38, 35)
        this.input.on('pointerdown', pointer => {
          if (paused) return
          element.focus({ preventScroll: true })
          const point = this.view3d.pointAt(pointer.x, pointer.y)
          if (!point) return
          const previous = interactionTarget?.id
          if (activity || interactionTarget) this.cancelInteraction()
          const actor = this.actors.find(a => a.id === point.targetId)
          const fixtureTarget = fixtureInteraction(point.fixtureId, point, this.world)
          const target = this.targets().find(t => t.id === point.targetId) ?? (actor ? this.targets().find(t => t.id === actor.id) : fixtureTarget ?? this.targets().find(t => Math.hypot(t.x - point.x, t.y - point.y) < 24))
          if (target?.id === previous) return
          if (target) this.approach(target)
          else if (canStand(point, this.world)) { pending = null; this.go(point) }
        })
        this.input.on('pointermove', pointer => {
          const point = this.view3d.pointAt(pointer.x, pointer.y)
          if (!point) { this.hovered = null; element.style.cursor = ''; return }
          const hovered = this.actors.find(a => a.id === point.targetId)
          this.hovered = hovered?.id ?? null
          const hot = Boolean(hovered)
            || this.world.props.some(p => Math.hypot(p.x - point.x, p.y - point.y) < 18)
            || Boolean(fixtureInteraction(point.fixtureId, point, this.world))
          element.style.cursor = hot ? 'pointer' : ''
        })
        this.input.on('pointerout', () => { this.hovered = null })
        this.scale.on('resize', () => this.cameraSetup())
        resolveReady()
      } catch (error) { rejectReady(error) }
    }
    paintRoom() {
      const now = clockNow()
      this.light = officeLight(now, current.theme)
      if (this.view3d) { this.lightId = this.light.id; return }
      const art = makeRoomArt(this.world, current.theme, this.images, now)
      for (const object of this.roomObjects) { object.image.destroy(); this.textures.remove(object.key) }
      this.roomObjects = []
      const add = (key, canvas, x, y, depth) => { this.textures.addCanvas(key, canvas); this.roomObjects.push({ key, image: this.add.image(x, y, key).setOrigin(0).setDepth(depth) }) }
      add('room-floor', art.background, 0, 0, -10)
      art.objects.forEach((object, i) => add(`room-object-${i}`, object.canvas, object.x, object.y, object.depth))
      this.lightId = art.light?.id
    }
    outfit(bot) {
      const key = `outfit-${hashOf(String(bot.id))}-${hashOf(JSON.stringify(bot.officeAvatar ?? null))}`
      if (!this.textures.exists(key)) {
        this.textures.addSpriteSheet(key, makeCharacterSheet(this.images, bot), { frameWidth: CHARACTER.width, frameHeight: CHARACTER.height })
        for (const [pose, meta] of Object.entries(POSES)) if (pose !== 'sitting') for (const direction of Object.keys(DIRECTIONS)) this.anims.create({
          key: `${key}-${pose}-${direction}`,
          frames: Array.from({ length: meta.frames }, (_, frame) => ({ key, frame: characterFrame(direction, pose, frame) })),
          frameRate: pose === 'walk' ? 8 : 3, repeat: -1,
        })
      }
      return key
    }
    actor(art, position, name, bot) {
      const pet = art === 'dog', height = pet ? 16 : CHARACTER.height, footY = pet ? 13 : CHARACTER.footY
      const shadow = this.add.ellipse(position.x, position.y - 1, pet ? 13 : 11, pet ? 5 : 3, 0x342f28, pet ? .26 : .2)
      const sprite = this.physics.add.sprite(position.x, position.y, art, pet ? 0 : characterFrame()).setOrigin(.5, footY / height)
      sprite.body.setSize(FOOT_RADIUS * 2, FOOT_RADIUS * 2).setOffset((pet ? 8 : 8) - FOOT_RADIUS, footY - FOOT_RADIUS)
      sprite.setCollideWorldBounds(true)
      const label = gameLabel(this, name).setPosition(position.x, position.y - 36).setVisible(false)
      const bubble = gameLabel(this, '', { bubble: true }).setOrigin(.5, 1).setVisible(false)
      const prop = this.add.graphics()
      const emote = this.add.graphics().setVisible(false)
      const skin = { peach: 0xf0c49a, honey: 0xdca876, bronze: 0xb27a52, coffee: 0x83563d }[characterPreset(bot).skin] ?? 0xf0c49a
      return { sprite, shadow, label, bubble, prop, emote, emoteType: null, art, skin, presetId: characterPreset(bot).id, direction: 'down', state: 'idle', activity: 'idle', exit: null, stationId: null, holdingPhone: false }
    }
    position(actor) { return actor.exit ?? actor.sprite }
    workOf(id) {
      const entries = [...(work.get(id)?.values() ?? [])].filter(value => value.active)
      return { active: entries.length > 0, desk: entries.some(value => value.desk), tool: entries.find(value => value.desk)?.tool ?? entries[0]?.tool }
    }
    coworkers() {
      return this.actors.map(actor => {
        const member = current.members.find(m => m.bot.id === actor.id), live = work.has(actor.id) ? this.workOf(actor.id) : undefined
        return { id: actor.id, x: this.position(actor).x, y: this.position(actor).y, home: actor.home,
          doing: member?.here ? member.doing : live ? (live.active ? live : undefined) : member?.doing, desk: live?.active && live.desk }
      })
    }
    stand(actor) {
      if (!actor.exit) return
      const point = actor.exit
      actor.exit = null; actor.sprite.body.enable = true; placeOfficeSprite(actor.sprite, point)
      actor.sprite.setPosition(point.x, point.y)
    }
    sit(actor, station) {
      if (station?.poseX === undefined || actor.exit) return
      actor.exit = { x: station.x, y: station.y }
      actor.sprite.setVelocity(0); actor.sprite.body.enable = false; actor.sprite.setPosition(station.poseX, station.poseY)
    }
    seat(actor, point) {
      actor.exit = { x: point.x, y: point.y }
      actor.sprite.setVelocity(0); actor.sprite.body.enable = false; actor.sprite.setPosition(point.x, point.y)
    }
    cameraSetup() {
      const camera = this.cameras.main, box = element.getBoundingClientRect(), workspace = element.closest('.of-workspace')
      const top = workspace?.querySelector('.of-game-top')?.getBoundingClientRect(), bottom = workspace?.querySelector('.of-game-bottom')?.getBoundingClientRect()
      const panel = workspace?.querySelector('.of-activity-panel,.of-game-drawer')?.getBoundingClientRect()
      const dialogue = workspace?.querySelector('.of-game-dialogue')?.getBoundingClientRect()
      const lowerInset = Math.max(bottom ? box.bottom - bottom.top : 72, dialogue ? box.bottom - dialogue.top + 16 : 0)
      const layout = officeCameraLayout(this.scale.width, this.scale.height, this.world, { top: top ? top.bottom - box.top : 100, bottom: lowerInset, left: 248, right: panel ? Math.max(24, box.right - panel.left + 16) : 24 })
      const { zoom, viewport } = layout
      this.cameraMode = inspection ? 'inspect' : 'follow'
      camera.stopFollow().setViewport(viewport.x, viewport.y, viewport.width, viewport.height).setZoom(zoom).setRoundPixels(true)
      const padX = Math.max(0, (viewport.width / zoom - this.world.width) / 2), padY = Math.max(0, (viewport.height / zoom - this.world.height) / 2)
      camera.setBounds(-padX, -padY, this.world.width + 2 * padX, this.world.height + 2 * padY)
      if (inspection) camera.centerOn(inspection.x, inspection.y)
      else { camera.startFollow(this.player.sprite, true, quiet ? 1 : .14, quiet ? 1 : .14); camera.setDeadzone(40, 30) }
      this.view3d?.resize()
    }
    followPlayer() { inspection = null; this.view3d?.follow(); this.cameraSetup() }
    panTo(x, y) {
      inspection = { x: Math.max(0, Math.min(this.world.width, x)), y: Math.max(0, Math.min(this.world.height, y)) }
      this.cameraMode = 'inspect'; this.cameras.main.stopFollow().centerOn(inspection.x, inspection.y)
      this.view3d?.panTo(inspection.x, inspection.y)
    }
    targets() { return [...this.world.props, ...this.actors.map(actor => ({ id: actor.id, x: this.position(actor).x, y: this.position(actor).y, label: `Talk to ${actor.label.text}`, actor }))] }
    go(point) {
      this.encounter.interrupt()
      if (inspection) this.followPlayer()
      this.stand(this.player)
      path = findPath(this.player.sprite, point, this.world); destination = path.length ? point : null
      this.marker.clear()
      if (destination) {
        this.marker.lineStyle(1, 0xf3deb4, .8).strokeEllipse(point.x, point.y - 1, 8, 4)
        const ripple = this.add.ellipse(point.x, point.y - 1, 8, 4).setStrokeStyle(1, 0xfff0c0, .7).setDepth(point.y)
        this.tweens.add({ targets: ripple, scaleX: 2.4, scaleY: 2.4, alpha: 0, duration: 420, onComplete: () => ripple.destroy() })
      }
    }
    approach(target) {
      if (paused || activity) return
      if (nearInteraction(this.position(this.player), [target], this.world)) { this.interact(target); return }
      if (target.actor) {
        const spot = conversationPlace(this.world, target, this.position(this.player))
        if (spot) { pending = target.id; this.go(spot) }
        return
      }
      const options = [[0, 0], [0, 24], [24, 0], [-24, 0], [0, -24]].map(([x, y]) => ({ x: target.x + x, y: target.y + y }))
        .map(point => ({ point, route: findPath(this.position(this.player), point, this.world) })).filter(o => o.route.length).sort((a, b) => a.route.length - b.route.length)
      if (options.length) { pending = target.id; this.go(options[0].point) }
    }
    interact(target) {
      path = []; pending = null; destination = null; this.marker.clear(); this.player.sprite.setVelocity(0)
      if (target.actor) {
        target.actor.direction = facing(this.player.sprite.x - target.x, this.player.sprite.y - target.y)
        this.encounter.select(target.id, this.coworkers(), this.position(this.player), this.time.now)
        if (Math.hypot(this.player.sprite.x - target.x, this.player.sprite.y - target.y) < 24) {
          const spot = conversationPlace(this.world, this.position(target.actor), this.position(this.player))
          if (spot) { this.stand(this.player); path = findPath(this.position(this.player), spot, this.world) }
        }
        onSelect?.(target.id)
      }
      else if (target.id === 'lift') this.go(this.world.elevator.center)
      else {
        interactionTarget = ['meeting', 'meeting-board'].includes(target.kind) ? null : target
        interactionStation = this.world.stations.find(s => s.id === target.id)?.id ?? null
        if (target.id === 'dog' && !quiet) this.tweens.add({ targets: this.dog.sprite, y: this.dog.sprite.y - 4, duration: 110, yoyo: true, repeat: 1 })
        onInteract?.(target)
      }
    }
    sparkle(target) {
      const glow = this.add.graphics().setDepth(target.y + 20)
      glow.fillStyle(0xfff0b8, .9).fillRect(target.x - 4, target.y - 44, 1, 3).fillRect(target.x - 5, target.y - 43, 3, 1)
      this.tweens.add({ targets: glow, alpha: 0, duration: 650, onComplete: () => glow.destroy() })
    }
    move(actor, route, speed, delta) {
      const sprite = actor.sprite
      // Clamp to the next node on the final frame, so a slow frame cannot oscillate across it.
      while (route.length && Math.hypot(route[0].x - sprite.x, route[0].y - sprite.y) <= Math.max(2, speed * Math.min(delta, 50) / 1000)) {
        const point = route.shift(); placeOfficeSprite(sprite, point)
      }
      if (!route.length) { sprite.setVelocity(0); return }
      const dx = route[0].x - sprite.x, dy = route[0].y - sprite.y, d = Math.hypot(dx, dy)
      sprite.setVelocity(dx / d * speed, dy / d * speed)
    }
    emote(actor, type) {
      if (actor.emoteType === type) return
      actor.emoteType = type
      const graphics = actor.emote
      graphics.clear()
      graphics.setVisible(Boolean(type))
      if (!type) return
      const box = (x, y, w, h, color) => { graphics.fillStyle(color); graphics.fillRect(x, y, w, h) }
      box(-6, -8, 13, 11, 0x3a2b2b); box(-5, -7, 11, 9, 0xfff8e7)
      graphics.fillStyle(0x3a2b2b); graphics.fillRect(-3, 3, 2, 2); graphics.fillRect(0, 3, 2, 2); graphics.fillRect(3, 3, 2, 2)
      if (type === 'thinking') { for (const x of [-3, 0, 3]) box(x, -4, 1, 1, 0x5b4738) }
      else if (type === 'typing') { box(-4, -5, 9, 4, 0x39434b); box(-3, -4, 7, 2, 0x93c9b2); for (const x of [-2, 0, 2]) box(x, 1, 1, 1, 0x5b4738) }
      else if (type === 'reading') { box(-4, -5, 4, 5, 0xf6ecd4); box(1, -5, 4, 5, 0xf6ecd4); box(-4, -1, 9, 1, 0x5b4738); graphics.fillStyle(0x3a2b2b); graphics.fillRect(-1, -5, 1, 5) }
      else if (type === 'waiting') { box(-1, -6, 2, 4, 0xd9a94e); box(-1, -1, 2, 2, 0xd9a94e) }
      else if (type === 'speaking') { box(-2, -6, 2, 5, 0x6d8a66); box(0, -5, 3, 2, 0x6d8a66); box(-3, -2, 1, 1, 0x6d8a66) }
      else if (type === 'away') { for (const [x, y] of [[-3, -5], [0, -2], [3, 1]]) { box(x, y, 3, 1, 0x6d8a66); box(x + 2, y - 1, 1, 3, 0x6d8a66) } }
    }
    animate(actor, time, moving) {
      const { sprite, shadow, label, bubble, prop } = actor
      actor.direction = facing(sprite.body.velocity.x, sprite.body.velocity.y, actor.direction)
      if (actor.art === 'dog') sprite.setFrame(!quiet && Math.floor(time / 450) % 4 === 0 ? 4 : 0)
      else if (actor.exit) { sprite.anims.stop(); sprite.setFrame(characterFrame(actor.direction, 'sitting', 0)) }
      else if (!moving && actor.activity === 'exercise' && !quiet) { sprite.anims.stop(); sprite.setFrame(characterFrame(actor.direction, 'walk', Math.floor(time / 160) % 4)) }
      else if (quiet && !moving) { sprite.anims.stop(); sprite.setFrame(characterFrame(actor.direction)) }
      else { sprite.play(`${actor.art}-${moving ? 'walk' : 'idle'}-${actor.direction}`, true); sprite.anims.timeScale = actor === this.player && keys.has('shift') ? 1.4 : 1 }
      sprite.setDepth(sprite.y)
      shadow.setPosition(sprite.x, sprite.y - 1).setDepth(sprite.y - .1).setVisible(!actor.exit)
      label.setPosition(sprite.x, sprite.y - 36).setDepth(sprite.y + 3)
      bubble.setPosition(sprite.x, sprite.y - 42).setDepth(sprite.y + 4)
      prop.clear().setPosition(sprite.x, sprite.y).setDepth(sprite.y + .4)
      const bob = quiet ? 0 : Math.floor(time / 700) % 2
      if (!moving && actor.activity === 'reading') {
        prop.fillStyle(0x775a45).fillRect(-6, -14, 12, 8).fillStyle(0xeee0b7).fillRect(-5, -13, 5, 6).fillRect(1, -13, 5, 6)
        prop.fillStyle(0xb7a783).fillRect(-4, -11 + bob, 3, 1).fillRect(2, -11, 3, 1).fillStyle(actor.skin).fillRect(-7, -11, 2, 3).fillRect(6, -11, 2, 3)
        if (!quiet && (actor === this.player ? activity?.flipUntil > time : time % 4200 < 350)) prop.fillStyle(0xfff5d6).fillRect(-1 + Math.floor(time / 70) % 5, -13, 2, 6)
      } else if (!moving && actor.activity === 'coffee') {
        if (actor !== this.player || activity?.progress >= .62) {
          prop.fillStyle(0xe6dcc1).fillRect(4, -15 - bob, 5, 6).fillRect(9, -14 - bob, 2, 3).fillStyle(0x805b3e).fillRect(5, -15 - bob, 4, 1)
          if (!quiet) prop.fillStyle(0xf5ead2, .65).fillRect(6, -18 - bob, 1, 2)
        } else prop.fillStyle(actor.skin).fillRect(-6 + bob, -16, 3, 2).fillRect(4 - bob, -16, 3, 2)
      } else if (!moving && actor.activity === 'drink') {
        prop.fillStyle(0xeadbb4).fillRect(4, -17, 5, 8).fillStyle(0x87a66f).fillRect(5, -14, 4, 4).fillStyle(0xe5c877).fillRect(7, -18, 3, 2)
      } else if (!moving && actor.activity === 'meal') {
        prop.fillStyle(0x77553b).fillRect(-8, -16, 17, 9).fillStyle(0xeee1b7).fillRect(-7, -15, 7, 7)
        prop.fillStyle(0x8ba86c).fillRect(1, -15, 4, 3).fillStyle(0xc38b55).fillRect(5, -15, 3, 3).fillStyle(0xe0bd7c).fillRect(1, -11, 7, 3)
      } else if (!moving && actor.activity === 'exercise') {
        const lift = quiet ? 0 : Math.floor(time / 300) % 2 * 5
        prop.fillStyle(actor.skin).fillRect(-9, -14 - lift, 3, 4).fillRect(7, -14 - lift, 3, 4)
        prop.fillStyle(0x46565b).fillRect(-11, -16 - lift, 7, 3).fillRect(5, -16 - lift, 7, 3)
        prop.fillStyle(0x253b43).fillRect(-12, -17 - lift, 2, 5).fillRect(-7, -17 - lift, 2, 5).fillRect(5, -17 - lift, 2, 5).fillRect(10, -17 - lift, 2, 5)
      } else if (!moving && actor.activity === 'arcade' && !quiet) prop.fillStyle(actor.skin).fillRect(-6 + bob, -14, 3, 2).fillRect(4 - bob, -14, 3, 2)
      if (actor !== this.player) {
        const emote = EMOTES[actor.state] ?? (actor.activity !== 'idle' && actor.activity !== 'walking' && actor.activity !== 'working' ? actor.activity : null)
        const visible = !actor.exit && !moving && emote && emote !== actor.emoteType ? emote : actor.emoteType
        this.emote(actor, actor.exit || moving ? null : emote ?? null)
        actor.emote.setPosition(sprite.x, sprite.y - 4).setDepth(sprite.y + 5)
        void visible
      }
    }
    buildAmbience() {
      const night = this.light.id === 'night'
      const count = quiet ? 0 : 26
      for (let i = 0; i < count; i++) {
        const x = 40 + Math.random() * (this.world.width - 80), y = 60 + Math.random() * (this.world.height - 120)
        const mote = this.add.rectangle(x, y, 1, 1, night ? 0xf2d78c : 0xfff1c0).setDepth(9000).setAlpha(0)
        this.ambient.push(this.tweens.add({ targets: mote, y: y - 12 - Math.random() * 18, x: x + (Math.random() - .5) * 18, alpha: { from: 0, to: night ? .9 : .5 }, duration: 3200 + Math.random() * 4200, delay: Math.random() * 4000, yoyo: true, repeat: -1 }))
        this.dust.push(mote)
      }
      for (const fixture of this.world.furniture.filter(f => f.kind === 'coffee')) for (let i = 0; i < 4; i++) {
        const steam = this.add.rectangle(fixture.x + 30 + i * 4, fixture.y - 52, 1, 3, 0xfff4dc, .55).setDepth(fixture.y + 34)
        this.ambient.push(this.tweens.add({ targets: steam, y: fixture.y - 68, x: fixture.x + 34 + i * 4, alpha: 0, duration: 2200, delay: i * 500, repeat: -1, paused: quiet || this.light.id === 'night' }))
      }
      for (const [i, desk] of this.world.desks.entries()) {
        const cursor = this.add.rectangle(desk.x + 30, desk.y - 12, 2, 1, 0xe3efd0, .8).setDepth(desk.y + 34)
        this.ambient.push(this.tweens.add({ targets: cursor, alpha: 0, duration: 600, hold: 260, yoyo: true, repeat: -1, delay: i * 130, paused: quiet }))
      }
      if (this.catFrames?.length) {
        this.catIndex = 0
        this.catTimer = this.time.addEvent({ delay: 1400, loop: true, callback: () => { this.catIndex = (this.catIndex + 1) % this.catFrames.length; this.cat.setTexture(this.catFrames[this.catIndex]) } })
      }
    }
    puff(x, y) {
      const puff = this.add.rectangle(x + (Math.random() - .5) * 4, y, 2, 1, 0xe8dcc0, .55).setDepth(y - 1)
      this.puffs.push(puff)
      this.tweens.add({ targets: puff, y: y - 2, alpha: 0, duration: 280, onComplete: () => { puff.destroy(); this.puffs = this.puffs.filter(item => item !== puff) } })
    }
    updateDoors(time) {
      const people = [this.player, ...this.actors].map(actor => this.position(actor))
      for (const door of this.doors) {
        const near = people.some(person => Math.abs(person.x - door.x - door.width / 2) < 62 && Math.abs(person.y - door.y - door.height / 2) < 70)
        if (near) door.until = time + 650
        const open = near || time < door.until
        if (open !== door.open) {
          door.open = open
          door.image.setTexture(open ? 'door-open' : 'door-closed')
          if (open && !quiet) {
            const glow = this.add.ellipse(door.x + door.width / 2, door.y + 8, door.width * .8, 26, 0xffe9b8, .18).setDepth(door.y - 1)
            this.tweens.add({ targets: glow, alpha: 0, duration: 900, onComplete: () => glow.destroy() })
          }
        }
      }
    }
    update(time, delta) {
      if (!this.player || disposed) return
      this.frameCount = (this.frameCount ?? 0) + 1
      const started = performance.now()
      const player = this.player.sprite, active = document.activeElement === element && !paused && !activity && !meeting
      const previousMode = encounter.mode
      encounter = this.encounter.step(this.coworkers(), this.position(this.player), time, { quiet, blocked: paused || Boolean(activity) || Boolean(meeting) })
      if (encounter.mode === 'escort' && previousMode !== 'escort') { path = []; destination = null; pending = null; escortPath = []; escortGoal = null; this.marker.clear() }
      if (previousMode === 'escort' && encounter.mode === 'desk' && !paused) {
        const coworker = this.actors.find(actor => actor.id === encounter.id)
        if (coworker) this.player.direction = facing(coworker.home.x - player.x, coworker.home.y - player.y)
        const focused = document.activeElement
        if (focused?.matches('[contenteditable="true"]') && !focused.textContent.trim()) element.focus({ preventScroll: true })
      }
      let dx = 0, dy = 0
      if (active) { dx = Number(keys.has('d') || keys.has('arrowright')) - Number(keys.has('a') || keys.has('arrowleft')); dy = Number(keys.has('s') || keys.has('arrowdown')) - Number(keys.has('w') || keys.has('arrowup')) }
      if (meeting) player.setVelocity(0)
      else if (activity) this.updateActivity(time, delta)
      else if (dx || dy) { if (this.view3d.mode !== 'follow') this.followPlayer(); this.stand(this.player); path = []; pending = null; this.marker.clear(); const movement = this.view3d.movement(dx, dy), speed = keys.has('shift') ? RUN_SPEED : WALK_SPEED; player.setVelocity(movement.x * speed, movement.y * speed) }
      else if (!paused && encounter.mode === 'escort') {
        if (encounter.goal) {
          this.stand(this.player)
          if (!escortGoal || Math.hypot(escortGoal.x - encounter.goal.x, escortGoal.y - encounter.goal.y) > 16 || time - escortPlanned > 350) {
            escortGoal = encounter.goal; escortPlanned = time
            escortPath = findPath(this.position(this.player), escortGoal, this.world)
          }
          this.move(this.player, escortPath, RUN_SPEED, delta)
        } else player.setVelocity(0)
      }
      else if (!paused) this.move(this.player, path, WALK_SPEED, delta)
      else player.setVelocity(0)
      if (!path.length && destination) { destination = null; this.marker.clear() }
      if (!inElevator(player, this.world.elevator)) liftLatched = false
      else if (!liftLatched && !paused && !activity) {
        liftLatched = true; path = []; destination = null; player.setVelocity(0)
        this.view3d.panTo(this.world.elevator.center.x, this.world.elevator.center.y)
        onExit?.()
      }
      const targets = this.targets()
      const room = this.world.rooms.find(r => r.id === this.world.meeting?.roomId)
      const insideMeeting = room && player.x > room.x + 16 && player.x < room.x + room.width - 16 && player.y > room.y + 16 && player.y < room.y + room.height - 16
      if (!insideMeeting) meetingEntered = false
      else if (!meetingEntered && !meeting && !paused && !activity) {
        meetingEntered = true; path = []; destination = null; player.setVelocity(0)
        onInteract?.(this.world.props.find(p => p.kind === 'meeting'))
      }
      nearby = nearInteraction(this.position(this.player), targets, this.world)
      if (pending && !path.length) { const target = targets.find(t => t.id === pending); pending = null; if (target && nearInteraction(player, [target], this.world)) this.interact(target) }
      const hint = meeting ? 'Meeting in progress · End meeting to stand up' : encounter.mode === 'escort' ? 'Walking to the desk · Click or move to stop following' : encounter.held ? 'Face-to-face conversation · Move freely to leave' : 'Click to walk · WASD / arrows · Shift to run'
      if (hint !== this.lastHint) { this.lastHint = hint; onHint?.(hint) }
      if (!quiet && nearby && time > (this.nextSparkle ?? 0)) { this.nextSparkle = time + 1100; this.sparkle(nearby) }
      if (!quiet && player.body.speed > 2 && time > this.lastPuff + 190) { this.lastPuff = time; this.puff(player.x, player.y - 1) }
      for (const actor of this.actors) {
        const member = current.members.find(entry => entry.bot.id === actor.id)
        actor.state = member?.state ?? 'idle'
        const avatarKey = JSON.stringify(member?.bot.officeAvatar)
        if (member && actor.avatarKey !== avatarKey) {
          const previous = actor.art; actor.art = this.outfit(member.bot); actor.avatarKey = avatarKey; actor.sprite.anims.stop(); actor.sprite.setTexture(actor.art)
          const preset = characterPreset(member.bot)
          actor.presetId = preset.id
          for (const pose of ['walk', 'idle']) for (const direction of Object.keys(DIRECTIONS)) this.anims.remove(`${previous}-${pose}-${direction}`)
          this.textures.remove(previous)
        }
        if (member && actor.label.text !== member.bot.name) actor.label.setText(member.bot.name)
      }
      const lives = meeting ? {} : this.life.step(time, this.actors.map(a => ({ id: a.id, name: a.label.text, state: encounter.desk === a.id ? 'working' : a.state, x: this.position(a).x, y: this.position(a).y, home: a.home })), { quiet, held: encounter.held ? [encounter.held] : [], reserved: [activity?.stationId ?? interactionStation].filter(Boolean) })
      for (const actor of this.actors) {
        if (meeting) {
          this.meetingMove(actor, time, delta)
          const caption = this.caption(actor, time)
          actor.label.setVisible(Boolean(caption) || this.hovered === actor.id || selected === actor.id)
          this.animate(actor, time, actor.sprite.body.enable && actor.sprite.body.speed > 2)
          continue
        }
        const life = lives[actor.id], station = this.world.stations.find(s => s.id === life.stationId)
        actor.activity = life.activity; actor.stationId = life.stationId
        const working = encounter.desk === actor.id || this.workOf(actor.id).desk || actor.state !== 'idle' && actor.state !== 'away'
        const homeDistance = Math.hypot(this.position(actor).x - actor.home.x, this.position(actor).y - actor.home.y)
        if (encounter.held === actor.id) {
          this.stand(actor); actor.sprite.setVelocity(0); actor.path = []; actor.goal = null
          actor.direction = facing(player.x - actor.sprite.x, player.y - actor.sprite.y)
          this.player.direction = facing(actor.sprite.x - player.x, actor.sprite.y - player.y)
        } else if (life.goal) {
          if (working && homeDistance <= 8) {
            if (!actor.exit) this.seat(actor, actor.home)
            actor.path = []; actor.goal = null; actor.direction = 'up'
            if (station?.poseX !== undefined) this.sit(actor, station)
          } else {
            this.stand(actor)
            const goal = `${life.goal.x},${life.goal.y}`
            if (goal !== actor.goal || !actor.path.length && Math.hypot(actor.sprite.x - life.goal.x, actor.sprite.y - life.goal.y) > 4) actor.path = findPath(actor.sprite, life.goal, this.world)
            actor.goal = goal
            if (pending === actor.id && actor.state === 'idle') actor.sprite.setVelocity(0)
            else this.move(actor, actor.path, encounter.mode === 'escort' && encounter.id === actor.id ? WALK_SPEED : COWORKER_SPEED, delta)
          }
        } else {
          actor.path = []; actor.goal = null; actor.sprite.setVelocity(0)
          if (station?.poseX !== undefined) this.sit(actor, station)
          else if (homeDistance <= 8 && actor.state !== 'away') { if (!actor.exit) this.seat(actor, actor.home) }
          else this.stand(actor)
          actor.direction = !station && actor.exit ? 'up' : life.direction
        }
        if (life.activity === 'working' && Math.hypot(this.position(actor).x - actor.home.x, this.position(actor).y - actor.home.y) <= 8) actor.direction = 'up'
        const message = this.caption(actor, time) || life.line || null
        actor.bubble.setText(message ?? '').setVisible(Boolean(message))
        actor.label.setVisible(selected === actor.id || nearby?.id === actor.id || this.hovered === actor.id)
        actor.label.setBackgroundColor(selected === actor.id ? '#e2eadc' : '#faf5e9')
        this.animate(actor, time, actor.sprite.body.enable && actor.sprite.body.speed > 2)
      }
      if (meeting) this.meetingMove(this.player, time, delta)
      this.caption(this.player, time)
      this.animate(this.player, time, player.body.enable && player.body.speed > 2)
      this.animate(this.dog, time, false)
      this.updateDoors(time)
      // Repaint the baked lighting at a phase boundary, not on every frame.
      if (time > (this.nextLightCheck ?? 0)) {
        this.nextLightCheck = time + 45000
        const next = officeLight(clockNow(), current.theme)
        if (next.id !== this.lightId) this.paintRoom()
        else this.light = next
      }
      this.updateCpuMs = performance.now() - started
      this.view3d.update(this, current, time, quiet, selected, destination)
    }
    caption(actor, time) {
      const entry = speech.get(actor === this.player ? 'studio-visitor' : actor.id)
      const text = entry && entry.until > time ? entry.text : ''
      actor.bubble.setText(text).setVisible(Boolean(text))
      return text
    }
    startMeeting() {
      if (!this.world.meeting || meeting) return
      this.endActivity()
      this.encounter.clear(); escortPath = []; escortGoal = null
      meetingEntered = true
      meeting = { places: meetingPlaces(this.world, this.actors.map(a => a.id)), started: this.time.now, arrived: new Set(), entered: new Set(), zoom: this.view3d.cameraSnapshot().zoom }
      for (const actor of [this.player, ...this.actors]) { this.stand(actor); actor.path = []; actor.goal = null; actor.stationId = null; actor.sprite.setVelocity(0) }
      const room = this.world.rooms.find(r => r.id === this.world.meeting.roomId)
      this.view3d.panTo(room.x + 160, room.y + 128)
      this.view3d.zoomBy(1.45)
    }
    meetingMove(actor, time, delta) {
      const id = actor === this.player ? 'studio-visitor' : actor.id
      const place = meeting.places.find(p => p.id === id)
      if (!place || time - meeting.started < place.order * 250) { actor.sprite.setVelocity(0); return }
      if (meeting.arrived.has(id)) { actor.sprite.setVelocity(0); actor.direction = place.direction; return }
      const at = this.position(actor)
      const room = this.world.rooms.find(r => r.id === this.world.meeting.roomId)
      const inside = at.x > room.x + 16 && at.x < room.x + room.width - 16 && at.y > room.y + 16 && at.y < room.y + room.height - 16
      if (inside) meeting.entered.add(id)
      const released = place.order <= 1 || inside || meeting.entered.has(meeting.places[place.order - 1].id)
      const target = released ? place : place.queue
      if (Math.hypot(at.x - target.x, at.y - target.y) <= 3) {
        actor.sprite.setVelocity(0)
        if (!released) { actor.activity = 'idle'; actor.direction = room.y < 288 ? 'up' : 'down'; return }
        placeOfficeSprite(actor.sprite, place)
        if (place.seated) this.sit(actor, place)
        actor.direction = place.direction; actor.activity = 'idle'; actor.stationId = place.fixtureId ?? 'meeting-standing'
        meeting.arrived.add(id); return
      }
      const goal = `meeting:${id}:${released}`
      if (actor.goal !== goal || !actor.path.length) { actor.path = findPath(at, target, this.world); actor.goal = goal }
      actor.activity = 'walking'
      this.move(actor, actor.path, actor === this.player ? WALK_SPEED : 88, delta)
    }
    endMeeting() {
      if (!meeting) return
      const zoom = meeting.zoom
      meeting = null; speech.clear()
      for (const actor of [this.player, ...this.actors]) { this.stand(actor); actor.path = []; actor.goal = null; actor.stationId = null; actor.activity = 'idle' }
      this.life = createOfficeLife(this.world)
      this.view3d.zoomBy(zoom / this.view3d.cameraSnapshot().zoom)
      this.followPlayer()
    }
    beginActivity(kind, detail) {
      this.endActivity()
      const station = this.world.stations.find(s => s.id === interactionStation && s.kind === kind) ?? this.world.stations.find(s => s.kind === kind)
      if (!station) throw new Error('This activity is not available on this floor.')
      const route = findPath(this.position(this.player), station, this.world)
      if (!route.length) throw new Error('Please approach the activity from the aisle.')
      activity = { kind, detail, stationId: station.id, phase: 'walking', progress: 0, label: 'Finding a comfortable spot...', complete: false, started: null }
      this.player.activity = 'walking'; this.go(station)
    }
    endActivity() {
      activity = null; this.stand(this.player); this.player.activity = 'idle'; this.player.stationId = null
      path = []; destination = null; this.marker?.clear(); this.player.sprite.setVelocity(0)
    }
    setPhone(value) {
      const holding = Boolean(value)
      if (!this.player || this.player.holdingPhone === holding) return
      this.player.holdingPhone = holding
      if (!holding) return
      this.endActivity()
      this.stand(this.player)
      path = []; destination = null; pending = null; this.marker.clear()
      this.player.sprite.setVelocity(0)
      this.player.direction = 'down'
      this.player.activity = 'idle'
    }
    cancelInteraction() {
      this.endActivity(); interactionStation = null; interactionTarget = null; pending = null
      onCancelInteraction?.()
    }
    updateActivity(time, delta) {
      if (!activity) return
      const station = this.world.stations.find(s => s.id === activity.stationId)
      if (activity.phase === 'walking') {
        this.move(this.player, path, WALK_SPEED, delta)
        if (Math.hypot(this.player.sprite.x - station.x, this.player.sprite.y - station.y) > 3) return
        placeOfficeSprite(this.player.sprite, station)
        this.sit(this.player, station); this.player.direction = station.direction; this.player.stationId = station.id
        activity.started = time; activity.phase = 'using'; path = []; this.marker.clear()
      }
      this.player.sprite.setVelocity(0)
      this.player.activity = activity.kind
      const elapsed = time - activity.started
      if (activity.kind === 'coffee') {
        activity.progress = Math.min(1, elapsed / 7600)
        activity.label = elapsed < 1600 ? 'Grinding fresh beans...' : elapsed < 3800 ? 'Brewing your coffee...' : elapsed < 4800 ? 'Pouring a warm cup...' : elapsed < 7600 ? 'Taking a quiet sip...' : 'Refreshed and ready.'
        activity.phase = activity.progress === 1 ? 'complete' : 'using'; activity.complete = activity.progress === 1
      } else if (!activity.detail.manual) activity.label = activity.kind === 'reading' ? 'Settled in with a good book.' : activity.kind === 'rest' ? 'Taking a comfortable break.' : 'Playing Star catcher.'
    }
  }

  const game = new Phaser.Game({ type: Phaser.AUTO, parent: element, backgroundColor: '#263c39', width: Math.max(240, element.clientWidth), height: Math.max(240, element.clientHeight), pixelArt: true, roundPixels: true,
    banner: false, audio: { noAudio: true }, input: { keyboard: false }, fps: OFFICE_FPS, physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 }, fps: 60, fixedStep: true } }, scene: Office })
  game.canvas.classList.add('of-simulation-canvas')
  const observer = new ResizeObserver(() => {
    if (disposed) return
    const width = Math.max(240, element.clientWidth), height = Math.max(240, element.clientHeight)
    if (game.scale.width !== width || game.scale.height !== height) game.scale.resize(width, height)
    else scene?.cameraSetup()
  })
  observer.observe(element)
  const workspace = element.closest('.of-workspace')
  for (const hud of workspace?.querySelectorAll('.of-game-top,.of-game-bottom') ?? []) observer.observe(hud)
  let observedPanel = null
  const panelChanges = new MutationObserver(() => {
    const panel = workspace?.querySelector('.of-activity-panel,.of-game-dialogue,.of-game-drawer,.of-meeting-chat-wrap,.of-board-backdrop')
    if (panel === observedPanel) return
    if (observedPanel) observer.unobserve(observedPanel)
    observedPanel = panel ?? null
    if (observedPanel) observer.observe(observedPanel)
    scene?.cameraSetup()
  })
  if (workspace) panelChanges.observe(workspace, { childList: true })
  const clearKeys = () => keys.clear()
  const down = event => {
    const key = event.key.toLowerCase()
    if (!paused && ['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key) && (activity || interactionTarget)) scene?.cancelInteraction()
    if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'shift', 'e', 'enter'].includes(key)) {
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) { scene?.encounter.interrupt(); escortPath = []; escortGoal = null }
      event.preventDefault(); event.stopPropagation(); keys.add(key)
      if ((key === 'e' || key === 'enter') && !event.repeat && nearby && !paused && !activity) scene?.interact(nearby)
    }
  }
  const up = event => keys.delete(event.key.toLowerCase())
  element.addEventListener('keydown', down); element.addEventListener('blur', clearKeys)
  window.addEventListener('keyup', up); window.addEventListener('blur', clearKeys)
  let releaseVisibility = () => {}
  const destroy = () => {
    if (disposed) return
    signal?.removeEventListener('abort', abort)
    disposed = true; observer.disconnect(); panelChanges.disconnect(); keys.clear(); releaseVisibility()
    element.removeEventListener('keydown', down); element.removeEventListener('blur', clearKeys)
    window.removeEventListener('keyup', up); window.removeEventListener('blur', clearKeys)
    scene?.view3d?.destroy()
    characters.dispose()
    elevator.dispose()
    television.dispose()
    delete element.__officeDebug; game.destroy(true)
  }
  const abort = () => { rejectReady(signal.reason ?? new DOMException('Office closed', 'AbortError')); destroy() }
  signal?.addEventListener('abort', abort, { once: true })
  if (signal?.aborted) abort()
  try { await ready } catch (error) { destroy(); throw error }
  releaseVisibility = bindOfficeVisibility(game, document, clearKeys)
  const snapshot = () => {
    const camera = scene.cameras.main, start = camera.getWorldPoint(camera.x, camera.y), end = camera.getWorldPoint(camera.x + camera.width, camera.y + camera.height)
    const room = scene.world.rooms.find(r => scene.player.sprite.x >= r.x && scene.player.sprite.x <= r.x + r.width && scene.player.sprite.y >= r.y && scene.player.sprite.y <= r.y + r.height)
    return { engine: 'Three.js + Phaser 4.2.1', renderer: 'WebGL orthographic', view3d: scene.view3d.stats(), clock: 'timer', frameCount: scene.frameCount ?? 0, updateCpuMs: Math.round((scene.updateCpuMs ?? 0) * 100) / 100, fps: Math.round(game.loop.actualFps), fading: camera.fadeEffect.isRunning, light: scene.light,
      currentRoom: room ? { id: room.id, name: room.name, kind: room.kind } : { id: 'corridor', name: 'Corridor', kind: 'corridor' },
      camera: { x: camera.scrollX, y: camera.scrollY, zoom: camera.zoom, width: scene.scale.width, height: scene.scale.height, mode: scene.cameraMode,
        viewport: { x: camera.x, y: camera.y, width: camera.width, height: camera.height }, visibleWorld: { left: start.x, top: start.y, right: end.x, bottom: end.y }, ...scene.view3d.cameraSnapshot() },
      player: { x: scene.player.sprite.x, y: scene.player.sprite.y, direction: scene.player.direction, frame: scene.player.sprite.frame.name, seated: Boolean(scene.player.exit), holdingPhone: Boolean(scene.player.holdingPhone) }, nearby: nearby?.id, activity: activity ? { ...activity } : null,
      meeting: meeting ? { arrived: [...meeting.arrived], entered: [...meeting.entered], places: meeting.places } : null,
      encounter: { ...encounter },
      actors: scene.actors.map(a => ({ id: a.id, x: a.sprite.x, y: a.sprite.y, state: a.state, activity: a.activity, stationId: a.stationId, seated: Boolean(a.exit), direction: a.direction, presetId: a.presetId })),
      world: { ...scene.world, doors: scene.doors.map(d => ({ id: d.id, roomId: d.roomId, x: d.x, y: d.y, width: d.width, height: d.height, open: d.open })) }, canvasCount: element.querySelectorAll('canvas').length }
  }
  element.__officeDebug = { snapshot, project: (x, y, height) => scene.view3d.project(x, y, height) }
  return {
    select(id) {
      selected = id
      scene.encounter.select(id, scene.coworkers(), scene.position(scene.player), scene.time.now)
      escortPath = []; escortGoal = null
    },
    startMeeting() { if (!disposed) scene.startMeeting() },
    endMeeting() { if (!disposed) scene.endMeeting() },
    say(id, text) {
      if (disposed || !id) return
      const caption = meetingCaption(text, 40)
      if (caption) {
        speech.set(id, { text: caption, until: scene.time.now + 12000 })
        if (id === selected && !meeting) speech.delete('studio-visitor')
      }
    },
    work(id, value) {
      if (disposed) return
      if (!work.has(id)) work.set(id, new Map())
      work.get(id).set(value.sessionId ?? id, value)
      if (value.recentDesk) scene.encounter.requireDesk(id)
    },
    resetWork() { work.clear() },
    liftAnchor() { const p = scene.world.elevator.center; return scene.view3d.project(p.x, p.y, 30) },
    setLiftTravel(state) { scene.liftTravel = state },
    leaveLift() { if (!disposed) { scene.liftTravel = null; liftLatched = true; scene.followPlayer(); scene.go(scene.world.elevator.exit) } },
    approach(id) { const target = scene.targets().find(t => t.id === id); if (target) scene.approach(target) },
    setPaused(value) { paused = value; if (value) clearKeys() },
    setPhone(value) { if (!disposed) scene?.setPhone(value) },
    nearbyInteraction() {
      if (disposed || paused || activity || interactionTarget || !nearby) return null
      return { id: nearby.id, label: nearby.label, anchor: scene.view3d.project(nearby.x, nearby.y, 24) }
    },
    activateNearby() { if (!disposed && !paused && !activity && !interactionTarget && nearby) { element.focus({ preventScroll: true }); scene.interact(nearby) } },
    interruptActivity(key) { if (disposed || key && paused) return; scene.cancelInteraction(); if (key) keys.add(key); element.focus({ preventScroll: true }) },
    panTo(x, y) { if (!disposed) scene.panTo(x, y) }, followPlayer() { if (!disposed) scene.followPlayer() },
    zoomBy(factor) { if (!disposed) scene.view3d.zoomBy(factor) },
    rotateView() { if (!disposed) scene.view3d.rotate() },
    overview() { if (!disposed) scene.view3d.overview() },
    beginActivity(kind, detail = {}) { scene.beginActivity(kind, detail) }, endActivity() { if (!disposed) scene.endActivity() }, activity() { return activity ? { ...activity } : null },
    turnPage(page) { if (activity?.kind === 'reading') { activity.detail.page = page; activity.flipUntil = scene.time.now + 400 } },
    activityStep(detail) {
      if (!activity) return
      activity.progress = Math.max(0, Math.min(1, Number(detail.progress) || 0))
      activity.label = String(detail.label ?? activity.label); activity.detail = { ...activity.detail, ...detail }
      if (detail.complete) { activity.complete = true; activity.phase = 'complete' }
    },
    setReducedMotion(value) { quiet = value; for (const tween of scene.ambient ?? []) { if (value) tween.pause(); else tween.resume() } for (const mote of scene.dust ?? []) mote.setVisible(!value) },
    update(next) { const changed = JSON.stringify(current.theme) !== JSON.stringify(next.theme); current = next; if (changed && scene) scene.paintRoom() },
    snapshot, destroy,
  }
}
