import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mapPoint, mapViewport, mapDirection } from '../src/shared/office/map.js'

test('letterboxed floor maps preserve world coordinates at every display size', () => {
  const world = { width: 800, height: 400 }
  for (const box of [{ left: 100, top: 20, width: 240, height: 160 }, { left: 0, top: 0, width: 120, height: 60 }]) {
    assert.deepEqual(mapPoint(world, box, { x: box.left + box.width / 2, y: box.top + box.height / 2 }), { x: 400, y: 200 })
  }
  const box = { left: 10, top: 10, width: 200, height: 200 }
  assert.equal(mapPoint(world, box, { x: 110, y: 20 }), null)
  assert.deepEqual(mapPoint(world, box, { x: 110, y: 60 }), { x: 400, y: 0 })
  assert.deepEqual(mapPoint(world, box, { x: -10, y: 240 }, true), { x: 0, y: 400 })
  assert.equal(mapPoint(world, { ...box, width: 0 }, { x: 0, y: 0 }), null)
})

test('camera viewport outlines stay inside the floor plan even when the camera sees beyond it', () => {
  const world = { width: 800, height: 400 }
  assert.deepEqual(mapViewport(world, { left: -100, top: -50, right: 1000, bottom: 500 }), { x: 0, y: 0, width: 800, height: 400 })
  assert.deepEqual(mapViewport(world, { left: 900, top: 410, right: 1000, bottom: 500 }), { x: 800, y: 400, width: 0, height: 0 })
  assert.deepEqual(mapViewport(world, { left: 50, top: 60, right: 150, bottom: 160 }), { x: 50, y: 60, width: 100, height: 100 })
})

test('the player arrow follows the same world direction as the character', () => {
  assert.equal(mapDirection('up'), 0)
  assert.equal(mapDirection('right'), 90)
  assert.equal(mapDirection('down'), 180)
  assert.equal(mapDirection('left'), 270)
  assert.equal(mapDirection('down-right'), 135)
  assert.equal(mapDirection(undefined), 0)
})
