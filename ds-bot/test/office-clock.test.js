import assert from 'node:assert/strict'
import { test } from 'node:test'
import { bindOfficeVisibility } from '../src/client/office/clock.js'

test('timer-driven games sleep while hidden and resume only once without a time jump', () => {
  const visibility = new EventTarget()
  visibility.hidden = true
  let running = true, resets = 0
  const game = { loop: { sleep() { running = false }, wake() { running = true }, resetDelta() { resets++ } } }
  const dispose = bindOfficeVisibility(game, visibility)
  assert.equal(running, false)
  visibility.hidden = false; visibility.dispatchEvent(new Event('visibilitychange'))
  assert.equal(running, true)
  assert.equal(resets, 1)
  visibility.dispatchEvent(new Event('visibilitychange'))
  assert.equal(resets, 1)
  visibility.hidden = true; visibility.dispatchEvent(new Event('visibilitychange'))
  assert.equal(running, false)
  dispose()
  assert.equal(running, true, 'a deferred engine destroy still receives its final frame')
  visibility.dispatchEvent(new Event('visibilitychange'))
  assert.equal(running, true, 'the disposed binding no longer reacts')
})
