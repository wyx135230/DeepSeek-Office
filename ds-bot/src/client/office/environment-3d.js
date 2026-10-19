import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

// The office is a pavilion in a landscaped city garden. This module builds what
// surrounds it: the plaza, the planting belt, paths, hedges, benches, lamps and
// the lawn that runs on until the fog. Geometry is original and procedural, and
// the local time of day drives the lawn, lamps and atmosphere, so the scene
// continues past the building to the edges of the panel instead of ending on a
// visible rectangle.

const GROUND_Y = -12.4
const PLAZA_Y = -12.0
const PATH_Y = -12.1

// Depths, measured outward from the building edge.
const PLAZA = 210
const BELT = 150

const atmosphere = {
  night: { fog: '#222b3d', hemi: '#8ea3c4', hemiIntensity: 1.45, ground: '#46536a', sun: '#9cb6db', sunIntensity: .9, exposure: 1.02, lamp: 1.8, warmWindow: '#ffcf94', warmIntensity: 1.2 },
  dawn: { fog: '#b7998f', hemi: '#e3b79c', hemiIntensity: 1.95, ground: '#7d7166', sun: '#ffc9a0', sunIntensity: 1.7, exposure: 1.06, lamp: 1.05, warmWindow: '#ffd6ad', warmIntensity: .7 },
  morning: { fog: '#c4d9d3', hemi: '#fff1c6', hemiIntensity: 2.35, ground: '#93a18c', sun: '#fff2d8', sunIntensity: 2.35, exposure: 1.06, lamp: 0, warmWindow: '#000000', warmIntensity: 0 },
  midday: { fog: '#c9e0da', hemi: '#fff6dc', hemiIntensity: 2.45, ground: '#9aa894', sun: '#fff8e6', sunIntensity: 2.55, exposure: 1.05, lamp: 0, warmWindow: '#000000', warmIntensity: 0 },
  afternoon: { fog: '#ddd6c2', hemi: '#ffe2a8', hemiIntensity: 2.3, ground: '#a49d8a', sun: '#ffe4b4', sunIntensity: 2.3, exposure: 1.06, lamp: .25, warmWindow: '#000000', warmIntensity: 0 },
  evening: { fog: '#b18d81', hemi: '#f2b984', hemiIntensity: 1.85, ground: '#6f6460', sun: '#ffc08a', sunIntensity: 1.55, exposure: 1.08, lamp: 1.45, warmWindow: '#ffc98a', warmIntensity: .5 },
}

export function officeEnvironmentAtmosphere(lightId) {
  return atmosphere[lightId] ?? atmosphere.midday
}

const hash = value => {
  let result = 2166136261
  for (const letter of String(value)) result = Math.imul(result ^ letter.charCodeAt(0), 16777619) >>> 0
  return result
}

const randomOf = seed => {
  let state = seed >>> 0
  return () => {
    state = state + 0x6D2B79F5 | 0
    let t = Math.imul(state ^ state >>> 15, 1 | state)
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t
    return ((t ^ t >>> 14) >>> 0) / 4294967296
  }
}

