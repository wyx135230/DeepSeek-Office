import assert from 'node:assert/strict'
import { test } from 'node:test'
import { officeBuilding, officeLayout, officeActivity, cleanPixelAvatar, cleanOfficeTheme, defaultPixelAvatar } from '../src/shared/office.js'

const bots = [{ id: 'a', name: 'Hana', role: 'Writer' }, { id: 'b', name: 'Sora', role: 'Engineer' }]
const room = { id: 'r', name: 'Studio', notice: 'Write a lovely story', members: ['a', 'b'], createdAt: 20 }
const roster = (rooms = [room]) => ({ bots, rooms, questions: {} })

test('no group means no building, including a team with Bots', () => {
  assert.equal(officeBuilding(roster([])).enabled, false)
  assert.deepEqual(officeBuilding(roster([])).floors, [])
})

test('every group becomes one floor in creation order with its real purpose', () => {
  const building = officeBuilding(roster([room, { ...room, id: 'old', createdAt: 1 }]))
  assert.deepEqual(building.floors.map(floor => [floor.number, floor.id]), [[1, 'old'], [2, 'r']])
  assert.equal(building.floors[1].purpose, room.notice)
  assert.equal(building.floors[1].members.length, 2)
})

test('group member changes change workstations and removed Bots never linger', () => {
  const before = officeBuilding(roster()).floors[0]
  const after = officeBuilding({ ...roster(), rooms: [{ ...room, members: ['b', 'missing', 'b'] }] }).floors[0]
  assert.deepEqual(before.members.map(member => member.bot.id), ['a', 'b'])
  assert.deepEqual(after.members.map(member => member.bot.id), ['b'])
  assert.equal(after.layout.desks.length, 1)
})

test('desks never overlap and the scene grows to fit all twelve group members', () => {
  for (const count of [0, 1, 3, 7, 12]) {
    const layout = officeLayout(count)
    assert.equal(layout.desks.length, count)
    assert.equal(new Set(layout.desks.map(desk => `${desk.x},${desk.y}`)).size, count)
    for (const desk of layout.desks) {
      assert.ok(desk.x >= 0 && desk.x + 96 < layout.width)
      assert.ok(desk.y >= 0 && desk.y + 80 < layout.height)
    }
  }
})

test('an approval takes precedence and work in another group is labelled away', () => {
  const work = { rooms: { r: [{ botId: 'a', tool: 'read_file' }] }, bots: { b: { roomId: 'other', tool: 'pwsh' } }, approvals: [{ botId: 'a', roomId: 'r' }] }
  assert.equal(officeActivity('a', room, work).state, 'waiting')
  assert.equal(officeActivity('b', room, work).state, 'away')
  assert.equal(officeActivity('b', room, {}).state, 'idle')
})

test('real group work determines thinking, reading, typing and speaking', () => {
  const state = doing => officeActivity('a', room, { rooms: { r: [{ botId: 'a', ...doing }] } }).state
  assert.equal(state({}), 'thinking')
  assert.equal(state({ tool: 'read_file' }), 'reading')
  assert.equal(state({ tool: 'web_search' }), 'reading')
  assert.equal(state({ tool: 'apply_patch' }), 'typing')
  assert.equal(state({ speaking: true }), 'speaking')
})

test('pixel avatars are deterministic, valid and retain an actual pixel silhouette', () => {
  const first = defaultPixelAvatar(bots[0])
  assert.deepEqual(first, defaultPixelAvatar(bots[0]))
  assert.notDeepEqual(first, defaultPixelAvatar(bots[1]))
  assert.equal(first.pixels.length, 24)
  assert.ok(first.pixels.every(row => row.length === 16))
  assert.deepEqual(cleanPixelAvatar(first), first)
  assert.ok(first.pixels.join('').includes('0'))
})

test('rejects invalid AI pixels, palette indexes, giant data and unsafe colors', () => {
  const good = defaultPixelAvatar(bots[0])
  for (const bad of [null, {}, { ...good, pixels: ['F'.repeat(10000)] }, { ...good, palette: ['transparent', 'url(x)'] }, { ...good, pixels: good.pixels.map(() => 'Z'.repeat(16)) }]) {
    assert.throws(() => cleanPixelAvatar(bad))
  }
})

test('theme customization is a bounded data interface and never accepts executable content', () => {
  assert.equal(cleanOfficeTheme({ name: 'Rainy reading room', wall: '#e8dcc8', floor: '#bc986e', accent: '#729978', night: true }).night, true)
  assert.throws(() => cleanOfficeTheme({ wall: 'url(https://evil)' }))
  assert.throws(() => cleanOfficeTheme({ name: 'x'.repeat(1000) }))
  const theme = cleanOfficeTheme({ name: 'Tea room', arbitraryScript: '<script>' })
  assert.equal(theme.arbitraryScript, undefined)
})
