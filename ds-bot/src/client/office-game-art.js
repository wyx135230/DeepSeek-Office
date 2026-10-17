import tiles from './assets/ninja/tileset.png'
import elder from './assets/ninja/character-9.png'
import scholar from './assets/ninja/character-10.png'
import maker from './assets/ninja/character-12.png'
import traveler from './assets/ninja/character-17.png'
import host from './assets/ninja/character-25.png'
import dog from './assets/ninja/character-dog.png'
import { hashOf } from '../shared/office.js'
import { CHARACTER, characterBody } from '../shared/office-character.js'

export const GAME_ART = { tiles, elder, scholar, maker, traveler, host, dog }
export const CAST = ['scholar', 'maker', 'elder', 'host']
export const DIRECTIONS = { down: 0, up: 1, left: 2, right: 3 }
export function characterArt(bot) { return CAST[hashOf(bot.id) % CAST.length] }

export function makeCharacterSheet(source, bot) {
  const canvas = document.createElement('canvas')
  canvas.width = CHARACTER.width * 4; canvas.height = CHARACTER.height * 3
  const ctx = canvas.getContext('2d')
  ctx.imageSmoothingEnabled = false
  const valid = value => /^#[0-9a-f]{6}$/i.test(value ?? '')
  const coat = valid(bot.officeAvatar?.palette?.[4]) ? bot.officeAvatar.palette[4] : ['#748f83', '#8b94a4', '#b28e75', '#80956d'][hashOf(bot.id) % 4]
  const rgb = [1, 3, 5].map(offset => parseInt(coat.slice(offset, offset + 2), 16))
  const highlight = '#' + rgb.map(v => Math.min(255, Math.round(v * 1.17 + 12)).toString(16).padStart(2, '0')).join('')
  const colors = { o: '#35423f', k: '#e4b58f', c: coat, h: highlight, p: '#465768', s: '#493f38', b: '#e9ddbc' }
  for (const [direction, column] of Object.entries(DIRECTIONS)) for (let step = 0; step < 3; step++) {
    const x = column * CHARACTER.width, y = step * CHARACTER.height
    for (const [yy, row] of characterBody(direction, step).entries()) for (const [xx, pixel] of row.entries()) if (pixel !== '.') { ctx.fillStyle = colors[pixel]; ctx.fillRect(x + xx, y + yy, 1, 1) }
    ctx.drawImage(source, column * 16, step * 16, 16, CHARACTER.headHeight, x, y, 16, CHARACTER.headHeight)
  }
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
  // Bamboo and a stone lantern frame the garden without blocking the office.
  for (const x of [12, 410]) for (let y = 176; y < H - 110; y += 14) { r(x, y, 2, 14, '#90a76b'); r(x - 1, y + 11, 4, 1, '#455e47'); r(x + 3, y + 3, 5, 2, '#759963'); r(x - 5, y + 7, 5, 2, '#87a572') }
  r(12, H - 51, 10, 4, '#404f45'); r(15, H - 60, 4, 10, '#97a08b'); r(12, H - 66, 10, 7, '#6f8273'); r(14, H - 64, 6, 4, theme.night ? '#efca7b' : '#d7d7a7'); r(10, H - 68, 14, 2, '#b1b39a')
  r(28, 49, W - 48, H - 62, '#26362e'); r(24, 40, W - 48, H - 64, '#604c3c')
  for (let y = 80; y < H - 32; y += 16) for (let x = 32; x < W - 32; x += 16) tile(32, 512, 16, 16, x, y)
  c.globalAlpha = .62; r(32, 80, W - 64, H - 112, '#c5b18d')
  c.globalAlpha = .16; r(32, 80, W - 64, H - 112, theme.floor); c.globalAlpha = 1
  for (let y = 86; y < H - 36; y += 16) for (let x = 38; x < W - 38; x += 32) {
    const offset = (x * 7 + y * 3) % 11
    c.globalAlpha = .17; r(x + offset, y, 8, 1, '#7b6347'); r(x + offset + 4, y + 3, 12, 1, '#f9e3b6'); c.globalAlpha = 1
  }
  // Project shoji grids onto the floor; the night preset has cooler moonlight.
  for (const x of [56, 184, 312]) {
    c.save(); c.beginPath(); c.rect(32, 82, W - 64, H - 114); c.clip()
    c.fillStyle = theme.night ? '#9cbfc3' : '#fff0b9'; c.globalAlpha = theme.night ? .12 : .23
    c.beginPath(); c.moveTo(x, 82); c.lineTo(x + 64, 82); c.lineTo(x + 89, 118); c.lineTo(x + 25, 118); c.fill()
    c.globalAlpha = .13
    for (let i = 0; i < 4; i++) { c.fillStyle = '#77694f'; c.beginPath(); c.moveTo(x + i * 16, 82); c.lineTo(x + i * 16 + 2, 82); c.lineTo(x + i * 16 + 27, 118); c.lineTo(x + i * 16 + 25, 118); c.fill() }
    r(x + 13, 99, 65, 2, '#77694f'); c.restore()
  }
  r(32, 40, W - 64, 38, theme.wall); r(32, 75, W - 64, 5, '#947454'); r(32, 80, W - 64, 2, '#75573e')
  for (let x = 32; x < W - 32; x += 16) { r(x, 40, 1, 35, '#d8c9a4'); r(x, 44, 16, 2, '#f9efd4') }
  const window = (x) => {
    r(x - 2, 44, 68, 30, '#8b6446'); r(x, 46, 64, 25, theme.night ? '#47647e' : '#a8c9b8')
    r(x, 60, 64, 11, '#789b7c'); r(x + 3, 56, 10, 15, '#89ab83'); r(x + 40, 53, 15, 18, '#90b38b')
    for (let xx = 0; xx <= 64; xx += 16) r(x + xx, 46, 2, 25, '#f0dbb2')
    r(x, 57, 64, 2, '#f0dbb2'); r(x - 3, 72, 70, 3, '#e8c990')
  }
  window(56); window(184); window(312)
  const tinyPlant = (x, y) => { r(x + 2, y - 6, 1, 6, '#577857'); r(x - 1, y - 5, 3, 2, '#8baf7b'); r(x + 3, y - 7, 3, 3, '#6d9467'); r(x, y, 6, 4, '#ba8260'); r(x - 1, y, 8, 1, '#e4b086') }
  tinyPlant(66, 71); tinyPlant(326, 71)
  r(134, 49, 33, 23, '#926d49'); r(136, 51, 29, 19, '#b79c68')
  for (const [x, y, color] of [[139, 53, '#eee0b6'], [151, 55, '#b8c99d'], [142, 62, '#dec19c']]) { r(x, y, 9, 7, color); r(x + 3, y, 2, 1, '#a76e51'); r(x + 2, y + 3, 5, 1, '#9e9874') }
  for (const x of [174, 298]) { r(x + 3, 41, 1, 5, '#84674a'); r(x, 46, 7, 15, '#b28a52'); r(x + 1, 48, 5, 11, '#eedaa1'); r(x + 2, 49, 3, 8, '#fff0be'); r(x, 52, 7, 1, '#c5a36b'); r(x + 2, 61, 3, 2, '#705940') }
  r(359, 65, 1, 12, '#7e8267'); r(356, 76, 7, 2, '#89a99c'); r(357, 74, 5, 3, '#c7d8ba'); r(359, 78, 1, 4, '#a59671')
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
  r(67, 103, 13, 5, '#9b7149'); r(69, 104, 4, 3, '#d9dfbf'); r(75, 104, 3, 3, '#dae5cd'); r(69, 104, 4, 1, '#65836e'); r(75, 104, 3, 1, '#8f9d72')
  r(103, 94, 5, 6, '#a87754'); r(103, 93, 5, 2, '#d9bd87'); r(104, 96, 3, 2, '#e8dcb4')
  counter(48, 152, 48); r(50, 143, 44, 20, '#684e3a')
  const books = ['#809c80', '#c47f63', '#e2be77', '#718da3', '#b5a18c']
  for (let row = 0; row < 2; row++) for (let i = 0; i < 10; i++) { r(52 + i * 4, 146 + row * 9, 3, 7 - i % 2, books[(i + row) % books.length]); r(52 + i * 4, 147 + row * 9, 2, 1, '#ead8a6') }
  r(50, 153, 44, 2, '#c59864'); r(50, 163, 44, 2, '#c59864')
  tinyPlant(84, 142); r(52, 139, 13, 3, '#b8c6a1'); r(54, 136, 11, 3, '#e1c990'); r(55, 137, 8, 1, '#f3e3b6')
  for (const [x, y, color] of [[108, 180, '#82947b'], [80, 197, '#ba8b72']]) { r(x, y, 14, 6, '#8e805c'); r(x, y - 1, 14, 5, color); r(x + 2, y, 10, 1, '#d3c99b'); r(x + 6, y + 2, 2, 1, '#67795e') }
  const plant = (x, y) => { tile(0, 128, 16, 16, x, y - 12); r(x + 4, y + 3, 9, 6, '#bd8661'); r(x + 3, y + 2, 11, 2, '#e0aa7a') }
  plant(136, 90); plant(376, 90); plant(48, H - 64); plant(368, H - 64)
  for (const [i, { x, y }] of world.desks.entries()) {
    r(x - 4, y - 4, 56, 46, '#b49969'); r(x - 2, y - 2, 52, 42, theme.accent)
    c.globalAlpha = .18; r(x, y, 48, 38, '#f3edbf'); c.globalAlpha = 1
    counter(x, y, 48)
    r(x + 13, y - 7, 23, 16, '#3c4945'); r(x + 15, y - 5, 19, 11, theme.night ? '#7a9f99' : '#a2c4b2')
    r(x + 17, y - 3, 8, 1, '#e0e9be'); r(x + 17, y, 13, 1, '#7eaa9b'); r(x + 17, y + 3, 10, 1, '#72988b')
    r(x + 23, y + 9, 3, 2, '#4f5a4d'); r(x + 19, y + 11, 12, 2, '#596455'); r(x + 16, y + 15, 18, 4, '#ddd7ad'); r(x + 18, y + 16, 14, 1, '#a9a487')
    r(x + 4, y + 4, 7, 10, '#f1e6bd'); r(x + 5, y + 6, 5, 1, '#b7ac8d'); r(x + 5, y + 9, 5, 1, '#b7ac8d'); r(x + 40, y + 8, 5, 5, '#f9efd0')
    r(x + 17, y + 29, 16, 7, '#576c61'); r(x + 19, y + 31, 12, 5, '#87a18b'); r(x + 19, y + 37, 2, 4, '#674e3b'); r(x + 29, y + 37, 2, 4, '#674e3b')
    // Each workstation has its own mug, notebook, stationery and reading lamp.
    r(x + 2, y - 10, 1, 13, '#6a735b'); r(x + 3, y - 11, 7, 2, '#677c65'); r(x + 7, y - 9, 6, 3, '#9bae82'); r(x + 8, y - 6, 4, 1, '#ffe4a4'); r(x, y + 3, 8, 2, '#5c6954')
    r(x + 37, y + 1, 7, 5, books[i % books.length]); r(x + 38, y + 2, 5, 3, '#eee2b3'); r(x + 39, y + 3, 4, 1, '#b5af8c')
    r(x + 40, y + 8, 5, 4, ['#c7d6b6', '#d8a088', '#a5bfc4'][i % 3]); r(x + 45, y + 9, 2, 2, '#c7b28b'); r(x + 41, y + 8, 3, 1, '#80694c')
    r(x + 12, y + 10, 2, 5, '#708c81'); r(x + 12, y + 9, 2, 1, '#f0d4a4'); r(x + 35, y + 15, 3, 1, '#7c8e83')
    r(x + 28, y + 5, 4, 3, i % 2 ? '#e2bd84' : '#c4cfa4'); r(x + 29, y + 6, 2, 1, '#9a946d')
    r(x + 31, y + 23, 1, 4, '#937c59'); r(x + 31, y + 26, 7, 1, '#937c59')
    if (i % 2 === 0) tinyPlant(x + 39, y - 5)
  }
  if (lobby) {
    counter(168, 112, 96); r(192, 115, 28, 12, '#eae0b6'); r(196, 118, 20, 1, '#a09372'); r(196, 121, 17, 1, '#a09372')
    r(232, 106, 14, 10, '#4f625a'); r(234, 108, 10, 6, '#97ba9f')
    r(284, 178, 72, 29, '#7c5b48'); r(288, 180, 64, 24, '#789381'); r(290, 182, 60, 9, '#a1b99b'); r(307, 191, 2, 10, '#5f7b6b'); r(330, 191, 2, 10, '#5f7b6b')
    r(176, 176, 80, 48, '#a47b59'); r(178, 178, 76, 44, '#d8b77e'); r(182, 182, 68, 36, '#e7cb98'); r(204, 192, 26, 16, '#a07b4f'); r(202, 190, 30, 14, '#cdab6b'); r(209, 194, 5, 5, '#f5e8c2')
    r(316, 188, 12, 7, '#c0aa7c'); r(317, 189, 10, 5, '#d8c99b'); r(321, 190, 2, 2, '#b5a37b')
    r(225, 118, 4, 2, '#d8a963'); r(226, 116, 2, 3, '#e8d3a3'); tinyPlant(250, 110)
  } else {
    const y = H - 104
    r(156, y - 16, 136, 64, '#a89167'); r(158, y - 14, 132, 60, '#bdad80')
    for (let x = 178; x < 278; x += 32) { r(x, y - 10, 18, 10, '#6f8c78'); r(x + 2, y - 9, 14, 6, '#a0b092'); r(x, y + 29, 18, 10, '#6f8c78'); r(x + 2, y + 30, 14, 6, '#a0b092') }
    counter(168, y, 112)
    r(178, y + 4, 18, 11, '#eee3bd'); r(180, y + 6, 13, 1, '#b5aa8c'); r(180, y + 9, 10, 1, '#b5aa8c')
    r(229, y + 4, 9, 10, '#839f88'); r(230, y + 5, 7, 2, '#b7c29d'); r(256, y + 8, 5, 4, '#f6ebc5')
    r(205, y + 5, 17, 10, '#9c714e'); r(206, y + 6, 15, 8, '#d8b77c'); r(208, y + 8, 4, 4, '#e6d7ae'); r(215, y + 8, 4, 4, '#e6d7ae'); r(209, y + 8, 2, 2, '#91a075'); r(216, y + 8, 2, 2, '#91a075')
    r(243, y + 4, 8, 6, '#d8cfaa'); r(244, y + 5, 3, 3, '#c49669'); r(248, y + 6, 2, 2, '#d6aa74')
  }
  // Momo's woven bed, water dish and a pair of slippers by the lift.
  r(108, H - 69, 25, 12, '#8d7958'); r(110, H - 71, 21, 12, '#c2ad7b'); r(112, H - 69, 17, 8, '#d5c397'); r(113, H - 68, 15, 1, '#e9d6ab')
  r(137, H - 59, 8, 4, '#6c8378'); r(138, H - 60, 6, 3, '#b8d3c3'); r(139, H - 59, 4, 1, '#e0e6cf')
  for (const x of [172, 181]) { r(x, H - 42, 5, 8, '#a58f65'); r(x, H - 41, 5, 3, '#e1c99c'); r(x + 1, H - 40, 3, 1, '#b49e71') }
  r(250, H - 49, 33, 16, '#9e885e'); r(252, H - 47, 29, 12, '#b8aa7e'); r(254, H - 45, 25, 1, '#d5c697'); r(254, H - 38, 25, 1, '#9b916f')
  r(192, H - 43, 48, 15, '#3a4945'); r(194, H - 42, 44, 12, '#819188'); r(215, H - 42, 2, 12, '#5c6e64')
  r(196, H - 41, 17, 1, '#b5beb0'); r(219, H - 41, 17, 1, '#b5beb0'); r(198, H - 54, 36, 10, '#d7bd81'); r(200, H - 52, 32, 6, '#efe0b0')
  // Paint the front garden over the building shadow, outside the walking area.
  for (let x = 136; x < 300; x += 24) { r(x, H - 18, 18, 7, '#425e50'); r(x + 1, H - 20, 15, 7, '#9b9e80'); r(x + 3, H - 19, 10, 1, '#c3bfa0') }
  for (const x of [56, 96, 320, 356]) {
    r(x - 3, H - 22, 22, 10, '#455e4b')
    for (let i = 0; i < 4; i++) { const xx = x + i * 4, yy = H - 21 + i % 2 * 4; r(xx + 1, yy, 1, 6, '#87a477'); r(xx, yy, 3, 2, i % 2 ? '#e9bc99' : '#f0d8b3'); r(xx + 1, yy - 1, 1, 1, '#f5e7c6') }
  }
  if (theme.night) { c.globalAlpha = .18; r(0, 0, W, H, '#263b62'); c.globalAlpha = 1 }
  return canvas
}
