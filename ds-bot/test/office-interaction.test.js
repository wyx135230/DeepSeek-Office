import assert from 'node:assert/strict'
import { test } from 'node:test'
import { officeToolNeedsDesk, createOfficeEncounter, deskCompanion, conversationPlace } from '../src/shared/office/interaction.js'
import { createOfficeWorld, canStand, findPath } from '../src/shared/office/world.js'

const coworker = (tool) => ({ id: 'a', x: 120, y: 140, home: { x: 400, y: 140 }, doing: { tool } })
const player = { x: 96, y: 140 }

test('only local and unclassified tools need a desk; words and online tools do not', () => {
  for (const tool of [undefined, '', 'web_search', 'web_fetch', 'read_browser', 'mcp__browser__navigate', 'mcp__playwright__browser_navigate', 'message_bot', 'recall', 'ask_user']) assert.equal(officeToolNeedsDesk(tool), false, tool)
  for (const tool of ['pwsh', 'bash', 'read_file', 'apply_patch', 'read_skill', 'run_code', 'mcp__filesystem__read_file', 'mcp__computer__click', 'unknown_tool']) assert.equal(officeToolNeedsDesk(tool), true, tool)
})

test('face-to-face holds survive text, online tools and idle gaps; one local tool latches a desk visit', () => {
  const encounter = createOfficeEncounter({ stations: [] })
  const a = coworker()
  encounter.select('a', [a], player, 0)
  for (const tool of [undefined, 'web_search', undefined, 'read_browser']) {
    a.doing = { tool }
    assert.equal(encounter.step([a], player, 100).held, 'a')
  }
  a.doing = { tool: 'read_file' }
  let state = encounter.step([a], player, 200)
  assert.equal(state.mode, 'escort')
  assert.equal(state.desk, 'a')
  a.doing = undefined
  state = encounter.step([a], player, 300)
  assert.equal(state.mode, 'escort')
  a.x = a.home.x; a.y = a.home.y
  state = encounter.step([a], player, 400)
  assert.ok(state.goal)
  state = encounter.step([a], state.goal, 500)
  assert.equal(state.mode, 'desk')
  assert.equal(state.goal, null)
  assert.equal(encounter.step([a], player, 600).mode, 'desk')
})

test('movement cancels automatic following once, and leaving or removing the coworker releases the encounter', () => {
  const encounter = createOfficeEncounter({ stations: [] }), a = coworker('pwsh')
  encounter.select('a', [a], player, 0)
  assert.equal(encounter.step([a], player, 0).mode, 'escort')
  encounter.interrupt()
  assert.equal(encounter.step([a], player, 10).mode, 'desk')
  assert.equal(encounter.step([a], player, 20).goal, null)
  encounter.clear()
  a.doing = undefined
  encounter.select('a', [a], player, 30)
  assert.equal(encounter.step([a], { x: 900, y: 900 }, 40).held, null)
  encounter.select('a', [a], player, 50)
  assert.equal(encounter.step([], player, 60).mode, null)
})

test('distant selection and reduced motion never pull the visitor across the office', () => {
  const encounter = createOfficeEncounter({ stations: [] }), a = coworker('pwsh')
  encounter.select('a', [a], { x: 1000, y: 1000 }, 0)
  assert.equal(encounter.step([a], player, 0).mode, null)
  encounter.select('a', [a], player, 10)
  const state = encounter.step([a], player, 20, { quiet: true })
  assert.equal(state.mode, 'desk')
  assert.equal(state.goal, null)
})

test('desk companions stand beside rather than inside a desk and can reach the spot on every floor size', () => {
  for (const count of [1, 5, 12]) {
    const world = createOfficeWorld(count, false, `conversation-${count}`)
    for (const desk of world.desks) {
      const goal = deskCompanion(world, desk.home, world.spawn)
      assert.ok(goal)
      assert.ok(canStand(goal, world))
      assert.ok(findPath(world.spawn, goal, world).length)
      assert.ok(Math.hypot(goal.x - desk.home.x, goal.y - desk.home.y) >= 24)
      const talking = conversationPlace(world, desk.home, world.spawn)
      assert.ok(talking)
      assert.equal(Math.hypot(talking.x - desk.home.x, talking.y - desk.home.y), 32)
    }
  }
})

test('a local tool that ends between frames still starts one desk visit', () => {
  const encounter = createOfficeEncounter({ stations: [] }), a = coworker()
  encounter.select('a', [a], player, 0)
  encounter.requireDesk('a')
  assert.equal(encounter.step([a], player, 500).mode, 'escort')
  encounter.clear()
  encounter.select('a', [a], player, 1000)
  assert.equal(encounter.step([a], player, 1100).mode, 'talk')
})
