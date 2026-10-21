import { createContext, createElement as h, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { MarkdownText } from '@deepseek-ai/dsh-client-ui-primitives'
import { createPortal } from 'react-dom'
import { officeDialogue, dialogueIndex } from '../../shared/office/dialogue.js'
import { AnimePortrait } from './novel-portrait.js'

let scopeContext, stateContext
export const novelScope = () => scopeContext ??= createContext(null)
const labels = { code: { copyLabel: 'Copy', copiedLabel: 'Copied' }, footnotes: 'Footnotes' }
const VISITOR = { id: 'studio-visitor', name: 'You' }

function DataBlock({ label, value }) {
  return h('details', { className: 'of-vn-data' }, h('summary', null, label), h('pre', null, JSON.stringify(value, null, 2)))
}

function MessageImage({ attachment, actions, sessionId }) {
  const [url, setUrl] = useState(null)
  useEffect(() => {
    let stopped = false
    void actions.officeImageUrl(sessionId, attachment).then(value => { if (!stopped) setUrl(value) }, () => { if (!stopped) setUrl('') })
    return () => { stopped = true }
  }, [attachment, actions, sessionId])
  return url ? h('a', { href: url, target: '_blank', rel: 'noreferrer' }, h('img', { className: 'of-vn-attachment', src: url, alt: attachment.name ?? 'Message image' })) : h('span', null, url === '' ? 'Image unavailable' : 'Loading image…')
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
  return h('div', null, h(MarkdownText, { text: result?.text ?? block.preview, labels }),
    result === null ? h('span', { role: 'status' }, 'Loading full message…') : result === false ? h('button', { type: 'button', onClick: () => setRetry(value => value + 1) }, 'Retry loading full message') : result.whole === false ? h('span', { role: 'status' }, `Showing the first ${result.text.length.toLocaleString()} characters available from this attachment.`) : null)
}

function Blocks({ blocks, streaming, scope }) {
  return blocks.map((block, index) => {
    if (!block) return null
    if (block.type === 'office-long-message') return h(LongMessage, { key: index, block, scope })
    if (block.type === 'text') return h(MarkdownText, { key: index, text: block.text ?? '', streaming, labels })
    if (block.type === 'reasoning' || block.type === 'thinking') return h('details', { key: index, className: 'of-vn-thinking', open: true },
      h('summary', null, 'Thinking'), h('div', null, block.text ?? block.thinking ?? ''))
    if (block.type === 'image' && block.attachment) return h(MessageImage, { key: index, attachment: block.attachment, actions: scope.actions, sessionId: scope.sessionId })
    if (block.type === 'file' && block.attachment) return h('div', { key: index, className: 'of-vn-file' }, '↳ ', block.attachment.name ?? 'Attached file')
    return h(DataBlock, { key: index, label: block.type ?? 'Content', value: block })
  })
}

function NovelViews({ useInput, inputActions, useSession }) {
  const state = useContext(stateContext)
  const { scope, message, writing, setWriting, setAnchor, messages, index } = state
  const draft = useInput(value => value.draft)
  const attachmentCount = useInput(value => value.attachmentIds.length)
  const hasMore = useSession(value => value.hasMore)
  const loadingOlder = useSession(value => value.loadingOlder)
  const [historyError, setHistoryError] = useState('')
  const previousDraft = useRef(draft)
  const previousAttachments = useRef(attachmentCount)
  const scroll = useRef(null), follow = useRef(true)
  const draftRef = useRef({ text: draft, attachmentCount })
  draftRef.current = { text: draft, attachmentCount }
  useEffect(() => {
    state.input.current = { actions: inputActions, draft: () => draftRef.current }
    return () => { state.input.current = null }
  }, [inputActions, state.input])
  useEffect(() => {
    if (draft.trim() || attachmentCount) setWriting(true)
    else if (previousDraft.current.trim() || previousAttachments.current > 0) setWriting(false)
    previousDraft.current = draft
    previousAttachments.current = attachmentCount
  }, [draft, attachmentCount, setWriting])
  useLayoutEffect(() => { follow.current = true; if (scroll.current) scroll.current.scrollTop = 0 }, [message?.id])
  useLayoutEffect(() => {
    if (scroll.current && follow.current && message?.streaming) scroll.current.scrollTop = scroll.current.scrollHeight
  }, [message])
  const move = async delta => {
    if (!writing && index === 0 && delta < 0 && hasMore) {
      setHistoryError('')
      try {
        await scope.binding.session.loadOlder()
        const older = officeDialogue(scope.binding.eventSource.getSnapshot().entries, state.assistantId)
        const position = older.findIndex(row => row.id === message.id)
        if (position > 0) setAnchor(older[position - 1].id)
        else if (scope.binding.session.getSnapshot().openError) setHistoryError('Could not load earlier messages. Try again.')
      } catch { setHistoryError('Could not load earlier messages. Try again.') }
      return
    }
    if (writing && delta < 0) { setWriting(false); setAnchor(messages.at(-1)?.id ?? null); return }
    if (index + delta >= messages.length) { setWriting(true); setAnchor(null); return }
    const next = messages[Math.max(0, index + delta)]
    if (next) { setWriting(false); setAnchor(next.id) }
  }
  return h('div', { className: 'of-vn-view' },
    historyError ? h('div', { className: 'of-vn-history-error', role: 'alert' }, historyError) : null,
    !writing && message ? h('article', { ref: scroll, className: 'of-vn-message', tabIndex: 0, 'aria-label': `${state.speaker.name} message`, onScroll: event => {
      const el = event.currentTarget; follow.current = el.scrollHeight - el.scrollTop - el.clientHeight < 24
    } },
    h(Blocks, { blocks: message.blocks, streaming: message.streaming, scope }),
    message.tools.map(tool => h('details', { key: tool.id, className: 'of-vn-tool' },
      h('summary', null, tool.name, tool.result === null ? ' · Running…' : ' · Result'),
      tool.input !== undefined ? h(DataBlock, { label: 'Input', value: tool.input }) : null,
      tool.result ? h(Blocks, { blocks: tool.result, scope }) : null)),
    message.streaming ? h('span', { className: 'of-vn-live', role: 'status' }, 'Replying…') : null)
      : h('div', { className: 'of-vn-write-hint' }, h('span', null, 'Your reply'), h('small', null, scope.privateChat ? `Just you and ${scope.member.bot.name}.` : `Mentioning ${scope.member.bot.name} in ${scope.floor.name}.`)),
    state.historyHost ? createPortal(h('nav', { className: 'of-vn-history', 'aria-label': 'Dialogue history' },
      !writing ? h('button', { type: 'button', className: 'of-vn-reply', onClick: () => { setWriting(true); setAnchor(null); scope.panel.current?.querySelector('[contenteditable="true"]')?.focus() } }, 'Reply') : null,
      state.anchor !== null && index < messages.length - 1 ? h('button', { type: 'button', className: 'of-vn-latest', onClick: () => { setAnchor(null); setWriting(false) } }, `Latest +${messages.length - 1 - index}`) : null,
      h('button', { type: 'button', disabled: loadingOlder || !messages.length || !writing && index <= 0 && !hasMore, 'aria-label': loadingOlder ? 'Loading earlier messages' : 'Previous message', onClick: () => { void move(-1) } }, '←'),
      h('span', { className: 'of-vn-page', 'aria-live': 'polite' }, writing ? 'Reply' : `${index + 1} / ${messages.length}`),
      h('button', { type: 'button', disabled: writing, 'aria-label': 'Next message', onClick: () => { void move(1) } }, '→')), state.historyHost) : null)
}

export function NovelConversation({ renderFactorySlot }) {
  const scope = useContext(novelScope())
  stateContext ??= createContext(null)
  const source = useMemo(() => ({ subscribe: listener => scope.binding.eventSource.subscribe(listener), getSnapshot: () => scope.binding.eventSource.getSnapshot() }), [scope.binding])
  const snapshot = useSyncExternalStore(source.subscribe, source.getSnapshot)
  const [progress, setProgress] = useState([])
  useEffect(() => {
    if (scope.privateChat) return undefined
    let stopped = false, timer
    const read = async () => {
      const next = await scope.actions.roomProgress(scope.floor.id)
      if (stopped) return
      setProgress(previous => JSON.stringify(previous) === JSON.stringify(next) ? previous : next)
      timer = setTimeout(read, document.hidden ? 5000 : 1000)
    }
    void read()
    return () => { stopped = true; clearTimeout(timer) }
  }, [scope.privateChat, scope.floor.id, scope.actions])
  const assistantId = scope.privateChat ? scope.member.bot.id : scope.floor.room?.admin ?? scope.member.bot.id
  const messages = useMemo(() => officeDialogue(snapshot.entries, assistantId, progress), [snapshot, assistantId, progress])
  const [anchor, setAnchor] = useState(null)
  const [writing, setWriting] = useState(messages.length === 0)
  const [historyHost, setHistoryHost] = useState(null)
  const input = useRef(null)
  const index = dialogueIndex(messages, anchor), message = messages[index]
  const speaker = writing || !message || message.speaker === VISITOR.id ? VISITOR : scope.floor.members.find(entry => entry.bot.id === message.speaker || entry.bot.sessionId === message.speaker)?.bot ?? scope.member.bot
  const prepareMention = () => {
    if (scope.privateChat || !input.current) return
    const { actions, draft } = input.current
    const { text, attachmentCount } = draft(), prefix = `@${scope.member.bot.name} `
    // Insert through the public revision guard; replacing the entire draft
    // would flatten file/skill chips and discard their reference identities.
    if ((text.trim() || attachmentCount) && !text.startsWith(prefix) && !text.startsWith('/')) {
      actions.insertText(prefix, { ...actions.captureInsertion(), start: 0, end: 0 })
    }
  }
  const state = { scope, messages, anchor, setAnchor, index, message, writing, setWriting, speaker, input, historyHost, assistantId }
  return h(stateContext.Provider, { value: state },
    h('div', { className: 'of-vn-shell', 'data-writing': writing || undefined },
      h('div', { className: 'of-vn-person', 'data-speaker': speaker.id }, h(AnimePortrait, { bot: speaker, members: scope.floor.members }),
        h('div', { className: 'of-vn-name' }, h('strong', null, speaker.name), h('span', null, writing ? 'Your turn' : message?.streaming ? 'Speaking' : 'Conversation'))),
      h('div', { className: 'of-vn-native', onFocusCapture: event => { if (event.target.closest('[contenteditable="true"]')) { setWriting(true); setAnchor(null) } },
        onInputCapture: () => { setWriting(true); setAnchor(null); queueMicrotask(prepareMention) },
        onKeyDownCapture: event => { if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) prepareMention() },
        onClickCapture: prepareMention },
      renderFactorySlot('conversation.content', { variant: 'embedded', phase: 'active', hero: false }, { slots: { views: NovelViews } })),
      h('div', { className: 'of-vn-footer', ref: setHistoryHost })))
}

