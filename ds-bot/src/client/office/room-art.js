// Paints one floor of the office at native pixel scale: floors, walls, rugs, windows,
// baked lighting and the furniture objects that sort against the characters.
import { COZY, surface, rect, hline, vline, pixel, dither, shadow, mix, lighten, darken, seeded } from './pixel.js'
import { furnitureArt, propArt, decorArt } from './furniture.js'
import { officeLight } from '../../shared/office/lighting.js'
import { OFFICE_GEOMETRY } from '../../shared/office/world.js'

const WALL_FACE = 24
const FLOOR_MATERIALS = {
  oak: { base: '#c99762', light: '#d9aa72', seam: '#9c6a43', knot: '#a5713f' },
  walnut: { base: '#a9744a', light: '#bd8656', seam: '#7c5135', knot: '#8d5b38' },
  sage: { base: '#a8b48d', light: '#bcc79f', seam: '#7f8d6c', knot: '#94a37b' },
}
const ROOM_ACCENTS = {
  work: '#7f9a76', cafe: '#c08a58', library: '#82966f', arcade: '#7a8fb0',
  restaurant: '#c49a62', bar: '#92779f', gym: '#7fa39a', corridor: '#b9ad8f',
}

const wallpaperFor = (room, theme) => {
  const accent = theme.accent ?? ROOM_ACCENTS[room?.kind] ?? COZY.sage
  const base = mix(theme.wall ?? COZY.cream, '#f7edd6', .35)
  if (!room) return { base, accent, wainscot: COZY.wood, stripe: darken(base, .08) }
  if (room.kind === 'arcade') return { base: mix(base, '#5d5a86', .42), accent: '#9d7bc2', wainscot: COZY.walnut, stripe: '#5f5c88', dark: true }
  if (room.kind === 'library') return { base: mix(base, '#b9c49c', .4), accent, wainscot: COZY.walnut, stripe: darken(base, .12) }
  if (room.kind === 'gym') return { base: mix(base, '#b8cbb4', .45), accent, wainscot: COZY.woodLight, stripe: darken(base, .1) }
  if (room.kind === 'bar') return { base: mix(base, '#b39aad', .35), accent, wainscot: COZY.walnut, stripe: darken(base, .12) }
  if (room.kind === 'cafe' || room.kind === 'restaurant') return { base: mix(base, '#efdec0', .35), accent, wainscot: COZY.woodLight, stripe: darken(base, .1) }
  return { base, accent, wainscot: COZY.wood, stripe: darken(base, .1) }
}

function paintWoodFloor(context, area, material, seed, theme) {
  const tone = FLOOR_MATERIALS[material] ?? FLOOR_MATERIALS.oak
  const base = lighten(mix(tone.base, theme.floor ?? tone.base, .26), .05)
  const random = seeded(seed)
  rect(context, area.x, area.y, area.width, area.height, base)
  let row = 0
  for (let y = area.y; y < area.y + area.height; y += 16, row++) {
    let x = area.x - Math.floor(random() * 128)
    while (x < area.x + area.width) {
      const plankWidth = 120 + Math.floor(random() * 144)
      const toneShift = (random() - .5) * .04
      const plank = mix(base, toneShift > 0 ? lighten(base, toneShift) : darken(base, -toneShift), 1)
      const left = Math.max(x, area.x), right = Math.min(x + plankWidth, area.x + area.width)
      rect(context, left, y, right - left, 16, plank)
      if (left > area.x) vline(context, left, y, 16, mix(plank, tone.seam, .32))
      hline(context, left, y + 15, right - left, mix(plank, tone.seam, .26))
      if (random() > .5) hline(context, left + 4, y + 3 + Math.floor(random() * 9), Math.min(right - left - 8, 24 + Math.floor(random() * 60)), mix(plank, tone.light, .42))
      if (random() > .82) {
        const knotX = left + 6 + Math.floor(random() * 10)
        if (knotX < right - 3) { rect(context, knotX, y + 8, 3, 1, mix(plank, tone.knot, .5)); pixel(context, knotX + 1, y + 7, mix(plank, tone.knot, .35)) }
      }
      x += plankWidth
    }
  }
}

function paintCarpetFloor(context, area, seed, palette) {
  const random = seeded(seed)
  rect(context, area.x, area.y, area.width, area.height, palette.base)
  dither(context, area.x, area.y, area.width, area.height, palette.speck)
  for (let y = area.y; y < area.y + area.height; y += 32) for (let x = area.x; x < area.x + area.width; x += 32) {
    vline(context, x, y, 32, palette.seam); hline(context, x, y, 32, palette.seam)
    if (random() > .8) { rect(context, x + 4 + Math.floor(random() * 18), y + 4 + Math.floor(random() * 18), 2, 2, palette.speck) }
  }
}

