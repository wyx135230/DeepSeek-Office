// Recolor only opaque authored pixels, retaining their relative light and shade.
export function recolorPixels(pixels, hex) {
  const target = [1, 3, 5].map(offset => parseInt(hex.slice(offset, offset + 2), 16))
  const light = i => pixels[i] * .2126 + pixels[i + 1] * .7152 + pixels[i + 2] * .0722
  let sum = 0, weight = 0
  for (let i = 0; i < pixels.length; i += 4) if (pixels[i + 3]) { sum += light(i) * pixels[i + 3]; weight += pixels[i + 3] }
  const average = Math.max(1, sum / Math.max(1, weight))
  for (let i = 0; i < pixels.length; i += 4) if (pixels[i + 3]) {
    const shade = Math.max(.12, Math.min(1.75, light(i) / average))
    for (let channel = 0; channel < 3; channel++) pixels[i + channel] = Math.round(Math.min(255, target[channel] * shade))
  }
  return pixels
}

export function drawCharacterAccessories(ctx, head, appearance, row, frames) {
  if (!appearance?.accessories?.length) return
  const source = document.createElement('canvas'); source.width = head.width; source.height = head.height
  const scan = source.getContext('2d'); scan.drawImage(head, 0, 0)
  const data = scan.getImageData(0, 0, source.width, source.height).data
  const accessories = new Set(appearance.accessories)
  const rect = (x, y, w, h, color) => { ctx.fillStyle = color; ctx.fillRect(x, y, w, h) }
  for (let direction = 0; direction < 4; direction++) for (let frame = 0; frame < frames; frame++) {
    let left = 64, top = 64, right = -1, bottom = -1
    for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) if (data[((direction * 64 + y) * source.width + frame * 64 + x) * 4 + 3]) {
      left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x); bottom = Math.max(bottom, y)
    }
    if (right < 0) continue
    const cx = Math.round((left + right) / 2), eyes = top + Math.round((bottom - top) * .52)
    ctx.save(); ctx.translate(frame * 64, (row + direction) * 64)
    if (accessories.has('glasses') && direction !== 0) {
      const x = direction === 1 ? left : direction === 3 ? right - 3 : cx - 5
      rect(x, eyes, 4, 3, '#303f43'); rect(x + 1, eyes + 1, 2, 1, '#c8ddd4')
      if (direction === 2) { rect(cx - 1, eyes + 1, 2, 1, '#303f43'); rect(cx + 1, eyes, 4, 3, '#303f43'); rect(cx + 2, eyes + 1, 2, 1, '#c8ddd4') }
    }
    if (accessories.has('scarf')) {
      rect(cx - 5, bottom + 1, 11, 3, '#8d624c'); rect(cx - 5, bottom + 1, 10, 1, '#d7b076')
      rect(cx + (direction === 1 ? -5 : 3), bottom + 3, 3, 6, '#bb8f65')
    }
    if (accessories.has('name-badge') && direction !== 0) {
      const x = direction === 1 ? cx - 5 : cx + 3
      rect(x, bottom + 7, 4, 5, '#4d6054'); rect(x, bottom + 7, 4, 1, '#c5b17e'); rect(x + 1, bottom + 9, 2, 2, '#ece6c9')
    }
    if (accessories.has('hair-clip')) {
      const x = direction === 1 ? left + 1 : right - 3
      rect(x, top + 3, 4, 2, '#6b7764'); rect(x, top + 3, 3, 1, '#e6cb87')
    }
    ctx.restore()
  }
}
