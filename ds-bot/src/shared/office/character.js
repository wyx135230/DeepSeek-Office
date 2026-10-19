// One native registration for every chibi direction, pose and frame.
export const CHARACTER = { width: 16, height: 32, footY: 29, columns: 4 }
export const DIRECTIONS = { up: 0, left: 1, down: 2, right: 3 }
export const POSES = { walk: { row: 0, frames: 4 }, idle: { row: 4, frames: 4 }, sitting: { row: 8, frames: 4 } }
export function characterFrame(direction = 'down', pose = 'idle', frame = 0) {
  const animation = POSES[pose] ?? POSES.idle
  return (animation.row + (DIRECTIONS[direction] ?? 2)) * CHARACTER.columns + Math.max(0, Math.min(animation.frames - 1, Math.floor(frame)))
}
