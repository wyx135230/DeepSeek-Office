import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFile } from 'node:fs/promises'
import { Group, Vector3 } from 'three'
import { loadOfficeCharacters, makeWorker } from '../src/client/office/worker-3d.js'
import { createModelKit } from '../src/client/office/model-kit.js'
import { assignOfficeWardrobe } from '../src/shared/office/wardrobe.js'

const asset = await readFile(new URL('../src/client/assets/office-worker/office-worker.glb', import.meta.url))
const buffer = asset.buffer.slice(asset.byteOffset, asset.byteOffset + asset.byteLength)
const metadata = JSON.parse(asset.subarray(20, 20 + asset.readUInt32LE(12)))
const looks = assignOfficeWardrobe(['a', 'b'])
const actor = { sprite: { body: { enable: true, speed: 64 } }, exit: null }

test('replacement keeps the phone hand and quiet pose compatible with the current worker', async () => {
  const library = await loadOfficeCharacters(buffer), kit = createModelKit(), scene = new Group()
  const worker = makeWorker(kit, scene, { id: 'visitor' }, true, library, looks.get('a'))
  const player = { sprite: { x: 0, y: 0, body: { enable: true, speed: 0, velocity: { x: 0, y: 0 } } }, direction: 'down', state: 'idle', activity: null }
  worker.update(player, 0, true, false)
  worker.root.updateMatrixWorld(true)
  const hand = worker.root.getObjectByName('RightHand')
  const rest = hand.getWorldPosition(new Vector3())
  worker.update({ ...player, holdingPhone: true }, 100, true, false)
  worker.root.updateMatrixWorld(true)
  const raised = hand.getWorldPosition(new Vector3())
  assert.ok(raised.y > rest.y + 2, 'the existing phone overlay raises the replacement wrist')
  assert.ok(raised.toArray().every(Number.isFinite))
  for (let i = 1; i <= 180; i++) worker.update({ ...player, holdingPhone: true }, 100 + i * 16, true, false)
  worker.root.updateMatrixWorld(true)
  assert.ok(hand.getWorldPosition(new Vector3()).distanceTo(raised) < .001, 'the phone pose does not accumulate rotation')
  worker.update(player, 4000, true, false)
  worker.root.updateMatrixWorld(true)
  assert.ok(hand.getWorldPosition(new Vector3()).distanceTo(rest) < .001, 'putting the phone away restores the wrist')
  worker.dispose(); kit.dispose(); library.dispose()
})

test('back hair highlights cannot inherit the stretching arm weights', async () => {
  const library = await loadOfficeCharacters(buffer), instance = library.instantiate(looks.get('a'))
  instance.model.updateMatrixWorld(true)
  let checked = 0
  instance.model.traverse(mesh => {
    if (!mesh.isSkinnedMesh || mesh.material.name !== 'OfficeHair') return
    const { position, skinIndex, skinWeight } = mesh.geometry.attributes
    for (let i = 0; i < position.count; i++) {
      const point = new Vector3().fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld).divideScalar(48)
      if (point.y < .52 || point.y > .70 || point.z > -.065) continue
      checked++
      for (let component = 0; component < 4; component++) {
        if (skinWeight.getComponent(i, component) < .00001) continue
        const bone = mesh.skeleton.bones[skinIndex.getComponent(i, component)]
        assert.equal(bone.name, 'Head', 'the posterior hair follows the head throughout an arm stretch')
      }
    }
  })
  assert.ok(checked > 100, 'the test examines the actual posterior hair geometry')
  instance.dispose(); library.dispose()
})