function paintRug(context, x, y, width, height, base, accent, kind = 'border') {
  if (width < 12 || height < 12) return
  rect(context, x, y, width, height, darken(base, .3))
  rect(context, x + 1, y + 1, width - 2, height - 2, base)
  rect(context, x + 4, y + 4, width - 8, height - 8, mix(base, '#f5e8cb', .5))
  rect(context, x + 7, y + 7, width - 14, height - 14, base)
  if (kind === 'rings') {
    rect(context, x + 12, y + 12, width - 24, height - 24, accent)
    rect(context, x + 15, y + 15, width - 30, height - 30, mix(accent, '#f5e8cb', .45))
  } else if (kind === 'stripes') {
    for (let stripe = x + 10; stripe < x + width - 10; stripe += 12) rect(context, stripe, y + 9, 5, height - 18, accent)
  } else {
    for (let stripe = x + 10; stripe < x + width - 10; stripe += 20) { rect(context, stripe, y + 10, 9, 2, accent); rect(context, stripe + 3, y + height - 12, 9, 2, accent) }
    dither(context, x + 8, y + 8, width - 16, height - 16, lighten(base, .16))
    // A quiet center medallion and corner tufts, like a hand-woven rug.
    const cx = Math.round(x + width / 2), cy = Math.round(y + height / 2)
    for (const [dx, dy] of [[0, -4], [0, 4], [-4, 0], [4, 0], [-3, -3], [3, -3], [-3, 3], [3, 3]]) pixel(context, cx + dx, cy + dy, accent)
    for (const [dx, dy] of [[-2, 0], [2, 0], [0, -2], [0, 2]]) pixel(context, cx + dx, cy + dy, lighten(accent, .2))
    for (const [cornerX, cornerY] of [[x + 12, y + 12], [x + width - 13, y + 12], [x + 12, y + height - 13], [x + width - 13, y + height - 13]]) {
      rect(context, cornerX - 3, cornerY, 7, 1, accent); rect(context, cornerX, cornerY - 3, 1, 7, accent)
    }
  }
  context.globalAlpha = .2
  rect(context, x + 8, y + 8, width - 16, 1, '#fff2d0')
  context.globalAlpha = 1
}

function paintWindow(context, x, y, width, palette, light) {
  // A framed window with sky, hills and curtains; it reads as glass, not a picture.
  const night = light.id === 'night'
  rect(context, x - 3, y - 3, width + 6, 31, COZY.woodDark)
  rect(context, x - 2, y - 2, width + 4, 29, COZY.woodLight)
  rect(context, x, y, width, 25, night ? '#2b3b58' : '#a9d2dc')
  rect(context, x, y + 8, width, 17, night ? '#334560' : '#cfe5d4')
  if (night) {
    for (const [sx, sy] of [[4, 4], [12, 9], [20, 3], [28, 12], [36, 6]]) if (sx < width - 2) pixel(context, x + sx, y + sy, '#efe6b8')
    rect(context, x + width - 12, y + 3, 5, 5, '#f2e2a8')
    rect(context, x + 6, y + 8, 12, 1, '#2a3950'); pixel(context, x + 8, y + 6, '#3c4d68')
  } else {
    rect(context, x + width - 13, y + 3, 6, 6, '#fff2c0')
    rect(context, x + 2, y + 13, width * .38, 12, '#7f9f7e')
    rect(context, x + width * .45, y + 10, width * .5, 15, '#93b58c')
    rect(context, x + width * .2, y + 17, 4, 8, '#5f7f5b'); rect(context, x + width * .2 - 2, y + 15, 8, 4, '#6f925f')
    rect(context, x + width * .7, y + 16, 3, 9, '#5f7f5b'); rect(context, x + width * .7 - 2, y + 14, 7, 4, '#6f925f')
  }
  vline(context, x + Math.round(width / 2), y, 25, COZY.cream)
  hline(context, x, y + 12, width, COZY.cream)
  rect(context, x - 4, y + 25, width + 8, 2, COZY.woodLight); hline(context, x - 4, y + 27, width + 8, COZY.woodDark)
  // Curtains hanging from the same rod.
  const cloth = mix(palette.accent, '#f5e8cb', .55)
  rect(context, x - 8, y - 4, 6, 29, cloth)
  rect(context, x + width + 2, y - 4, 6, 29, cloth)
  for (let fold = 0; fold < 3; fold++) { vline(context, x - 7 + fold * 2, y - 1, 24, darken(cloth, .12)); vline(context, x + width + 3 + fold * 2, y - 1, 24, darken(cloth, .12)) }
  hline(context, x - 10, y - 5, width + 20, COZY.woodDark)
}

function paintPainting(context, x, y, width, height, variant) {
  rect(context, x - 2, y - 2, width + 4, height + 4, COZY.woodDark)
  rect(context, x - 1, y - 1, width + 2, height + 2, COZY.gold)
  rect(context, x, y, width, height, variant === 0 ? '#bfd4c2' : variant === 1 ? '#e2cba0' : '#b7c7d8')
  if (variant === 0) { rect(context, x + 3, y + height - 8, width - 6, 5, '#7c9b7a'); rect(context, x + 5, y + 3, 5, 5, '#f3e7b8'); rect(context, x + width - 9, y + 6, 3, 3, '#eef1df') }
  if (variant === 1) { for (let petal = 0; petal < 5; petal++) rect(context, x + 5 + petal * 6, y + 4 + petal % 2 * 3, 3, 7, '#8d6e97'); rect(context, x + 2, y + height - 6, width - 4, 4, '#8a9d72') }
  if (variant === 2) { rect(context, x + 2, y + height - 7, width - 4, 4, '#7d8fa6'); for (let wave = 0; wave < width; wave += 6) rect(context, x + wave, y + 5 + wave % 4, 5, 6, '#a9bccd') }
}

function paintWallClock(context, x, y, light) {
  rect(context, x - 1, y - 1, 14, 14, COZY.woodDark)
  rect(context, x, y, 12, 12, COZY.woodLight)
  rect(context, x + 1, y + 1, 10, 10, COZY.paper)
  for (const [tickX, tickY] of [[6, 2], [6, 10], [2, 6], [10, 6]]) pixel(context, x + tickX, y + tickY, COZY.inkSoft)
  rect(context, x + 5, y + 4, 2, 3, COZY.ink); rect(context, x + 6, y + 5, 3, 1, COZY.ink)
  pixel(context, x + 6, y + 6, light.id === 'night' ? '#f2d78c' : COZY.terracotta)
}

