import assert from 'node:assert/strict'
import { test } from 'node:test'
import { officeCameraLayout } from '../src/shared/office-camera.js'
import { createOfficeWorld } from '../src/shared/office-world.js'

test('ordinary offices fit between desktop HUD bars without following the player', () => {
  for (const [width, height] of [[1086, 768], [1160, 960], [1640, 1080]]) {
    for (const count of [0, 1, 3, 6]) {
      const world = createOfficeWorld(count)
      const layout = officeCameraLayout(width, height, world, { top: 120, bottom: 80 })
      assert.equal(layout.mode, 'overview', `${width}x${height}, ${count} members`)
      assert.ok(world.width * layout.zoom <= layout.viewport.width)
      assert.ok(world.height * layout.zoom <= layout.viewport.height)
      assert.ok(layout.viewport.y >= 120)
      assert.ok(layout.viewport.y + layout.viewport.height <= height - 80)
      assert.ok(layout.zoom >= 1.5, 'characters stay legible')
    }
  }
})

test('large offices follow on a laptop and return to overview when more space is available', () => {
  const world = createOfficeWorld(12)
  const compact = officeCameraLayout(1086, 768, world, { top: 120, bottom: 80 })
  assert.equal(compact.mode, 'follow')
  assert.ok(compact.zoom >= 1.5)
  const expanded = officeCameraLayout(1640, 1080, world, { top: 120, bottom: 80 })
  assert.equal(expanded.mode, 'overview')
  assert.ok(world.height * expanded.zoom <= expanded.viewport.height)
})

test('overview respects tall HUD content and leaves a margin around the whole room', () => {
  const world = createOfficeWorld(3)
  const layout = officeCameraLayout(1000, 800, world, { top: 180, bottom: 110 })
  assert.equal(layout.mode, 'overview')
  assert.ok(layout.viewport.y > 180)
  assert.ok(layout.viewport.y + layout.viewport.height < 690)
  assert.ok(layout.viewport.width > world.width * layout.zoom)
})
