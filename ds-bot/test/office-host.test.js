import assert from 'node:assert/strict'
import { test } from 'node:test'
import { install } from '../src/host/office.js'
import { defaultPixelAvatar } from '../src/shared/office.js'

function runtime(replies = []) {
  const requests = []
  const bot = { id: 'a', name: 'Hana', role: 'Writer', model: 'mock/creative' }
  const room = { id: 'r', name: 'Stories', members: ['a'], admin: 'a' }
  let saved
  const rt = {
    state: { bots: { a: bot }, rooms: { r: room } },
    readOnly: () => undefined,
    load: async () => {},
    save: async () => { saved = structuredClone(rt.state) },
    desiredModel: async member => member.model,
    defaultModel: async () => 'mock/default',
    chatOf: id => id,
    tagUsage: messages => messages,
    ctx: { llm: { async* stream(request) {
      requests.push(request)
      const reply = await replies.shift()
      if (reply instanceof Error) throw reply
      yield { type: 'text-delta', index: 0, text: typeof reply === 'string' ? reply : JSON.stringify(reply) }
      yield { type: 'finish', reason: { kind: 'stop' } }
    } } },
  }
  install(rt)
  return { rt, bot, room, requests, saved: () => saved }
}

test('office presence exposes only current member sessions and existing rounds without writes or model calls', async () => {
  const { rt, room, requests, saved } = runtime()
  room.sessions = { a: 'group-a', removed: 'group-removed' }
  rt.roomProgress = new Map([['call-r', { roomId: 'r', replies: [{ botId: 'a', text: 'Hello' }], speaking: 'a' }], ['other', { roomId: 'elsewhere', replies: [] }]])
  rt.readOnly = () => 'Read only'
  const before = structuredClone(rt.state)
  assert.deepEqual(await rt.officeEndpoint('office-presence', { roomId: 'r' }), {
    sessions: [{ botId: 'a', sessionId: 'group-a' }],
    rounds: [{ callId: 'call-r', replies: [{ botId: 'a', text: 'Hello' }], speaking: 'a' }],
  })
  assert.deepEqual(rt.state, before)
  assert.equal(saved(), undefined)
  assert.equal(requests.length, 0)
})

test('AI generates and persists real character pixels on the Bot model', async () => {
  const avatar = defaultPixelAvatar({ id: 'a', name: 'Hana' })
  const { rt, bot, requests, saved } = runtime([avatar])
  const result = await rt.officeEndpoint('office-avatar', { botId: 'a', roomId: 'r' })
  assert.deepEqual(result.pixels, avatar.pixels)
  assert.deepEqual(saved().bots.a.officeAvatar.pixels, avatar.pixels)
  assert.equal(bot.officeAvatar.source, 'ai')
  assert.equal(requests[0].provider, 'mock')
  assert.equal(requests[0].model, 'creative')
  assert.equal(requests[0].sessionId, 'a')
  await rt.officeEndpoint('office-avatar', { botId: 'a', roomId: 'r' })
  assert.equal(requests.length, 1, 'a saved avatar is not billed again')
})

test('concurrent automatic avatar requests share one generation', async () => {
  let resolve
  const reply = new Promise(done => { resolve = done })
  const { rt, requests } = runtime([reply])
  const first = rt.officeEndpoint('office-avatar', { botId: 'a', roomId: 'r' })
  const second = rt.officeEndpoint('office-avatar', { botId: 'a', roomId: 'r' })
  resolve(defaultPixelAvatar({ id: 'a' }))
  assert.deepEqual(await first, await second)
  assert.equal(requests.length, 1)
})

test('AI designs persist playable traits and regeneration replaces the complete scene look', async () => {
  const first = { ...defaultPixelAvatar({ id: 'a' }), gameAppearance: { body: 'f', skin: 'honey', hair: 'bun', outfit: 'polo', shirtColor: '#62897a', accessories: ['glasses'] } }
  const next = { ...first, gameAppearance: { body: 'm', skin: 'bronze', hair: 'cowlick', outfit: 'v-neck', hairColor: '#d2b86c', accessories: ['scarf'] } }
  const { rt, requests, saved } = runtime([first, next])
  await rt.officeEndpoint('office-avatar', { botId: 'a', roomId: 'r' })
  assert.deepEqual(saved().bots.a.officeAvatar.gameAppearance, first.gameAppearance)
  await rt.officeEndpoint('office-avatar', { botId: 'a', roomId: 'r', regenerate: true, prompt: 'Golden cowlick, warm scarf, bronze skin.' })
  assert.deepEqual(saved().bots.a.officeAvatar.gameAppearance, next.gameAppearance)
  assert.match(requests[1].messages[0].content[0].text, /gameAppearance/)
})

