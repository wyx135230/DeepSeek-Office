import { createContext, createElement as h, useContext, useEffect, useRef, useState } from 'react'
import { novelScope, NovelConversation, NOVEL_CSS } from './novel.js'
import { AnimePortrait } from './novel-portrait.js'

// The phone supplies a renderer for the chat body without teaching the office
// chat panel about phone layout: a host with a body function provides this
// context, OfficeConversation hands the render back to it.
let phoneScopeContext
export const phoneScope = () => phoneScopeContext ??= createContext(null)

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

export function MeetingPrompt({ onClose, onStart, active = true }) {
  const ref = useRef(null)
  useOfficeDialog(ref, active)
  return h('section', { ref, className: 'of-meeting-prompt', role: 'dialog', 'aria-modal': true, 'aria-label': 'Start a meeting?' },
    h('h2', null, 'Start a meeting?'), h('p', null, 'Take the head seat and invite your team. Messages go to this group’s existing conversation.'),
    h('footer', null, h('button', { type: 'button', className: 'of-button', onClick: onClose }, 'Not now'), h('button', { type: 'button', className: 'of-button of-primary', 'data-office-autofocus': true, onClick: onStart }, 'Start meeting')))
}

export function OfficeConversation({ renderFactorySlot }) {
  const novel = useContext(novelScope())
  const phone = useContext(phoneScope())
  if (novel) return h(NovelConversation, { renderFactorySlot })
  if (phone) return phone.render(renderFactorySlot)
  return renderFactorySlot('conversation.content', { variant: 'embedded', phase: 'active', hero: false })
}

function ScopedConversation({ renderSlot }) {
  return renderSlot('ds-bot.office.conversation', {})
}

export function OfficeGroupChat({ roomId, sessionId = roomId, actions, SessionProvider, renderSlot, novel, body }) {
  const [state, setState] = useState({ reference: null, error: '' })
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    let stopped = false, reference
    setState({ reference: null, error: '' })
    try {
      reference = actions.retainOfficeChat(sessionId)
      void reference.ready.then(binding => { if (!stopped) setState({ reference, binding, error: '' }) }, error => { if (!stopped) setState({ reference: null, error: error?.message ?? String(error) }) })
    } catch (error) { setState({ reference: null, error: error?.message ?? String(error) }) }
    return () => { stopped = true; reference?.release() }
  }, [sessionId, retry])
  if (state.error) return h('div', { className: 'of-chat-loading', role: 'alert' }, state.error, h('button', { type: 'button', className: 'of-button', onClick: () => setRetry(n => n + 1) }, 'Retry'))
  if (!state.reference) return h('div', { className: 'of-chat-loading', role: 'status' }, 'Opening the conversation…')
  const content = h(ScopedConversation, { renderSlot })
  return h(novelScope().Provider, { value: novel ? { ...novel, binding: state.binding, actions, sessionId } : null },
    h(SessionProvider, { session: state.reference },
      body ? h(phoneScope().Provider, { value: body({ binding: state.binding, actions, sessionId }) }, content) : content))
}