function paintTree(context, x, y, size, light) {
  const dark = light.id === 'night' ? '#2f4a44' : '#3f6047'
  const mid = light.id === 'night' ? '#3e5f55' : '#567d53'
  const lightTone = light.id === 'night' ? '#527a68' : '#79a066'
  rect(context, x - 2, y - size * .5, 4, size * .55, light.id === 'night' ? '#3a312f' : '#6b4a33')
  rect(context, x - 3, y - size * .5, 2, size * .55, light.id === 'night' ? '#2c2625' : '#553a29')
  const blobs = [[0, -size * .75, size * .55], [-size * .3, -size * .55, size * .4], [size * .3, -size * .55, size * .4], [-size * .12, -size * .95, size * .35], [size * .18, -size * .9, size * .34]]
  for (const [dx, dy, radius] of blobs) {
    for (let py = -radius; py <= radius; py++) {
      const half = Math.round(radius * Math.sqrt(Math.max(0, 1 - (py * py) / (radius * radius))))
      rect(context, x + dx - half, y + dy + py, half * 2 + 1, 1, dark)
    }
  }
  for (const [dx, dy, radius] of blobs) {
    for (let py = -radius + 1; py <= radius - 2; py++) {
      const half = Math.round((radius - 1) * Math.sqrt(Math.max(0, 1 - (py * py) / (radius * radius))))
      rect(context, x + dx - half, y + dy + py, half * 2, 1, mid)
    }
    rect(context, x + dx - 2, y + dy - 3, 4, 2, lightTone)
    pixel(context, x + dx, y + dy - 3, lighten(lightTone, .25))
  }
}

function paintGarden(context, slot, light) {
  const area = { x: slot.x + 16, y: slot.y + 16, width: slot.width - 32, height: slot.height - 32 }
  const nightGarden = light.id === 'night'
  rect(context, area.x, area.y, area.width, area.height, nightGarden ? '#3d5750' : '#7f9a68')
  dither(context, area.x, area.y, area.width, area.height, nightGarden ? '#47645a' : '#8caa72')
  // Flower border along the corridor, the part a visitor sees first.
  const border = area.y + area.height - 15
  rect(context, area.x, border, area.width, 15, nightGarden ? '#355146' : '#5c7f4d')
  for (let tuft = area.x + 4; tuft < area.x + area.width - 4; tuft += 9) {
    const height = 3 + tuft % 5
    vline(context, tuft, border - height + 3, height, nightGarden ? '#44685a' : '#7ea366')
    pixel(context, tuft + 1, border - height + 2, nightGarden ? '#557d6a' : '#95bb7b')
    if (tuft % 18 === 0) { pixel(context, tuft + 4, border - 4, nightGarden ? '#c8a06a' : ['#e3c26d', '#dc9c91', '#e9e3cd'][(tuft / 18) % 3 | 0]); pixel(context, tuft + 4, border - 3, '#6d8a58') }
  }
  // Winding stone path from the corridor edge into the garden.
  for (let step = 0; step < 10; step++) {
    const px = area.x + area.width / 2 + Math.round(Math.sin(step * .9) * 26)
    const py = area.y + area.height - 26 - step * 24
    rect(context, px - 14, py, 28, 13, nightGarden ? '#596a70' : '#b7ad94')
    rect(context, px - 12, py + 1, 24, 10, nightGarden ? '#677c80' : '#cabfa4')
    hline(context, px - 12, py + 1, 24, nightGarden ? '#7b9093' : '#ddd4b9')
    pixel(context, px - 14, py, nightGarden ? '#596a70' : '#9d947d')
  }
  // Pond with lilies.
  const pondX = area.x + 92, pondY = area.y + area.height - 148
  for (let py = -24; py <= 24; py++) {
    const half = Math.round(52 * Math.sqrt(Math.max(0, 1 - (py * py) / (24 * 24))))
    rect(context, pondX - half, pondY + py, half * 2, 1, nightGarden ? '#2f4a5c' : '#6d9aa0')
  }
  for (let py = -20; py <= 20; py += 4) hline(context, pondX - 40 + (py % 8 ? 6 : 0), pondY + py, 34 - Math.abs(py), nightGarden ? '#3d6174' : '#8bb7b7')
  for (const [lx, ly] of [[-24, -8], [10, 4], [30, -10]]) { rect(context, pondX + lx, pondY + ly, 9, 5, '#6f8f5d'); rect(context, pondX + lx + 2, pondY + ly - 1, 3, 3, '#c9a3bd') }
  // Trees, rounded bushes and a bench.
  paintTree(context, area.x + 28, area.y + 150, 66, light)
  paintTree(context, area.x + area.width - 36, area.y + 108, 76, light)
  paintTree(context, area.x + area.width - 78, area.y + area.height - 62, 58, light)
  for (const [bx, by, width] of [[area.x + 8, area.y + 46, 46], [area.x + area.width - 70, area.y + 196, 44], [area.x + 170, area.y + area.height - 62, 40]]) {
    const colors = nightGarden ? ['#2f4a44', '#3e5f55', '#527a68'] : ['#3f6047', '#567d53', '#79a066']
    for (let layer = 0; layer < 3; layer++) {
      const layerWidth = width - layer * 8
      rect(context, bx + layer * 4, by - layer * 4, layerWidth, 12 - layer * 2, colors[layer])
      for (let py = 0; py < 4; py++) {
        const half = Math.round((layerWidth / 2) * Math.sqrt(1 - (py * py) / 16))
        rect(context, bx + layer * 4 + layerWidth / 2 - half, by - layer * 4 - py, half * 2, 1, colors[layer])
      }
    }
    for (let flower = 0; flower < 3; flower++) pixel(context, bx + 8 + flower * 12, by + 2, nightGarden ? '#c8a06a' : ['#e3c26d', '#dc9c91', '#e8e0c8'][flower])
  }
  rect(context, area.x + 44, area.y + 92, 42, 6, COZY.woodDark); rect(context, area.x + 46, area.y + 87, 38, 5, COZY.woodLight)
  rect(context, area.x + 50, area.y + 98, 4, 9, COZY.woodDark); rect(context, area.x + 80, area.y + 98, 4, 9, COZY.woodDark)
  // Lanterns and string lights.
  const lamps = []
  for (const [lx, ly] of [[area.x + area.width - 28, area.y + 48], [area.x + 30, area.y + area.height - 40]]) {
    rect(context, lx, ly, 2, 22, COZY.inkSoft)
    rect(context, lx - 3, ly - 8, 8, 9, COZY.woodDark); rect(context, lx - 2, ly - 7, 6, 7, nightGarden ? '#ffe3a0' : '#efd79c')
    lamps.push({ x: lx + 1, y: ly - 2, radius: 46 })
  }
  if (nightGarden) for (const [fx, fy] of [[40, 150], [110, 210], [220, 120], [300, 250], [170, 60], [60, 290]]) pixel(context, area.x + fx, area.y + fy, '#f4e7a0')
  return lamps
}