test('one window cancelling does not cancel another window sharing its automatic design', async () => {
  let resolve
  const reply = new Promise(done => { resolve = done })
  const { rt, bot } = runtime([reply])
  const firstSignal = new AbortController()
  const first = rt.officeEndpoint('office-avatar', { botId: 'a', roomId: 'r' }, firstSignal.signal)
  const second = rt.officeEndpoint('office-avatar', { botId: 'a', roomId: 'r' })
  await new Promise(done => setImmediate(done))
  firstSignal.abort()
  resolve(defaultPixelAvatar({ id: 'a' }))
  await assert.rejects(first, /abort/i)
  assert.ok((await second).pixels)
  assert.equal(bot.officeAvatar.source, 'ai')
})

test('an explicit new design is never silently replaced by an in-flight automatic design', async () => {
  let resolve
  const reply = new Promise(done => { resolve = done })
  const { rt } = runtime([reply])
  const automatic = rt.officeEndpoint('office-avatar', { botId: 'a', roomId: 'r' })
  await new Promise(done => setImmediate(done))
  await assert.rejects(rt.officeEndpoint('office-avatar', { botId: 'a', roomId: 'r', regenerate: true, prompt: 'A red hat' }), /already|progress|wait/i)
  resolve(defaultPixelAvatar({ id: 'a' }))
  await automatic
})

test('a team that becomes read-only while loading cannot start generation', async () => {
  const { rt, requests } = runtime([])
  rt.load = async () => { rt.readOnly = () => 'Another host is using this team' }
  await assert.rejects(rt.officeEndpoint('office-avatar', { botId: 'a', roomId: 'r' }), /Another host/)
  assert.equal(requests.length, 0)
})

test('invalid AI output cannot replace the existing appearance', async () => {
  const { rt, bot } = runtime(['```json\n{"pixels": ["evil"]}\n```'])
  const before = { ...defaultPixelAvatar({ id: 'a' }), source: 'ai' }
  bot.officeAvatar = before
  await assert.rejects(rt.officeEndpoint('office-avatar', { botId: 'a', roomId: 'r', regenerate: true }), /pixel|character/i)
  assert.deepEqual(bot.officeAvatar, before)
})

test('a portrait-only model response cannot silently claim to redesign the game character', async () => {
  const previous = defaultPixelAvatar({ id: 'a' })
  const { gameAppearance, ...legacy } = previous
  const { rt, bot } = runtime([legacy])
  bot.officeAvatar = previous
  await assert.rejects(rt.officeEndpoint('office-avatar', { botId: 'a', roomId: 'r', regenerate: true }), /playable character appearance/)
  assert.deepEqual(bot.officeAvatar.gameAppearance, gameAppearance)
})

test('no room or a nonmember cannot trigger an AI request', async () => {
  const { rt, room, requests } = runtime([])
  await assert.rejects(rt.officeEndpoint('office-avatar', { botId: 'a', roomId: 'missing' }), /group/i)
  room.members = []
  await assert.rejects(rt.officeEndpoint('office-avatar', { botId: 'a', roomId: 'r' }), /member/i)
  assert.equal(requests.length, 0)
})

test('a Bot removed during generation is not recreated', async () => {
  let resolve
  const pending = new Promise(done => { resolve = done })
  const { rt } = runtime([pending])
  const result = rt.officeEndpoint('office-avatar', { botId: 'a', roomId: 'r' })
  await new Promise(done => setImmediate(done))
  delete rt.state.bots.a
  resolve(defaultPixelAvatar({ id: 'a' }))
  await assert.rejects(result, /no longer|removed|member/i)
  assert.equal(rt.state.bots.a, undefined)
})

test('a read-only team cannot spend tokens or change an office', async () => {
  const { rt, requests } = runtime([])
  rt.readOnly = () => 'Another host is using this team'
  await assert.rejects(rt.officeEndpoint('office-avatar', { botId: 'a', roomId: 'r' }), /Another host/)
  await assert.rejects(rt.officeEndpoint('office-theme', { roomId: 'r', theme: {} }), /Another host/)
  assert.equal(requests.length, 0)
})

test('AI theme personalization saves bounded data without changing group membership', async () => {
  const { rt, room, saved } = runtime([{ name: 'Moonlit library', wall: '#465872', floor: '#9d856b', accent: '#c6b88d', night: true, code: 'ignored' }])
  const result = await rt.officeEndpoint('office-theme', { roomId: 'r', prompt: 'A moonlit library' })
  assert.equal(result.name, 'Moonlit library')
  assert.equal(result.code, undefined)
  assert.equal(saved().rooms.r.office.theme.night, true)
  assert.deepEqual(room.members, ['a'])
})

test('an aborted model request leaves the original office unchanged', async () => {
  const { rt, bot } = runtime([defaultPixelAvatar({ id: 'a' })])
  const controller = new AbortController()
  controller.abort()
  await assert.rejects(rt.officeEndpoint('office-avatar', { botId: 'a', roomId: 'r' }, controller.signal), /abort/i)
  assert.equal(bot.officeAvatar, undefined)
})
