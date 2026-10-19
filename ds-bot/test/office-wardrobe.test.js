import assert from 'node:assert/strict'
import { test } from 'node:test'
import { assignOfficeWardrobe, customizeOfficeLook } from '../src/shared/office/wardrobe.js'
import { createOfficeWardrobe } from '../src/client/office/wardrobe.js'

const ids = Array.from({ length: 13 }, (_, i) => `worker-${i}`)
const signature = look => [look.skin, look.hair, look.shirt, look.pants, look.shoes].join(':')

test('a floor gets reproducible, distinct automatic outfits and shirt colors', () => {
  const looks = assignOfficeWardrobe(ids)
  assert.deepEqual(looks, assignOfficeWardrobe([...ids].reverse()))
  assert.equal(new Set([...looks.values()].map(signature)).size, ids.length)
  assert.equal(new Set([...looks.values()].map(look => look.shirt)).size, ids.length)
  assert.ok(new Set([...looks.values()].map(look => look.skin)).size >= 4)
})

test('saved identities keep their outfit when coworkers arrive or leave', () => {
  const original = assignOfficeWardrobe(ids.slice(0, 5))
  const expanded = assignOfficeWardrobe(ids, original)
  for (const [id, look] of original) assert.deepEqual(expanded.get(id), look)
  const reopened = assignOfficeWardrobe(ids.slice(2, 9), expanded)
  for (const [id, look] of reopened) assert.deepEqual(look, expanded.get(id))
})

test('malformed or duplicate saved outfits are repaired without breaking a floor', () => {
  const first = assignOfficeWardrobe(['a']).get('a')
  const saved = new Map([['a', first], ['b', first], ['c', { skin: '#ffffff', shirt: 'broken' }]])
  const result = assignOfficeWardrobe(['a', 'b', 'c'], saved)
  assert.deepEqual(result.get('a'), first)
  assert.equal(new Set([...result.values()].map(signature)).size, 3)
  for (const look of result.values()) for (const key of ['skin', 'hair', 'shirt', 'pants', 'shoes']) assert.match(look[key], /^#[0-9a-f]{6}$/i)
})

test('explicit avatar skin and clothing colors take precedence over automatic choices', () => {
  const look = assignOfficeWardrobe(['a']).get('a')
  const appearance = { skin: 'coffee', hairColor: '#123456', shirtColor: '#abcdef', pantsColor: '#654321', shoesColor: '#222222' }
  const customized = customizeOfficeLook(look, appearance)
  assert.equal(customized.skin, '#795442')
  assert.equal(customized.hair, appearance.hairColor)
  assert.equal(customized.shirt, appearance.shirtColor)
  assert.equal(customized.pants, appearance.pantsColor)
  assert.equal(customized.shoes, appearance.shoesColor)
  assert.deepEqual(customizeOfficeLook(look), look)
  assert.deepEqual(customizeOfficeLook(look, appearance, { source: 'ai' }), look, 'automatic portraits cannot overwrite the 3D wardrobe')
  assert.deepEqual(customizeOfficeLook(look, appearance, { source: 'ai', prompt: 'dark suit and brown hair' }), customized)
})

test('browser wardrobe survives reopen and works with denied or damaged storage', () => {
  const data = new Map()
  const storage = { getItem: key => data.get(key), setItem: (key, value) => data.set(key, value) }
  const first = createOfficeWardrobe(storage)(ids.slice(0, 5))
  const reopened = createOfficeWardrobe(storage)(ids)
  for (const [id, look] of first) assert.deepEqual(reopened.get(id), look)
  const denied = { getItem() { throw new Error('denied') }, setItem() { throw new Error('denied') } }
  assert.deepEqual(createOfficeWardrobe(denied)(ids), assignOfficeWardrobe(ids))
  assert.deepEqual(createOfficeWardrobe({ getItem: () => '{broken' })(ids), assignOfficeWardrobe(ids))
})
