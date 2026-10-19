const managers = new WeakMap()

function labelManager(scene) {
  if (managers.has(scene)) return managers.get(scene)
  const canvas = scene.game.canvas
  const parent = canvas.parentElement
  const root = document.createElement('div')
  root.className = 'of-world-labels'
  root.setAttribute('aria-hidden', 'true')
  Object.assign(root.style, { position: 'absolute', inset: '0', pointerEvents: 'none', overflow: 'hidden', zIndex: '2' })
  parent.appendChild(root)
  const labels = new Set()
  let disposed = false
  let metrics = { left: 0, top: 0, scaleX: 1, scaleY: 1 }
  const measure = () => {
    const bounds = canvas.getBoundingClientRect()
    const container = parent.getBoundingClientRect()
    const width = scene.scale.gameSize?.width || scene.scale.width || bounds.width
    const height = scene.scale.gameSize?.height || scene.scale.height || bounds.height
    metrics = { left: bounds.left - container.left - parent.clientLeft, top: bounds.top - container.top - parent.clientTop,
      scaleX: bounds.width / width, scaleY: bounds.height / height }
  }
  const render = () => {
    if (disposed) return
    const camera = scene.cameras.main
    const zoomX = camera.zoomX ?? camera.zoom ?? 1
    const zoomY = camera.zoomY ?? camera.zoom ?? 1
    const center = camera.midPoint ?? { x: camera.scrollX + camera.width / 2, y: camera.scrollY + camera.height / 2 }
    for (const label of labels) {
      const height = label.element.classList.contains('of-world-speech') ? 60 : 53
      const point = scene.view3d?.project(label.x, label.y + (height === 60 ? 42 : 36), height)
      const x = point?.x ?? camera.x + camera.width / 2 + (label.x - center.x) * zoomX
      const y = point?.y ?? camera.y + camera.height / 2 + (label.y - center.y) * zoomY
      const onCamera = point ? point.visible : x >= camera.x - 20 && x <= camera.x + camera.width + 20 && y >= camera.y - 40 && y <= camera.y + camera.height + 40
      label.element.style.display = label.visible && label.text && camera.visible !== false && onCamera ? 'block' : 'none'
      label.element.style.left = `${Math.round(metrics.left + x * metrics.scaleX)}px`
      label.element.style.top = `${Math.round(metrics.top + y * metrics.scaleY)}px`
    }
  }
  const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure)
  observer?.observe(canvas)
  observer?.observe(parent)
  window.addEventListener('resize', measure)
  const destroy = () => {
    if (disposed) return
    disposed = true
    scene.game.events.off('postrender', render)
    scene.events.off('shutdown', destroy)
    scene.events.off('destroy', destroy)
    observer?.disconnect()
    window.removeEventListener('resize', measure)
    labels.clear()
    root.remove()
    managers.delete(scene)
  }
  scene.game.events.on('postrender', render)
  scene.events.once('shutdown', destroy)
  scene.events.once('destroy', destroy)
  const manager = { root, labels, render, get metrics() { return metrics } }
  managers.set(scene, manager)
  measure()
  return manager
}

export function gameLabel(scene, value, { bubble = false } = {}) {
  const manager = labelManager(scene)
  const element = document.createElement('span')
  element.className = bubble ? 'of-world-label of-world-speech' : 'of-world-label of-world-name'
  Object.assign(element.style, { position: 'absolute', width: 'max-content', maxWidth: bubble ? '220px' : '160px', transform: 'translate(-50%, 0)' })
  manager.root.appendChild(element)
  let text = String(value ?? ''), visible = true, x = 0, y = 0, originX = 0.5, originY = 0, depth = 0, destroyed = false
  element.textContent = text
  const label = {
    element,
    get text() { return text },
    get visible() { return visible },
    get x() { return x },
    get y() { return y },
    get depth() { return depth },
    setText(value) { text = String(value ?? ''); element.textContent = text; if (!text) element.style.display = 'none'; return label },
    setPosition(nextX, nextY) { x = nextX; y = nextY; return label },
    setOrigin(nextX, nextY = nextX) { originX = nextX; originY = nextY; element.style.transform = `translate(${-originX * 100}%, ${-originY * 100}%)`; return label },
    setVisible(value) { visible = Boolean(value); if (!visible) element.style.display = 'none'; return label },
    setDepth(value) { depth = value; element.style.zIndex = String(Math.round(value)); return label },
    setBackgroundColor() { return label },
    getBounds() {
      const zoom = scene.cameras.main.zoom || 1
      const scale = manager.metrics
      const width = element.offsetWidth / (zoom * scale.scaleX || 1)
      const height = element.offsetHeight / (zoom * scale.scaleY || 1)
      return { x: x - width * originX, y: y - height * originY, width, height, left: x - width * originX, top: y - height * originY,
        right: x + width * (1 - originX), bottom: y + height * (1 - originY) }
    },
    destroy() { if (!destroyed) { destroyed = true; manager.labels.delete(label); element.remove() } }
  }
  manager.labels.add(label)
  manager.render()
  return label
}
