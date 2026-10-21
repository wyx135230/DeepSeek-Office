import { createElement as h, useEffect, useMemo, useRef, useState } from 'react'
import { officeBuilding, DEFAULT_OFFICE_THEME } from '../../shared/office.js'
import { officeClock, officeDayLabel, officeLight } from '../../shared/office/lighting.js'
import { avatarCanvas } from './portrait.js'
import { OfficeActivity } from './activities.js'
import { NearbyPrompt } from './activity-ui.js'
import { OfficeMap, OfficeRoomDirectory } from './map.js'
import { useEscape, usePaneLeft } from '../overlay-hooks.js'
import { t } from '../i18n.js'
import { useOfficeElevator, ElevatorPanel } from './elevator-ui.js'
import { OfficeChatPanel, MeetingPrompt } from './conversation.js'
import { OfficePhone, PhoneLauncher } from './phone.js'

const STATUS = { idle: 'On a break', thinking: 'Thinking…', typing: 'Working', reading: 'Reading', speaking: 'Speaking', waiting: 'Needs you', away: 'Working elsewhere' }
const errorText = error => error?.message ?? String(error)

export function BuildingIcon({ size = 20 }) {
  return h('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, 'aria-hidden': true },
    h('path', { d: 'M4 21V7h6V3h10v18M2 21h20M8 21v-4h4v4M13 7h3m-3 4h3m-3 4h3M6 10h2m-2 3h2' }))
}

export function OfficeEntry({ roster, actions, wide = true }) {
  if ((roster.rooms ?? []).length === 0) return null
  return h('button', { type: 'button', className: `of-entry${wide ? '' : ' of-entry-rail'}`, onClick: () => actions.openOffice(), 'aria-label': t('Office building'), title: t('Office building') },
    h(BuildingIcon, { size: 22 }), wide ? h('span', null, t('Office building')) : null,
    wide ? h('span', { className: 'of-entry-count' }, roster.rooms.length) : null)
}

export function PixelPortrait({ bot, size = 52, state = 'idle' }) {
  const ref = useRef(null)
  const avatarKey = JSON.stringify(bot.officeAvatar ?? null)
  useEffect(() => {
    const target = ref.current
    const image = avatarCanvas(bot, state)
    target.width = image.width; target.height = image.height
    target.getContext('2d').drawImage(image, 0, 0)
  }, [bot.id, bot.name, avatarKey, state])
  return h('canvas', { ref, className: 'of-portrait', style: { width: size * 20 / 28, height: size }, 'aria-hidden': true })
}

function OfficeScene({ floor, lobby, reducedMotion, selected, onSelect, onExit, onInteract, onCancelInteraction, onHint, sceneApi, paused, atElevator, onReady, onSceneError, onSceneLoading }) {
  const element = useRef(null)
  const renderer = useRef(null)
  const latest = useRef(floor)
  const latestMotion = useRef(reducedMotion)
  const latestPaused = useRef(paused)
  const latestElevator = useRef(atElevator)
  latestElevator.current = atElevator
  latest.current = floor
  latestMotion.current = reducedMotion
  latestPaused.current = paused
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let cancelled = false
    const controller = new AbortController(), target = latest.current, targetId = target.id
    onSceneLoading?.(targetId)
    setError(''); setLoading(true)
    void import('./renderer.js').then(({ createOfficeRenderer }) => cancelled ? null : createOfficeRenderer(element.current, { floor: target, lobby, reducedMotion, atElevator: latestElevator.current, signal: controller.signal, onSelect, onExit, onInteract, onCancelInteraction, onHint }))
      .then((scene) => {
        if (!scene) return
        if (cancelled) { scene?.destroy(); return }
        renderer.current = scene
        sceneApi.current = scene
        scene?.update(latest.current, lobby)
        scene?.setReducedMotion(latestMotion.current)
        scene?.setPaused(latestPaused.current)
        setLoading(false)
        onReady?.(targetId, scene)
      }).catch((failure) => { if (!cancelled) { setError(errorText(failure)); setLoading(false); onSceneError?.(targetId, failure) } })
    return () => { cancelled = true; onSceneLoading?.(targetId); controller.abort(); renderer.current?.destroy(); renderer.current = null; sceneApi.current = null }
  }, [floor.id, lobby, floor.members.map(entry => entry.bot.id).join(',')])
  useEffect(() => { renderer.current?.update(floor, lobby) }, [floor, lobby])
  useEffect(() => { renderer.current?.select(selected) }, [selected])
  useEffect(() => { renderer.current?.setReducedMotion(reducedMotion) }, [reducedMotion])
  useEffect(() => { renderer.current?.setPaused(paused) }, [paused])
  return h('div', { className: 'of-scene-wrap' },
    h('div', { ref: element, className: 'of-scene', role: 'application', tabIndex: 0, 'aria-label': 'Isometric office. Click to walk, use WASD or arrows, Shift to run, and E to interact. Scroll to zoom.', 'data-office-floor': floor.id }),
    loading ? h('div', { className: 'of-scene-message', role: 'status' }, t('Opening the office…')) : null,
    error ? h('div', { className: 'of-scene-message of-render-error', role: 'alert' }, h('strong', null, t('The scene could not start')), h('p', null, error), h('p', null, t('You can still use the member list and chat. Try a browser with WebGL enabled.'))) : null)
}

