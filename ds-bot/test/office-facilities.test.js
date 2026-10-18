import assert from 'node:assert/strict'
import { test } from 'node:test'
import { addMealIngredient, facilityBeat, inFacilityWindow, MEAL_INGREDIENTS } from '../src/shared/office/facilities.js'

test('meal ingredients must be placed in recipe order without mutating the bowl', () => {
  const empty = []
  assert.equal(addMealIngredient(empty, 'Tofu'), empty)
  let bowl = empty
  for (const ingredient of MEAL_INGREDIENTS) bowl = addMealIngredient(bowl, ingredient)
  assert.deepEqual(bowl, MEAL_INGREDIENTS)
  assert.deepEqual(empty, [])
  assert.equal(addMealIngredient(bowl, 'Rice'), bowl)
})

test('timing windows reject early and late input and accept deliberate on-beat input', () => {
  assert.equal(inFacilityWindow(facilityBeat(100)), false)
  assert.equal(inFacilityWindow(facilityBeat(800)), true)
  assert.equal(inFacilityWindow(facilityBeat(1500)), false)
  assert.equal(inFacilityWindow(NaN), false)
  assert.equal(facilityBeat(-10), 0)
  assert.equal(facilityBeat(5000), 1)
})
