import { BlockAssembler } from '@deepseek-ai/dsh-llm'
import { cleanOfficeTheme, cleanPixelAvatar, defaultPixelAvatar } from '../shared/office.js'
import { splitRef } from './text.js'
import { GAME_APPEARANCE_OPTIONS } from '../shared/office/appearance.js'

const refused = message => Object.assign(new Error(message), { code: 'bot/refused' })
const invalid = message => Object.assign(new Error(message), { code: 'bot/invalid' })
const TIMEOUT_MS = 60_000

function promptOf(value) {
  if (value === undefined) return ''
  if (typeof value !== 'string' || value.length > 800) throw invalid('Describe your office or character in at most 800 characters')
  return value.trim()
}

export function install(rt) {
  const pending = new Map()
  const writable = () => {
    const reason = rt.readOnly()
    if (reason !== undefined) throw refused(reason)
  }
  const roomOf = (id) => {
    const room = rt.state.rooms[id]
    if (!room) throw invalid('Unknown group chat')
    return room
  }
  const memberOf = (botId, roomId) => {
    const room = roomOf(roomId)
    const bot = rt.state.bots[botId]
    if (!bot || !room.members.includes(botId)) throw invalid('This Bot is no longer a member of this office')
    return bot
  }

  async function modelJson(bot, sessionId, prompt, requestSignal) {
    requestSignal?.throwIfAborted()
    const ref = await rt.desiredModel(bot) ?? await rt.defaultModel()
    const route = splitRef(ref)
    if (!route) throw refused('No model is available. Add one in Harness settings.')
    const signal = requestSignal ? AbortSignal.any([requestSignal, AbortSignal.timeout(TIMEOUT_MS)]) : AbortSignal.timeout(TIMEOUT_MS)
    const messages = [{ role: 'user', content: [{ type: 'text', text: prompt }] }]
    const assembler = new BlockAssembler()
    for await (const chunk of rt.ctx.llm.stream({
      ...route, sessionId,
      messages: rt.tagUsage?.(messages, { sessionId, kind: 'office' }) ?? messages,
      maxTokens: 4096, signal,
    })) {
      signal.throwIfAborted()
      assembler.push(chunk)
    }
    signal.throwIfAborted()
    if (assembler.finish.kind !== 'stop') throw refused('The model could not finish the office design. Try again.')
    const text = assembler.blocks().filter(block => block.type === 'text').map(block => block.text).join('\n').trim()
    if (text.length > 24000) throw invalid('The generated office design is too large')
    let value
    try { value = JSON.parse(text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')) } catch { throw invalid('The model did not return a valid pixel design. Try again.') }
    return { value, model: ref }
  }

  const once = (key, work, signal, exclusive = false) => {
    signal?.throwIfAborted()
    let job = pending.get(key)
    if (job?.controller.signal.aborted) job = undefined
    if (job && exclusive) throw refused('A design is already being generated. Wait for it to finish, then try your new description.')
    if (!job) {
      job = { controller: new AbortController(), clients: 0 }
      const owned = job
      job.promise = Promise.resolve().then(() => work(owned.controller.signal)).finally(() => { if (pending.get(key) === owned) pending.delete(key) })
      pending.set(key, job)
    }
    job.clients++
    return new Promise((resolve, reject) => {
      let settled = false
      const done = (value, error, cancelled = false) => {
        if (settled) return
        settled = true
        signal?.removeEventListener('abort', abort)
        job.clients--
        if (cancelled && job.clients === 0) job.controller.abort()
        if (error) reject(error); else resolve(value)
      }
      const abort = () => done(undefined, signal.reason ?? new DOMException('Aborted', 'AbortError'), true)
      signal?.addEventListener('abort', abort, { once: true })
      job.promise.then(value => done(value), error => done(undefined, error))
      if (signal?.aborted) abort()
    })
  }

  async function avatar(body, signal) {
    const bot = memberOf(body.botId, body.roomId)
    if (bot.officeAvatar && body.regenerate !== true) return bot.officeAvatar
    const prompt = promptOf(body.prompt)
    return once(`avatar:${bot.id}`, async (jobSignal) => {
      const template = defaultPixelAvatar(bot)
      const { value, model } = await modelJson(bot, rt.chatOf(bot.id), [
        'Design an original, adorable Japanese slice-of-life pixel-game coworker. Return ONLY a JSON object, no code.',
        'Schema: {"name":"short character name","palette":["#00000000",3 to 15 opaque #rrggbb colors],"pixels":[24 strings of exactly 16 hexadecimal palette indexes each]}.',
        'Also include gameAppearance: {body,skin,hair,outfit,hairColor,shirtColor,pantsColor,shoesColor,accessories}. This designs the actual full-body animated character, not just the portrait.',
        `Allowed gameAppearance traits: ${JSON.stringify(GAME_APPEARANCE_OPTIONS)}. Choose one value for body, skin, hair and outfit. accessories is an array of zero to four allowed values. Colors are opaque #rrggbb. Match the user direction and portrait. Authored body proportions and animation registration must remain unchanged.`,
        '0 is transparent. Other pixels index palette by 0–9,A–F. Keep the body inside the grid. Use a clear chibi silhouette, big head, expressive eyes, tiny feet. Face the viewer. Give this person distinctive hair, clothing and an accessory matching their role. No background. Do not reproduce an existing copyrighted character.',
        `Person: ${JSON.stringify({ name: bot.name, role: bot.role })}. User direction: ${JSON.stringify(prompt || 'gentle, cozy, individual personality')}.`,
        `This valid original base shows the exact grid format; redesign the pixels and palette creatively: ${JSON.stringify(template)}`,
      ].join('\n'), jobSignal)
      const clean = cleanPixelAvatar(value)
      if (!clean.gameAppearance) throw invalid('The model omitted the playable character appearance. Try again.')
      await rt.load()
      jobSignal.throwIfAborted()
      writable()
      const current = memberOf(body.botId, body.roomId)
      current.officeAvatar = { ...clean, source: 'ai', model, generatedAt: Date.now(), ...(prompt ? { prompt } : {}) }
      await rt.save()
      return current.officeAvatar
    }, signal, body.regenerate === true || prompt !== '')
  }

  async function theme(body, signal) {
    const room = roomOf(body.roomId)
    const prompt = promptOf(body.prompt)
    if (!prompt) {
      const clean = cleanOfficeTheme(body.theme ?? {})
      pending.get(`theme:${room.id}`)?.controller.abort()
      room.office = { ...room.office, theme: clean }
      await rt.save()
      return clean
    }
    return once(`theme:${room.id}`, async (jobSignal) => {
      const bot = rt.state.bots[room.admin] ?? rt.state.bots[room.members[0]]
      if (!bot) throw invalid('This office has no members')
      const { value } = await modelJson(bot, room.id, [
        'Design a harmonious color palette for an original cozy Japanese pixel office. Return ONLY JSON.',
        'Schema: {"name":"a short evocative room name, at most 60 characters","wall":"#rrggbb","floor":"#rrggbb","accent":"#rrggbb","night":false}.',
        'The room retains its wood floors, shoji windows, tea corner, plants, books and workstations; customize the atmosphere with these colors and the day/night choice. Keep colors readable.',
        `Office purpose: ${JSON.stringify(room.notice || room.name)}. User direction: ${JSON.stringify(prompt)}.`,
      ].join('\n'), jobSignal)
      const clean = cleanOfficeTheme(value)
      await rt.load()
      jobSignal.throwIfAborted()
      writable()
      const current = roomOf(body.roomId)
      current.office = { ...current.office, theme: clean, prompt }
      await rt.save()
      return clean
    }, signal, true)
  }

  rt.officeEndpoint = async (endpoint, body, signal) => {
    if (endpoint === 'office-presence') {
      signal?.throwIfAborted()
      await rt.load()
      const room = roomOf(body.roomId)
      return {
        sessions: Object.entries(room.sessions ?? {}).filter(([id]) => room.members.includes(id) && rt.state.bots[id]).map(([botId, sessionId]) => ({ botId, sessionId })),
        rounds: [...(rt.roomProgress ?? [])].filter(([, round]) => round.roomId === room.id).map(([callId, round]) => ({ callId, replies: round.replies, speaking: round.speaking ?? null })),
      }
    }
    writable()
    signal?.throwIfAborted()
    await rt.load()
    writable()
    if (endpoint === 'office-avatar') return avatar(body, signal)
    if (endpoint === 'office-theme') return theme(body, signal)
    throw invalid('Unknown office action')
  }
}
