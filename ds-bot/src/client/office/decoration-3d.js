import { ARCH } from './model-kit.js'

const SAGE = '#809b8c', LINEN = '#c7b99d', CLAY = '#b78868', INK = '#354b50'

export function buildOfficeDetails(kit, parent, world, wallMounts) {
  const root = kit.group(parent), wallDetails = []
  root.name = 'office-details'
  const weave = kit.texture(128, 128, ctx => {
    ctx.fillStyle = '#e4ddcb'; ctx.fillRect(0, 0, 128, 128)
    for (let i = 0; i < 128; i += 4) {
      ctx.fillStyle = '#958c7628'; ctx.fillRect(i, 0, 1, 128)
      ctx.fillStyle = '#ffffff48'; ctx.fillRect(0, i, 128, 1)
    }
    ctx.fillStyle = '#806f5935'
    for (let i = 0; i < 128; i += 16) ctx.fillRect(i, i % 32 ? 20 : 88, 2, 5)
  })
  const fabric = kit.material(LINEN, { map: weave, roughness: 1 })
  const felt = kit.material(SAGE, { map: weave, roughness: 1 })
  const warm = kit.material('#fff0ce', { emissive: '#ffd6a0', emissiveIntensity: .35 })
  const art = kit.texture(256, 320, ctx => {
    ctx.fillStyle = '#eee5ce'; ctx.fillRect(0, 0, 256, 320)
    ctx.fillStyle = '#c5a371'; ctx.beginPath(); ctx.arc(174, 84, 36, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#7e9783'; ctx.fillRect(32, 210, 192, 75)
    ctx.fillStyle = '#b1bda0'; ctx.fillRect(32, 178, 84, 32)
    ctx.strokeStyle = '#465f51'; ctx.lineWidth = 5
    ctx.beginPath(); ctx.moveTo(142, 250); ctx.lineTo(142, 112); ctx.stroke()
    for (let i = 0; i < 4; i++) {
      const x = i % 2 ? 159 : 124, y = 138 + i * 25
      ctx.fillStyle = i % 2 ? '#65846d' : '#93a080'
      ctx.beginPath(); ctx.ellipse(x, y, 21, 10, i % 2 ? -.6 : .6, 0, Math.PI * 2); ctx.fill()
    }
  })
  const print = kit.material('#ffffff', { map: art, roughness: .95 })
  const box = (node, x, y, z, w, h, d, material, radius = 0) => kit.box(node, x, y, z, w, h, d, material, radius)
  const cup = (node, x, y, z, color = ARCH.chalk) => {
    kit.cylinder(node, x, y + 1.5, z, 1.5, 1.2, 3, color)
    kit.cylinder(node, x, y + 3.04, z, 1.13, 1.13, .1, '#544c3c')
  }
  const tray = (node, x, y, z, w, d) => {
    box(node, x, y, z, w, .4, d, ARCH.woodDark, .15)
    for (const sign of [-1, 1]) box(node, x, y + .35, z + sign * (d / 2 - .2), w, .4, .4, ARCH.oak)
  }
  const jar = (node, x, y, z, color = CLAY) => {
    kit.cylinder(node, x, y + 2.5, z, 1.9, 1.9, 5, color)
    kit.cylinder(node, x, y + 5.2, z, 2, 2, .6, ARCH.woodDark)
    box(node, x, y + 2.6, z + 1.9, 2.4, 1.6, .12, ARCH.paper)
  }
  const lamp = (node, x, z) => {
    kit.cylinder(node, x, 25.8, z, 2.3, 2.6, 1, INK)
    kit.line(node, [x, 26, z], [x, 37, z], .4, ARCH.brass)
    kit.line(node, [x, 37, z], [x - 4, 39, z + 1], .4, ARCH.brass)
    kit.cylinder(node, x - 4, 38.5, z + 1, 1.3, 2.2, 2, INK)
    kit.cylinder(node, x - 4, 37.45, z + 1, 1.8, 1.8, .12, warm)
  }
  const desk = (node, f, variant) => {
    box(node, 30, 25.3, 18.5, 31, .08, 9, felt, .6)
    box(node, 28, 18, 6, 28, 1.5, 4, INK, .4)
    for (const x of [19, 23, 27]) kit.line(node, [x, 18.8, 6], [x + 3, 18.8, 6], .25, '#879088')
    kit.cylinder(node, 13, 28, 3, 1.8, 1.5, 5, variant === 1 ? CLAY : SAGE)
    kit.cylinder(node, 13, 30.55, 3, 1.4, 1.4, .1, INK)
    for (const [dx, dz, color] of [[-.6, -.3, ARCH.brass], [.6, .4, INK], [0, .5, '#b48f7b']]) kit.line(node, [13 + dx, 29, 3 + dz], [13 + dx, 34 + dx, 3 + dz], .2, color)
    box(node, 10, 26.6, 9, 4, .1, 3, '#d4bd82')
    if (variant === 2) {
      for (let i = 0; i < 8; i++) {
        const a = i / 8 * Math.PI, b = (i + 1) / 8 * Math.PI
        kit.line(node, [44 + Math.cos(a) * 3, 42 + Math.sin(a) * 3, 7], [44 + Math.cos(b) * 3, 42 + Math.sin(b) * 3, 7], .45, INK)
      }
      for (const x of [41, 47]) box(node, x, 41, 7, 1.6, 3, 2.2, INK, .5)
    } else lamp(node, f.width - 16, 4)
  }
  const sofa = (node, f, cinema) => {
    // Keep fabric on the backrest; cushions and throws must not occupy reserved seats.
    const back = f.direction === 'up' ? 15 : 1
    box(node, f.width - 17, 23, back, 14, 8, 1.2, fabric, .35)
    for (const dx of [-4, 0, 4]) box(node, f.width - 17 + dx, 23, back + (cinema ? -.65 : .65), .35, 8, .1, '#947e62')
    if (cinema) for (let i = 0; i < (f.seatCount ?? 2); i++) box(node, (i + .5) * f.width / (f.seatCount ?? 2), 25, back, 18, .35, .8, '#b3bca9')
  }
  for (const f of world.furniture) {
    const room = world.rooms.find(r => r.id === f.roomId)
    if (!['work', 'cafe', 'cinema'].includes(room?.kind)) continue
    const node = kit.group(root, f.x, 0, f.y)
    node.name = `detail-${f.id}`
    if (f.kind === 'desk') desk(node, f, (room.variant + world.desks.indexOf(f)) % 3)
    else if (f.kind === 'sofa') sofa(node, f, room.kind === 'cinema')
    else if (f.kind === 'coffee') {
      tray(node, 75.5, 30.15, 6, 22, 8)
      jar(node, 10, 30, 5)
      jar(node, 89, 30, 12, '#8e9a83')
      for (let i = 0; i < 4; i++) kit.cylinder(node, 64, 30.4 + i * .45, 12.5, 2, 2, .4, ARCH.chalk)
      box(node, 43, 29, 14, 6, .2, 3, fabric, .1)
    } else if (f.kind === 'coffee-table') {
      box(node, f.width - 14, 25.7, f.height / 2, 13, .5, 16, CLAY, .2)
      box(node, f.width - 14, 26, f.height / 2, 11, .15, 14, ARCH.paper)
      box(node, f.width - 14, 26.1, f.height / 2 - 2, 8, .1, 6, SAGE)
      for (let i = 0; i < 3; i++) box(node, f.width - 14, 26.15, f.height / 2 + 3 + i, 7, .05, .3, '#b9b09a')
    }
  }
  const frame = (node, x, y, w, h) => {
    box(node, x, y, 6, w, h, 1.5, ARCH.woodDark, .3)
    box(node, x, y, 6.85, w - 2, h - 2, .1, print)
  }
  const sconce = (node, x) => {
    box(node, x, 38, 5.5, 3, 14, 2, ARCH.brass, .4)
    box(node, x, 39, 6.9, 3.6, 9, 1.4, warm, .5)
  }
  for (const room of world.rooms) {
    if (!['work', 'cafe', 'cinema'].includes(room.kind)) continue
    if (['work', 'cafe'].includes(room.kind)) box(root, room.x + 111, 1.25, room.y + 201, 156, .05, 62, fabric, 2)
    const wall = wallMounts.get(`${room.id}-wall-left`)
    if (!wall) continue
    const node = kit.group(wall)
    node.rotation.y = Math.PI / 2
    node.name = `wall-details-${room.id}`
    wallDetails.push(node)
    if (room.kind === 'work') {
      box(node, -66, 40, 6, 54, 29, 1.6, ARCH.woodDark, .4)
      box(node, -66, 40, 6.9, 51, 26, .1, '#ac9876')
      for (let i = 0; i < 6; i++) {
        const x = -83 + i % 3 * 16, y = 34 + Math.floor(i / 3) * 12
        box(node, x, y, 7.1, 10, 8, .1, [ARCH.paper, '#b8c6b2', '#d4bd82'][i % 3])
        box(node, x, y + 3, 7.25, 1, 1, .15, ARCH.brass)
      }
      const clock = kit.cylinder(node, 48, 45, 6, 8, 8, 1.2, ARCH.woodDark, 32)
      clock.rotation.x = Math.PI / 2
      const face = kit.cylinder(node, 48, 45, 6.7, 7.2, 7.2, .15, ARCH.paper, 32)
      face.rotation.x = Math.PI / 2
      for (let i = 0; i < 12; i++) {
        const a = i * Math.PI / 6
        box(node, 48 + Math.sin(a) * 6, 45 + Math.cos(a) * 6, 6.85, .45, .65, .1, INK)
      }
      kit.line(node, [48, 45, 7], [45, 47, 7], .25, INK)
      kit.line(node, [48, 45, 7.05], [50, 49, 7.05], .2, INK)
    } else if (room.kind === 'cafe') {
      box(node, -28, 35, 6, 90, 2, 4, ARCH.oak, .3)
      for (const x of [-62, 6]) box(node, x, 31, 5, 1.3, 8, 1.5, ARCH.brass)
      for (let i = 0; i < 6; i++) cup(node, -60 + i * 10, 36, 6, i % 2 ? SAGE : ARCH.chalk)
      for (const x of [5, 12]) jar(node, x, 36, 5.5, '#9b977c')
      frame(node, -30, 55, 47, 27)
      frame(node, 56, 40, 30, 40)
      sconce(node, 93)
    } else {
      for (const x of [-72, -39, -6]) {
        box(node, x, 39, 6, 27, 34, 1.5, felt, .6)
        for (let i = 0; i < 5; i++) box(node, x - 10 + i * 5, 39, 6.85, .4, 31, .1, '#698577')
      }
      frame(node, 60, 40, 35, 43)
      sconce(node, 98)
    }
  }
  return wallDetails
}
