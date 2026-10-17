import { cleanPixelAvatar, defaultPixelAvatar, hashOf } from '../shared/office.js'

const INK = '#555447'
const WOOD = '#a57d57'
const LIGHT = '#f7edda'

function canvas(width, height) {
  const image = document.createElement('canvas')
  image.width = width
  image.height = height
  const ctx = image.getContext('2d')
  ctx.imageSmoothingEnabled = false
  return { image, ctx }
}

function rect(ctx, x, y, width, height, color) {
  ctx.fillStyle = color
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(width), Math.round(height))
}

function plant(ctx, x, y, large = false) {
  const size = large ? 1.5 : 1
  ctx.save(); ctx.translate(x, y); ctx.scale(size, size)
  rect(ctx, -6, 3, 12, 2, '#8c7460'); rect(ctx, -5, 5, 10, 8, '#bb9273'); rect(ctx, -3, 6, 3, 6, '#d5ad86')
  rect(ctx, -1, -14, 2, 18, '#62865b'); rect(ctx, -8, -10, 8, 5, '#819d67'); rect(ctx, -6, -12, 4, 3, '#9aaf7b')
  rect(ctx, 1, -18, 7, 6, '#718f62'); rect(ctx, 3, -20, 4, 3, '#94aa78'); rect(ctx, 1, -5, 8, 5, '#658b63')
  ctx.restore()
}

function windowArt(ctx, x, y, width, night) {
  rect(ctx, x - 3, y - 3, width + 6, 48, WOOD)
  rect(ctx, x, y, width, 40, night ? '#76889d' : '#bdd4cf')
  rect(ctx, x, y + 25, width, 15, night ? '#6c8086' : '#9ab5a0')
  for (let xx = 0; xx < width; xx += 5) rect(ctx, x + xx, y + 19 + Math.sin(xx * .2) * 6, 5, 21, night ? '#647a75' : '#abc3a9')
  rect(ctx, x + width - 18, y + 6, 9, 9, night ? '#f2e4ac' : '#f6e6b7')
  for (let xx = 12; xx < width; xx += 17) rect(ctx, x + xx, y, 2, 40, '#e9dbbc')
  rect(ctx, x, y + 20, width, 2, '#e9dbbc'); rect(ctx, x - 4, y + 41, width + 8, 4, '#b98f63')
}

function bookcase(ctx, x, y) {
  rect(ctx, x, y, 54, 34, '#92704f'); rect(ctx, x + 2, y + 2, 50, 28, '#b28c62')
  const colors = ['#7d9b8c', '#b37873', '#ddb97a', '#758a9b', '#c3ba9a']
  for (let row = 0; row < 2; row++) for (let i = 0; i < 10; i++) {
    const hh = 9 + i % 3
    rect(ctx, x + 5 + i * 4, y + 14 + row * 14 - hh, 3, hh, colors[(i + row) % colors.length])
    rect(ctx, x + 5 + i * 4, y + 8 + row * 14, 3, 1, '#e8d8af')
  }
  rect(ctx, x + 1, y + 16, 52, 2, '#8e6f51'); rect(ctx, x + 1, y + 31, 52, 3, '#805f45')
}

function teaCorner(ctx, x, y) {
  rect(ctx, x - 4, y + 4, 67, 29, '#9b805c'); rect(ctx, x - 2, y + 5, 63, 26, '#c1b37e')
  rect(ctx, x + 1, y + 8, 57, 1, '#d4c894'); rect(ctx, x + 1, y + 27, 57, 1, '#a99e6d')
  rect(ctx, x + 8, y + 12, 46, 15, '#9c795a'); rect(ctx, x + 8, y + 10, 46, 12, '#cba575')
  rect(ctx, x + 23, y + 5, 12, 9, '#7c9686'); rect(ctx, x + 25, y + 3, 8, 2, '#567660')
  rect(ctx, x + 35, y + 7, 4, 3, '#7c9686'); rect(ctx, x + 17, y + 13, 5, 4, LIGHT); rect(ctx, x + 41, y + 14, 5, 4, LIGHT)
  rect(ctx, x + 13, y + 30, 16, 7, '#b8857c'); rect(ctx, x + 37, y + 30, 16, 7, '#879c86')
}

