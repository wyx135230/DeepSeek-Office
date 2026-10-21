// The phone's chat detail screen: a bubble transcript projected from the same
// retained Session the face-to-face panel uses, with the native
// conversation.content Factory mounted underneath it unchanged. The phone shell
// owns the frame, focus and Escape; this file owns the header, the transcript and
// the compact styles that keep the native composer usable at phone width.
import { createContext, createElement as h, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { MarkdownText } from '@deepseek-ai/dsh-client-ui-primitives'
import { officeDialogue } from '../../shared/office/dialogue.js'
import { avatarCanvas } from './portrait.js'
import { OfficeGroupChat } from './conversation.js'

const VISITOR = 'studio-visitor'
const LABELS = { code: { copyLabel: 'Copy', copiedLabel: 'Copied' }, footnotes: 'Footnotes' }
const STICK_PX = 80
const HISTORY_TOP_PX = 48
const STAMP_GAP_MS = 5 * 60 * 1000
let chatContext
const chatScope = () => chatContext ??= createContext(null)

const textOf = blocks => (blocks ?? []).filter(block => block?.type === 'text').map(block => block.text ?? '').join('\n')

const startOfDay = value => { const date = new Date(value); date.setHours(0, 0, 0, 0); return date.getTime() }

// A transcript stamp reads the way a phone's does: time today, then a relative
// day for the past week, then the date.
function stampText(time) {
  const value = Number(time)
  if (!Number.isFinite(value) || value <= 0) return ''
  const date = new Date(value)
  const timeText = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  const days = Math.round((startOfDay(Date.now()) - startOfDay(value)) / 86_400_000)
  if (days <= 0) return timeText
  if (days === 1) return `Yesterday ${timeText}`
  if (days < 7) return `${date.toLocaleDateString('en-US', { weekday: 'short' })} ${timeText}`
  return `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ${timeText}`
}

const botOf = (scope, speaker) => scope.roster?.byId?.[speaker] ?? (scope.roster?.bots ?? []).find(bot => bot.id === speaker || bot.sessionId === speaker)

// A cheap identity for the rendered transcript: enough to notice a new message or
// a growing reply without diffing every block.
const signatureOf = messages => {
  const last = messages.at(-1)
  return `${messages.length}:${last?.id ?? ''}:${(last?.tools ?? []).length}:${last?.streaming ? 1 : 0}:${last?.blocks?.reduce((sum, block) => sum + (block?.text?.length ?? 0), 0) ?? 0}`
}

function BackIcon() {
  return h('svg', { viewBox: '0 0 24 24', width: 18, height: 18, fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true },
    h('path', { d: 'M14.5 5.5 8 12l6.5 6.5' }))
}

function MoreIcon() {
  return h('svg', { viewBox: '0 0 24 24', width: 18, height: 18, fill: 'currentColor', 'aria-hidden': true },
    h('circle', { cx: 5, cy: 12, r: 1.7 }), h('circle', { cx: 12, cy: 12, r: 1.7 }), h('circle', { cx: 19, cy: 12, r: 1.7 }))
}

function Avatar({ bot }) {
  const ref = useRef(null)
  const avatarKey = JSON.stringify(bot?.officeAvatar ?? null)
  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const image = avatarCanvas(bot ?? { id: 'teammate', name: 'Teammate' })
    canvas.getContext('2d').drawImage(image, 0, 0)
  }, [bot?.id, bot?.name, avatarKey])
  return h('canvas', { ref, className: 'of-ph-avatar', width: 20, height: 28, 'aria-hidden': true })
}

function MessageImage({ attachment, actions, sessionId }) {
  const [url, setUrl] = useState(null)
  useEffect(() => {
    let stopped = false
    void actions.officeImageUrl(sessionId, attachment).then(value => { if (!stopped) setUrl(value) }, () => { if (!stopped) setUrl('') })
    return () => { stopped = true }
  }, [attachment, actions, sessionId])
  return url ? h('a', { href: url, target: '_blank', rel: 'noreferrer' }, h('img', { className: 'of-ph-image', src: url, alt: attachment.name ?? 'Message image' })) : h('span', { className: 'of-ph-image-state' }, url === '' ? 'Image unavailable' : 'Loading image…')
}

