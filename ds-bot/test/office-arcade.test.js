import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createStarRound, moveStarCatcher, tickStarRound, STAR_ROUND_MS } from '../src/shared/office/arcade.js'

test('star catcher stays in six lanes and never mutates its input', () => {
  const original = createStarRound(42)
  let state = original
  for (let i = 0; i < 12; i++) state = moveStarCatcher(state, -1)
  assert.equal(state.lane, 0)
  for (let i = 0; i < 12; i++) state = moveStarCatcher(state, 1)
  assert.equal(state.lane, 5)
  assert.equal(original.lane, 2)
})

test('a star crossing the catcher scores once and a missed star leaves the screen', () => {
  const state = { ...createStarRound(), stars: [{ id: 1, lane: 2, y: 0.86 }, { id: 2, lane: 0, y: 0.99 }] }
  const next = tickStarRound(state, 50)
  assert.equal(next.score, 10)
  assert.equal(next.missed, 1)
  assert.equal(next.stars.length, 0)
  assert.equal(tickStarRound(next, 50).score, 10)
  assert.equal(state.stars.length, 2)
})

test('seeded rounds are deterministic, finish after thirty seconds and stop scoring', () => {
  let first = createStarRound(7), second = createStarRound(7)
  for (let elapsed = 0; elapsed < STAR_ROUND_MS; elapsed += 50) {
    first = tickStarRound(first, 50)
    second = tickStarRound(second, 50)
  }
  assert.deepEqual(first, second)
  assert.equal(first.phase, 'complete')
  assert.equal(first.elapsed, STAR_ROUND_MS)
  assert.equal(tickStarRound(first, 500), first)
  assert.equal(moveStarCatcher(first, 1), first)
})

test('invalid frame durations cannot corrupt a round', () => {
  const state = createStarRound()
  for (const delta of [NaN, Infinity, -1, 0]) assert.equal(tickStarRound(state, delta), state)
})
