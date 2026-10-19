// Original 16 x 32 chibi coworker sprites, drawn procedurally and cached per appearance.
// The art is authored at native game pixels; the camera shows it at 4x.
import { SKIN_TONES, parseColor, toColor, lighten, darken, canvasFromPixels } from './pixel.js'
import { CHARACTER, DIRECTIONS, POSES } from '../../shared/office/character.js'

export const CHIBI = CHARACTER
export const CHIBI_DIRECTIONS = DIRECTIONS
export const CHIBI_POSES = POSES

export const CHIBI_ROLES = Object.freeze({
  NONE: 0, OUTLINE: 1,
  SKIN: 2, SKIN_LIGHT: 3, SKIN_SHADE: 4,
  HAIR: 5, HAIR_LIGHT: 6, HAIR_SHADE: 7,
  SHIRT: 8, SHIRT_LIGHT: 9, SHIRT_SHADE: 10,
  PANTS: 11, PANTS_LIGHT: 12, PANTS_SHADE: 13,
  SHOE: 14, SHOE_LIGHT: 15, SHOE_SHADE: 16,
  EYE: 17, EYE_LIGHT: 18, BLUSH: 19, MOUTH: 20,
  ACCENT: 21, ACCENT_LIGHT: 22, ACCENT_SHADE: 23,
  WHITE: 24, BROW: 25,
})

const HAIR_COLORS = {
  black: '#372e2f', chestnut: '#8a5a3b', brown: '#6d4a36', 'ash brown': '#7e6a58', ash: '#7e6a58',
  blonde: '#d3a75e', charcoal: '#4b4950',
}
const CLOTH_COLORS = { fern: '#6f8f6a', coral: '#c97a63', denim: '#5e7c97', mustard: '#c9a04b' }
const ACCENT_COLORS = { glasses: '#5a4f74', scarf: '#b8654d', 'name-badge': '#5f7f97', 'hair-clip': '#b58a3f' }