function LongMessage({ block, scope }) {
  const [result, setResult] = useState(null)
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    let stopped = false
    setResult(null)
    void scope.actions.fileText(block.attachment).then(value => { if (!stopped) setResult(value ?? false) }, () => { if (!stopped) setResult(false) })
    return () => { stopped = true }
  }, [scope.actions, block.attachment, retry])
  return h('div', { className: 'of-ph-long' },
    h(MarkdownText, { text: result?.text ?? block.preview, labels: LABELS }),
    result === null ? h('span', { className: 'of-ph-long-state', role: 'status' }, 'Loading full message…')
      : result === false ? h('button', { type: 'button', className: 'of-ph-long-retry', onClick: () => setRetry(value => value + 1) }, 'Retry loading full message')
        : result.whole === false ? h('span', { className: 'of-ph-long-state', role: 'status' }, `Showing the first ${result.text.length.toLocaleString()} characters available from this attachment.`) : null)
}

function DataBlock({ label, value }) {
  return h('details', { className: 'of-ph-data' }, h('summary', null, label), h('pre', null, JSON.stringify(value, null, 2)))
}

function BlockList({ blocks, streaming, scope }) {
  return (blocks ?? []).map((block, index) => {
    if (!block) return null
    if (block.type === 'office-long-message') return h(LongMessage, { key: index, block, scope })
    if (block.type === 'text') return h(MarkdownText, { key: index, text: block.text ?? '', streaming, labels: LABELS })
    if (block.type === 'reasoning' || block.type === 'thinking') return h('details', { key: index, className: 'of-ph-thought' }, h('summary', null, 'Thought'), h('div', null, block.text ?? block.thinking ?? ''))
    if (block.type === 'image' && block.attachment) return h(MessageImage, { key: index, attachment: block.attachment, actions: scope.actions, sessionId: scope.sessionId })
    if (block.type === 'file' && block.attachment) return h('span', { key: index, className: 'of-ph-file' }, h('span', { className: 'of-ph-file-name' }, block.attachment.name ?? 'Attached file'))
    return h(DataBlock, { key: index, label: block.type ?? 'Content', value: block })
  })
}

function ToolCard({ tool, scope }) {
  return h('details', { className: 'of-ph-tool' },
    h('summary', null, h('span', { className: 'of-ph-tool-name' }, tool.name), h('span', { className: 'of-ph-tool-state' }, tool.result === null ? 'Running…' : 'Result')),
    tool.input !== undefined ? h('pre', { className: 'of-ph-tool-input' }, JSON.stringify(tool.input, null, 2)) : null,
    tool.result ? h('div', { className: 'of-ph-tool-result' }, h(BlockList, { blocks: tool.result, scope })) : null)
}

function StreamingDots() {
  return h('span', { className: 'of-ph-typing', role: 'status' }, h('i', null), h('i', null), h('i', null), h('span', { className: 'of-ph-sr' }, 'Replying…'))
}

function MessageRow({ message, scope, group, showWho }) {
  const mine = message.speaker === VISITOR
  const bot = group && !mine ? botOf(scope, message.speaker) : null
  const name = bot?.name ?? 'Teammate'
  return h('div', { className: `of-ph-msg${mine ? ' of-ph-mine' : ''}`, 'data-speaker': message.speaker },
    group && !mine
      ? h('div', { className: 'of-ph-avatar-slot' }, bot ? h(Avatar, { bot }) : h('span', { className: 'of-ph-avatar of-ph-avatar-empty', 'aria-hidden': true }, name.charAt(0).toUpperCase()))
      : null,
    h('div', { className: 'of-ph-msg-main' },
      group && !mine && showWho ? h('span', { className: 'of-ph-sender' }, name) : null,
      h('div', { className: `of-ph-bubble${mine ? ' of-ph-bubble-mine' : ''}` },
        h('div', { className: 'of-ph-bubble-body' },
          h(BlockList, { blocks: message.blocks, streaming: message.streaming, scope }),
          (message.tools ?? []).map(tool => h(ToolCard, { key: tool.id, tool, scope }))),
        message.streaming ? h(StreamingDots) : null)))
}

