export const MEAL_INGREDIENTS = ['Rice', 'Greens', 'Tofu']
export const DRINK_STEPS = [
  { label: 'Pour the citrus', action: 'Pour citrus' },
  { label: 'Stir in mint', action: 'Stir mint' },
  { label: 'Top with sparkling water', action: 'Add bubbles' }
]
export const EXERCISE_REPS = 6
export const FACILITY_WINDOW = [0.38, 0.72]

export function facilityBeat(elapsed, duration = 1600) {
  return Math.max(0, Math.min(1, elapsed / duration))
}

export function inFacilityWindow(beat) {
  return Number.isFinite(beat) && beat >= FACILITY_WINDOW[0] && beat <= FACILITY_WINDOW[1]
}

export function addMealIngredient(ingredients, ingredient) {
  if (ingredients.length >= MEAL_INGREDIENTS.length || ingredient !== MEAL_INGREDIENTS[ingredients.length]) return ingredients
  return [...ingredients, ingredient]
}
