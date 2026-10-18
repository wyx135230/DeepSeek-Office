// Coordinates use native art pixels; the camera owns their display scale.
export const WALK_SPEED = 100
export const RUN_SPEED = 155
export const REACH = 40
export const FOOT_RADIUS = 6
const GRID = 8
const ROOM_WIDTH = 384
const ROOM_HEIGHT = 320
const WALL = 16
const navigation = new WeakMap()
const xy = ({ x, y }) => ({ x, y })
const key = p => `${p.x},${p.y}`
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y)

function hash(value) {
  let result = 2166136261
  for (const letter of String(value)) result = Math.imul(result ^ letter.charCodeAt(0), 16777619)
  return result >>> 0
}

function shuffled(items, seed) {
  const result = [...items]
  let state = hash(seed)
  for (let i = result.length - 1; i > 0; i--) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    const j = state % (i + 1)
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

const ROOM_NAMES = { cafe: 'Coffee studio', library: 'Reading room', arcade: 'Arcade lounge', restaurant: 'Studio kitchen', bar: 'Mocktail bar', gym: 'Movement room' }
const ACTIVITIES = {
  coffee: ['Make a coffee', 'Grind the beans and pour a fresh cup.'],
  reading: ['Read a book', 'Settle into a story or explore the studio sketchbook.'],
  arcade: ['Play the arcade', 'A quick keyboard challenge. Try for a new high score.'],
  meal: ['Prepare a meal', 'Put together a fresh meal and enjoy a quiet lunch.'],
  drink: ['Mix a mocktail', 'Choose a bright, alcohol-free recipe and mix a refreshing drink.'],
  exercise: ['Take an exercise break', 'Follow a short stretch and movement routine.'],
}

function furnish(room, world, deskCount) {
  const add = (suffix, kind, x, y, width, height) => {
    const fixture = { id: `${room.id}-${suffix}`, roomId: room.id, kind, x: room.x + x, y: room.y + y, width, height }
    world.furniture.push(fixture)
    return fixture
  }
  const station = (suffix, kind, x, y, pose) => {
    const spot = { id: `${room.id}-${suffix}`, roomId: room.id, kind, x: room.x + x, y: room.y + y, direction: kind === 'reading' ? 'down' : 'up' }
    if (pose) { spot.poseX = room.x + pose.x; spot.poseY = room.y + pose.y }
    world.stations.push(spot)
    if (ACTIVITIES[kind]) world.props.push({ ...spot, label: ACTIVITIES[kind][0], text: ACTIVITIES[kind][1] })
  }
  if (room.kind === 'work') {
    for (let i = 0; i < deskCount; i++) {
      const desk = add(`desk-${i + 1}`, 'desk', 64 + i % 2 * 160, 64 + Math.floor(i / 2) * 96, 80, 32)
      desk.home = { x: desk.x + 40, y: desk.y + 64 }
      world.desks.push(desk)
    }
    add('sofa', 'sofa', 64, 256, 80, 16)
    for (let i = 0; i < 2; i++) {
      add(`chair-${i + 1}`, 'chair', 240 + i * 48, 256, 32, 16)
      station(`chat-${i + 1}`, 'chat', 256 + i * 48, 288, { x: 256 + i * 48, y: 272 })
    }
  } else if (room.kind === 'cafe') {
    add('counter', 'coffee', 64, 64, 192, 32)
    station('coffee-1', 'coffee', 112, 128)
    station('coffee-2', 'coffee', 208, 128)
    add('sofa', 'sofa', 64, 224, 128, 16)
    add('table', 'meeting', 224, 208, 80, 32)
  } else if (room.kind === 'library') {
    add('shelf-1', 'books', 48, 64, 64, 32)
    add('shelf-2', 'books', 176, 64, 112, 32)
    for (let i = 0; i < 2; i++) {
      add(`seat-${i + 1}`, 'reading', 80 + i * 160, 160, 48, 32)
      station(`reading-${i + 1}`, 'reading', 104 + i * 160, 224, { x: 104 + i * 160, y: 192 })
    }
  } else if (room.kind === 'arcade') {
    for (let i = 0; i < 3; i++) {
      add(`cabinet-${i + 1}`, 'arcade', 64 + i * 96, 64, 48, 32)
      station(`arcade-${i + 1}`, 'arcade', 88 + i * 96, 128)
    }
    add('sofa', 'sofa', 64, 224, 128, 16)
  } else if (room.kind === 'restaurant') {
    for (let i = 0; i < 2; i++) {
      add(`table-${i + 1}`, 'dining-table', 64 + i * 160, 80, 112, 48)
      add(`chair-${i + 1}`, 'chair', 96 + i * 160, 128, 32, 16)
      station(`meal-${i + 1}`, 'meal', 112 + i * 160, 176, { x: 112 + i * 160, y: 144 })
    }
    add('prep', 'kitchen-prep', 224, 272, 96, 16)
  } else if (room.kind === 'bar') {
    add('counter', 'bar', 64, 64, 224, 32)
    station('drink-1', 'drink', 112, 128)
    station('drink-2', 'drink', 240, 128)
    add('sofa', 'sofa', 64, 224, 128, 16)
  } else if (room.kind === 'gym') {
    for (let i = 0; i < 2; i++) {
      add(`equipment-${i + 1}`, 'exercise', 64 + i * 160, 80, 64, 48)
      station(`exercise-${i + 1}`, 'exercise', 96 + i * 160, 176)
    }
    add('rack', 'weight-rack', 224, 272, 96, 16)
  }
  add('planter', 'planter', 336, 64, 24, 16)
}

function enclose(room, world) {
  const top = room.y === 32
  const door = { id: room.doorId, roomId: room.id, x: room.x + 160, y: top ? room.y + ROOM_HEIGHT - WALL : room.y, width: 64, height: WALL, axis: 'horizontal' }
  world.doors.push(door)
  const wall = (suffix, x, y, width, height) => world.walls.push({ id: `${room.id}-wall-${suffix}`, roomId: room.id, x, y, width, height })
  wall('left', room.x, room.y, WALL, ROOM_HEIGHT)
  wall('right', room.x + ROOM_WIDTH - WALL, room.y, WALL, ROOM_HEIGHT)
  wall('back', room.x + WALL, top ? room.y : room.y + ROOM_HEIGHT - WALL, ROOM_WIDTH - WALL * 2, WALL)
  wall('door-left', room.x + WALL, door.y, 144, WALL)
  wall('door-right', room.x + 224, door.y, 144, WALL)
}

export function createOfficeWorld(count, lobby = false, seed = 'office') {
  const size = Math.max(0, Math.min(12, Math.floor(Number(count) || 0)))
  const slots = shuffled([0, 1, 2, 3, 4, 5], `${seed}:slots`)
  const kinds = shuffled(Object.keys(ROOM_NAMES), `${seed}:facilities`).slice(0, 3)
  const roomCount = lobby ? 1 : Math.max(1, Math.ceil(size / 4))
  const corridor = { id: 'corridor', x: 32, y: 352, width: 1184, height: 80 }
  const world = {
    seed: String(seed), width: 1248, height: 784,
    bounds: { x: 32, y: 32, width: 1184, height: 720 },
    rooms: [], walls: [], doors: [], corridors: [corridor], walkAreas: [corridor],
    desks: [], furniture: [], stations: [], props: [], spawn: { x: 624, y: 392 },
  }
  const createRoom = (id, kind, name, slot) => {
    const room = { id, kind, name, x: 32 + slot % 3 * 400, y: slot < 3 ? 32 : 432, width: ROOM_WIDTH, height: ROOM_HEIGHT, doorId: `${id}-door`, material: ['oak', 'walnut', 'sage'][hash(`${seed}:${id}:material`) % 3], variant: hash(`${seed}:${id}:variant`) % 3 }
    world.rooms.push(room)
    world.walkAreas.push({ x: room.x, y: room.y, width: room.width, height: room.height })
    enclose(room, world)
    return room
  }
  kinds.forEach((kind, i) => furnish(createRoom(`facility-${kind}`, kind, ROOM_NAMES[kind], slots[i]), world, 0))
  for (let i = 0; i < roomCount; i++) {
    const room = createRoom(`work-${i + 1}`, 'work', lobby ? 'Welcome studio' : `Work studio ${i + 1}`, slots[i + 3])
    furnish(room, world, lobby ? 0 : Math.max(0, Math.min(4, size - i * 4)))
  }
  const corridorWall = (id, x, y, width, height) => world.walls.push({ id: `corridor-wall-${id}`, roomId: 'corridor', x, y, width, height })
  for (let slot = 0; slot < 6; slot++) {
    const x = 32 + slot % 3 * 400, y = slot < 3 ? 336 : 432
    if (!world.rooms.some(room => room.x === x && room.y === (slot < 3 ? 32 : 432))) corridorWall(`empty-${slot}`, x, y, ROOM_WIDTH, WALL)
  }
  for (const x of [416, 816]) for (const y of [336, 432]) corridorWall(`seam-${x}-${y}`, x, y, WALL, WALL)
  corridorWall('left', 16, 352, WALL, 80)
  corridorWall('right', 1216, 352, WALL, 80)
  world.props.push(
    { id: 'lift', roomId: 'corridor', kind: 'lift', x: 624, y: 400, label: lobby ? 'Floor directory' : 'Take the lift', text: 'Choose a floor to visit your team.' },
    { id: 'dog', roomId: 'corridor', kind: 'dog', x: 560, y: 400, label: 'Pet Momo', text: 'Momo: woof! A tiny tail, a very big welcome.' },
  )
  return world
}

const inside = (p, r) => p.x >= r.x && p.x <= r.x + r.width && p.y >= r.y && p.y <= r.y + r.height

export function canStand(point, world, radius = FOOT_RADIUS) {
  const b = world.bounds
  if (point.x < b.x + radius || point.x > b.x + b.width - radius || point.y < b.y + radius || point.y > b.y + b.height - radius) return false
  if (world.walkAreas && ![[0, 0], [-radius, -radius], [radius, -radius], [-radius, radius], [radius, radius]].every(([dx, dy]) => world.walkAreas.some(area => inside({ x: point.x + dx, y: point.y + dy }, area)))) return false
  return ![...(world.walls ?? []), ...(world.furniture ?? [])].some(r => point.x > r.x - radius && point.x < r.x + r.width + radius && point.y > r.y - radius && point.y < r.y + r.height + radius)
}

export function clearSegment(a, b, world) {
  const steps = Math.max(1, Math.ceil(distance(a, b) / 2))
  for (let i = 0; i <= steps; i++) if (!canStand({ x: a.x + (b.x - a.x) * i / steps, y: a.y + (b.y - a.y) * i / steps }, world)) return false
  return true
}

function gridFor(world) {
  let grid = navigation.get(world)
  if (!grid) {
    const points = new Map(), edges = new Map()
    grid = {
      valid(p) {
        const id = key(p)
        if (!points.has(id)) points.set(id, canStand(p, world))
        return points.get(id)
      },
      linked(a, b) {
        if (!grid.valid(b)) return false
        const id = [key(a), key(b)].sort().join('|')
        if (!edges.has(id)) edges.set(id, clearSegment(a, b, world))
        return edges.get(id)
      },
    }
    // Geometry is immutable for the lifetime of a generated world.
    navigation.set(world, grid)
  }
  return grid
}

class Frontier {
  items = []
  push(node) {
    const items = this.items
    items.push(node)
    let i = items.length - 1
    while (i > 0) {
      const parent = Math.floor((i - 1) / 2)
      if (items[parent].score <= node.score) break
      items[i] = items[parent]
      i = parent
    }
    items[i] = node
  }
  pop() {
    const items = this.items, first = items[0], last = items.pop()
    if (items.length) {
      let i = 0
      while (i * 2 + 1 < items.length) {
        let child = i * 2 + 1
        if (child + 1 < items.length && items[child + 1].score < items[child].score) child++
        if (last.score <= items[child].score) break
        items[i] = items[child]
        i = child
      }
      items[i] = last
    }
    return first
  }
}

export function findPath(start, target, world) {
  if (!canStand(start, world) || !canStand(target, world)) return []
  if (clearSegment(start, target, world)) return [xy(target)]
  const grid = gridFor(world)
  const snap = p => {
    const x = Math.round(p.x / GRID) * GRID, y = Math.round(p.y / GRID) * GRID
    return [[0, 0], [GRID, 0], [-GRID, 0], [0, GRID], [0, -GRID], [GRID, GRID], [-GRID, GRID], [GRID, -GRID], [-GRID, -GRID]]
      .map(([dx, dy]) => ({ x: x + dx, y: y + dy })).filter(next => grid.valid(next) && clearSegment(p, next, world))
      .sort((a, b) => distance(a, p) - distance(b, p))[0]
  }
  const origin = snap(start), end = snap(target)
  if (!origin || !end) return []
  const heuristic = p => Math.abs(p.x - end.x) + Math.abs(p.y - end.y)
  const frontier = new Frontier(), costs = new Map([[key(origin), 0]]), parents = new Map(), closed = new Set()
  frontier.push({ ...origin, score: heuristic(origin) })
  while (frontier.items.length) {
    const p = frontier.pop(), id = key(p)
    if (closed.has(id)) continue
    if (id === key(end)) {
      const route = [xy(target), xy(p)]
      let back = parents.get(id)
      while (back) { route.push(xy(back)); back = parents.get(key(back)) }
      route.reverse()
      return route.filter((point, i) => i === 0 || i === route.length - 1 || (point.x - route[i - 1].x) * (route[i + 1].y - point.y) !== (point.y - route[i - 1].y) * (route[i + 1].x - point.x))
    }
    closed.add(id)
    for (const [dx, dy] of [[GRID, 0], [-GRID, 0], [0, GRID], [0, -GRID]]) {
      const next = { x: p.x + dx, y: p.y + dy }, nextId = key(next)
      const cost = costs.get(id) + GRID
      if (closed.has(nextId) || cost >= (costs.get(nextId) ?? Infinity) || !grid.linked(p, next)) continue
      costs.set(nextId, cost)
      parents.set(nextId, p)
      frontier.push({ ...next, score: cost + heuristic(next) * 1.001 })
    }
  }
  return []
}

export function nearInteraction(position, targets, world) {
  return targets.filter(target => distance(target, position) <= REACH && clearSegment(position, target, world))
    .sort((a, b) => distance(a, position) - distance(b, position))[0] ?? null
}

export function facing(dx, dy, previous = 'down') {
  if (Math.abs(dx) + Math.abs(dy) < .01) return previous
  return Math.abs(dx) > Math.abs(dy) ? dx < 0 ? 'left' : 'right' : dy < 0 ? 'up' : 'down'
}
