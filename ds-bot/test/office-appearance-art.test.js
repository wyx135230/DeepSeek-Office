import assert from 'node:assert/strict'
import { test } from 'node:test'
import { recolorPixels } from '../src/client/office/appearance-art.js'

test('new outfit colors preserve transparent pixels, alpha edges and authored light/shadow contrast', () => {
  const pixels = new Uint8ClampedArray([90, 20, 70, 0, 20, 20, 20, 128, 80, 80, 80, 255, 160, 160, 160, 255])
  recolorPixels(pixels, '#68947a')
  assert.deepEqual(pixels.slice(0, 4), new Uint8ClampedArray([90, 20, 70, 0]))
  assert.deepEqual([pixels[7], pixels[11], pixels[15]], [128, 255, 255])
  assert.ok(pixels[4] < pixels[8] && pixels[8] < pixels[12], 'dark outline, midtone and highlight remain distinct')
  for (const offset of [4, 8, 12]) assert.ok(pixels[offset + 1] > pixels[offset] && pixels[offset + 1] > pixels[offset + 2], 'the new green hue applies throughout the original shading')
  assert.ok(pixels.every(value => Number.isFinite(value) && value >= 0 && value <= 255))
})
