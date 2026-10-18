import assert from 'node:assert/strict'
import { test } from 'node:test'
import { officeCameraLayout } from '../src/shared/office/camera.js'
import { createOfficeWorld } from '../src/shared/office/world.js'

test('all floors and windows keep the same character scale and follow mode', () => {
  for (const [width, height] of [[320, 240], [1086, 768], [1640, 1080], [4000, 3000]]) for (const count of [0, 1, 4, 5, 8, 9, 12]) for (const lobby of [false, true]) {
    const layout = officeCameraLayout(width, height, createOfficeWorld(count, lobby, 'camera'))
    assert.equal(layout.mode, 'follow')
    assert.equal(layout.zoom, 2)
    assert.ok(layout.viewport.x >= 260)
    assert.ok(layout.viewport.width >= 1)
    assert.ok(layout.viewport.height >= 1)
  }
})

test('camera bounds leave room for the map, header and footer', () => {
  const layout = officeCameraLayout(1086, 768, createOfficeWorld(12), { top: 160, bottom: 100, left: 280 })
  assert.ok(layout.viewport.x >= 280)
  assert.ok(layout.viewport.y > 160)
  assert.ok(layout.viewport.x + layout.viewport.width < 1086)
  assert.ok(layout.viewport.y + layout.viewport.height < 668)
  const tiny = officeCameraLayout(80, 80, createOfficeWorld(0), { top: 160, bottom: 100 })
  assert.equal(tiny.zoom, 2)
  assert.equal(tiny.viewport.width, 1)
  assert.equal(tiny.viewport.height, 1)
})

test('a measured activity panel reserves its right rail without changing scale', () => {
  const layout = officeCameraLayout(1366, 768, createOfficeWorld(8), { left: 260, right: 452, top: 120, bottom: 80 })
  assert.equal(layout.zoom, 2)
  assert.ok(layout.viewport.x + layout.viewport.width <= 1366 - 452)
  assert.ok(layout.viewport.width > 1)
})
