import assert from 'node:assert/strict'
import { test } from 'node:test'
import { officeNavigation } from '../src/client/office/navigation.js'

test('office entry resumes the last floor, while an explicit lobby choice overrides it', () => {
  const state = { office: null, officeRoomId: 'studio', menu: 'open' }
  assert.deepEqual(officeNavigation(state).office, { roomId: 'studio' })
  assert.deepEqual(officeNavigation(state, null).office, { roomId: null })
  assert.deepEqual(officeNavigation({ office: null }).office, { roomId: null })
  assert.equal(officeNavigation(state).menu, null)
})

test('a lift arriving in the background preserves ordinary chat and stays hidden', () => {
  const state = { office: null, officeRoomId: 'studio', menu: 'chat-menu', details: 'coder' }
  assert.deepEqual(officeNavigation(state, null, false), { ...state, officeRoomId: null })
  const visible = officeNavigation({ ...state, office: { roomId: 'studio' } }, null, false)
  assert.deepEqual(visible.office, { roomId: null })
  assert.equal(visible.officeRoomId, null)
})
