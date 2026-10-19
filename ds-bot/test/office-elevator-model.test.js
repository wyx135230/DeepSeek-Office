import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFile } from 'node:fs/promises'
import { Group, Box3 } from 'three'
import { loadOfficeElevator } from '../src/client/office/elevator-3d.js'
import { createOfficeWorld } from '../src/shared/office/world.js'

test('supplied lift fits the corridor, animates both doors and releases its resources', async () => {
  const bytes = await readFile(new URL('../src/client/assets/elevator/elevator.glb', import.meta.url))
  const elevator = await loadOfficeElevator(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength))
  const stage = new Group(), kit = { group(parent, x, y, z) { const root = new Group(); root.position.set(x, y, z); parent.add(root); return root } }
  const world = createOfficeWorld(4), root = elevator.mount(kit, stage, world)
  root.updateMatrixWorld(true)
  const bounds = new Box3().setFromObject(root)
  assert.ok(bounds.max.x < world.elevator.cabin.x + 65 && bounds.min.x >= world.elevator.cabin.x - 10)
  assert.ok(bounds.min.z > 288 && bounds.max.z < 368)
  const left = root.getObjectByName('DoorL'), right = root.getObjectByName('DoorR')
  elevator.update({ near: true, inside: true }, 0, true)
  const openLeft = left.position.x, openRight = right.position.x
  elevator.update({ near: true, inside: true, phase: 'closing' }, 500, true)
  assert.ok(left.position.x > openLeft && right.position.x < openRight)
  assert.equal(elevator.snapshot().doorOpen, 0)
  elevator.update({ near: true, inside: true, phase: 'opening' }, 1000, true)
  assert.equal(elevator.snapshot().doorOpen, 1)
  assert.equal(elevator.snapshot().shellOpacity, .16)
  const shapes = new Set(), mats = new Set()
  root.traverse(node => { if (node.isMesh) { shapes.add(node.geometry); for (const mat of Array.isArray(node.material) ? node.material : [node.material]) mats.add(mat) } })
  let disposedShapes = 0, disposedMats = 0
  for (const shape of shapes) shape.addEventListener('dispose', () => disposedShapes++)
  for (const mat of mats) mat.addEventListener('dispose', () => disposedMats++)
  elevator.dispose()
  assert.equal(stage.children.length, 0)
  assert.equal(disposedShapes, shapes.size); assert.equal(disposedMats, mats.size)
})
