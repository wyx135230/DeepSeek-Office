import test from 'node:test'
import assert from 'node:assert/strict'
import { createOfficeWorld, canStand, findPath, fixtureInteraction } from '../src/shared/office/world.js'
import { meetingPlaces, meetingCaption, createMeetingSpeech } from '../src/shared/office/meeting.js'

test('every group has a meeting room with reachable, unique places and a head seat', () => {
  for (const seed of ['alpha', 'beta', 'gamma', 'delta']) {
    const world = createOfficeWorld(12, false, seed)
    const room = world.rooms.find(r => r.kind === 'conference')
    assert.ok(room)
    const places = meetingPlaces(world, Array.from({ length: 12 }, (_, i) => `bot-${i}`))
    assert.equal(places.length, 13)
    assert.equal(places[0].id, 'studio-visitor')
    assert.equal(places.filter(p => p.seated).length, 9)
    assert.equal(new Set(places.map(p => `${p.x},${p.y}`)).size, 13)
    for (const place of places) {
      assert.ok(canStand(place, world), place.id)
      assert.ok(findPath(world.spawn, place, world).length, place.id)
      assert.ok(place.x > room.x && place.x < room.x + room.width)
      if (place.order) { assert.ok(canStand(place.queue, world)); assert.ok(findPath(world.spawn, place.queue, world).length) }
    }
    for (const p of places.filter(p => p.seated)) assert.ok(world.furniture.some(f => f.id === p.fixtureId && f.kind === 'chair'))
  }
})

test('sofas are preserved and expose reachable resting seats instead of spare work chairs', () => {
  const world = createOfficeWorld(12)
  for (const sofa of world.furniture.filter(f => f.kind === 'sofa')) {
    const seats = world.stations.filter(s => s.fixtureId === sofa.id)
    assert.equal(seats.length, sofa.seatCount ?? 2)
    for (const s of seats) {
      assert.equal(s.kind, 'rest'); assert.equal(s.direction, sofa.direction ?? 'down')
      assert.ok(findPath(world.spawn, s, world).length)
      assert.ok(s.poseX > sofa.x && s.poseX < sofa.x + sofa.width)
    }
  }
  assert.equal(world.furniture.filter(f => f.kind === 'chair' && f.roomId.startsWith('work')).length, 0)
})

test('meeting chairs match the group instead of leaving unnecessary empty chairs', () => {
  for (const size of [0, 1, 2, 5, 8, 12]) {
    const world = createOfficeWorld(size)
    assert.equal(world.furniture.filter(f => f.roomId === world.meeting.roomId && f.kind === 'chair').length, 1 + Math.min(size, 8))
  }
})

test('clicking the display or a sofa resolves its own interaction instead of a blocked floor point', () => {
  const world = createOfficeWorld(12)
  const board = world.furniture.find(f => f.kind === 'meeting-board')
  assert.equal(fixtureInteraction(board.id, board, world).kind, 'meeting-board')
  for (const sofa of world.furniture.filter(f => f.kind === 'sofa')) assert.equal(fixtureInteraction(sofa.id, sofa, world).fixtureId, sofa.id)
  assert.equal(fixtureInteraction(world.desks[0].id, world.desks[0], world), null)
})

test('captions truncate Unicode without changing the full transcript text', () => {
  const full = '👩‍💻 Office meeting '.repeat(20)
  const caption = meetingCaption(full)
  assert.ok(caption.length < full.length)
  assert.ok(caption.endsWith('…'))
  assert.equal(meetingCaption('hello\n  team'), 'hello team')
})

test('captions ignore history in ongoing rounds, deduplicate and release their room subscription', () => {
  const speech = createMeetingSpeech(() => 1000), received = []
  const stop = speech.watch('group-a', (...args) => received.push(args))
  speech.note('group-a', 'bot', 'old', 'Earlier in this round', 999)
  speech.note('group-a', 'bot', 'legacy', 'No timestamp')
  speech.note('group-b', 'bot', 'wrong', 'Another group', 1001)
  assert.deepEqual(received, [])
  speech.note('group-a', 'bot', 'new', 'Hello', 1001)
  speech.note('group-a', 'bot', 'new', 'Hello', 1001)
  speech.note('group-a', 'bot', 'new', 'Hello team', 1001)
  assert.deepEqual(received, [['bot', 'Hello'], ['bot', 'Hello team']])
  stop(); stop()
  speech.note('group-a', 'bot', 'later', 'Closed', 1002)
  assert.equal(received.length, 2)
})
