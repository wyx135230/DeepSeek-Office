import Phaser from 'phaser'
import { placeOfficeSprite } from './physics.js'
import { GAME_ART, DIRECTIONS, makeCharacterSheet } from './sprites.js'
import { makeRoomArt, makeDoorArt } from './room-art.js'
import { createOfficeWorld, findPath, canStand, nearInteraction, facing, WALK_SPEED, RUN_SPEED, FOOT_RADIUS } from '../../shared/office/world.js'
import { createOfficeLife, COWORKER_SPEED } from '../../shared/office/life.js'
import { hashOf } from '../../shared/office.js'
import { gameLabel } from './labels.js'
import { officeCameraLayout } from '../../shared/office/camera.js'
import { CHARACTER, POSES, characterFrame } from '../../shared/office/character.js'
import { characterPreset } from './cast.js'

export async function createOfficeRenderer(element, { floor, lobby = false, reducedMotion = false, onSelect, onExit, onInteract, onHint }) {
  let current = floor, quiet = reducedMotion, selected = null, disposed = false, scene
  let path = [], destination = null, nearby = null, pending = null, paused = false, activity = null, interactionStation = null
  let inspection = null
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
      try {
        scene = this
        this.world = createOfficeWorld(current.members.length, lobby, current.id)
        this.life = createOfficeLife(this.world)
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
        this.ambient = []
        for (const fixture of this.world.furniture.filter(f => f.kind === 'coffee')) for (let i = 0; i < 3; i++) {
          const steam = this.add.rectangle(fixture.x + 98 + i * 4, fixture.y - 24, 2, 4, 0xf8ecd5, .6).setDepth(fixture.y + 33)
          this.ambient.push(this.tweens.add({ targets: steam, y: fixture.y - 43, x: fixture.x + 102 + i * 4, alpha: 0, duration: 2000, delay: i * 550, repeat: -1, paused: quiet }))
        }
        this.textures.addCanvas('door-closed', makeDoorArt(false)); this.textures.addCanvas('door-open', makeDoorArt(true))
        this.doors = this.world.doors.map(door => ({ ...door, open: false, until: 0,
          image: this.add.image(door.x, door.y - 44, 'door-closed').setOrigin(0).setDepth(door.y + door.height) }))
        for (const [i, desk] of this.world.desks.entries()) {
          const cursor = this.add.rectangle(desk.x + 42, desk.y - 16, 2, 2, 0xe3efd0).setDepth(desk.y + 33)
          this.ambient.push(this.tweens.add({ targets: cursor, alpha: 0, duration: 550, hold: 250, yoyo: true, repeat: -1, delay: i * 130, paused: quiet }))
        }
        this.marker = this.add.graphics().setDepth(2)
        this.cameraSetup()
        this.cameras.main.fadeIn(quiet ? 0 : 280, 24, 38, 35)
        this.input.on('pointerdown', pointer => {
          if (paused || activity) return
          element.focus({ preventScroll: true })
          const point = this.cameras.main.getWorldPoint(pointer.x, pointer.y)
          // The clickable body and the walk target use different positions.
          const actor = this.actors.find(a => Math.abs(a.sprite.x - point.x) < 18 && point.y < a.sprite.y && point.y > a.sprite.y - 48)
          const fixture = this.world.furniture.find(f => ['coffee', 'books', 'reading', 'arcade', 'dining-table', 'bar', 'exercise'].includes(f.kind) && point.x >= f.x - 4 && point.x <= f.x + f.width + 4 && point.y >= f.y - 48 && point.y <= f.y + f.height)
          const kind = { books: 'reading', 'dining-table': 'meal', bar: 'drink', exercise: 'exercise' }[fixture?.kind] ?? fixture?.kind
          const fixtureTarget = fixture ? this.world.props.filter(p => p.roomId === fixture.roomId && p.kind === kind).sort((a, b) => Math.hypot(a.x - point.x, a.y - point.y) - Math.hypot(b.x - point.x, b.y - point.y))[0] : null
          const target = actor ? this.targets().find(t => t.id === actor.id) : fixtureTarget ?? this.targets().find(t => Math.hypot(t.x - point.x, t.y - point.y) < 24)
          if (target) this.approach(target)
          else if (canStand(point, this.world)) { pending = null; this.go(point) }
        })
        this.scale.on('resize', () => this.cameraSetup())
        resolveReady()
      } catch (error) { rejectReady(error) }
    }
    paintRoom() {
      const art = makeRoomArt(this.world, current.theme, this.images)
      for (const object of this.roomObjects) { object.image.destroy(); this.textures.remove(object.key) }
      this.roomObjects = []
      const add = (key, canvas, x, y, depth) => { this.textures.addCanvas(key, canvas); this.roomObjects.push({ key, image: this.add.image(x, y, key).setOrigin(0).setDepth(depth) }) }
      add('room-floor', art.background, 0, 0, -10)
      art.objects.forEach((object, i) => add(`room-object-${i}`, object.canvas, object.x, object.y, object.depth))
    }
    outfit(bot) {
      const key = `outfit-${hashOf(bot.id)}-${hashOf(JSON.stringify(bot.officeAvatar))}`
      if (!this.textures.exists(key)) {
        this.textures.addSpriteSheet(key, makeCharacterSheet(this.images, bot), { frameWidth: CHARACTER.width, frameHeight: CHARACTER.height })
        for (const [pose, meta] of Object.entries(POSES)) if (pose !== 'sitting') for (const direction of Object.keys(DIRECTIONS)) this.anims.create({ key: `${key}-${pose}-${direction}`, frames: Array.from({ length: meta.frames }, (_, frame) => ({ key, frame: characterFrame(direction, pose, frame) })), frameRate: pose === 'walk' ? 10 : 2.5, repeat: -1 })
      }
      return key
    }
    actor(art, position, name, bot) {
      const pet = art === 'dog', height = pet ? 16 : 64, footY = pet ? 13 : CHARACTER.footY
      const shadow = this.add.ellipse(position.x, position.y - 2, pet ? 13 : 22, pet ? 5 : 7, 0x342f28, .24)
      const sprite = this.physics.add.sprite(position.x, position.y, art, pet ? 0 : characterFrame()).setOrigin(.5, footY / height)
      sprite.body.setSize(FOOT_RADIUS * 2, FOOT_RADIUS * 2).setOffset((pet ? 8 : 32) - FOOT_RADIUS, footY - FOOT_RADIUS)
      sprite.setCollideWorldBounds(true)
      const label = gameLabel(this, name).setPosition(position.x, position.y + 10).setVisible(false)
      const bubble = gameLabel(this, '', { bubble: true }).setOrigin(.5, 1).setVisible(false)
      const prop = this.add.graphics()
      const skin = { peach: 0xe4b58d, honey: 0xc79162, bronze: 0xa36e48, coffee: 0x75503b }[characterPreset(bot).skin]
      return { sprite, shadow, label, bubble, prop, art, skin, presetId: characterPreset(bot).id, direction: 'down', state: 'idle', activity: 'idle', exit: null, stationId: null }
    }
    position(actor) { return actor.exit ?? actor.sprite }
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
    cameraSetup() {
      const camera = this.cameras.main, box = element.getBoundingClientRect(), workspace = element.closest('.of-workspace')
      const top = workspace?.querySelector('.of-game-top')?.getBoundingClientRect(), bottom = workspace?.querySelector('.of-game-bottom')?.getBoundingClientRect()
      const panel = workspace?.querySelector('.of-activity-panel,.of-game-drawer')?.getBoundingClientRect()
      const dialogue = workspace?.querySelector('.of-game-dialogue')?.getBoundingClientRect()
      const lowerInset = Math.max(bottom ? box.bottom - bottom.top : 72, dialogue ? box.bottom - dialogue.top + 16 : 0)
      const layout = officeCameraLayout(this.scale.width, this.scale.height, this.world, { top: top ? top.bottom - box.top : 100, bottom: lowerInset, right: panel ? Math.max(24, box.right - panel.left + 16) : 24 })
      const { zoom, viewport } = layout
      this.cameraMode = inspection ? 'inspect' : 'follow'
      camera.stopFollow().setViewport(viewport.x, viewport.y, viewport.width, viewport.height).setZoom(zoom).setRoundPixels(true)
      const padX = Math.max(0, (viewport.width / zoom - this.world.width) / 2), padY = Math.max(0, (viewport.height / zoom - this.world.height) / 2)
      camera.setBounds(-padX, -padY, this.world.width + 2 * padX, this.world.height + 2 * padY)
      if (inspection) camera.centerOn(inspection.x, inspection.y)
      else { camera.startFollow(this.player.sprite, true, quiet ? 1 : .12, quiet ? 1 : .12); camera.setDeadzone(64, 48) }
    }
    followPlayer() { inspection = null; this.cameraSetup() }
    panTo(x, y) {
      inspection = { x: Math.max(0, Math.min(this.world.width, x)), y: Math.max(0, Math.min(this.world.height, y)) }
      this.cameraMode = 'inspect'; this.cameras.main.stopFollow().centerOn(inspection.x, inspection.y)
    }
    targets() { return [...this.world.props, ...this.actors.map(actor => ({ id: actor.id, x: this.position(actor).x, y: this.position(actor).y, label: `Talk to ${actor.label.text}`, actor }))] }
    go(point) {
      if (inspection) this.followPlayer()
      this.stand(this.player)
      path = findPath(this.player.sprite, point, this.world); destination = path.length ? point : null
      this.marker.clear()
      if (destination) this.marker.lineStyle(2, 0xf3deb4, .8).strokeEllipse(point.x, point.y - 1, 12, 5)
    }
    approach(target) {
      if (paused || activity) return
      if (nearInteraction(this.position(this.player), [target], this.world)) { this.interact(target); return }
      const options = [[0, 0], [0, 24], [24, 0], [-24, 0], [0, -24]].map(([x, y]) => ({ x: target.x + x, y: target.y + y }))
        .map(point => ({ point, route: findPath(this.position(this.player), point, this.world) })).filter(o => o.route.length).sort((a, b) => a.route.length - b.route.length)
      if (options.length) { pending = target.id; this.go(options[0].point) }
    }
    interact(target) {
      path = []; pending = null; destination = null; this.marker.clear(); this.player.sprite.setVelocity(0)
      if (target.actor) { target.actor.direction = facing(this.player.sprite.x - target.x, this.player.sprite.y - target.y); onSelect?.(target.id) }
      else if (target.id === 'lift') onExit?.()
      else {
        interactionStation = this.world.stations.find(s => s.id === target.id)?.id ?? null
        if (target.id === 'dog' && !quiet) this.tweens.add({ targets: this.dog.sprite, y: this.dog.sprite.y - 5, duration: 120, yoyo: true, repeat: 1 })
        onInteract?.(target)
      }
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
    animate(actor, time, moving) {
      const { sprite, shadow, label, bubble, prop } = actor
      actor.direction = facing(sprite.body.velocity.x, sprite.body.velocity.y, actor.direction)
      if (actor.art === 'dog') sprite.setFrame(!quiet && Math.floor(time / 450) % 4 === 0 ? 4 : 0)
      else if (actor.exit) { sprite.anims.stop(); sprite.setFrame(characterFrame(actor.direction, 'sitting', 2)) }
      else if (!moving && actor.activity === 'exercise' && !quiet) { sprite.anims.stop(); sprite.setFrame(characterFrame(actor.direction, 'walk', Math.floor(time / 180) % 8)) }
      else if (quiet && !moving) { sprite.anims.stop(); sprite.setFrame(characterFrame(actor.direction)) }
      else { sprite.play(`${actor.art}-${moving ? 'walk' : 'idle'}-${actor.direction}`, true); sprite.anims.timeScale = actor === this.player && keys.has('shift') ? 1.5 : 1 }
      sprite.setDepth(sprite.y)
      shadow.setPosition(sprite.x, sprite.y - 2).setDepth(sprite.y - .1).setVisible(!actor.exit)
      label.setPosition(sprite.x, sprite.y + 10).setDepth(sprite.y + 1)
      bubble.setPosition(sprite.x, sprite.y - 51).setDepth(sprite.y + 2)
      prop.clear().setPosition(sprite.x, sprite.y).setDepth(sprite.y + .2)
      const bob = quiet ? 0 : Math.floor(time / 700) % 2
      if (!moving && actor.activity === 'reading') {
        prop.fillStyle(0x775a45).fillRect(-11, -24, 22, 13).fillStyle(0xeee0b7).fillRect(-10, -23, 9, 10).fillRect(1, -23, 9, 10)
        prop.fillStyle(0xb7a783).fillRect(-8, -20 + bob, 5, 1).fillRect(3, -20, 5, 1).fillStyle(actor.skin).fillRect(-12, -19, 3, 4).fillRect(9, -19, 3, 4)
        if (!quiet && (actor === this.player ? activity?.flipUntil > time : time % 4200 < 350)) prop.fillStyle(0xfff5d6).fillRect(-2 + Math.floor(time / 70) % 7, -23, 3, 10)
      } else if (!moving && actor.activity === 'coffee') {
        if (actor !== this.player || activity?.progress >= .62) {
          prop.fillStyle(0xe6dcc1).fillRect(7, -24 - bob, 8, 8).fillRect(15, -22 - bob, 3, 4).fillStyle(0x805b3e).fillRect(8, -24 - bob, 6, 2)
          if (!quiet) prop.fillStyle(0xf5ead2, .65).fillRect(10, -29 - bob, 1, 3)
        } else prop.fillStyle(actor.skin).fillRect(-10 + bob, -25, 4, 3).fillRect(6 - bob, -25, 4, 3)
      } else if (!moving && actor.activity === 'drink') {
        prop.fillStyle(0xeadbb4).fillRect(7, -27, 8, 12).fillStyle(0x87a66f).fillRect(8, -23, 6, 6).fillStyle(0xe5c877).fillRect(12, -28, 5, 3)
        prop.fillStyle(0xc6d6c2).fillRect(9, -30, 1, 13)
      } else if (!moving && actor.activity === 'meal') {
        prop.fillStyle(0x77553b).fillRect(-13, -25, 26, 14).fillStyle(0xeee1b7).fillRect(-11, -23, 10, 10)
        prop.fillStyle(0x8ba86c).fillRect(1, -23, 5, 5).fillStyle(0xc38b55).fillRect(7, -23, 4, 5).fillStyle(0xe0bd7c).fillRect(1, -17, 10, 4)
        prop.fillStyle(0xc7a16e).fillRect(7, -29 - bob, 1, 6).fillRect(9, -29 - bob, 1, 6)
      } else if (!moving && actor.activity === 'exercise') {
        const lift = quiet ? 0 : Math.floor(time / 300) % 2 * 8
        prop.fillStyle(actor.skin).fillRect(-14, -22 - lift, 4, 5).fillRect(10, -22 - lift, 4, 5)
        prop.fillStyle(0x46565b).fillRect(-17, -24 - lift, 10, 4).fillRect(7, -24 - lift, 10, 4)
        prop.fillStyle(0x253b43).fillRect(-18, -26 - lift, 3, 8).fillRect(-10, -26 - lift, 3, 8).fillRect(7, -26 - lift, 3, 8).fillRect(15, -26 - lift, 3, 8)
      } else if (!moving && actor.activity === 'arcade' && !quiet) prop.fillStyle(actor.skin).fillRect(-10 + bob, -23, 4, 3).fillRect(6 - bob, -23, 4, 3)
    }
    beginActivity(kind, detail) {
      this.endActivity()
      const station = this.world.stations.find(s => s.id === interactionStation && s.kind === kind) ?? this.world.stations.find(s => s.kind === kind)
      if (!station) throw new Error('This activity is not available on this floor.')
      const route = findPath(this.position(this.player), station, this.world)
      if (!route.length) throw new Error('Please approach the activity from the aisle.')
      activity = { kind, detail, stationId: station.id, phase: 'walking', progress: 0, label: 'Finding a comfortable spot…', complete: false, started: null }
      this.player.activity = 'walking'; this.go(station)
    }
    endActivity() {
      activity = null; this.stand(this.player); this.player.activity = 'idle'; this.player.stationId = null
      path = []; destination = null; this.marker?.clear(); this.player.sprite.setVelocity(0)
    }
    updateActivity(time, delta) {
      if (!activity) return
      const station = this.world.stations.find(s => s.id === activity.stationId)
      if (activity.phase === 'walking') {
        this.move(this.player, path, WALK_SPEED, delta)
        if (Math.hypot(this.player.sprite.x - station.x, this.player.sprite.y - station.y) > 4) return
        placeOfficeSprite(this.player.sprite, station)
        this.sit(this.player, station); this.player.direction = station.direction; this.player.stationId = station.id
        activity.started = time; activity.phase = 'using'; path = []; this.marker.clear()
      }
      this.player.sprite.setVelocity(0)
      this.player.activity = activity.kind
      const elapsed = time - activity.started
      if (activity.kind === 'coffee') {
        activity.progress = Math.min(1, elapsed / 7600)
        activity.label = elapsed < 1600 ? 'Grinding fresh beans…' : elapsed < 3800 ? 'Brewing your coffee…' : elapsed < 4800 ? 'Pouring a warm cup…' : elapsed < 7600 ? 'Taking a quiet sip…' : 'Refreshed and ready.'
        activity.phase = activity.progress === 1 ? 'complete' : 'using'; activity.complete = activity.progress === 1
      } else if (!activity.detail.manual) activity.label = activity.kind === 'reading' ? 'Settled in with a good book.' : 'Playing Star catcher.'
    }
    updateDoors(time) {
      const people = [this.player, ...this.actors].map(actor => this.position(actor))
      for (const door of this.doors) {
        const near = people.some(person => Math.abs(person.x - door.x - door.width / 2) < 62 && Math.abs(person.y - door.y - door.height / 2) < 70)
        if (near) door.until = time + 650
        const open = near || time < door.until
        if (open !== door.open) { door.open = open; door.image.setTexture(open ? 'door-open' : 'door-closed') }
      }
    }
    update(time, delta) {
      if (!this.player || disposed) return
      const started = performance.now()
      const player = this.player.sprite, active = document.activeElement === element && !paused && !activity
      let dx = 0, dy = 0
      if (active) { dx = Number(keys.has('d') || keys.has('arrowright')) - Number(keys.has('a') || keys.has('arrowleft')); dy = Number(keys.has('s') || keys.has('arrowdown')) - Number(keys.has('w') || keys.has('arrowup')) }
      if (activity) this.updateActivity(time, delta)
      else if (dx || dy) { if (inspection) this.followPlayer(); this.stand(this.player); path = []; pending = null; this.marker.clear(); const length = Math.hypot(dx, dy), speed = keys.has('shift') ? RUN_SPEED : WALK_SPEED; player.setVelocity(dx / length * speed, dy / length * speed) }
      else if (!paused) this.move(this.player, path, WALK_SPEED, delta)
      else player.setVelocity(0)
      if (!path.length && destination) { destination = null; this.marker.clear() }
      const targets = this.targets()
      nearby = nearInteraction(this.position(this.player), targets, this.world)
      if (pending && !path.length) { const target = targets.find(t => t.id === pending); pending = null; if (target && nearInteraction(player, [target], this.world)) this.interact(target) }
      const hint = nearby ? `E · ${nearby.label}` : 'Click to walk · WASD / arrows · Shift to run'
      if (hint !== this.lastHint) { this.lastHint = hint; onHint?.(hint) }
      for (const actor of this.actors) {
        const member = current.members.find(entry => entry.bot.id === actor.id)
        actor.state = member?.state ?? 'idle'
        const avatarKey = JSON.stringify(member?.bot.officeAvatar)
        if (member && actor.avatarKey !== avatarKey) {
          const previous = actor.art; actor.art = this.outfit(member.bot); actor.avatarKey = avatarKey; actor.sprite.anims.stop(); actor.sprite.setTexture(actor.art)
          for (const pose of ['walk', 'idle']) for (const direction of Object.keys(DIRECTIONS)) this.anims.remove(`${previous}-${pose}-${direction}`)
          this.textures.remove(previous)
        }
        if (member && actor.label.text !== member.bot.name) actor.label.setText(member.bot.name)
      }
      const lives = this.life.step(time, this.actors.map(a => ({ id: a.id, name: a.label.text, state: a.state === 'away' ? 'away' : a.state, x: this.position(a).x, y: this.position(a).y, home: a.home })), { quiet, reserved: [activity?.stationId ?? interactionStation].filter(Boolean) })
      for (const actor of this.actors) {
        const life = lives[actor.id], station = this.world.stations.find(s => s.id === life.stationId)
        actor.activity = life.activity; actor.stationId = life.stationId
        if (life.goal) {
          this.stand(actor)
          const goal = `${life.goal.x},${life.goal.y}`
          if (goal !== actor.goal || !actor.path.length && Math.hypot(actor.sprite.x - life.goal.x, actor.sprite.y - life.goal.y) > 4) actor.path = findPath(actor.sprite, life.goal, this.world)
          actor.goal = goal
          if ((selected === actor.id || pending === actor.id) && actor.state === 'idle') actor.sprite.setVelocity(0)
          else this.move(actor, actor.path, COWORKER_SPEED, delta)
        } else {
          actor.path = []; actor.goal = null; actor.sprite.setVelocity(0)
          if (station?.poseX !== undefined) this.sit(actor, station)
          else this.stand(actor)
          actor.direction = life.direction
        }
        if (life.activity === 'working' && Math.hypot(this.position(actor).x - actor.home.x, this.position(actor).y - actor.home.y) <= 4) actor.direction = 'up'
        const message = life.line ?? ({ thinking: 'Thinking…', typing: 'Working', reading: 'Reading', speaking: 'Speaking', waiting: 'Needs you', away: 'Working elsewhere' }[actor.state])
        actor.bubble.setText(message ?? '').setVisible(Boolean(message))
        actor.label.setVisible(selected === actor.id || nearby?.id === actor.id).setBackgroundColor(selected === actor.id ? '#e2eadc' : '#faf5e9')
        this.animate(actor, time, actor.sprite.body.enable && actor.sprite.body.speed > 2)
      }
      this.animate(this.player, time, player.body.enable && player.body.speed > 2)
      this.animate(this.dog, time, false)
      this.updateDoors(time)
      this.updateCpuMs = performance.now() - started
    }
  }

  const game = new Phaser.Game({ type: Phaser.AUTO, parent: element, backgroundColor: '#263c39', width: Math.max(240, element.clientWidth), height: Math.max(240, element.clientHeight), pixelArt: true, roundPixels: true,
    banner: false, audio: { noAudio: true }, input: { keyboard: false }, fps: { target: 60 }, physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 }, fps: 60, fixedStep: true } }, scene: Office })
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
    const panel = workspace?.querySelector('.of-activity-panel,.of-game-dialogue,.of-game-drawer')
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
    if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'shift', 'e', 'enter'].includes(key)) {
      event.preventDefault(); event.stopPropagation(); keys.add(key)
      if ((key === 'e' || key === 'enter') && !event.repeat && nearby && !paused && !activity) scene?.interact(nearby)
    }
  }
  const up = event => keys.delete(event.key.toLowerCase())
  element.addEventListener('keydown', down); element.addEventListener('blur', clearKeys)
  window.addEventListener('keyup', up); window.addEventListener('blur', clearKeys)
  const destroy = () => {
    if (disposed) return
    disposed = true; observer.disconnect(); panelChanges.disconnect(); keys.clear()
    element.removeEventListener('keydown', down); element.removeEventListener('blur', clearKeys)
    window.removeEventListener('keyup', up); window.removeEventListener('blur', clearKeys)
    delete element.__officeDebug; game.destroy(true)
  }
  try { await ready } catch (error) { destroy(); throw error }
  const snapshot = () => {
    const camera = scene.cameras.main, start = camera.getWorldPoint(camera.x, camera.y), end = camera.getWorldPoint(camera.x + camera.width, camera.y + camera.height)
    const room = scene.world.rooms.find(r => scene.player.sprite.x >= r.x && scene.player.sprite.x <= r.x + r.width && scene.player.sprite.y >= r.y && scene.player.sprite.y <= r.y + r.height)
    return { engine: 'Phaser 4.2.1', renderer: game.renderer.type === Phaser.CANVAS ? 'Canvas' : 'WebGL', updateCpuMs: Math.round((scene.updateCpuMs ?? 0) * 100) / 100, fps: Math.round(game.loop.actualFps), fading: camera.fadeEffect.isRunning,
      currentRoom: room ? { id: room.id, name: room.name, kind: room.kind } : { id: 'corridor', name: 'Corridor', kind: 'corridor' },
      camera: { x: camera.scrollX, y: camera.scrollY, zoom: camera.zoom, width: scene.scale.width, height: scene.scale.height, mode: scene.cameraMode,
        viewport: { x: camera.x, y: camera.y, width: camera.width, height: camera.height }, visibleWorld: { left: start.x, top: start.y, right: end.x, bottom: end.y } },
      player: { x: scene.player.sprite.x, y: scene.player.sprite.y, direction: scene.player.direction, frame: scene.player.sprite.frame.name, seated: Boolean(scene.player.exit) }, nearby: nearby?.id, activity: activity ? { ...activity } : null,
      actors: scene.actors.map(a => ({ id: a.id, x: a.sprite.x, y: a.sprite.y, state: a.state, activity: a.activity, stationId: a.stationId, seated: Boolean(a.exit), direction: a.direction, presetId: a.presetId })),
      world: { ...scene.world, doors: scene.doors.map(d => ({ id: d.id, roomId: d.roomId, x: d.x, y: d.y, width: d.width, height: d.height, open: d.open })) }, canvasCount: element.querySelectorAll('canvas').length }
  }
  element.__officeDebug = { snapshot }
  return {
    select(id) { selected = id },
    approach(id) { const target = scene.targets().find(t => t.id === id); if (target) scene.approach(target) },
    setPaused(value) { paused = value; if (value) clearKeys(); else interactionStation = null },
    panTo(x, y) { if (!disposed) scene.panTo(x, y) }, followPlayer() { if (!disposed) scene.followPlayer() },
    beginActivity(kind, detail = {}) { scene.beginActivity(kind, detail) }, endActivity() { if (!disposed) scene.endActivity() }, activity() { return activity ? { ...activity } : null },
    turnPage(page) { if (activity?.kind === 'reading') { activity.detail.page = page; activity.flipUntil = scene.time.now + 400 } },
    activityStep(detail) {
      if (!activity) return
      activity.progress = Math.max(0, Math.min(1, Number(detail.progress) || 0))
      activity.label = String(detail.label ?? activity.label); activity.detail = { ...activity.detail, ...detail }
      if (detail.complete) { activity.complete = true; activity.phase = 'complete' }
    },
    setReducedMotion(value) { quiet = value; for (const tween of scene.ambient ?? []) { if (value) tween.pause(); else tween.resume() } },
    update(next) { const changed = JSON.stringify(current.theme) !== JSON.stringify(next.theme); current = next; if (changed && scene) scene.paintRoom() },
    snapshot, destroy,
  }
}
