// Hand-authored procedural furniture for the office, drawn at native game pixels.
// Every fixture returns a canvas plus the world position and draw depth that match
// the collision footprint owned by shared/office/world.js.
import { COZY, surface, rect, hline, vline, pixel, shadow, mix, lighten, darken } from './pixel.js'

const art = (width, height, draw) => {
  const { canvas, context } = surface(width, height)
  draw(context, width, height)
  return canvas
}

const woodGrain = (context, x, y, width, height, base) => {
  rect(context, x, y, width, height, base)
  hline(context, x, y, width, lighten(base, .18))
  for (let row = y + 3; row < y + height; row += 4) hline(context, x + 2, row, width - 4, darken(base, .1))
}

const bookRow = (context, x, y, width, colors) => {
  let cursor = x, index = 0
  while (cursor < x + width - 2) {
    const bookWidth = 2 + index % 3, bookHeight = 7 + (index * 5) % 4
    rect(context, cursor, y - bookHeight, bookWidth, bookHeight, colors[index % colors.length])
    hline(context, cursor, y - bookHeight + 1, bookWidth - 1, lighten(colors[index % colors.length], .28))
    cursor += bookWidth + 1
    index++
  }
}

export const plant = (context, x, y, kind = 'monstera') => {
  rect(context, x - 7, y + 12, 14, 3, darken(COZY.terracotta))
  rect(context, x - 6, y + 6, 12, 8, COZY.terracotta)
  rect(context, x - 5, y + 7, 3, 5, COZY.terracottaLight)
  if (kind === 'cactus') {
    rect(context, x - 2, y - 6, 4, 12, COZY.sage)
    rect(context, x - 1, y - 7, 2, 2, COZY.sageLight)
    rect(context, x - 6, y - 2, 4, 2, COZY.sage); rect(context, x - 6, y - 4, 1, 2, COZY.sage)
    rect(context, x + 3, y, 4, 2, COZY.sage); rect(context, x + 6, y - 2, 1, 2, COZY.sage)
    return
  }
  if (kind === 'herb') {
    for (const offset of [-4, 0, 4]) { rect(context, x + offset - 1, y - 4 + Math.abs(offset), 2, 7, COZY.sage); rect(context, x + offset, y - 5 + Math.abs(offset), 1, 2, COZY.sageLight) }
    return
  }
  const leaves = [[0, -10, 7, 5], [-6, -5, 7, 5], [5, -4, 7, 5], [-3, 0, 7, 4], [2, -13, 5, 4], [-8, -8, 5, 4]]
  for (const [dx, dy, width, height] of leaves) {
    rect(context, x + dx, y + dy, width, height, COZY.sageDark)
    rect(context, x + dx + 1, y + dy, width - 2, height - 2, COZY.sage)
    pixel(context, x + dx + 2, y + dy + 1, COZY.sageLight)
  }
  vline(context, x, y - 10, 18, COZY.sageDark)
}

const steamCup = (context, x, y) => {
  rect(context, x, y, 6, 5, COZY.cream)
  rect(context, x + 1, y + 1, 4, 2, COZY.white)
  pixel(context, x + 6, y + 1, COZY.cream); pixel(context, x + 6, y + 2, COZY.cream)
  rect(context, x + 2, y - 2, 1, 2, '#d9d2c1')
}

const laptop = (context, x, y, light) => {
  rect(context, x - 1, y - 1, 18, 13, COZY.ink)
  rect(context, x, y, 16, 10, COZY.slate)
  rect(context, x + 1, y + 1, 14, 8, light.id === 'night' ? '#6fae9d' : COZY.screen)
  if (light.id === 'night') { rect(context, x + 2, y + 2, 6, 1, '#b8e2cd'); rect(context, x + 3, y + 4, 9, 1, '#8ec3b1') }
  else { rect(context, x + 2, y + 2, 8, 1, '#e8f5e2'); rect(context, x + 2, y + 4, 10, 1, '#c4e0ce') }
  rect(context, x, y + 10, 16, 3, COZY.slateLight)
  hline(context, x + 2, y + 11, 12, '#a9b8b2')
}

