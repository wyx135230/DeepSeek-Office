import assert from 'node:assert/strict'
import { test } from 'node:test'
import { projectOfficePoint, unprojectOfficePoint, screenMovement, insideOfficeViewport } from '../src/shared/office/isometric.js'

test('ground picking is the inverse of projection at every camera rotation', () => {
  for (const yaw of [Math.PI / 4, Math.PI * 3 / 4, Math.PI * 5 / 4, Math.PI * 7 / 4]) {
    for (const point of [{ x: 32, y: 32 }, { x: 528, y: 328 }, { x: 1010, y: 600 }]) {
      const projected = projectOfficePoint(point, yaw)
      const picked = unprojectOfficePoint(projected, yaw)
      assert.ok(Math.abs(picked.x - point.x) < 1e-8)
      assert.ok(Math.abs(picked.y - point.y) < 1e-8)
    }
  }
})

test('WASD stays screen relative and normalized after camera rotation', () => {
  for (const yaw of [Math.PI / 4, Math.PI * 3 / 4, Math.PI * 5 / 4, Math.PI * 7 / 4]) {
    for (const [x, y] of [[0, -1], [1, 0], [0, 1], [-1, 0], [1, -1]]) {
      const movement = screenMovement(x, y, yaw)
      assert.ok(Math.abs(Math.hypot(movement.x, movement.y) - 1) < 1e-9)
      const screen = projectOfficePoint(movement, yaw)
      assert.ok(Math.abs(screen.x * y - screen.y * x) < 1e-9)
      assert.ok(screen.x * x + screen.y * y > 0)
    }
  }
  assert.deepEqual(screenMovement(0, 0), { x: 0, y: 0 })
})

test('height raises a projected object without changing its ground registration', () => {
  const foot = projectOfficePoint({ x: 400, y: 300 })
  const head = projectOfficePoint({ x: 400, y: 300, height: 48 })
  assert.equal(head.x, foot.x)
  assert.ok(head.y < foot.y)
})

test('blank HUD margins cannot pick offscreen world objects', () => {
  const viewport = { x: 248, y: 96, width: 800, height: 600 }
  assert.equal(insideOfficeViewport({ x: 500, y: 300 }, viewport), true)
  for (const point of [{ x: 247, y: 200 }, { x: 600, y: 95 }, { x: 1049, y: 300 }, { x: 600, y: 697 }, { x: NaN, y: 300 }]) assert.equal(insideOfficeViewport(point, viewport), false)
})
