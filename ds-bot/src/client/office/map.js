import { createElement as h, useEffect, useRef, useState } from 'react'
import { mapPoint, mapViewport, mapDirection } from '../../shared/office/map.js'

const ROOM_COLORS = { work: '#b7cbd0', office: '#b7cbd0', cafe: '#d5c5ab', library: '#c1cdb5', arcade: '#b7c3d0', restaurant: '#d5ccb8', bar: '#c8bdcc', gym: '#b7cfc5', corridor: '#dce2d8', reception: '#d4dcd1' }
const rectangle = value => ({ x: value.x ?? 0, y: value.y ?? 0, width: value.width ?? 8, height: value.height ?? 8 })

export function OfficeMap({ sceneApi, onRoomChange, onCameraModeChange, onRooms, directoryOpen, disabled, selected, members = [] }) {
  const [snapshot, setSnapshot] = useState(null)
  const map = useRef(null)
  const dragging = useRef(false)
  const roomName = useRef('')
  useEffect(() => {
    const poll = () => {
      const scene = sceneApi.current
      if (!scene) return
      const next = scene.snapshot?.()
      if (!next?.world) return
      setSnapshot(next)
      onCameraModeChange?.(next.camera?.mode ?? 'follow')
      const current = next.currentRoom ?? next.world.rooms?.find(room => next.player.x >= room.x && next.player.x <= room.x + room.width && next.player.y >= room.y && next.player.y <= room.y + room.height)
      const name = typeof current === 'string' ? current : current?.name ?? 'Corridor'
      roomName.current = name
      onRoomChange?.(name)
    }
    poll()
    const timer = window.setInterval(poll, 200)
    return () => window.clearInterval(timer)
  }, [sceneApi, onRoomChange, onCameraModeChange])
  const world = snapshot?.world
  const rooms = world?.rooms ?? []
  const view = snapshot?.camera?.visibleWorld
  const follow = () => { sceneApi.current?.followPlayer?.(); document.querySelector('.of-scene')?.focus({ preventScroll: true }) }
  const pan = (x, y) => sceneApi.current?.panTo?.(x, y)
  const pointFromPointer = (event, clamped = false) => {
    if (!world || !map.current) return
    const element = map.current, bounds = element.getBoundingClientRect(), style = getComputedStyle(element)
    const left = parseFloat(style.paddingLeft) || 0, right = parseFloat(style.paddingRight) || 0
    const top = parseFloat(style.paddingTop) || 0, bottom = parseFloat(style.paddingBottom) || 0
    const box = { left: bounds.left + element.clientLeft + left, top: bounds.top + element.clientTop + top, width: element.clientWidth - left - right, height: element.clientHeight - top - bottom }
    const point = mapPoint(world, box, { x: event.clientX, y: event.clientY }, clamped)
    if (point) pan(point.x, point.y)
    return point
  }
  return h('aside', { className: 'of-map-rail', 'aria-label': 'Floor map' },
    world ? h('svg', { ref: map, className: 'of-floor-map', viewBox: `0 0 ${world.width} ${world.height}`, preserveAspectRatio: 'xMidYMid meet', role: 'application', tabIndex: 0,
      'aria-label': 'Interactive floor map. Click or drag to inspect. Arrow keys pan; Home follows your character.',
      onPointerDown: event => { if (event.button !== 0 || !pointFromPointer(event)) return; event.preventDefault(); dragging.current = true; event.currentTarget.focus(); event.currentTarget.setPointerCapture(event.pointerId) },
      onPointerMove: event => { if (dragging.current) pointFromPointer(event, true) },
      onPointerUp: () => { dragging.current = false }, onPointerCancel: () => { dragging.current = false },
      onKeyDown: event => {
        const moves = { ArrowLeft: [-96, 0], ArrowRight: [96, 0], ArrowUp: [0, -96], ArrowDown: [0, 96] }
        if (event.key === 'Home') { event.preventDefault(); follow() }
        else if (moves[event.key] && view) { event.preventDefault(); event.stopPropagation(); const [dx, dy] = moves[event.key]; pan((view.left + view.right) / 2 + dx, (view.top + view.bottom) / 2 + dy) }
      } },
      h('rect', { width: world.width, height: world.height, fill: '#edf1e7' }),
      rooms.map((room, index) => h('rect', { key: room.id ?? index, ...rectangle(room), rx: 10, fill: ROOM_COLORS[room.kind ?? room.type] ?? '#e2d6b8', fillOpacity: .65, stroke: '#aebfa6', strokeWidth: 3 })),
      (world.walls ?? []).map((wall, index) => h('rect', { key: `wall-${index}`, ...rectangle(wall), fill: '#b5c5ac' })),
      (world.doors ?? []).map((door, index) => h('rect', { key: `door-${index}`, ...rectangle(door), fill: door.open ? '#b6cba3' : '#c5b28e' })),
      view ? h('rect', { ...mapViewport(world, view), rx: 8, fill: '#467d8410', stroke: '#789c9c', strokeWidth: Math.max(3, world.width / 240) }) : null,
      (snapshot.actors ?? []).map(actor => h('g', { key: actor.id },
        h('title', null, members.find(member => member.bot.id === actor.id)?.bot.name ?? 'Teammate'),
        actor.id === selected ? h('circle', { cx: actor.x, cy: actor.y, r: Math.max(13, world.width / 55), fill: 'none', stroke: '#527f78', strokeWidth: 3 }) : null,
        h('circle', { cx: actor.x, cy: actor.y, r: Math.max(7, world.width / 85), fill: actor.state === 'waiting' ? '#b58a4b' : '#79936e', stroke: '#fcfdf7', strokeWidth: 4 }))),
      snapshot.player ? h('g', { transform: `translate(${snapshot.player.x} ${snapshot.player.y}) rotate(${mapDirection(snapshot.player.direction)}) scale(${Math.max(1, world.width / 750)})` },
        h('circle', { r: 17, fill: '#3b7b8620' }), h('path', { d: 'M0 -14L10 12L0 7L-10 12Z', fill: '#3b7582', stroke: '#fcfdf7', strokeWidth: 3, strokeLinejoin: 'round' })) : null)
      : h('div', { className: 'of-map-loading', role: 'status' }, 'Drawing the map…'),
    h('div', { className: 'of-map-meta' },
      h('button', { type: 'button', className: 'of-hud-room', onClick: onRooms, disabled, 'aria-expanded': directoryOpen, 'aria-controls': 'office-hud-drawer', title: 'Rooms on this floor' }, h('span', { role: 'status' }, roomName.current || 'Opening the floor…'), h('span', { 'aria-hidden': true }, '⌄')),
      h('div', { className: 'of-map-legend', title: 'Arrow: you · Green: teammate · Amber: waiting · Outline: camera' }, h('span', null, h('i', { className: 'of-map-you' }), 'You'), h('span', null, h('i', { className: 'of-map-coworker' }), 'Team'))))
}

