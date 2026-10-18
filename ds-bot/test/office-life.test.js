import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createOfficeLife } from '../src/shared/office/life.js'
import { createOfficeWorld } from '../src/shared/office/world.js'

const coffee = { id: 'coffee-1', kind: 'coffee', x: 100, y: 40, direction: 'up' }
const agent = (id = 'a', x = 0, y = 40) => ({ id, name: id.toUpperCase(), state: 'idle', x, y, home: { x, y } })
const startTrip = (life, agents, options) => {
  life.step(0, agents, options)
  return life.step(5000, agents, options)
}

test('idle actors reserve one stable facility goal and use it only after arrival', () => {
  const life = createOfficeLife({ stations: [coffee] })
  const a = agent()
  assert.equal(life.step(0, [a]).a.activity, 'idle')
  const trip = life.step(5000, [a]).a
  assert.equal(trip.activity, 'walking')
  assert.equal(trip.stationId, 'coffee-1')
  assert.deepEqual(trip.goal, { x: 100, y: 40 })
  assert.deepEqual(life.step(5100, [a]).a.goal, trip.goal)
  assert.equal(life.step(5200, [a]).a.activity, 'walking')
  a.x = 100
  const using = life.step(5300, [a]).a
  assert.equal(using.activity, 'coffee')
  assert.equal(using.direction, 'up')
  assert.equal(using.goal, null)
  assert.equal(life.step(11000, [a]).a.activity, 'coffee')
  const returning = life.step(18000, [a]).a
  assert.equal(returning.activity, 'walking')
  assert.equal(returning.stationId, null)
  assert.deepEqual(returning.goal, { x: 0, y: 40 })
  a.x = 0
  assert.equal(life.step(18100, [a]).a.activity, 'idle')
})

test('NPC claims and player reservations exclude other users and can revoke an existing claim', () => {
  const life = createOfficeLife({ stations: [coffee] })
  const agents = [agent('a'), agent('b', 0, 200)]
  let states = startTrip(life, agents, { reserved: ['coffee-1'] })
  assert.equal(Object.values(states).filter(s => s.stationId).length, 0)
  states = life.step(10000, agents)
  assert.equal(Object.values(states).filter(s => s.stationId).length, 1)
  states = life.step(10100, agents, { reserved: ['coffee-1'] })
  assert.equal(Object.values(states).filter(s => s.stationId).length, 0)
})

test('every real work state immediately preempts leisure and releases its station', () => {
  for (const state of ['thinking', 'working', 'tool', 'waiting', 'error', 'offline']) {
    const life = createOfficeLife({ stations: [coffee] })
    const a = agent()
    startTrip(life, [a])
    a.state = state
    const work = life.step(5100, [a]).a
    assert.equal(work.activity, 'working', state)
    assert.equal(work.stationId, null, state)
    assert.deepEqual(work.goal, a.home, state)
    assert.equal(work.line, null, state)
  }
})

test('quiet mode holds idle actors still and keeps real work home goals', () => {
  const life = createOfficeLife({ stations: [coffee] })
  const a = agent(), b = { ...agent('b', 0, 200), state: 'thinking' }
  startTrip(life, [a, b])
  const states = life.step(5100, [a, b], { quiet: true })
  assert.equal(states.a.goal, null)
  assert.equal(states.a.activity, 'idle')
  assert.equal(states.a.stationId, null)
  assert.equal(states.a.line, null)
  assert.equal(states.b.activity, 'working')
  assert.deepEqual(states.b.goal, b.home)
  assert.equal(life.step(60000, [a, b], { quiet: true }).a.goal, null)
})

test('removed agents and stuck routes release station claims', () => {
  const life = createOfficeLife({ stations: [coffee] })
  const a = agent(), b = agent('b', 0, 200)
  startTrip(life, [a])
  life.step(5100, [b])
  assert.equal(life.step(11000, [b]).b.stationId, 'coffee-1')
  const timedOut = life.step(60000, [b]).b
  assert.equal(timedOut.stationId, null)
  assert.equal(timedOut.goal, null)
})

test('long cross-campus walks retain their reservation until a realistic arrival deadline', () => {
  const campus = createOfficeWorld(12, false, 'floor-0')
  const start = campus.desks.find(desk => desk.id === 'work-3-desk-1').home
  const destination = campus.stations.find(spot => spot.id === 'work-1-chat-2')
  const life = createOfficeLife({ ...campus, stations: [destination] })
  const coworker = agent('long-route', start.x, start.y)
  assert.equal(startTrip(life, [coworker])[coworker.id].stationId, destination.id)
  assert.equal(life.step(31000, [coworker])[coworker.id].stationId, destination.id)
  coworker.x = destination.x; coworker.y = destination.y
  assert.equal(life.step(33000, [coworker])[coworker.id].stationId, destination.id)
  assert.equal(life.step(33000, [coworker])[coworker.id].goal, null)
})

