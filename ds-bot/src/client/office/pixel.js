// Tiny pixel-art helpers shared by the office scenery and character art.
// Everything is authored at native game pixels; Phaser owns the display scale.

export const INK = '#3a2b2b'
export const INK_SOFT = '#5b4738'

export const COZY = Object.freeze({
  ink: '#3a2b2b',
  inkSoft: '#5b4738',
  cream: '#f6ecd4',
  creamShade: '#e3d3b1',
  paper: '#f9f1dc',
  paperShade: '#e5d6b5',
  woodDark: '#5d3d2a',
  wood: '#835233',
  woodLight: '#a86d41',
  woodHighlight: '#c98d58',
  walnutDark: '#4a3226',
  walnut: '#6a4530',
  walnutLight: '#8a5c3e',
  sageDark: '#49604d',
  sage: '#6d8a66',
  sageLight: '#9ab184',
  sagePale: '#c8d5b0',
  terracottaDark: '#8c4736',
  terracotta: '#bf6a4c',
  terracottaLight: '#dd9170',
  gold: '#d9a94e',
  goldLight: '#f2d78c',
  slate: '#39434b',
  slateLight: '#6b7f88',
  screen: '#93c9b2',
  screenDark: '#466e68',
  night: '#2a3a52',
  warm: '#ffe6a8',
  white: '#fff8e7',
  shadow: 'rgba(52, 38, 33, 0.26)',
})

export const SKIN_TONES = Object.freeze({
  peach: { base: '#f0c49a', shade: '#d9a67c', light: '#ffd9b0' },
  honey: { base: '#dca876', shade: '#c08a5c', light: '#f0c294' },
  bronze: { base: '#b27a52', shade: '#92603e', light: '#cc9165' },
  coffee: { base: '#83563d', shade: '#67412e', light: '#a06c4d' },
})

export function surface(width, height) {
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(width))
  canvas.height = Math.max(1, Math.round(height))
  const context = canvas.getContext('2d')
  context.imageSmoothingEnabled = false
  return { canvas, context }
}

export function rect(context, x, y, width, height, color) {
  if (width <= 0 || height <= 0) return
  context.fillStyle = color
  context.fillRect(Math.round(x), Math.round(y), Math.round(width), Math.round(height))
}

export function pixel(context, x, y, color) {
  rect(context, x, y, 1, 1, color)
}

export function hline(context, x, y, width, color) {
  rect(context, x, y, width, 1, color)
}

export function vline(context, x, y, height, color) {
  rect(context, x, y, 1, height, color)
}

// Every other pixel, used for woven rugs, dithering and soft light.
export function dither(context, x, y, width, height, color, offset = 0) {
  context.fillStyle = color
  for (let row = 0; row < height; row++) for (let col = offset + row % 2; col < width; col += 2) context.fillRect(Math.round(x + col), Math.round(y + row), 1, 1)
}

export function checker(context, x, y, width, height, color, size = 1) {
  context.fillStyle = color
  for (let row = 0; row < height; row += size) for (let col = (row / size) % 2 ? size : 0; col < width; col += size * 2) context.fillRect(Math.round(x + col), Math.round(y + row), size, size)
}

export function outlineRect(context, x, y, width, height, color) {
  hline(context, x, y, width, color)
  hline(context, x, y + height - 1, width, color)
  vline(context, x, y, height, color)
  vline(context, x + width - 1, y, height, color)
}

export function shadow(context, cx, cy, rx, ry, color = COZY.shadow) {
  context.save()
  context.fillStyle = color
  for (let y = -ry; y <= ry; y++) {
    const width = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry))))
    if (width > 0) context.fillRect(Math.round(cx - width), Math.round(cy + y), width * 2 + 1, 1)
  }
  context.restore()
}

export function parseColor(value) {
  if (Array.isArray(value)) return value
  let hex = String(value ?? '').replace('#', '')
  if (hex.length === 3) hex = [...hex].map(letter => letter + letter).join('')
  if (!/^[0-9a-f]{6}$/i.test(hex)) return [128, 128, 128]
  return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)]
}

export function toColor([red, green, blue]) {
  const clamp = value => Math.max(0, Math.min(255, Math.round(value)))
  return `#${[red, green, blue].map(value => clamp(value).toString(16).padStart(2, '0')).join('')}`
}

export function mix(first, second, amount = 0.5) {
  const a = parseColor(first), b = parseColor(second)
  return toColor(a.map((value, index) => value + (b[index] - value) * amount))
}

export const lighten = (color, amount = 0.18) => mix(color, '#ffffff', amount)
export const darken = (color, amount = 0.18) => mix(color, '#241a18', amount)

export function lightOf(color) {
  const [red, green, blue] = parseColor(color)
  return (red * .2126 + green * .7152 + blue * .0722) / 255
}

export function seeded(seed) {
  let state = 2166136261
  for (const letter of String(seed)) state = Math.imul(state ^ letter.charCodeAt(0), 16777619)
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    return state / 4294967296
  }
}

export function canvasFromPixels(width, height, pixels) {
  const { canvas, context } = surface(width, height)
  const image = context.createImageData(width, height)
  image.data.set(pixels)
  context.putImageData(image, 0, 0)
  return canvas
}