export function OfficeRoomDirectory({ sceneApi, currentRoom, onClose }) {
  const [world, setWorld] = useState(null)
  useEffect(() => {
    const read = () => setWorld(sceneApi.current?.snapshot()?.world ?? null)
    read()
    const timer = setInterval(read, 500)
    return () => clearInterval(timer)
  }, [sceneApi])
  const pan = (x, y) => { sceneApi.current?.panTo?.(x, y); onClose() }
  return h('nav', { className: 'of-map-rooms', 'aria-label': 'Rooms on this floor' },
    !world ? h('p', { role: 'status' }, 'Opening the floor…') : null,
    (world?.rooms ?? []).filter(room => !['corridor', 'hallway'].includes(room.kind ?? room.type)).map((room, index) => h('button', {
      key: room.id ?? index, type: 'button', className: 'of-map-room', 'aria-current': room.name === currentRoom ? 'location' : undefined,
      onClick: () => pan(room.x + room.width / 2, room.y + room.height / 2),
    }, h('span', { style: { background: ROOM_COLORS[room.kind ?? room.type] ?? '#d6dcc9' }, 'aria-hidden': true }), room.name ?? `Room ${index + 1}`)),
    world?.elevator ? h('button', { type: 'button', className: 'of-map-room', onClick: () => pan(world.elevator.center.x, world.elevator.center.y) },
      h('span', { style: { background: '#397e78' }, 'aria-hidden': true }), 'Lift') : null)
}
