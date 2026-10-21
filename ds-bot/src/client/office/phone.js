// The phone's hardware shell, home screen, chat list and contacts. The shell owns
// the frame, navigation, focus and Escape. A conversation's Session belongs to
// PhoneChat, which is mounted only while its screen is open and released on back
// or put-away.
import { createElement as h, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { avatarCanvas } from './portrait.js'
import { groupAvatarMembers, phoneChats, phoneClock, phoneContacts, phonePreview, phoneSearch, phoneStamp } from './phone-data.js'
import { PhoneChat } from './phone-chat.js'
import { PhoneBrowser } from './phone-browser.js'

const FOCUSABLE = 'button:not([disabled]),a[href],input:not([disabled]),textarea:not([disabled]),iframe,[contenteditable="true"],[tabindex="0"]'

function StatusSignal() {
  return h('svg', { viewBox: '0 0 15 11', width: 15, height: 11, 'aria-hidden': true },
    h('rect', { x: 0.4, y: 8, width: 2.4, height: 3, rx: 0.8, fill: 'currentColor' }),
    h('rect', { x: 4.3, y: 6, width: 2.4, height: 5, rx: 0.8, fill: 'currentColor' }),
    h('rect', { x: 8.2, y: 3.6, width: 2.4, height: 7.4, rx: 0.8, fill: 'currentColor' }),
    h('rect', { x: 12.1, y: 1, width: 2.4, height: 10, rx: 0.8, fill: 'currentColor' }))
}

function StatusWifi() {
  return h('svg', { viewBox: '0 0 16 12', width: 15, height: 11, fill: 'none', 'aria-hidden': true },
    h('path', { d: 'M1.4 4.7a10.6 10.6 0 0 1 13.2 0', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round' }),
    h('path', { d: 'M4 7.4a7 7 0 0 1 8 0', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round' }),
    h('circle', { cx: 8, cy: 10, r: 1.3, fill: 'currentColor' }))
}

function StatusBattery() {
  return h('svg', { viewBox: '0 0 22 12', width: 20, height: 11, fill: 'none', 'aria-hidden': true },
    h('rect', { x: 1, y: 1.5, width: 17, height: 9, rx: 2.4, stroke: 'currentColor', strokeWidth: 1.3 }),
    h('rect', { x: 3.2, y: 3.7, width: 11, height: 4.6, rx: 1.1, fill: 'currentColor' }),
    h('path', { d: 'M19.8 4.6v2.8', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' }))
}

// Two overlapping speech bubbles with three dots: the app tile's own mark, not
// any vendor's logo.
function ChatAppGlyph({ size = 34 }) {
  return h('svg', { viewBox: '0 0 40 40', width: size, height: size, 'aria-hidden': true },
    h('rect', { x: 6, y: 6, width: 24, height: 18, rx: 6, fill: '#5f8a74' }),
    h('path', { d: 'M11 23h5v5z', fill: '#5f8a74' }),
    h('rect', { x: 16, y: 15, width: 22, height: 17, rx: 6, fill: '#f7f0dd', stroke: '#5f8a74', strokeWidth: 1.6 }),
    h('path', { d: 'M22 31h5v5z', fill: '#f7f0dd', stroke: '#5f8a74', strokeWidth: 1.6, strokeLinejoin: 'round' }),
    h('circle', { cx: 22, cy: 23.5, r: 1.7, fill: '#5f8a74' }),
    h('circle', { cx: 27, cy: 23.5, r: 1.7, fill: '#5f8a74' }),
    h('circle', { cx: 32, cy: 23.5, r: 1.7, fill: '#5f8a74' }))
}

// A browser tile for the home screen: a simple globe, not any vendor's mark.
function BrowserAppGlyph({ size = 34 }) {
  return h('svg', { viewBox: '0 0 40 40', width: size, height: size, fill: 'none', stroke: '#4e7a68', strokeWidth: 1.8, 'aria-hidden': true },
    h('circle', { cx: 20, cy: 20, r: 11 }),
    h('path', { d: 'M9 20h22', strokeLinecap: 'round' }),
    h('path', { d: 'M20 9c3.4 3.3 5.1 7 5.1 11S23.4 27.7 20 31c-3.4-3.3-5.1-7-5.1-11S16.6 12.3 20 9z' }))
}

function ChatTabIcon({ size = 21 }) {
  return h('svg', { viewBox: '0 0 24 24', width: size, height: size, fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true },
    h('path', { d: 'M20 4H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h4v4l5-4h7a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1z' }),
    h('path', { d: 'M8 9h8M8 12.5h5' }))
}

function PeopleIcon({ size = 21 }) {
  return h('svg', { viewBox: '0 0 24 24', width: size, height: size, fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true },
    h('circle', { cx: 9, cy: 8.5, r: 3 }),
    h('path', { d: 'M3.5 19.5c.6-3.2 2.7-5 5.5-5s4.9 1.8 5.5 5' }),
    h('path', { d: 'M15.5 6.2a3 3 0 0 1 0 5.6M17 14.8c2 .6 3.3 2.2 3.7 4.7' }))
}

function SearchIcon({ size = 18 }) {
  return h('svg', { viewBox: '0 0 24 24', width: size, height: size, fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', 'aria-hidden': true },
    h('circle', { cx: 10.5, cy: 10.5, r: 5.5 }),
    h('path', { d: 'm15 15 4.5 4.5' }))
}

function CloseIcon({ size = 17 }) {
  return h('svg', { viewBox: '0 0 24 24', width: size, height: size, fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', 'aria-hidden': true },
    h('path', { d: 'M6 6l12 12M18 6L6 18' }))
}

function BackIcon({ size = 19 }) {
  return h('svg', { viewBox: '0 0 24 24', width: size, height: size, fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true },
    h('path', { d: 'M14.5 5.5 8 12l6.5 6.5' }))
}

function AvatarCanvas({ bot, className }) {
  const ref = useRef(null)
  const avatarKey = JSON.stringify(bot?.officeAvatar ?? null)
  useEffect(() => {
    const target = ref.current
    if (!target) return
    const image = avatarCanvas(bot ?? { id: 'teammate', name: 'Teammate' })
    target.width = image.width * 2
    target.height = image.height * 2
    const context = target.getContext('2d')
    context.imageSmoothingEnabled = false
    context.clearRect(0, 0, target.width, target.height)
    context.drawImage(image, 0, 0, target.width, target.height)
  }, [bot, avatarKey])
  return h('canvas', { ref, className, 'aria-hidden': true })
}

function GroupAvatar({ entry }) {
  const members = groupAvatarMembers(entry, 4)
  if (!members.length) return h('span', { className: 'of-phone-avatar', 'aria-hidden': true }, h(ChatTabIcon, { size: 22 }))
  if (members.length === 1) return h('span', { className: 'of-phone-avatar' }, h(AvatarCanvas, { bot: members[0], className: 'of-phone-avatar-canvas' }))
  return h('span', { className: 'of-phone-avatar of-phone-mosaic', 'aria-hidden': true },
    Array.from({ length: 4 }, (_, index) => {
      const bot = members[index]
      return h('span', { key: bot?.id ?? `empty-${index}`, className: 'of-phone-mosaic-cell' },
        bot ? h(AvatarCanvas, { bot, className: 'of-phone-mosaic-canvas' }) : null)
    }))
}

function ChatRow({ entry, now, docked, subtitle, onOpen }) {
  const isDocked = docked.includes(entry.sessionId)
  const stamp = phoneStamp(entry.updatedAt, now)
  return h('button', {
    type: 'button',
    className: 'of-phone-row',
    'data-docked': isDocked || undefined,
    'aria-disabled': isDocked || undefined,
    'aria-label': isDocked ? `${entry.name}. Open on the office screen.` : undefined,
    title: isDocked ? 'Open on the office screen' : undefined,
    onClick: () => onOpen(entry),
  },
  entry.kind === 'group' ? h(GroupAvatar, { entry }) : h('span', { className: 'of-phone-avatar' }, h(AvatarCanvas, { bot: entry.bot, className: 'of-phone-avatar-canvas' })),
  h('span', { className: 'of-phone-row-main' },
    h('strong', { className: 'of-phone-row-name' }, entry.name),
    h('span', { className: 'of-phone-row-preview' }, isDocked ? 'Open on the office screen' : subtitle)),
  h('span', { className: 'of-phone-row-side' },
    stamp ? h('span', { className: 'of-phone-row-time' }, stamp) : null,
    !isDocked && entry.unread ? h('span', { className: 'of-phone-unread', role: 'img', 'aria-label': 'Unread messages' }) : null))
}

function EmptyState({ glyph, title, body }) {
  return h('div', { className: 'of-phone-empty' },
    h('span', { className: 'of-phone-empty-glyph', 'aria-hidden': true }, glyph === 'people' ? h(PeopleIcon, { size: 26 }) : h(ChatTabIcon, { size: 26 })),
    h('strong', null, title),
    h('p', null, body))
}

function StatusBar({ now }) {
  return h('div', { className: 'of-phone-status' },
    h('span', { className: 'of-phone-status-time' }, phoneClock(now)),
    h('span', { className: 'of-phone-status-icons', 'aria-hidden': true }, h(StatusSignal), h(StatusWifi), h(StatusBattery)))
}

function HomeScreen({ now, onOpen, appIconRef }) {
  const date = new Date(now).toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' })
  return h('div', { className: 'of-phone-home' },
    h('div', { className: 'of-phone-wall', 'aria-hidden': true },
      h('span', { className: 'of-phone-wall-window w1' }),
      h('span', { className: 'of-phone-wall-window w2' }),
      h('span', { className: 'of-phone-wall-leaf l1' }),
      h('span', { className: 'of-phone-wall-leaf l2' })),
    h('div', { className: 'of-phone-home-main' },
      h('div', { className: 'of-phone-clock' }, phoneClock(now)),
      h('div', { className: 'of-phone-date' }, date),
      h('div', { className: 'of-phone-apps' },
        h('button', { ref: appIconRef, type: 'button', className: 'of-phone-app-tile', onClick: () => onOpen('chats'), 'aria-label': 'Chats', title: 'Chats' },
          h('span', { className: 'of-phone-app-icon' }, h(ChatAppGlyph, { size: 34 })),
          h('span', { className: 'of-phone-app-label' }, 'Chats')),
        h('button', { type: 'button', className: 'of-phone-app-tile', onClick: () => onOpen('browser'), 'aria-label': 'Browser', title: 'Browser' },
          h('span', { className: 'of-phone-app-icon' }, h(BrowserAppGlyph, { size: 34 })),
          h('span', { className: 'of-phone-app-label' }, 'Browser')))),
    h('div', { className: 'of-phone-home-foot' },
      h('span', { className: 'of-phone-hint' }, h('kbd', null, 'Esc'), ' puts the phone away')),
    h('div', { className: 'of-phone-indicator', 'aria-hidden': true }))
}

function contactSubtitle(entry) {
  if (entry.role) return entry.role
  return entry.kind === 'group' ? `${entry.members?.length ?? 0} members` : 'Teammate'
}

function AppScreen({ tab, searching, query, chats, contacts, now, docked, onBack, onTab, onOpen, onQuery, onToggleSearch, backRef, searchRef, searchButtonRef }) {
  const needle = query.trim()
  const chatList = phoneSearch(chats, query)
  const groups = phoneSearch(contacts.groups, query)
  const teammates = phoneSearch(contacts.teammates, query)
  const filtering = needle.length > 0
  const row = entry => h(ChatRow, {
    key: entry.id,
    entry,
    now,
    docked,
    subtitle: tab === 'contacts' ? contactSubtitle(entry) : phonePreview(entry),
    onOpen,
  })
  const emptyTitle = filtering ? 'No matches' : tab === 'contacts' ? 'No teammates yet' : 'No chats yet'
  const emptyBody = filtering ? `Nothing matches “${needle}”.` : tab === 'contacts' ? 'The team roster is empty.' : 'Your team is one tap away.'
  const list = tab === 'chats'
    ? (chatList.length ? chatList.map(row) : h(EmptyState, { glyph: 'chat', title: emptyTitle, body: emptyBody }))
    : (groups.length === 0 && teammates.length === 0
        ? h(EmptyState, { glyph: 'people', title: emptyTitle, body: emptyBody })
        : h('div', null,
            groups.length ? h('div', { className: 'of-phone-section' }, 'Group chats') : null,
            groups.map(row),
            teammates.length ? h('div', { className: 'of-phone-section' }, 'All teammates') : null,
            teammates.map(row)))
  const tabButton = (id, Icon, label) => h('button', {
    key: id, type: 'button', role: 'tab', className: 'of-phone-tab', 'aria-selected': tab === id, onClick: () => onTab(id),
  }, h(Icon, { size: 21 }), h('span', null, label))
  return h('div', { className: 'of-phone-app', 'data-tab': tab },
    h('header', { className: 'of-phone-topbar' },
      h('button', { ref: backRef, type: 'button', className: 'of-phone-icon-button', 'aria-label': 'Back to home screen', title: 'Back to home screen', onClick: onBack }, h(BackIcon, { size: 19 })),
      h('h2', { className: 'of-phone-title' }, tab === 'contacts' ? 'Contacts' : 'Chats'),
      h('button', { ref: searchButtonRef, type: 'button', className: 'of-phone-icon-button', 'aria-label': searching ? 'Close search' : 'Search', title: searching ? 'Close search' : 'Search', 'aria-expanded': searching, onClick: onToggleSearch },
        searching ? h(CloseIcon, { size: 17 }) : h(SearchIcon, { size: 18 }))),
    searching
      ? h('div', { className: 'of-phone-search' },
          h('input', {
            ref: searchRef,
            type: 'search',
            value: query,
            placeholder: tab === 'contacts' ? 'Search contacts' : 'Search chats',
            'aria-label': tab === 'contacts' ? 'Search contacts' : 'Search chats',
            autoComplete: 'off',
            onChange: event => onQuery(event.target.value),
          }))
      : null,
    h('div', { className: 'of-phone-list' }, list),
    h('nav', { className: 'of-phone-tabs', role: 'tablist', 'aria-label': 'Phone app sections' },
      tabButton('chats', ChatTabIcon, 'Chats'),
      tabButton('contacts', PeopleIcon, 'Contacts')))
}

export function PhoneLauncher({ open, disabled, onToggle, badge = false }) {
  if (open) return null
  return h('button', {
    type: 'button',
    className: 'of-phone-launcher',
    onClick: onToggle,
    disabled: Boolean(disabled),
    'aria-label': 'Take out phone',
    title: 'Take out phone (P)',
  },
  h('svg', { viewBox: '0 0 24 24', width: 17, height: 17, fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true },
    h('rect', { x: 7, y: 2.6, width: 10, height: 18.8, rx: 2.6 }),
    h('path', { d: 'M10.5 5.4h3' }),
    h('path', { d: 'M10.5 18.6h3' })),
  h('span', { className: 'of-phone-launcher-label' }, 'Phone'),
  badge ? h('span', { className: 'of-phone-launcher-badge', 'aria-hidden': true }) : null,
  h('kbd', { className: 'of-phone-launcher-key', 'aria-hidden': true }, 'P'))
}

export function OfficePhone({ roster, sessions, unread, actions, SessionProvider, renderSlot, onPutAway, quiet, docked = [] }) {
  const [screen, setScreen] = useState('home')
  const [tab, setTab] = useState('chats')
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [chat, setChat] = useState(null)
  const [now, setNow] = useState(() => Date.now())
  const rootRef = useRef(null)
  const appIconRef = useRef(null)
  const backRef = useRef(null)
  const searchRef = useRef(null)
  const searchButtonRef = useRef(null)
  const putAwayRef = useRef(onPutAway)
  putAwayRef.current = onPutAway
  const stateRef = useRef(null)
  const chats = useMemo(() => phoneChats(roster ?? {}, sessions ?? {}, unread ?? {}), [roster, sessions, unread])
  const contacts = useMemo(() => phoneContacts(roster ?? {}, sessions ?? {}, unread ?? {}), [roster, sessions, unread])
  const activeChat = chat ? chats.find(entry => entry.id === chat.id) ?? chat : null
  const putAway = () => putAwayRef.current?.()
  const closeSearch = () => {
    setSearching(false)
    setQuery('')
    window.requestAnimationFrame(() => searchButtonRef.current?.focus({ preventScroll: true }))
  }
  const goHome = () => { setScreen('home'); setSearching(false); setQuery('') }
  const openApp = nextTab => {
    setQuery(''); setSearching(false)
    if (nextTab === 'browser') { setScreen('browser'); return }
    setTab(nextTab); setScreen('app')
  }
  const openChat = entry => {
    if (docked.includes(entry.sessionId)) { putAway(); return }
    setChat(entry); setSearching(false); setQuery(''); setScreen('chat')
  }
  const toggleSearch = () => { if (searching) closeSearch(); else setSearching(true) }
  stateRef.current = { screen, searching, closeSearch }
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 15000)
    return () => window.clearInterval(timer)
  }, [])
  useEffect(() => () => { document.querySelector('.of-scene')?.focus({ preventScroll: true }) }, [])
  useEffect(() => {
    const onKeyDown = event => {
      if (event.key !== 'Escape') return
      if (!rootRef.current) return
      // An IME uses Escape to cancel a candidate; let it, but keep the key from
      // reaching the office's own Escape stack.
      if (event.isComposing || event.keyCode === 229) { event.stopPropagation(); return }
      event.preventDefault()
      event.stopPropagation()
      const state = stateRef.current
      if (state.screen === 'browser') { setScreen('home'); return }
      if (state.screen === 'chat') { setScreen('app'); return }
      if (state.screen === 'app' && state.searching) { state.closeSearch(); return }
      if (state.screen === 'app') { setScreen('home'); return }
      putAwayRef.current?.()
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [])
  useEffect(() => {
    const onKeyDown = event => {
      if (event.key !== 'Tab') return
      const root = rootRef.current
      if (!root) return
      const items = [...root.querySelectorAll(FOCUSABLE)].filter(element => element.getClientRects().length)
      if (!items.length) { event.preventDefault(); root.focus({ preventScroll: true }); return }
      const first = items[0], last = items.at(-1), active = document.activeElement
      if (!root.contains(active) || active === root) { event.preventDefault(); (event.shiftKey ? last : first).focus({ preventScroll: true }); return }
      if (event.shiftKey && active === first) { event.preventDefault(); last.focus({ preventScroll: true }) }
      else if (!event.shiftKey && active === last) { event.preventDefault(); first.focus({ preventScroll: true }) }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])
  useLayoutEffect(() => {
    const root = rootRef.current
    if (!root || root.contains(document.activeElement)) return
    if (screen === 'home') appIconRef.current?.focus({ preventScroll: true })
    else if (screen === 'app') backRef.current?.focus({ preventScroll: true })
    else root.focus({ preventScroll: true })
  }, [screen])
  useLayoutEffect(() => { if (searching) searchRef.current?.focus({ preventScroll: true }) }, [searching])
  const live = screen === 'browser' ? 'Browser' : screen === 'home' ? 'Home screen' : screen === 'chat' && activeChat ? `Conversation with ${activeChat.name}` : tab === 'contacts' ? 'Contacts' : 'Chats'
  const body = screen === 'browser'
    ? h(PhoneBrowser, { onBack: goHome })
    : screen === 'chat' && activeChat
    ? h(PhoneChat, {
        key: activeChat.id,
        sessionId: activeChat.sessionId,
        kind: activeChat.kind,
        title: activeChat.name,
        subtitle: activeChat.kind === 'group' ? `${activeChat.members?.length ?? 0} members` : 'Private conversation',
        bot: activeChat.kind === 'bot' ? activeChat.bot : undefined,
        room: activeChat.kind === 'group' ? activeChat.room : undefined,
        roster,
        actions,
        SessionProvider,
        renderSlot,
        docked,
        onBack: () => setScreen('app'),
        onPutAway: putAway,
      })
    : screen === 'app'
      ? h(AppScreen, {
          tab, searching, query, chats, contacts, now, docked,
          onBack: goHome,
          onTab: setTab,
          onOpen: openChat,
          onQuery: setQuery,
          onToggleSearch: toggleSearch,
          backRef, searchRef, searchButtonRef,
        })
      : h(HomeScreen, { now, onOpen: openApp, appIconRef })
  return h('div', {
    ref: rootRef,
    className: 'of-phone',
    role: 'dialog',
    'aria-modal': true,
    'aria-label': 'Phone',
    'aria-keyshortcuts': 'Escape',
    tabIndex: -1,
    'data-screen': screen,
    'data-tab': screen === 'app' ? tab : undefined,
    'data-quiet': quiet || undefined,
  },
  h('div', { className: 'of-phone-frame' },
    h('div', { className: 'of-phone-screen' },
      h(StatusBar, { now }),
      h('div', { className: 'of-phone-body' }, body))),
  h('span', { className: 'of-phone-live', 'aria-live': 'polite', 'aria-atomic': 'true' }, live))
}
