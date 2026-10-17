import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createOfficeWorld, canStand, findPath, clearSegment, nearInteraction, facing } from '../src/shared/office-world.js'

test('every team size has accessible desks, props and an unobstructed entrance', () => {
  for (let n = 0; n <= 12; n++) {
    const world = createOfficeWorld(n)
    assert.equal(world.desks.length, n)
    assert.ok(canStand(world.spawn, world))
    for (const target of [...world.props, ...world.desks.map(d => ({ x: d.x + 24, y: d.y + 36 }))]) {
      const route = findPath(world.spawn, target, world)
      assert.ok(route.length, `${n} members: ${JSON.stringify(target)} is reachable`)
      let last = world.spawn
      for (const point of route) { assert.ok(clearSegment(last, point, world)); last = point }
    }
  }
})
test('paths reject furniture and outside walls and route around obstacles', () => {
  const world = createOfficeWorld(12)
  assert.deepEqual(findPath(world.spawn, { x: 180, y: 120 }, world), [])
  assert.deepEqual(findPath(world.spawn, { x: -8, y: 160 }, world), [])
  const route = findPath({ x: 160, y: 128 }, { x: 232, y: 128 }, world)
  assert.ok(route.length > 9)
})
test('interaction is local and cannot pass through furniture', () => {
  const world = createOfficeWorld(1)
  const target = { id: 'coworker', x: 192, y: 144 }
  assert.equal(nearInteraction(world.spawn, [target], world), null)
  assert.equal(nearInteraction({ x: 192, y: 160 }, [target], world)?.id, 'coworker')
  assert.equal(nearInteraction({ x: 192, y: 108 }, [{ x: 192, y: 132 }], world), null)
})
test('direction follows movement and remains stable while stopped', () => {
  assert.equal(facing(0, -1), 'up'); assert.equal(facing(-1, 0), 'left')
  assert.equal(facing(1, 0), 'right'); assert.equal(facing(0, 1), 'down')
  assert.equal(facing(0, 0, 'left'), 'left')
})
test('click movement can start beside a wall without snapping into it', () => {
  const world = createOfficeWorld(4)
  for (const start of [{ x: 37, y: 136 }, { x: 395, y: 136 }, { x: 192, y: 139 }, { x: 192, y: 108 }, { x: 192, y: 138 }, { x: 216, y: 84 }]) {
    const path = findPath(start, world.spawn, world)
    assert.ok(path.length)
    assert.ok(clearSegment(start, path[0], world))
  }
})
