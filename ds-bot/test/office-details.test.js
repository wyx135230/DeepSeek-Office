import assert from 'node:assert/strict'
import { test } from 'node:test'
import { Box3, Scene, Vector3 } from 'three'
import { createOfficeWorld } from '../src/shared/office/world.js'
import { createModelKit } from '../src/client/office/model-kit.js'
import { buildArchitecture, batchArchitecture } from '../src/client/office/architecture-3d.js'

// Canvas pixels are checked visually; geometry and resource ownership use the real kit.
function withCanvas(run) {
  const previous = globalThis.document, previousCanvas = globalThis.HTMLCanvasElement
  class Canvas {
    width = 0
    height = 0
    getContext() { return context }
    toDataURL() { return 'data:image/png;base64,' }
  }
  const context = new Proxy({}, { get: (_, key) => key === 'createLinearGradient' ? () => ({ addColorStop() {} }) : () => {} })
  globalThis.HTMLCanvasElement = Canvas
  globalThis.document = { createElement: () => new Canvas() }
  try { run() } finally {
    if (previous === undefined) delete globalThis.document; else globalThis.document = previous
    if (previousCanvas === undefined) delete globalThis.HTMLCanvasElement; else globalThis.HTMLCanvasElement = previousCanvas
  }
}

test('room details leave world geometry and interaction identities unchanged', () => withCanvas(() => {
  for (const [count, lobby, seed] of [[12, false, 'decor-study-7'], [4, false, 'detail-small'], [0, true, 'detail-lobby']]) {
    const world = createOfficeWorld(count, lobby, seed), before = structuredClone(world)
    const kit = createModelKit(), scene = new Scene()
    const architecture = buildArchitecture(kit, scene, world, {})
    try {
      const details = architecture.root.getObjectByName('office-details')
      assert.ok(details?.children.length, 'The presentation includes room details')
      assert.deepEqual(world, before, 'Decorating must not change the simulation world')
      for (const detailRoot of [details, ...architecture.detailRoots]) detailRoot.traverse(node => {
        assert.equal(node.userData.fixtureId, undefined, 'Decoration must not become an interaction target')
        assert.equal(node.userData.targetId, undefined)
      })
    } finally { architecture.dispose(); kit.dispose() }
  }
}))

test('solid details stay over existing furniture or walls and leave seated bodies clear', () => withCanvas(() => {
  for (const seed of ['decor-study-7', 'alpha', 'warm-details']) {
    const world = createOfficeWorld(12, false, seed), kit = createModelKit()
    const architecture = buildArchitecture(kit, new Scene(), world, {})
    try {
      const details = architecture.root.getObjectByName('office-details')
      assert.ok(details)
      architecture.root.parent.updateMatrixWorld(true)
      const seats = [...world.stations, world.meeting.head, ...world.meeting.seats].filter(p => p.poseX !== undefined)
      const bodies = seats.map(p => new Box3(new Vector3(p.poseX - 3, 19, p.poseY - 3), new Vector3(p.poseX + 3, 48, p.poseY + 3)))
      for (const detailRoot of [details, ...architecture.detailRoots]) detailRoot.traverse(node => {
        if (!node.isMesh) return
        const box = new Box3().setFromObject(node)
        assert.ok([...box.min, ...box.max].every(Number.isFinite))
        if (box.max.y <= 2) return
        const surfaces = [...world.furniture, ...world.walls]
        assert.ok(surfaces.some(f => box.min.x >= f.x - .05 && box.max.x <= f.x + f.width + .05 && box.min.z >= f.y - .05 && box.max.z <= f.y + f.height + .05), `Solid decoration extends into walkable space: ${node.name} ${JSON.stringify(box)}`)
        assert.ok(bodies.every(body => !body.intersectsBox(box)), 'No decoration may occupy a seated body')
      })
    } finally { architecture.dispose(); kit.dispose() }
  }
}))

test('batched details release their geometry and textures when the scene is replaced', () => withCanvas(() => {
  const scene = new Scene(), kit = createModelKit()
  const architecture = buildArchitecture(kit, scene, createOfficeWorld(4, false, 'detail-release'), {})
  assert.ok(architecture.root.getObjectByName('office-details'))
  const releases = [architecture.root, ...architecture.detailRoots].map(batchArchitecture), geometry = new Set(), textures = new Set()
  scene.traverse(node => {
    if (!node.isMesh) return
    geometry.add(node.geometry)
    if (node.material.map) textures.add(node.material.map)
  })
  let shapesReleased = 0, mapsReleased = 0
  for (const shape of geometry) shape.addEventListener('dispose', () => shapesReleased++)
  for (const map of textures) map.addEventListener('dispose', () => mapsReleased++)
  for (const release of releases) release()
  architecture.dispose(); kit.dispose()
  assert.equal(shapesReleased, geometry.size)
  assert.equal(mapsReleased, textures.size)
  assert.equal(scene.children.length, 0)
}))

test('batching wall details preserves world positions under a rotated cutaway wall', () => {
  const kit = createModelKit(), scene = new Scene()
  const wall = kit.group(scene, 100, 0, 200)
  wall.rotation.y = Math.PI / 2; wall.scale.y = .22
  const details = kit.group(wall)
  kit.box(details, 10, 40, 6, 4, 8, 2, '#ffffff')
  scene.updateMatrixWorld(true)
  const before = new Box3().setFromObject(details)
  const release = batchArchitecture(details)
  const after = new Box3().setFromObject(details)
  try {
    assert.ok(after.min.distanceTo(before.min) < .0001)
    assert.ok(after.max.distanceTo(before.max) < .0001)
  } finally { release(); kit.dispose() }
})