function PhoneViews({ useSession }) {
  const { binding, scope } = useContext(chatScope())
  const group = scope.kind === 'group'
  const assistantId = group
    ? scope.room?.admin ?? scope.room?.members?.[0]?.id ?? scope.room?.members?.[0] ?? scope.room?.ownerId
    : scope.bot?.id
  const source = useMemo(() => ({ subscribe: listener => binding.eventSource.subscribe(listener), getSnapshot: () => binding.eventSource.getSnapshot() }), [binding])
  const snapshot = useSyncExternalStore(source.subscribe, source.getSnapshot)
  const hasMore = useSession(value => value.hasMore)
  const loadingOlder = useSession(value => value.loadingOlder)
  const [progress, setProgress] = useState([])
  const [historyError, setHistoryError] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [olderBusy, setOlderBusy] = useState(false)
  const thread = useRef(null)
  const following = useRef(true)
  const preserve = useRef(null)
  const loading = useRef(false)
  const stabilizing = useRef(false)
  const lastTop = useRef(0)
  const signature = useRef('')

  useEffect(() => {
    if (!group || typeof scope.actions?.roomProgress !== 'function') return undefined
    let stopped = false, timer
    const read = async () => {
      const next = await Promise.resolve(scope.actions.roomProgress(scope.sessionId)).catch(() => [])
      if (stopped) return
      setProgress(previous => JSON.stringify(previous) === JSON.stringify(next) ? previous : next)
      timer = setTimeout(read, document.hidden ? 5000 : 1000)
    }
    void read()
    return () => { stopped = true; clearTimeout(timer) }
  }, [group, scope.actions, scope.sessionId])

  const messages = useMemo(() => officeDialogue(snapshot.entries, assistantId, progress), [snapshot, assistantId, progress])

  useLayoutEffect(() => {
    const element = thread.current
    if (!element) return
    if (preserve.current) {
      const anchor = preserve.current
      preserve.current = null
      element.scrollTop = anchor.top + Math.max(0, element.scrollHeight - anchor.height)
      lastTop.current = element.scrollTop
      signature.current = signatureOf(messages)
      return
    }
    const next = signatureOf(messages)
    const changed = next !== signature.current
    signature.current = next
    if (stabilizing.current) return
    const last = messages.at(-1)
    if (following.current || last?.speaker === VISITOR) {
      following.current = true
      element.scrollTop = element.scrollHeight
      lastTop.current = element.scrollTop
      setShowNew(false)
    } else if (changed && last) setShowNew(true)
  }, [messages])

  const loadOlder = async () => {
    if (loading.current || !hasMore || typeof binding?.session?.loadOlder !== 'function') return
    const element = thread.current
    if (!element) return
    loading.current = true
    stabilizing.current = true
    setOlderBusy(true)
    setHistoryError('')
    preserve.current = { height: element.scrollHeight, top: element.scrollTop }
    try {
      await binding.session.loadOlder()
    } catch {
      preserve.current = null
      setHistoryError('Could not load earlier messages. Try again.')
    } finally {
      loading.current = false
      setOlderBusy(false)
      // The prepend normally renders before this timer. If it lands later, keep the
      // reading position instead of jumping to the new top.
      setTimeout(() => {
        stabilizing.current = false
        const target = thread.current, anchor = preserve.current
        if (!target || !anchor) return
        preserve.current = null
        target.scrollTop = anchor.top + Math.max(0, target.scrollHeight - anchor.height)
        lastTop.current = target.scrollTop
      }, 0)
    }
  }

  const onScroll = () => {
    const element = thread.current
    if (!element) return
    const previous = lastTop.current
    lastTop.current = element.scrollTop
    const atBottom = element.scrollHeight - element.scrollTop - element.clientHeight < STICK_PX
    following.current = atBottom
    if (atBottom) setShowNew(false)
    if (!historyError && !stabilizing.current && element.scrollTop < HISTORY_TOP_PX && element.scrollTop < previous) void loadOlder()
  }

  const jumpToLatest = () => {
    const element = thread.current
    if (!element) return
    following.current = true
    setShowNew(false)
    element.scrollTop = element.scrollHeight
    lastTop.current = element.scrollTop
  }

  const rows = []
  messages.forEach((message, index) => {
    const previous = messages[index - 1]
    const mine = message.speaker === VISITOR
    if (message.error) {
      rows.push(h('div', { key: message.id, className: 'of-ph-notice', role: 'status' }, textOf(message.blocks)))
      return
    }
    if (message.time && (!previous?.time || message.time - previous.time > STAMP_GAP_MS)) {
      rows.push(h('div', { key: `stamp:${message.id}`, className: 'of-ph-stamp' }, stampText(message.time)))
    }
    const showWho = group && !mine && (index === 0 || previous?.speaker !== message.speaker || previous?.error)
    rows.push(h(MessageRow, { key: message.id, message, scope, group, showWho }))
  })
  const person = scope.bot?.name ?? scope.title ?? 'your teammate'
  const empty = h('div', { className: 'of-ph-empty', role: 'status' },
    h('strong', null, group ? 'This group is quiet.' : 'No messages yet.'),
    h('p', null, group ? 'Start the conversation.' : `Say hello to ${person}.`))

  return h('div', { className: 'of-ph-view' },
    historyError
      ? h('div', { className: 'of-ph-history-error', role: 'alert' },
        h('span', null, historyError),
        h('button', { type: 'button', className: 'of-ph-history-retry', onClick: () => { setHistoryError(''); void loadOlder() } }, 'Retry'))
      : null,
    olderBusy || loadingOlder ? h('div', { className: 'of-ph-older', role: 'status' }, 'Loading earlier messages…') : null,
    h('div', { ref: thread, className: 'of-ph-thread', role: 'log', 'aria-live': 'polite', 'aria-label': 'Message transcript', tabIndex: 0, onScroll },
      messages.length ? rows : empty),
    showNew ? h('button', { type: 'button', className: 'of-ph-new', onClick: jumpToLatest }, 'New messages ↓') : null)
}

