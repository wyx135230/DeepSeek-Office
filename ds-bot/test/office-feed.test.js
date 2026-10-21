import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createOfficeFeed, watchOfficeSession } from '../src/client/office/feed.js'
import { createSource } from '../src/client/sources.js'

const event = (type, seq, data, time = 1100) => ({ type: 'event', event: { type, seq, data, time } })
const assistant = (seq, text) => event('assistant/message', seq, { message: { content: [{ type: 'text', text }] } })

test('office feed ignores history, keeps streaming Unicode text, excludes reasoning and records brief local tools', () => {
  const speech = [], work = []
  const feed = createOfficeFeed({ botId: 'a', since: 1000, onSpeech: (...args) => speech.push(args), onWork: value => work.push(value) })
  feed.read([event('assistant/message', 1, { message: { content: [{ type: 'text', text: 'old' }] } }, 900)])
  feed.read([event('turn/start', 2, { turn: 2 })])
  feed.read([event('assistant/live-chunk', 2.1, { attemptId: 'x', chunk: { type: 'text-delta', index: 0, text: '你好👩‍💻' } })])
  feed.read([event('assistant/live-chunk', 2.2, { attemptId: 'x', chunk: { type: 'reasoning-delta', index: 1, text: 'private reasoning' } })])
  feed.read([assistant(3, '你好👩‍💻')])
  assert.deepEqual(speech.map(s => s[1]), ['你好👩‍💻'])
  feed.read([event('tool/call', 4, { name: 'read_file' }), event('tool/result', 5, {}), assistant(6, 'Done')])
  assert.equal(work.at(-1).desk, true)
  assert.ok(work.some(value => value.recentDesk))
  feed.read([event('turn/end', 7, { turn: 2 })])
  assert.equal(work.at(-1).active, false)
  assert.equal(work.at(-1).desk, false)
  feed.read([assistant(6, 'Done')])
  assert.equal(speech.length, 2)
})

test('group feed reads actual member replies and posts, never tool output as speech', () => {
  const speech = []
  const feed = createOfficeFeed({ since: 1000, onSpeech: (...args) => speech.push(args) })
  feed.read([event('tool/result', 1, { message: { content: [{ type: 'text', text: JSON.stringify({ replies: [{ botId: 'b', text: 'Full group answer', time: 1100 }, { kind: 'approval', botId: 'a', text: 'Approval detail' }] }) }] } })])
  feed.read([event('user/message', 2, { source: { kind: 'bot', role: 'post', senderSessionId: 'a' }, content: [{ type: 'text', text: '[Message header]\nA group post' }] })])
  assert.deepEqual(speech.map(s => s.slice(0, 2)), [['b', 'Full group answer'], ['a', 'A group post']])
})

test('closing an office session while retain is opening releases it and does not subscribe late', async () => {
  let ready, released = 0, subscribed = 0
  const reference = { ready: new Promise(resolve => { ready = resolve }), release() { released++ } }
  const stop = watchOfficeSession({ retain: () => reference }, { sessionId: 'chat', botId: 'a' }, {})
  stop(); stop()
  ready({ eventSource: { subscribe() { subscribed++ }, getSnapshot: () => ({ entries: [] }) } })
  await Promise.resolve(); await Promise.resolve()
  assert.equal(released, 1)
  assert.equal(subscribed, 0)
})

test('paging older chat history cannot end a live desk task, and closing removes the subscription', async () => {
  const current = [event('turn/start', 10, { turn: 2 }), event('tool/call', 11, { name: 'read_file' })]
  const source = createSource({ entries: current, change: { kind: 'replace', entries: current } })
  let released = 0
  const work = []
  const stop = watchOfficeSession({ retain: () => ({ ready: Promise.resolve({ eventSource: source }), release() { released++ } }) },
    { sessionId: 'chat', botId: 'a' }, { since: 1000, onWork: value => work.push(value) })
  await Promise.resolve(); await Promise.resolve()
  assert.equal(work.at(-1).desk, true)
  const older = [event('turn/start', 1, { turn: 1 }, 800), event('turn/end', 2, { turn: 1 }, 900)]
  source.set({ entries: [...older, ...current], change: { kind: 'prepend', entries: older } })
  assert.equal(work.at(-1).active, true)
  assert.equal(work.at(-1).desk, true)
  stop(); stop()
  const count = work.length
  const ended = event('turn/end', 12, { turn: 2 })
  source.set({ entries: [...older, ...current, ended], change: { kind: 'append', entries: [ended] } })
  assert.equal(work.length, count)
  assert.equal(released, 1)
})
