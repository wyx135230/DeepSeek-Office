import { createElement as h, useCallback, useEffect, useRef, useState } from 'react'
import { createElevatorJourney } from '../../shared/office/elevator.js'

export function useOfficeElevator({ building, currentId, quiet, actions, sceneApi }) {
  const [open, setOpen] = useState(false), [travel, setTravel] = useState(null)
  const latest = useRef(null), controller = useRef(null)
  latest.current = { building, currentId, quiet, actions, sceneApi }
  const makeController = () => createElevatorJourney({
    floors: () => [{ id: 'lobby', number: 0, name: 'Reception & lounge' }, ...latest.current.building.floors],
    current: () => latest.current.currentId, quiet: () => latest.current.quiet,
    navigate: id => latest.current.actions.openOffice(id === 'lobby' ? null : id),
    change: state => { setTravel(state); latest.current.sceneApi.current?.setLiftTravel(state) },
    complete: () => { setOpen(false); latest.current.sceneApi.current?.leaveLift(); document.querySelector('.of-scene')?.focus({ preventScroll: true }) },
  })
  if (!controller.current) controller.current = makeController()
  useEffect(() => {
    if (!controller.current) controller.current = makeController()
    return () => { controller.current?.dispose(); controller.current = null }
  }, [])
  useEffect(() => { controller.current.reconcile() }, [building])
  const ready = useCallback((id, scene) => {
    scene.setLiftTravel(controller.current?.state)
    controller.current?.ready(id)
  }, [])
  const failed = useCallback((id, error) => controller.current?.failed(id, error?.message), [])
  const loading = useCallback(id => controller.current?.loading(id), [])
  const close = () => {
    if (controller.current.state && controller.current.state.phase !== 'error') return
    controller.current.reset(); setOpen(false); sceneApi.current?.leaveLift()
    document.querySelector('.of-scene')?.focus({ preventScroll: true })
  }
  return { open, travel, busy: Boolean(travel && travel.phase !== 'error'), atElevator: open || Boolean(travel),
    enter: () => { if (!controller.current.state) setOpen(true) }, close, ready, failed, loading,
    select: id => controller.current.select(id),
  }
}

const LABELS = { closing: 'Closing doors', moving: 'Travelling', loading: 'Opening destination', arriving: 'Arriving', opening: 'Opening doors', recovering: 'Returning safely', error: 'Trip interrupted' }

export function ElevatorPanel({ elevator, building, currentId, sceneApi }) {
  const { travel, busy } = elevator
  const [anchor, setAnchor] = useState(null)
  const panel = useRef(null)
  useEffect(() => {
    const poll = () => setAnchor(sceneApi.current?.liftAnchor() ?? null)
    poll(); const timer = setInterval(poll, 150)
    panel.current?.querySelector('button:not(:disabled)')?.focus({ preventScroll: true })
    return () => clearInterval(timer)
  }, [sceneApi])
  const floors = [{ id: 'lobby', number: 0, name: 'Reception & lounge', purpose: 'Building reception and shared lounge', members: [], working: 0 }, ...building.floors]
  const current = floors.find(f => f.id === currentId)
  const readout = travel && travel.phase !== 'error' ? Math.round(travel.from.number + (travel.to.number - travel.from.number) * travel.progress) : current?.number ?? 0
  return h('aside', { className: 'of-elevator-panel', ref: panel, role: 'dialog', 'aria-label': 'Lift controls', 'aria-modal': 'false',
    style: anchor ? { '--lift-x': `${anchor.x - 365}px`, '--lift-y': `${anchor.y - 165}px` } : undefined },
    h('div', { className: 'of-lift-heading' }, h('h2', null, 'Lift'), h('button', { type: 'button', className: 'of-text-button', disabled: busy, onClick: elevator.close, 'aria-label': 'Leave lift' }, 'Close')),
    h('div', { className: 'of-lift-display', 'data-direction': travel?.direction },
      h('span', { className: 'of-lift-arrow', 'aria-hidden': true }, travel ? travel.direction === 'up' ? '↑' : '↓' : '↕'),
      h('strong', null, readout === 0 ? 'G' : `${readout}F`),
      h('span', { role: 'status', 'aria-live': 'polite' }, travel ? `${LABELS[travel.phase]}${travel.phase === 'moving' ? ` ${travel.direction}` : ''}` : 'Choose a floor')),
    travel?.error ? h('p', { role: 'alert', className: 'of-lift-error' }, travel.error) : null,
    travel && !travel.error ? h('div', { className: 'of-lift-trip' }, h('span', null, `To ${travel.to.number === 0 ? 'G' : `${travel.to.number}F`} · ${travel.to.name}`),
      h('div', { className: 'of-lift-shaft', 'aria-hidden': true }, h('i')),
      h('progress', { 'aria-label': 'Lift trip progress', max: 1, value: travel.progress })) : null,
    h('nav', { className: 'of-lift-stops', 'aria-label': 'Lift destinations' }, floors.map(floor => h('button', { key: floor.id, type: 'button', className: 'of-lift-stop',
      disabled: busy || floor.id === currentId || Boolean(travel), 'aria-current': floor.id === currentId ? 'location' : undefined,
      onClick: () => elevator.select(floor.id) },
    h('span', { className: 'of-lift-number' }, floor.number === 0 ? 'G' : `${floor.number}F`),
    h('span', null, h('strong', null, floor.name), h('small', null, floor.purpose),
      h('small', null, floor.number === 0 ? 'Reception' : `${floor.members.length} teammates · ${floor.working} working`)),
    h('span', { className: 'of-lift-stop-mark', 'aria-hidden': true }, floor.id === currentId ? '●' : '→')))))
}

