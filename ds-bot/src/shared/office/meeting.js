export function meetingPlaces(world, ids) {
  if (!world.meeting) return []
  const { head, seats, standing } = world.meeting
  const room = world.rooms.find(r => r.id === world.meeting.roomId), doorX = room.x + 160
  const side = doorX > world.width / 2 ? -1 : 1
  return [{ ...head, id: 'studio-visitor', order: 0 }, ...ids.map((id, i) => ({ ...(seats[i] ?? standing[i - seats.length]), id, order: i + 1, queue: { x: doorX + side * i * 22, y: world.corridors[0].y + 40 } }))]
}

export function meetingCaption(text, limit = 72) {
  const clean = String(text ?? '').replace(/\s+/g, ' ').trim()
  const chars = typeof Intl.Segmenter === 'function' ? [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(clean)].map(s => s.segment) : Array.from(clean)
  return chars.length > limit ? `${chars.slice(0, limit).join('')}…` : clean
}

export function createMeetingSpeech(now = Date.now) {
  const listeners = new Map()
  return {
    watch(roomId, notify) {
      const entry = { notify, since: now(), seen: new Map() }
      if (!listeners.has(roomId)) listeners.set(roomId, new Set())
      listeners.get(roomId).add(entry)
      return () => { const set = listeners.get(roomId); set?.delete(entry); if (!set?.size) listeners.delete(roomId) }
    },
    note(roomId, id, key, text, at) {
      const time = typeof at === 'string' ? Date.parse(at) : at
      if (!Number.isFinite(time)) return
      for (const entry of listeners.get(roomId) ?? []) {
        if (!text || time < entry.since || entry.seen.get(key) === text) continue
        entry.seen.set(key, text)
        if (entry.seen.size > 256) entry.seen.delete(entry.seen.keys().next().value)
        entry.notify(id, text)
      }
    },
  }
}
