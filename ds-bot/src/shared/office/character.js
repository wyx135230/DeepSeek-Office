// LPC Revised uses the same unscaled 64px registration for every authored layer.
export const CHARACTER = { width: 64, height: 64, footY: 58 }
export const DIRECTIONS = { up: 0, left: 1, down: 2, right: 3 }
export const POSES = { walk: { row: 0, frames: 8 }, idle: { row: 4, frames: 3 }, sitting: { row: 8, frames: 3 } }
export function characterFrame(direction = 'down', pose = 'idle', frame = 0) {
  const animation = POSES[pose] ?? POSES.idle
  return (animation.row + (DIRECTIONS[direction] ?? 2)) * 8 + Math.max(0, Math.min(animation.frames - 1, Math.floor(frame)))
}