export function furnitureArt(fixture, room, light = { id: 'midday' }) {
  const { x, y, width, height, kind } = fixture
  const draw = (drawWidth, drawHeight, offsetX, offsetY, painter) => ({ canvas: art(drawWidth, drawHeight, painter), x: x + offsetX, y: y + offsetY, depth: y + height })
  const accent = room?.accent ?? COZY.sage
  if (kind === 'desk') return draw(74, 96, -5, -26, (context) => {
    shadow(context, 37, 90, 30, 5)
    // A small stool under the coworker; most of it stays hidden behind the body.
    rect(context, 26, 66, 20, 5, darken(COZY.sage, .24))
    rect(context, 27, 65, 18, 4, COZY.sageDark); rect(context, 28, 65, 16, 2, COZY.sage); rect(context, 30, 65, 12, 1, lighten(COZY.sage, .2))
    rect(context, 28, 70, 2, 5, COZY.inkSoft); rect(context, 43, 70, 2, 5, COZY.inkSoft)
    // Desk.
    rect(context, 6, 14, 62, 24, COZY.woodDark)
    rect(context, 7, 15, 60, 21, COZY.wood)
    woodGrain(context, 7, 16, 60, 10, COZY.woodLight)
    rect(context, 6, 28, 62, 4, darken(COZY.woodDark, .12)); hline(context, 7, 28, 60, COZY.woodHighlight)
    rect(context, 9, 32, 3, 16, COZY.woodDark); rect(context, 62, 32, 3, 16, COZY.woodDark)
    // A little drawer pedestal.
    rect(context, 10, 40, 16, 22, COZY.woodDark); rect(context, 11, 41, 14, 20, COZY.wood)
    for (const row of [0, 7, 14]) { rect(context, 13, 42 + row, 10, 4, COZY.woodLight); rect(context, 16, 43 + row, 4, 2, COZY.woodDark) }
    // Laptop, papers, lamp, mug.
    laptop(context, 24, 2, light)
    rect(context, 12, 18, 10, 6, COZY.paper); rect(context, 13, 19, 8, 1, COZY.creamShade); rect(context, 13, 21, 6, 1, COZY.creamShade)
    rect(context, 46, 20, 6, 4, COZY.cream); pixel(context, 52, 20, COZY.cream)
    pixel(context, 48, 18, accent); pixel(context, 50, 18, accent)
    rect(context, 12, 12, 2, 6, COZY.gold); rect(context, 8, 8, 10, 4, COZY.goldLight); hline(context, 9, 12, 8, COZY.terracottaLight)
    rect(context, 42, 12, 7, 4, '#8ba3b8'); hline(context, 42, 12, 7, '#b9cad8')
  })
  if (kind === 'reception') return draw(136, 88, -4, -56, (context) => {
    shadow(context, 68, 82, 56, 6)
    // Cubby wall behind the counter.
    rect(context, 16, 2, 104, 26, COZY.woodDark); rect(context, 18, 4, 100, 22, COZY.walnut)
    for (let cubby = 0; cubby < 8; cubby++) {
      const cx = 21 + cubby % 4 * 24, cy = 6 + Math.floor(cubby / 4) * 11
      rect(context, cx, cy, 21, 9, COZY.walnutDark); rect(context, cx + 1, cy + 1, 19, 7, '#433026')
      rect(context, cx + 3, cy + 2, 6, 5, ['#f6ecd4', '#d9c7a2', '#e6d7b0'][cubby % 3])
    }
    // Counter and front panels.
    rect(context, 2, 30, 132, 14, COZY.woodDark)
    rect(context, 4, 30, 128, 10, COZY.woodLight); hline(context, 4, 30, 128, COZY.woodHighlight)
    rect(context, 0, 40, 136, 42, COZY.woodDark)
    rect(context, 2, 42, 132, 34, COZY.walnut)
    for (let panel = 0; panel < 4; panel++) {
      const px = 8 + panel * 32
      rect(context, px, 46, 26, 26, COZY.walnutDark); rect(context, px + 2, 48, 22, 22, COZY.woodLight)
      if (panel === 1) { rect(context, px + 8, 57, 9, 3, COZY.gold); rect(context, px + 13, 55, 1, 9, COZY.gold) }
      if (panel === 2) { rect(context, px + 7, 53, 12, 14, COZY.paper); for (let line = 0; line < 3; line++) hline(context, px + 9, 56 + line * 4, 8, COZY.creamShade) }
    }
    // Desk-top objects: terminal, bell, name plate, flowers.
    rect(context, 20, 20, 22, 12, COZY.ink); rect(context, 21, 21, 20, 9, COZY.slate); rect(context, 23, 22, 16, 7, '#a8d3c1'); rect(context, 22, 32, 18, 3, COZY.slateLight)
    rect(context, 62, 22, 9, 8, COZY.gold); rect(context, 63, 21, 7, 2, COZY.goldLight); hline(context, 62, 29, 9, COZY.goldLight)
    rect(context, 84, 25, 26, 5, COZY.cream); rect(context, 86, 26, 22, 1, COZY.creamShade)
    rect(context, 112, 18, 8, 12, COZY.terracotta); plant(context, 116, 16, 'herb')
    steamCup(context, 46, 24)
  })
  if (kind === 'coffee') return draw(100, 72, -2, -56, (context) => {
    shadow(context, 50, 68, 44, 5)
    // Back counter and espresso machine.
    rect(context, 2, 34, 96, 12, COZY.woodDark)
    rect(context, 3, 35, 94, 10, mix(COZY.wood, COZY.walnut, .5))
    woodGrain(context, 3, 36, 94, 8, COZY.woodLight)
    rect(context, 0, 44, 100, 6, COZY.woodDark)
    rect(context, 2, 44, 96, 2, COZY.creamShade)
    // Lower cabinets.
    rect(context, 4, 50, 92, 20, COZY.woodDark)
    rect(context, 5, 51, 90, 18, mix(COZY.wood, COZY.walnut, .3))
    for (let cx = 10; cx < 88; cx += 22) { rect(context, cx, 53, 18, 14, COZY.woodDark); rect(context, cx + 1, 54, 16, 12, COZY.woodLight); rect(context, cx + 7, 59, 3, 2, COZY.gold) }
    // Espresso machine and cups.
    rect(context, 18, 4, 26, 18, COZY.ink); rect(context, 19, 5, 24, 15, COZY.slate)
    rect(context, 21, 6, 20, 5, COZY.slateLight); rect(context, 22, 7, 6, 3, COZY.goldLight)
    rect(context, 23, 13, 4, 5, COZY.cream); rect(context, 30, 12, 9, 5, '#c7d4cd'); rect(context, 30, 12, 9, 1, '#eef2e6')
    rect(context, 40, 4, 2, 6, COZY.slateLight)
    rect(context, 50, 8, 12, 14, COZY.slateLight); rect(context, 51, 9, 10, 6, '#c4d3cc'); rect(context, 53, 16, 6, 4, COZY.slate)
    // Pastry dome and cups.
    rect(context, 68, 34, 18, 6, COZY.cream); rect(context, 70, 31, 14, 4, '#dfece4'); rect(context, 72, 33, 10, 4, '#d8a76d')
    for (const cupX of [90, 96]) steamCup(context, cupX, 34)
    // Menu board.
    rect(context, 68, 2, 30, 12, COZY.paper); rect(context, 69, 3, 28, 10, COZY.creamShade)
    for (const [row, line] of [[5, 18], [8, 12], [11, 15]]) hline(context, 72, row, line, COZY.woodDark)
    // Stools in front.
    for (const stoolX of [22, 62]) { rect(context, stoolX, 70, 12, 2, COZY.sageDark); rect(context, stoolX + 2, 67, 8, 3, COZY.sage); rect(context, stoolX + 5, 72, 2, 6, COZY.inkSoft) }
  })
  if (kind === 'books') return draw(width + 8, 70, -4, -52, (context) => {
    const width2 = width + 8
    shadow(context, width2 / 2, 66, width2 / 2 - 3, 4)
    rect(context, 2, 4, width2 - 4, 62, COZY.woodDark)
    rect(context, 3, 5, width2 - 6, 58, mix(COZY.wood, COZY.walnut, .4))
    rect(context, 4, 6, width2 - 8, 54, darken(COZY.woodDark, .2))
    const colors = ['#7d9b8c', '#b37873', '#ddb97a', '#758a9b', '#c3ba9a', '#8f7aa0', '#c47f5e']
    for (let row = 0; row < 3; row++) {
      bookRow(context, 6, 20 + row * 15, width2 - 12, colors)
      rect(context, 4, 21 + row * 15, width2 - 8, 2, COZY.woodLight)
    }
    plant(context, width2 - 14, 2, 'herb')
  })
  if (kind === 'reading') return draw(44, 52, -6, -22, (context) => {
    shadow(context, 20, 48, 17, 4)
    rect(context, 6, 5, 28, 28, COZY.sageDark)
    rect(context, 7, 6, 26, 25, COZY.sage)
    rect(context, 10, 8, 20, 16, lighten(COZY.sage, .12))
    rect(context, 5, 18, 5, 16, COZY.sageDark); rect(context, 30, 18, 5, 16, COZY.sageDark)
    rect(context, 9, 24, 22, 10, lighten(COZY.sage, .2)); rect(context, 10, 25, 20, 7, lighten(COZY.sage, .3))
    rect(context, 8, 34, 3, 7, COZY.woodDark); rect(context, 29, 34, 3, 7, COZY.woodDark)
    rect(context, 12, 19, 9, 5, COZY.terracotta); hline(context, 12, 19, 9, COZY.terracottaLight)
    rect(context, 15, 16, 7, 3, COZY.creamShade)
    rect(context, 34, 30, 4, 12, COZY.woodDark); rect(context, 31, 28, 10, 2, COZY.woodLight)
    rect(context, 33, 22, 3, 6, COZY.gold); rect(context, 31, 18, 7, 4, COZY.goldLight)
  })
  if (kind === 'chair') return draw(24, 36, -4, -20, (context) => {
    shadow(context, 12, 33, 9, 3)
    rect(context, 4, 4, 16, 20, COZY.woodDark)
    rect(context, 5, 5, 14, 17, COZY.wood)
    rect(context, 7, 6, 10, 9, COZY.sageDark); rect(context, 8, 7, 8, 7, COZY.sage)
    rect(context, 2, 16, 4, 11, COZY.woodDark); rect(context, 18, 16, 4, 11, COZY.woodDark)
    rect(context, 4, 28, 15, 3, COZY.woodLight)
    rect(context, 5, 31, 3, 4, COZY.woodDark); rect(context, 15, 31, 3, 4, COZY.woodDark)
  })
  if (kind === 'sofa') return draw(width + 8, 46, -4, -24, (context) => {
    const width2 = width + 8
    shadow(context, width2 / 2, 42, width2 / 2 - 4, 4)
    rect(context, 3, 8, width2 - 6, 22, COZY.sageDark)
    rect(context, 4, 9, width2 - 8, 19, COZY.sage)
    const count = Math.max(2, Math.round(width2 / 32))
    for (let cushion = 0; cushion < count; cushion++) {
      const cushionWidth = (width2 - 16) / count
      rect(context, 8 + cushion * cushionWidth, 12, cushionWidth - 3, 12, lighten(COZY.sage, .16))
      hline(context, 9 + cushion * cushionWidth, 13, cushionWidth - 5, lighten(COZY.sage, .3))
    }
    rect(context, 1, 20, 6, 18, COZY.sageDark); rect(context, width2 - 7, 20, 6, 18, COZY.sageDark)
    rect(context, 4, 28, width2 - 8, 9, lighten(COZY.sage, .24))
    rect(context, 7, 37, 4, 6, COZY.woodDark); rect(context, width2 - 11, 37, 4, 6, COZY.woodDark)
    rect(context, 12, 15, 9, 7, COZY.terracotta); rect(context, 13, 16, 7, 5, COZY.terracottaLight)
  })
  if (kind === 'meeting' || kind === 'dining-table') return draw(width + 12, height + 44, -6, -24, (context) => {
    const drawWidth = width + 12, drawHeight = height + 44
    shadow(context, drawWidth / 2, drawHeight - 4, drawWidth / 2 - 6, 4)
    for (const chairX of [drawWidth * .3, drawWidth * .7]) { rect(context, chairX - 7, 2, 14, 12, COZY.woodDark); rect(context, chairX - 5, 4, 10, 8, COZY.woodLight) }
    rect(context, 3, 14, drawWidth - 6, 20, COZY.woodDark)
    rect(context, 4, 14, drawWidth - 8, 17, COZY.woodLight)
    woodGrain(context, 4, 15, drawWidth - 8, 14, COZY.woodHighlight)
    rect(context, 3, 32, drawWidth - 6, 4, COZY.woodDark)
    rect(context, 8, 36, 4, 14, COZY.woodDark); rect(context, drawWidth - 12, 36, 4, 14, COZY.woodDark)
    for (const plateX of [drawWidth * .3, drawWidth * .7]) {
      rect(context, plateX - 6, 22, 12, 6, COZY.paper); rect(context, plateX - 5, 23, 10, 4, COZY.cream)
      rect(context, plateX - 4, 24, 4, 2, '#8ba86c'); pixel(context, plateX + 2, 25, COZY.terracottaLight)
      rect(context, plateX - 9, 20, 1, 7, COZY.slateLight); rect(context, plateX + 8, 20, 1, 7, COZY.slateLight)
    }
    rect(context, drawWidth / 2 - 2, 18, 4, 4, COZY.terracotta); plant(context, drawWidth / 2, 16, 'herb')
  })
  if (kind === 'bar') return draw(width + 8, 72, -4, -56, (context) => {
    const width2 = width + 8
    shadow(context, width2 / 2, 68, width2 / 2 - 5, 5)
    rect(context, 3, 26, width2 - 6, 32, COZY.walnutDark)
    rect(context, 4, 27, width2 - 8, 29, COZY.walnut)
    for (let cx = 10; cx < width2 - 14; cx += 20) { rect(context, cx, 32, 15, 18, COZY.walnutDark); rect(context, cx + 1, 33, 13, 16, COZY.walnutLight) }
    rect(context, 2, 22, width2 - 4, 6, COZY.creamShade); rect(context, 3, 22, width2 - 6, 2, COZY.paper)
    // Bottle shelf.
    rect(context, 6, 3, width2 - 12, 5, COZY.woodDark); hline(context, 7, 3, width2 - 14, COZY.woodLight)
    for (let bottle = 0; bottle < Math.floor((width2 - 20) / 8); bottle++) {
      const bx = 10 + bottle * 8, tall = 6 + bottle % 3 * 3
      rect(context, bx, 4 - tall, 3, tall, ['#7d9b8c', '#b37873', '#ddb97a', '#758a9b', '#c3ba9a'][bottle % 5])
      rect(context, bx, 4 - tall - 2, 2, 2, COZY.creamShade)
    }
    // Glasses and shaker.
    for (const glassX of [width2 * .22, width2 * .4, width2 * .6, width2 * .8]) { rect(context, glassX, 14, 4, 8, '#c8ddd2'); rect(context, glassX + 1, 16, 2, 4, '#e0a878') }
    rect(context, width2 * .52, 11, 5, 11, COZY.slateLight); rect(context, width2 * .52 + 1, 9, 3, 3, COZY.gold)
    for (const stoolX of [width2 * .28, width2 * .68]) { rect(context, stoolX, 64, 10, 2, COZY.terracotta); rect(context, stoolX + 3, 61, 4, 3, COZY.terracottaDark); rect(context, stoolX + 4, 66, 2, 5, COZY.inkSoft) }
  })
  if (kind === 'arcade') return draw(40, 66, -4, -50, (context) => {
    shadow(context, 20, 62, 15, 3)
    rect(context, 4, 8, 32, 54, COZY.ink)
    rect(context, 5, 9, 30, 50, '#2c3a4c')
    rect(context, 5, 9, 30, 6, '#6f4f8c'); rect(context, 6, 10, 28, 3, '#a077c2')
    rect(context, 8, 17, 24, 18, COZY.ink); rect(context, 9, 18, 22, 16, '#172733')
    for (const [sx, sy] of [[13, 22], [22, 20], [18, 27], [26, 26]]) { rect(context, sx, sy, 2, 2, '#f2d78c'); pixel(context, sx, sy, '#fff6dc') }
    rect(context, 11, 30, 18, 2, '#527c7d')
    rect(context, 7, 38, 26, 9, '#405865'); rect(context, 8, 39, 24, 2, '#b3c1b3')
    rect(context, 12, 40, 3, 4, '#d25c55'); rect(context, 20, 41, 5, 3, '#c38f76'); rect(context, 22, 42, 2, 1, COZY.goldLight)
    rect(context, 5, 47, 30, 13, '#22353b'); rect(context, 6, 48, 28, 9, '#2f4750')
    rect(context, 6, 60, 6, 3, COZY.ink); rect(context, 28, 60, 6, 3, COZY.ink)
    rect(context, 14, 45, 12, 2, '#879698')
  })
  if (kind === 'exercise') return draw(56, 58, -4, -26, (context) => {
    const bike = fixture.id.endsWith('2')
    shadow(context, 28, 54, 20, 4)
    if (bike) {
      rect(context, 16, 20, 24, 4, COZY.slateLight); rect(context, 18, 17, 20, 4, COZY.slate)
      rect(context, 24, 6, 8, 12, COZY.slate); rect(context, 26, 7, 4, 6, '#a8d3c1')
      rect(context, 12, 10, 6, 3, COZY.slateLight); rect(context, 38, 10, 6, 3, COZY.slateLight)
      rect(context, 18, 24, 3, 20, COZY.slateLight); rect(context, 38, 24, 3, 20, COZY.slateLight)
      rect(context, 9, 34, 9, 2, COZY.slate); rect(context, 21, 40, 11, 2, COZY.slate); rect(context, 39, 34, 9, 2, COZY.slate)
      for (const [cx, cy] of [[13, 44], [35, 44], [43, 38]]) { rect(context, cx, cy, 10, 8, COZY.slateDark); rect(context, cx + 1, cy + 1, 8, 6, COZY.slate); rect(context, cx + 2, cy + 2, 5, 3, COZY.slateLight) }
    } else {
      rect(context, 10, 10, 36, 10, COZY.slate); rect(context, 12, 12, 32, 6, '#2f4149')
      rect(context, 8, 17, 40, 3, COZY.slateLight)
      rect(context, 13, 20, 6, 32, COZY.slateDark); rect(context, 37, 20, 6, 32, COZY.slateDark)
      rect(context, 20, 23, 16, 26, '#425b63'); for (let row = 0; row < 3; row++) rect(context, 22, 28 + row * 5, 12, 2, '#5d7d7f')
      rect(context, 7, 50, 42, 4, COZY.slateLight); rect(context, 7, 50, 5, 4, COZY.ink); rect(context, 44, 50, 5, 4, COZY.ink)
      rect(context, 34, 4, 10, 3, COZY.slateLight); rect(context, 37, 1, 4, 3, COZY.screen)
    }
  })
  if (kind === 'weight-rack') return draw(width + 8, 50, -4, -38, (context) => {
    const width2 = width + 8
    shadow(context, width2 / 2, 46, width2 / 2 - 4, 4)
    rect(context, 4, 4, width2 - 8, 5, COZY.woodDark); hline(context, 5, 4, width2 - 10, COZY.woodLight)
    rect(context, 4, 30, width2 - 8, 5, COZY.woodDark); hline(context, 5, 30, width2 - 10, COZY.woodLight)
    rect(context, 6, 9, 3, 21, COZY.woodDark); rect(context, width2 - 9, 9, 3, 21, COZY.woodDark)
    for (let dumbbell = 0; dumbbell < Math.floor((width2 - 20) / 12); dumbbell++) {
      const bx = 10 + dumbbell * 12, color = ['#4d5b72', '#8a5f3f', '#7d9b8c'][dumbbell % 3]
      rect(context, bx, 9, 2, 6, color); rect(context, bx + 6, 9, 2, 6, color); rect(context, bx + 2, 11, 4, 2, COZY.slateLight)
      rect(context, bx, 34, 2, 6, color); rect(context, bx + 6, 34, 2, 6, color); rect(context, bx + 2, 36, 4, 2, COZY.slateLight)
    }
    rect(context, width2 - 14, 12, 4, 22, COZY.terracotta); rect(context, width2 - 14, 12, 2, 22, COZY.terracottaLight)
  })
  if (kind === 'kitchen-prep') return draw(width + 8, 66, -4, -54, (context) => {
    const width2 = width + 8
    shadow(context, width2 / 2, 62, width2 / 2 - 4, 4)
    rect(context, 3, 22, width2 - 6, 40, COZY.woodDark)
    rect(context, 4, 23, width2 - 8, 37, mix(COZY.wood, COZY.creamShade, .2))
    rect(context, 1, 17, width2 - 2, 8, COZY.paper); rect(context, 2, 17, width2 - 4, 2, COZY.white)
    rect(context, 8, 34, width2 - 16, 18, COZY.woodDark); rect(context, 9, 35, width2 - 18, 15, COZY.woodLight)
    rect(context, 12, 18, 18, 4, COZY.slateLight); rect(context, 13, 19, 14, 2, '#9db8b1')
    rect(context, 34, 18, 3, 5, COZY.gold)
    rect(context, 44, 17, 18, 6, COZY.woodHighlight); rect(context, 45, 18, 16, 4, '#d8b083')
    rect(context, 48, 16, 2, 2, '#8ba86c'); rect(context, 53, 16, 3, 2, COZY.terracottaLight)
    plant(context, 16, 8, 'herb'); plant(context, 56, 10, 'herb')
  })
  if (kind === 'planter') return draw(28, 38, -6, -24, (context) => { shadow(context, 14, 34, 10, 3); plant(context, 14, 24, 'monstera') })
  return null
}