function PhoneConversation({ renderFactorySlot, binding, scope }) {
  const value = useMemo(() => ({ binding, scope }), [binding, scope])
  return h(chatScope().Provider, { value }, renderFactorySlot('conversation.content', { variant: 'embedded', phase: 'active', hero: false }, { slots: { views: PhoneViews } }))
}

export function PhoneChat({ sessionId, kind = 'bot', title, subtitle, bot, room, roster, actions, SessionProvider, renderSlot, docked, onBack, onPutAway }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const group = kind === 'group'
  const name = title || (group ? room?.name : bot?.name) || 'Conversation'
  const subline = subtitle || (group
    ? (Array.isArray(room?.members) && room.members.length ? `${room.members.length} members` : 'Group conversation')
    : 'Private conversation')
  const scope = useMemo(() => ({ kind, title: name, subtitle: subline, bot, room, roster, sessionId, actions }), [kind, name, subline, bot, room, roster, sessionId, actions])
  const body = useMemo(() => ({ binding }) => ({ render: renderFactorySlot => h(PhoneConversation, { renderFactorySlot, binding, scope }) }), [scope])
  const chat = useMemo(() => h(OfficeGroupChat, { key: sessionId, roomId: sessionId, sessionId, actions, SessionProvider, renderSlot, body }), [sessionId, actions, SessionProvider, renderSlot, body])
  const available = Boolean(sessionId && actions && SessionProvider && renderSlot)
  if (!available) return h('div', { className: 'of-ph-chat of-ph-chat-error', role: 'alert' }, 'This conversation is not available right now.')
  const isDocked = Array.isArray(docked) && docked.includes(sessionId)
  const canOpenFull = typeof actions.openSession === 'function'
  const openFull = () => {
    setMenuOpen(false)
    onPutAway?.()
    actions.openSession(sessionId)
  }
  return h('div', { className: `of-phone-chat of-ph-chat${isDocked ? ' of-ph-docked' : ''}`, 'data-kind': kind, 'data-docked': isDocked || undefined, style: { '--bt-placeholder': JSON.stringify(`Message ${name}`) } },
    h('header', { className: 'of-ph-chat-head' },
      h('button', { type: 'button', className: 'of-ph-back', 'aria-label': 'Back to chats', title: 'Back', onClick: onBack }, h(BackIcon, null)),
      h('div', { className: 'of-ph-chat-title' }, h('strong', null, name), h('span', null, subline)),
      canOpenFull ? h('button', { type: 'button', className: 'of-ph-more', 'aria-label': 'Conversation options', title: 'Conversation options', 'aria-haspopup': 'menu', 'aria-expanded': menuOpen, onClick: () => setMenuOpen(open => !open) }, h(MoreIcon, null)) : null),
    menuOpen ? h('div', { className: 'of-ph-menu-scrim', 'aria-hidden': true, onClick: () => setMenuOpen(false) }) : null,
    menuOpen ? h('div', { className: 'of-ph-menu', role: 'menu', 'aria-label': 'Conversation options' },
      h('button', { type: 'button', role: 'menuitem', className: 'of-ph-menu-item', onClick: openFull }, 'Open full conversation')) : null,
    h('div', { className: 'of-ph-chat-body of-ph-composer' }, chat))
}