function paintGardenFence(context, wall) {
  rect(context, wall.x, wall.y, wall.width, 10, '#8d8672')
  rect(context, wall.x, wall.y, wall.width, 3, '#b2aa92')
  hline(context, wall.x, wall.y + 2, wall.width, '#d4cbb0')
  for (let panel = wall.x + 6; panel < wall.x + wall.width - 6; panel += 16) {
    rect(context, panel, wall.y + 4, 10, 4, '#9a947d')
    pixel(context, panel + 2, wall.y + 3, '#d8cfb4')
  }
  rect(context, wall.x, wall.y + 10, wall.width, 2, '#6f6858')
  for (let flower = wall.x + 10; flower < wall.x + wall.width - 8; flower += 26) {
    rect(context, flower, wall.y + 6, 5, 3, ['#7f9a66', '#6d8a58'][(flower / 26) % 2 | 0])
    pixel(context, flower + 1, wall.y + 4, ['#e3c26d', '#dc9c91', '#e9e3cd'][(flower / 26) % 3 | 0])
  }
}

function paintGardenWall(context, wall) {
  rect(context, wall.x, wall.y - WALL_FACE, wall.width, WALL_FACE + 16, '#8a7f6b')
  for (let brick = wall.y - WALL_FACE + 3; brick < wall.y + 14; brick += 7) {
    hline(context, wall.x, brick, wall.width, '#6f6556')
    for (let offset = (brick % 14) ? 0 : 10; offset < wall.width; offset += 20) vline(context, wall.x + offset, brick, 6, '#7a705f')
  }
  hline(context, wall.x, wall.y - WALL_FACE, wall.width, '#b5a98d')
  hline(context, wall.x, wall.y + 12, wall.width, '#5e5547')
  // Ivy creeping over the bricks.
  for (let ivy = 0; ivy < wall.width; ivy += 17) {
    const height = 6 + (ivy * 7) % 14
    rect(context, wall.x + ivy, wall.y - WALL_FACE + 2, 3, height, '#5f7d5a')
    pixel(context, wall.x + ivy + 1, wall.y - WALL_FACE + 1 + height, '#7d9a68')
  }
}


function paintWallShelf(context, x, y, width) {
  rect(context, x, y + 6, width, 3, COZY.woodDark); hline(context, x, y + 6, width, COZY.woodLight)
  for (let item = 0; item < width / 12; item++) {
    const ix = x + 3 + item * 12
    if (item % 3 === 0) { rect(context, ix, y - 2, 6, 8, ['#7d9b8c', '#b37873', '#ddb97a'][item % 3]); }
    else if (item % 3 === 1) { rect(context, ix, y + 1, 5, 5, COZY.terracotta); rect(context, ix + 1, y - 2, 3, 3, COZY.sage) }
    else { rect(context, ix, y + 2, 7, 4, COZY.paper); hline(context, ix, y + 2, 7, COZY.creamShade) }
  }
}

function paintNeon(context, x, y, width) {
  rect(context, x - 3, y - 3, width + 6, 20, '#2a2440')
  rect(context, x, y, width, 14, '#3a3159')
  context.globalAlpha = .7
  hline(context, x + 3, y + 4, width - 6, '#e6a6e8'); hline(context, x + 3, y + 7, width - 12, '#8fc8e8'); hline(context, x + 3, y + 10, width - 20, '#e6a6e8')
  context.globalAlpha = 1
  for (const [gx, gy] of [[4, 3], [width - 6, 3], [4, 11], [width - 6, 11]]) pixel(context, x + gx, y + gy, '#f2d78c')
}

function paintSconce(context, x, y, light) {
  rect(context, x, y, 2, 10, COZY.woodDark)
  rect(context, x - 1, y + 10, 5, 2, COZY.woodDark)
  rect(context, x - 3, y + 2, 8, 8, COZY.gold)
  hline(context, x - 2, y + 3, 6, COZY.goldLight)
  rect(context, x - 2, y + 4, 6, 5, light.lamp ? '#ffe7a8' : '#efd69a')
}

