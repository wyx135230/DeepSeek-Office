// All coordinates are native art pixels. Rendering alone applies the display scale.
export const WALK_SPEED = 66
export const RUN_SPEED = 104
export const REACH = 25
export const FOOT_RADIUS = 4
const GRID = 8

export function createOfficeWorld(count, lobby = false) {
  const size = Math.max(0, Math.min(12, Math.floor(Number(count) || 0)))
  const width = 432
  const height = Math.max(320, 224 + Math.ceil(size / 3) * 64)
  const desks = lobby ? [] : Array.from({ length: size }, (_, i) => ({ x: 168 + i % 3 * 80, y: 112 + Math.floor(i / 3) * 64, width: 48, height: 22 }))
  const bounds = { x: 32, y: 80, width: width - 64, height: height - 112 }
  const furniture = [
    { x: 48, y: 96, width: 64, height: 24, kind: 'tea' },
    { x: 48, y: 152, width: 48, height: 24, kind: 'books' },
    ...desks.map(desk => ({ ...desk, kind: 'desk' })),
    ...(!lobby ? [{ x: 168, y: height - 104, width: 112, height: 24, kind: 'meeting' }] : [{ x: 202, y: 190, width: 30, height: 14, kind: 'table' }]),
    ...(lobby ? [{ x: 168, y: 112, width: 96, height: 24, kind: 'reception' }, { x: 288, y: 184, width: 64, height: 20, kind: 'sofa' }] : []),
  ]
  return { width, height, bounds, desks, furniture, spawn: { x: 216, y: height - 56 },
    props: [
      { id: 'lift', x: 216, y: height - 40, label: lobby ? 'Floor directory' : 'Take the lift', text: 'Where would you like to go?' },
      { id: 'tea', x: 80, y: 136, label: 'Make some tea', text: 'A warm cup of hojicha. Take a breath. Your team is right here.' },
      { id: 'books', x: 72, y: 192, label: 'Browse the bookshelf', text: 'Sketchbooks, half-finished ideas, and a guide to making wonderful things together.' },
      { id: 'dog', x: 120, y: height - 64, label: 'Pet Momo', text: 'Momo: woof! A tiny tail, a very big welcome.' },
    ] }
}

export function canStand(point, world, radius = FOOT_RADIUS) {
  const b = world.bounds
  if (point.x < b.x + radius || point.x > b.x + b.width - radius || point.y < b.y + radius || point.y > b.y + b.height - radius) return false
  return !world.furniture.some(r => point.x > r.x - radius && point.x < r.x + r.width + radius && point.y > r.y - radius && point.y < r.y + r.height + radius)
}

export function clearSegment(a, b, world) {
  const steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 2))
  for (let i = 0; i <= steps; i++) if (!canStand({ x: a.x + (b.x - a.x) * i / steps, y: a.y + (b.y - a.y) * i / steps }, world)) return false
  return true
}

export function findPath(start, target, world) {
  if (!canStand(start, world) || !canStand(target, world)) return []
  const snap = p => {
    const x = Math.round(p.x / GRID) * GRID, y = Math.round(p.y / GRID) * GRID
    return [[0, 0], [GRID, 0], [-GRID, 0], [0, GRID], [0, -GRID], [GRID, GRID], [-GRID, GRID], [GRID, -GRID], [-GRID, -GRID]]
      .map(([dx, dy]) => ({ x: x + dx, y: y + dy })).filter(point => clearSegment(p, point, world))
      .sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0]
  }
  const origin = snap(start), end = snap(target)
  if (!origin || !end) return []
  const key = p => `${p.x},${p.y}`
  const queue = [origin], visited = new Map([[key(origin), null]])
  for (let i = 0; i < queue.length; i++) {
    const p = queue[i]
    if (key(p) === key(end)) {
      const path = [target]
      let back = p
      while (back) { path.unshift(back); back = visited.get(key(back)) }
      return path
    }
    for (const [dx, dy] of [[GRID, 0], [-GRID, 0], [0, GRID], [0, -GRID]]) {
      const next = { x: p.x + dx, y: p.y + dy }
      if (!visited.has(key(next)) && clearSegment(p, next, world)) { visited.set(key(next), p); queue.push(next) }
    }
  }
  return []
}

export function nearInteraction(position, targets, world) {
  return targets.filter(t => Math.hypot(t.x - position.x, t.y - position.y) <= REACH && clearSegment(position, t, world))
    .sort((a, b) => Math.hypot(a.x - position.x, a.y - position.y) - Math.hypot(b.x - position.x, b.y - position.y))[0] ?? null
}

export function facing(dx, dy, previous = 'down') {
  if (Math.abs(dx) + Math.abs(dy) < .01) return previous
  return Math.abs(dx) > Math.abs(dy) ? dx < 0 ? 'left' : 'right' : dy < 0 ? 'up' : 'down'
}
