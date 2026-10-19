import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFile } from 'node:fs/promises'
import { Group, Box3, Texture } from 'three'
import { loadOfficeTelevision } from '../src/client/office/television-3d.js'
import { createOfficeWorld } from '../src/shared/office/world.js'

test('supplied TV and remote fit the cabinet, screen faces the sofas and resources are released once', async () => {
  const bytes = await readFile(new URL('../src/client/assets/cinema/television.glb', import.meta.url))
  const television = await loadOfficeTelevision(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength))
  const stage = new Group(), world = createOfficeWorld(12)
  const fixture = world.furniture.find(f => f.kind === 'television')
  let screenTexture
  const root = television.mount({
    group(parent, x, y, z) { const root = new Group(); root.position.set(x, y, z); parent.add(root); return root },
    texture() { screenTexture = new Texture(); return screenTexture },
  }, stage, world)
  root.updateMatrixWorld(true)
  const bounds = new Box3().setFromObject(root)
  assert.ok(bounds.min.x >= fixture.x && bounds.max.x <= fixture.x + fixture.width)
  assert.ok(bounds.min.z >= fixture.y && bounds.max.z <= fixture.y + fixture.height)
  assert.ok(bounds.min.y >= 21 && bounds.max.y > 80)
  assert.ok(root.getObjectByName('TV')); assert.ok(root.getObjectByName('Remote'))
  const shapes = new Set(), materials = new Set()
  let screen
  root.traverse(node => {
    if (!node.isMesh) return
    shapes.add(node.geometry)
    for (const mat of Array.isArray(node.material) ? node.material : [node.material]) { materials.add(mat); if (mat.name === 'Screen') screen = node }
  })
  assert.equal(screen.material.map, screenTexture)
  assert.equal(screen.material.emissiveMap, screenTexture)
  const normals = screen.geometry.attributes.normal
  let towardSofas = 0
  for (let i = 0; i < normals.count; i++) towardSofas += normals.getZ(i)
  assert.ok(towardSofas / normals.count > .9, 'front of TV faces the room, toward increasing world Y')
  let disposedShapes = 0, disposedMats = 0
  for (const shape of shapes) shape.addEventListener('dispose', () => disposedShapes++)
  for (const mat of materials) mat.addEventListener('dispose', () => disposedMats++)
  television.dispose(); television.dispose()
  assert.equal(stage.children.length, 0)
  assert.equal(disposedShapes, shapes.size); assert.equal(disposedMats, materials.size)
})