function paintWallDecor(context, room, palette, theme, light) {
  const x = room.x + 16, y = room.y - WALL_FACE, width = room.width - 32
  const windows = [], lamps = []
  const hasDoorOnNorth = room.y !== 32
  const door = { left: room.x + 160, right: room.x + 224 }
  const safe = (px, width2) => !hasDoorOnNorth || px + width2 + 12 < door.left || px - 12 > door.right
  const windowSpots = [x + 24, x + Math.round(width / 2) - 18, x + width - 58].filter(spot => safe(spot, 34))
  const count = room.kind === 'arcade' || room.kind === 'bar' ? 0 : room.kind === 'gym' ? 1 : 2
  windowSpots.slice(0, count).forEach(windowX => {
    paintWindow(context, windowX, y + 3, 34, { ...palette, sky: light.sky }, light)
    windows.push({ x: windowX, y: y + 3, width: 34, height: 26 })
  })
  const sconceSpots = [x + 8, x + width - 18].filter(spot => safe(spot, 8))
  for (const sconceX of sconceSpots.slice(0, 2)) { paintSconce(context, sconceX, y + 4, light); lamps.push({ x: sconceX, y: y + 8, radius: 46 }) }
  if (room.kind === 'work') {
    paintWallShelf(context, x + 38, y + 2, 40)
    if (safe(x + width - 74, 30)) { paintWallClock(context, x + width - 74, y + 5, light); paintPainting(context, x + width - 46, y + 4, 22, 16, 0) }
    // A whiteboard for planning the day's work.
    if (safe(x + width - 150, 62)) {
      rect(context, x + width - 150, y + 2, 62, 26, COZY.woodDark); rect(context, x + width - 148, y + 4, 58, 22, '#eef2e4')
      for (const [line, offset] of [[7, 16], [11, 24], [15, 12], [19, 20]]) hline(context, x + width - 144, y + line, offset, '#93a7a0')
      hline(context, x + width - 146, y + 24, 54, '#c5b087')
    }
  } else if (room.kind === 'cafe' && safe(x + width - 86, 52)) {
    rect(context, x + width - 86, y + 1, 52, 22, COZY.woodDark)
    rect(context, x + width - 84, y + 3, 48, 18, '#3f4a3a')
    for (const [row, width2] of [[7, 26], [10, 34], [13, 20], [16, 28]]) hline(context, x + width - 78, y + row, width2, '#f3e6c4')
    if (safe(x + 28, 48)) paintWallShelf(context, x + 28, y + 2, 48)
  } else if (room.kind === 'library') {
    if (safe(x + width - 76, 30)) { paintPainting(context, x + width - 76, y + 4, 24, 18, 1); paintPainting(context, x + width - 48, y + 4, 18, 18, 2) }
    if (safe(x + 30, 58)) { paintWallShelf(context, x + 30, y + 2, 58); lamps.push({ x: x + 58, y: y + 14, radius: 40 }) }
  } else if (room.kind === 'arcade') {
    if (safe(x + width / 2 - 34, 68)) paintNeon(context, x + width / 2 - 34, y + 2, 68)
    else if (safe(x + 24, 20)) paintPainting(context, x + 24, y + 5, 20, 16, 2)
    if (safe(x + width - 48, 20)) paintPainting(context, x + width - 48, y + 5, 20, 16, 1)
  } else if (room.kind === 'restaurant') {
    if (safe(x + width - 82, 58)) paintWallShelf(context, x + width - 82, y + 2, 58)
    if (safe(x + width - 34, 18)) paintPainting(context, x + width - 34, y + 4, 18, 16, 2)
    if (safe(x + 30, 13)) paintWallClock(context, x + 30, y + 5, light)
  } else if (room.kind === 'bar') {
    if (safe(x + width / 2 - 30, 60)) paintNeon(context, x + width / 2 - 30, y + 2, 60)
    if (safe(x + 20, 58)) {
      for (let shelf = 0; shelf < 2; shelf++) {
        rect(context, x + 20, y + 6 + shelf * 11, 58, 2, COZY.woodDark)
        for (let bottle = 0; bottle < 11; bottle++) {
          const bx = x + 23 + bottle * 5, tall = 4 + bottle % 3 * 2
          rect(context, bx, y + 6 + shelf * 11 - tall, 2, tall, ['#7d9b8c', '#b37873', '#ddb97a', '#9584b0'][bottle % 4])
        }
      }
    }
  } else if (room.kind === 'gym') {
    if (safe(x + 26, 64)) {
      rect(context, x + 26, y + 2, 64, 20, '#b8d0cf'); rect(context, x + 28, y + 4, 60, 16, '#d7e6e2')
      rect(context, x + 30, y + 6, 2, 14, '#eef5ef')
    }
    if (safe(x + width - 56, 24)) paintPainting(context, x + width - 56, y + 4, 22, 16, 0)
    if (safe(x + width - 88, 13)) paintWallClock(context, x + width - 88, y + 5, light)
  }
  return { windows, lamps }
}