export const NOVEL_CSS = `
.of-modern .of-talk-wrap{left:50%;right:auto;transform:translateX(-50%);width:min(1050px,calc(100% - 48px));height:286px;min-height:0;max-height:calc(100% - 110px);bottom:22px}
.of-modern .of-talk-chat{overflow:visible;background:#f9faf5f5;border:1px solid #c3cec0;border-radius:18px 18px 12px 12px;box-shadow:0 12px 38px #243c382b}
.of-talk-chat .of-chat-heading{height:40px;padding:0 16px 0 215px;background:transparent;border:0;border-radius:18px 18px 0 0;gap:12px}
.of-talk-chat .of-chat-heading>div{gap:8px}.of-talk-chat .of-chat-heading strong{font-size:12px;color:#6c7a70;font-weight:500}.of-talk-chat .of-chat-heading span{display:none}
.of-talk-chat .of-chat-heading .of-button,.of-talk-chat .of-chat-heading .of-text-button{font-size:11px;min-height:28px;padding:4px 9px;box-shadow:none;background:transparent;border:0;color:#67766c}
.of-vn-modes{display:flex;gap:2px;padding:3px;background:#e8eee5;border:1px solid #d7dfd1;border-radius:999px;min-width:0}.of-vn-modes button:last-child{max-width:180px;overflow:hidden;text-overflow:ellipsis}
.of-modern .of-vn-modes button{border:0;background:transparent;border-radius:999px;padding:5px 12px;font-size:11px;font-weight:600;color:#728070;cursor:pointer;white-space:nowrap}
.of-modern .of-vn-modes button[aria-pressed=true]{background:#fbfcf8;color:#365b50;box-shadow:0 1px 4px #263c351a}
.of-talk-chat>.of-chat-content{overflow:visible;--dsh-chat-content-width:100%;--dsh-content-font-size:14px}
.of-vn-shell{display:flex;height:100%;min-height:0;position:relative;padding:0 16px 34px 0;gap:8px}
.of-vn-person{width:200px;flex:none;position:relative;pointer-events:none;align-self:stretch}
.of-vn-portrait{position:absolute;bottom:-34px;left:-8px;width:210px;height:308px;object-fit:contain;filter:drop-shadow(3px 1px 0 #fff8);mask-image:linear-gradient(#000 88%,transparent 100%)}
.of-vn-name{position:absolute;left:18px;bottom:-20px;z-index:1;display:flex;flex-direction:column;gap:3px;padding:8px 14px;background:#f7faf0ed;border-left:3px solid #789b82;min-width:128px;box-shadow:0 3px 14px #233a2b12}
.of-vn-name strong{font-size:17px;font-weight:600;color:#315347}.of-vn-name span{font-size:10px;color:#7b8c7b}
.of-vn-native{flex:1;min-width:0;min-height:0;display:flex;flex-direction:column}.of-vn-native>div{height:100%;min-height:0}
.of-vn-view{display:flex;flex:1;min-height:0;flex-direction:column;overflow:hidden}
.of-vn-message{flex:1;min-height:0;overflow:auto;overscroll-behavior:contain;padding:7px 18px 12px 10px;color:#35483d;line-height:1.75;scrollbar-width:thin;scrollbar-color:#bdcbbb transparent;overflow-wrap:anywhere}
.of-vn-message p{margin:0 0 9px}.of-vn-message pre{overflow:auto;max-width:100%}.of-vn-message table{display:block;overflow:auto}.of-vn-message img{max-width:100%;max-height:240px;object-fit:contain}.of-vn-message:focus-visible{outline:2px solid #829c80;outline-offset:-2px;border-radius:6px}
.of-vn-thinking{font-size:12px;color:#768273;margin-bottom:8px;border-left:2px solid #ccd8c5;padding-left:10px}.of-vn-thinking summary{cursor:pointer;font-size:11px}.of-vn-thinking>div{white-space:pre-wrap;line-height:1.65;padding-top:6px}
.of-vn-tool{font-size:12px;margin:7px 0;color:#5f7569}.of-vn-tool summary{cursor:pointer}.of-vn-file{padding:6px 0}.of-vn-live{font-size:11px;color:#7c9480}
.of-vn-write-hint{padding:9px 10px;display:flex;flex-direction:column;gap:5px}.of-vn-write-hint>span{font-size:16px;color:#456551}.of-vn-write-hint small{font-size:11px;color:#859080}
.of-vn-footer{position:absolute;right:17px;bottom:4px;z-index:30}.of-vn-history{height:27px;display:flex;align-items:center;gap:6px}
.of-modern .of-vn-history button{display:grid;place-items:center;min-width:28px;height:26px;background:transparent;border:1px solid transparent;border-radius:6px;color:#4d705c;font-size:17px;cursor:pointer}.of-modern .of-vn-history button:hover{background:#e4ecde;border-color:#d0ddc8}.of-modern .of-vn-history button:disabled{opacity:.3;cursor:default}.of-vn-page{font-size:10px;color:#899482;min-width:43px;text-align:center;font-variant-numeric:tabular-nums}
.of-modern .of-vn-history .of-vn-reply,.of-modern .of-vn-history .of-vn-latest{font-size:11px;padding:0 8px;border-color:#d5dfce;background:#f7faf2}
.of-vn-native [data-composer-card]{border-radius:11px!important;background:#ffffffb8!important;border-color:#d3decc!important;box-shadow:0 2px 8px #3d5b4310!important}
.of-vn-native [data-composer-seat]{padding:0 8px!important;background:none!important}.of-vn-native [contenteditable=true]{min-height:30px!important;max-height:94px!important;font-size:13px!important}
.of-modern:has(.of-talk-chat) .of-camera-tools{bottom:322px}.of-modern:has(.of-talk-chat) .of-left-rail{max-height:calc(100% - 400px)}
@container office (max-width:760px){.of-modern .of-talk-wrap{width:calc(100% - 24px);height:280px;bottom:12px}.of-talk-chat .of-chat-heading{padding-left:150px}.of-talk-chat .of-chat-heading>div:first-child{display:none}.of-talk-chat .of-chat-heading>div:last-child{margin-left:auto}.of-vn-person{width:140px}.of-vn-portrait{width:166px;height:244px;bottom:-34px;left:-10px}.of-vn-name{left:8px;min-width:105px;padding:7px 10px}.of-vn-name strong{font-size:15px}.of-vn-native [class*="_composerSeat"]{padding:0!important}.of-vn-shell{gap:0;padding-right:10px}.of-vn-modes button{padding:4px 9px!important}}
@container office (max-width:480px){.of-modern .of-talk-wrap{height:300px;width:calc(100% - 16px)}.of-talk-chat .of-chat-heading{padding:0 8px 0 0;height:38px;flex-wrap:nowrap}.of-talk-chat .of-chat-heading .of-text-button{display:none}.of-vn-person{width:96px}.of-vn-portrait{width:132px;height:194px;bottom:-34px;left:-22px}.of-vn-name{left:4px;min-width:85px;padding:5px 6px}.of-vn-name strong{font-size:13px}.of-vn-name span{font-size:9px}.of-vn-message{padding:5px 6px;font-size:13px}.of-vn-shell{padding-right:8px}.of-vn-history{right:10px}.of-modern:has(.of-talk-chat) .of-camera-tools{bottom:325px}}
`