function OfficeClock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => { const timer = window.setInterval(() => setNow(new Date()), 30000); return () => window.clearInterval(timer) }, [])
  const light = officeLight(now)
  return h('div', { className: 'of-game-clock', title: t('Your local time shapes the office light') },
    h('i', { 'aria-hidden': true }),
    h('span', null, `${officeDayLabel(now)} ${officeClock(now)}`),
    h('span', { className: 'of-clock-phase' }, t(light.label)))
}

function CameraTools({ sceneApi, mode }) {
  const use = task => { task(sceneApi.current); document.querySelector('.of-scene')?.focus({ preventScroll: true }) }
  const tool = (name, path, action, pressed) => h('button', { key: name, type: 'button', title: name, 'aria-label': name, 'aria-pressed': pressed, onClick: () => use(action) },
    h('svg', { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true }, h('path', { d: path })))
  return h('nav', { className: 'of-camera-tools', 'aria-label': 'Camera controls' },
    tool('Zoom out', 'M6 12h12', scene => scene?.zoomBy(1 / 1.2)),
    tool('Zoom in', 'M6 12h12M12 6v12', scene => scene?.zoomBy(1.2)),
    tool('Rotate view', 'M5 8a8 8 0 1 1-1 8M5 3v5h5', scene => scene?.rotateView()),
    tool('Overview', 'M9 4H4v5m11-5h5v5M4 15v5h5m11-5v5h-5M9 9h6v6H9z', scene => scene?.overview(), mode === 'overview'),
    tool('Follow your character', 'M12 3v4m0 10v4M3 12h4m10 0h4M12 8a4 4 0 1 0 0 8a4 4 0 0 0 0-8', scene => scene?.followPlayer(), mode === 'follow'))
}

function MemberList({ floor, selected, onSelect, generating }) {
  return h('div', { className: 'of-member-list', 'aria-label': t('Office members') }, floor.members.map(member => h('button', {
    key: member.bot.id, type: 'button', className: 'of-member', 'data-selected': selected === member.bot.id || undefined,
    onClick: () => onSelect(member.bot.id), 'aria-pressed': selected === member.bot.id,
  }, h(PixelPortrait, { bot: member.bot, state: member.state, size: 42 }),
  h('span', { className: 'of-member-copy' }, h('strong', null, member.bot.name), h('span', null, generating[member.bot.id] === 'working' ? t('Designing appearance…') : t(STATUS[member.state]))),
  h('span', { className: 'of-status-dot', 'data-state': member.state, 'aria-hidden': true }))))
}

function OfficeComposer({ floor, selected, actions, readOnly }) {
  const [message, setMessage] = useState('')
  const [privateChat, setPrivateChat] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const member = floor.members.find(entry => entry.bot.id === selected)
  const submit = async (event) => {
    event.preventDefault()
    const text = message.trim()
    if (!text || busy) return
    setBusy(true); setError(''); setSent(false)
    try {
      await actions.send(privateChat && member ? member.bot.id : floor.id, !privateChat && member ? `@${member.bot.name} ${text}` : text)
      setMessage(''); setSent(true)
    } catch (failure) { setError(errorText(failure)) } finally { setBusy(false) }
  }
  return h('form', { className: 'of-composer', onSubmit: submit },
    h('div', { className: 'of-composer-target' }, h('span', null, member ? `${privateChat ? t('Private chat') : t('Mention in group')} · ${member.bot.name}` : t('Message this office')),
      member ? h('label', null, h('input', { type: 'checkbox', checked: privateChat, onChange: event => { setPrivateChat(event.target.checked); setSent(false) } }), t('Private')) : null),
    h('textarea', { value: message, onChange: event => { setMessage(event.target.value); setSent(false) }, rows: 3, maxLength: 20000, 'aria-label': t('Office message'), placeholder: member ? t('Give {name} a task…', { name: member.bot.name }) : t('What shall we work on today?'), disabled: readOnly }),
    h('div', { className: 'of-composer-foot' }, h('span', { role: 'status', className: 'of-muted' }, sent ? t('Sent to the conversation') : t('Same team, same conversation')),
      h('button', { type: 'submit', className: 'of-button of-primary', disabled: !message.trim() || busy || readOnly }, busy ? t('Sending…') : t('Send'))),
    error ? h('p', { className: 'of-error', role: 'alert' }, error) : null)
}