function paintTallWall(context, wall, room, theme) {
  const palette = wallpaperFor(room, theme)
  const top = wall.y - WALL_FACE, base = top + 3
  // Crown molding.
  rect(context, wall.x, top, wall.width, 3, COZY.woodDark)
  hline(context, wall.x, top, wall.width, COZY.woodLight)
  hline(context, wall.x, top + 2, wall.width, darken(COZY.woodDark, .2))
  // Wallpaper with vertical seams and a subtle leaf pattern.
  rect(context, wall.x, base, wall.width, WALL_FACE + 8, palette.base)
  for (let seam = wall.x + 24; seam < wall.x + wall.width; seam += 32) vline(context, seam, base, WALL_FACE + 8, palette.stripe)
  for (let motifX = wall.x + 14; motifX < wall.x + wall.width; motifX += 32) {
    for (let motifY = base + 6; motifY < base + WALL_FACE; motifY += 12) {
      pixel(context, motifX, motifY, palette.accent); pixel(context, motifX + 2, motifY, palette.accent)
      pixel(context, motifX + 1, motifY + 1, palette.accent); pixel(context, motifX + 1, motifY - 1, palette.accent)
    }
  }
  // Chair rail and wainscot.
  const rail = wall.y + 4
  rect(context, wall.x, rail, wall.width, 2, COZY.woodDark); hline(context, wall.x, rail, wall.width, COZY.woodLight)
  rect(context, wall.x, rail + 2, wall.width, 7, palette.wainscot)
  for (let panel = wall.x + 6; panel < wall.x + wall.width - 6; panel += 32) {
    rect(context, panel, rail + 3, 24, 5, darken(palette.wainscot, .1))
    hline(context, panel, rail + 3, 24, lighten(palette.wainscot, .22))
    hline(context, panel, rail + 7, 24, darken(palette.wainscot, .2))
  }
  rect(context, wall.x, wall.y + 13, wall.width, 3, COZY.woodDark)
  hline(context, wall.x, wall.y + 13, wall.width, COZY.woodLight)
  // Wall shadow on the floor.
  context.globalAlpha = .18
  rect(context, wall.x, wall.y + 16, wall.width, 3, '#3a2b2b')
  context.globalAlpha = 1
  return palette
}

function paintLowWall(context, wall, room, theme) {
  const palette = wallpaperFor(room, theme)
  rect(context, wall.x, wall.y, wall.width, 10, palette.wainscot)
  for (let panel = wall.x + 6; panel < wall.x + wall.width - 6; panel += 32) {
    rect(context, panel, wall.y + 2, 24, 5, darken(palette.wainscot, .12))
    hline(context, panel, wall.y + 2, 24, lighten(palette.wainscot, .2))
  }
  rect(context, wall.x, wall.y, wall.width, 2, COZY.woodLight); hline(context, wall.x, wall.y, wall.width, COZY.woodHighlight)
  rect(context, wall.x, wall.y + 10, wall.width, 3, COZY.woodDark)
  context.globalAlpha = .22; rect(context, wall.x, wall.y + 13, wall.width, 3, '#3a2b2b'); context.globalAlpha = 1
}

function paintSideWall(context, wall, room, theme) {
  const palette = wallpaperFor(room, theme)
  const left = wall.x === room?.x
  rect(context, wall.x, wall.y - WALL_FACE, wall.width, wall.height + WALL_FACE, palette.base)
  const inner = left ? wall.x + wall.width - 4 : wall.x
  vline(context, left ? wall.x : wall.x + wall.width - 3, wall.y - WALL_FACE, wall.height + WALL_FACE, COZY.woodDark)
  for (let seam = wall.y + 8; seam < wall.y + wall.height; seam += 32) hline(context, wall.x, seam, wall.width, palette.stripe)
  if (wall.y < 352) rect(context, wall.x, wall.y - WALL_FACE, wall.width, 3, COZY.woodDark)
  rect(context, inner, wall.y, 4, wall.height, darken(palette.wainscot, .06))
  for (let panel = wall.y + 10; panel < wall.y + wall.height - 8; panel += 32) {
    rect(context, inner, panel, 4, 22, darken(palette.wainscot, .16))
    vline(context, inner, panel, 22, lighten(palette.wainscot, .18))
  }
  rect(context, wall.x, wall.y + wall.height - 4, wall.width, 4, COZY.woodDark)
}

function paintPillar(context, wall) {
  rect(context, wall.x, wall.y - WALL_FACE, wall.width, wall.height + WALL_FACE, COZY.woodDark)
  rect(context, wall.x + 2, wall.y - WALL_FACE + 2, wall.width - 4, wall.height + WALL_FACE - 2, COZY.woodLight)
  rect(context, wall.x + 4, wall.y - WALL_FACE + 4, wall.width - 8, 8, COZY.woodHighlight)
  rect(context, wall.x + 2, wall.y + wall.height - 4, wall.width - 4, 4, COZY.woodDark)
}

function paintLiftRug(context, prop, theme) {
  paintRug(context, prop.x - 28, prop.y + 6, 56, 22, mix(theme.accent ?? COZY.sage, '#c9c0a3', .5), COZY.cream, 'border')
}

function paintLighting(context, world, sources, light, theme) {
  const { windows = [], lamps = [] } = sources
  const pool = (cx, cy, radius, color, alpha) => {
    const gradient = context.createRadialGradient(cx, cy, 0, cx, cy, radius)
    gradient.addColorStop(0, `rgba(${color},${alpha})`)
    gradient.addColorStop(.6, `rgba(${color},${alpha * .45})`)
    gradient.addColorStop(1, `rgba(${color},0)`)
    context.fillStyle = gradient
    context.fillRect(cx - radius, cy - radius, radius * 2, radius * 2)
  }
  // Soft sunbeams from the windows.
  if (!theme.night && light.light > .05) {
    for (const windowRect of windows) {
      context.save()
      context.globalAlpha = .12 * light.light
      context.fillStyle = light.ambient
      context.beginPath()
      context.moveTo(windowRect.x + 2, windowRect.y + windowRect.height)
      context.lineTo(windowRect.x + windowRect.width - 2, windowRect.y + windowRect.height)
      context.lineTo(windowRect.x + windowRect.width + 76, windowRect.y + 260)
      context.lineTo(windowRect.x - 52, windowRect.y + 260)
      context.closePath()
      context.fill()
      context.restore()
      context.save()
      context.globalCompositeOperation = 'lighter'
      pool(windowRect.x + windowRect.width / 2, windowRect.y + windowRect.height + 26, 56, '255,229,168', .10 * light.light)
      context.restore()
    }
  }
  if (light.id === 'night' || light.id === 'evening' || theme.night) {
    context.save()
    context.fillStyle = light.id === 'night' ? 'rgba(28,39,66,0.38)' : 'rgba(84,52,64,0.18)'
    context.fillRect(0, 0, world.width, world.height)
    context.restore()
    context.save()
    context.globalCompositeOperation = 'lighter'
    for (const lamp of lamps) pool(lamp.x, lamp.y + 10, lamp.radius ?? 44, '255,206,128', light.id === 'night' ? .42 : .22)
    for (const windowRect of windows) pool(windowRect.x + windowRect.width / 2, windowRect.y + windowRect.height + 20, 44, '150,190,255', .14)
    context.restore()
  }
  context.save()
  const vignette = context.createRadialGradient(world.width / 2, world.height / 2, Math.min(world.width, world.height) * .2, world.width / 2, world.height / 2, Math.max(world.width, world.height) * .7)
  vignette.addColorStop(0, 'rgba(0,0,0,0)')
  vignette.addColorStop(1, 'rgba(30,24,26,0.36)')
  context.fillStyle = vignette
  context.fillRect(0, 0, world.width, world.height)
  context.restore()
}

