// Room count and window size change the visible area, never character scale.
// A 16px tile shown at 4x matches the classic cozy pixel-game framing.
export const OFFICE_ZOOM = 3

export function officeCameraLayout(width, height, _world, insets = {}) {
  const x = Math.max(260, insets.left ?? 240) + 8
  const y = Math.max(0, insets.top ?? 112) + 8
  const viewport = { x, y, width: Math.max(1, width - x - Math.max(0, insets.right ?? 24)), height: Math.max(1, height - y - Math.max(0, insets.bottom ?? 72) - 8) }
  return { mode: 'follow', zoom: OFFICE_ZOOM, viewport }
}