test('arm stretching does not pull apart the replacement hair and jacket seams', async () => {
  const library = await loadOfficeCharacters(buffer), idle = library.instantiate(looks.get('a')), exercise = library.instantiate(looks.get('b'))
  const standing = { sprite: { body: { enable: true, speed: 0 } }, exit: null }
  idle.animate(standing, 0, true)
  for (let frame = 0; frame <= 16; frame++) exercise.animate({ ...standing, activity: 'exercise' }, frame * 1000 / 30, false)
  const positions = instance => {
    instance.model.updateMatrixWorld(true)
    const meshes = []
    instance.model.traverse(mesh => {
      if (!mesh.isSkinnedMesh) return
      const points = Array.from({ length: mesh.geometry.attributes.position.count }, (_, index) => mesh.getVertexPosition(index, new Vector3()).applyMatrix4(mesh.matrixWorld))
      meshes.push({ mesh, points })
    })
    return meshes
  }
  const rest = positions(idle), raised = positions(exercise)
  let largest = 0
  for (let mesh = 0; mesh < rest.length; mesh++) {
    const indices = rest[mesh].mesh.geometry.index
    for (let i = 0; i < indices.count; i += 3) {
      for (const [a, b] of [[0, 1], [1, 2], [2, 0]]) {
        const from = indices.getX(i + a), to = indices.getX(i + b)
        const length = rest[mesh].points[from].distanceTo(rest[mesh].points[to])
        if (length < .048) continue
        largest = Math.max(largest, raised[mesh].points[from].distanceTo(raised[mesh].points[to]) / length)
      }
    }
  }
  assert.ok(largest < 5, `exercise must not create stretched seams (largest edge ratio ${largest.toFixed(2)})`)
  idle.dispose(); exercise.dispose(); library.dispose()
})

test('bundled worker has a bounded mesh, normalized skin weights and the required clips', async () => {
  assert.ok(asset.length < 3000000)
  assert.ok(metadata.nodes.some(node => node.extras?.officeSource === '7b51da2fd49357e33b60fda73ec15b27.glb'), 'the runtime uses the replacement supplied by the owner')
  assert.equal(metadata.images?.length ?? 0, 0, 'source detail is baked into shared vertex colors without per-person textures')
  assert.equal(metadata.skins[0].joints.length, 23)
  assert.deepEqual(metadata.animations.map(a => a.name).sort(), ['OfficeDrink', 'OfficeExercise', 'OfficeIdle', 'OfficeSeated', 'OfficeWalk'])
  const library = await loadOfficeCharacters(buffer)
  const instance = library.instantiate(looks.get('a'))
  let triangles = 0
  instance.model.traverse(node => {
    if (!node.isMesh) return
    assert.equal(node.isSkinnedMesh, true)
    assert.ok(node.geometry.attributes.color, 'the replacement retains baked facial and clothing detail')
    triangles += node.geometry.index.count / 3
    const weights = node.geometry.attributes.skinWeight
    assert.equal(weights.itemSize, 4)
    for (let i = 0; i < weights.count; i++) {
      const sum = weights.getX(i) + weights.getY(i) + weights.getZ(i) + weights.getW(i)
      assert.ok(Math.abs(sum - 1) < .0001)
    }
  })
  assert.ok(triangles <= 32000, 'contact repairs stay within the existing triangle budget')
  instance.dispose(); library.dispose()
})

test('coworkers share geometry but have separate colors, skeletons and animation state', async () => {
  const library = await loadOfficeCharacters(buffer), a = library.instantiate(looks.get('a')), b = library.instantiate(looks.get('b'))
  const meshes = instance => { const result = []; instance.model.traverse(n => { if (n.isMesh) result.push(n) }); return result }
  const ma = meshes(a), mb = meshes(b)
  const regions = { OfficeSkin: 'skin', OfficeHair: 'hair', OfficeShirt: 'shirt', OfficeTrousers: 'pants', OfficeShoes: 'shoes' }
  assert.deepEqual(new Set(ma.map(mesh => regions[mesh.material.name]).filter(Boolean)), new Set(Object.values(regions)), 'all existing wardrobe controls remain available')
  assert.equal(new Set(ma.map(mesh => mesh.skeleton)).size, 1, 'material regions share one rig per person')
  for (let i = 0; i < ma.length; i++) {
    assert.equal(ma[i].geometry, mb[i].geometry)
    assert.notEqual(ma[i].material, mb[i].material)
    assert.notEqual(ma[i].skeleton, mb[i].skeleton)
    assert.notEqual(ma[i].skeleton.bones[5], mb[i].skeleton.bones[5])
    const color = regions[ma[i].material.name]
    if (color) {
      assert.equal(ma[i].material.color.getHexString(), looks.get('a')[color].slice(1))
      assert.equal(mb[i].material.color.getHexString(), looks.get('b')[color].slice(1))
    }
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
