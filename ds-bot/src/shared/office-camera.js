// Keep the complete room in view until doing so would make a character smaller
// than 24 screen pixels. Large rooms retain the existing following camera.
export function officeCameraLayout(width, height, world, insets = {}) {
  const x = Math.min(24, width / 10)
  const y = Math.max(0, insets.top ?? 112) + 8
  const viewport = { x, y, width: Math.max(1, width - x * 2), height: Math.max(1, height - y - Math.max(0, insets.bottom ?? 72) - 8) }
  const fit = Math.min(viewport.width / world.width, viewport.height / world.height)
  const overview = fit >= 1.5
  const zoom = overview ? Math.min(3, Math.floor((fit + 1e-9) * 4) / 4) : Math.max(1.5, Math.min(3, Math.floor(viewport.width / world.width)))
  return { mode: overview ? 'overview' : 'follow', zoom, viewport }
}