function desk(ctx, x, y, index, accent) {
  rect(ctx, x + 1, y + 23, 45, 6, '#a58361'); rect(ctx, x + 3, y + 21, 41, 13, '#99764f')
  rect(ctx, x + 4, y + 27, 4, 12, '#896b50'); rect(ctx, x + 38, y + 27, 4, 12, '#896b50')
  rect(ctx, x, y + 15, 48, 13, '#bd966b'); rect(ctx, x + 1, y + 14, 46, 11, '#e0bd8d')
  rect(ctx, x + 3, y + 15, 42, 1, '#f2d6ab'); rect(ctx, x + 5, y + 19, 6, 1, '#cba677')
  rect(ctx, x + 13, y, 24, 17, INK); rect(ctx, x + 15, y + 2, 20, 12, '#516b72')
  rect(ctx, x + 17, y + 4, 9, 1, '#c7d8ba'); rect(ctx, x + 18, y + 7, 13, 1, '#9eafa6'); rect(ctx, x + 18, y + 10, 6, 1, '#c7bda3')
  rect(ctx, x + 24, y + 17, 3, 3, INK); rect(ctx, x + 19, y + 20, 13, 2, '#686e68')
  rect(ctx, x + 18, y + 24, 14, 3, '#eddfbf'); rect(ctx, x + 19, y + 24, 12, 1, '#8e9488')
  rect(ctx, x + 39, y + 18, 5, 5, LIGHT); rect(ctx, x + 44, y + 19, 2, 3, LIGHT)
  rect(ctx, x + 3, y + 9, 6, 9, accent); rect(ctx, x + 4, y + 7, 4, 3, '#869777')
  if (index % 2 === 0) { rect(ctx, x + 2, y + 22, 7, 4, '#aaa3b3'); rect(ctx, x + 3, y + 22, 5, 1, '#dbd4de') }
  rect(ctx, x + 16, y + 40, 18, 5, '#776c61'); rect(ctx, x + 18, y + 35, 14, 7, accent); rect(ctx, x + 20, y + 37, 10, 2, '#abc1a8')
}

export function roomCanvas(floor, lobby = false) {
  const width = floor.layout.width / 2
  const height = floor.layout.height / 2
  const { image, ctx } = canvas(width, height)
  const theme = floor.theme
  rect(ctx, 0, 0, width, height, theme.night ? '#3f4e5b' : '#d8e2d5')
  rect(ctx, 14, 29, width - 24, height - 42, '#a5b3a0')
  rect(ctx, 10, 24, width - 24, height - 42, '#8e7561')
  rect(ctx, 12, 25, width - 28, height - 47, theme.floor)
  for (let yy = 68; yy < height - 23; yy += 10) {
    rect(ctx, 14, yy, width - 32, 1, '#ad8966')
    for (let xx = 15 + (yy % 3) * 12; xx < width - 20; xx += 38) {
      rect(ctx, xx, yy + 1, 1, 9, '#b18b65'); rect(ctx, xx + 8, yy + 6, 10 + yy % 7, 1, '#d4ac80')
    }
  }
  rect(ctx, 12, 25, width - 28, 42, theme.wall); rect(ctx, 12, 65, width - 28, 3, '#b8936d')
  rect(ctx, 12, 25, 3, height - 47, '#ecd6b4'); rect(ctx, width - 19, 25, 3, height - 47, '#ecd6b4')
  windowArt(ctx, 30, 13, 71, theme.night); windowArt(ctx, 230, 13, 112, theme.night)
  rect(ctx, 130, 31, 68, 28, '#af9271'); rect(ctx, 133, 34, 62, 22, '#e7dec5')
  for (let i = 0; i < 4; i++) { rect(ctx, 140 + i * 12, 39, 7, 6, ['#b2c7a1', '#dcb1a2', '#e1cd92', '#a4bbcb'][i]); rect(ctx, 140 + i * 12, 48, 8, 1, '#aa9c80') }
  plant(ctx, 23, 76); plant(ctx, width - 32, 80, true)
  bookcase(ctx, 26, 94); teaCorner(ctx, 26, 166)
  rect(ctx, 24, 141, 53, 9, '#ccbc96'); rect(ctx, 26, 141, 49, 2, '#e9d8b1')
  rect(ctx, 32, 151, 4, 10, '#8e7454'); rect(ctx, 65, 151, 4, 10, '#8e7454')
  rect(ctx, 42, 134, 8, 7, '#d7a998'); rect(ctx, 43, 132, 6, 2, '#f1d9b3')
  const doorX = 81
  rect(ctx, doorX, height - 33, 28, 18, '#8e7561'); rect(ctx, doorX + 3, height - 32, 22, 17, '#d4bf98')
  rect(ctx, doorX + 7, height - 28, 6, 10, '#e5d8bb'); rect(ctx, doorX + 15, height - 28, 6, 10, '#e5d8bb')
  rect(ctx, doorX - 4, height - 14, 36, 7, '#a8b394')
  if (lobby) {
    rect(ctx, 135, 114, 179, 38, '#927b60'); rect(ctx, 135, 108, 179, 12, '#d5b58a')
    rect(ctx, 140, 121, 169, 28, '#b59a74'); rect(ctx, 211, 127, 24, 9, '#e8d4b1')
    rect(ctx, 200, 88, 30, 23, INK); rect(ctx, 202, 90, 26, 18, '#7f9b94'); rect(ctx, 212, 110, 6, 5, INK)
    plant(ctx, 290, 102); plant(ctx, 165, 184, true)
    rect(ctx, 238, 174, 79, 18, '#a3af99'); rect(ctx, 238, 168, 79, 12, '#b4bfa4')
    rect(ctx, 235, 169, 8, 24, '#85947d'); rect(ctx, 311, 169, 8, 24, '#85947d')
    rect(ctx, 260, 195, 37, 10, '#b28a62'); rect(ctx, 263, 193, 31, 8, '#d7b082')
    rect(ctx, 268, 190, 5, 4, LIGHT); rect(ctx, 285, 190, 5, 4, LIGHT)
  } else floor.layout.desks.forEach((position, index) => desk(ctx, position.x / 2, position.y / 2, index, theme.accent))
  return image
}