export const PHONE_CHAT_CSS = `
.of-ph-chat{position:relative;display:flex;flex-direction:column;height:100%;min-height:0;min-width:0;background:#f4f6f2;color:#26343f;font-family:'Segoe UI',system-ui,sans-serif;font-size:13px;--bt-main:#fff;--bt-card:#fff;--bt-ink:#26343f;--bt-ink-2:#65757c;--bt-ink-3:#71848a;--bt-bubble:#e8eeeb;--bt-user:#3b7180;--bt-user-ink:#fff;--bt-accent:#4e7a68;--bt-accent-ink:#fff;--bt-line:#ccd5d2;--bt-line-2:#b7c8c9;--bt-hover:#eef2ed;--dsw-alias-bg-base:#f4f6f2;--dsw-specific-input-major:#fff;--dsw-alias-label-primary:#26343f;--dsw-alias-label-secondary:#5d6e64;--dsw-alias-label-tertiary:#71848a;--dsw-alias-bg-layers:#fff;--dsh-chat-content-width:100%;--dsh-content-font-size:13px;color-scheme:light}
.of-ph-chat .of-ph-bubble :is(p,li,blockquote,h1,h2,h3,td,th){color:inherit}
.of-ph-composer [contenteditable="true"]{color:#26343f!important}
.of-ph-composer [data-composer-placeholder]::before{color:#8a978c!important}
.of-ph-chat-error{padding:24px 18px;color:#8a4b3b;font-size:12px;text-align:center}
.of-ph-chat-head{position:relative;z-index:6;display:flex;align-items:center;gap:4px;flex:none;height:48px;padding:0 6px;border-bottom:1px solid #e2e8df;background:#f8faf7}
.of-ph-chat .of-ph-back,.of-ph-chat .of-ph-more{flex:none;display:grid;place-items:center;width:34px;height:34px;padding:0;border:0;border-radius:50%;background:transparent;color:#3e6459;cursor:pointer}
.of-ph-chat .of-ph-back:hover,.of-ph-chat .of-ph-more:hover{background:#e9efe6}
.of-ph-chat .of-ph-chat-title{display:flex;flex-direction:column;flex:1;min-width:0;gap:1px;padding:0 2px}
.of-ph-chat .of-ph-chat-title strong{font-size:14px;font-weight:600;line-height:1.25;color:#26343f;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.of-ph-chat .of-ph-chat-title span{font-size:10.5px;line-height:1.3;color:#6c7d72;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.of-ph-chat .of-ph-menu-scrim{position:absolute;inset:0;z-index:8;background:transparent}
.of-ph-chat .of-ph-menu{position:absolute;top:44px;right:6px;z-index:9;min-width:186px;padding:4px;border:1px solid #dde4da;border-radius:10px;background:#fff;box-shadow:0 8px 24px #26343f1f}
.of-ph-chat .of-ph-menu-item{display:block;width:100%;padding:9px 10px;border:0;border-radius:7px;background:transparent;color:#26343f;font:inherit;font-size:13px;text-align:left;cursor:pointer;white-space:nowrap}
.of-ph-chat .of-ph-menu-item:hover{background:#eff3ec}
.of-ph-chat .of-ph-chat-body{position:relative;display:flex;flex-direction:column;flex:1;min-height:0;min-width:0;overflow:hidden}
.of-ph-chat .of-ph-chat-body>div{min-height:0;max-width:100%}
.of-ph-chat .of-ph-chat-body>.of-chat-loading{display:flex;flex-direction:column;justify-content:center;align-items:center;gap:10px;flex:1;padding:22px 16px;color:#5d6e64;font-size:12px;line-height:1.5;text-align:center}
.of-ph-chat .of-ph-chat-body .of-chat-loading .of-button{min-height:32px;padding:4px 12px;font-size:12px}
.of-ph-chat [data-conversation-content]{flex:1;min-height:0;min-width:0;--dsh-chat-content-width:100%!important;--dsh-composer-card-max-width:100%!important;--dsh-composer-side-clearance:6px;--dsh-composer-dock-inset:4px;--dsh-content-font-size:13px}
.of-ph-chat [data-conversation-scroll]{display:flex!important;flex-direction:column!important;overflow:hidden!important;margin-right:0!important;scrollbar-gutter:auto!important}
.of-ph-composer [data-composer-seat]{flex:none!important;padding:0 3px 3px!important;background:none!important}
.of-ph-chat .of-ph-view{position:relative;display:flex;flex-direction:column;flex:1;min-height:0;min-width:0}
.of-ph-chat .of-ph-thread{flex:1;min-height:0;overflow-y:auto;overscroll-behavior:contain;scrollbar-width:thin;scrollbar-color:#c9d4c8 transparent;padding:8px 10px 10px;background:#f4f6f2}
.of-ph-chat .of-ph-thread:focus-visible{outline:2px solid #7ba18e;outline-offset:-2px;border-radius:6px}
.of-ph-chat .of-ph-msg{display:flex;align-items:flex-start;gap:6px;margin:0 0 8px;min-width:0}
.of-ph-chat .of-ph-msg.of-ph-mine{justify-content:flex-end}
.of-ph-chat .of-ph-avatar-slot{display:flex;flex:none;justify-content:center;width:26px;padding-top:2px}
.of-ph-chat .of-ph-avatar{display:block;height:30px;width:auto;max-width:26px;border-radius:8px;background:#e4ebdf;image-rendering:pixelated;object-fit:contain}
.of-ph-chat .of-ph-avatar-empty{display:grid;place-items:center;width:24px;height:24px;border-radius:8px;color:#5d6e64;font-size:11px;font-weight:600}
.of-ph-chat .of-ph-msg-main{display:flex;flex-direction:column;align-items:flex-start;gap:2px;min-width:0;max-width:78%}
.of-ph-chat .of-ph-mine .of-ph-msg-main{align-items:flex-end}
.of-ph-chat .of-ph-sender{max-width:100%;margin:0 2px;color:#71848a;font-size:11px;line-height:1.3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.of-ph-chat .of-ph-bubble{position:relative;max-width:100%;padding:7px 10px;border:1px solid #e2e8df;border-radius:12px;background:#fff;color:#26343f;font-size:13px;line-height:1.45;overflow-wrap:anywhere;box-shadow:0 1px 2px #26343f0a}
.of-ph-chat .of-ph-bubble::before{content:'';position:absolute;top:9px;left:-6px;width:0;height:0;border-top:5px solid transparent;border-bottom:5px solid transparent;border-right:6px solid #e2e8df}
.of-ph-chat .of-ph-bubble::after{content:'';position:absolute;top:10px;left:-4.5px;width:0;height:0;border-top:4px solid transparent;border-bottom:4px solid transparent;border-right:5px solid #fff}
.of-ph-chat .of-ph-bubble-mine{border-color:#cedec7;background:#d9e8d2}
.of-ph-chat .of-ph-bubble-mine::before{left:auto;right:-6px;border-right:0;border-left:6px solid #cedec7}
.of-ph-chat .of-ph-bubble-mine::after{left:auto;right:-4.5px;border-right:0;border-left:5px solid #d9e8d2}
.of-ph-chat .of-ph-bubble-body{display:flex;flex-direction:column;gap:5px;min-width:0}
.of-ph-chat .of-ph-bubble :is(p,ul,ol,blockquote){margin:0 0 5px}
.of-ph-chat .of-ph-bubble :is(p,ul,ol,blockquote):last-child{margin-bottom:0}
.of-ph-chat .of-ph-bubble :is(h1,h2,h3){font-size:13.5px;line-height:1.35;margin:0 0 5px}
.of-ph-chat .of-ph-bubble :is(ul,ol){padding-left:16px}
.of-ph-chat .of-ph-bubble pre{max-width:100%;margin:3px 0;padding:6px 8px;border-radius:8px;background:#26343f0d;font-size:11.5px;line-height:1.5;overflow:auto;white-space:pre}
.of-ph-chat .of-ph-bubble code{font-size:11.5px}
.of-ph-chat .of-ph-bubble table{display:block;max-width:100%;overflow:auto;border-collapse:collapse;font-size:11.5px}
.of-ph-chat .of-ph-bubble img{display:block;max-width:100%;max-height:180px;border-radius:8px;object-fit:contain}
.of-ph-chat .of-ph-bubble a{color:#3e6459;text-underline-offset:2px}
.of-ph-chat .of-ph-image{display:block;max-width:100%;max-height:180px;border-radius:8px;object-fit:contain}
.of-ph-chat .of-ph-image-state{font-size:11.5px;color:#6c7d72}
.of-ph-chat .of-ph-thought{margin:1px 0;padding:1px 0 1px 7px;border-left:2px solid #d6dfd1;color:#5d6e64;font-size:12px}
.of-ph-chat .of-ph-thought summary{color:#6c7d72;font-size:11px;line-height:1.4;cursor:pointer;list-style:none}
.of-ph-chat .of-ph-thought summary::-webkit-details-marker{display:none}
.of-ph-chat .of-ph-thought summary::before{content:'\\25B8';display:inline-block;margin-right:4px;transition:transform .12s ease}
.of-ph-chat .of-ph-thought[open] summary::before{transform:rotate(90deg)}
.of-ph-chat .of-ph-thought>div{margin-top:4px;line-height:1.5;white-space:pre-wrap;overflow-wrap:anywhere}
.of-ph-chat .of-ph-tool{border:1px solid #dde4d8;border-radius:8px;background:#edf1ea;color:#4c5e55;font-size:11.5px}
.of-ph-chat .of-ph-tool summary{display:flex;align-items:center;gap:6px;padding:5px 7px;cursor:pointer;list-style:none}
.of-ph-chat .of-ph-tool summary::-webkit-details-marker{display:none}
.of-ph-chat .of-ph-tool-name{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:600}
.of-ph-chat .of-ph-tool-state{margin-left:auto;flex:none;color:#8a978c;font-size:10.5px}
.of-ph-chat .of-ph-tool summary::after{content:'\\25BE';flex:none;color:#8a978c;font-size:9px;transition:transform .12s ease}
.of-ph-chat .of-ph-tool[open] summary::after{transform:rotate(180deg)}
.of-ph-chat .of-ph-tool-input{max-height:120px;margin:0;padding:0 8px 7px;font-size:10.5px;line-height:1.45;white-space:pre-wrap;overflow-wrap:anywhere;overflow:auto}
.of-ph-chat .of-ph-tool-result{padding:0 8px 7px}
.of-ph-chat .of-ph-file{display:inline-flex;align-items:center;gap:6px;max-width:100%;padding:4px 8px;border:1px solid #dde4d8;border-radius:8px;background:#edf1ea;color:#3e5248;font-size:12px}
.of-ph-chat .of-ph-file-name{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.of-ph-chat .of-ph-data{font-size:11px;color:#6c7d72}
.of-ph-chat .of-ph-data summary{cursor:pointer;list-style:none}
.of-ph-chat .of-ph-data summary::-webkit-details-marker{display:none}
.of-ph-chat .of-ph-data pre{max-height:140px;margin:4px 0 0;padding:6px 8px;border-radius:7px;background:#26343f0d;font-size:10.5px;line-height:1.45;overflow:auto;white-space:pre-wrap;overflow-wrap:anywhere}
.of-ph-chat .of-ph-long-state{display:block;margin-top:4px;color:#6c7d72;font-size:11px}
.of-ph-chat .of-ph-long-retry{margin-top:4px;padding:3px 8px;border:1px solid #cfdccd;border-radius:7px;background:#f8faf5;color:#3e6459;font:inherit;font-size:11px;cursor:pointer}
.of-ph-chat .of-ph-typing{display:inline-flex;align-items:center;gap:3px;padding:3px 0 1px;color:#6c7d72}
.of-ph-chat .of-ph-typing i{display:block;width:5px;height:5px;border-radius:50%;background:currentColor;opacity:.35;animation:of-ph-dot 1.1s ease-in-out infinite}
.of-ph-chat .of-ph-typing i:nth-child(2){animation-delay:.15s}
.of-ph-chat .of-ph-typing i:nth-child(3){animation-delay:.3s}
@keyframes of-ph-dot{0%,60%,100%{opacity:.3;transform:translateY(0)}30%{opacity:.95;transform:translateY(-2px)}}
.of-ph-chat .of-ph-sr{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);clip-path:inset(50%);white-space:nowrap;border:0}
.of-ph-chat .of-ph-stamp{margin:10px 0 6px;text-align:center;color:#8a978c;font-size:11px;line-height:1.3}
.of-ph-chat .of-ph-notice{max-width:100%;margin:8px auto;padding:5px 10px;border-radius:8px;background:#eef2ed;color:#5a6a62;font-size:11px;line-height:1.35;text-align:center;overflow-wrap:anywhere}
.of-ph-chat .of-ph-older{position:absolute;top:6px;left:50%;z-index:2;transform:translateX(-50%);padding:3px 10px;border-radius:999px;background:#eef2ed;color:#6c7d72;font-size:11px;line-height:1.3;box-shadow:0 2px 6px #26343f14;white-space:nowrap;cursor:default}
.of-ph-chat .of-ph-history-error{display:flex;align-items:center;justify-content:center;gap:8px;margin:0 0 6px;padding:5px 9px;border-radius:8px;background:#f6e7e2;color:#8a4b3b;font-size:11px;line-height:1.4;text-align:center}
.of-ph-chat .of-ph-history-retry{flex:none;padding:2px 8px;border:1px solid #dcb9ae;border-radius:6px;background:#fff8f5;color:#8a4b3b;font:inherit;font-size:11px;cursor:pointer}
.of-ph-chat .of-ph-history-retry:hover{background:#fbece7}
.of-ph-chat .of-ph-new{position:absolute;left:50%;bottom:8px;z-index:2;transform:translateX(-50%);padding:5px 12px;border:1px solid #cfddc9;border-radius:999px;background:#fbfaf4;color:#3e6459;font:inherit;font-size:11.5px;font-weight:600;line-height:1.3;white-space:nowrap;cursor:pointer;box-shadow:0 3px 10px #26343f1f}
.of-ph-chat .of-ph-new:hover{background:#f2f6ee}
.of-ph-chat .of-ph-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;min-height:100%;padding:28px 22px;text-align:center}
.of-ph-chat .of-ph-empty strong{color:#4c5e55;font-size:13.5px;font-weight:600}
.of-ph-chat .of-ph-empty p{margin:0;color:#8a978c;font-size:12px;line-height:1.5}
.of-ph-composer [data-composer-card]{min-height:40px!important;padding:5.5px 6px!important;border:1px solid #dde4d8!important;border-radius:16px!important;background:#fff!important;box-shadow:0 2px 10px #26343f12!important}
.of-ph-composer [data-composer-card] [data-composer-input]{min-height:22px!important;padding:2px 0!important;font-size:13px!important;line-height:20px!important}
.of-ph-composer [data-composer-card] [data-composer-placeholder]{top:2px!important}
.of-ph-composer [data-composer-placeholder]::before{font-size:13px!important;line-height:20px!important}
.of-ph-composer [data-composer-card] button[class*="_primary"]{width:30px!important;height:30px!important}
.of-ph-composer [data-composer-card] .bt-mic,.of-ph-composer [data-composer-card] .bt-voice{width:30px;height:30px}
.of-ph-composer [data-composer-seat] [class*="_root"]{padding:0 1px 3px!important}
.of-ph-composer [class*="_dock"]{max-width:100%!important;padding-left:2px!important;padding-right:2px!important}
.of-ph-composer .bt-q{max-width:100%!important}
.of-ph-composer [data-trigger-menu]{left:0!important;right:0!important;width:auto!important;max-height:min(420px,48vh)!important;z-index:12!important}
.of-ph-composer [data-composer-card]>[class*="_overlayAnchor"] [class*="_card"]{max-height:min(320px,48vh)!important}
.of-ph-chat :is(button,input,[tabindex]):focus-visible{outline:2px solid #6f9483;outline-offset:2px;border-radius:8px}
body:has(.of-phone) [data-menu-material]{max-width:min(300px,calc(100vw - 16px))!important}
body:has(.of-phone) [data-menu-material][role="menu"]{max-height:min(60vh,420px)!important;overflow-y:auto!important;overscroll-behavior:contain}
body:has(.of-phone) .bt-menu{--bt-main:#fff;--bt-card:#fff;--bt-ink:#26343f;--bt-ink-2:#65757c;--bt-ink-3:#71848a;--bt-line:#ccd5d2;--bt-line-2:#dde4d8;--bt-hover:#eef2ed;--bt-danger:#a8503f;max-width:min(260px,calc(100vw - 24px))!important;max-height:min(60vh,320px)!important;overflow-y:auto!important;overscroll-behavior:contain}
.of-phone[data-quiet] .of-ph-chat .of-ph-typing i,.of-phone[data-quiet] .of-ph-chat .of-ph-thought summary::before,.of-phone[data-quiet] .of-ph-chat .of-ph-tool summary::after{animation:none;transition:none}
@media (prefers-reduced-motion:reduce){.of-ph-chat .of-ph-typing i{animation:none;opacity:.6}.of-ph-chat .of-ph-thought summary::before,.of-ph-chat .of-ph-tool summary::after{transition:none}}
@container office (max-width:760px){.of-ph-chat .of-ph-msg-main{max-width:82%}.of-ph-chat .of-ph-thread{padding:6px 8px 8px}}
`
