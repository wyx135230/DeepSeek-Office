export const STAR_LANES = 6
export const STAR_ROUND_MS = 30000

export function createStarRound(seed = 1) {
  return { seed: seed >>> 0, nextId: 0, lane: 2, score: 0, missed: 0, elapsed: 0, spawnIn: 400, stars: [], phase: 'playing' }
}

export function moveStarCatcher(state, direction) {
  if (state.phase !== 'playing') return state
  return { ...state, lane: Math.max(0, Math.min(STAR_LANES - 1, state.lane + Math.sign(direction))) }
}

export function tickStarRound(state, delta) {
  if (state.phase !== 'playing' || !Number.isFinite(delta) || delta <= 0) return state
  const dt = Math.min(delta, STAR_ROUND_MS - state.elapsed)
  const next = { ...state, elapsed: state.elapsed + dt, stars: [], spawnIn: state.spawnIn - dt }
  const speed = 0.00036 + state.elapsed / STAR_ROUND_MS * 0.00012
  for (const star of state.stars) {
    const y = star.y + dt * speed
    if (star.y < 0.87 && y >= 0.87 && star.lane === state.lane) next.score += 10
    else if (y >= 1) next.missed++
    else next.stars.push({ ...star, y })
  }
  while (next.spawnIn <= 0) {
    next.seed = (Math.imul(next.seed, 1664525) + 1013904223) >>> 0
    next.stars.push({ id: next.nextId++, lane: Math.floor(next.seed / 4294967296 * STAR_LANES), y: 0 })
    next.spawnIn += 720 - next.elapsed / STAR_ROUND_MS * 180
  }
  if (next.elapsed >= STAR_ROUND_MS) next.phase = 'complete'
  return next
}
