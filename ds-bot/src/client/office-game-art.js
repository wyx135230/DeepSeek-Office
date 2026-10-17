import tiles from './assets/ninja/tileset.png'
import elder from './assets/ninja/character-9.png'
import scholar from './assets/ninja/character-10.png'
import maker from './assets/ninja/character-12.png'
import traveler from './assets/ninja/character-17.png'
import host from './assets/ninja/character-25.png'
import dog from './assets/ninja/character-dog.png'
import { hashOf } from '../shared/office.js'

export const GAME_ART = { tiles, elder, scholar, maker, traveler, host, dog }
export const CAST = ['scholar', 'maker', 'elder', 'host']
export const DIRECTIONS = { down: 0, up: 1, left: 2, right: 3 }
export function characterArt(bot) { return CAST[hashOf(bot.id) % CAST.length] }

export function makeCharacterSheet(source, bot) {
  const canvas = document.createElement('canvas')
  canvas.width = source.width; canvas.height = source.height
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(source, 0, 0)
  const color = bot.officeAvatar?.palette?.[4]
  if (!/^#[0-9a-f]{6}$/i.test(color ?? '')) return canvas
  const rgb = [1, 3, 5].map(offset => parseInt(color.slice(offset, offset + 2), 16))
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height)
  // Preserve the licensed directional silhouettes and give all walk frames the AI outfit color.
  for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) {
    const localX = x % 16, localY = y % 16
    if (localX < 5 || localX > 10 || localY < 10 || localY > 13) continue
    const i = (y * canvas.width + x) * 4
    const [r, g, b, a] = pixels.data.slice(i, i + 4)
    if (a < 200 || Math.max(r, g, b) < 40 || r > g * 1.45 && g > b * 1.35) continue
    const shade = Math.max(.55, Math.min(1.15, (r + g + b) / 380))
    for (let channel = 0; channel < 3; channel++) pixels.data[i + channel] = Math.round(Math.min(255, rgb[channel] * shade))
  }
  ctx.putImageData(pixels, 0, 0)
  return canvas
}