export function createOfficeEnvironment(kit, stage, world) {
  const root = new THREE.Group()
  root.name = 'office-environment'
  stage.add(root)
  const center = new THREE.Vector3(world.width / 2, 0, world.height / 2)
  const random = randomOf(hash(`${world.width}:${world.height}:office-garden`))
  const materials = [], textures = [], merged = []

  const material = (color, options = {}) => {
    const mat = new THREE.MeshStandardMaterial({ color, roughness: .9, metalness: .02, ...options })
    materials.push(mat)
    return mat
  }
  const patterned = (base, repeat, draw) => {
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 256
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = base
    ctx.fillRect(0, 0, 256, 256)
    draw?.(ctx)
    const map = new THREE.CanvasTexture(canvas)
    map.colorSpace = THREE.SRGBColorSpace
    map.wrapS = map.wrapT = THREE.RepeatWrapping
    map.repeat.set(repeat[0], repeat[1])
    map.anisotropy = 4
    textures.push(map)
    return material('#ffffff', { map, roughness: .97 })
  }

  const mats = {
    grass: patterned('#84997c', [90, 90], ctx => {
      for (let i = 0; i < 900; i++) {
        ctx.fillStyle = i % 2 ? '#8ba183' : '#778b70'
        ctx.fillRect(Math.random() * 256, Math.random() * 256, 5 + Math.random() * 8, 2 + Math.random() * 3)
      }
      ctx.fillStyle = '#97ac8c'
      for (let i = 0; i < 260; i++) ctx.fillRect(Math.random() * 256, Math.random() * 256, 2, 2)
    }),
    plaza: patterned('#d4d7ce', [25, 25], ctx => {
      ctx.strokeStyle = '#c1c6bc'
      ctx.lineWidth = 2
      for (let i = 0; i <= 256; i += 64) {
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(256, i); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 256); ctx.stroke()
      }
      ctx.fillStyle = '#dadcd3'
      for (let i = 0; i < 400; i++) ctx.fillRect(Math.random() * 256, Math.random() * 256, 1, 1)
    }),
    path: material('#c3c8be', { roughness: .96 }),
    water: material('#5c8a96', { roughness: .18, metalness: .25 }),
    pebble: material('#b9bdb2', { roughness: 1 }),
    curb: material('#bcc1b8', { roughness: .9 }),
    concrete: material('#c2c9c4', { roughness: .92 }),
    hedge: material('#5f7f5e', { roughness: .98 }),
    bark: material('#6a5947', { roughness: 1 }),
    leafA: material('#5c7f60', { roughness: .95 }),
    leafB: material('#6d9068', { roughness: .95 }),
    leafC: material('#7f9c72', { roughness: .95 }),
    flowerA: material('#c98b9d', { roughness: .9 }),
    flowerB: material('#d9b06a', { roughness: .9 }),
    flowerC: material('#8f9fc4', { roughness: .9 }),
    metal: material('#7f8a8c', { roughness: .55, metalness: .45 }),
    bench: material('#a98b68', { roughness: .85 }),
    lamp: material('#fff2d2', { roughness: .4, emissive: '#ffd39a', emissiveIntensity: 0 }),
    warmWindow: material('#93a9b6', { roughness: .26, metalness: .22, emissive: '#000000', emissiveIntensity: 0 }),
    wall: ['#cbd2cd', '#c2cbca', '#d3d3c7', '#bcc6c8', '#d0cbc0', '#c8cfd0'].map(color => material(color, { roughness: .88 })),
    roof: material('#97a29f', { roughness: .85 }),
  }

  const box = (x, y, z, w, h, d, mat, cast = false) => {
    const mesh = kit.box(root, x, y, z, w, h, d, mat, 0)
    mesh.castShadow = cast
    return mesh
  }
  const group = (x, y, z, angle = 0) => {
    const node = kit.group(root, x, y, z)
    node.rotation.y = angle
    return node
  }
  const cylinder = (x, y, z, top, bottom, h, mat, cast = false, sides = 12) => {
    const mesh = kit.cylinder(root, x, y, z, top, bottom, h, mat, sides)
    mesh.castShadow = cast
    return mesh
  }
  const sphere = (x, y, z, rx, ry, rz, mat) => kit.sphere(root, x, y, z, rx, ry, rz, mat)

  // Ground, plaza and lawn ---------------------------------------------------
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(9000, 9000), mats.grass)
  ground.rotation.x = -Math.PI / 2
  ground.position.set(center.x, GROUND_Y, center.z)
  ground.receiveShadow = true
  root.add(ground)
  merged.push(ground.geometry)

  const plaza = new THREE.Mesh(new THREE.PlaneGeometry(world.width + PLAZA * 2, world.height + PLAZA * 2), mats.plaza)
  plaza.rotation.x = -Math.PI / 2
  plaza.position.set(center.x, PLAZA_Y, center.z)
  plaza.receiveShadow = true
  root.add(plaza)
  merged.push(plaza.geometry)

  // A stone edge keeps the paving apart from the lawn.
  box(center.x, PATH_Y + 2, -PLAZA, world.width + PLAZA * 2, 5, 10, mats.curb)
  box(center.x, PATH_Y + 2, world.height + PLAZA, world.width + PLAZA * 2, 5, 10, mats.curb)
  box(-PLAZA, PATH_Y + 2, center.z, 10, 5, world.height + PLAZA * 2, mats.curb)
  box(world.width + PLAZA, PATH_Y + 2, center.z, 10, 5, world.height + PLAZA * 2, mats.curb)

  // A walking path runs around the building just outside the paving.
  const pathRing = PLAZA + 34
  box(center.x, PATH_Y, -pathRing, world.width + pathRing * 2, .1, 58, mats.path)
  box(center.x, PATH_Y, world.height + pathRing, world.width + pathRing * 2, .1, 58, mats.path)
  box(-pathRing, PATH_Y, center.z, 58, .1, world.height + pathRing * 2, mats.path)
  box(world.width + pathRing, PATH_Y, center.z, 58, .1, world.height + pathRing * 2, mats.path)

  // Trees, shrubs, flowers, hedges, benches, lamps and a pond ----------------
  const tree = (x, z, scale = 1) => {
    cylinder(x, GROUND_Y + 32 * scale, z, 5 * scale, 7 * scale, 64 * scale, mats.bark, true)
    const leaf = [mats.leafA, mats.leafB, mats.leafC][Math.floor(random() * 3)]
    sphere(x, GROUND_Y + 100 * scale, z, 42 * scale, 30 * scale, 42 * scale, leaf)
    sphere(x + 24 * scale, GROUND_Y + 128 * scale, z - 14 * scale, 27 * scale, 22 * scale, 27 * scale, leaf)
    sphere(x - 22 * scale, GROUND_Y + 122 * scale, z + 18 * scale, 24 * scale, 19 * scale, 24 * scale, leaf)
  }
  const shrub = (x, z, scale = 1) => {
    const leaf = [mats.leafA, mats.leafB, mats.leafC][Math.floor(random() * 3)]
    sphere(x, GROUND_Y + 20 * scale, z, 24 * scale, 18 * scale, 24 * scale, leaf)
    sphere(x + 16 * scale, GROUND_Y + 16 * scale, z + 10 * scale, 17 * scale, 13 * scale, 17 * scale, leaf)
  }
  const flowers = (x, z, length, angle) => {
    const node = group(x, GROUND_Y, z, angle)
    kit.box(node, 0, 4, 0, length, 8, 46, mats.concrete)
    for (let i = 0; i < 7; i++) {
      const mat = [mats.flowerA, mats.flowerB, mats.flowerC][i % 3]
      kit.sphere(node, -length / 2 + 14 + i * (length - 28) / 6, 12, (i % 2 ? 8 : -8), 7, 5, 7, mat)
    }
  }
  const hedge = (x, z, length, angle) => {
    const node = group(x, GROUND_Y, z, angle)
    kit.box(node, 0, 18, 0, length, 36, 30, mats.hedge)
    kit.box(node, 0, 27, 0, length - 14, 22, 20, mats.leafB)
  }
  const planter = (x, z) => {
    box(x, GROUND_Y + 15, z, 72, 30, 72, mats.concrete, true)
    cylinder(x, GROUND_Y + 44, z, 26, 30, 30, mats.leafA, true, 8)
    tree(x, z, .78)
  }
  const bench = (x, z, angle) => {
    const node = group(x, GROUND_Y, z, angle)
    kit.box(node, 0, 26, 0, 88, 6, 26, mats.bench)
    kit.box(node, 0, 16, -8, 80, 16, 4, mats.bench)
    for (const dx of [-36, 36]) kit.box(node, dx, 13, 0, 4, 26, 20, mats.metal)
  }
  const lamp = (x, z, angle) => {
    cylinder(x, GROUND_Y + 88, z, 3.4, 5, 176, mats.metal, true)
    const node = group(x, GROUND_Y + 176, z, angle)
    kit.box(node, 0, 0, 26, 6, 5, 52, mats.metal)
    kit.box(node, 0, -4, 48, 14, 5, 22, mats.lamp)
  }
  const pond = (x, z) => {
    box(x, GROUND_Y + 3, z, 460, 6, 300, mats.pebble)
    const water = new THREE.Mesh(new THREE.CircleGeometry(1, 40), mats.water)
    water.rotation.x = -Math.PI / 2
    water.position.set(x, GROUND_Y + 7, z)
    water.scale.set(190, 120, 1)
    root.add(water)
    merged.push(water.geometry)
    for (let i = 0; i < 7; i++) {
      const angle = i / 7 * Math.PI * 2
      shrub(x + Math.cos(angle) * 210, z + Math.sin(angle) * 135, .8)
    }
  }

  // Planting belt.
  for (let x = -PLAZA + 120; x < world.width + PLAZA - 90; x += 250) {
    tree(x, -PLAZA - BELT * .55, .95 + random() * .3)
    tree(x, world.height + PLAZA + BELT * .55, .95 + random() * .3)
  }
  for (let z = -PLAZA + 120; z < world.height + PLAZA - 90; z += 250) {
    tree(-PLAZA - BELT * .55, z, .95 + random() * .3)
    tree(world.width + PLAZA + BELT * .55, z, .95 + random() * .3)
  }
  for (let x = -PLAZA + 220; x < world.width + PLAZA - 180; x += 420) {
    shrub(x, -PLAZA - BELT + 22, 1)
    shrub(x, world.height + PLAZA + BELT - 22, 1)
  }
  for (let z = -PLAZA + 220; z < world.height + PLAZA - 180; z += 420) {
    shrub(-PLAZA - BELT + 22, z, 1)
    shrub(world.width + PLAZA + BELT - 22, z, 1)
  }
  for (let x = -PLAZA + 240; x < world.width + PLAZA - 200; x += 520) {
    flowers(x, -PLAZA - 34, 180, 0)
    flowers(x, world.height + PLAZA + 34, 180, 0)
  }
  for (let z = -PLAZA + 240; z < world.height + PLAZA - 200; z += 520) {
    flowers(-PLAZA - 34, z, 180, Math.PI / 2)
    flowers(world.width + PLAZA + 34, z, 180, Math.PI / 2)
  }
  for (let x = -PLAZA + 180; x < world.width + PLAZA - 140; x += 620) {
    hedge(x, -PLAZA - BELT + 8, 300, 0)
    hedge(x, world.height + PLAZA + BELT - 8, 300, 0)
  }
  for (let z = -PLAZA + 180; z < world.height + PLAZA - 140; z += 620) {
    hedge(-PLAZA - BELT + 8, z, 300, Math.PI / 2)
    hedge(world.width + PLAZA + BELT - 8, z, 300, Math.PI / 2)
  }
  for (const [x, z] of [[-PLAZA + 44, -PLAZA + 44], [world.width + PLAZA - 44, -PLAZA + 44], [-PLAZA + 44, world.height + PLAZA - 44], [world.width + PLAZA - 44, world.height + PLAZA - 44]]) planter(x, z)
  for (const [x, z, angle] of [[-pathRing + 8, 320, Math.PI / 2], [world.width + pathRing - 8, 320, -Math.PI / 2], [530, -PLAZA - 36, 0], [530, world.height + PLAZA + 36, Math.PI]]) bench(x, z, angle)
  for (let x = -PLAZA + 150; x < world.width + PLAZA - 120; x += 360) { lamp(x, -PLAZA - 8, 0); lamp(x, world.height + PLAZA + 8, Math.PI) }
  for (let z = -PLAZA + 150; z < world.height + PLAZA - 120; z += 360) { lamp(-PLAZA - 8, z, -Math.PI / 2); lamp(world.width + PLAZA + 8, z, Math.PI / 2) }
  pond(center.x, -PLAZA - BELT - 120)

  // A ring of park trees closes the garden and gives the overview depth.
  for (let i = 0; i < 34; i++) {
    const angle = i / 34 * Math.PI * 2 + random() * .09
    const radius = 640 + random() * 460
    const x = center.x + Math.cos(angle) * radius
    const z = center.z + Math.sin(angle) * radius * .82
    tree(x, z, 1.05 + random() * .55)
    if (i % 3 === 0) shrub(x + 80, z + 40, 1.1)
  }

  // A ring of neighbouring buildings sits beyond the park. From the overview it
  // reads as the city around the office; at night their windows light up.
  const building = (x, z, w, d, height) => {
    const wall = mats.wall[Math.floor(random() * mats.wall.length)]
    const podium = 40
    box(x, GROUND_Y + podium / 2, z, w + 26, podium, d + 26, mats.concrete)
    box(x, GROUND_Y + podium + height / 2, z, w, height, d, wall)
    box(x, GROUND_Y + podium + height + 10, z, w + 16, 20, d + 16, mats.roof)
    const floors = Math.max(3, Math.min(12, Math.round(height / 120)))
    const floorHeight = height / floors
    for (let floor = 1; floor < floors; floor++) {
      const y = GROUND_Y + podium + floor * floorHeight
      const band = floorHeight * .42
      box(x, y, z - d / 2 - 1.5, w * .74, band, 3, mats.warmWindow)
      box(x, y, z + d / 2 + 1.5, w * .74, band, 3, mats.warmWindow)
      box(x - w / 2 - 1.5, y, z, 3, band, d * .74, mats.warmWindow)
      box(x + w / 2 + 1.5, y, z, 3, band, d * .74, mats.warmWindow)
    }
  }
  for (let i = 0; i < 16; i++) {
    const angle = i / 16 * Math.PI * 2 + random() * .12
    const radius = 1280 + random() * 320
    const x = center.x + Math.cos(angle) * radius
    const z = center.z + Math.sin(angle) * radius * .85
    building(x, z, 300 + random() * 220, 300 + random() * 220, 240 + random() * 280)
  }

  // Batch static geometry by material so the garden costs a handful of draws.
  root.updateMatrixWorld(true)
  const batches = new Map()
  const originals = []
  root.traverse(object => {
    if (!object.isMesh || object.material.transparent) return
    const key = `${object.material.uuid}:${object.castShadow ? 1 : 0}`
    if (!batches.has(key)) batches.set(key, { material: object.material, shadow: object.castShadow, shapes: [] })
    const shape = object.geometry.index ? object.geometry.toNonIndexed() : object.geometry.clone()
    shape.applyMatrix4(object.matrixWorld)
    batches.get(key).shapes.push(shape)
    originals.push(object)
  })
  for (const batch of batches.values()) {
    const geometry = mergeGeometries(batch.shapes)
    for (const shape of batch.shapes) shape.dispose()
    if (!geometry) continue
    const mesh = new THREE.Mesh(geometry, batch.material)
    mesh.castShadow = batch.shadow
    mesh.receiveShadow = true
    root.add(mesh)
    merged.push(geometry)
  }
  for (const object of originals) object.removeFromParent()

  const applyLight = (light) => {
    const palette = officeEnvironmentAtmosphere(light?.id)
    mats.lamp.emissiveIntensity = palette.lamp
    mats.warmWindow.emissiveIntensity = palette.warmIntensity
    mats.warmWindow.emissive.set(palette.warmWindow)
    mats.warmWindow.color.set(palette.warmIntensity > .2 ? '#6d6250' : '#93a9b6')
  }

  return {
    root,
    applyLight,
    stats() { return { drawCalls: merged.length } },
    dispose() {
      for (const geometry of merged) geometry.dispose()
      for (const map of textures) map.dispose()
      for (const mat of materials) mat.dispose()
      root.removeFromParent()
    },
  }
}
