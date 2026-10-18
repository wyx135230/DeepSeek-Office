import { createElement as h, useEffect, useMemo, useRef, useState } from 'react'
import { officeBuilding, DEFAULT_OFFICE_THEME } from '../../shared/office.js'
import { avatarCanvas } from './portrait.js'
import { OfficeActivity } from './activities.js'
import { OfficeMap } from './map.js'
import { useEscape, usePaneLeft } from '../overlay-hooks.js'
import { t } from '../i18n.js'

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

function OfficeScene({ floor, lobby, reducedMotion, selected, onSelect, onExit, onInteract, onHint, sceneApi, paused }) {
  const element = useRef(null)
  const renderer = useRef(null)
  const latest = useRef(floor)
  const latestMotion = useRef(reducedMotion)
  const latestPaused = useRef(paused)
  latest.current = floor
  latestMotion.current = reducedMotion
  latestPaused.current = paused
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let cancelled = false
    setError(''); setLoading(true)
    void import('./renderer.js').then(({ createOfficeRenderer }) => createOfficeRenderer(element.current, { floor: latest.current, lobby, reducedMotion, onSelect, onExit, onInteract, onHint }))
      .then((scene) => {
        if (cancelled) { scene?.destroy(); return }
        renderer.current = scene
        sceneApi.current = scene
        scene?.update(latest.current, lobby)
        scene?.setReducedMotion(latestMotion.current)
        scene?.setPaused(latestPaused.current)
        setLoading(false)
      }).catch((failure) => { if (!cancelled) { setError(errorText(failure)); setLoading(false) } })
    return () => { cancelled = true; renderer.current?.destroy(); renderer.current = null; sceneApi.current = null }
  }, [floor.id, lobby, floor.members.map(entry => entry.bot.id).join(',')])
  useEffect(() => { renderer.current?.update(floor, lobby) }, [floor, lobby])
  useEffect(() => { renderer.current?.select(selected) }, [selected])
  useEffect(() => { renderer.current?.setReducedMotion(reducedMotion) }, [reducedMotion])
  useEffect(() => { renderer.current?.setPaused(paused) }, [paused])
  return h('div', { className: 'of-scene-wrap' },
    h('div', { ref: element, className: 'of-scene', role: 'application', tabIndex: 0, 'aria-label': 'Pixel office. Click to walk, use WASD or arrows, Shift to run, and E to interact.', 'data-office-floor': floor.id }),
    loading ? h('div', { className: 'of-scene-message', role: 'status' }, t('Opening the office…')) : null,
    error ? h('div', { className: 'of-scene-message of-render-error', role: 'alert' }, h('strong', null, t('The scene could not start')), h('p', null, error), h('p', null, t('You can still use the member list and chat. Try a browser with WebGL enabled.'))) : null)
}

function MemberList({ floor, selected, onSelect, generating }) {
  return h('div', { className: 'of-member-list', 'aria-label': t('Office members') }, floor.members.map(member => h('button', {
    key: member.bot.id, type: 'button', className: 'of-member', 'data-selected': selected === member.bot.id || undefined,
    onClick: () => onSelect(member.bot.id), 'aria-pressed': selected === member.bot.id,
  }, h(PixelPortrait, { bot: member.bot, state: member.state, size: 42 }),
  h('span', { className: 'of-member-copy' }, h('strong', null, member.bot.name), h('span', null, generating[member.bot.id] === 'working' ? t('Designing appearance…') : t(STATUS[member.state]))),
  h('span', { className: 'of-status-dot', 'data-state': member.state, 'aria-hidden': true }))))
}

