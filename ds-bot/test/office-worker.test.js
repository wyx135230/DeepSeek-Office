import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFile } from 'node:fs/promises'
import { loadOfficeCharacters } from '../src/client/office/worker-3d.js'
import { assignOfficeWardrobe } from '../src/shared/office/wardrobe.js'

const asset = await readFile(new URL('../src/client/assets/office-worker/office-worker.glb', import.meta.url))
const buffer = asset.buffer.slice(asset.byteOffset, asset.byteOffset + asset.byteLength)
const metadata = JSON.parse(asset.subarray(20, 20 + asset.readUInt32LE(12)))
const looks = assignOfficeWardrobe(['a', 'b'])
const actor = { sprite: { body: { enable: true, speed: 64 } }, exit: null }

test('bundled worker has a bounded mesh, normalized skin weights and the required clips', async () => {
  assert.ok(asset.length < 1500000)
  assert.equal(metadata.skins[0].joints.length, 23)
  assert.deepEqual(metadata.animations.map(a => a.name).sort(), ['OfficeDrink', 'OfficeExercise', 'OfficeIdle', 'OfficeSeated', 'OfficeWalk'])
  const library = await loadOfficeCharacters(buffer)
  const instance = library.instantiate(looks.get('a'))
  let triangles = 0
  instance.model.traverse(node => {
    if (!node.isMesh) return
    assert.equal(node.isSkinnedMesh, true)
    triangles += node.geometry.index.count / 3
    const weights = node.geometry.attributes.skinWeight
    assert.equal(weights.itemSize, 4)
    for (let i = 0; i < weights.count; i++) {
      const sum = weights.getX(i) + weights.getY(i) + weights.getZ(i) + weights.getW(i)
      assert.ok(Math.abs(sum - 1) < .0001)
    }
  })
  assert.equal(triangles, 32000)
  instance.dispose(); library.dispose()
})

test('coworkers share geometry but have separate colors, skeletons and animation state', async () => {
  const library = await loadOfficeCharacters(buffer), a = library.instantiate(looks.get('a')), b = library.instantiate(looks.get('b'))
  const meshes = instance => { const result = []; instance.model.traverse(n => { if (n.isMesh) result.push(n) }); return result }
  const ma = meshes(a), mb = meshes(b)
  assert.equal(new Set(ma.map(mesh => mesh.skeleton)).size, 1, 'material regions share one rig per person')
  for (let i = 0; i < ma.length; i++) {
    assert.equal(ma[i].geometry, mb[i].geometry)
    assert.notEqual(ma[i].material, mb[i].material)
    assert.notEqual(ma[i].skeleton, mb[i].skeleton)
    assert.notEqual(ma[i].skeleton.bones[5], mb[i].skeleton.bones[5])
  }
  a.animate(actor, 0, false); a.animate(actor, 200, false)
  b.animate({ ...actor, exit: {} }, 0, true)
  const pose = instance => { const q = []; instance.model.traverse(n => { if (n.isBone) q.push(...n.quaternion.toArray(), ...n.position.toArray()) }); return q }
  assert.notDeepEqual(pose(a), pose(b))
  a.animate(actor, 300, true)
  const still = pose(a)
  a.animate(actor, 1500, true)
  assert.deepEqual(pose(a), still, 'quiet motion freezes ambient animation without stopping movement')
  let disposed = 0
  for (const mesh of ma) mesh.material.addEventListener('dispose', () => disposed++)
  a.dispose()
  assert.equal(disposed, ma.length)
  b.animate(actor, 400, false)
  b.dispose(); library.dispose()
})
