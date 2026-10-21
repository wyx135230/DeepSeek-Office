const clamp = (value, max) => Math.max(0, Math.min(max, value))

export function mapPoint(world, box, point, dragging = false) {
  if (!(world?.width > 0 && world?.height > 0 && box.width > 0 && box.height > 0)) return null
  const scale = Math.min(box.width / world.width, box.height / world.height)
  const x = (point.x - box.left - (box.width - world.width * scale) / 2) / scale
  const y = (point.y - box.top - (box.height - world.height * scale) / 2) / scale
  if (!dragging && (x < 0 || y < 0 || x > world.width || y > world.height)) return null
  return { x: clamp(x, world.width), y: clamp(y, world.height) }
}

export function mapViewport(world, view) {
  const x = clamp(view.left, world.width), y = clamp(view.top, world.height)
  return { x, y, width: Math.max(0, clamp(view.right, world.width) - x), height: Math.max(0, clamp(view.bottom, world.height) - y) }
}

export const mapDirection = direction => ({ up: 0, 'up-right': 45, right: 90, 'down-right': 135, down: 180, 'down-left': 225, left: 270, 'up-left': 315 })[direction] ?? 0