function ThemeEditor({ floor, actions, onClose, readOnly }) {
  const [prompt, setPrompt] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const save = async (theme) => {
    setBusy(true); setError('')
    try { await actions.setOfficeTheme({ roomId: floor.id, ...(theme ? { theme } : { prompt }) }); onClose() } catch (failure) { setError(errorText(failure)) } finally { setBusy(false) }
  }
  return h('section', { className: 'of-theme-editor' },
    h('div', { className: 'of-section-heading' }, h('h3', null, t('Make yourself at home')), h('button', { type: 'button', className: 'of-text-button', onClick: onClose }, t('Close'))),
    h('p', { className: 'of-muted' }, t('Choose a preset, or ask AI to design the colors and atmosphere.')),
    h('div', { className: 'of-character-actions' },
      h('button', { type: 'button', className: 'of-button', disabled: busy || readOnly, onClick: () => save(DEFAULT_OFFICE_THEME) }, t('Komorebi')),
      h('button', { type: 'button', className: 'of-button', disabled: busy || readOnly, onClick: () => save({ name: 'Moonlit study', wall: '#647082', floor: '#a58b71', accent: '#929caa', night: true }) }, t('Moonlit study'))),
    h('form', { onSubmit: (event) => { event.preventDefault(); void save() } },
      h('label', null, t('Describe your office'), h('textarea', { value: prompt, onChange: event => setPrompt(event.target.value), maxLength: 800, rows: 3, placeholder: t('A quiet reading room on a rainy evening…') })),
      h('button', { type: 'submit', className: 'of-button of-primary', disabled: !prompt.trim() || busy || readOnly }, busy ? t('Designing your office…') : t('Design with AI'))),
    error ? h('p', { role: 'alert', className: 'of-error' }, error) : null)
}

export function OfficeOverlay({ useRoster, useUi, useWork, useSessions, actions, SessionProvider, renderSlot }) {
  const roster = useRoster(value => value)
  const view = useUi(value => value.office)
  const roomId = useUi(value => value.officeRoomId)
  const work = useWork(value => value)
  const building = useMemo(() => officeBuilding(roster, work), [roster, work])
  const retained = useRef(null)
  if (!building.enabled) { retained.current = null; return null }
  if (view) retained.current = view
  else if (retained.current && roomId !== undefined && retained.current.roomId !== roomId) retained.current = { roomId }
  if (!retained.current) return null
  return h(OfficeWorkspace, { key: 'office-workspace', roster, view: retained.current, active: Boolean(view), building, actions, SessionProvider, renderSlot, useSessions, useUi })
}