export function OfficeChatPanel({ board, floor, member, onClose, onBoard, active = true, ...props }) {
  const ref = useRef(null)
  const [privateChat, setPrivateChat] = useState(true)
  useOfficeDialog(ref, board && active)
  const sessionId = member && privateChat ? member.bot.sessionId ?? member.bot.id : floor.id
  return h('div', { className: board ? 'of-board-backdrop' : `of-meeting-chat-wrap${member ? ' of-talk-wrap' : ''}` },
    h('section', { ref, className: `of-group-chat ${board ? 'of-group-board' : 'of-meeting-chat'}${member ? ' of-talk-chat' : ''}`, style: { '--bt-placeholder': JSON.stringify(`Message ${member && privateChat ? member.bot.name : floor.name}`) }, role: 'dialog', 'aria-modal': board || undefined, 'aria-label': member ? `Talk to ${member.bot.name}` : board ? 'Group display' : 'Meeting conversation' },
      h('header', { className: 'of-chat-heading' }, h('div', null, h('strong', null, member ? member.bot.name : board ? 'Group display' : 'Team meeting'), h('span', null, member && privateChat ? 'Private conversation' : floor.name)),
        h('div', null, member ? h('div', { className: 'of-vn-modes', role: 'group', 'aria-label': 'Conversation destination' },
          h('button', { type: 'button', 'aria-pressed': privateChat, onClick: () => setPrivateChat(true) }, 'Private'),
          h('button', { type: 'button', 'aria-pressed': !privateChat, onClick: () => setPrivateChat(false) }, `Group @${member.bot.name}`)) : null,
          !member && !board ? h('button', { type: 'button', className: 'of-text-button', onClick: onBoard }, 'Open display') : null,
          h('button', { type: 'button', className: 'of-button', onClick: onClose }, member ? 'Leave conversation' : board ? 'Close display' : 'End meeting'))),
      h('div', { className: 'of-chat-content' },
        !member ? h('aside', { className: 'of-meeting-person', 'aria-hidden': true },
          h(AnimePortrait, { bot: floor.members[0]?.bot ?? { id: 'studio-visitor', name: 'You' }, members: floor.members }),
          h('div', { className: 'of-meeting-name' }, h('strong', null, floor.name), h('span', null, `${floor.members.length} teammates`))) : null,
        h(OfficeGroupChat, { key: sessionId, roomId: floor.id, sessionId, ...props,
        novel: member ? { floor, member, privateChat, panel: ref } : null }))))
}

