import assert from 'node:assert/strict'
import { test } from 'node:test'
import { officeDialogue, dialogueIndex, portraitPixel } from '../src/shared/office/dialogue.js'

const entry = (type, seq, data = {}) => ({ type: 'event', event: { type, seq, time: seq * 100, data } })
const text = value => [{ type: 'text', text: value }]

test('dialogue keeps complete text, reasoning and tool results while live attempts settle once', () => {
  const entries = [entry('user/message', 1, { content: text('Hello') }),
    entry('assistant/live-chunk', 2, { turn: 1, step: 1, attemptId: 'a', chunk: { type: 'reasoning-delta', index: 0, text: 'Let me think' } }),
    entry('assistant/live-chunk', 3, { turn: 1, step: 1, attemptId: 'a', chunk: { type: 'text-delta', index: 1, text: 'Partial' } }),
    entry('assistant/message', 4, { turn: 1, step: 1, message: { content: [{ type: 'reasoning', text: 'Full reasoning' }, ...text('Long answer '.repeat(1000))] } }),
    entry('tool/call', 5, { callId: 'c', name: 'read_file', arguments: '{"path":"readme"}' }),
    entry('tool/result', 6, { message: { toolCallId: 'c', content: text('Complete result') } })]
  const messages = officeDialogue(entries, 'bot')
  assert.equal(messages.length, 2)
  assert.equal(messages[1].id, 'assistant:1:1')
  assert.equal(messages[1].blocks[0].text, 'Full reasoning')
  assert.equal(messages[1].blocks[1].text.length, 12000)
  assert.equal(messages[1].tools[0].result[0].text, 'Complete result')
  assert.equal(messages[1].streaming, false)
})

test('group replies use their actual speakers and ignore internal context messages', () => {
  const messages = officeDialogue([
    entry('user/message', 1, { source: { kind: 'bot', role: 'context' }, content: text('Internal context') }),
    entry('user/message', 2, { source: { kind: 'bot', role: 'post', senderSessionId: 'writer' }, content: text('[Header]\nA post') }),
    entry('tool/result', 3, { message: { content: text(JSON.stringify({ replies: [{ botId: 'coder', text: 'Done', time: 400 }, { botId: 'writer', kind: 'approval', text: 'Waiting' }] })) } }),
  ], 'chief')
  assert.deepEqual(messages.map(m => [m.speaker, m.blocks[0].text]), [['writer', 'A post'], ['coder', 'Done']])
})

test('history stays anchored through prepends and live updates; latest follows new messages', () => {
  const messages = [{ id: 'old' }, { id: 'viewed' }, { id: 'new' }]
  assert.equal(dialogueIndex(messages, 'viewed'), 1)
  assert.equal(dialogueIndex([{ id: 'older' }, ...messages, { id: 'live' }], 'viewed'), 2)
  assert.equal(dialogueIndex(messages, null), 2)
  assert.equal(dialogueIndex([], null), -1)
})

test('terminal failures remain readable and busy-round user replies stay in group history', () => {
  const messages = officeDialogue([
    entry('tool/result', 1, { message: { toolCallId: 'relay', content: text(JSON.stringify({ replies: [{ kind: 'user', text: 'A follow-up while busy', time: 100 }] })) } }),
    entry('turn/end', 2, { reason: { kind: 'error', error: { message: 'Model unavailable' } } }),
  ], 'chief')
  assert.equal(messages[0].speaker, 'studio-visitor')
  assert.equal(messages[0].blocks[0].text, 'A follow-up while busy')
  assert.equal(messages[1].error, true)
  assert.equal(messages[1].blocks[0].text, 'Model unavailable')
})

test('live group progress joins the settled tool result without duplicate reply identities', () => {
  const replies = [{ botId: 'coder', text: 'My part is ready', time: 100 }]
  const call = entry('tool/call', 1, { callId: 'relay', name: 'group_relay', arguments: '{}' })
  const progress = [{ callId: 'relay', replies }]
  const live = officeDialogue([call], 'chief', progress)
  const settled = officeDialogue([call, entry('tool/result', 2, { message: { toolCallId: 'relay', content: text(JSON.stringify({ replies })) } })], 'chief', progress)
  assert.equal(live.at(-1).id, settled.at(-1).id)
  assert.equal(settled.filter(row => row.speaker === 'coder').length, 1)
  assert.notEqual(settled[0].tools[0].result, null)
})

test('portrait regional tint preserves transparency, linework and ivory while separating hair and clothing', () => {
  const look = { hair: '#663311', skin: '#ae7958', shirt: '#87465d' }
  assert.deepEqual(portraitPixel([1, 2, 3, 0], look), [1, 2, 3, 0])
  assert.deepEqual(portraitPixel([20, 20, 20, 255], look), [20, 20, 20, 255])
  assert.deepEqual(portraitPixel([240, 235, 220, 255], look), [240, 235, 220, 255])
  const hair = portraitPixel([151, 91, 199, 200], look)
  const shirt = portraitPixel([35, 153, 178, 255], look)
  assert.equal(hair[3], 200)
  assert.ok(hair[0] > hair[2])
  assert.ok(shirt[0] > shirt[1])
  assert.notDeepEqual(portraitPixel([239, 196, 162, 255], look), [239, 196, 162, 255])
  assert.deepEqual(portraitPixel([239, 196, 162, 255], look, .8), [239, 196, 162, 255])
  assert.notDeepEqual(portraitPixel([172, 138, 180, 255], look), [172, 138, 180, 255])
})