const hexOr = (value, table, fallback) => {
  if (/^#[0-9a-f]{6}$/i.test(String(value ?? ''))) return value
  return table[String(value ?? '').toLowerCase()] ?? fallback
}
const shirtHex = (appearance, preset) => hexOr(appearance.shirtColor, CLOTH_COLORS, CLOTH_COLORS[String(preset?.clothingColor ?? '').toLowerCase()] ?? '#779b86')
const hairHex = appearance => hexOr(appearance.hairColor, HAIR_COLORS, '#6d4a36')
const pantsHex = appearance => /^#[0-9a-f]{6}$/i.test(String(appearance.pantsColor ?? '')) ? appearance.pantsColor : '#4d5b72'
const shoesHex = appearance => /^#[0-9a-f]{6}$/i.test(String(appearance.shoesColor ?? '')) ? appearance.shoesColor : '#5a4033'

function paletteFor(appearance, preset) {
  const skin = SKIN_TONES[appearance.skin] ?? SKIN_TONES.peach
  const hair = hairHex(appearance), shirt = shirtHex(appearance, preset), pants = pantsHex(appearance), shoes = shoesHex(appearance)
  const accent = ACCENT_COLORS[appearance.accessories?.[0]] ?? '#77855f'
  return new Map([
    [CHIBI_ROLES.OUTLINE, parseColor('#3b2b2c')],
    [CHIBI_ROLES.SKIN, parseColor(skin.base)], [CHIBI_ROLES.SKIN_LIGHT, parseColor(skin.light)], [CHIBI_ROLES.SKIN_SHADE, parseColor(skin.shade)],
    [CHIBI_ROLES.HAIR, parseColor(hair)], [CHIBI_ROLES.HAIR_LIGHT, parseColor(lighten(hair, .22))], [CHIBI_ROLES.HAIR_SHADE, parseColor(darken(hair, .24))],
    [CHIBI_ROLES.SHIRT, parseColor(shirt)], [CHIBI_ROLES.SHIRT_LIGHT, parseColor(lighten(shirt, .18))], [CHIBI_ROLES.SHIRT_SHADE, parseColor(darken(shirt, .22))],
    [CHIBI_ROLES.PANTS, parseColor(pants)], [CHIBI_ROLES.PANTS_LIGHT, parseColor(lighten(pants, .16))], [CHIBI_ROLES.PANTS_SHADE, parseColor(darken(pants, .24))],
    [CHIBI_ROLES.SHOE, parseColor(shoes)], [CHIBI_ROLES.SHOE_LIGHT, parseColor(lighten(shoes, .16))], [CHIBI_ROLES.SHOE_SHADE, parseColor(darken(shoes, .28))],
    [CHIBI_ROLES.EYE, parseColor('#3d3038')], [CHIBI_ROLES.EYE_LIGHT, parseColor('#fff8e7')], [CHIBI_ROLES.BLUSH, parseColor('#e39a8b')],
    [CHIBI_ROLES.MOUTH, parseColor('#9c5a4c')], [CHIBI_ROLES.BROW, parseColor(darken(hair, .4))],
    [CHIBI_ROLES.ACCENT, parseColor(accent)], [CHIBI_ROLES.ACCENT_LIGHT, parseColor(lighten(accent, .3))], [CHIBI_ROLES.ACCENT_SHADE, parseColor(darken(accent, .24))],
    [CHIBI_ROLES.WHITE, parseColor('#fff8e7')],
  ])
}

class Raster {
  constructor() { this.pixels = new Uint8Array(CHIBI.width * CHIBI.height) }
  get(x, y) { return x >= 0 && x < CHIBI.width && y >= 0 && y < CHIBI.height ? this.pixels[y * CHIBI.width + x] : CHIBI_ROLES.NONE }
  set(x, y, role) { if (x >= 0 && x < CHIBI.width && y >= 0 && y < CHIBI.height) this.pixels[y * CHIBI.width + x] = role }
  rect(x, y, width, height, role) { for (let row = 0; row < height; row++) for (let col = 0; col < width; col++) this.set(x + col, y + row, role) }
  row(y, x, width, role) { for (let col = 0; col < width; col++) this.set(x + col, y, role) }  mirror() {
    for (let y = 0; y < CHIBI.height; y++) for (let x = 0; x < CHIBI.width / 2; x++) {
      const left = this.get(x, y), right = this.get(CHIBI.width - 1 - x, y)
      this.set(x, y, right); this.set(CHIBI.width - 1 - x, y, left)
    }
    return this
  }
  shaded() {
    const R = CHIBI_ROLES
    const light = { [R.SKIN]: R.SKIN_LIGHT, [R.HAIR]: R.HAIR_LIGHT, [R.SHIRT]: R.SHIRT_LIGHT, [R.PANTS]: R.PANTS_LIGHT, [R.SHOE]: R.SHOE_LIGHT, [R.ACCENT]: R.ACCENT_LIGHT }
    const shade = { [R.SKIN]: R.SKIN_SHADE, [R.HAIR]: R.HAIR_SHADE, [R.SHIRT]: R.SHIRT_SHADE, [R.PANTS]: R.PANTS_SHADE, [R.SHOE]: R.SHOE_SHADE, [R.ACCENT]: R.ACCENT_SHADE }
    const at = (x, y) => x >= 0 && x < CHIBI.width && y >= 0 && y < CHIBI.height ? this.pixels[y * CHIBI.width + x] : R.NONE
    this.pixels.forEach((role, index) => {
      if (!light[role]) return
      const x = index % CHIBI.width, y = Math.floor(index / CHIBI.width)
      const above = at(x, y - 1), below = at(x, y + 1)
      if ((above === R.NONE || above === R.OUTLINE) && below === role) this.pixels[index] = light[role]
      else if ((below === R.NONE || below === R.OUTLINE) && above === role) this.pixels[index] = shade[role]
    })
    const solid = this.pixels.slice()
    for (let y = 0; y < CHIBI.height; y++) for (let x = 0; x < CHIBI.width; x++) {
      if (solid[y * CHIBI.width + x]) continue
      const near = (X, Y) => X >= 0 && X < CHIBI.width && Y >= 0 && Y < CHIBI.height && solid[Y * CHIBI.width + X]
      if (near(x - 1, y) || near(x + 1, y) || near(x, y - 1) || near(x, y + 1)) this.pixels[y * CHIBI.width + x] = R.OUTLINE
    }
    return this
  }
  toRGBA(palette) {
    const data = new Uint8ClampedArray(CHIBI.width * CHIBI.height * 4)
    this.pixels.forEach((role, index) => {
      const color = palette.get(role)
      if (!color) return
      data[index * 4] = color[0]; data[index * 4 + 1] = color[1]; data[index * 4 + 2] = color[2]; data[index * 4 + 3] = 255
    })
    return data
  }
}

// Head rows: the crown starts at 2, the chin ends at 11, the body starts at 13.
const hlineOf = (raster, x, y, width, role) => raster.row(y, x, width, role)
const HEAD_TOP = 2
const HEAD_ROWS = [[5, 6], [4, 8], [3, 10], [3, 10], [3, 10], [3, 10], [3, 10], [3, 10], [4, 8], [5, 6]]
const BODY = 13

function head(raster, role = CHIBI_ROLES.SKIN) {
  HEAD_ROWS.forEach(([x, width], index) => raster.row(HEAD_TOP + index, x, width, role))
}
const faceDown = (raster, blink = false) => {
  const R = CHIBI_ROLES
  raster.set(5, 6, R.BROW); raster.set(10, 6, R.BROW)
  if (blink) {
    raster.set(5, 7, R.EYE); raster.set(6, 7, R.EYE); raster.set(9, 7, R.EYE); raster.set(10, 7, R.EYE)
  } else {
    raster.set(5, 7, R.EYE_LIGHT); raster.set(9, 7, R.EYE_LIGHT)
    raster.set(6, 7, R.EYE); raster.set(10, 7, R.EYE)
    raster.set(5, 8, R.EYE); raster.set(10, 8, R.EYE)
  }
  raster.set(7, 10, R.MOUTH); raster.set(8, 10, R.MOUTH)
  if (!blink) { raster.set(4, 9, R.BLUSH); raster.set(11, 9, R.BLUSH) }
}
const faceSide = (raster, blink = false) => {
  const R = CHIBI_ROLES
  raster.set(9, 6, R.BROW)
  if (blink) { raster.set(10, 7, R.EYE); raster.set(11, 7, R.EYE) }
  else { raster.set(10, 7, R.EYE_LIGHT); raster.set(11, 7, R.EYE); raster.set(11, 8, R.EYE) }
  raster.set(13, 8, R.SKIN_SHADE)
  raster.set(11, 10, R.MOUTH)
  if (!blink) raster.set(9, 9, R.BLUSH)
}
const ears = raster => { raster.set(2, 8, CHIBI_ROLES.SKIN); raster.set(13, 8, CHIBI_ROLES.SKIN) }

function hairStyle(raster, style, direction) {
  const R = CHIBI_ROLES, top = HEAD_TOP
  // Crown over the skull, shared by every style.
  if (direction === 'up') {
    head(raster, R.HAIR)
  } else {
    raster.row(top - 1, 5, 6, R.HAIR)
    raster.row(top, 4, 8, R.HAIR)
    raster.row(top + 1, 3, 10, R.HAIR)
    raster.row(top + 2, 3, 10, R.HAIR)
  }
  if (style === 'parted') {
    if (direction !== 'up') {
      raster.row(top + 2, 3, 4, R.HAIR); raster.row(top + 2, 9, 4, R.HAIR)
      raster.row(top + 3, 3, 2, R.HAIR); raster.row(top + 3, 11, 2, R.HAIR)
      raster.set(8, top + 2, R.HAIR_SHADE); raster.set(7, top + 1, R.HAIR_SHADE)
      raster.set(9, top, R.HAIR_LIGHT)
    } else raster.set(7, top + 1, R.HAIR_LIGHT)
  } else if (style === 'side-bob') {
    if (direction !== 'up') {
      raster.rect(2, top + 2, 3, 12, R.HAIR); raster.rect(11, top + 2, 3, 12, R.HAIR)
      raster.row(top + 2, 4, 8, R.HAIR); raster.set(2, top + 13, R.HAIR_SHADE); raster.set(13, top + 13, R.HAIR_SHADE)
    } else raster.rect(2, top + 2, 12, 13, R.HAIR)
  } else if (style === 'short-curls') {
    raster.row(top - 2, 5, 6, R.HAIR)
    for (const [x, y] of [[3, top - 1], [6, top - 2], [9, top - 2], [12, top - 1], [2, top + 2], [13, top + 2]]) raster.set(x, y, R.HAIR)
    if (direction === 'up') raster.rect(3, top + 3, 10, 9, R.HAIR)
    else { raster.row(top + 2, 3, 3, R.HAIR); raster.row(top + 2, 10, 3, R.HAIR) }
    raster.set(6, top - 1, R.HAIR_LIGHT)
  } else if (style === 'natural') {
    raster.row(top - 2, 4, 8, R.HAIR); raster.row(top - 3, 6, 4, R.HAIR)
    raster.rect(2, top, 2, 10, R.HAIR); raster.rect(12, top, 2, 10, R.HAIR)
    if (direction === 'up') raster.rect(3, top + 3, 10, 10, R.HAIR)
    raster.set(5, top - 2, R.HAIR_LIGHT)
  } else if (style === 'bun') {
    raster.rect(11, top - 3, 4, 4, R.HAIR); raster.set(12, top - 2, R.HAIR_LIGHT)
    if (direction === 'up') raster.rect(3, top + 3, 10, 9, R.HAIR)
    raster.row(top + 2, 3, 10, R.HAIR)
  } else if (style === 'cornrows') {
    for (let index = 0; index < 4; index++) {
      raster.set(4 + index, top + index % 2, R.HAIR_SHADE)
      raster.set(6 + index, top + index % 2, R.HAIR_SHADE)
      raster.set(8 + index, top + index % 2, R.HAIR_SHADE)
    }
    if (direction === 'up') raster.rect(3, top + 3, 10, 9, R.HAIR)
  } else if (style === 'cowlick') {
    raster.set(9, top - 2, R.HAIR); raster.set(10, top - 1, R.HAIR); raster.set(10, top - 2, R.HAIR)
    if (direction === 'up') raster.rect(3, top + 3, 10, 9, R.HAIR)
    raster.row(top + 2, 3, 10, R.HAIR)
  } else if (style === 'flat-top') {
    raster.row(top - 2, 4, 8, R.HAIR); raster.row(top - 3, 4, 8, R.HAIR_SHADE)
    raster.rect(3, top - 2, 10, 5, R.HAIR)
    if (direction === 'up') raster.rect(3, top + 3, 10, 9, R.HAIR)
  }
}

// Legs and arms are the only parts that move; the torso stays on its pixel row.
function legs(raster, direction, pose, index) {
  const R = CHIBI_ROLES, top = BODY + 8, stride = pose === 'walk' ? index % 4 : -1
  if (pose === 'sitting') {
    if (direction === 'right') {
      raster.rect(5, top, 8, 3, R.PANTS)
      hlineOf(raster, 5, top + 1, 8, R.PANTS_SHADE)
      raster.rect(12, top + 2, 3, 2, R.SHOE)
    } else {
      raster.rect(4, top, 8, 3, R.PANTS)
      hlineOf(raster, 4, top + 1, 8, R.PANTS_SHADE)
      raster.rect(4, top + 3, 2, 2, R.SHOE); raster.rect(10, top + 3, 2, 2, R.SHOE)
      raster.rect(4, top + 2, 2, 1, R.PANTS); raster.rect(10, top + 2, 2, 1, R.PANTS)
    }
    return
  }
  if (direction === 'right') {
    const forward = stride === 0 ? 2 : stride === 2 ? 0 : 1
    raster.rect(5 + forward, top, 3, 6, R.PANTS)
    raster.rect(8 - forward + (stride === 1 ? 1 : 0), top, 3, 6, R.PANTS)
    raster.rect(4 + forward, top + 6, 4, 2, R.SHOE)
    raster.rect(8 - forward + (stride === 3 ? 1 : 0), top + 6, 4, 2, R.SHOE)
  } else {
    const leftLift = stride === 1 ? 1 : 0, rightLift = stride === 3 ? 1 : 0
    raster.rect(5, top, 3, 6 - leftLift, R.PANTS)
    raster.rect(9, top, 3, 6 - rightLift, R.PANTS)
    raster.rect(4, top + 6 - leftLift, 4, 2, R.SHOE)
    raster.rect(9, top + 6 - rightLift, 4, 2, R.SHOE)
  }
}

function arms(raster, direction, pose, index) {
  const R = CHIBI_ROLES, swing = pose === 'walk' ? [0, -1, 0, 1][index % 4] : 0
  const bob = pose === 'walk' && index % 2 ? -1 : 0
  if (direction === 'right') {
    raster.rect(10, BODY + 1 + bob - swing, 2, 6, R.SHIRT)
    raster.set(11, BODY + 7 + bob - swing, R.SKIN)
    raster.rect(5, BODY + 1 + bob + swing, 2, 6, R.SHIRT_SHADE)
    raster.set(5, BODY + 7 + bob + swing, R.SKIN_SHADE)
  } else {
    raster.rect(3, BODY + 1 + bob + swing, 2, 6, R.SHIRT)
    raster.rect(11, BODY + 1 + bob - swing, 2, 6, R.SHIRT)
    raster.set(3, BODY + 7 + bob + swing, R.SKIN); raster.set(4, BODY + 7 + bob + swing, R.SKIN)
    raster.set(11, BODY + 7 + bob - swing, R.SKIN); raster.set(12, BODY + 7 + bob - swing, R.SKIN)
  }
}

function torso(raster, direction, appearance) {
  const R = CHIBI_ROLES, width = appearance.body === 'm' ? 8 : 6, x = width === 8 ? 4 : 5
  raster.rect(x, BODY, width, 8, R.SHIRT)
  raster.row(BODY + 7, x, width, R.SHIRT_SHADE)
  if (direction !== 'up') raster.row(BODY - 1, 6, 4, R.SKIN)
}

function outfit(raster, direction, outfit, appearance) {
  const R = CHIBI_ROLES
  if (direction === 'up') {
    raster.row(BODY + 1, 5, 6, R.SHIRT_SHADE)
    if (outfit === 'buttoned') raster.row(BODY + 2, 5, 6, R.SHIRT_SHADE)
    return
  }
  if (direction === 'right') {
    if (outfit === 't-shirt') raster.set(11, BODY, R.SKIN)
    else if (outfit === 'polo') { raster.set(10, BODY, R.SHIRT_LIGHT); raster.set(11, BODY + 1, R.SHIRT_LIGHT) }
    else if (outfit === 'v-neck') raster.set(11, BODY + 1, R.SKIN)
    else { raster.set(11, BODY + 1, R.SHIRT_SHADE); raster.set(11, BODY + 4, R.ACCENT_LIGHT) }
    return
  }
  const width = appearance.body === 'm' ? 8 : 6, x = width === 8 ? 4 : 5
  if (outfit === 't-shirt') {
    raster.row(BODY, 6, 4, R.SKIN)
    raster.set(x, BODY + 3, R.SHIRT_SHADE); raster.set(x + width - 1, BODY + 3, R.SHIRT_SHADE)
  } else if (outfit === 'polo') {
    raster.row(BODY, 6, 4, R.SKIN)
    raster.set(5, BODY, R.SHIRT_LIGHT); raster.set(10, BODY, R.SHIRT_LIGHT)
    raster.set(5, BODY + 1, R.SHIRT_LIGHT); raster.set(10, BODY + 1, R.SHIRT_LIGHT)
    raster.set(8, BODY + 2, R.ACCENT_LIGHT); raster.set(8, BODY + 4, R.ACCENT_LIGHT)
  } else if (outfit === 'v-neck') {
    raster.set(7, BODY, R.SKIN); raster.set(8, BODY, R.SKIN); raster.set(8, BODY + 1, R.SKIN)
    raster.set(7, BODY + 2, R.SKIN); raster.set(9, BODY + 2, R.SKIN)
  } else {
    raster.row(BODY, 6, 4, R.SKIN)
    raster.set(8, BODY + 1, R.SHIRT_SHADE)
    for (const row of [2, 4, 6]) raster.set(8, BODY + row, R.ACCENT_LIGHT)
  }
}

function accessories(raster, direction, list = []) {
  const R = CHIBI_ROLES
  if (list.includes('glasses')) {
    if (direction === 'right') { raster.rect(9, 7, 3, 1, R.ACCENT); raster.set(9, 8, R.ACCENT); raster.set(11, 8, R.ACCENT) }
    else if (direction !== 'up') {
      raster.rect(4, 7, 3, 1, R.ACCENT); raster.rect(9, 7, 3, 1, R.ACCENT)
      raster.set(4, 8, R.ACCENT); raster.set(6, 8, R.ACCENT); raster.set(9, 8, R.ACCENT); raster.set(11, 8, R.ACCENT)
      raster.set(7, 7, R.ACCENT)
    }
  }
  if (list.includes('scarf')) {
    if (direction === 'right') raster.rect(6, BODY - 1, 5, 1, R.ACCENT)
    else { raster.row(BODY - 1, 4, 8, R.ACCENT); raster.rect(4, BODY, 2, 3, R.ACCENT_SHADE) }
  }
  if (list.includes('name-badge') && direction !== 'up') {
    const x = direction === 'right' ? 9 : 6
    raster.rect(x, BODY + 3, 2, 3, R.WHITE); raster.rect(x, BODY + 3, 2, 1, R.ACCENT)
  }
  if (list.includes('hair-clip')) {
    const x = direction === 'right' ? 7 : 11
    raster.rect(x, HEAD_TOP + 1, 2, 1, R.ACCENT); raster.set(x, HEAD_TOP, R.ACCENT_LIGHT)
  }
}

function draw(appearance, direction, pose, index) {
  const raster = new Raster()
  const facing = direction === 'up' ? 'up' : direction === 'right' ? 'right' : 'down'
  torso(raster, facing, appearance)
  arms(raster, facing, pose, index)
  legs(raster, facing, pose, index)
  if (facing === 'up') {
    head(raster, CHIBI_ROLES.HAIR)
    hairStyle(raster, appearance.hair, 'up')
    outfit(raster, 'up', appearance.outfit, appearance)
    accessories(raster, 'up', appearance.accessories)
    return raster.shaded()
  }
  head(raster)
  const blink = pose === 'idle' && index === 2
  if (facing === 'right') faceSide(raster, blink)
  else { ears(raster); faceDown(raster, blink) }
  hairStyle(raster, appearance.hair, facing)
  outfit(raster, facing, appearance.outfit, appearance)
  accessories(raster, facing, appearance.accessories)
  return raster.shaded()
}

export function chibiFrame(appearance, direction = 'down', pose = 'idle', frameIndex = 0) {
  const action = CHIBI_POSES[pose] ?? CHIBI_POSES.idle
  const index = Math.max(0, Math.min(action.frames - 1, Math.floor(frameIndex)))
  const facing = ['up', 'left', 'down', 'right'].includes(direction) ? direction : 'down'
  return facing === 'left' ? draw(appearance, 'right', pose, index).mirror() : draw(appearance, facing, pose, index)
}

export function makeCharacterSheet(appearance, preset) {
  const palette = paletteFor(appearance, preset)
  const columns = CHIBI.columns, rows = 12, sheetWidth = columns * CHIBI.width
  const data = new Uint8ClampedArray(sheetWidth * rows * CHIBI.height * 4)
  for (const [pose, meta] of Object.entries(CHIBI_POSES)) for (const [direction, row] of Object.entries(CHIBI_DIRECTIONS)) for (let index = 0; index < meta.frames; index++) {
    const pixels = chibiFrame(appearance, direction, pose, index).toRGBA(palette)
    const originX = index * CHIBI.width, originY = (meta.row + row) * CHIBI.height
    for (let y = 0; y < CHIBI.height; y++) {
      const target = ((originY + y) * sheetWidth + originX) * 4
      data.set(pixels.subarray(y * CHIBI.width * 4, (y + 1) * CHIBI.width * 4), target)
    }
  }
  return canvasFromPixels(sheetWidth, rows * CHIBI.height, data)
}

export const resolveColors = appearance => {
  const palette = paletteFor(appearance)
  return Object.fromEntries([...palette].map(([role, [red, green, blue]]) => [role, toColor([red, green, blue])]))
}

export const chibiPalette = paletteFor
