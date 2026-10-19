import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'

export const ARCH = { chalk: '#eff1ed', oak: '#b29370', woodDark: '#79614c', steel: '#48545d', black: '#26313b', blue: '#497da0', mint: '#8fa99f', leaf: '#52785d', brass: '#c6ac7c', paper: '#e8e9df' }

export function createModelKit() {
  const materials = new Map(), geometries = new Map(), textures = new Set()
  const material = (color, options = {}) => {
    const key = JSON.stringify([color, options])
    if (!materials.has(key)) materials.set(key, new THREE.MeshStandardMaterial({ color, roughness: .82, ...options }))
    return materials.get(key)
  }
  const geometry = (key, build) => { if (!geometries.has(key)) geometries.set(key, build()); return geometries.get(key) }
  const mesh = (parent, shape, mat, x, y, z, cast = true) => {
    const object = new THREE.Mesh(shape, typeof mat === 'string' ? material(mat) : mat)
    object.position.set(x, y, z); object.castShadow = cast; object.receiveShadow = true
    parent.add(object)
    return object
  }
  const box = (parent, x, y, z, w, h, d, color, radius = 0) => {
    const shape = radius
      ? geometry(`round:${w}:${h}:${d}:${radius}`, () => new RoundedBoxGeometry(w, h, d, 2, radius))
      : geometry('box', () => new THREE.BoxGeometry(1, 1, 1))
    const object = mesh(parent, shape, color, x, y, z)
    if (!radius) object.scale.set(w, h, d)
    return object
  }
  const cylinder = (parent, x, y, z, top, bottom, h, color, sides = 12) => mesh(parent,
    geometry(`cylinder:${top}:${bottom}:${h}:${sides}`, () => new THREE.CylinderGeometry(top, bottom, h, sides)), color, x, y, z)
  const sphere = (parent, x, y, z, rx, ry, rz, color) => {
    const object = mesh(parent, geometry('sphere', () => new THREE.SphereGeometry(1, 12, 8)), color, x, y, z)
    object.scale.set(rx, ry, rz)
    return object
  }
  const line = (parent, a, b, radius, color) => {
    const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b), distance = start.distanceTo(end)
    const object = cylinder(parent, 0, 0, 0, radius, radius, distance, color, 6)
    object.position.copy(start).lerp(end, .5)
    object.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), end.sub(start).normalize())
    return object
  }
  const texture = (width, height, draw) => {
    const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height
    draw(canvas.getContext('2d'), width, height)
    const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace
    map.anisotropy = 4; textures.add(map)
    return map
  }
  const text = (parent, value, x, y, z, width = 68, color = '#35434b', background = '#eff1ed') => {
    const map = texture(512, 96, (ctx, w, h) => {
      ctx.fillStyle = background; ctx.fillRect(0, 0, w, h)
      ctx.fillStyle = color; ctx.font = '500 38px Segoe UI, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText(value, w / 2, h / 2, w - 28)
    })
    const mat = new THREE.MeshBasicMaterial({ map, side: THREE.DoubleSide }); materials.set(`text:${textures.size}`, mat)
    const object = mesh(parent, geometry('plane', () => new THREE.PlaneGeometry(1, 1)), mat, x, y, z, false)
    object.scale.set(width, width * 96 / 512, 1)
    return object
  }
  return { material, box, cylinder, sphere, line, texture, text,
    group(parent, x = 0, y = 0, z = 0) { const group = new THREE.Group(); group.position.set(x, y, z); parent.add(group); return group },
    dispose() { for (const shape of geometries.values()) shape.dispose(); for (const mat of materials.values()) mat.dispose(); for (const map of textures) map.dispose(); materials.clear(); geometries.clear(); textures.clear() },
  }
}

export function makePlant(kit, parent, x, z, scale = 1) {
  const root = kit.group(parent, x, 0, z); root.scale.setScalar(scale)
  kit.cylinder(root, 0, 6, 0, 5, 3.8, 12, '#d4cbb9')
  kit.cylinder(root, 0, 12, 0, 4.4, 4.4, 1, '#645344')
  kit.line(root, [0, 12, 0], [1, 29, 0], .5, '#60764b')
  for (let i = 0; i < 7; i++) {
    const angle = i * 2.4, length = 5 + i % 3
    const leaf = kit.sphere(root, Math.sin(angle) * length * .5, 18 + i * 1.9, Math.cos(angle) * length * .5, 2.5, 5.8, 1.4, ['#52745b', '#648b67', '#78976d'][i % 3])
    leaf.rotation.set(Math.cos(angle) * .7, angle, Math.sin(angle) * .65)
  }
  return root
}

export function makeChair(kit, parent, x, z, color = '#637f8c', rotation = 0) {
  const root = kit.group(parent, x, 0, z); root.rotation.y = rotation
  kit.cylinder(root, 0, 9, 0, 1, 1.2, 15, ARCH.steel)
  for (let i = 0; i < 5; i++) {
    const a = i * Math.PI * 2 / 5
    kit.line(root, [0, 3, 0], [Math.cos(a) * 6, 2, Math.sin(a) * 6], .7, ARCH.steel)
    kit.sphere(root, Math.cos(a) * 6, 1.4, Math.sin(a) * 6, 1.2, 1.4, 1.2, ARCH.black)
  }
  kit.box(root, 0, 17, 0, 12, 3, 12, color, 1.2)
  kit.box(root, 0, 27, 5, 12, 16, 2.4, color, 1)
  for (const dx of [-7, 7]) { kit.line(root, [dx, 18, 2], [dx, 24, 1], .6, ARCH.steel); kit.box(root, dx, 24, 0, 2, 1.5, 8, ARCH.black, .6) }
  return root
}
