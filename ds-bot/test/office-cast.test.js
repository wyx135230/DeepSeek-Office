import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { runInNewContext } from 'node:vm'
import { test } from 'node:test'
import { build } from 'esbuild'

const directory = new URL('../src/client/assets/lpc-cast/', import.meta.url)
const manifest = JSON.parse(readFileSync(new URL('sources.json', directory), 'utf8'))
const bundle = await build({
  entryPoints: [fileURLToPath(new URL('../src/client/office/cast.js', import.meta.url))],
  bundle: true, format: 'cjs', platform: 'node', write: false, loader: { '.png': 'dataurl' },
})
function loadCast() {
  const module = { exports: {} }
  runInNewContext(bundle.outputFiles[0].text, { module, exports: module.exports })
  return module.exports
}
const cast = loadCast()

test('the cast supplies 96 distinct, reproducible authored identities', () => {
  const { CHARACTER_PRESETS: presets, characterPreset } = cast
  assert.equal(presets.length, 96)
  assert.equal(new Set(presets.map(p => p.id)).size, 96)
  assert.equal(new Set(presets.map(p => p.hairStyle)).size, 8)
  assert.equal(new Set(presets.map(p => p.clothingStyle)).size, 4)
  assert.equal(new Set(presets.map(p => p.skin)).size, 4)
  assert.equal(new Set(presets.map(p => p.body)).size, 2)
  assert.ok(Object.isFrozen(presets) && presets.every(Object.isFrozen))
  const reload = loadCast()
  const selected = new Set()
  for (let i = 0; i < 2048; i++) {
    const bot = { id: `employee-${i}` }
    const preset = characterPreset(bot)
    selected.add(preset.id)
    assert.equal(reload.characterPreset(bot).id, preset.id)
    assert.equal(characterPreset({ ...bot, name: 'Renamed', officeAvatar: { palette: ['#ffffff'] } }).id, preset.id)
  }
  assert.equal(selected.size, 96, 'all curated identities can be selected')
})

test('every selected identity resolves six matching layers for all three actions', () => {
  const entries = new Map(manifest.files.map(entry => [entry.key, entry]))
  assert.deepEqual(Object.keys(cast.CAST_ASSETS).sort(), [...entries.keys()].sort())
  for (let i = 0; i < 512; i++) for (const pose of ['walk', 'idle', 'sitting']) {
    const bot = { id: `employee-${i}` }, preset = cast.characterPreset(bot)
    const layers = [...cast.characterLayers(bot, pose)]
    assert.equal(layers.length, 6)
    assert.deepEqual(layers.map(key => entries.get(key)?.part), ['body', 'pants', 'shoes', 'shirt', 'head', 'hair'])
    for (const key of layers) {
      assert.ok(cast.CAST_ASSETS[key].startsWith('data:image/png;base64,'))
      assert.ok(key.endsWith(`-${pose}`))
    }
    for (const index of [0, 4]) assert.ok(entries.get(layers[index]).path.toLowerCase().includes(`/${preset.skin}/`), 'head and body share one skin palette')
    assert.equal(entries.get(layers[3]).style, preset.clothingStyle)
    assert.equal(entries.get(layers[5]).style, preset.hairStyle)
  }
})

test('every original PNG has the declared 64px registration and integrity digest', () => {
  const local = manifest.files.filter(entry => !entry.file.startsWith('../'))
  assert.deepEqual(readdirSync(directory).filter(name => name.endsWith('.png')).sort(), local.map(entry => entry.file).sort())
  assert.equal(manifest.revision, 'f07f7f5892e67c932c68f70bb04472f2c64e46bc')
  assert.deepEqual(manifest.registration.directions, ['up', 'left', 'down', 'right'])
  for (const entry of manifest.files) {
    const bytes = readFileSync(new URL(entry.file, directory))
    assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a')
    const pose = entry.key.split('-').at(-1)
    assert.equal(bytes.readUInt32BE(16), pose === 'walk' ? 512 : 192, entry.file)
    assert.equal(bytes.readUInt32BE(20), 256, entry.file)
    assert.equal(entry.width, bytes.readUInt32BE(16))
    assert.equal(entry.height, bytes.readUInt32BE(20))
    assert.equal(entry.sha256, createHash('sha256').update(bytes).digest('hex'), entry.file)
    assert.equal(entry.gitBlobSha, createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex'), entry.file)
  }
})

test('the library retains its pin, license, character credits and precise source paths', () => {
  assert.equal(manifest.license, 'OGA-BY-3.0')
  assert.match(readFileSync(new URL('LICENSE.txt', directory), 'utf8'), /Attribution 3\.0/i)
  assert.match(readFileSync(new URL('Credits.txt', directory), 'utf8'), /OGA-BY 3\.0/)
  const creditFiles = ['Characters.txt', 'Characters-Clothing.txt', 'Characters-Hair.txt']
  const credits = creditFiles.map(file => readFileSync(new URL(`credits/${file}`, directory), 'utf8')).join('\n')
  assert.match(credits, /Stephen Challener/)
  assert.match(credits, /Eliza Wyatt/)
  for (const entry of manifest.files) {
    assert.equal(entry.license, 'OGA-BY-3.0')
    assert.match(entry.path, /^Characters\/(Body|Head|Clothing|Hair)\/.+\/(Walk|Idle|Sitting)\.png$/)
    assert.ok(entry.path.includes(entry.style))
  }
})

test('AI traits replace the seeded look in every authored pose and remain stable on reload', () => {
  const gameAppearance = { body: 'f', skin: 'coffee', hair: 'short-curls', outfit: 'polo', hairColor: '#e2bd67', shirtColor: '#62947a', accessories: ['glasses'] }
  const bot = { id: 'ai-designer', officeAvatar: { gameAppearance } }
  const preset = cast.characterPreset(bot)
  assert.equal(preset.body, 'f')
  assert.equal(preset.skin, 'coffee')
  assert.equal(preset.hair, 'short-curls')
  assert.equal(preset.outfit, 'polo')
  assert.equal(loadCast().characterPreset(bot).id, preset.id)
  assert.notEqual(cast.characterPreset({ ...bot, officeAvatar: { gameAppearance: { ...gameAppearance, hair: 'bun' } } }).id, preset.id)
  for (const pose of ['walk', 'idle', 'sitting']) {
    const layers = [...cast.characterLayers(bot, pose)]
    assert.ok(layers.includes(`cast-f-head-coffee-${pose}`))
    assert.ok(layers.includes(`cast-f-shirt-polo-${pose}`))
    assert.ok(layers.includes(`cast-hair-short-curls-${pose}`))
    assert.ok(layers.every(layer => cast.CAST_ASSETS[layer]))
  }
  const invalid = { id: bot.id, officeAvatar: { gameAppearance: { ...gameAppearance, hair: 'missing' } } }
  assert.equal(cast.characterPreset(invalid).id, cast.characterPreset({ id: bot.id }).id)
})
