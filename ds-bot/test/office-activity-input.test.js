import assert from 'node:assert/strict'
import { test } from 'node:test'
import { activityKey, interactionPlacement } from '../src/client/office/activity-input.js'

test('rest and coffee use one key to leave and movement returns control immediately', () => {
  for (const kind of ['rest', 'coffee']) {
    assert.equal(activityKey(kind, 'e'), 'leave')
    assert.equal(activityKey(kind, 'Escape'), 'leave')
    assert.equal(activityKey(kind, 'w'), 'move')
    assert.equal(activityKey(kind, 'ArrowRight'), 'move')
  }
})

test('activity shortcuts preserve game controls and do not consume text input or repeats', () => {
  assert.equal(activityKey('arcade', 'a'), 'lane-left')
  assert.equal(activityKey('arcade', 'ArrowRight'), 'lane-right')
  assert.equal(activityKey('arcade', 'w'), 'move')
  assert.equal(activityKey('reading', 'ArrowLeft'), 'previous')
  assert.equal(activityKey('reading', 'ArrowDown'), 'focus-next')
  assert.equal(activityKey('reading', 'e'), 'activate')
  assert.equal(activityKey('meal', '2'), 'choice-2')
  assert.equal(activityKey('exercise', ' '), 'activate')
  assert.equal(activityKey('coffee', 'e', { repeat: true }), null)
  assert.equal(activityKey('rest', 'w', { editing: true }), null)
})

test('nearby prompts remain inside the scene and clear the map at the right edge', () => {
  assert.deepEqual(interactionPlacement({ x: 5, y: 10 }, { width: 800, height: 600 }, { width: 200, height: 40 }), { left: 12, top: 12 })
  const placed = interactionPlacement({ x: 790, y: 500 }, { width: 800, height: 600 }, { width: 200, height: 40 })
  assert.ok(placed.left >= 12 && placed.left + 200 <= 788)
  assert.ok(placed.top >= 12 && placed.top + 40 <= 588)
  const clear = interactionPlacement({ x: 700, y: 100 }, { width: 800, height: 600 }, { width: 200, height: 40 }, { x: 520, y: 20, width: 260, height: 331 })
  assert.ok(clear.left + 200 <= 508 || clear.top >= 363)
})
