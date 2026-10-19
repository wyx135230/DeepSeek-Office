// Coordinates use native art pixels; the camera owns their display scale.
export const WALK_SPEED = 100
export const RUN_SPEED = 155
export const REACH = 40
export const FOOT_RADIUS = 6
export const OFFICE_GEOMETRY = Object.freeze({
  roomWidth: 320,
  roomHeight: 256,
  wall: 16,
  strideX: 336,
  rowTop: 32,
  rowBottom: 368,
  corridorY: 288,
  corridorHeight: 80,
  width: 1392,
  height: 656,
})
const GRID = 8
const ROOM_WIDTH = OFFICE_GEOMETRY.roomWidth
const ROOM_HEIGHT = OFFICE_GEOMETRY.roomHeight
const WALL = OFFICE_GEOMETRY.wall
const navigation = new WeakMap()
const xy = ({ x, y }) => ({ x, y })
const key = p => `${p.x},${p.y}`
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y)

// The original six slots keep their seeded addresses when the east wing grows.
export function officeRoomSlot(slot) {
  return { x: 32 + (slot < 6 ? slot % 3 : 3) * OFFICE_GEOMETRY.strideX, y: slot < 3 || slot === 6 ? OFFICE_GEOMETRY.rowTop : OFFICE_GEOMETRY.rowBottom }
}

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
  rest: ['Take a seat', 'Rest here for a moment.'],
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
    return spot
  }
  if (room.kind === 'work') {
    if (world.lobby) {
      add('reception', 'reception', 96, 48, 128, 24)
      add('sofa-left', 'sofa', 48, 176, 64, 16)
      add('sofa-right', 'sofa', 208, 176, 64, 16)
      add('table', 'coffee-table', 128, 176, 64, 32)
      add('plant-left', 'planter', 48, 224, 16, 16)
      return
    }
    for (let i = 0; i < deskCount; i++) {
      const desk = add(`desk-${i + 1}`, 'desk', 64 + i % 2 * 144, 32 + Math.floor(i / 2) * 96, 64, 24)
      desk.home = { x: desk.x + 32, y: desk.y + 46 }
      world.desks.push(desk)
    }
    add('sofa', 'sofa', 48, 192, 64, 16)
  } else if (room.kind === 'conference') {
    add('table', 'conference-table', 96, 96, 144, 48)
    const seat = (suffix, x, y, approachX, approachY, direction) => {
      const chair = add(suffix, 'chair', x - 8, y - 8, 16, 16)
      chair.direction = direction
      return { fixtureId: chair.id, roomId: room.id, x: room.x + approachX, y: room.y + approachY, poseX: room.x + x, poseY: room.y + y, direction, seated: true }
    }
    const head = seat('head', 72, 120, 48, 120, 'right')
    const seats = Array.from({ length: Math.min(8, deskCount) }, (_, i) => {
      const column = Math.floor(i / 2), south = i % 2 === 1, x = 112 + column * 32
      return seat(`${south ? 'south' : 'north'}-${column}`, x, south ? 168 : 72, x, south ? 200 : 48, south ? 'up' : 'down')
    })
    const standing = [[40, 64, 'right'], [280, 64, 'left'], [40, 192, 'right'], [280, 192, 'left']].map(([x, y, direction]) => ({ x: room.x + x, y: room.y + y, direction, seated: false, roomId: room.id }))
    const boardAtTop = room.y === OFFICE_GEOMETRY.rowTop
    add('board', 'meeting-board', 96, boardAtTop ? 24 : 224, 144, 8).direction = boardAtTop ? 'down' : 'up'
    world.meeting = { roomId: room.id, head, seats, standing }
    world.props.push({ id: `${room.id}-board`, roomId: room.id, kind: 'meeting-board', x: room.x + 160, y: room.y + (boardAtTop ? 48 : 208), label: 'Open group display', text: 'The complete group conversation, including earlier messages.' })
    world.props.push({ id: `${room.id}-meeting`, roomId: room.id, kind: 'meeting', x: room.x + 160, y: room.y + 216, label: 'Start a meeting', text: 'Gather your group around the conference table.' })
  } else if (room.kind === 'cinema') {
    add('television', 'television', 96, 24, 128, 24)
    for (let row = 0; row < 3; row++) for (let column = 0; column < 2; column++) {
      const sofa = add(`sofa-${row}-${column}`, 'sofa', 32 + column * 160, 96 + row * 56, 96, 16)
      sofa.seatCount = 3; sofa.direction = 'up'
    }
  } else if (room.kind === 'cafe') {
    add('counter', 'coffee', 48, 48, 96, 16)
    station('coffee-1', 'coffee', 64, 80)
    station('coffee-2', 'coffee', 128, 80)
    add('sofa', 'sofa', 48, 176, 64, 16)
    add('table', 'coffee-table', 176, 144, 64, 32)
  } else if (room.kind === 'library') {
    add('shelf-1', 'books', 48, 48, 48, 16)
    add('shelf-2', 'books', 144, 48, 64, 16)
    for (let i = 0; i < 2; i++) {
      add(`seat-${i + 1}`, 'reading', 48 + i * 112, 128, 32, 16)
      station(`reading-${i + 1}`, 'reading', 64 + i * 112, 160, { x: 64 + i * 112, y: 138 })
    }
  } else if (room.kind === 'arcade') {
    for (let i = 0; i < 3; i++) {
      add(`cabinet-${i + 1}`, 'arcade', 48 + i * 80, 48, 32, 16)
      station(`arcade-${i + 1}`, 'arcade', 64 + i * 80, 80)
    }
    add('sofa', 'sofa', 48, 176, 64, 16)
  } else if (room.kind === 'restaurant') {
    for (let i = 0; i < 2; i++) {
      add(`table-${i + 1}`, 'dining-table', 48 + i * 128, 64, 64, 32)
      add(`chair-${i + 1}`, 'chair', 64 + i * 128, 112, 16, 16)
      station(`meal-${i + 1}`, 'meal', 72 + i * 128, 144, { x: 72 + i * 128, y: 120 })
    }
    add('prep', 'kitchen-prep', 192, 208, 64, 16)
  } else if (room.kind === 'bar') {
    add('counter', 'bar', 48, 48, 128, 16)
    station('drink-1', 'drink', 64, 80)
    station('drink-2', 'drink', 144, 80)
    add('sofa', 'sofa', 48, 176, 64, 16)
  } else if (room.kind === 'gym') {
    for (let i = 0; i < 2; i++) {
      add(`equipment-${i + 1}`, 'exercise', 48 + i * 128, 64, 48, 32)
      station(`exercise-${i + 1}`, 'exercise', 64 + i * 128, 112)
    }
    add('rack', 'weight-rack', 192, 208, 64, 16)
  }
  if (room.kind !== 'conference') add('planter', 'planter', 272, 48, 16, 16)
}

