export const OFFICE_YAW = Math.PI / 4
export const OFFICE_ELEVATION = Math.PI / 5

export function insideOfficeViewport({ x, y }, viewport) {
  return x >= viewport.x && x <= viewport.x + viewport.width && y >= viewport.y && y <= viewport.y + viewport.height
}

export function projectOfficePoint({ x, y, height = 0 }, yaw = OFFICE_YAW, elevation = OFFICE_ELEVATION) {
  return { x: x * Math.cos(yaw) - y * Math.sin(yaw), y: (x * Math.sin(yaw) + y * Math.cos(yaw)) * Math.sin(elevation) - height * Math.cos(elevation) }
}

export function unprojectOfficePoint({ x, y }, yaw = OFFICE_YAW, elevation = OFFICE_ELEVATION) {
  const depth = y / Math.sin(elevation)
  return { x: x * Math.cos(yaw) + depth * Math.sin(yaw), y: -x * Math.sin(yaw) + depth * Math.cos(yaw) }
}

export function screenMovement(x, y, yaw = OFFICE_YAW) {
  if (!x && !y) return { x: 0, y: 0 }
  const point = unprojectOfficePoint({ x, y }, yaw)
  const length = Math.hypot(point.x, point.y)
  return { x: point.x / length, y: point.y / length }
}
