import { officeToolNeedsDesk } from '../../shared/office/interaction.js'

const textOf = content => typeof content === 'string' ? content : (content ?? []).filter(b => b.type === 'text').map(b => b.text).join('\n')

// This observer only copies public Session events for the scene. It never sends
// prompts, advances a turn, or mounts a second composer to obtain messages.
export function createOfficeFeed({ botId, since = Date.now(), onSpeech = () => {}, onWork = () => {} }) {
  const seen = new Set(), attempts = new Map(), said = new Map()
  let turn = null, active = false, desk = false
  const speech = (id, text) => {
    if (!id || !text.trim() || said.get(id) === text) return
    said.set(id, text)
    onSpeech(id, text)
  }
  const notify = (tool, recentDesk = false) => { if (botId) onWork({ active, desk, turn, tool, recentDesk }) }
  return {
    read(entries) {
      for (const entry of entries) {
        const event = entry.event, data = event?.data ?? {}
        if (!event) continue
        const key = `${entry.type}:${event.type}:${event.seq}`
        if (seen.has(key)) continue
        seen.add(key)
        if (seen.size > 4096) seen.delete(seen.values().next().value)
        const fresh = Number(event.time) >= since
        if (event.type === 'turn/start') { turn = data.turn; active = true; desk = false; attempts.clear(); said.clear(); notify() }
        if (event.type === 'turn/end') { active = false; desk = false; attempts.clear(); notify() }
        if (event.type === 'tool/call' || event.type === 'tool/ptc-dispatch-start') {
          desk ||= officeToolNeedsDesk(data.name)
          notify(data.name, fresh && officeToolNeedsDesk(data.name))
        }
        if (!fresh) continue
        if (botId && event.type === 'assistant/live-chunk' && data.chunk?.type === 'text-delta') {
          const text = ((attempts.get(data.attemptId) ?? '') + data.chunk.text).slice(0, 2000)
          attempts.set(data.attemptId, text)
          speech(botId, text)
        }
        if (botId && event.type === 'assistant/message') {
          speech(botId, textOf(data.message?.content))
          attempts.clear()
        }
        if (event.type === 'user/message') {
          if (!data.source || data.source.kind === 'user') speech('studio-visitor', textOf(data.content))
          else if (!botId && data.source.kind === 'bot' && data.source.role === 'post') {
            const text = textOf(data.content)
            speech(data.source.senderSessionId, text.slice(text.indexOf('\n') + 1))
          }
        }
        if (!botId && event.type === 'tool/result') {
          try {
            const result = JSON.parse(textOf(data.message?.content))
            for (const reply of result.replies ?? []) if (reply.kind === undefined && Number(reply.time) >= since) speech(reply.botId, reply.text ?? '')
          } catch { /* Most tool results are not group replies. */ }
        }
      }
    },
  }
}

export function watchOfficeSession(sessions, target, handlers) {
  let stopped = false, off = () => {}
  const reference = sessions.retain(target.sessionId, { source: 'controllerOperation' })
  const feed = createOfficeFeed({ ...handlers, botId: target.botId })
  void reference.ready.then(binding => {
    if (stopped) return
    const source = binding.eventSource
    const read = () => {
      const snapshot = source.getSnapshot()
      const change = snapshot.change
      if (change?.kind === 'prepend') return
      const entries = change?.kind === 'settle-assistant' ? (change.entry ? [change.entry] : []) : change?.entries ?? snapshot.entries
      feed.read(entries)
    }
    // Seed work state from the contiguous window, without replaying old speech.
    feed.read(source.getSnapshot().entries)
    off = source.subscribe(read)
  }).catch(error => { if (!stopped) handlers.onError?.(error) })
  return () => { if (stopped) return; stopped = true; off(); reference.release() }
}
