const surface = (width, height) => {
  const image = document.createElement('canvas')
  image.width = width; image.height = height
  image.getContext('2d').imageSmoothingEnabled = false
  return image
}
const INKS = { work: '#82937b', cafe: '#c2a276', library: '#8b9b73', arcade: '#788e9c', restaurant: '#bca06e', bar: '#91819a', gym: '#7e9e98' }

export function makeRoomArt(world, theme, images) {
  const background = surface(world.width, world.height), c = background.getContext('2d'), objects = []
  const fill = (ctx, x, y, w, h, color) => { ctx.fillStyle = color; ctx.fillRect(x, y, w, h) }
  const tile = (ctx, name, sx, sy, sw, sh, x, y, w = sw, h = sh) => ctx.drawImage(images[name], sx, sy, sw, sh, x, y, w, h)
  const custom = (ctx, cell, x, y, size = 96) => {
    const source = images['campus-props'], col = cell % 4, row = Math.floor(cell / 4)
    const sx = Math.round(col * source.width / 4), sy = Math.round(row * source.height / 2)
    tile(ctx, 'campus-props', sx, sy, Math.round((col + 1) * source.width / 4) - sx, Math.round((row + 1) * source.height / 2) - sy, x, y, size, size)
  }
  const object = (x, y, w, h, depth, draw) => {
    const canvas = surface(w, h); draw(canvas.getContext('2d'))
    objects.push({ canvas, x, y, depth })
  }
  const rug = (x, y, w, h, color) => {
    fill(c, x + 1, y + 2, w, h, '#4e473b'); fill(c, x, y, w, h, color)
    fill(c, x + 3, y + 3, w - 6, h - 6, '#d8c9a7'); fill(c, x + 6, y + 6, w - 12, h - 12, color)
    c.globalAlpha = .18
    for (let yy = y + 8; yy < y + h - 6; yy += 4) fill(c, x + 6, yy, w - 12, 1, '#f5e8cb')
    c.globalAlpha = 1
  }
  fill(c, 0, 0, world.width, world.height, '#263b37')
  for (let y = 8; y < world.height; y += 16) for (let x = 8; x < world.width; x += 16) fill(c, x + y % 3, y, 2, 1, '#3e5647')
  for (const corridor of world.corridors) {
    fill(c, corridor.x, corridor.y, corridor.width, corridor.height, '#b7b6a5')
    for (let y = corridor.y; y < corridor.y + corridor.height; y += 16) for (let x = corridor.x; x < corridor.x + corridor.width; x += 32) {
      fill(c, x + 1, y + 1, 30, 14, (x + y) % 64 ? '#cbc8b5' : '#c0bdab')
      fill(c, x + 2, y + 2, 28, 1, '#d9d6bf')
    }
    fill(c, corridor.x, corridor.y + 2, corridor.width, 2, '#d8c6a1')
    fill(c, corridor.x, corridor.y + corridor.height - 4, corridor.width, 2, '#d8c6a1')
  }
  for (const room of world.rooms) {
    const { x, y, width: w, height: h } = room, accent = INKS[room.kind] ?? INKS.work
    for (let yy = y; yy < y + h; yy += 32) for (let xx = x; xx < x + w; xx += 32) {
      if (room.kind === 'gym') {
        fill(c, xx, yy, 32, 32, (xx + yy) % 64 ? '#718d83' : '#78958a')
        fill(c, xx, yy, 32, 1, '#536e66'); fill(c, xx, yy, 1, 32, '#536e66')
      } else if (room.kind === 'restaurant') {
        fill(c, xx, yy, 32, 32, '#c9bfa7'); fill(c, xx + 1, yy + 1, 30, 30, '#e0d5b9')
        fill(c, xx + 3, yy + 3, 2, 2, '#c6b99a'); fill(c, xx + 27, yy + 27, 2, 2, '#f3e8cc')
      } else tile(c, 'wood', room.material === 'walnut' ? 0 : 64, 32 + (Math.floor(xx / 32 + yy / 32) % 2) * 32, 32, 32, xx, yy)
    }
    c.globalAlpha = .07; fill(c, x + 16, y + 16, w - 32, h - 32, theme.floor); c.globalAlpha = 1
    if (room.kind === 'work') rug(x + 48, y + 48, 288, 208, accent)
    else if (room.kind === 'library') rug(x + 48, y + 144, 288, 112, accent)
    else if (room.kind === 'arcade') rug(x + 48, y + 48, 288, 112, accent)
    else if (room.kind === 'gym') {
      for (const offset of [56, 216]) rug(x + offset, y + 144, 96, 64, '#bac09b')
    } else rug(x + 48, y + 176, 288, 96, accent)
    // Wall decorations occupy the blocked wall edge, not invisible floor obstacles.
    for (const xx of [x + 48, x + w - 96]) object(xx, y - 20, 48, 72, y + 18, ctx => tile(ctx, 'window', theme.night ? 0 : 32, 32, 32, 64, 8, 0, 32, 64))
    object(x + 136, y - 10, 64, 48, y + 18, ctx => {
      fill(ctx, 0, 7, 60, 30, '#75563f'); fill(ctx, 3, 10, 54, 24, '#c5ac7d')
      for (let i = 0; i < 3; i++) {
        fill(ctx, 7 + i * 16, 13 + i % 2 * 3, 13, 16, ['#eee2bc', '#a7b69b', '#c79373'][i])
        fill(ctx, 12 + i * 16, 12 + i % 2 * 3, 2, 2, '#9e5c49')
        fill(ctx, 10 + i * 16, 19 + i % 2 * 3, 7, 1, '#918872')
      }
    })
  }
  for (const wall of world.walls) {
    const horizontal = wall.width >= wall.height, room = world.rooms.find(r => r.id === wall.roomId)
    object(wall.x, wall.y - 32, wall.width, wall.height + 32, wall.y + wall.height, ctx => {
      fill(ctx, 0, 0, wall.width, wall.height + 32, '#66533e')
      fill(ctx, 2, 2, Math.max(1, wall.width - 4), wall.height + 23, theme.wall)
      if (horizontal) {
        fill(ctx, 0, wall.height + 22, wall.width, 8, '#9d7b53')
        fill(ctx, 0, wall.height + 22, wall.width, 2, '#c4a475')
        for (let xx = 16; xx < wall.width; xx += 32) fill(ctx, xx, 3, 1, wall.height + 19, '#c5bba3')
      } else {
        fill(ctx, 0, 0, 3, wall.height + 32, '#b99b6f'); fill(ctx, wall.width - 3, 0, 3, wall.height + 32, '#796345')
      }
      if (room?.kind === 'bar') { ctx.globalAlpha = .12; fill(ctx, 0, 0, wall.width, wall.height + 32, '#6f4f73'); ctx.globalAlpha = 1 }
    })
  }
  for (const f of world.furniture) {
    const { x, y, width: w, height: h, kind } = f
    if (kind === 'desk') object(x - 8, y - 32, 96, 72, y + h, ctx => {
      tile(ctx, 'desk', 0, 0, 96, 64, 0, 0)
      tile(ctx, 'laptop', 32, 0, 32, 32, 28, -1); tile(ctx, 'lamps', 0, 0, 32, 32, 4, -6)
      tile(ctx, 'paper', 0, 0, 32, 32, 54, 14); tile(ctx, 'coffee', 64, 0, 32, 32, 62, 5)
    })
    else if (kind === 'coffee') object(x, y - 48, w, 84, y + h, ctx => {
      for (let i = 0; i < 2; i++) tile(ctx, 'counter', 64, 128, 128, 64, i * 96, 16, 96, 64)
      tile(ctx, 'coffee', 0, 0, 32, 32, 80, 7, 40, 40); tile(ctx, 'clutter', 0, 0, 64, 32, 8, 18)
      tile(ctx, 'coffee', 64, 0, 32, 32, 127, 26); tile(ctx, 'dishes', 64, 0, 32, 32, 153, 18)
    })
    else if (kind === 'books') object(x - 4, y - 48, w + 8, h + 48, y + h, ctx => {
      fill(ctx, 5, 7, w - 2, 58, '#49372c')
      for (let row = 0; row < 2; row++) {
        for (let i = 0; i < Math.floor((w - 8) / 5); i++) {
          const xx = 8 + i * 5, yy = 8 + row * 26 + i % 3
          fill(ctx, xx, yy, 4, 21 - i % 3, ['#80916b', '#af6b52', '#8b93a4', '#cfad6e'][i % 4]); fill(ctx, xx + 1, yy + 3, 2, 1, '#e8d7ab')
        }
        tile(ctx, 'shelf', 0, 32, 64, 32, 2, 27 + row * 27, w + 4, 18)
      }
      tile(ctx, 'shelf', 0, 32, 64, 32, 2, 0, w + 4, 16)
    })
    else if (kind === 'reading') object(x, y - 16, 48, 48, y + h - 2, ctx => tile(ctx, 'armchair', 0, 96, 32, 32, 0, 0, 48, 48))
    else if (kind === 'chair') object(x - 4, y - 16, 40, 40, y + h - 2, ctx => tile(ctx, 'armchair', 96, 96, 32, 32, 0, 0, 40, 40))
    else if (kind === 'sofa') object(x, y - 48, w, 72, y + h, ctx => tile(ctx, 'sofa', 320, 0, 96, 64, 0, 0, w, 72))
    else if (kind === 'meeting' || kind === 'dining-table') object(x - 4, y - 48, w + 8, h + 48, y + h, ctx => {
      custom(ctx, kind === 'dining-table' ? 2 : 7, Math.max(0, (w - 96) / 2), 0)
      if (kind === 'dining-table') { tile(ctx, 'dishes', 0, 0, 32, 32, 2, 20); tile(ctx, 'coffee', 64, 0, 32, 32, w - 28, 18) }
    })
    else if (kind === 'bar') object(x, y - 64, w, 104, y + h, ctx => { custom(ctx, 3, 0, 0, 112); custom(ctx, 3, 112, 0, 112) })
    else if (kind === 'exercise') object(x - 16, y - 48, 96, 96, y + h, ctx => custom(ctx, f.id.endsWith('2') ? 5 : 0, 0, 0))
    else if (kind === 'weight-rack' || kind === 'kitchen-prep') object(x - 8, y - 64, 112, 96, y + h, ctx => custom(ctx, kind === 'weight-rack' ? 1 : 2, 8, 0))
    else if (kind === 'planter') object(x - 4, y - 48, 32, 64, y + h, ctx => tile(ctx, 'planter', 0, 0, 32, 64, 0, 0))
    else if (kind === 'arcade') object(x, y - 56, 48, 88, y + h, ctx => {
      const r = (a, b, width, height, color) => fill(ctx, a, b, width, height, color)
      r(2, 3, 44, 79, '#293b44'); r(4, 2, 40, 6, '#879698'); r(5, 8, 38, 15, '#b57f65'); r(8, 10, 32, 9, '#efd39b')
      r(7, 24, 34, 29, '#172d34'); r(10, 27, 28, 21, '#527c7d')
      for (const [xx, yy] of [[15, 33], [29, 30], [24, 41], [34, 39]]) { r(xx, yy, 3, 1, '#ead5a0'); r(xx + 1, yy - 1, 1, 3, '#ead5a0') }
      r(8, 52, 32, 12, '#6d8790'); r(10, 53, 28, 1, '#b3c1b3'); r(15, 54, 2, 5, '#253d42'); r(13, 53, 6, 3, '#c38f76'); r(29, 56, 4, 2, '#d7b869')
      r(8, 65, 32, 14, '#405865'); r(26, 69, 7, 5, '#22353b'); r(28, 70, 3, 1, '#d3bb83'); r(8, 80, 7, 3, '#1b2f31'); r(33, 80, 7, 3, '#1b2f31')
    })
  }
  const lift = world.props.find(p => p.id === 'lift'), dog = world.props.find(p => p.id === 'dog')
  rug(lift.x - 32, lift.y - 16, 64, 32, '#7d9587'); rug(dog.x - 16, dog.y - 11, 32, 20, '#c2ab81')
  fill(c, lift.x - 12, lift.y - 2, 24, 4, '#e7dbba'); fill(c, lift.x - 2, lift.y - 12, 4, 24, '#e7dbba')
  if (theme.night) { c.globalAlpha = .18; fill(c, 0, 0, world.width, world.height, '#304363'); c.globalAlpha = 1 }
  return { background, objects }
}

