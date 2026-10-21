export function activityKey(kind, value, { repeat = false, editing = false } = {}) {
  if (repeat || editing) return null
  const key = value.toLowerCase(), simple = ['rest', 'coffee'].includes(kind)
  if (key === 'escape' || simple && key === 'e') return 'leave'
  if (kind === 'arcade' && ['a', 'arrowleft'].includes(key)) return 'lane-left'
  if (kind === 'arcade' && ['d', 'arrowright'].includes(key)) return 'lane-right'
  if (kind === 'arcade' && key === ' ') return null
  if (['w', 'a', 's', 'd'].includes(key) || simple && key.startsWith('arrow')) return 'move'
  if (kind === 'reading' && key === 'arrowleft') return 'previous'
  if (kind === 'reading' && key === 'arrowright') return 'next'
  if (key === 'arrowup') return 'focus-previous'
  if (key === 'arrowdown') return 'focus-next'
  if (['reading', 'meal'].includes(kind) && /^[123]$/.test(key)) return `choice-${key}`
  if (['e', 'enter', ' '].includes(key)) return 'activate'
  return null
}

export function interactionPlacement(anchor, bounds, size, obstacle) {
  const clamp = (value, max) => Math.max(12, Math.min(max - 12, value))
  let left = clamp(anchor.x - size.width / 2, bounds.width - size.width)
  let top = clamp(anchor.y - size.height - 20, bounds.height - size.height)
  if (obstacle && left < obstacle.x + obstacle.width + 12 && left + size.width > obstacle.x - 12 && top < obstacle.y + obstacle.height + 12 && top + size.height > obstacle.y - 12) {
    if (obstacle.x - size.width - 12 >= 12) left = obstacle.x - size.width - 12
    else top = clamp(obstacle.y + obstacle.height + 12, bounds.height - size.height)
  }
  return { left, top }
}