test('nearby idle actors alternate one bounded greeting pair with a cooldown', () => {
  const life = createOfficeLife({ stations: [] })
  const agents = [agent('a'), agent('b', 24, 40), agent('c', 0, 56)]
  let states = life.step(0, agents)
  assert.equal(Object.values(states).filter(s => s.activity === 'chatting').length, 2)
  assert.equal(typeof states.a.line, 'string')
  assert.equal(states.b.line, null)
  assert.equal(states.c.activity, 'idle')
  assert.equal(states.a.direction, 'right')
  assert.equal(states.b.direction, 'left')
  assert.equal(states.a.goal, null)
  states = life.step(1900, agents)
  assert.equal(states.a.line, null)
  assert.equal(typeof states.b.line, 'string')
  states = life.step(3800, agents)
  assert.equal(Object.values(states).filter(s => s.line).length, 0)
  assert.equal(Object.values(states).filter(s => s.activity === 'chatting').length, 0)
  assert.equal(Object.values(life.step(5000, agents)).filter(s => s.line).length, 0)
})

test('work, quiet mode, separation and removal cancel both greeting turns immediately', () => {
  for (const interruption of ['work', 'quiet', 'separation', 'removal']) {
    const life = createOfficeLife({ stations: [] })
    let agents = [agent('a'), agent('b', 24, 40)]
    assert.ok(life.step(0, agents).a.line)
    if (interruption === 'work') agents[0].state = 'thinking'
    if (interruption === 'separation') agents[0].x = 200
    if (interruption === 'removal') agents = agents.slice(1)
    const states = life.step(1000, agents, { quiet: interruption === 'quiet' })
    assert.equal(Object.values(states).filter(s => s.activity === 'chatting' || s.line).length, 0, interruption)
    assert.equal(life.step(2000, agents).b.line, null, interruption)
  }
})

test('greetings require physical proximity and line of sight', () => {
  const geometry = { bounds: { x: -16, y: 0, width: 200, height: 120 }, furniture: [{ x: 10, y: 20, width: 8, height: 60 }] }
  for (const [world, agents] of [
    [{ stations: [] }, [agent('a'), agent('b', 57, 40)]],
    [{ ...geometry, stations: [] }, [agent('a'), agent('b', 24, 40)]],
    [{ bounds: geometry.bounds, walls: geometry.furniture, stations: [] }, [agent('a'), agent('b', 24, 40)]],
  ]) {
    const states = createOfficeLife(world).step(0, agents)
    assert.equal(Object.values(states).filter(s => s.line).length, 0)
  }
})

test('actors skip stations that geometry cannot route to', () => {
  const world = { stations: [coffee], bounds: { x: -16, y: 0, width: 160, height: 120 }, furniture: [{ x: 40, y: 0, width: 8, height: 120 }] }
  const state = startTrip(createOfficeLife(world), [agent()]).a
  assert.equal(state.stationId, null)
  assert.equal(state.goal, null)
})

test('facility activities remain stationary until their use interval ends', () => {
  for (const kind of ['reading', 'arcade', 'meal', 'drink', 'exercise']) {
    const life = createOfficeLife({ stations: [{ ...coffee, kind }] })
    const a = agent()
    startTrip(life, [a])
    a.x = 100
    const states = life.step(5100, [a])
    assert.equal(states.a.activity, kind)
    assert.equal(states.a.goal, null)
    assert.equal(life.step(10000, [a]).a.activity, kind)
  }
})

test('the same agent IDs produce the same schedules regardless of roster order', () => {
  const world = { stations: [coffee, { ...coffee, id: 'book-1', kind: 'reading', y: 120 }] }
  const a = createOfficeLife(world), b = createOfficeLife(world)
  const agents = [agent('a'), agent('b', 0, 200)]
  for (const time of [0, 2000, 5000, 10000, 30000, 40000]) {
    assert.deepEqual(a.step(time, agents), b.step(time, [...agents].reverse()))
  }
})

test('real work interrupts all new facility activities after arrival across campus rooms', () => {
  for (const kind of ['meal', 'drink', 'exercise']) {
    const world = Array.from({ length: 24 }, (_, i) => createOfficeWorld(4, false, `floor-${i}`)).find(world => world.stations.some(s => s.kind === kind))
    const station = world.stations.find(s => s.kind === kind)
    const home = world.desks[0].home
    const a = { ...agent('a', home.x, home.y), home }
    const life = createOfficeLife({ ...world, stations: [station] })
    assert.equal(startTrip(life, [a]).a.stationId, station.id)
    a.x = station.x; a.y = station.y
    assert.equal(life.step(5100, [a]).a.activity, kind)
    a.state = 'thinking'
    const state = life.step(5200, [a]).a
    assert.equal(state.activity, 'working')
    assert.deepEqual(state.goal, home)
    assert.equal(state.stationId, null)
    assert.equal(state.line, null)
  }
})
