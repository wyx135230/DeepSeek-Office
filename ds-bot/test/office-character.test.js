import assert from 'node:assert/strict'
import { test } from 'node:test'
import { characterBody, CHARACTER, interactionPromptY } from '../src/shared/office-character.js'

test('every direction and walking pose has a continuous torso and visible legs and shoes', () => {
  for (const direction of ['down', 'up', 'left', 'right']) for (const step of [0, 1, 2]) {
    const pixels = characterBody(direction, step)
    assert.equal(pixels.length, CHARACTER.height)
    assert.ok(pixels.every(row => row.length === CHARACTER.width))
    for (let y = 12; y < 27; y++) assert.ok(pixels[y].some(p => p !== '.'), `${direction}/${step}: no missing body row ${y}`)
    assert.ok(pixels.slice(20).flat().includes('p'), 'trouser legs remain visible')
    assert.ok(pixels.slice(25).flat().includes('s'), 'shoes remain visible')
    assert.ok(pixels.slice(0, 12).flat().every(p => p === '.'), 'licensed head has its own space')
  }
})

test('idle feet are separated and alternating walk poses move the feet in all directions', () => {
  for (const direction of ['down', 'up', 'left', 'right']) {
    const idle = characterBody(direction, 0)
    assert.ok(idle[26].filter(p => p === 's').length >= 4)
    assert.notDeepEqual(characterBody(direction, 1).slice(20), characterBody(direction, 2).slice(20))
  }
  const front = characterBody('down', 0)[26]
  assert.equal(front[7], '.')
  assert.equal(front[8], '.')
  assert.equal(front[5], 's')
  assert.equal(front[10], 's')
})

test('interaction prompts clear the full body and a working teammate bubble from either side', () => {
  const targetY = 148, bubbleHeight = 13
  const bubbleTop = targetY - CHARACTER.height - 6 - bubbleHeight
  for (const playerY of [125, 148, 171]) {
    const promptY = interactionPromptY(playerY, targetY, true, bubbleHeight)
    assert.ok(promptY <= bubbleTop - 4, 'state text stays visible')
    assert.ok(promptY <= playerY - CHARACTER.footY - 4, 'player head stays visible')
  }
  assert.ok(interactionPromptY(264, 280) < 264 - CHARACTER.footY - 4, 'lift prompt clears the full player')
})
