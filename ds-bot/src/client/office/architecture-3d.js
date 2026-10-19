import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { ARCH, makePlant } from './model-kit.js'
import { createFurnitureModels } from './furniture-3d.js'
import { officeRoomSlot } from '../../shared/office/world.js'

export function buildArchitecture(kit, scene, world, theme) {
  const root = kit.group(scene), walls = [], doors = [], roots = [root], furniture = createFurnitureModels(kit)
  const floorMaps = new Map()
  const floorMaterial = kind => {
    const carpet = ['work', 'library', 'arcade'].includes(kind)
    const key = carpet ? 'carpet' : kind === 'corridor' ? 'stone' : 'oak'
    if (!floorMaps.has(key)) {
      const map = kit.texture(256, 256, ctx => {
        ctx.fillStyle = carpet ? '#9caeab' : key === 'oak' ? '#c1a88b' : '#d5d8d2'; ctx.fillRect(0, 0, 256, 256)
        let seed = 147
        const random = () => { seed = Math.imul(seed, 1664525) + 1013904223 | 0; return (seed >>> 0) / 4294967296 }
        for (let i = 0; i < (carpet ? 5000 : 400); i++) {
          ctx.fillStyle = random() > .5 ? '#ffffff18' : '#28343c15'
          ctx.fillRect(random() * 256, random() * 256, carpet ? 1 : 1 + random() * 35, 1)
        }
        ctx.strokeStyle = carpet ? '#667d791c' : '#8d806548'; ctx.lineWidth = .7
        const step = key === 'oak' ? 32 : 64
        for (let i = 0; i <= 256; i += step) { ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(256, i); ctx.stroke() }
        for (let row = 0; row < 256 / step; row++) for (let x = row % 2 * 64; x < 256; x += 128) { ctx.beginPath(); ctx.moveTo(x, row * step); ctx.lineTo(x, (row + 1) * step); ctx.stroke() }
      })
      map.wrapS = map.wrapT = THREE.RepeatWrapping; map.repeat.set(2, 2)
      const tint = key === 'stone' ? '#ffffff' : new THREE.Color(theme.floor ?? '#ffffff').lerp(new THREE.Color('#ffffff'), .68).getStyle()
      floorMaps.set(key, kit.material(tint, { map, roughness: .96 }))
    }
    return floorMaps.get(key)
  }
  const slab = (area, kind) => {
    kit.box(root, area.x + area.width / 2, -6, area.y + area.height / 2, area.width, 12, area.height, '#bcc5c0', 1.5)
    kit.box(root, area.x + area.width / 2, .1, area.y + area.height / 2, area.width - 1, .6, area.height - 1, floorMaterial(kind))
  }
  for (const corridor of world.corridors) {
    slab(corridor, 'corridor')
    for (let x = corridor.x + 12; x < corridor.x + corridor.width; x += 48) {
      kit.box(root, x, .5, corridor.y + corridor.height / 2, 16, .1, .6, '#b3bcb9')
      kit.box(root, x + 6, .6, corridor.y + corridor.height / 2, 4, .1, 2, '#9aaead')
    }
    for (let x = corridor.x + 70; x < corridor.x + corridor.width - 60; x += 240) {
      const ceiling = kit.group(root, x, 0, corridor.y + corridor.height / 2)
      kit.line(ceiling, [-30, 1, -34], [-30, 68, -34], .55, '#9aa9a9')
      kit.line(ceiling, [30, 1, -34], [30, 68, -34], .55, '#9aa9a9')
      kit.box(ceiling, 0, 68, -34, 63, 2, 2, '#e6e8df', .6)
      kit.box(ceiling, 0, 66.8, -34, 59, .3, 1.5, kit.material('#fff5db', { emissive: '#fff2ce', emissiveIntensity: .7 }))
    }
  }
  const title = (value, x, z, width = 100) => {
    const label = kit.text(root, value, x, 1, z, width, '#627675', '#dce2da')
    label.rotation.x = -Math.PI / 2
  }
  for (const room of world.rooms) {
    slab(room, room.kind)
    const accent = theme.accent ?? (room.kind === 'work' ? '#6f919c' : ['library', 'cafe'].includes(room.kind) ? '#8f9b79' : '#a7947b')
    const top = room.y < 300
    title(room.name, room.x + room.width / 2, top ? room.y + room.height - 48 : room.y + 48)
    const wallZ = top ? room.y + 8 : room.y + room.height - 8
    if (top && room.kind !== 'cinema') {
      for (let i = 0; i < 3; i++) {
        kit.box(root, room.x + 60 + i * 82, 43, wallZ + 7, 70, 31, 1, '#c6dbdf', .4)
        for (const offset of [-35, 0, 35]) kit.box(root, room.x + 60 + i * 82 + offset, 43, wallZ + 8, .7, 32, 1, '#82969c')
        kit.box(root, room.x + 60 + i * 82, 59, wallZ + 8, 71, 1, 1, '#82969c')
        kit.box(root, room.x + 60 + i * 82, 27, wallZ + 8, 73, 2, 3, ARCH.chalk)
      }
    }
    kit.box(root, room.x + 25, 32, wallZ + (top ? 8 : -8), 2, 42, 1.6, accent)
    const picture = kit.group(root, room.x + room.width - 55, 0, wallZ + (top ? 8 : -8))
    kit.box(picture, 0, 43, 0, 23, 23, 1.2, ARCH.woodDark, .3)
    kit.box(picture, 0, 43, 1, 21, 21, .2, '#e9e6d9')
    kit.sphere(picture, -4, 46, 1.3, 5, 5, .1, '#bda47c')
    kit.box(picture, 3, 40, 1.4, 10, 6, .1, accent)
    if (room.kind === 'work') {
      const board = kit.group(root, room.x + 16, 0, room.y + 124)
      kit.box(board, 0, 38, 0, 1.6, 31, 52, '#dae0d8', .4)
      for (let i = 0; i < 8; i++) kit.box(board, 1, 30 + i % 3 * 7, -19 + Math.floor(i / 3) * 15, .2, 5, 10, ['#c9bc91', '#8da99c', '#9cb3bd'][i % 3])
    }
    for (const x of [room.x + 22, room.x + room.width - 22]) makePlant(kit, root, x, top ? room.y + 24 : room.y + room.height - 28, .85)
    const rugZ = room.y + 201
    if (['work', 'cafe', 'library'].includes(room.kind)) kit.box(root, room.x + 111, .9, rugZ, 158, .6, 64, kit.material('#c6b99b', { roughness: 1 }), 3)
  }
  for (const wall of world.walls) {
    if (wall.id.startsWith('corridor-wall-lift-')) continue
    const room = world.rooms.find(r => r.id === wall.roomId)
    const height = room ? 63 : 9
    const horizontal = wall.width > wall.height
    const wallRoot = kit.group(scene, wall.x + wall.width / 2, 0, wall.y + wall.height / 2)
    roots.push(wallRoot)
    kit.box(wallRoot, 0, 5, 0, wall.width, 10, wall.height, theme.wall ?? ARCH.chalk, .5)
    if (room) {
      const glass = kit.material('#b9d1d4', { transparent: true, opacity: .17, roughness: .18, metalness: .1, depthWrite: false })
      const w = horizontal ? wall.width - 2 : 1, d = horizontal ? 1 : wall.height - 2
      kit.box(wallRoot, 0, 37, 0, w, 52, d, glass)
      kit.box(wallRoot, 0, height, 0, wall.width, 1.5, Math.min(2, wall.height), '#a4b0ac')
      if (!horizontal) kit.box(wallRoot, 0, height, 0, 2, 1.5, wall.height, '#a4b0ac')
      for (const sign of [-1, 1]) kit.box(wallRoot, horizontal ? sign * (wall.width / 2 - 1) : 0, 36, horizontal ? 0 : sign * (wall.height / 2 - 1), 1.3, 53, 1.3, '#a4b0ac')
      walls.push({ root: wallRoot, nx: horizontal ? 0 : Math.sign(wallRoot.position.x - room.x - room.width / 2), nz: horizontal ? Math.sign(wallRoot.position.z - room.y - room.height / 2) : 0 })
    }
  }
  for (const fixture of world.furniture) furniture(root, fixture)
  for (const door of world.doors) {
    const group = kit.group(scene, door.x, 0, door.y)
    roots.push(group)
    const glass = kit.material('#a5c0c6', { transparent: true, opacity: .24, roughness: .2, depthWrite: false })
    for (const x of [0, door.width]) kit.box(group, x, 26, door.height / 2, 1.5, 52, 2, '#8e9e9e')
    kit.box(group, door.width / 2, 52, door.height / 2, door.width + 3, 2, 3, '#8e9e9e')
    const leaf = kit.group(group)
    kit.box(leaf, door.width / 2, 24, door.height / 2, door.width - 3, 47, .8, glass)
    kit.box(leaf, door.width - 8, 25, door.height / 2 + 1, 1, 7, 1, ARCH.steel)
    kit.box(group, door.width / 2, .8, door.height / 2, door.width, .8, 16, '#e5dcc8')
    doors.push({ id: door.id, root: leaf })
  }
  for (let slot = 0; slot < 8; slot++) {
    const { x, y: z } = officeRoomSlot(slot)
    if (world.rooms.some(r => r.x === x && r.y === z)) continue
    kit.box(root, x + 160, -4, z + 128, 320, 8, 256, '#c4ccbe', 2)
    kit.box(root, x + 160, .2, z + 128, 288, .8, 224, '#93a58d', 3)
    for (let i = 0; i < 8; i++) kit.box(root, x + 152 + i % 2 * 22, 1, z + 22 + i * 28, 19, 2, 21, '#d7d6c8', 2)
    for (let i = 0; i < 7; i++) makePlant(kit, root, x + 24 + i * 42, z + (i % 2 ? 44 : 210), 1.1 + i % 3 * .2)
    kit.box(root, x + 80, 4, z + 125, 64, 9, 28, ARCH.oak, 2)
    kit.box(root, x + 80, 13, z + 112, 64, 12, 3, ARCH.oak, 1)
    title('Terrace garden', x + 213, z + 140, 95)
  }
  return { root, walls, doors, dispose() { for (const object of roots) object.removeFromParent() } }
}

// Static detail shares draw calls; interaction proxies live outside this batch.
export function batchArchitecture(root) {
  root.updateMatrixWorld(true)
  const batches = new Map(), originals = []
  root.traverse(object => {
    if (!object.isMesh || object.material.transparent) return
    const key = `${object.material.uuid}:${object.castShadow}`
    if (!batches.has(key)) batches.set(key, { material: object.material, shadow: object.castShadow, geometries: [] })
    const shape = object.geometry.index ? object.geometry.toNonIndexed() : object.geometry.clone()
    shape.applyMatrix4(object.matrixWorld)
    batches.get(key).geometries.push(shape); originals.push(object)
  })
  const merged = []
  for (const batch of batches.values()) {
    const geometry = mergeGeometries(batch.geometries)
    for (const shape of batch.geometries) shape.dispose()
    if (!geometry) throw new Error('Could not batch the office model')
    const mesh = new THREE.Mesh(geometry, batch.material)
    mesh.castShadow = batch.shadow; mesh.receiveShadow = true; merged.push(geometry); root.add(mesh)
  }
  for (const object of originals) object.removeFromParent()
  return () => { for (const geometry of merged) geometry.dispose() }
}
