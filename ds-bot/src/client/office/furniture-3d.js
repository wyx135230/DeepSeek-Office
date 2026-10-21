import { ARCH, makeChair, makePlant } from './model-kit.js'

export function createFurnitureModels(kit) {
  const screenMap = kit.texture(512, 320, ctx => {
    ctx.fillStyle = '#192b3a'; ctx.fillRect(0, 0, 512, 320)
    ctx.fillStyle = '#2f475a'; ctx.fillRect(0, 0, 512, 26); ctx.fillRect(0, 26, 98, 294)
    for (let i = 0; i < 9; i++) { ctx.fillStyle = i === 2 ? '#9cbbc8' : '#557283'; ctx.fillRect(12, 46 + i * 22, 58 - i % 3 * 9, 5) }
    for (let i = 0; i < 19; i++) {
      ctx.fillStyle = ['#8cacbd', '#e6c895', '#79b8a4', '#b9a0c6'][i % 4]
      ctx.fillRect(120 + i % 3 * 12, 45 + i * 13, 90 + (i * 31) % 180, 4)
    }
    ctx.fillStyle = '#86bca7'; ctx.fillRect(112, 298, 80, 4)
  })
  const screen = kit.material('#ffffff', { map: screenMap, emissive: '#c9e5ed', emissiveMap: screenMap, emissiveIntensity: .3, roughness: .5 })
  const grille = kit.material('#ffffff', { roughness: .95, map: kit.texture(256, 128, ctx => {
    ctx.fillStyle = '#354b50'; ctx.fillRect(0, 0, 256, 128)
    ctx.fillStyle = '#748982'
    for (let y = 12; y < 116; y += 8) ctx.fillRect(12, y, 232, 2)
    ctx.fillStyle = '#b9a080'
    ctx.fillRect(0, 0, 256, 5); ctx.fillRect(0, 123, 256, 5)
    ctx.fillRect(0, 0, 5, 128); ctx.fillRect(251, 0, 5, 128)
  }) })
  const monitor = (root, x, z, size = 1) => {
    const group = kit.group(root, x, 25, z); group.scale.setScalar(size)
    kit.box(group, 0, .5, 0, 10, 1, 6, ARCH.steel, .3)
    kit.box(group, 0, 5, -1, 1.4, 10, 1.4, ARCH.steel)
    kit.box(group, 0, 14, -1.4, 24, 15.5, 1.8, ARCH.black, .7)
    kit.box(group, 0, 14.4, -.4, 22, 13, .12, screen)
    kit.sphere(group, 0, 7, -.3, .3, .3, .12, '#91c8b0')
  }
  const mug = (root, x, y, z, color = '#ece7dd') => {
    kit.cylinder(root, x, y + 2, z, 1.7, 1.4, 4, color)
    kit.cylinder(root, x, y + 4.1, z, 1.35, 1.35, .25, '#5e4433')
    kit.box(root, x + 2, y + 2.2, z, 1.5, 2.2, 1, color, .3)
  }
  const book = (root, x, y, z, color, tilt = 0) => {
    const group = kit.group(root, x, y, z); group.rotation.z = tilt
    kit.box(group, 0, 5, 0, 2.4, 10, 7, color, .2)
    kit.box(group, 0, 5, .1, 1.8, 9.2, 7.2, ARCH.paper)
    kit.box(group, 0, 6, 3.8, 1.4, .5, .1, '#d9ddcc')
  }
  const sofa = (root, width, color = '#93a69c', seatCount) => {
    for (const x of [6, width - 6]) for (const z of [3, 14]) kit.cylinder(root, x, 3, z, .8, .6, 6, ARCH.steel)
    kit.box(root, width / 2, 9, 8, width, 11, 20, color, 2)
    kit.box(root, width / 2, 19, 0, width, 16, 6, color, 1.8)
    for (const x of [3, width - 3]) kit.box(root, x, 15, 9, 6, 12, 23, color, 1.8)
    if (seatCount) for (let i = 0; i < seatCount; i++) kit.box(root, (i + .5) * width / seatCount, 15, 10, width / seatCount - 3, 4, 16, '#acb9af', 1.5)
    else for (let x = 13; x < width - 8; x += 19) kit.box(root, x, 15, 10, 18, 4, 16, '#acb9af', 1.5)
    kit.box(root, width - 13, 23, 5, 10, 10, 4, '#cbb798', 1.5).rotation.z = -.2
  }
  return function furniture(parent, fixture) {
    const { x, y: z, width: w, height: d, kind } = fixture
    const root = kit.group(parent, x, 0, z)
    root.userData.fixtureId = fixture.id
    if (['desk', 'coffee-table', 'conference-table', 'dining-table'].includes(kind)) {
      kit.box(root, w / 2, 24, d / 2, w, 2.5, d, ARCH.oak, .8)
      for (const lx of [3, w - 3]) {
        kit.box(root, lx, 12, d / 2, 2, 23, d - 4, ARCH.chalk, .4)
        kit.box(root, lx, 1, d / 2, 8, 1, d + 2, '#8b9498')
      }
      kit.box(root, w / 2, 20, d / 2 - 2, w - 6, 1, 2, '#909998')
      if (kind === 'desk') {
        kit.box(root, w - 10, 11, d / 2, 13, 20, d - 3, '#d4d6ce', 1)
        for (const by of [7, 14, 20]) { kit.box(root, w - 10, by, d / 2 + d / 2 - 1, 11, .35, .2, '#a5aaa4'); kit.box(root, w - 10, by + 2, d - .6, 3, .6, .6, ARCH.steel) }
        monitor(root, w / 2 - 4, d / 2 - 4)
        kit.box(root, w / 2 - 4, 25.8, d - 4, 18, .9, 5, '#c8ccca', .4)
        for (let i = 0; i < 9; i++) kit.box(root, w / 2 - 11 + i * 1.8, 26.3, d - 4, .8, .12, 3, '#8b9599')
        kit.box(root, w - 18, 26, d - 4, 3, 1.1, 4, ARCH.steel, .5)
        kit.box(root, 9, 25.7, 11, 9, 1, 12, '#597c91', .3)
        kit.box(root, 9, 26.3, 11, 7.5, .25, 10, ARCH.paper)
        kit.line(root, [6, 26.6, 7], [13, 26.6, 15], .2, ARCH.brass)
        mug(root, w - 7, 25.5, 5)
        makePlant(kit, root, 4, 3, .24).position.y = 25.5
        makeChair(kit, root, w / 2, d + 22)
        kit.line(root, [w / 2, 26, 8], [w / 2, 6, 4], .35, '#616970')
      } else {
        kit.box(root, w / 2, 25.8, d / 2, 14, .5, 9, '#879b9b', .3)
        mug(root, 8, 25.5, d / 2)
      }
    } else if (kind === 'chair') makeChair(kit, root, w / 2, d / 2, '#637f8c', { up: 0, down: Math.PI, right: -Math.PI / 2, left: Math.PI / 2 }[fixture.direction] ?? 0)
    else if (kind === 'meeting-board') {
      const board = kit.group(root, w / 2, 0, d / 2)
      if (fixture.direction === 'up') board.rotation.y = Math.PI
      kit.box(board, 0, 38, 0, w, 42, 3, ARCH.steel, 1)
      kit.box(board, 0, 38, 2, w - 4, 38, .4, '#e3eee8', .4)
      kit.text(board, 'GROUP CONVERSATION', 0, 45, 2.4, 110, '#426d79', '#e3eee8')
      for (let i = 0; i < 3; i++) kit.box(board, -20, 34 - i * 5, 2.5, 70 - i % 2 * 16, 1.3, .2, '#89a4a0')
      kit.box(board, 0, 17, 4, w - 8, 1.5, 8, ARCH.steel, .4)
    }
    else if (kind === 'sofa') {
      let seatRoot = root
      if (fixture.direction === 'up') {
        const pivot = kit.group(root, w / 2, 0, 8); pivot.rotation.y = Math.PI
        seatRoot = kit.group(pivot, -w / 2, 0, -8)
      }
      sofa(seatRoot, w, '#93a69c', fixture.seatCount)
    }
    else if (kind === 'television') {
      kit.box(root, w / 2, 10, d / 2, w, 20, d, ARCH.oak, 1)
      kit.box(root, w / 2, 20.7, d / 2, w + 2, 1.4, d + 1, ARCH.woodDark, .4)
      for (const [i, dx] of [w / 4, w * .75].entries()) kit.box(root, dx, 10, d / 2 + d / 2 + .2, w / 2 - 2, 17, .4, i === 0 ? grille : '#b9a080', .3)
    }
    else if (kind === 'reading') { sofa(root, w, '#7d95a1'); kit.box(root, w / 2, 18, 10, 11, .8, 8, '#bd946b', .2); kit.box(root, w / 2, 18.5, 10, 9, .3, 7, ARCH.paper) }
    else if (kind === 'planter') makePlant(kit, root, w / 2, d / 2, 1.15)
    else if (kind === 'books' || kind === 'weight-rack') {
      kit.box(root, w / 2, 24, d / 2 - 2, w, 48, d - 2, '#9e876e', .6)
      for (let level = 0; level < 4; level++) {
        kit.box(root, w / 2, 3 + level * 12, d / 2, w - 2, 1, d, '#c1ab88')
        for (let i = 0; i < Math.floor(w / 4) - 1; i++) {
          if ((i + level) % 7 === 0) continue
          if (kind === 'books') book(root, 4 + i * 3.6, 4 + level * 12, d - 5, ['#7c939a', '#c0ad89', '#7d8e73', '#a48273', '#d2c9b2'][(i + level) % 5], i % 9 === 0 ? .12 : 0)
          else kit.sphere(root, 5 + i * 4, 7 + level * 12, d - 5, 2, 3, 3, ARCH.steel)
        }
      }
    } else if (kind === 'coffee' || kind === 'bar' || kind === 'kitchen-prep' || kind === 'reception') {
      kit.box(root, w / 2, 14, d / 2, w, 28, d, kind === 'reception' ? ARCH.oak : '#cbd0c8', .8)
      kit.box(root, w / 2, 29, d / 2, w + 2, 2, d + 2, '#eeece3', .5)
      for (let dx = 12; dx < w; dx += 24) kit.box(root, dx, 14, d / 2 + d / 2 + .15, .4, 23, .2, '#a9b0a8')
      if (kind === 'coffee') {
        kit.box(root, 28, 38, 7, 22, 16, 12, ARCH.steel, 1)
        kit.box(root, 28, 36, 13.2, 18, 9, 1, ARCH.black)
        kit.box(root, 28, 40, 14, 8, 3, .4, '#bdd5ce')
        for (const dx of [23, 32]) { kit.line(root, [dx, 36, 14], [dx, 33, 14], .5, '#a2b5b9'); mug(root, dx, 30, 15) }
        kit.cylinder(root, 54, 39, 7, 4, 4, 12, '#8d7160'); kit.cylinder(root, 54, 47, 7, 4.4, 4.4, 4, ARCH.black)
        for (let i = 0; i < 4; i++) mug(root, 68 + i * 5, 30, 6)
      } else if (kind === 'bar') {
        for (let i = 0; i < 8; i++) { kit.cylinder(root, 8 + i * 10, 35, 7, 1.8, 1.8, 10, ['#799c91', '#b08d6b', '#9bafbf'][i % 3]); kit.cylinder(root, 8 + i * 10, 42, 7, .8, .9, 4, '#a3b3a0') }
        mug(root, w - 12, 30, 8)
      } else if (kind === 'reception') { monitor(root, w / 2, 8, .85); kit.text(root, 'RECEPTION', w / 2, 17, d + .2, 57, '#eff1ed', ARCH.woodDark); makePlant(kit, root, w - 8, 5, .35).position.y = 30 }
      else { kit.box(root, 18, 30.4, 7, 26, .5, 11, '#6e7e84', .8); kit.line(root, [18, 31, 4], [18, 40, 4], .8, '#a0afb2'); kit.line(root, [18, 40, 4], [18, 40, 10], .8, '#a0afb2'); kit.box(root, 47, 31, 7, 18, .5, 11, '#b5a07c', .3) }
    } else if (kind === 'arcade') {
      kit.box(root, w / 2, 24, d / 2, 23, 48, 18, '#526977', 1.5)
      kit.box(root, w / 2, 35, d + 1, 19, 16, 1, screen)
      kit.box(root, w / 2, 24, d + 3, 24, 3, 10, ARCH.steel, .6)
      kit.cylinder(root, w / 2 - 5, 27, d + 4, .4, .4, 5, ARCH.black)
      kit.sphere(root, w / 2 - 5, 29, d + 4, 1.3, 1.3, 1.3, '#c4a16b')
      kit.text(root, 'PLAY', w / 2, 47, d + 1, 18, '#edf1e8', '#314d60')
    } else if (kind === 'exercise') {
      kit.box(root, w / 2, 3, d / 2, w - 4, 5, d - 2, '#53656c', 2)
      kit.box(root, w / 2, 6, d / 2, w - 10, 1, d - 8, '#32454b', 1)
      for (const dx of [7, w - 7]) kit.line(root, [dx, 6, 4], [dx, 33, 4], 1, '#a9b3b3')
      kit.box(root, w / 2, 33, 4, w - 10, 3, 8, ARCH.steel, .7)
      kit.box(root, w / 2, 35, 4, 12, 1, 6, '#87aba9', .2)
    }
    return root
  }
}
