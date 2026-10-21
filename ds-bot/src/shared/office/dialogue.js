const contentOf = value => typeof value === 'string' ? [{ type: 'text', text: value }] : Array.isArray(value) ? value : []
const textOf = value => contentOf(value).filter(b => b.type === 'text').map(b => b.text ?? '').join('\n')

// Read the loaded, public event window. The Session source owns transient
// settlement and history paging; this projection never sends or rewrites events.
export function officeDialogue(entries, botId, progress = []) {
  const messages = [], attempts = new Map(), tools = new Map(), seen = new Set()
  let last, turn
  const append = (id, speaker, blocks, extra = {}) => {
    const message = { id, speaker, blocks: contentOf(blocks), tools: [], streaming: false, ...extra }
    messages.push(message); last = message
    return message
  }
  const addReplies = (callId, replies, time) => {
    for (const [index, reply] of replies.entries()) {
      if (reply.kind && reply.kind !== 'user' || !reply.text || !reply.botId && reply.kind !== 'user') continue
      const id = `reply:${callId}:${index}`
      if (messages.some(message => message.id === id)) continue
      append(id, reply.kind === 'user' ? 'studio-visitor' : reply.botId, [{ type: 'text', text: reply.text }], { time: reply.time ?? time })
    }
  }
  for (const entry of entries ?? []) {
    const event = entry.event
    if (!event) continue
    const { type, seq, time, data = {} } = event
    const unique = `${entry.type}:${type}:${seq}`
    if (seen.has(unique)) continue
    seen.add(unique)
    if (type === 'turn/start') { turn = data.turn; last = undefined }
    if (type === 'turn/end') {
      for (const message of messages) message.streaming = false
      if (data.reason?.kind === 'error') append(`error:${seq}`, botId, [{ type: 'text', text: data.reason.error?.message ?? 'The turn failed. Please try again.' }], { time, error: true })
    }
    if (type === 'user/message') {
      if (!data.source || data.source.kind === 'user') append(`user:${seq}`, 'studio-visitor', data.content, { time })
      else if (data.source.kind === 'bot' && data.source.role === 'post') {
        const text = textOf(data.content)
        const attachments = contentOf(data.content).filter(block => block.type !== 'text')
        const file = data.source.length ? attachments.find(block => block.type === 'file')?.attachment : null
        const blocks = [{ type: 'text', text: text.slice(text.indexOf('\n') + 1) }, ...attachments]
        append(`post:${seq}`, data.source.senderSessionId, file ? [{ type: 'office-long-message', attachment: file, preview: blocks[0].text }] : blocks, { time })
      }
    }
    if (type === 'assistant/live-chunk' || type === 'assistant/message') {
      const key = data.turn !== undefined && data.step !== undefined ? `${data.turn}:${data.step}` : String(data.attemptId ?? `turn:${data.turn ?? turn}:${data.step ?? seq}`)
      let message = attempts.get(key)
      if (!message) { message = append(`assistant:${key}`, botId, [], { time }); attempts.set(key, message) }
      last = message
      if (type === 'assistant/message') { message.blocks = contentOf(data.message?.content); message.streaming = false }
      else {
        const chunk = data.chunk
        if (chunk?.type !== 'text-delta' && chunk?.type !== 'reasoning-delta') continue
        const index = chunk.index ?? 0, kind = chunk.type === 'text-delta' ? 'text' : 'reasoning'
        const block = message.blocks[index] ?? { type: kind, text: '' }
        message.blocks[index] = { ...block, text: block.text + (chunk.text ?? '') }
        message.streaming = true
      }
    }
    if (type === 'tool/call') {
      if (!last || last.speaker === 'studio-visitor') last = append(`tool:${seq}`, botId, [], { time })
      const tool = { id: data.callId ?? data.id ?? seq, name: data.name ?? 'Tool', input: data.arguments ?? data.input, result: null }
      last.tools.push(tool); tools.set(tool.id, tool)
    }
    if (type === 'tool/result') {
      const blocks = contentOf(data.message?.content)
      const callId = data.message?.toolCallId ?? data.callId ?? data.id ?? seq
      const tool = tools.get(callId)
      if (tool) tool.result = blocks
      let replies
      try { replies = JSON.parse(textOf(blocks)).replies } catch { /* Ordinary tool results are not group replies. */ }
      if (Array.isArray(replies)) {
        addReplies(callId, replies, time)
      } else {
        if (!tool && blocks.length) append(`result:${seq}`, botId, blocks, { time })
      }
    }
  }
  for (const live of progress) if (!tools.get(live.callId)?.result) addReplies(live.callId, live.replies ?? [], undefined)
  return messages.filter(message => message.blocks.some(Boolean) || message.tools.length)
}

export function dialogueIndex(messages, anchor) {
  const index = anchor === null ? -1 : messages.findIndex(message => message.id === anchor)
  return index < 0 ? messages.length - 1 : index
}

const rgb = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16))
const luminance = ([r, g, b]) => .2126 * r + .7152 * g + .0722 * b

// The authored atlas uses separate purple, cyan and peach color families.
// Classify those regions before tinting, preserving ivory, linework and alpha.
export function portraitPixel(pixel, look, y = 0) {
  const [r, g, b, a] = pixel
  if (!a) return pixel
  const high = Math.max(r, g, b), low = Math.min(r, g, b), saturation = high ? (high - low) / high : 0
  let target, base
  if (b > r * .78 && b > g * 1.06 && r > g * 1.08 && saturation > .10) { target = look.hair; base = [151, 91, 199] }
  else if (b > r * 1.25 && g > r * 1.25 && saturation > .25) { target = look.shirt; base = [35, 153, 178] }
  else if (y < .61 && r > g * 1.06 && g > b * 1.06 && saturation > .14 && saturation < .55 && high > 100) { target = look.skin; base = [239, 196, 162] }
  if (!target || !/^#[0-9a-f]{6}$/i.test(target)) return pixel
  const light = luminance(pixel), reference = luminance(base)
  const result = rgb(target).map(value => Math.round(Math.max(0, Math.min(255, light <= reference ? value * light / reference : value + (255 - value) * (light - reference) / (255 - reference)))))
  return [...result, a]
}