export const MEETING_CSS = `
.of-modern .of-group-chat{display:flex;flex-direction:column;min-height:0;overflow:hidden;background:#f8faf7;color:#26343f;border:1px solid #b7c8c9;border-radius:12px;box-shadow:0 12px 40px #20363c26;font-family:'Segoe UI',system-ui,sans-serif;--bt-main:#f8faf7;--bt-card:#fff;--bt-ink:#26343f;--bt-ink-2:#65757c;--bt-ink-3:#71848a;--bt-bubble:#e8eeeb;--bt-user:#3b7180;--bt-user-ink:#fff;--bt-accent:#3b7180;--bt-accent-ink:#fff;--bt-line:#ccd5d2;--bt-line-2:#b7c8c9}
.of-meeting-chat-wrap{position:absolute;z-index:18;left:50%;right:auto;transform:translateX(-50%);bottom:22px;width:min(1050px,calc(100% - 48px));height:min(330px,calc(100% - 90px));min-height:0;pointer-events:none}.of-meeting-chat{height:100%;pointer-events:auto}
.of-chat-heading{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 16px;background:#eaf0ee;border-bottom:1px solid #ccd5d2;flex:none}.of-chat-heading>div{display:flex;align-items:center;gap:14px}.of-chat-heading strong{font-size:15px;font-weight:600}.of-chat-heading span{font-size:12px;color:#65757c;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.of-chat-content{display:flex;flex-direction:column;flex:1;min-height:0;min-width:0;--dsh-chat-content-width:720px;--dsh-content-font-size:14px}.of-chat-content>div{min-height:0;max-width:100%}.of-chat-loading{padding:24px;display:flex;gap:12px;align-items:center}
.of-chat-content [class*="_composerSeat"]{background:linear-gradient(transparent,#f8faf7 36px)!important;color:#65757c}
.of-group-chat{--dsw-alias-bg-base:#f8faf7;--dsw-specific-input-major:#f8faf7;--dsw-alias-label-primary:#26343f;--dsw-alias-label-secondary:#65757c;--dsw-alias-label-tertiary:#71848a}
.of-board-backdrop{position:absolute;inset:0;display:grid;place-items:center;z-index:32;background:#263e4b52;padding:30px;backdrop-filter:blur(3px)}.of-group-board{height:min(820px,88%);width:min(960px,94%)}
.of-modern .of-meeting-prompt{position:absolute;z-index:24;left:50%;top:45%;transform:translate(-50%,-50%);width:min(360px,calc(100% - 32px));padding:24px;background:#f8faf7;border:1px solid #b7c8c9;border-radius:12px;box-shadow:0 10px 40px #20363c26}.of-meeting-prompt h2{margin:0 0 8px;font-size:20px}.of-meeting-prompt p{color:#65757c}.of-meeting-prompt footer{display:flex;gap:12px;justify-content:flex-end;margin-top:22px}
.of-modern:has(.of-meeting-chat) .of-left-rail{max-height:calc(62% - 130px)}
.of-modern:has(.of-meeting-chat) .of-camera-tools{bottom:calc(38% + 28px)}.of-modern .of-world-speech{font-size:12px;max-height:72px;overflow:hidden}
.of-chat-heading label{display:flex;align-items:center;gap:5px;white-space:nowrap}.of-talk-chat .of-chat-heading>div:last-child{gap:8px}
.of-modern .of-meeting-chat:not(.of-talk-chat){position:relative;border-color:#c3cec0;border-radius:18px 18px 12px 12px;background:#f9faf5f5;box-shadow:0 12px 38px #243c382b}
.of-meeting-chat:not(.of-talk-chat)>.of-chat-heading{min-height:42px;padding:6px 14px 6px 174px;background:transparent;border-bottom:1px solid #dce4d5;gap:8px}
.of-meeting-chat:not(.of-talk-chat) .of-chat-heading>div{min-width:0;gap:8px}.of-meeting-chat:not(.of-talk-chat) .of-chat-heading>div:first-child{flex:1}.of-meeting-chat:not(.of-talk-chat) .of-chat-heading strong{font-size:13px;white-space:nowrap;color:#4d6c58}.of-meeting-chat:not(.of-talk-chat) .of-chat-heading span{font-size:11px;max-width:160px}
.of-meeting-chat:not(.of-talk-chat) .of-chat-heading :is(.of-button,.of-text-button){min-height:28px;padding:4px 9px;border:1px solid #d2ddca;border-radius:7px;background:#f3f7ed;box-shadow:none;font-size:11px;color:#4d6c58;white-space:nowrap}
.of-meeting-chat:not(.of-talk-chat)>.of-chat-content{position:relative;padding:0 14px 10px 174px;--dsh-chat-content-width:100%;--dsh-content-font-size:13px}
.of-meeting-person{display:none}.of-meeting-chat:not(.of-talk-chat) .of-meeting-person{display:block;position:absolute;left:0;top:-42px;bottom:0;width:160px;pointer-events:none;background:linear-gradient(125deg,#eaf1e580,transparent 85%)}
.of-meeting-person .of-vn-portrait{width:190px;height:279px;left:-17px;bottom:15px;mask-image:linear-gradient(#000 82%,transparent 100%)}
.of-meeting-name{position:absolute;left:12px;right:4px;bottom:12px;display:flex;flex-direction:column;gap:4px;padding:9px 10px;border-left:2px solid #8eaf99;background:#f4f8ede8;color:#426453}.of-meeting-name strong{font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.of-meeting-name span{font-size:10px;color:#78907d}
.of-meeting-chat:not(.of-talk-chat) [data-composer-seat]{padding:0!important;background:none!important}.of-meeting-chat:not(.of-talk-chat) [data-composer-card]{border-radius:11px!important;background:#ffffffb8!important;border-color:#d3decc!important;box-shadow:0 2px 8px #3d5b4310!important}.of-meeting-chat:not(.of-talk-chat) [contenteditable=true]{max-height:88px!important;font-size:13px!important}
@container office (max-width:900px){.of-meeting-chat-wrap{width:calc(100% - 24px);bottom:12px}.of-chat-heading span{display:none}.of-board-backdrop{padding:12px}.of-group-board{width:100%;height:90%}}
@container office (max-width:680px){.of-meeting-chat:not(.of-talk-chat) .of-meeting-person{display:none}.of-meeting-chat:not(.of-talk-chat)>.of-chat-heading{padding-left:12px}.of-meeting-chat:not(.of-talk-chat)>.of-chat-content{padding-left:10px;padding-right:10px}.of-meeting-chat-wrap{height:min(320px,calc(100% - 80px))}}
@container office (max-width:480px){.of-chat-heading{flex-wrap:wrap;padding:8px 10px;gap:5px}.of-chat-heading>div:last-child{margin-left:auto}.of-chat-heading .of-button{min-height:32px;padding:4px 9px;font-size:12px}}
${NOVEL_CSS}
`
