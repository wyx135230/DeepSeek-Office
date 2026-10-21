import assert from 'node:assert/strict'
import { test } from 'node:test'
import { phoneChats, phoneContacts, phoneSearch, phoneStamp, phoneClock, groupAvatarMembers, phonePreview } from '../src/client/office/phone-data.js'

const roster = {
  bots: [
    { id: 'b-coder', name: 'Coder', role: 'Builds things', createdAt: 100, sessionId: 's-coder' },
    { id: 'b-writer', name: 'Writer', role: 'Writes things', createdAt: 200 },
    { id: 'b-main', name: 'Chief', role: 'Main Bot', createdAt: 50, sessionId: 's-main' },
  ],
  rooms: [
    { id: 'r-studio', name: 'Studio', members: ['b-coder', 'b-writer'], preview: '  Coder：Ship it  ', createdAt: 300 },
    { id: 'r-empty', name: 'Quiet room', members: [], createdAt: 10 },
  ],
  byId: { 'b-coder': { id: 'b-coder', name: 'Coder' }, 'b-writer': { id: 'b-writer', name: 'Writer' }, 'b-main': { id: 'b-main', name: 'Chief' } },
}

const sessions = {
  ids: ['s-coder', 's-main', 'r-studio'],
  byId: { 's-coder': { updatedAt: 500 }, 's-main': { updatedAt: 100 }, 'r-studio': { updatedAt: 900 } },
  projectionsBySession: {
    's-coder': { values: { turnOutline: [{ turn: 1, response: 'Done with the parser', prompt: 'Build the parser' }] } },
  },
}

test('the chat list holds every group and every Bot, newest first', () => {
  const chats = phoneChats(roster, sessions, { 'b-main': true })
  assert.deepEqual(chats.map(entry => entry.id), ['r-studio', 'b-coder', 'b-writer', 'b-main', 'r-empty'])
  assert.equal(chats[0].kind, 'group')
  assert.equal(chats[0].preview, 'Coder：Ship it')
  assert.equal(chats[0].updatedAt, 900)
  assert.equal(chats[1].kind, 'bot')
  assert.equal(chats[1].sessionId, 's-coder')
  assert.equal(chats[1].preview, 'Done with the parser')
  assert.equal(chats[3].unread, true)
  // A Bot without a part of its own keeps its Bot id as the Session, like the sidebar.
  assert.equal(chats[2].sessionId, 'b-writer')
})

test('a group preview falls back to the Session before an empty-history line', () => {
  const chats = phoneChats(roster, sessions, {})
  assert.equal(chats.find(entry => entry.id === 'r-empty').preview, '')
  assert.equal(phonePreview(chats.find(entry => entry.id === 'r-empty')), 'No messages yet')
})

test('contacts split the same chats into groups and an alphabetical teammate list', () => {
  const { groups, teammates } = phoneContacts(roster, sessions, {})
  assert.deepEqual(groups.map(entry => entry.id), ['r-studio', 'r-empty'])
  assert.deepEqual(teammates.map(entry => entry.name), ['Chief', 'Coder', 'Writer'])
})

test('search matches names, roles and previews, and an empty query keeps the list', () => {
  const chats = phoneChats(roster, sessions, {})
  assert.deepEqual(phoneSearch(chats, 'cod').map(entry => entry.id), ['r-studio', 'b-coder'])
  assert.deepEqual(phoneSearch(chats, 'parser').map(entry => entry.id), ['b-coder'])
  assert.deepEqual(phoneSearch(chats, '   '), chats)
  assert.deepEqual(phoneSearch(chats, 'nobody'), [])
})

test('chat-list stamps read like a phone', () => {
  const now = new Date(2026, 9, 20, 15, 30).getTime()
  const today = new Date(2026, 9, 20, 9, 5).getTime()
  const yesterday = new Date(2026, 9, 19, 9, 5).getTime()
  const weekday = new Date(2026, 9, 16, 9, 5).getTime()
  const older = new Date(2026, 8, 3, 9, 5).getTime()
  const lastYear = new Date(2025, 8, 3, 9, 5).getTime()
  assert.match(phoneStamp(today, now), /9:05|09:05/)
  assert.equal(phoneStamp(yesterday, now), 'Yesterday')
  assert.match(phoneStamp(weekday, now), /^(Fri|Friday)$/)
  assert.equal(phoneStamp(older, now), '9/3')
  assert.match(phoneStamp(lastYear, now), /2025/)
  assert.equal(phoneStamp(0, now), '')
  assert.equal(phoneStamp(undefined, now), '')
})

test('the status clock is 24-hour and the group avatar stack is capped', () => {
  assert.match(phoneClock(new Date(2026, 9, 20, 9, 5).getTime()), /^09:05$|^9:05$/)
  const entry = phoneChats(roster, sessions, {}).find(item => item.id === 'r-studio')
  assert.deepEqual(groupAvatarMembers(entry, 1).map(bot => bot.name), ['Coder'])
  assert.deepEqual(groupAvatarMembers({ members: [] }), [])
})
