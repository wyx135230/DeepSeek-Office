import assert from 'node:assert/strict'
import { test } from 'node:test'
import { CHARACTER, DIRECTIONS, POSES, characterFrame } from '../src/shared/office/character.js'
import { chibiFrame, chibiPalette } from '../src/client/office/chibi.js'

const appearance = { body: 'f', skin: 'honey', hair: 'short-curls', outfit: 'polo', hairColor: '#5b4030', shirtColor: '#6f8f6a', accessories: ['glasses'] }

test('every chibi direction and pose registers in one 16 x 32 sheet', () => {
  assert.deepEqual({ width: CHARACTER.width, height: CHARACTER.height, footY: CHARACTER.footY, columns: CHARACTER.columns }, { width: 16, height: 32, footY: 29, columns: 4 })
  const frames = new Set()
  for (const [pose, metadata] of Object.entries(POSES)) for (const direction of Object.keys(DIRECTIONS)) for (let frame = 0; frame < metadata.frames; frame++) frames.add(characterFrame(direction, pose, frame))
  assert.equal(frames.size, 3 * 4 * 4)
  assert.equal(characterFrame('down', 'idle', 99), (POSES.idle.row + 2) * 4 + 3, 'frames clamp inside their row')
  assert.equal(characterFrame('right', 'walk', 0), (POSES.walk.row + 3) * 4)
})

test('the chibi silhouette is original pixel art with transparent margins', () => {
  const front = chibiFrame(appearance, 'down', 'idle', 0)
  const back = chibiFrame(appearance, 'up', 'idle', 0)
  const left = chibiFrame(appearance, 'left', 'idle', 0)
  const right = chibiFrame(appearance, 'right', 'idle', 0)
  assert.equal(front.pixels.length, CHARACTER.width * CHARACTER.height)
  const filled = raster => raster.pixels.filter(role => role).length
  assert.ok(filled(front) > 260 && filled(front) < 420, 'a readable chibi silhouette')
  assert.ok(Math.abs(filled(back) - filled(front)) <= 24, 'back and front keep the same body proportions')
  assert.notDeepEqual(front.pixels, back.pixels, 'the face is only drawn towards the camera')
  assert.notDeepEqual(front.pixels, left.pixels)
  // Left and right are mirrored, as in classic 16-bit four-direction sprites.
  for (let y = 0; y < CHARACTER.height; y++) for (let x = 0; x < CHARACTER.width; x++) assert.equal(left.pixels[y * CHARACTER.width + x], right.pixels[y * CHARACTER.width + (CHARACTER.width - 1 - x)])
})

test('walk, idle and sitting frames differ and stay deterministic', () => {
  const walk = [0, 1, 2, 3].map(frame => chibiFrame(appearance, 'down', 'walk', frame).pixels.join(','))
  const idle = [0, 1, 2, 3].map(frame => chibiFrame(appearance, 'down', 'idle', frame).pixels.join(','))
  // Classic four-step cycle: contact, passing, contact, passing (A, B, A, C).
  assert.equal(new Set(walk).size, 3)
  assert.equal(walk[0], walk[2])
  assert.notEqual(walk[1], walk[3])
  assert.ok(new Set(idle).size >= 2, 'the idle pose blinks')
  assert.notEqual(walk[1], idle[1], 'walk and idle are authored separately')
  assert.notDeepEqual(chibiFrame(appearance, 'down', 'sitting', 0).pixels, chibiFrame(appearance, 'down', 'idle', 0).pixels, 'sitting bends the legs')
})

test('appearance traits recolor hair, shirt and accessories without changing the silhouette', () => {
  const recolored = chibiFrame({ ...appearance, hairColor: '#d8b05e', shirtColor: '#b8654d' }, 'down', 'idle', 0)
  const base = chibiFrame(appearance, 'down', 'idle', 0)
  assert.deepEqual(recolored.pixels.map(role => role !== 0), base.pixels.map(role => role !== 0), 'the same pixels are filled')
  assert.notDeepEqual([...recolored.toRGBA(chibiPalette({ ...appearance, hairColor: '#d8b05e', shirtColor: '#b8654d' }))], [...base.toRGBA(chibiPalette(appearance))], 'the rendered colors changed')
  for (const hair of ['parted', 'side-bob', 'short-curls', 'natural', 'bun', 'cornrows', 'cowlick', 'flat-top']) assert.ok(chibiFrame({ ...appearance, hair }, 'down', 'idle', 0).pixels.some(role => role), hair)
})