export function makeRoomArt(world, theme = {}, images = {}, date = new Date()) {
  const light = officeLight(date, theme)
  const { canvas: background, context } = surface(world.width, world.height)
  const windows = [], lamps = []
  // Outside the floor plan.
  rect(context, 0, 0, world.width, world.height, '#26322f')
  dither(context, 0, 0, world.width, world.height, '#2d3b36')
  // Slots without a room become a small courtyard garden, so the floor never opens
  // onto an empty void.
  for (let index = 0; index < 6; index++) {
    const slot = { x: 32 + index % 3 * OFFICE_GEOMETRY.strideX, y: index < 3 ? OFFICE_GEOMETRY.rowTop : OFFICE_GEOMETRY.rowBottom, width: OFFICE_GEOMETRY.roomWidth, height: OFFICE_GEOMETRY.roomHeight }
    if (!world.rooms.some(room => room.x === slot.x && room.y === slot.y)) lamps.push(...paintGarden(context, slot, light))
  }
  // Corridor floor: long boards and a runner.
  paintWoodFloor(context, { x: 16, y: OFFICE_GEOMETRY.corridorY, width: OFFICE_GEOMETRY.width - 32, height: OFFICE_GEOMETRY.corridorHeight }, 'oak', `${world.seed}:corridor`, { ...theme, floor: mix(theme.floor ?? '#c99e72', '#d8c9a8', .3) })
  paintRug(context, 48, OFFICE_GEOMETRY.corridorY + 18, OFFICE_GEOMETRY.width - 144, 44, mix(COZY.woodLight, '#b98d62', .45), COZY.woodHighlight, 'border')
  for (const room of world.rooms) {
    const area = { x: room.x + 16, y: room.y + 16, width: room.width - 32, height: room.height - 32 }
    if (room.kind === 'arcade') paintCarpetFloor(context, area, `${world.seed}:${room.id}:floor`, { base: '#46536b', speck: '#5a6985', seam: '#39455a' })
    else if (room.kind === 'gym') paintCarpetFloor(context, area, `${world.seed}:${room.id}:floor`, { base: '#8ba397', speck: '#9cb3a3', seam: '#71877c' })
    else if (room.kind === 'restaurant') {
      for (let y = area.y; y < area.y + area.height; y += 16) for (let x = area.x; x < area.x + area.width; x += 16) {
        rect(context, x, y, 16, 16, ((x + y) / 16) % 2 ? '#dcc9a4' : '#c9b087')
        hline(context, x, y, 16, '#e8d8b5')
      }
    } else paintWoodFloor(context, area, room.material === 'sage' ? (room.kind === 'library' ? 'walnut' : 'oak') : room.material, `${world.seed}:${room.id}:floor`, theme)
    // Rugs by room identity.
    const accent = mix(theme.accent ?? ROOM_ACCENTS[room.kind] ?? COZY.sage, ROOM_ACCENTS[room.kind] ?? COZY.sage, .5)
    if (room.kind === 'work') {
      if (world.lobby) paintRug(context, room.x + 40, room.y + 120, room.width - 80, 96, mix(COZY.terracotta, '#c08a58', .35), COZY.goldLight, 'rings')
      else paintRug(context, room.x + 40, room.y + 32, room.width - 80, room.height - 96, mix(accent, '#7f9470', .5), COZY.cream, 'border')
    }
    else if (room.kind === 'library') paintRug(context, room.x + 40, room.y + 112, room.width - 80, room.height - 148, mix('#6d8a66', accent, .4), '#d8cba0', 'border')
    else if (room.kind === 'arcade') paintRug(context, room.x + 40, room.y + 32, room.width - 80, 96, '#3f4f6e', '#d894c8', 'rings')
    else if (room.kind === 'gym') for (const offset of [40, 168]) paintRug(context, room.x + offset, room.y + 112, 112, 56, '#b7c39a', '#e6e2c2', 'border')
    else if (room.kind === 'cafe') paintRug(context, room.x + 40, room.y + 128, room.width - 80, 88, mix(accent, '#c08a58', .4), COZY.cream, 'rings')
    else if (room.kind === 'bar') paintRug(context, room.x + 40, room.y + 128, room.width - 80, 80, '#6c5a7a', '#d9b98c', 'rings')
    else paintRug(context, room.x + 40, room.y + 120, room.width - 80, 88, mix(accent, '#c49a62', .4), COZY.cream, 'border')
  }
  // Walls are painted after the floors so their baseboards read as edges.
  const pillars = []
  for (const wall of world.walls) {
    const room = world.rooms.find(entry => entry.id === wall.roomId)
    const vertical = wall.height > wall.width
    if (vertical) {
      if (wall.width <= 16 && wall.height <= 16) pillars.push(wall)
      else if (room) paintSideWall(context, wall, room, theme)
      else paintPillar(context, wall)
    } else if (!room) {
      if (wall.y === 336) paintGardenFence(context, wall)
      else paintGardenWall(context, wall)
    } else if (wall.y === 336 || (room && wall.y !== room.y && wall.y + wall.height === room.y + room.height)) paintLowWall(context, wall, room, theme)
    else if (wall.y >= 432 || (room && wall.y === room.y)) paintTallWall(context, wall, room, theme)
    else paintLowWall(context, wall, room, theme)
  }
  for (const wall of pillars) paintPillar(context, wall)
  // Wall decorations and the light sources used for baked glow.
  for (const room of world.rooms) {
    const palette = wallpaperFor(room, theme)
    const decor = paintWallDecor(context, room, palette, theme, light)
    windows.push(...decor.windows); lamps.push(...decor.lamps)
  }
  // The lift and Momo's corner in the corridor.
  const lift = world.props.find(prop => prop.id === 'lift'), dog = world.props.find(prop => prop.id === 'dog')
  if (lift) paintLiftRug(context, lift, theme)
  if (dog) paintRug(context, dog.x - 28, dog.y - 6, 56, 28, '#c7ab7c', '#e9d8b1', 'rings')
  for (const room of world.rooms) lamps.push({ x: room.x + room.width - 34, y: room.y + room.height - 18, radius: 52 })
  paintLighting(context, world, { windows, lamps }, light, theme)
  // Furniture and props, sorted by depth by Phaser.
  const objects = []
  for (const fixture of world.furniture) {
    const room = world.rooms.find(entry => entry.id === fixture.roomId)
    const object = furnitureArt(fixture, { ...room, accent: mix(theme.accent ?? ROOM_ACCENTS[room?.kind] ?? COZY.sage, ROOM_ACCENTS[room?.kind] ?? COZY.sage, .5) }, light)
    if (object) objects.push(object)
  }
  for (const prop of world.props) {
    const object = propArt(prop.id, prop)
    if (object) objects.push(object)
  }
  // Soft clutter against the walls, so rooms feel lived in without blocking a route.
  for (const room of world.rooms) {
    const bottom = room.y + room.height - 18
    const place = (kind, x, y) => {
      const decoration = decorArt(kind)
      if (decoration) objects.push({ canvas: decoration.canvas, x, y: y - decoration.foot, depth: y + 1 })
    }
    place(room.kind === 'arcade' ? 'cactus' : 'plant', room.x + 4, room.y + 132)
    place(room.kind === 'arcade' ? 'cactus' : 'plant', room.x + room.width - 32, room.y + 132)
    place('crate', room.x + 22, bottom)
    place(room.kind === 'library' ? 'books' : room.kind === 'restaurant' ? 'bottle' : 'papers', room.x + room.width - 48, bottom)
    if (room.kind === 'work') place('watercooler', room.x + 18, room.y + 160)
    if (room.kind === 'cafe' || room.kind === 'bar') place('cushion', room.x + room.width - 44, room.y + 214)
    objects.push({ canvas: lampArt(room), x: room.x + room.width - 36, y: room.y + room.height - 82, depth: room.y + room.height - 14 })
  }
  return { background, objects, light }
}