export function propArt(id, position) {
  if (id === 'lift') return {
    canvas: art(56, 74, (context) => {
      shadow(context, 28, 70, 22, 4)
      rect(context, 4, 4, 48, 64, COZY.woodDark)
      rect(context, 5, 5, 46, 60, COZY.walnut)
      rect(context, 8, 8, 40, 54, '#3f3548')
      rect(context, 11, 11, 34, 48, COZY.slate)
      rect(context, 12, 12, 15, 46, COZY.slateLight); rect(context, 29, 12, 15, 46, COZY.slateLight)
      hline(context, 13, 13, 13, '#93a7ab'); hline(context, 30, 13, 13, '#93a7ab')
      for (const doorX of [15, 32]) rect(context, doorX, 36, 3, 2, COZY.gold)
      rect(context, 20, 0, 16, 8, COZY.ink); rect(context, 22, 2, 12, 5, '#d8b06a'); rect(context, 26, 3, 4, 3, '#f2e0a4')
      plant(context, 48, 38, 'cactus')
    }), x: position.x - 28, y: position.y - 56, depth: position.y + 8,
  }
  return null
}

// Freestanding clutter that lives inside wall footprints, so it never blocks a route.
export function decorArt(kind) {
  if (kind === 'plant') return { canvas: art(28, 46, (context) => { shadow(context, 14, 42, 10, 3); plant(context, 14, 32, 'monstera') }), width: 28, height: 46, foot: 42 }
  if (kind === 'cactus') return { canvas: art(26, 42, (context) => { shadow(context, 13, 38, 9, 3); plant(context, 13, 30, 'cactus') }), width: 26, height: 42, foot: 38 }
  if (kind === 'crate') return { canvas: art(24, 22, (context) => {
    shadow(context, 12, 19, 9, 2)
    rect(context, 2, 4, 20, 15, COZY.woodDark); rect(context, 3, 5, 18, 13, COZY.wood)
    hline(context, 3, 8, 18, COZY.woodDark); hline(context, 3, 14, 18, COZY.woodDark)
    vline(context, 3, 5, 13, COZY.woodDark); vline(context, 20, 5, 13, COZY.woodDark)
    rect(context, 5, 2, 14, 3, COZY.woodLight); hline(context, 5, 2, 14, COZY.woodHighlight)
    rect(context, 15, 6, 2, 6, COZY.terracotta)
  }), width: 24, height: 22, foot: 19 }
  if (kind === 'papers') return { canvas: art(22, 16, (context) => {
    shadow(context, 11, 13, 8, 2)
    rect(context, 2, 5, 18, 9, COZY.paper); rect(context, 3, 4, 16, 8, COZY.white)
    for (const [row, width2] of [[6, 11], [8, 13], [10, 7]]) hline(context, 5, row, width2, COZY.creamShade)
  }), width: 22, height: 16, foot: 13 }
  if (kind === 'books') return { canvas: art(22, 20, (context) => {
    shadow(context, 11, 17, 8, 2)
    const colors = ['#7d9b8c', '#b37873', '#ddb97a', '#758a9b']
    for (let book = 0; book < 4; book++) { rect(context, 3 + book, 13 - book * 3, 16 - book * 2, 3, colors[book]); hline(context, 4 + book, 13 - book * 3, 14 - book * 2, lighten(colors[book], .25)) }
  }), width: 22, height: 20, foot: 17 }
  if (kind === 'watercooler') return { canvas: art(24, 46, (context) => {
    shadow(context, 12, 42, 9, 3)
    rect(context, 4, 26, 16, 16, COZY.creamShade); rect(context, 5, 27, 14, 14, COZY.paper)
    rect(context, 7, 6, 10, 20, '#bcd8de'); rect(context, 8, 7, 8, 18, '#d7ecf0')
    rect(context, 8, 24, 8, 4, COZY.slateLight)
    rect(context, 6, 34, 2, 4, COZY.slate); rect(context, 16, 34, 2, 4, COZY.slate)
  }), width: 24, height: 46, foot: 42 }
  if (kind === 'bottle') return { canvas: art(10, 18, (context) => { rect(context, 3, 4, 4, 12, '#bcd8de'); rect(context, 3, 2, 4, 2, COZY.terracotta); rect(context, 4, 5, 2, 8, '#e7f3f4') }), width: 10, height: 18, foot: 16 }
  if (kind === 'cushion') return { canvas: art(22, 14, (context) => { shadow(context, 11, 12, 8, 2); rect(context, 2, 3, 18, 9, COZY.terracotta); hline(context, 2, 3, 18, COZY.terracottaLight); rect(context, 5, 5, 12, 5, mix(COZY.terracotta, COZY.cream, .3)) }), width: 22, height: 14, foot: 12 }
  return null
}
