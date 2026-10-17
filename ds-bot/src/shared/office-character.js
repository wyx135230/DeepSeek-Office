export const CHARACTER = { width: 16, height: 28, headHeight: 12, footY: 26 }

export function interactionPromptY(playerY, targetY, human = false, bubbleHeight = 0) {
  const aboveTarget = targetY - (human ? CHARACTER.height + 10 + (bubbleHeight ? bubbleHeight + 4 : 0) : 29)
  return Math.min(aboveTarget, playerY - CHARACTER.height - 10)
}

// Palette indices: outline, skin, coat, highlight, trousers, shoes, buttons.
// The licensed head is composited above this original full-length body.
export function characterBody(direction, step = 0) {
  const pixels = Array.from({ length: CHARACTER.height }, () => Array(CHARACTER.width).fill('.'))
  const rect = (x, y, w, h, color) => {
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) if (pixels[yy]?.[xx] !== undefined) pixels[yy][xx] = color
  }
  const side = direction === 'left' || direction === 'right'
  const stride = step === 1 ? -1 : step === 2 ? 1 : 0
  rect(6, 12, 4, 2, 'k')
  if (side) {
    rect(5, 13, 6, 8, 'o'); rect(6, 14, 4, 6, 'c'); rect(6, 14, 1, 4, 'h')
    rect(5 + stride, 20, 2, 6 - Math.abs(stride), 'p')
    rect(9 - stride, 20, 2, 6, 'p')
    rect(4 + stride, 26 - Math.abs(stride), 3, 2, 's'); rect(9 - stride, 26, 3, 2, 's')
    const arm = direction === 'left' ? 8 : 5
    rect(arm + stride, 14, 3, 6, 'o'); rect(arm + stride, 15, 2, 4, 'h'); rect(arm + stride, 20, 2, 2, 'k')
  } else {
    rect(4, 13, 8, 8, 'o'); rect(5, 14, 6, 6, 'c'); rect(5, 14, 1, 5, 'h')
    rect(2, 14 + stride, 2, 6, 'o'); rect(3, 15 + stride, 1, 4, 'c'); rect(2, 20 + stride, 2, 2, 'k')
    rect(12, 14 - stride, 2, 6, 'o'); rect(12, 15 - stride, 1, 4, 'h'); rect(12, 20 - stride, 2, 2, 'k')
    if (direction === 'down') { rect(6, 13, 4, 1, 'k'); rect(8, 15, 1, 1, 'b'); rect(8, 18, 1, 1, 'b') }
    else rect(6, 16, 4, 1, 'h')
    const leftLift = step === 2 ? 1 : 0, rightLift = step === 1 ? 1 : 0
    rect(5, 20, 2, 6 - leftLift, 'p'); rect(9, 20, 2, 6 - rightLift, 'p')
    rect(4, 26 - leftLift, 3, 2, 's'); rect(9, 26 - rightLift, 3, 2, 's')
  }
  return pixels
}
