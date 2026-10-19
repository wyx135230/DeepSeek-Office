import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createHash } from 'node:crypto'
import { createOfficeWorld, canStand, findPath, clearSegment, fixtureInteraction } from '../src/shared/office/world.js'
import { inElevator } from '../src/shared/office/elevator.js'
import { createOfficeLife } from '../src/shared/office/life.js'

test('screening room adds six three-person sofas with reachable seats facing the supplied TV', () => {
  for (const lobby of [false, true]) for (const count of [0, 4, 12]) {
    const world = createOfficeWorld(count, lobby, 'screening')
    const room = world.rooms.find(r => r.kind === 'cinema')
    assert.ok(room, 'each floor has a separate screening room')
    const furniture = world.furniture.filter(f => f.roomId === room.id)
    const tv = furniture.find(f => f.kind === 'television')
    assert.ok(tv)
    const sofas = furniture.filter(f => f.kind === 'sofa')
    assert.equal(sofas.length, 6)
    const rows = [...new Set(sofas.map(f => f.y))].sort((a, b) => a - b)
    assert.equal(rows[1] - rows[0], rows[2] - rows[1])
    assert.equal(new Set(sofas.map(f => f.x)).size, 2)
    for (const sofa of sofas) {
      assert.ok(sofa.y > tv.y + tv.height)
      const seats = world.stations.filter(s => s.fixtureId === sofa.id)
      assert.equal(seats.length, 3)
      assert.equal(seats[1].poseX - seats[0].poseX, seats[2].poseX - seats[1].poseX)
      for (const seat of seats) {
        assert.equal(seat.direction, 'up')
        assert.ok(seat.poseY > seat.y)
        assert.ok(canStand(seat, world))
        const route = findPath(world.spawn, seat, world)
        assert.ok(route.length)
        let previous = world.spawn
        for (const point of route) { assert.ok(clearSegment(previous, point, world)); assert.equal(inElevator(point, world.elevator), false); previous = point }
      }
      assert.equal(fixtureInteraction(sofa.id, seats[1], world).fixtureId, sofa.id)
    }
    assert.equal(world.stations.filter(s => s.roomId === room.id).length, 18)
    assert.ok(findPath(world.spawn, world.elevator.center, world).length)
  }
})

test('adding the east wing preserves every original room, furnishing and seat', () => {
  // Hashes captured before adding the room cover positions, IDs, variants and materials.
  for (const [count, lobby, seed, expected] of [
    [4, false, 'team-design', '22368d8924947b26545005815b89d5009bb00dbb9ece2dac27b6307c9c787ca8'],
    [12, false, 'alpha', '3041a67601121f277a1942d35d7f8d62ed6eddc7c316e4d288c5efa33f55a031'],
    [0, true, 'lobby', '6634e48c65429d61237413e57c9f09c6cd01380ccf6e2f58b0ff88e44c01a1b7'],
  ]) {
    const world = createOfficeWorld(count, lobby, seed)
    const roomIds = new Set(world.rooms.filter(r => r.kind !== 'cinema').map(r => r.id))
    const original = [world.rooms, world.furniture, world.stations].map(list => list.filter(item => roomIds.has(item.roomId ?? item.id)))
    assert.equal(createHash('sha256').update(JSON.stringify(original)).digest('hex'), expected)
  }
})

test('three coworkers reserve separate places on one sofa, leaving a visitor reservation free', () => {
  const world = createOfficeWorld(4, false, 'screening')
  const sofa = world.furniture.find(f => f.roomId === 'facility-cinema' && f.kind === 'sofa')
  const seats = world.stations.filter(s => s.fixtureId === sofa.id)
  const life = createOfficeLife({ ...world, stations: seats })
  const agents = world.desks.slice(0, 3).map((desk, i) => ({ id: `cinema-${i}`, state: 'idle', ...desk.home, home: desk.home }))
  life.step(0, agents)
  const states = life.step(5000, agents, { reserved: [seats[0].id] })
  const assigned = Object.values(states).map(s => s.stationId).filter(Boolean)
  assert.equal(assigned.length, 2); assert.equal(new Set(assigned).size, 2)
  assert.ok(!assigned.includes(seats[0].id))
  const allLife = createOfficeLife({ ...world, stations: seats })
  allLife.step(0, agents)
  const all = allLife.step(5000, agents)
  assert.equal(new Set(Object.values(all).map(s => s.stationId)).size, 3)
  for (const actor of agents) { const seat = seats.find(s => s.id === all[actor.id].stationId); actor.x = seat.x; actor.y = seat.y }
  const seated = allLife.step(5100, agents)
  for (const state of Object.values(seated)) { assert.equal(state.goal, null); assert.equal(state.direction, 'up') }
})
