import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createElevatorJourney } from '../src/shared/office/elevator.js'
import { createOfficeWorld, canStand, findPath } from '../src/shared/office/world.js'

function bench() {
  let now = 0, current = 'a', floors = [{ id: 'lobby', number: 0 }, { id: 'a', number: 1 }, { id: 'b', number: 3 }], next = 0
  const tasks = new Map(), navigated = [], states = []
  const controller = createElevatorJourney({
    floors: () => floors, current: () => current, quiet: () => false, now: () => now,
    schedule: (fn, delay) => { const id = ++next; tasks.set(id, { fn, at: now + delay }); return id },
    cancel: id => tasks.delete(id), navigate: id => { current = id; navigated.push(id) },
    change: value => states.push(value), complete: () => states.push('complete'),
  })
  const tick = amount => {
    const end = now + amount
    for (;;) {
      const entry = [...tasks].filter(([, t]) => t.at <= end).sort((a, b) => a[1].at - b[1].at)[0]
      if (!entry) break
      now = entry[1].at; tasks.delete(entry[0]); entry[1].fn()
    }
    now = end
  }
  return { controller, tick, navigated, states, tasks, remove: id => { floors = floors.filter(f => f.id !== id) }, current: id => { current = id } }
}

test('trip waits for closing and movement, then destination readiness before reveal', () => {
  const b = bench()
  assert.equal(b.controller.select('b'), true)
  assert.equal(b.controller.state.direction, 'up')
  assert.equal(b.controller.select('lobby'), false)
  b.tick(10000)
  assert.deepEqual(b.navigated, ['b'])
  assert.equal(b.controller.state.phase, 'loading')
  b.controller.ready('a'); assert.equal(b.controller.state.phase, 'loading')
  b.controller.ready('b'); assert.equal(b.controller.state.phase, 'arriving')
  b.tick(2000)
  assert.equal(b.controller.state, null)
  assert.equal(b.states.at(-1), 'complete')
  b.current('b'); b.controller.select('lobby')
  assert.equal(b.controller.state.direction, 'down')
  b.controller.dispose()
})

test('same, unknown and deleted floors cannot create a stale trip', () => {
  const b = bench()
  assert.equal(b.controller.select('a'), false)
  assert.equal(b.controller.select('missing'), false)
  b.controller.select('b'); b.remove('b'); b.controller.reconcile()
  b.tick(10000)
  assert.equal(b.controller.state.phase, 'error')
  assert.deepEqual(b.navigated, [])
})

test('loading failures recover to the source and unmount cancels navigation', () => {
  const b = bench()
  b.controller.select('b'); b.tick(4000)
  b.controller.failed('b', 'Could not load floor')
  assert.equal(b.controller.state.phase, 'recovering')
  assert.deepEqual(b.navigated, ['b', 'a'])
  b.controller.ready('a'); assert.equal(b.controller.state.phase, 'error')
  b.controller.reset(); b.controller.select('b'); b.controller.dispose(); b.tick(20000)
  assert.deepEqual(b.navigated, ['b', 'a'])
  assert.equal(b.tasks.size, 0)
})

test('a renderer replacement during arrival must become ready before doors open', () => {
  const b = bench()
  b.controller.select('b'); b.tick(4000); b.controller.ready('b'); b.tick(300)
  b.controller.loading('b'); b.tick(2000)
  assert.equal(b.controller.state.phase, 'loading')
  assert.notEqual(b.states.at(-1), 'complete')
  b.controller.ready('b'); b.tick(2000)
  assert.equal(b.states.at(-1), 'complete')
})

test('load timeout and a deleted source have a bounded recovery path', () => {
  const b = bench()
  b.controller.select('b'); b.tick(4000); b.remove('a'); b.tick(15000)
  assert.equal(b.controller.state.phase, 'recovering')
  assert.equal(b.navigated.at(-1), 'lobby')
  b.tick(15000)
  assert.equal(b.controller.state.phase, 'error')
  assert.equal(b.tasks.size, 0)
})

test('cabin centers and exits are walkable and reachable on every seeded floor', () => {
  for (const seed of ['alpha', 'beta', 'gamma']) for (const count of [0, 4, 8, 12]) {
    const world = createOfficeWorld(count, count === 0, seed)
    assert.ok(world.elevator)
    for (const point of [world.elevator.center, world.elevator.exit]) {
      assert.equal(canStand(point, world), true)
      assert.ok(findPath(world.spawn, point, world).length)
    }
    assert.ok(world.elevator.center.x > 950)
    assert.equal(canStand({ x: world.elevator.cabin.x + 60, y: 328 }, world), false)
    assert.equal(canStand({ x: world.elevator.cabin.x, y: 304 }, world), false, 'the entry frame blocks feet outside the doorway')
    assert.equal(canStand({ x: world.elevator.center.x, y: 292 }, world), false, 'the cabin cannot be entered through its side')
  }
})
