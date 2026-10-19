import { createElement as h, useEffect, useRef, useState } from 'react'

export function useOfficeDialog(ref, active = true) {
  useEffect(() => {
    if (!active) return undefined
    const panel = ref.current, previous = document.activeElement
    const controls = () => [...panel.querySelectorAll('button:not(:disabled),a[href],input:not(:disabled),textarea:not(:disabled),[contenteditable="true"],[tabindex="0"]')].filter(el => el.getClientRects().length)
    ;(panel.querySelector('[data-office-autofocus]') ?? controls()[0])?.focus()
    const trap = event => {
      if (event.key !== 'Tab') return
      const items = controls(), first = items[0], last = items.at(-1)
      if (event.shiftKey && (document.activeElement === first || !panel.contains(document.activeElement))) { event.preventDefault(); last?.focus() }
      else if (!event.shiftKey && (document.activeElement === last || !panel.contains(document.activeElement))) { event.preventDefault(); first?.focus() }
    }
    document.addEventListener('keydown', trap)
    return () => { document.removeEventListener('keydown', trap); if (previous?.isConnected) previous.focus({ preventScroll: true }); else if (panel.isConnected) panel.querySelector('button')?.focus() }
  }, [active])
}

export function MeetingPrompt({ onClose, onStart }) {
  const ref = useRef(null)
  useOfficeDialog(ref)
  return h('section', { ref, className: 'of-meeting-prompt', role: 'dialog', 'aria-modal': true, 'aria-label': 'Start a meeting?' },
    h('h2', null, 'Start a meeting?'), h('p', null, 'Take the head seat and invite your team. Messages go to this group’s existing conversation.'),
    h('footer', null, h('button', { type: 'button', className: 'of-button', onClick: onClose }, 'Not now'), h('button', { type: 'button', className: 'of-button of-primary', 'data-office-autofocus': true, onClick: onStart }, 'Start meeting')))
}

export function OfficeConversation({ renderFactorySlot }) {
  return renderFactorySlot('conversation.content', { variant: 'embedded', phase: 'active', hero: false })
}

function ScopedConversation({ renderSlot }) {
  return renderSlot('ds-bot.office.conversation', {})
}

export function OfficeGroupChat({ roomId, actions, SessionProvider, renderSlot, sceneApi }) {
  const [state, setState] = useState({ reference: null, error: '' })
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    let stopped = false, reference
    setState({ reference: null, error: '' })
    try {
      reference = actions.retainOfficeChat(roomId)
      void reference.ready.then(() => { if (!stopped) setState({ reference, error: '' }) }, error => { if (!stopped) setState({ reference: null, error: error?.message ?? String(error) }) })
    } catch (error) { setState({ reference: null, error: error?.message ?? String(error) }) }
    const off = actions.watchOfficeSpeech(roomId, (id, text) => sceneApi.current?.say(id, text))
    return () => { stopped = true; off(); reference?.release() }
  }, [roomId, retry])
  if (state.error) return h('div', { className: 'of-chat-loading', role: 'alert' }, state.error, h('button', { type: 'button', className: 'of-button', onClick: () => setRetry(n => n + 1) }, 'Retry'))
  if (!state.reference) return h('div', { className: 'of-chat-loading', role: 'status' }, 'Opening the group conversation…')
  return h(SessionProvider, { session: state.reference }, h(ScopedConversation, { renderSlot }))
}

export function OfficeChatPanel({ board, floor, onClose, onBoard, ...props }) {
  const ref = useRef(null)
  useOfficeDialog(ref, board)
  return h('div', { className: board ? 'of-board-backdrop' : 'of-meeting-chat-wrap' },
    h('section', { ref, className: `of-group-chat ${board ? 'of-group-board' : 'of-meeting-chat'}`, style: { '--bt-placeholder': JSON.stringify(`Message ${floor.name}`) }, role: 'dialog', 'aria-modal': board || undefined, 'aria-label': board ? 'Group display' : 'Meeting conversation' },
      h('header', { className: 'of-chat-heading' }, h('div', null, h('strong', null, board ? 'Group display' : 'Team meeting'), h('span', null, floor.name)),
        h('div', null, !board ? h('button', { type: 'button', className: 'of-text-button', onClick: onBoard }, 'Open display') : null,
          h('button', { type: 'button', className: 'of-button', onClick: onClose }, board ? 'Close display' : 'End meeting'))),
      h('div', { className: 'of-chat-content' }, h(OfficeGroupChat, { key: floor.id, roomId: floor.id, ...props }))))
}