export function makeDoorArt(open = false) {
  const canvas = surface(64, 64), c = canvas.getContext('2d')
  const r = (x, y, w, h, color) => { c.fillStyle = color; c.fillRect(x, y, w, h) }
  if (!open) r(0, 4, 64, 56, '#4a3e30')
  r(2, 4, 60, 3, '#c1a373'); r(0, 4, 4, 56, '#a48155'); r(60, 4, 4, 56, '#806242')
  if (open) {
    r(4, 8, 7, 48, '#a78350'); r(5, 10, 2, 42, '#d0ac73'); r(53, 8, 7, 48, '#8d6a43'); r(56, 10, 2, 42, '#bb9863')
  } else for (const x of [5, 33]) {
    r(x, 8, 26, 48, '#aa8150'); r(x + 2, 10, 22, 43, '#bd9662'); r(x + 4, 12, 18, 19, '#ddd0a6'); r(x + 4, 34, 18, 15, '#a9804f')
    r(x + 12, 12, 2, 19, '#9e7c50'); r(x + 4, 21, 18, 2, '#9e7c50'); r(x + (x < 10 ? 20 : 3), 35, 2, 5, '#ecd49c')
  }
  r(0, 58, 64, 4, '#c7b18a'); r(4, 58, 56, 1, '#ecdec0')
  return canvas
}