function OfficeWorkspace({ roster, view, active, building, actions, SessionProvider, renderSlot, useSessions, useUi }) {
  const sessions = useSessions(value => value)
  const unread = useUi(value => value.unread)
  const lobby = view.roomId === null || !building.floors.some(floor => floor.id === view.roomId)
  const floor = building.floors.find(entry => entry.id === view.roomId) ?? building.floors[0]
  const lobbyFloor = { ...floor, id: 'lobby', name: 'Reception', members: [], layout: { width: 800, height: 480, desks: [] }, theme: DEFAULT_OFFICE_THEME }
  const [selected, setSelected] = useState(null)
  const [editing, setEditing] = useState(false)
  const [generating, setGenerating] = useState({})
  const [drawer, setDrawer] = useState(null)
  const [interaction, setInteraction] = useState(null)
  const [meeting, setMeeting] = useState(false)
  const [board, setBoard] = useState(false)
  const [currentRoom, setCurrentRoom] = useState('')
  const [hint, setHint] = useState('Click to walk · WASD / arrows · Shift to run')
  const [cameraMode, setCameraMode] = useState('follow')
  const [mapExpanded, setMapExpanded] = useState(true)
  const [mapPeek, setMapPeek] = useState(false)
  const [hudCompact, setHudCompact] = useState(false)
  const [phone, setPhone] = useState(false)
  const phoneLive = useRef(false)
  phoneLive.current = phone
  const workspaceRef = useRef(null)
  const drawerTrigger = useRef(null)
  const sceneApi = useRef(null)
  const sceneWork = useRef(new Map())
  const attempted = useRef(new Set())
  const generationTokens = useRef(new Map())
  const [quiet, setQuiet] = useState(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false)
  const elevator = useOfficeElevator({ building, currentId: lobby ? 'lobby' : floor.id, quiet, actions, sceneApi })
  const paneLeft = usePaneLeft()
  useEffect(() => {
    const element = workspaceRef.current
    const measure = () => { const box = element.getBoundingClientRect(); setHudCompact(box.width <= 760 || box.height <= 650) }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  const chatKey = floor.members.map(entry => `${entry.bot.id}:${entry.bot.sessionId ?? entry.bot.id}`).join(',')
  useEffect(() => {
    if (lobby) return undefined
    let stopped = false, timer
    const since = Date.now()
    sceneWork.current.clear()
    sceneApi.current?.resetWork()
    const say = (id, text) => sceneApi.current?.say(id, text)
    const stops = [actions.watchOfficeSpeech(floor.id, say)]
    const groupWatches = new Map()
    const watch = target => actions.watchOfficeSession(target, {
        since, onSpeech: say,
        onWork: value => {
          if (!target.botId) return
          const next = { ...value, botId: target.botId, sessionId: target.sessionId }
          sceneWork.current.set(target.sessionId, next); sceneApi.current?.work(target.botId, next)
        },
      })
    for (const target of [{ sessionId: floor.id }, ...floor.members.map(entry => ({ sessionId: entry.bot.sessionId ?? entry.bot.id, botId: entry.bot.id }))]) stops.push(watch(target))
    const seen = new Map()
    const tick = async () => {
      const presence = await actions.officePresence(floor.id).catch(() => null)
      if (stopped) return
      if (presence) {
        const ids = new Set(presence.sessions.map(target => target.sessionId))
        for (const [id, stop] of groupWatches) if (!ids.has(id)) {
          stop(); groupWatches.delete(id)
          const value = sceneWork.current.get(id)
          if (value) sceneApi.current?.work(value.botId, { ...value, active: false, desk: false, recentDesk: false })
          sceneWork.current.delete(id)
        }
        for (const target of presence.sessions) if (!groupWatches.has(target.sessionId)) groupWatches.set(target.sessionId, watch(target))
      }
      for (const round of presence?.rounds ?? []) for (const [i, reply] of (round.replies ?? []).entries()) {
        const key = `${round.callId}:${i}`
        if (reply.kind !== undefined || reply.time < since || !reply.text || seen.get(key) === reply.text) continue
        seen.set(key, reply.text); say(reply.botId, reply.text)
      }
      if (seen.size > 256) seen.clear()
      timer = setTimeout(tick, document.hidden ? 3000 : 500)
    }
    void tick()
    return () => { stopped = true; clearTimeout(timer); for (const stop of [...stops, ...groupWatches.values()]) stop(); sceneWork.current.clear() }
  }, [lobby, floor.id, chatKey])
  const endMeeting = () => { sceneApi.current?.endMeeting(); setMeeting(false); setBoard(false); document.querySelector('.of-scene')?.focus({ preventScroll: true }) }
  const close = () => { if (drawer) { closeDrawer(); return }; if (editing) { closeEditor(); return }; if (board) { setBoard(false); return }; if (meeting) { endMeeting(); return }; if (elevator.atElevator) { elevator.close(); return }; if (interaction) { closeInteraction(); return }; if (selected) { setSelected(null); document.querySelector('.of-scene')?.focus() } else actions.closeOffice() }
  useEscape(close, active)
  useEffect(() => { setSelected(null); setEditing(false); setDrawer(null); setInteraction(null); setCurrentRoom(''); setMeeting(false); setBoard(false) }, [floor.id, lobby, floor.members.map(entry => entry.bot.id).join(',')])
  const member = floor.members.find(entry => entry.bot.id === selected)
  const autoCompact = hudCompact && Boolean(member || meeting || board || interaction || editing)
  const mapOpen = autoCompact ? mapPeek : mapExpanded
  useEffect(() => { setMapPeek(false) }, [autoCompact])
  useEffect(() => {
    if (active && (drawer || editing)) workspaceRef.current?.querySelector(editing ? '.of-hud-editor button' : '#office-hud-drawer button')?.focus({ preventScroll: true })
  }, [drawer, editing, active])
  const generate = async (botId, prompt = '', regenerate = false, signal) => {
    const token = Symbol(botId)
    generationTokens.current.set(botId, token)
    setGenerating(state => ({ ...state, [botId]: 'working' }))
    try {
      await actions.generateOfficeAvatar({ botId, roomId: floor.id, prompt, regenerate }, signal)
      if (generationTokens.current.get(botId) === token) setGenerating(state => ({ ...state, [botId]: 'done' }))
    } catch (error) {
      if (generationTokens.current.get(botId) === token) setGenerating(state => ({ ...state, [botId]: error?.name === 'AbortError' ? 'idle' : `error:${errorText(error)}` }))
      throw error
    } finally {
      if (generationTokens.current.get(botId) === token) generationTokens.current.delete(botId)
    }
  }
  const memberKey = floor.members.map(entry => `${entry.bot.id}:${entry.bot.model ?? ''}`).join(',')
  useEffect(() => {
    if (lobby || roster.readOnly) return undefined
    const controller = new AbortController()
    const active = new Map()
    void (async () => {
      for (const entry of floor.members) {
        const key = `${entry.bot.id}:${entry.bot.model}`
        if (controller.signal.aborted) break
        if (entry.bot.officeAvatar || !entry.bot.model || attempted.current.has(key)) continue
        attempted.current.add(key)
        active.set(key, entry.bot.id)
        try { await generate(entry.bot.id, '', false, controller.signal) } catch { /* the character card shows the failure and offers a retry */ } finally { active.delete(key) }
      }
    })()
    return () => {
      const ids = [...active.values()]
      for (const [key, id] of active) { attempted.current.delete(key); generationTokens.current.delete(id) }
      setGenerating(state => Object.fromEntries(Object.entries(state).filter(([id]) => !ids.includes(id))))
      controller.abort()
    }
  }, [floor.id, lobby, memberKey, Boolean(roster.readOnly)])
  const working = building.floors.reduce((sum, entry) => sum + entry.working, 0)
  const closeInteraction = () => { sceneApi.current?.interruptActivity?.(); setInteraction(null); document.querySelector('.of-scene')?.focus() }
  const closeDrawer = () => {
    setDrawer(null)
    requestAnimationFrame(() => {
      const trigger = drawerTrigger.current
      if (trigger?.isConnected && trigger.getClientRects().length) trigger.focus({ preventScroll: true })
      else document.querySelector('.of-scene')?.focus({ preventScroll: true })
    })
  }
  const toggleDrawer = (name, event) => { drawerTrigger.current = event.currentTarget; setDrawer(value => value === name ? null : name) }
  const closeEditor = () => { setEditing(false); closeDrawer() }
  const closeConversation = () => { setSelected(null); document.querySelector('.of-scene')?.focus({ preventScroll: true }) }
  const locked = elevator.atElevator || meeting || board || editing || Boolean(interaction)
  const sceneSession = member && !meeting ? member.bot.sessionId ?? member.bot.id : meeting || board ? floor.id : null
  const phoneBlocked = !active || meeting || board || editing || elevator.atElevator || Boolean(elevator.travel)
  const openPhone = () => {
    if (phoneLive.current || phoneBlocked) return
    if (drawer) setDrawer(null)
    if (interaction) closeInteraction()
    setPhone(true)
    sceneApi.current?.setPhone(true)
  }
  const closePhone = () => {
    if (!phoneLive.current) return
    setPhone(false)
    sceneApi.current?.setPhone(false)
    document.querySelector('.of-scene')?.focus({ preventScroll: true })
  }
  const openPhoneRef = useRef(openPhone)
  openPhoneRef.current = openPhone
  useEffect(() => {
    if (!active) return undefined
    const down = (event) => {
      if (event.key.toLowerCase() !== 'p' || event.repeat || event.metaKey || event.ctrlKey || event.altKey) return
      const target = event.target instanceof Element ? event.target : null
      if (target?.closest('input,textarea,[contenteditable="true"]') || phoneLive.current) return
      event.preventDefault()
      openPhoneRef.current()
    }
    window.addEventListener('keydown', down)
    return () => window.removeEventListener('keydown', down)
  }, [active])
  // The phone is a place to stand still and talk, so it leaves with the floor, the
  // hidden workspace and the next scene rebuild.
  useEffect(() => { if (!active && phoneLive.current) { setPhone(false); sceneApi.current?.setPhone(false) } }, [active])
  useEffect(() => { if (phoneLive.current) { setPhone(false); sceneApi.current?.setPhone(false) } }, [floor.id, lobby])
  const drawerTitle = { floors: 'Where to?', team: 'Your coworkers', rooms: 'Rooms on this floor', options: 'Office options', help: 'Getting around', credits: 'Made with care' }
  return h('section', { ref: workspaceRef, className: 'of-workspace of-rpg of-modern', style: { left: paneLeft, visibility: active ? undefined : 'hidden', '--lift-fade': `${elevator.travel?.fadeMs ?? 550}ms`, '--lift-shift': elevator.travel?.direction === 'up' ? '28px' : '-28px' }, inert: active ? undefined : '', 'aria-hidden': !active || undefined, 'aria-label': 'DeepSeek Office', 'data-office-view': lobby ? 'lobby' : 'floor', 'data-hud-open': drawer || (editing ? 'decorate' : interaction ? 'activity' : undefined), 'data-has-dialogue': Boolean(member || meeting || board) || undefined, 'data-phone-open': phone || undefined, 'data-quiet': quiet || undefined, 'data-lift-phase': elevator.travel?.phase, 'data-lift-direction': elevator.travel?.direction },
    h(OfficeScene, { floor: lobby ? lobbyFloor : floor, lobby, reducedMotion: quiet, selected: active ? selected : null, sceneApi,
      paused: !active || Boolean(drawer || phone || interaction?.kind === 'meeting' || editing || elevator.atElevator || meeting || board), onSelect: id => { setSelected(id); setDrawer(null) }, onHint: setHint,
      atElevator: elevator.atElevator, onReady: (id, scene) => { for (const value of sceneWork.current.values()) scene.work(value.botId, value); if (phoneLive.current) scene.setPhone(true); elevator.ready(id, scene) }, onSceneError: elevator.failed, onSceneLoading: elevator.loading,
      onExit: elevator.enter, onCancelInteraction: () => setInteraction(null), onInteract: target => { if (target.kind === 'meeting-board') setBoard(true); else { setSelected(null); setInteraction(target) } } }),
    h('div', { className: 'of-lift-cover', 'aria-hidden': true }),
    phone ? h('div', { className: 'of-phone-scrim', 'aria-hidden': true }) : null,
    h('aside', { className: 'of-hud', 'aria-label': 'Office navigation and map', 'data-map-open': mapOpen, inert: phone ? '' : undefined },
      h('header', { className: 'of-hud-heading' },
      h('div', { className: 'of-location-card' }, h('span', { className: 'of-location-badge' }, lobby ? 'G' : `${floor.number}F`),
        h('div', { className: 'of-location-copy' }, h('h1', null, lobby ? 'Reception & lounge' : floor.name),
          h('p', { className: 'of-location-detail' }, currentRoom || 'Opening the floor…'))),
        h('button', { className: 'of-hud-icon of-hud-toggle', type: 'button', title: mapOpen ? 'Collapse map' : 'Expand map', 'aria-label': mapOpen ? 'Collapse map' : 'Expand map', 'aria-expanded': mapOpen, 'aria-controls': 'office-hud-map', onClick: () => autoCompact ? setMapPeek(value => !value) : setMapExpanded(value => !value) },
          h('svg', { width: 16, height: 16, viewBox: '0 0 20 20', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, 'aria-hidden': true }, h('path', { d: mapOpen ? 'M5 12l5-5 5 5' : 'M5 8l5 5 5-5' }))),
        h('button', { className: 'of-hud-icon', type: 'button', title: 'Back to chat', 'aria-label': 'Back to chat', onClick: () => actions.closeOffice() },
          h('svg', { width: 17, height: 17, viewBox: '0 0 20 20', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, 'aria-hidden': true }, h('path', { d: 'M8 4H4v12h4m4-10 4 4-4 4M8 10h8' })))),
      h('div', { className: 'of-hud-meta' }, h(OfficeClock), h('span', null, lobby ? `${building.floors.length} offices · ${working} working` : `${floor.members.length} teammates · ${floor.working} working`)),
      h('div', { className: 'of-hud-map', id: 'office-hud-map' },
        h(OfficeMap, { key: `${lobby ? 'lobby' : floor.id}:${floor.members.map(entry => entry.bot.id).join(',')}`, sceneApi, onRoomChange: setCurrentRoom, onCameraModeChange: setCameraMode, selected, members: floor.members, onRooms: event => toggleDrawer('rooms', event), directoryOpen: drawer === 'rooms', disabled: locked }),
        h(CameraTools, { sceneApi, mode: cameraMode })),
      h(PhoneLauncher, { open: phone, disabled: phoneBlocked, badge: Object.keys(unread ?? {}).length > 0, onToggle: openPhone }),
      h('nav', { className: 'of-game-nav', 'aria-label': 'Office navigation' },
        h('button', { className: 'of-button', type: 'button', disabled: locked, 'aria-expanded': drawer === 'floors', 'aria-controls': 'office-hud-drawer', onClick: event => toggleDrawer('floors', event) }, 'Floors'),
        !lobby ? h('button', { className: 'of-button', type: 'button', disabled: locked, 'aria-expanded': drawer === 'team', 'aria-controls': 'office-hud-drawer', onClick: event => toggleDrawer('team', event) }, 'Team') : null,
        h('button', { className: 'of-button', type: 'button', disabled: locked, 'aria-label': 'Office options', title: 'Office options', 'aria-expanded': ['options', 'help', 'credits'].includes(drawer), 'aria-controls': 'office-hud-drawer', onClick: event => toggleDrawer('options', event) }, 'More ···'))),
    !member && !drawer && !editing && !interaction && !locked && !phone ? h('div', { className: 'of-context-hint' },
      h('div', { className: 'of-game-hint', role: 'status' }, h('kbd', null, hint.startsWith('Click') ? 'WASD' : 'E'), h('span', null, hint.replace(/^E\s+[·:—–-]?\s*/, '')))) : null,
    h(NearbyPrompt, { sceneApi, active: active && !member && !drawer && !editing && !interaction && !locked && !phone }),
    elevator.atElevator ? h(ElevatorPanel, { elevator, building, currentId: lobby ? 'lobby' : floor.id, sceneApi }) : null,
    lobby && !drawer && !elevator.atElevator && !phone ? h('button', { className: 'of-welcome-card', type: 'button', onClick: () => setDrawer('floors') },
      h('strong', null, 'Your team is upstairs'), h('span', null, 'Take the lift to your group’s office.'), h('b', null, 'Choose a floor')) : null,
    drawer ? h('aside', { className: 'of-game-drawer of-hud-drawer', id: 'office-hud-drawer', 'aria-label': drawer === 'floors' ? 'Floor directory' : drawer === 'team' ? 'Office members' : drawerTitle[drawer] },
      h('div', { className: 'of-section-heading' }, h('h2', null, drawerTitle[drawer]), h('button', { className: 'of-text-button', type: 'button', onClick: closeDrawer, 'aria-label': 'Close panel' }, 'Close ×')),
      drawer === 'floors' ? h('div', { className: 'of-directory' },
        h('p', { className: 'of-muted' }, 'Every group has a place of its own.'),
        !lobby ? h('button', { type: 'button', className: 'of-floor-row', onClick: () => actions.openOffice(null) }, h('span', { className: 'of-floor-number' }, 'G'), h('strong', null, 'Reception & lounge')) : null,
        building.floors.map(entry => h('button', { key: entry.id, type: 'button', className: 'of-floor-row', onClick: () => { actions.openOffice(entry.id); setDrawer(null) } },
          h('span', { className: 'of-floor-number' }, `${entry.number}F`), h('span', { className: 'of-floor-copy' }, h('strong', null, entry.name), h('span', null, entry.purpose), h('small', null, `${entry.members.length} desks · ${entry.working} working`)), h('span', { className: 'of-floor-visit' }, '→'))),
        h('button', { type: 'button', className: 'of-button of-add-floor', onClick: () => { actions.closeOffice(); actions.openNewChat('group') } }, 'New group, new office'))
        : drawer === 'rooms' ? h(OfficeRoomDirectory, { sceneApi, currentRoom, onClose: () => { setDrawer(null); document.querySelector('.of-scene')?.focus({ preventScroll: true }) } })
        : drawer === 'options' ? h('div', { className: 'of-hud-options' },
          !lobby ? h('button', { type: 'button', className: 'of-button', onClick: () => { setDrawer(null); setEditing(true) } }, 'Decorate') : null,
          h('label', null, h('input', { type: 'checkbox', checked: quiet, onChange: event => setQuiet(event.target.checked) }), 'Quiet motion'),
          h('button', { type: 'button', className: 'of-button', onClick: () => setDrawer('help') }, 'Help & shortcuts'),
          h('button', { type: 'button', className: 'of-button', onClick: () => setDrawer('credits') }, 'Credits'))
        : drawer === 'help' ? h('div', { className: 'of-hud-help' },
          h('p', null, 'Click the floor to walk. Use WASD or arrow keys to move, and hold Shift to run.'),
          h('p', null, 'Walk up to a coworker or an activity and press E to interact.'),
          h('p', null, 'Click or drag the map to inspect a room. Map arrow keys pan; Home follows your character. Map navigation never moves your character.'),
          h('p', null, 'Scroll to zoom. Use the map’s camera buttons to rotate, see the whole floor, or follow your character. Escape closes the current panel.'))
        : drawer === 'team' ? h('div', null, h('p', { className: 'of-muted' }, 'Choose a teammate for a quick conversation. In the room, walk over and press E.'),
          h(MemberList, { floor, selected, generating, onSelect: id => { setDrawer(null); setSelected(id) } }),
          h(OfficeComposer, { key: floor.id, floor, selected: null, actions, readOnly: Boolean(roster.readOnly) }))
          : h('div', { className: 'of-credits' }, h('p', null, 'Built with Three.js and Phaser.'),
            h('p', null, 'The architectural model, furniture, animated people and interface are original work authored for DeepSeek Office. Your existing team and activities power this office.'),
            h('p', null, 'Three.js and Phaser 4 are MIT licensed. The bundled credit files record every third-party dependency.'),
            h('p', null, 'Momo the dog: Ninja Adventure by Pixel-Boy / Sparklin Labs. CC0.'), h('a', { href: 'https://github.com/sparklinlabs/superpowers-asset-packs', target: '_blank', rel: 'noreferrer' }, 'Ninja Adventure collection'), h('p', null, 'Room composition, interface, short stories and Star catcher: DeepSeek Office.')))
      : null,
    member && !meeting && !board ? h(OfficeChatPanel, { key: `talk-${floor.id}-${member.bot.id}`, active, floor, member, actions, SessionProvider, renderSlot, sceneApi, onClose: closeConversation }) : null,
    meeting || board ? h(OfficeChatPanel, { key: `meeting-${floor.id}`, active, board, floor, actions, SessionProvider, renderSlot, sceneApi, onClose: () => { if (board) { setBoard(false); if (!meeting) document.querySelector('.of-scene')?.focus() } else endMeeting() }, onBoard: () => setBoard(true) }) : null,
    interaction?.kind === 'meeting' ? h(MeetingPrompt, { active, onClose: closeInteraction, onStart: () => { sceneApi.current?.startMeeting(); setMeeting(true); setInteraction(null); setDrawer(null); setSelected(null) } }) : null,
    interaction && interaction.kind !== 'meeting' ? ['coffee', 'reading', 'arcade', 'meal', 'drink', 'exercise', 'rest'].includes(interaction.kind)
      ? h(OfficeActivity, { key: `${lobby ? 'lobby' : floor.id}:${interaction.id}`, active, interaction, roomId: lobby ? 'lobby' : floor.id, sceneApi, onClose: closeInteraction })
      : h('section', { className: 'of-prop-dialogue', role: 'dialog', 'aria-label': interaction.label }, h('h2', null, interaction.label), h('p', null, interaction.text), h('button', { type: 'button', className: 'of-button', onClick: closeInteraction }, 'Close')) : null,
    editing ? h('div', { className: 'of-game-drawer of-hud-drawer of-hud-editor' }, h(ThemeEditor, { floor, actions, onClose: closeEditor, readOnly: Boolean(roster.readOnly) })) : null,
    phone ? h(OfficePhone, { roster, sessions, unread, actions, SessionProvider, renderSlot, quiet, onPutAway: closePhone, docked: sceneSession ? [sceneSession] : [] }) : null)
}