function lampArt() {
  const { canvas, context } = surface(32, 72)
  shadow(context, 16, 68, 10, 3)
  rect(context, 15, 30, 2, 36, COZY.inkSoft)
  rect(context, 11, 64, 10, 4, COZY.ink)
  rect(context, 8, 15, 16, 15, mix('#e9c98a', COZY.cream, .25))
  rect(context, 9, 16, 14, 3, COZY.goldLight)
  hline(context, 8, 29, 16, COZY.woodDark)
  rect(context, 12, 2, 8, 13, '#efdfb6'); hline(context, 13, 3, 6, '#fbf0d0')
  rect(context, 10, 27, 12, 3, COZY.gold)
  return canvas
}

export function makeDoorArt(open = false) {
  const { canvas, context: c } = surface(64, 40)
  // Frame and lintel.
  rect(c, 0, 0, 64, 40, COZY.woodDark)
  rect(c, 2, 2, 60, 36, COZY.wood)
  if (open) {
    rect(c, 6, 4, 52, 34, '#2b2a33')
    rect(c, 8, 6, 20, 30, '#3c3542')
    rect(c, 36, 6, 20, 30, '#3c3542')
    rect(c, 8, 6, 3, 30, COZY.woodLight); rect(c, 53, 6, 3, 30, COZY.woodLight)
    c.globalAlpha = .4
    rect(c, 10, 8, 44, 28, '#ffe2a2')
    c.globalAlpha = 1
  } else {
    for (const doorX of [5, 33]) {
      rect(c, doorX, 4, 26, 36, '#a9804f')
      rect(c, doorX + 2, 6, 22, 32, '#bd9662')
      rect(c, doorX + 4, 8, 18, 13, '#ddd0a6')
      rect(c, doorX + 4, 24, 18, 12, '#a9804f')
      hline(c, doorX + 4, 14, 18, '#9e7c50')
      pixel(c, doorX + (doorX < 10 ? 20 : 3), 27, '#ecd49c')
    }
  }
  hline(c, 0, 38, 64, COZY.woodHighlight)
  rect(c, 0, 38, 64, 2, COZY.woodDark)
  return canvas
}
