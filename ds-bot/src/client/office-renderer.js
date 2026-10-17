import Phaser from 'phaser'
import { GAME_ART, characterArt, DIRECTIONS, makeRoomArt, makeCharacterSheet } from './office-game-art.js'
import { createOfficeWorld, findPath, canStand, nearInteraction, facing, WALK_SPEED, RUN_SPEED, REACH, FOOT_RADIUS } from '../shared/office-world.js'
import { hashOf } from '../shared/office.js'
import { PIXEL_FONT, installPixelFont, gameLabel } from './office-game-label.js'

export async function createOfficeRenderer(element, { floor, lobby = false, reducedMotion = false, onSelect, onExit, onInteract, onHint }) {
  let current = floor, quiet = reducedMotion, selected = null, disposed = false, scene
  let path = [], destination = null, nearby = null, pending = null, paused = false
  const keys = new Set()
  let resolveReady, rejectReady
  const ready = new Promise((resolve, reject) => { resolveReady = resolve; rejectReady = reject })

  class Office extends Phaser.Scene {
    constructor() { super('office') }
    preload() {
      this.load.image('office-font', PIXEL_FONT)
      for (const [name, url] of Object.entries(GAME_ART)) {
        if (name === 'tiles') this.load.image(name, url)
        else this.load.spritesheet(name, url, { frameWidth: 16, frameHeight: 16 })
      }
      this.load.once('loaderror', file => rejectReady(new Error(`Could not load ${file.key}`)))
    }
    create() {
      try {
        scene = this
        installPixelFont(this, Phaser)
        this.world = createOfficeWorld(current.members.length, lobby)
        const world = this.world
        this.textures.addCanvas('room', makeRoomArt(world, current.theme, this.textures.get('tiles').getSourceImage(), lobby))
        this.add.image(0, 0, 'room').setOrigin(0).setDepth(-10)
        const walls = this.physics.add.staticGroup()
        for (const rect of world.furniture) {
          const block = this.add.rectangle(rect.x + rect.width / 2, rect.y + rect.height / 2, rect.width, rect.height, 0, 0)
          walls.add(block)
        }
        this.physics.world.setBounds(world.bounds.x, world.bounds.y, world.bounds.width, world.bounds.height)
        for (const name of Object.keys(GAME_ART).filter(key => key !== 'tiles')) for (const [direction, column] of Object.entries(DIRECTIONS)) {
          this.anims.create({ key: `${name}-${direction}`, frames: [0, 4, 0, 8].map(row => ({ key: name, frame: column + row })), frameRate: 9, repeat: -1 })
        }
        this.player = this.actor('traveler', world.spawn, 'You')
        this.physics.add.collider(this.player.sprite, walls)
        this.actors = current.members.map((member, i) => {
          const desk = world.desks[i]
          const actor = this.actor(this.outfit(member.bot), { x: desk.x + 24, y: desk.y + 36 }, member.bot.name)
          actor.id = member.bot.id; actor.home = { x: actor.sprite.x, y: actor.sprite.y }; actor.path = []; actor.phase = -1; actor.avatarKey = JSON.stringify(member.bot.officeAvatar)
          this.physics.add.collider(actor.sprite, walls)
          return actor
        })
        this.dog = this.actor('dog', world.props.find(p => p.id === 'dog'), 'Momo')
        this.dog.label.setVisible(false)
        this.ambient = []
        for (let i = 0; i < 3; i++) {
          const steam = this.add.rectangle(87 + i * 3, 95, 1, 3, 0xf3efd0, .6).setDepth(110)
          this.ambient.push(this.tweens.add({ targets: steam, y: 84, x: 89 + i * 3, alpha: 0, duration: 1700, delay: i * 500, repeat: -1, paused: quiet }))
        }
        this.marker = this.add.graphics().setDepth(900)
        this.prompt = gameLabel(this, '').setOrigin(.5, 1).setDepth(1000)
        this.add.bitmapText(216, world.height - 53, 'office-font', 'LIFT', 8).setOrigin(.5, 0).setDepth(1)
        this.cameraSetup()
        this.cameras.main.fadeIn(quiet ? 0 : 320, 24, 38, 35)
        this.input.on('pointerdown', pointer => {
          element.focus({ preventScroll: true })
          const point = this.cameras.main.getWorldPoint(pointer.x, pointer.y)
          const target = this.targets().find(t => Math.hypot(t.x - point.x, t.y - point.y) < 14)
          if (target) this.approach(target)
          else if (canStand(point, world)) { pending = null; this.go(point) }
        })
        this.scale.on('resize', () => this.cameraSetup())
        resolveReady()
      } catch (error) { rejectReady(error) }
    }
    outfit(bot) {
      const art = characterArt(bot), key = `outfit-${hashOf(bot.id)}-${hashOf(JSON.stringify(bot.officeAvatar))}`
      if (!this.textures.exists(key)) {
        this.textures.addSpriteSheet(key, makeCharacterSheet(this.textures.get(art).getSourceImage(), bot), { frameWidth: 16, frameHeight: 16 })
        for (const [direction, column] of Object.entries(DIRECTIONS)) this.anims.create({ key: `${key}-${direction}`, frames: [0, 4, 0, 8].map(row => ({ key, frame: column + row })), frameRate: 9, repeat: -1 })
      }
      return key
    }
    actor(art, position, name) {
      const shadow = this.add.ellipse(position.x, position.y - 2, 12, 5, 0x443e32, .22)
      const sprite = this.physics.add.sprite(position.x, position.y, art, 0).setOrigin(.5, 13 / 16)
      sprite.body.setSize(FOOT_RADIUS * 2, FOOT_RADIUS * 2).setOffset(8 - FOOT_RADIUS, 13 - FOOT_RADIUS)
      sprite.setCollideWorldBounds(true)
      const label = gameLabel(this, name).setPosition(position.x, position.y + 6)
      const bubble = gameLabel(this, '').setPosition(position.x, position.y - 22).setOrigin(.5, 1).setVisible(false)
      return { sprite, shadow, label, bubble, art, direction: 'down', state: 'idle' }
    }
    cameraSetup() {
      const camera = this.cameras.main
      const zoom = this.scale.width > 1600 ? 4 : 3
      camera.setZoom(zoom).setRoundPixels(true)
      const padX = Math.max(0, (this.scale.width / zoom - this.world.width) / 2)
      const padY = Math.max(0, (this.scale.height / zoom - this.world.height) / 2)
      camera.setBounds(-padX, -padY, this.world.width + 2 * padX, this.world.height + 2 * padY)
      camera.startFollow(this.player.sprite, true, quiet ? 1 : .12, quiet ? 1 : .12)
      camera.setDeadzone(36, 24)
    }
    targets() {
      return [...this.world.props, ...this.actors.map(actor => ({ id: actor.id, x: actor.sprite.x, y: actor.sprite.y, label: `Talk to ${actor.label.text}`, actor }))]
    }
    go(point) {
      path = findPath(this.player.sprite, point, this.world)
      destination = path.length ? point : null
      this.marker.clear()
      if (destination) this.marker.lineStyle(1, 0xffe4a0, .85).strokeCircle(point.x, point.y - 1, 5).lineBetween(point.x - 2, point.y - 1, point.x + 2, point.y - 1)
    }
    approach(target) {
      if (Math.hypot(this.player.sprite.x - target.x, this.player.sprite.y - target.y) <= REACH && nearInteraction(this.player.sprite, [target], this.world)) { this.interact(target); return }
      const options = [[0, 16], [16, 0], [-16, 0], [0, -16]].map(([x, y]) => ({ x: target.x + x, y: target.y + y }))
        .map(point => ({ point, route: findPath(this.player.sprite, point, this.world) })).filter(o => o.route.length)
        .sort((a, b) => a.route.length - b.route.length)
      if (!options.length) return
      pending = target.id; this.go(options[0].point)
    }
    interact(target) {
      path = []; pending = null; this.marker.clear(); this.player.sprite.setVelocity(0)
      if (target.actor) { target.actor.direction = facing(this.player.sprite.x - target.x, this.player.sprite.y - target.y); onSelect?.(target.id) }
      else if (target.id === 'lift') onExit?.()
      else { if (target.id === 'dog' && !quiet) this.tweens.add({ targets: this.dog.sprite, y: this.dog.sprite.y - 4, duration: 110, yoyo: true, repeat: 1 }); onInteract?.(target) }
    }
    move(actor, route, speed) {
      const sprite = actor.sprite
      while (route.length && Math.hypot(route[0].x - sprite.x, route[0].y - sprite.y) < 2) route.shift()
      if (!route.length) { sprite.setVelocity(0); return }
      const dx = route[0].x - sprite.x, dy = route[0].y - sprite.y, d = Math.hypot(dx, dy)
      sprite.setVelocity(dx / d * speed, dy / d * speed)
    }
    animate(actor, time, moving) {
      const { sprite, shadow, label, bubble } = actor
      const velocity = sprite.body.velocity
      actor.direction = facing(velocity.x, velocity.y, actor.direction)
      if (moving) { sprite.play(`${actor.art}-${actor.direction}`, true); sprite.anims.timeScale = actor === this.player && keys.has('shift') ? 1.45 : 1 }
      else {
        sprite.anims.stop()
        const gesture = !quiet && ['typing', 'speaking', 'waiting'].includes(actor.state) && Math.floor(time / 350) % 3 === 0 ? 4 : 0
        sprite.setFrame(DIRECTIONS[actor.direction] + gesture)
      }
      sprite.setDepth(sprite.y)
      shadow.setPosition(sprite.x, sprite.y - 2).setDepth(sprite.y - .1)
      label.setPosition(sprite.x, sprite.y + 6).setDepth(sprite.y + 1)
      bubble.setPosition(sprite.x, sprite.y - 21 - (!quiet && actor.state === 'thinking' ? Math.sin(time / 400) : 0)).setDepth(sprite.y + 2)
    }
    update(time) {
      if (!this.player || disposed) return
      const player = this.player.sprite
      const active = document.activeElement === element && !paused
      let dx = 0, dy = 0
      if (active) { dx = Number(keys.has('d') || keys.has('arrowright')) - Number(keys.has('a') || keys.has('arrowleft')); dy = Number(keys.has('s') || keys.has('arrowdown')) - Number(keys.has('w') || keys.has('arrowup')) }
      if (dx || dy) { path = []; pending = null; this.marker.clear(); const length = Math.hypot(dx, dy), speed = keys.has('shift') ? RUN_SPEED : WALK_SPEED; player.setVelocity(dx / length * speed, dy / length * speed) }
      else if (!paused) this.move(this.player, path, WALK_SPEED)
      else player.setVelocity(0)
      if (!path.length && destination) { destination = null; this.marker.clear() }
      const targets = this.targets()
      nearby = nearInteraction(player, targets, this.world)
      if (pending && !path.length) {
        const target = targets.find(t => t.id === pending)
        pending = null
        if (target && nearInteraction(player, [target], this.world)) this.interact(target)
      }
      const hint = nearby?.label ?? 'Click to walk · WASD / arrows · Shift to run'
      if (hint !== this.lastHint) { this.lastHint = hint; onHint?.(hint) }
      this.prompt.setVisible(Boolean(nearby) && !paused)
      if (nearby) this.prompt.setText(`E  ${nearby.label}`).setPosition(nearby.x, nearby.y - 29)
      for (const actor of this.actors) {
        const member = current.members.find(entry => entry.bot.id === actor.id)
        const previousState = actor.state
        actor.state = member?.state ?? 'idle'
        const avatarKey = JSON.stringify(member?.bot.officeAvatar)
        if (member && actor.avatarKey !== avatarKey) {
          const previous = actor.art
          actor.art = this.outfit(member.bot); actor.avatarKey = avatarKey; actor.sprite.anims.stop(); actor.sprite.setTexture(actor.art)
          for (const direction of Object.keys(DIRECTIONS)) this.anims.remove(`${previous}-${direction}`)
          this.textures.remove(previous)
        }
        if (member && actor.label.text !== member.bot.name) actor.label.setText(member.bot.name)
        const phase = Math.floor((time + hashOf(actor.id) % 12000) / 7000)
        if (actor.state !== 'idle' && actor.state !== 'away') {
          if (Math.hypot(actor.sprite.x - actor.home.x, actor.sprite.y - actor.home.y) > 3 && (previousState !== actor.state || !actor.path.length)) actor.path = findPath(actor.sprite, actor.home, this.world)
          else if (selected !== actor.id) actor.direction = 'up'
        } else if (!quiet && selected !== actor.id && phase !== actor.phase) {
          actor.phase = phase
          const destinations = [actor.home, { x: 120, y: 136 }, { x: 144, y: this.world.height - 80 }, actor.home]
          actor.path = findPath(actor.sprite, destinations[phase % destinations.length], this.world)
        }
        if (quiet || selected === actor.id || pending === actor.id || paused) actor.sprite.setVelocity(0)
        else this.move(actor, actor.path, 30)
        const message = { thinking: '…', typing: 'tap tap', reading: 'Reading', speaking: 'Hello!', waiting: '!', away: 'Elsewhere' }[actor.state]
        actor.bubble.setText(message ?? '').setVisible(Boolean(message))
        actor.label.setBackgroundColor(selected === actor.id ? '#d9b66b' : '#eadcb7')
        this.animate(actor, time, actor.sprite.body.speed > 2)
      }
      this.animate(this.player, time, player.body.speed > 2)
      this.animate(this.dog, time, false)
    }
  }

  const game = new Phaser.Game({ type: Phaser.AUTO, parent: element, backgroundColor: '#253b35', width: Math.max(240, element.clientWidth), height: Math.max(240, element.clientHeight), pixelArt: true, roundPixels: true,
    banner: false, audio: { noAudio: true }, input: { keyboard: false }, fps: { target: 60 }, physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 }, fps: 60, fixedStep: true } }, scene: Office })
  const observer = new ResizeObserver(() => { if (!disposed) game.scale.resize(Math.max(240, element.clientWidth), Math.max(240, element.clientHeight)) })
  observer.observe(element)
  const clearKeys = () => keys.clear()
  const down = event => {
    const key = event.key.toLowerCase()
    if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'shift', 'e', 'enter'].includes(key)) {
      event.preventDefault(); event.stopPropagation(); keys.add(key)
      if ((key === 'e' || key === 'enter') && !event.repeat && nearby && !paused) scene?.interact(nearby)
    }
  }
  const up = event => keys.delete(event.key.toLowerCase())
  const touch = event => { const { key, pressed } = event.detail; element.focus({ preventScroll: true }); if (pressed) { if (key === 'e' && nearby) scene?.interact(nearby); else keys.add(key) } else keys.delete(key) }
  element.addEventListener('keydown', down); element.addEventListener('blur', clearKeys); element.addEventListener('office-control', touch)
  window.addEventListener('keyup', up); window.addEventListener('blur', clearKeys)
  const destroy = () => {
    if (disposed) return
    disposed = true; observer.disconnect(); keys.clear()
    element.removeEventListener('keydown', down); element.removeEventListener('blur', clearKeys); element.removeEventListener('office-control', touch)
    window.removeEventListener('keyup', up); window.removeEventListener('blur', clearKeys)
    delete element.__officeDebug
    game.destroy(true)
  }
  try { await ready } catch (error) { destroy(); throw error }
  const snapshot = () => ({ engine: 'Phaser 4.2.1', fps: Math.round(game.loop.actualFps), fading: scene.cameras.main.fadeEffect.isRunning, camera: { x: scene.cameras.main.scrollX, y: scene.cameras.main.scrollY, zoom: scene.cameras.main.zoom, width: scene.scale.width, height: scene.scale.height }, player: { x: scene.player.sprite.x, y: scene.player.sprite.y, direction: scene.player.direction, frame: scene.player.sprite.frame.name }, nearby: nearby?.id, actors: scene.actors.map(a => ({ id: a.id, x: a.sprite.x, y: a.sprite.y, state: a.state, direction: a.direction })), world: scene.world, canvasCount: element.querySelectorAll('canvas').length })
  element.__officeDebug = { snapshot }
  return {
    select(id) { selected = id },
    approach(id) { const target = scene.targets().find(t => t.id === id); if (target) scene.approach(target) },
    setPaused(value) { paused = value; if (value) clearKeys() },
    setReducedMotion(value) { quiet = value; for (const tween of scene.ambient ?? []) { if (value) tween.pause(); else tween.resume() } },
    update(next) {
      const themeChanged = JSON.stringify(current.theme) !== JSON.stringify(next.theme)
      current = next
      if (themeChanged && scene) { const texture = scene.textures.get('room'); texture.context.clearRect(0, 0, texture.width, texture.height); texture.context.drawImage(makeRoomArt(scene.world, next.theme, scene.textures.get('tiles').getSourceImage(), lobby), 0, 0); texture.refresh() }
    }, snapshot, destroy,
  }
}
