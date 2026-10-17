import assert from 'node:assert/strict'
import { test } from 'node:test'
import { officeLayout } from '../src/shared/office.js'
import { walkable, pathTo, stepAlong } from '../src/shared/office-motion.js'

test('a visitor cannot walk through desks, furniture or the office walls', () => {
  const layout = officeLayout(3)
  assert.equal(walkable({ x: 10, y: 200 }, layout), false)
  assert.equal(walkable({ x: 220, y: 150 }, layout), false)
  assert.equal(walkable({ x: 200, y: 400 }, layout), true)
})

test('click walking finds a route around desks and ignores blocked destinations', () => {
  const layout = officeLayout(3)
  const path = pathTo({ x: 200, y: 400 }, { x: 370, y: 240 }, layout)
  assert.ok(path.length > 0)
  assert.ok(path.every(point => walkable(point, layout)))
  assert.deepEqual(pathTo({ x: 200, y: 400 }, { x: 220, y: 150 }, layout), [])
})

test('visitor speed does not depend on frame rate and never overshoots', () => {
  const a = stepAlong({ x: 0, y: 0 }, [{ x: 100, y: 0 }], 100, 1)
  assert.deepEqual(a.position, { x: 100, y: 0 })
  assert.equal(a.path.length, 0)
  const b = stepAlong({ x: 0, y: 0 }, [{ x: 100, y: 0 }], 100, .25)
  assert.deepEqual(b.position, { x: 25, y: 0 })
})