function CharacterCard({ member, roomId, actions, generating, onGenerate, readOnly }) {
  const [prompt, setPrompt] = useState('')
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState('')
  const busy = generating[member.bot.id] === 'working'
  const act = async (task) => { setError(''); try { await task() } catch (failure) { setError(errorText(failure)) } }
  return h('section', { className: 'of-character-card', 'aria-label': member.bot.name },
    h('div', { className: 'of-character-heading' }, h(PixelPortrait, { bot: member.bot, state: member.state, size: 76 }),
      h('div', null, h('h3', null, member.bot.name), h('p', null, member.bot.role || t('Your coworker')), h('span', { className: 'of-state-label', 'data-state': member.state }, t(STATUS[member.state])))),
    member.doing?.tool ? h('p', { className: 'of-tool-label' }, `${t('Current tool')}: ${member.doing.tool}`) : null,
    member.state === 'waiting' ? h('button', { type: 'button', className: 'of-button of-approval', onClick: () => {
      const group = member.approvals[0]?.roomId
      if (member.question || !group) actions.openSession(member.bot.id)
      else { actions.openSession(group); actions.showDetails(group) }
    } }, t('Review request')) : null,
    h('div', { className: 'of-character-actions' },
      h('button', { type: 'button', className: 'of-button', onClick: () => actions.openSession(member.bot.id) }, t('Private chat')),
      h('button', { type: 'button', className: 'of-button', disabled: readOnly, onClick: () => act(() => actions.send(roomId, `@${member.bot.name} ${t('Hello! What are you working on?')}`)) }, t('Say hello'))),
    h('button', { type: 'button', className: 'of-text-button', disabled: busy || readOnly, onClick: () => setEditing(!editing) }, busy ? t('Designing appearance…') : t('Design AI appearance')),
    editing ? h('form', { className: 'of-design-form', onSubmit: (event) => { event.preventDefault(); void act(() => onGenerate(member.bot.id, prompt, true)) } },
      h('label', null, t('Describe this character'), h('textarea', { value: prompt, onChange: event => setPrompt(event.target.value), maxLength: 800, rows: 2, placeholder: t('Round glasses, a sage cardigan, a tiny notebook…') })),
      h('p', { className: 'of-muted' }, t('Uses this Bot’s configured model. Saved appearances are reused.')),
      h('button', { type: 'submit', className: 'of-button of-primary', disabled: busy || readOnly }, t('Generate appearance'))) : null,
    error || generating[member.bot.id]?.startsWith('error:') ? h('p', { className: 'of-error', role: 'alert' }, error || generating[member.bot.id].slice(6)) : null)
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

export function OfficeOverlay({ useRoster, useUi, useWork, actions }) {
  const roster = useRoster(value => value)
  const view = useUi(value => value.office)
  const work = useWork(value => value)
  const building = useMemo(() => officeBuilding(roster, work), [roster, work])
  if (!view || !building.enabled) return null
  return h(OfficeWorkspace, { key: 'office-workspace', roster, view, building, actions })
}

function OfficeWorkspace({ roster, view, building, actions }) {
  const lobby = view.roomId === null || !building.floors.some(floor => floor.id === view.roomId)
  const floor = building.floors.find(entry => entry.id === view.roomId) ?? building.floors[0]
  const lobbyFloor = { ...floor, id: 'lobby', name: 'Reception', members: [], layout: { width: 800, height: 480, desks: [] }, theme: DEFAULT_OFFICE_THEME }
  const [selected, setSelected] = useState(null)
  const [editing, setEditing] = useState(false)
  const [generating, setGenerating] = useState({})
  const [drawer, setDrawer] = useState(null)
  const [interaction, setInteraction] = useState(null)
  const [currentRoom, setCurrentRoom] = useState('')
  const [hint, setHint] = useState('Click to walk · WASD / arrows · Shift to run')
  const sceneApi = useRef(null)
  const attempted = useRef(new Set())
  const generationTokens = useRef(new Map())
  const [quiet, setQuiet] = useState(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false)
  const paneLeft = usePaneLeft()
  const close = () => { if (selected || interaction || drawer || editing) { sceneApi.current?.endActivity?.(); setSelected(null); setInteraction(null); setDrawer(null); setEditing(false); document.querySelector('.of-scene')?.focus() } else actions.closeOffice() }
  useEscape(close)
  useEffect(() => { setSelected(null); setEditing(false); setDrawer(null); setInteraction(null); setCurrentRoom('') }, [floor.id, lobby, floor.members.map(entry => entry.bot.id).join(',')])
  const member = floor.members.find(entry => entry.bot.id === selected)
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
  const closeInteraction = () => { sceneApi.current?.endActivity?.(); setInteraction(null); document.querySelector('.of-scene')?.focus() }
  const closeDrawer = () => { setDrawer(null); document.querySelector('.of-scene')?.focus({ preventScroll: true }) }
  const closeConversation = () => { setSelected(null); document.querySelector('.of-scene')?.focus({ preventScroll: true }) }
  return h('section', { className: 'of-workspace of-rpg', style: { left: paneLeft }, 'aria-label': 'DeepSeek Office', 'data-office-view': lobby ? 'lobby' : 'floor', 'data-quiet': quiet || undefined },
    h(OfficeScene, { floor: lobby ? lobbyFloor : floor, lobby, reducedMotion: quiet, selected, sceneApi,
      paused: Boolean(selected || drawer || interaction || editing), onSelect: id => { setSelected(id); setDrawer(null) }, onHint: setHint,
      onExit: () => setDrawer('floors'), onInteract: setInteraction }),
    h(OfficeMap, { key: `${lobby ? 'lobby' : floor.id}:${floor.members.map(entry => entry.bot.id).join(',')}`, sceneApi, onRoomChange: setCurrentRoom }),
    h('header', { className: 'of-game-top' },
      h('div', { className: 'of-location-card' }, h('span', { className: 'of-location-badge' }, lobby ? 'G' : `${floor.number}F`),
        h('div', { className: 'of-location-copy' }, h('h1', null, lobby ? 'Reception & lounge' : floor.name),
          h('p', { className: 'of-location-detail' }, [currentRoom, lobby ? `${building.floors.length} offices · ${working} teammates working` : `${floor.members.length} teammates · ${floor.working} working`].filter(Boolean).join(' · ')))),
      h('nav', { className: 'of-game-nav', 'aria-label': 'Office navigation' },
        h('button', { className: 'of-button', type: 'button', onClick: () => setDrawer(drawer === 'floors' ? null : 'floors') }, 'Floors'),
        !lobby ? h('button', { className: 'of-button', type: 'button', onClick: () => setDrawer(drawer === 'team' ? null : 'team') }, 'Team') : null,
        h('button', { className: 'of-button', type: 'button', onClick: () => actions.closeOffice() }, 'Back to chat'))),
    h('div', { className: 'of-game-bottom' },
      h('div', { className: 'of-game-hint', role: 'status' }, h('kbd', null, hint.startsWith('Click') ? 'WASD' : 'E'), h('span', null, hint.replace(/^E\s+[·:—–-]?\s*/, ''))),
      h('div', { className: 'of-game-options' }, h('label', null, h('input', { type: 'checkbox', checked: quiet, onChange: event => setQuiet(event.target.checked) }), 'Quiet motion'),
        !lobby ? h('button', { type: 'button', className: 'of-text-button', onClick: () => setEditing(true) }, 'Decorate') : null,
        h('button', { type: 'button', className: 'of-text-button', onClick: () => setDrawer('credits') }, 'Credits'))),
    lobby && !drawer ? h('button', { className: 'of-welcome-card', type: 'button', onClick: () => setDrawer('floors') },
      h('strong', null, 'Your team is upstairs'), h('span', null, 'Take the lift to your group’s office.'), h('b', null, 'Choose a floor')) : null,
    drawer ? h('aside', { className: 'of-game-drawer', 'aria-label': drawer === 'floors' ? 'Floor directory' : drawer === 'team' ? 'Office members' : 'Credits' },
      h('div', { className: 'of-section-heading' }, h('h2', null, drawer === 'floors' ? 'Where to?' : drawer === 'team' ? 'Your coworkers' : 'Made with care'), h('button', { className: 'of-text-button', type: 'button', onClick: closeDrawer }, 'Close ×')),
      drawer === 'floors' ? h('div', { className: 'of-directory' },
        h('p', { className: 'of-muted' }, 'Every group has a place of its own.'),
        !lobby ? h('button', { type: 'button', className: 'of-floor-row', onClick: () => actions.openOffice() }, h('span', { className: 'of-floor-number' }, 'G'), h('strong', null, 'Reception & lounge')) : null,
        building.floors.map(entry => h('button', { key: entry.id, type: 'button', className: 'of-floor-row', onClick: () => { actions.openOffice(entry.id); setDrawer(null) } },
          h('span', { className: 'of-floor-number' }, `${entry.number}F`), h('span', { className: 'of-floor-copy' }, h('strong', null, entry.name), h('span', null, entry.purpose), h('small', null, `${entry.members.length} desks · ${entry.working} working`)), h('span', { className: 'of-floor-visit' }, '→'))),
        h('button', { type: 'button', className: 'of-button of-add-floor', onClick: () => { actions.closeOffice(); actions.openNewChat('group') } }, 'New group, new office'))
        : drawer === 'team' ? h('div', null, h('p', { className: 'of-muted' }, 'Choose a teammate for a quick conversation. In the room, walk over and press E.'),
          h(MemberList, { floor, selected, generating, onSelect: id => { setDrawer(null); setSelected(id) } }),
          h(OfficeComposer, { key: floor.id, floor, selected: null, actions, readOnly: Boolean(roster.readOnly) }))
          : h('div', { className: 'of-credits' }, h('p', null, 'Built with Phaser.'),
            h('p', null, 'LPC Revised office and character artwork by ElizaWy and the LPC contributors. OGA-BY 3.0; individual credits and terms are included with the artwork.'),
            h('a', { href: 'https://github.com/ElizaWy/LPC', target: '_blank', rel: 'noreferrer' }, 'LPC artwork and contributor credits'),
            h('a', { href: 'https://opengameart.org/content/lpc-revised-the-office', target: '_blank', rel: 'noreferrer' }, 'LPC Revised office collection'),
            h('p', null, 'Momo the dog: Ninja Adventure by Pixel-Boy / Sparklin Labs. CC0.'), h('a', { href: 'https://github.com/sparklinlabs/superpowers-asset-packs', target: '_blank', rel: 'noreferrer' }, 'Ninja Adventure collection'), h('p', null, 'Room composition, interface, short stories and Star catcher: DeepSeek Office.')))
      : null,
    member ? h('section', { className: 'of-game-dialogue', 'aria-label': `Talk to ${member.bot.name}` },
      h('button', { type: 'button', className: 'of-dialogue-close of-text-button', onClick: closeConversation }, 'Close ×'),
      h(CharacterCard, { key: member.bot.id, member, roomId: floor.id, actions, generating, onGenerate: generate, readOnly: Boolean(roster.readOnly) }),
      h(OfficeComposer, { key: floor.id, floor, selected, actions, readOnly: Boolean(roster.readOnly) })) : null,
    interaction ? ['coffee', 'reading', 'arcade', 'meal', 'drink', 'exercise'].includes(interaction.kind)
      ? h(OfficeActivity, { key: `${lobby ? 'lobby' : floor.id}:${interaction.id}`, interaction, roomId: lobby ? 'lobby' : floor.id, sceneApi, onClose: closeInteraction })
      : h('section', { className: 'of-prop-dialogue', role: 'dialog', 'aria-label': interaction.label }, h('h2', null, interaction.label), h('p', null, interaction.text), h('button', { type: 'button', className: 'of-button', onClick: closeInteraction }, 'Close')) : null,
    editing ? h('div', { className: 'of-game-drawer' }, h(ThemeEditor, { floor, actions, onClose: () => setEditing(false), readOnly: Boolean(roster.readOnly) })) : null)
}
