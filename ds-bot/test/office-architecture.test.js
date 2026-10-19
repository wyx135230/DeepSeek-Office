import assert from 'node:assert/strict'
import { test } from 'node:test'
import { Group, Texture } from 'three'
import { createOfficeWorld } from '../src/shared/office/world.js'
import { buildArchitecture } from '../src/client/office/architecture-3d.js'

// Geometry-free primitives exercise ownership without a DOM or GPU context.
const modelKit = () => {
  const add = parent => { const group = new Group(); parent.add(group); return group }
  return { group: add, box: add, sphere: add, cylinder: add, line: add, text: add, material: color => color, texture: () => new Texture() }
}

test('theme replacement removes every architecture root including corridor walls', () => {
  const stage = new Group(), world = createOfficeWorld(4, false, 'lifecycle')
  const unrelated = new Group(); stage.add(unrelated)
  for (let i = 0; i < 4; i++) {
    const architecture = buildArchitecture(modelKit(), stage, world, {})
    assert.ok(stage.children.length > 1)
    architecture.dispose()
    assert.equal(stage.children.length, 1, 'Repainting leaves no corridor wall or door behind')
    assert.equal(stage.children[0], unrelated)
  }
})