export const MEETING_CSS = `
.of-modern .of-group-chat{display:flex;flex-direction:column;min-height:0;overflow:hidden;background:#f8faf7;color:#26343f;border:1px solid #b7c8c9;border-radius:12px;box-shadow:0 12px 40px #20363c26;font-family:'Segoe UI',system-ui,sans-serif;--bt-main:#f8faf7;--bt-card:#fff;--bt-ink:#26343f;--bt-ink-2:#65757c;--bt-ink-3:#71848a;--bt-bubble:#e8eeeb;--bt-user:#3b7180;--bt-user-ink:#fff;--bt-accent:#3b7180;--bt-accent-ink:#fff;--bt-line:#ccd5d2;--bt-line-2:#b7c8c9}
.of-meeting-chat-wrap{position:absolute;z-index:18;left:260px;right:22px;bottom:18px;height:38%;min-height:280px;max-height:460px;pointer-events:none}.of-meeting-chat{height:100%;pointer-events:auto}
.of-chat-heading{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 16px;background:#eaf0ee;border-bottom:1px solid #ccd5d2;flex:none}.of-chat-heading>div{display:flex;align-items:center;gap:14px}.of-chat-heading strong{font-size:15px;font-weight:600}.of-chat-heading span{font-size:12px;color:#65757c;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.of-chat-content{display:flex;flex-direction:column;flex:1;min-height:0;min-width:0;--dsh-chat-content-width:720px;--dsh-content-font-size:14px}.of-chat-content>div{min-height:0;max-width:100%}.of-chat-loading{padding:24px;display:flex;gap:12px;align-items:center}
.of-chat-content [class*="_composerSeat"]{background:linear-gradient(transparent,#f8faf7 36px)!important;color:#65757c}
.of-group-chat{--dsw-alias-bg-base:#f8faf7;--dsw-specific-input-major:#f8faf7;--dsw-alias-label-primary:#26343f;--dsw-alias-label-secondary:#65757c;--dsw-alias-label-tertiary:#71848a}
.of-board-backdrop{position:absolute;inset:0;display:grid;place-items:center;z-index:32;background:#263e4b52;padding:30px;backdrop-filter:blur(3px)}.of-group-board{height:min(820px,88%);width:min(960px,94%)}
.of-modern .of-meeting-prompt{position:absolute;z-index:24;left:50%;top:45%;transform:translate(-50%,-50%);width:min(360px,calc(100% - 32px));padding:24px;background:#f8faf7;border:1px solid #b7c8c9;border-radius:12px;box-shadow:0 10px 40px #20363c26}.of-meeting-prompt h2{margin:0 0 8px;font-size:20px}.of-meeting-prompt p{color:#65757c}.of-meeting-prompt footer{display:flex;gap:12px;justify-content:flex-end;margin-top:22px}
.of-modern:has(.of-meeting-chat) .of-left-rail{max-height:calc(62% - 130px)}
.of-modern:has(.of-meeting-chat) .of-camera-tools{bottom:calc(38% + 28px)}.of-modern .of-world-speech{font-size:12px;max-height:72px;overflow:hidden}
@container office (max-width:900px){.of-meeting-chat-wrap{left:16px;right:16px;bottom:16px;height:38%;min-height:240px}.of-chat-heading span{display:none}.of-board-backdrop{padding:12px}.of-group-board{width:100%;height:90%}}
@container office (max-width:480px){.of-chat-heading{flex-wrap:wrap;padding:8px 10px;gap:5px}.of-chat-heading>div:last-child{margin-left:auto}.of-chat-heading .of-button{min-height:32px;padding:4px 9px;font-size:12px}}
`
