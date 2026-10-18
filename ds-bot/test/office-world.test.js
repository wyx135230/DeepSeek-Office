import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createOfficeWorld, canStand, findPath, clearSegment, nearInteraction, facing } from '../src/shared/office/world.js'

const facilities = world => world.rooms.filter(room => room.kind !== 'work')
const verifyRoute = (world, start, target) => {
  assert.ok(canStand(target, world), `walkable: ${JSON.stringify(target)}`)
  const route = findPath(start, target, world)
  assert.ok(route.length, `reachable: ${JSON.stringify(target)}`)
  let last = start
  for (const point of route) { assert.ok(clearSegment(last, point, world)); last = point }
  assert.deepEqual(route.at(-1), { x: target.x, y: target.y })
}

test('all team sizes and lobbies connect every desk, activity and doorway', () => {
  for (const seed of ['alpha', 'beta', 'gamma', 'delta']) for (let count = 0; count <= 12; count++) for (const lobby of [false, true]) {
    const world = createOfficeWorld(count, lobby, seed)
    assert.equal(world.desks.length, lobby ? 0 : count)
    assert.ok(canStand(world.spawn, world))
    assert.equal(facilities(world).length, 3)
    for (const target of [...world.props, ...world.stations, ...world.desks.map(desk => desk.home)]) verifyRoute(world, world.spawn, target)
    for (const room of world.rooms) {
      const door = world.doors.find(door => door.id === room.doorId)
      assert.equal(door.roomId, room.id)
      assert.equal(door.width, 64)
      verifyRoute(world, world.spawn, { x: door.x + 32, y: door.y + 8 })
    }
  }
})

test('a floor seed preserves facilities and original work rooms as membership grows', () => {
  const initial = createOfficeWorld(4, false, 'team-design')
  for (const count of [5, 8, 9, 12]) {
    const world = createOfficeWorld(count, false, 'team-design')
    assert.deepEqual(facilities(world), facilities(initial))
    assert.deepEqual(world.rooms.filter(room => room.kind === 'work').slice(0, 1), initial.rooms.filter(room => room.kind === 'work'))
    assert.deepEqual(world.desks.slice(0, 4), initial.desks)
    assert.deepEqual(world.stations.filter(station => facilities(initial).some(room => room.id === station.roomId)), initial.stations.filter(station => facilities(initial).some(room => room.id === station.roomId)))
  }
  assert.deepEqual(createOfficeWorld(4, false, 'team-design'), initial)
})

test('four orderly desks fit each work room, with new rooms at members five and nine', () => {
  for (const [count, roomCount] of [[0, 1], [4, 1], [5, 2], [8, 2], [9, 3], [12, 3], [99, 3]]) {
    const world = createOfficeWorld(count)
    const work = world.rooms.filter(room => room.kind === 'work')
    assert.equal(work.length, roomCount)
    assert.ok(world.desks.length <= 12)
    for (const room of work) {
      const desks = world.desks.filter(desk => desk.roomId === room.id)
      assert.ok(desks.length <= 4)
      assert.ok(new Set(desks.map(desk => desk.x)).size <= 2)
      assert.ok(new Set(desks.map(desk => desk.y)).size <= 2)
    }
  }
})

test('floor seeds vary room slots and cover all six orderly facility templates', () => {
  const signatures = new Set(), kinds = new Set()
  for (let i = 0; i < 24; i++) {
    const world = createOfficeWorld(8, false, `floor-${i}`)
    for (const room of facilities(world)) kinds.add(room.kind)
    signatures.add(JSON.stringify(world.rooms.map(({ kind, x, y }) => ({ kind, x, y }))))
    for (const list of [world.furniture, world.stations, world.props, world.rooms, world.doors]) assert.equal(new Set(list.map(item => item.id)).size, list.length)
    for (const fixture of world.furniture) {
      assert.equal(fixture.x % 16, 0)
      assert.equal(fixture.y % 16, 0)
      assert.ok(world.rooms.some(room => room.id === fixture.roomId))
    }
  }
  assert.deepEqual([...kinds].sort(), ['arcade', 'bar', 'cafe', 'gym', 'library', 'restaurant'])
  assert.ok(signatures.size >= 12)
})

test('walls block feet and interactions while doorways are real passable portals', () => {
  const world = createOfficeWorld(12, false, 'doors')
  for (const room of world.rooms) {
    const door = world.doors.find(door => door.id === room.doorId)
    const x = door.x + 32, y = door.y + 8
    assert.ok(clearSegment({ x, y: y - 24 }, { x, y: y + 24 }, world))
    assert.equal(canStand({ x: door.x - 16, y }, world), false)
    assert.equal(clearSegment({ x: door.x - 16, y: y - 24 }, { x: door.x - 16, y: y + 24 }, world), false)
    assert.equal(nearInteraction({ x: door.x - 16, y: y - 16 }, [{ x: door.x - 16, y: y + 16 }], world), null)
    assert.equal(canStand({ x: room.x + 8, y: room.y + 128 }, world), false)
  }
})

test('empty room slots cannot be crossed or used as destinations', () => {
  const world = createOfficeWorld(0, false, 'empty-slots')
  const empty = [{ x: 32, y: 32 }, { x: 432, y: 32 }, { x: 832, y: 32 }, { x: 32, y: 432 }, { x: 432, y: 432 }, { x: 832, y: 432 }].find(slot => !world.rooms.some(room => room.x === slot.x && room.y === slot.y))
  const target = { x: empty.x + 192, y: empty.y + 160 }
  assert.equal(canStand(target, world), false)
  assert.deepEqual(findPath(world.spawn, target, world), [])
  const edge = { x: empty.x + 192, y: empty.y < 352 ? 344 : 440 }
  assert.ok(world.walls.some(wall => edge.x > wall.x && edge.x < wall.x + wall.width && edge.y > wall.y && edge.y < wall.y + wall.height), 'empty slots have physical corridor barriers')
  for (const x of [424, 824]) for (const y of [344, 440]) assert.ok(world.walls.some(wall => x > wall.x && x < wall.x + wall.width && y > wall.y && y < wall.y + wall.height), 'room gaps have physical corridor barriers')
})

test('navigation uses direct clear paths and starts next to collision boundaries', () => {
  const world = createOfficeWorld(12, false, 'routes')
  const target = { x: world.spawn.x + 64, y: world.spawn.y }
  assert.deepEqual(findPath(world.spawn, target, world), [target])
  for (const room of world.rooms) {
    const door = world.doors.find(door => door.id === room.doorId)
    verifyRoute(world, { x: door.x + 7, y: door.y + 8 }, world.spawn)
  }
})

test('interaction stays local and direction remains stable while stopped', () => {
  const world = createOfficeWorld(0)
  const target = { x: world.spawn.x + 32, y: world.spawn.y }
  assert.equal(nearInteraction(world.spawn, [target], world), target)
  assert.equal(nearInteraction(world.spawn, [{ x: target.x + 16, y: target.y }], world), null)
  assert.equal(facing(0, -1), 'up'); assert.equal(facing(-1, 0), 'left')
  assert.equal(facing(1, 0), 'right'); assert.equal(facing(0, 1), 'down')
  assert.equal(facing(0, 0, 'left'), 'left')
})