export const ELEVATOR_CSS = `
.of-elevator-panel{position:absolute;z-index:12;left:clamp(16px,var(--lift-x,60%),calc(100% - 352px));top:clamp(96px,var(--lift-y,140px),max(96px,calc(100% - 520px)));width:330px;max-height:calc(100% - 180px);display:flex;flex-direction:column;padding:18px;background:#f2f5f0;color:#293c40;border:1px solid #a7b8b5;border-radius:9px;box-shadow:0 14px 44px #25383b35,inset 0 0 0 4px #e0e7e2;pointer-events:auto}
.of-lift-heading{display:flex;align-items:center;justify-content:space-between;margin-bottom:13px}.of-lift-heading h2{font:600 17px 'Segoe UI',sans-serif;margin:0}.of-lift-heading button:disabled{opacity:.4;cursor:default}
.of-lift-display{display:grid;grid-template-columns:28px 64px 1fr;align-items:center;gap:10px;min-height:74px;padding:10px 14px;border-radius:4px;background:#26343f;color:#e6ba6a;box-shadow:inset 0 2px 6px #0004}.of-lift-display strong{font:500 33px 'Segoe UI',sans-serif;font-variant-numeric:tabular-nums}.of-lift-display [role=status]{color:#d8e4df;font-size:12px;line-height:1.5}.of-lift-arrow{font-size:28px}
.of-lift-stops{display:flex;flex-direction:column;gap:0;overflow:auto;margin-top:14px;overscroll-behavior:contain}.of-lift-stop{display:grid;grid-template-columns:35px 1fr 16px;gap:12px;align-items:center;text-align:left;padding:13px 6px;background:transparent;border:0;border-bottom:1px solid #d7e0d9;color:inherit;font:inherit;cursor:pointer}.of-lift-stop strong,.of-lift-stop small{display:block;overflow-wrap:anywhere}.of-lift-stop strong{font-size:14px}.of-lift-stop small{font-size:11px;color:#6a7d7c;margin-top:3px;line-height:1.45}.of-lift-number{font-size:19px;font-variant-numeric:tabular-nums}.of-lift-stop:hover:not(:disabled){background:#e3ece5}.of-lift-stop[aria-current]{color:#397e78;background:#e3ece5}.of-lift-stop:disabled{cursor:default}.of-lift-stop:disabled:not([aria-current]){opacity:.5}.of-lift-stop-mark{color:#397e78}
.of-lift-trip{padding-top:13px;font-size:12px}.of-lift-trip progress{width:100%;height:4px;accent-color:#397e78;margin-top:10px}.of-lift-shaft{position:relative;height:28px;overflow:hidden;margin-top:10px;background:#dce5df;border-radius:3px}.of-lift-shaft i{position:absolute;inset:-30px 0;background:repeating-linear-gradient(0deg,transparent 0 12px,#97afaa 12px 14px,transparent 14px 26px);animation:of-shaft 1s linear infinite}.of-workspace[data-lift-direction=down] .of-lift-shaft i{animation-direction:reverse}@keyframes of-shaft{to{transform:translateY(-26px)}}
.of-lift-error{font-size:12px;color:#974d35;padding:10px 0;margin:0}.of-lift-cover{position:absolute;inset:70px 0 60px;z-index:8;pointer-events:none;background:#e1e6df;opacity:0;transition:opacity var(--lift-fade,550ms) ease}.of-workspace[data-lift-phase=moving] .of-lift-cover,.of-workspace[data-lift-phase=loading] .of-lift-cover,.of-workspace[data-lift-phase=recovering] .of-lift-cover{opacity:1}
.of-workspace[data-lift-phase] .of-scene-wrap{transition:opacity var(--lift-fade,550ms) ease,transform var(--lift-fade,550ms) cubic-bezier(.4,0,.2,1)}.of-workspace[data-lift-phase=moving] .of-scene-wrap,.of-workspace[data-lift-phase=loading] .of-scene-wrap,.of-workspace[data-lift-phase=recovering] .of-scene-wrap{opacity:0;transform:translateY(var(--lift-shift,-28px));pointer-events:none}.of-workspace[data-lift-phase] .of-map-rail,.of-workspace[data-lift-phase] .of-camera-tools{pointer-events:none}
.of-workspace[data-quiet] .of-lift-shaft i{animation:none}.of-workspace[data-quiet][data-lift-phase] .of-scene-wrap{transform:none}
@container office (max-width:760px){.of-elevator-panel{left:14px;right:14px;top:90px;bottom:150px;width:auto;max-width:350px;max-height:calc(100% - 245px);padding:16px}.of-lift-display{min-height:58px}.of-lift-stop{padding:10px 5px}}
`
