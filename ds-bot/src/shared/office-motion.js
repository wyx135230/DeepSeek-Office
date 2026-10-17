const GRID = 16

export function walkable(point, layout) {
  if (point.x < 36 || point.x > layout.width - 40 || point.y < 145 || point.y > layout.height - 44) return false
  if (point.x < 174 && point.y < 420) return false
  return !layout.desks.some(desk => point.x > desk.x - 10 && point.x < desk.x + 106 && point.y > desk.y - 6 && point.y < desk.y + 66)
}

export function pathTo(start, target, layout) {
  if (!walkable(target, layout)) return []
  const snap = point => ({ x: Math.round(point.x / GRID) * GRID, y: Math.round(point.y / GRID) * GRID })
  const origin = snap(start)
  const end = snap(target)
  if (!walkable(end, layout)) return []
  const key = point => `${point.x},${point.y}`
  const queue = [origin]
  const visited = new Map([[key(origin), null]])
  for (let index = 0; index < queue.length; index++) {
    const point = queue[index]
    if (key(point) === key(end)) {
      const path = [target]
      let back = point
      while (visited.get(key(back))) { path.unshift(back); back = visited.get(key(back)) }
      return path
    }
    for (const [dx, dy] of [[GRID, 0], [-GRID, 0], [0, GRID], [0, -GRID]]) {
      const next = { x: point.x + dx, y: point.y + dy }
      if (!visited.has(key(next)) && walkable(next, layout)) { visited.set(key(next), point); queue.push(next) }
    }
  }
  return []
}

export function stepAlong(position, path, speed, seconds) {
  let remaining = speed * seconds
  const next = { ...position }
  const pending = [...path]
  while (pending.length > 0 && remaining > 0) {
    const target = pending[0]
    const dx = target.x - next.x
    const dy = target.y - next.y
    const distance = Math.hypot(dx, dy)
    if (distance <= remaining) { Object.assign(next, target); pending.shift(); remaining -= distance }
    else { next.x += dx / distance * remaining; next.y += dy / distance * remaining; remaining = 0 }
  }
  return { position: next, path: pending }
}
