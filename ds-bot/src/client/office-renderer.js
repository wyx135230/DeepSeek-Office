import { Application, Container, Graphics, Rectangle, Sprite, Text, Texture } from 'pixi.js'
import { avatarCanvas, catCanvas, roomCanvas } from './office-art.js'
import { defaultPixelAvatar, hashOf } from '../shared/office.js'
import { pathTo, stepAlong, walkable } from '../shared/office-motion.js'

const STATES = {
  thinking: ['Thinking…', '#8297b0'], typing: ['Working', '#7c9c84'], reading: ['Reading', '#b29970'],
  speaking: ['Speaking', '#a392b0'], waiting: ['Needs you', '#cf9b54'], away: ['Working elsewhere', '#a2aaa3'],
  idle: ['On a break', '#8da18a'],
}

export async function createOfficeRenderer(element, { floor, lobby = false, reducedMotion = false, onSelect, onExit, onError, translate = text => text }) {
  let disposed = false
  let ready = false
  let current = floor
  let isLobby = lobby
  let root = null
  let actors = []
  let textures = []
  let petals = []
  let cat
  let visitor
  let visitorPosition = { x: 190, y: floor.layout.height - 70 }
  let visitorPath = []
  const keys = new Set()
  let elapsed = 0
  let selected = null
  let lastKey = ''
  const app = new Application()
  const observer = new ResizeObserver(() => { if (ready && !disposed) resize() })

  const texture = (image) => {
    const value = Texture.from(image)
    value.source.scaleMode = 'nearest'
    textures.push(value)
    return value
  }
  const text = (value, size = 12, fill = '#514c42') => new Text({ text: value, style: { fontFamily: 'Microsoft YaHei, Meiryo, sans-serif', fontSize: size, fill }, resolution: 2, roundPixels: true })

  function resize() {
    const width = Math.max(240, element.clientWidth)
    const height = Math.max(220, element.clientHeight)
    app.renderer.resize(width, height)
    if (!root) return
    const scale = Math.min(width / current.layout.width, height / current.layout.height)
    root.scale.set(scale)
    root.position.set(Math.floor((width - current.layout.width * scale) / 2), Math.floor((height - current.layout.height * scale) / 2))
  }

  function character(bot, position, member = null) {
    const holder = new Container({ x: position.x, y: position.y })
    const shadow = new Graphics().ellipse(0, -3, 16, 5).fill({ color: '#685a48', alpha: .18 })
    const frames = new Map()
    const getFrame = (state, frame) => {
      const key = `${state}:${frame % 2}`
      if (!frames.has(key)) frames.set(key, texture(avatarCanvas(bot, state, frame)))
      return frames.get(key)
    }
    const sprite = new Sprite({ texture: getFrame('idle', 0), anchor: { x: .5, y: 1 }, roundPixels: true })
    sprite.scale.set(2)
    const label = text(bot.name, 12)
    label.anchor.set(.5, 0); label.y = 3
    const bubble = new Container({ y: -65, visible: false })
    const bubbleBox = new Graphics()
    const bubbleLabel = text('', 11)
    bubbleLabel.anchor.set(.5, .5)
    bubble.addChild(bubbleBox, bubbleLabel)
    const halo = new Graphics().ellipse(0, -3, 20, 7).stroke({ width: 2, color: '#749b80' })
    halo.visible = false
    holder.addChild(shadow, halo, sprite, label, bubble)
    if (member) {
      holder.eventMode = 'static'; holder.cursor = 'pointer'; holder.hitArea = new Rectangle(-30, -64, 60, 88)
      holder.on('pointertap', event => { event.stopPropagation(); select(bot.id); element.focus({ preventScroll: true }); onSelect?.(bot.id) })
      holder.on('pointerover', () => { bubble.visible = true })
      holder.on('pointerout', () => { bubble.visible = selected === bot.id || ['waiting', 'speaking'].includes(current.members.find(entry => entry.bot.id === bot.id)?.state) })
    }
    root.addChild(holder)
    return { bot, holder, sprite, bubble, bubbleBox, bubbleLabel, halo, getFrame, home: { ...position }, position: { ...position }, path: [], phase: -1, member }
  }

  function updateBubble(actor, state) {
    const [label, color] = STATES[state] ?? STATES.idle
    actor.bubbleLabel.text = translate(label)
    const width = actor.bubbleLabel.width + 16
    actor.bubbleBox.clear().rect(-width / 2, -12, width, 24).fill('#fbf5e7').stroke({ color, width: 2 })
      .poly([-4, 12, 2, 17, 5, 12], true).fill('#fbf5e7')
    actor.bubble.visible = selected === actor.bot.id || ['waiting', 'speaking'].includes(state)
  }

  function select(id) {
    selected = id
    for (const actor of actors) { actor.halo.visible = actor.bot.id === id; updateBubble(actor, actor.member.state) }
  }

  function rebuild() {
    if (root) { app.stage.removeChild(root); root.destroy({ children: true }) }
    for (const value of textures) value.destroy(true)
    textures = []; actors = []; petals = []
    root = new Container({ sortableChildren: true, eventMode: 'static', hitArea: new Rectangle(0, 0, current.layout.width, current.layout.height) })
    const background = new Sprite({ texture: texture(roomCanvas(current, isLobby)), roundPixels: true })
    background.scale.set(2); background.zIndex = -1000
    root.addChild(background)
    const sign = text(isLobby ? translate('Reception') : current.name, 14, '#695d4c')
    sign.position.set(265, 112); sign.zIndex = -1
    root.addChild(sign)
    root.on('pointertap', (event) => {
      element.focus({ preventScroll: true })
      const point = root.toLocal(event.global)
      if (point.x > 155 && point.x < 225 && point.y > current.layout.height - 73) { onExit?.(); return }
      if (!isLobby) visitorPath = pathTo(visitorPosition, point, current.layout)
    })
    const shown = isLobby ? [] : current.members
    actors = shown.map((member, index) => {
      const desk = current.layout.desks[index]
      const actor = character(member.bot, { x: desk.x + 49, y: desk.y + 95 }, member)
      updateBubble(actor, member.state)
      return actor
    })
    const catFrames = [texture(catCanvas(0)), texture(catCanvas(1))]
    cat = new Sprite({ texture: catFrames[0], anchor: { x: .5, y: 1 }, roundPixels: true })
    cat.scale.set(2); cat.position.set(135, current.layout.height - 57); cat.zIndex = cat.y
    cat.eventMode = 'static'; cat.cursor = 'pointer'
    cat.on('pointertap', (event) => { event.stopPropagation(); cat.scale.set(2.3); setTimeout(() => { if (!disposed && !cat.destroyed) cat.scale.set(2) }, 240) })
    cat.officeFrames = catFrames
    root.addChild(cat)
    if (!walkable(visitorPosition, current.layout)) visitorPosition = { x: 190, y: current.layout.height - 70 }
    visitorPath = []
    visitor = character({ id: 'office-visitor', name: translate('You'), officeAvatar: defaultPixelAvatar({ id: 'office-visitor', name: 'You' }) }, visitorPosition)
    visitor.holder.zIndex = visitorPosition.y
    for (let index = 0; index < 12; index++) {
      const petal = new Graphics().rect(0, 0, 4, 2).fill(index % 2 ? '#d8ab9d' : '#eec7b5')
      petal.alpha = .7; petal.zIndex = 2000
      root.addChild(petal)
      petals.push({ node: petal, phase: index * .83 })
    }
    app.stage.addChild(root)
    select(selected)
    resize()
  }

  function update(nextFloor, nextLobby = false) {
    if (disposed) return
    const key = `${nextFloor.id}|${nextLobby}|${JSON.stringify(nextFloor.theme)}|${nextFloor.members.map(member => `${member.bot.id}:${member.bot.name}:${member.bot.officeAvatar?.generatedAt ?? 0}`).join(',')}`
    const changedFloor = current.id !== nextFloor.id || isLobby !== nextLobby
    current = nextFloor; isLobby = nextLobby
    if (!ready) return
    if (changedFloor) visitorPosition = { x: 190, y: current.layout.height - 70 }
    if (key !== lastKey) { lastKey = key; rebuild() }
    else actors.forEach((actor, index) => { actor.member = current.members[index]; updateBubble(actor, actor.member.state) })
  }

  const moveKeys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'w', 'a', 's', 'd', 'W', 'A', 'S', 'D']
  const onDown = (event) => {
    if (moveKeys.includes(event.key) && document.activeElement === element) { event.preventDefault(); keys.add(event.key.toLowerCase()); visitorPath = [] }
    if ((event.key === 'Enter' || event.key === 'e') && document.activeElement === element && actors.length > 0) {
      event.preventDefault()
      const nearest = actors.reduce((a, b) => Math.hypot(a.position.x - visitorPosition.x, a.position.y - visitorPosition.y) < Math.hypot(b.position.x - visitorPosition.x, b.position.y - visitorPosition.y) ? a : b)
      select(nearest.bot.id); onSelect?.(nearest.bot.id)
    }
  }
  const onUp = event => keys.delete(event.key.toLowerCase())
  const onBlur = () => keys.clear()
  const visible = () => {
    keys.clear()
    if (!ready || disposed) return
    if (document.hidden) app.stop(); else app.start()
  }

  function tick(ticker) {
    const seconds = Math.min(ticker.deltaMS / 1000, .05)
    if (!reducedMotion) elapsed += seconds
    const frame = reducedMotion ? 0 : Math.floor(elapsed * 4) % 2
    for (const actor of actors) {
      const state = actor.member.state
      const phase = Math.floor(elapsed / 8 + hashOf(actor.bot.id) % 20)
      const idleState = ['tea', 'stretch', 'walk', 'idle'][phase % 4]
      const resting = state === 'idle' && !reducedMotion
      if (actor.phase !== phase || !resting) {
        actor.phase = phase
        const target = resting && idleState === 'walk' ? { x: actor.home.x + (phase % 2 ? 35 : -35), y: actor.home.y } : actor.home
        actor.path = pathTo(actor.position, target, current.layout)
      }
      const move = stepAlong(actor.position, actor.path, 35, seconds)
      actor.position = move.position; actor.path = move.path
      actor.holder.position.set(Math.round(actor.position.x), Math.round(actor.position.y))
      actor.holder.zIndex = actor.position.y
      const pose = actor.path.length > 0 ? 'walk' : resting ? idleState : state
      actor.sprite.texture = actor.getFrame(pose, frame)
      actor.sprite.alpha = state === 'away' ? .48 : 1
      if (state === 'thinking') actor.bubble.y = -65 - (reducedMotion ? 0 : Math.round(Math.sin(elapsed * 2) * 2))
    }
    if (!isLobby) {
      let dx = Number(keys.has('arrowright') || keys.has('d')) - Number(keys.has('arrowleft') || keys.has('a'))
      let dy = Number(keys.has('arrowdown') || keys.has('s')) - Number(keys.has('arrowup') || keys.has('w'))
      const length = Math.hypot(dx, dy) || 1
      dx = dx / length * seconds * 115; dy = dy / length * seconds * 115
      if (walkable({ x: visitorPosition.x + dx, y: visitorPosition.y }, current.layout)) visitorPosition.x += dx
      if (walkable({ x: visitorPosition.x, y: visitorPosition.y + dy }, current.layout)) visitorPosition.y += dy
      const moving = stepAlong(visitorPosition, visitorPath, 115, seconds)
      visitorPosition = moving.position; visitorPath = moving.path
      visitor.holder.position.set(Math.round(visitorPosition.x), Math.round(visitorPosition.y)); visitor.holder.zIndex = visitorPosition.y
      visitor.sprite.texture = visitor.getFrame(dx || dy || visitorPath.length ? 'walk' : 'idle', frame)
    }
    cat.texture = cat.officeFrames[frame]
    for (const petal of petals) {
      const phase = elapsed * 8 + petal.phase * 42
      petal.node.position.set(470 + Math.sin(phase * .02) * 70 + petal.phase * 9, 70 + phase % 220)
      petal.node.visible = !reducedMotion
    }
  }

  try {
    await app.init({ width: Math.max(element.clientWidth, 240), height: Math.max(element.clientHeight, 220), antialias: false, backgroundAlpha: 0, preference: 'webgl', resolution: Math.min(window.devicePixelRatio || 1, 2), autoDensity: true, roundPixels: true })
    if (disposed) { app.destroy(true, { children: true }); return null }
    ready = true
    app.canvas.setAttribute('aria-hidden', 'true')
    element.appendChild(app.canvas)
    app.ticker.maxFPS = reducedMotion ? 12 : 30
    update(floor, lobby)
    app.ticker.add(tick)
    app.render()
    observer.observe(element)
    element.addEventListener('keydown', onDown); window.addEventListener('keyup', onUp); element.addEventListener('blur', onBlur)
    document.addEventListener('visibilitychange', visible)
    visible()
  } catch (error) {
    disposed = true; observer.disconnect()
    if (ready) app.destroy(true, { children: true })
    onError?.(error)
    throw error
  }
  return {
    update,
    select,
    setReducedMotion(value) { reducedMotion = value; app.ticker.maxFPS = value ? 12 : 30 },
    snapshot: () => ({ floorId: current.id, lobby: isLobby, desks: isLobby ? 0 : actors.length, members: actors.map(actor => ({ id: actor.bot.id, state: actor.member.state })), visitor: { ...visitorPosition } }),
    destroy() {
      if (disposed) return
      disposed = true; observer.disconnect(); keys.clear()
      element.removeEventListener('keydown', onDown); window.removeEventListener('keyup', onUp); element.removeEventListener('blur', onBlur)
      document.removeEventListener('visibilitychange', visible)
      app.destroy(true, { children: true })
      for (const value of textures) if (!value.destroyed) value.destroy(true)
      textures = []
    },
  }
}