function enclose(room, world) {
  const top = room.y === OFFICE_GEOMETRY.rowTop
  const door = { id: room.doorId, roomId: room.id, x: room.x + 128, y: top ? room.y + ROOM_HEIGHT - WALL : room.y, width: 64, height: WALL, axis: 'horizontal' }
  world.doors.push(door)
  const wall = (suffix, x, y, width, height) => world.walls.push({ id: `${room.id}-wall-${suffix}`, roomId: room.id, x, y, width, height })
  wall('left', room.x, room.y, WALL, ROOM_HEIGHT)
  wall('right', room.x + ROOM_WIDTH - WALL, room.y, WALL, ROOM_HEIGHT)
  wall('back', room.x + WALL, top ? room.y : room.y + ROOM_HEIGHT - WALL, ROOM_WIDTH - WALL * 2, WALL)
  wall('door-left', room.x + WALL, door.y, 128 - WALL, WALL)
  wall('door-right', room.x + 192, door.y, ROOM_WIDTH - WALL - 192, WALL)
}

export function createOfficeWorld(count, lobby = false, seed = 'office') {
  const size = Math.max(0, Math.min(12, Math.floor(Number(count) || 0)))
  const slots = shuffled([0, 1, 2, 3, 4, 5], `${seed}:slots`)
  const leisure = shuffled(Object.keys(ROOM_NAMES), `${seed}:facilities`)
  const kinds = lobby ? leisure.slice(0, 3) : ['conference', ...leisure.slice(0, 2)]
  const roomCount = lobby ? 1 : Math.max(1, Math.ceil(size / 4))
  const geo = OFFICE_GEOMETRY
  const corridor = { id: 'corridor', x: 32, y: geo.corridorY, width: geo.width - 64, height: geo.corridorHeight }
  const world = {
    seed: String(seed), width: geo.width, height: geo.height, lobby,
    bounds: { x: 32, y: 32, width: geo.width - 64, height: 592 },
    rooms: [], walls: [], doors: [], corridors: [corridor], walkAreas: [corridor],
    desks: [], furniture: [], stations: [], props: [], spawn: { x: 528, y: 328 },
    elevator: { cabin: { x: geo.width - 96, y: 296, width: 64, height: 64 }, center: { x: geo.width - 64, y: 328 }, exit: { x: geo.width - 120, y: 328 } },
  }
  const createRoom = (id, kind, name, slot) => {
    const room = { id, kind, name, ...officeRoomSlot(slot), width: ROOM_WIDTH, height: ROOM_HEIGHT, doorId: `${id}-door`, material: ['oak', 'walnut', 'sage'][hash(`${seed}:${id}:material`) % 3], variant: hash(`${seed}:${id}:variant`) % 3 }
    world.rooms.push(room)
    world.walkAreas.push({ x: room.x, y: room.y, width: room.width, height: room.height })
    enclose(room, world)
    return room
  }
  kinds.forEach((kind, i) => furnish(createRoom(`facility-${kind}`, kind, ROOM_NAMES[kind] ?? 'Meeting room', slots[i]), world, kind === 'conference' ? size : 0))
  for (let i = 0; i < roomCount; i++) {
    const room = createRoom(`work-${i + 1}`, 'work', lobby ? 'Welcome studio' : `Work studio ${i + 1}`, slots[i + 3])
    furnish(room, world, lobby ? 0 : Math.max(0, Math.min(4, size - i * 4)))
  }
  furnish(createRoom('facility-cinema', 'cinema', 'Screening room', 6), world, 0)
  for (const sofa of world.furniture.filter(f => f.kind === 'sofa')) for (let i = 0; i < (sofa.seatCount ?? 2); i++) {
    const up = sofa.direction === 'up', x = up ? sofa.x + (i + .5) * sofa.width / sofa.seatCount : sofa.x + 21 + i * 22
    const spot = { id: `${sofa.id}-rest-${i}`, fixtureId: sofa.id, roomId: sofa.roomId, kind: 'rest', x, y: sofa.y + (up ? -24 : 40), poseX: x, poseY: sofa.y + (up ? 6 : 10), direction: up ? 'up' : 'down' }
    world.stations.push(spot)
    world.props.push({ ...spot, label: 'Rest on the sofa', text: 'Take a comfortable seat.' })
  }
  const corridorWall = (id, x, y, width, height) => world.walls.push({ id: `corridor-wall-${id}`, roomId: 'corridor', x, y, width, height })
  const topWallY = geo.rowTop + ROOM_HEIGHT - WALL
  for (let slot = 0; slot < 8; slot++) {
    const { x, y } = officeRoomSlot(slot)
    if (!world.rooms.some(room => room.x === x && room.y === y)) corridorWall(`empty-${slot}`, x, y === geo.rowTop ? topWallY : y, ROOM_WIDTH, WALL)
  }
  for (const x of [32 + ROOM_WIDTH, 32 + geo.strideX + ROOM_WIDTH, 32 + 2 * geo.strideX + ROOM_WIDTH]) for (const y of [topWallY, geo.rowBottom]) corridorWall(`seam-${x}-${y}`, x, y, WALL, WALL)
  corridorWall('left', 16, geo.corridorY, WALL, geo.corridorHeight)
  corridorWall('right', geo.width - 32, geo.corridorY, WALL, geo.corridorHeight)
  const liftX = world.elevator.cabin.x
  corridorWall('lift-entry-top', liftX - 4, 288, 8, 26)
  corridorWall('lift-entry-bottom', liftX - 4, 342, 8, 26)
  corridorWall('lift-side-top', liftX + 4, 288, 60, 10)
  corridorWall('lift-side-bottom', liftX + 4, 358, 60, 10)
  world.props.push(
    { id: 'lift', roomId: 'corridor', kind: 'lift', x: world.elevator.center.x, y: world.elevator.center.y, label: 'Enter the lift', text: 'Step inside and choose your destination.' },
    { id: 'dog', roomId: 'corridor', kind: 'dog', x: 560, y: geo.corridorY + 40, label: 'Pet Momo', text: 'Momo: woof! A tiny tail, a very big welcome.' },
  )
  // Start inside the team's own work room; the lobby opens in its lounge.
  const homeRoom = world.rooms.find(room => room.kind === 'work')
  if (homeRoom) {
    const homeDoor = world.doors.find(door => door.id === homeRoom.doorId)
    world.spawn = lobby
      ? { x: homeRoom.x + 160, y: homeRoom.y + 140 }
      : { x: homeDoor.x + 32, y: homeRoom.y === geo.rowTop ? homeDoor.y - 56 : homeDoor.y + 56 }
  }
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

export function fixtureInteraction(id, point, world) {
  const fixture = world.furniture.find(f => f.id === id)
  if (!fixture) return null
  const kind = { books: 'reading', 'dining-table': 'meal', bar: 'drink', sofa: 'rest' }[fixture.kind] ?? fixture.kind
  if (!['coffee', 'reading', 'arcade', 'meal', 'drink', 'exercise', 'rest', 'meeting-board'].includes(kind)) return null
  const own = world.props.filter(p => p.fixtureId === id || p.id === id)
  const targets = own.length ? own : world.props.filter(p => p.roomId === fixture.roomId && p.kind === kind)
  return targets.sort((a, b) => distance(a, point) - distance(b, point))[0] ?? null
}

export function nearInteraction(position, targets, world) {
  return targets.filter(target => distance(target, position) <= REACH && clearSegment(position, target, world))
    .sort((a, b) => distance(a, position) - distance(b, position))[0] ?? null
}

export function facing(dx, dy, previous = 'down') {
  if (Math.abs(dx) + Math.abs(dy) < .01) return previous
  return Math.abs(dx) > Math.abs(dy) ? dx < 0 ? 'left' : 'right' : dy < 0 ? 'up' : 'down'
}
