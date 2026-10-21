import { clearSegment, facing, findPath } from './world.js'

const ARRIVAL = 4
const TRAVEL_TIMEOUT = 25000
export const COWORKER_SPEED = 58
const GREETING_TURN = 1800
const SOCIAL_COOLDOWN = 12000
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y)
const point = ({ x, y }) => ({ x, y })
const seed = value => {
  let hash = 2166136261
  for (const letter of String(value)) hash = Math.imul(hash ^ letter.charCodeAt(0), 16777619)
  return hash >>> 0
}
const delay = record => 1500 + seed(`${record.id}:pause:${record.cycle}`) % 3000

export function createOfficeLife(world) {
  const records = new Map()
  const stations = [...(world.stations ?? [])].sort((a, b) => String(a.id).localeCompare(String(b.id)))
  const geometry = world.bounds ? world : null
  let pair = null
  let socialDue = 0
  const travelTime = (from, to) => {
    const route = geometry ? findPath(from, to, geometry) : [to]
    let length = 0, previous = from
    for (const next of route) { length += distance(previous, next); previous = next }
    return Math.max(TRAVEL_TIMEOUT, length / COWORKER_SPEED * 1000 + 8000)
  }

  function rest(record, now) {
    record.phase = 'home'
    record.station = null
    record.goal = null
    record.due = now + delay(record)
  }

  function goHome(record, agent, now) {
    record.station = null
    record.goal = point(agent.home)
    record.phase = 'returning'
    record.deadline = now + travelTime(agent, record.goal)
  }

  function output(record, agent) {
    const moving = record.phase === 'outbound' || record.phase === 'returning'
    if (record.goal) record.direction = facing(record.goal.x - agent.x, record.goal.y - agent.y, record.direction)
    if (record.phase === 'using') record.direction = record.station.direction ?? record.direction
    return {
      goal: record.goal ? point(record.goal) : null,
      activity: record.phase === 'work' ? 'working' : moving ? 'walking' : record.phase === 'using' ? ({ chat: 'idle', coffee: 'coffee', reading: 'reading', arcade: 'arcade', meal: 'meal', drink: 'drink', exercise: 'exercise' }[record.station.kind] ?? 'idle') : 'idle',
      direction: record.direction,
      line: null,
      stationId: record.station?.id ?? null,
    }
  }

  function social(ordered, now, quiet) {
    const byId = new Map(ordered.map(agent => [agent.id, agent]))
    const available = agent => agent?.state === 'idle' && (records.get(agent.id).phase === 'home' || records.get(agent.id).phase === 'using' && records.get(agent.id).station.kind === 'chat')
    const near = (a, b) => distance(a, b) <= 56 && (!geometry || clearSegment(a, b, geometry))
    if (pair) {
      const a = byId.get(pair.ids[0]), b = byId.get(pair.ids[1])
      if (quiet || !available(a) || !available(b) || !near(a, b) || now - pair.started >= GREETING_TURN * 2) {
        pair = null
        socialDue = now + SOCIAL_COOLDOWN
      }
    }
    if (!pair && !quiet && now >= socialDue) {
      const eligible = ordered.filter(available)
      for (let i = 0; i < eligible.length && !pair; i++) {
        const other = eligible.slice(i + 1).find(agent => near(eligible[i], agent))
        if (other) pair = { ids: [eligible[i].id, other.id], started: now }
      }
    }
    return byId
  }

  return { step(now, agents, { quiet = false, reserved = [], held = [] } = {}) {
    const active = new Set(agents.map(agent => agent.id))
    for (const id of records.keys()) if (!active.has(id)) records.delete(id)
    const ordered = [...agents].sort((a, b) => String(a.id).localeCompare(String(b.id)))
    const claimed = new Set(reserved)
    for (const agent of ordered) {
      let record = records.get(agent.id)
      if (!record) {
        record = { id: agent.id, cycle: 0, direction: 'down' }
        rest(record, now)
        records.set(agent.id, record)
      }
      if (held.includes(agent.id)) {
        record.phase = 'conversation'
        record.station = null
        record.goal = null
      } else if (agent.state !== 'idle') {
        record.phase = 'work'
        record.station = null
        record.goal = point(agent.home)
      } else if (quiet) {
        rest(record, now)
      } else if (record.phase === 'work' || record.phase === 'conversation') {
        goHome(record, agent, now)
      } else if (record.station && claimed.has(record.station.id)) {
        goHome(record, agent, now)
      }
      if (record.station) claimed.add(record.station.id)
    }

    const byId = social(ordered, now, quiet)
    const result = {}
    for (const agent of ordered) {
      const record = records.get(agent.id)
      const chatting = pair?.ids.includes(agent.id)
      if (agent.state === 'idle' && !quiet && !chatting && !held.includes(agent.id)) {
        if (record.phase === 'outbound' || record.phase === 'returning') {
          if (distance(agent, record.goal) <= ARRIVAL) {
            if (record.phase === 'outbound') {
              record.phase = 'using'
              record.goal = null
              record.due = now + 6000 + seed(`${record.id}:use:${record.cycle}`) % 6001
            } else rest(record, now)
          } else if (now >= record.deadline) {
            if (record.station) claimed.delete(record.station.id)
            rest(record, now)
          }
        } else if (record.phase === 'using' && now >= record.due) {
          claimed.delete(record.station.id)
          goHome(record, agent, now)
        } else if (record.phase === 'home' && now >= record.due) {
          if (distance(agent, agent.home) > ARRIVAL) {
            goHome(record, agent, now)
          } else {
            const offset = seed(`${record.id}:station:${record.cycle}`) % Math.max(1, stations.length)
            const station = stations.map((_, i) => stations[(i + offset) % stations.length]).find(s => !claimed.has(s.id) && (!geometry || findPath(agent, s, geometry).length > 0))
            if (station) {
              record.station = station
              record.goal = point(station)
              record.phase = 'outbound'
              record.deadline = now + travelTime(agent, station)
              record.cycle++
              claimed.add(station.id)
            } else record.due = now + delay(record)
          }
        }
      }
      result[agent.id] = output(record, agent)
      if (held.includes(agent.id)) result[agent.id].activity = 'chatting'
      if (chatting) {
        const first = agent.id === pair.ids[0]
        const other = byId.get(pair.ids[first ? 1 : 0])
        record.direction = facing(other.x - agent.x, other.y - agent.y, record.direction)
        result[agent.id].activity = 'chatting'
        result[agent.id].direction = record.direction
        if (now - pair.started < GREETING_TURN ? first : !first) result[agent.id].line = first ? `Hey, ${other.name || 'friend'}.` : 'Hey! Good to see you.'
      }
    }
    return result
  } }
}