export function makeRoomArt(world, theme, sheet, lobby) {
  const canvas = document.createElement('canvas')
  canvas.width = world.width; canvas.height = world.height
  const c = canvas.getContext('2d')
  c.imageSmoothingEnabled = false
  const r = (x, y, w, h, color) => { c.fillStyle = color; c.fillRect(x, y, w, h) }
  const tile = (sx, sy, w, h, x, y) => c.drawImage(sheet, sx, sy, w, h, x, y, w, h)
  const W = world.width, H = world.height
  r(0, 0, W, H, '#202e32'); r(8, 8, W - 16, H - 16, '#5b7961')
  for (let y = 8; y < H - 8; y += 16) for (let x = 8; x < W - 8; x += 16) {
    r(x + (y % 32 ? 3 : 9), y + 5, 2, 1, '#78936b'); r(x + 5, y + 11, 1, 2, '#496958')
  }
  for (const x of [8, 384]) for (const y of [16, 96, H - 80]) tile(48, 144, 32, 48, x, y)
  r(28, 49, W - 48, H - 62, '#26362e'); r(24, 40, W - 48, H - 64, '#604c3c')
  for (let y = 80; y < H - 32; y += 16) for (let x = 32; x < W - 32; x += 16) tile(32, 512, 16, 16, x, y)
  c.globalAlpha = .62; r(32, 80, W - 64, H - 112, '#c5b18d')
  c.globalAlpha = .16; r(32, 80, W - 64, H - 112, theme.floor); c.globalAlpha = 1
  r(32, 40, W - 64, 38, theme.wall); r(32, 75, W - 64, 5, '#947454'); r(32, 80, W - 64, 2, '#75573e')
  for (let x = 32; x < W - 32; x += 16) { r(x, 40, 1, 35, '#d8c9a4'); r(x, 44, 16, 2, '#f9efd4') }
  const window = (x) => {
    r(x - 2, 44, 68, 30, '#8b6446'); r(x, 46, 64, 25, theme.night ? '#47647e' : '#a8c9b8')
    r(x, 60, 64, 11, '#789b7c'); r(x + 3, 56, 10, 15, '#89ab83'); r(x + 40, 53, 15, 18, '#90b38b')
    for (let xx = 0; xx <= 64; xx += 16) r(x + xx, 46, 2, 25, '#f0dbb2')
    r(x, 57, 64, 2, '#f0dbb2'); r(x - 3, 72, 70, 3, '#e8c990')
  }
  window(56); window(184); window(312)
  r(273, 51, 15, 16, '#96754d'); r(275, 53, 11, 11, '#f0e2b4'); r(280, 55, 1, 5, '#7c8062'); r(280, 59, 4, 1, '#7c8062')
  for (const x of [24, W - 32]) { r(x, 40, 8, H - 72, '#926c47'); r(x + 1, 40, 2, H - 72, '#c29660') }
  r(24, H - 32, W - 48, 8, '#6d513a'); r(26, H - 32, W - 52, 2, '#b38b59')
  r(40, 88, 88, 120, '#b59d69'); r(42, 90, 84, 116, '#d3c891')
  for (let y = 92; y < 206; y += 3) r(43, y, 82, 1, '#c3bb85')
  r(42, 146, 84, 3, '#84916b'); r(104, 90, 3, 116, '#84916b')
  const counter = (x, y, w) => {
    r(x + 2, y + 6, w, 22, '#76503b'); r(x, y, w, 20, '#c09155'); r(x + 2, y + 2, w - 4, 13, '#e1b56f'); r(x + 2, y + 16, w - 4, 2, '#9c693e')
    for (let xx = x + 4; xx < x + w; xx += 16) { r(xx, y + 21, 10, 5, '#af7e4d'); r(xx + 4, y + 22, 2, 1, '#e9cd91') }
  }
  counter(48, 92, 64); tile(64, 96, 16, 16, 52, 92)
  r(83, 96, 12, 9, '#50655d'); r(85, 94, 8, 2, '#bdd0ba'); r(95, 97, 3, 5, '#50655d'); r(101, 102, 5, 4, '#faf0cd')
  counter(48, 152, 48); r(50, 143, 44, 20, '#684e3a')
  const books = ['#809c80', '#c47f63', '#e2be77', '#718da3', '#b5a18c']
  for (let row = 0; row < 2; row++) for (let i = 0; i < 10; i++) { r(52 + i * 4, 146 + row * 9, 3, 7 - i % 2, books[(i + row) % books.length]); r(52 + i * 4, 147 + row * 9, 2, 1, '#ead8a6') }
  const plant = (x, y) => { tile(0, 128, 16, 16, x, y - 12); r(x + 4, y + 3, 9, 6, '#bd8661'); r(x + 3, y + 2, 11, 2, '#e0aa7a') }
  plant(136, 90); plant(376, 90); plant(48, H - 64); plant(368, H - 64)
  for (const { x, y } of world.desks) {
    r(x - 4, y - 4, 56, 46, '#b49969'); r(x - 2, y - 2, 52, 42, theme.accent)
    c.globalAlpha = .18; r(x, y, 48, 38, '#f3edbf'); c.globalAlpha = 1
    counter(x, y, 48)
    r(x + 13, y - 7, 23, 16, '#3c4945'); r(x + 15, y - 5, 19, 11, theme.night ? '#7a9f99' : '#a2c4b2')
    r(x + 17, y - 3, 8, 1, '#e0e9be'); r(x + 17, y, 13, 1, '#7eaa9b'); r(x + 17, y + 3, 10, 1, '#72988b')
    r(x + 23, y + 9, 3, 2, '#4f5a4d'); r(x + 19, y + 11, 12, 2, '#596455'); r(x + 16, y + 15, 18, 4, '#ddd7ad'); r(x + 18, y + 16, 14, 1, '#a9a487')
    r(x + 4, y + 4, 7, 10, '#f1e6bd'); r(x + 5, y + 6, 5, 1, '#b7ac8d'); r(x + 5, y + 9, 5, 1, '#b7ac8d'); r(x + 40, y + 8, 5, 5, '#f9efd0')
    r(x + 17, y + 29, 16, 7, '#576c61'); r(x + 19, y + 31, 12, 5, '#87a18b'); r(x + 19, y + 37, 2, 4, '#674e3b'); r(x + 29, y + 37, 2, 4, '#674e3b')
  }
  if (lobby) {
    counter(168, 112, 96); r(192, 115, 28, 12, '#eae0b6'); r(196, 118, 20, 1, '#a09372'); r(196, 121, 17, 1, '#a09372')
    r(232, 106, 14, 10, '#4f625a'); r(234, 108, 10, 6, '#97ba9f')
    r(284, 178, 72, 29, '#7c5b48'); r(288, 180, 64, 24, '#789381'); r(290, 182, 60, 9, '#a1b99b'); r(307, 191, 2, 10, '#5f7b6b'); r(330, 191, 2, 10, '#5f7b6b')
    r(176, 176, 80, 48, '#a47b59'); r(178, 178, 76, 44, '#d8b77e'); r(182, 182, 68, 36, '#e7cb98'); r(204, 192, 26, 16, '#a07b4f'); r(202, 190, 30, 14, '#cdab6b'); r(209, 194, 5, 5, '#f5e8c2')
  } else {
    const y = H - 104
    r(156, y - 16, 136, 64, '#a89167'); r(158, y - 14, 132, 60, '#bdad80')
    for (let x = 178; x < 278; x += 32) { r(x, y - 10, 18, 10, '#6f8c78'); r(x + 2, y - 9, 14, 6, '#a0b092'); r(x, y + 29, 18, 10, '#6f8c78'); r(x + 2, y + 30, 14, 6, '#a0b092') }
    counter(168, y, 112)
    r(178, y + 4, 18, 11, '#eee3bd'); r(180, y + 6, 13, 1, '#b5aa8c'); r(180, y + 9, 10, 1, '#b5aa8c')
    r(229, y + 4, 9, 10, '#839f88'); r(230, y + 5, 7, 2, '#b7c29d'); r(256, y + 8, 5, 4, '#f6ebc5')
  }
  r(192, H - 43, 48, 15, '#3a4945'); r(194, H - 42, 44, 12, '#819188'); r(215, H - 42, 2, 12, '#5c6e64')
  r(196, H - 41, 17, 1, '#b5beb0'); r(219, H - 41, 17, 1, '#b5beb0'); r(198, H - 54, 36, 10, '#d7bd81'); r(200, H - 52, 32, 6, '#efe0b0')
  if (theme.night) { c.globalAlpha = .18; r(0, 0, W, H, '#263b62'); c.globalAlpha = 1 }
  return canvas
}