export function avatarCanvas(bot, state = 'idle', frame = 0) {
  let avatar
  try { avatar = cleanPixelAvatar(bot.officeAvatar) } catch { avatar = defaultPixelAvatar(bot) }
  const { image, ctx } = canvas(20, 28)
  const bob = ['walk', 'speaking', 'waiting', 'stretch'].includes(state) ? frame % 2 : 0
  avatar.pixels.forEach((row, y) => [...row].forEach((ink, x) => {
    const index = parseInt(ink, 16)
    if (index) rect(ctx, x + 2, y + 2 - bob, 1, 1, avatar.palette[index])
  }))
  if (state === 'walk') {
    ctx.clearRect(2, 22 - bob, 16, 4)
    rect(ctx, frame % 2 ? 6 : 5, 22 - bob, 3, 3, avatar.palette[1]); rect(ctx, frame % 2 ? 11 : 12, 22, 3, 3, avatar.palette[1])
  }
  if (state === 'reading') {
    rect(ctx, 4, 17, 12, 7, '#647d70'); rect(ctx, 5, 17, 4, 6, '#f3e4c0'); rect(ctx, 10, 17 + frame % 2, 5, 5, '#e6d3a8')
  }
  if (state === 'typing') {
    rect(ctx, 4, 19, 13, 5, '#6c7f86'); rect(ctx, 5, 18, 11, 4, '#9ebbb2'); rect(ctx, 5, 23, 13, 1, '#d8ded2')
    rect(ctx, 5 + frame % 2, 22, 2, 1, avatar.palette[2]); rect(ctx, 13 - frame % 2, 22, 2, 1, avatar.palette[2])
  }
  if (state === 'tea') {
    rect(ctx, 13, 15, 5, 5, '#f6edd8'); rect(ctx, 18, 16, 1, 3, '#f6edd8'); rect(ctx, 14, 12 - frame % 2, 1, 2, '#bfc8ba')
  }
  if (state === 'waiting' || state === 'stretch') {
    rect(ctx, 15, 10 - frame % 2 * 2, 2, 6, avatar.palette[2]); rect(ctx, 16, 8 - frame % 2 * 2, 2, 3, avatar.palette[2])
    if (state === 'stretch') rect(ctx, 1, 10 + frame % 2, 3, 2, avatar.palette[2])
  }
  return image
}

export function catCanvas(frame = 0) {
  const { image, ctx } = canvas(24, 18)
  rect(ctx, 5, 7, 13, 8, '#d6aa77'); rect(ctx, 7, 8, 9, 5, '#e6c79a')
  rect(ctx, 3, 3, 10, 8, '#d6aa77'); rect(ctx, 3, 1, 3, 4, '#a97e56'); rect(ctx, 10, 1, 3, 4, '#a97e56')
  rect(ctx, 5, 6, 1, 2, INK); rect(ctx, 10, 6, 1, 2, INK); rect(ctx, 7, 9, 2, 1, '#a8796e')
  rect(ctx, 18, 6 + frame % 2, 4, 3, '#d6aa77'); rect(ctx, 21, 3 + frame % 2, 2, 5, '#d6aa77')
  rect(ctx, 5, 14, 3, 2, '#a97e56'); rect(ctx, 14, 14, 3, 2, '#a97e56')
  return image
}

export const idleStyle = id => ['tea', 'stretch', 'walk', 'idle'][hashOf(id) % 4]
