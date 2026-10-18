import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { CHARACTER, POSES } from '../src/shared/office/character.js'
test('authored full body, head and clothing animations share one registration in every direction', () => {
  assert.equal(CHARACTER.width, 64)
  assert.equal(CHARACTER.height, 64)
  for (const body of ['m', 'f']) for (const [pose, metadata] of Object.entries(POSES)) {
    for (const layer of ['body', 'pants', 'shoes', 'shirt', 'head', 'hair']) {
      const png = readFileSync(new URL(`../src/client/assets/lpc/${body}-${layer}-${pose}.png`, import.meta.url))
      assert.equal(png.readUInt32BE(16), metadata.frames * CHARACTER.width)
      assert.equal(png.readUInt32BE(20), 4 * CHARACTER.height)
    }
  }
})
