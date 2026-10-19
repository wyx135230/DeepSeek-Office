import { createElement as h, useEffect, useRef, useState } from 'react'

const ROOM_COLORS = { work: '#b7cbd0', office: '#b7cbd0', cafe: '#d5c5ab', library: '#c1cdb5', arcade: '#b7c3d0', restaurant: '#d5ccb8', bar: '#c8bdcc', gym: '#b7cfc5', corridor: '#dce2d8', reception: '#d4dcd1' }
const rectangle = value => ({ x: value.x ?? 0, y: value.y ?? 0, width: value.width ?? 8, height: value.height ?? 8 })

export function OfficeMap({ sceneApi, onRoomChange }) {
  const [snapshot, setSnapshot] = useState(null)
  const [inspecting, setInspecting] = useState(false)
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
      if (next.camera?.mode) setInspecting(['manual', 'inspect', 'inspection', 'pan'].includes(next.camera.mode))
      const current = next.currentRoom ?? next.world.rooms?.find(room => next.player.x >= room.x && next.player.x <= room.x + room.width && next.player.y >= room.y && next.player.y <= room.y + room.height)
      const name = typeof current === 'string' ? current : current?.name ?? 'Corridor'
      roomName.current = name
      onRoomChange?.(name)
    }
    poll()
    const timer = window.setInterval(poll, 200)
    return () => window.clearInterval(timer)
  }, [sceneApi, onRoomChange])
  const world = snapshot?.world
  const rooms = world?.rooms ?? []
  const view = snapshot?.camera?.visibleWorld
  const follow = () => { sceneApi.current?.followPlayer?.(); setInspecting(false); document.querySelector('.of-scene')?.focus({ preventScroll: true }) }
  const pan = (x, y) => { sceneApi.current?.panTo?.(x, y); setInspecting(true) }
  const pointFromPointer = event => {
    if (!world || !map.current) return
    const bounds = map.current.getBoundingClientRect()
    pan(Math.max(0, Math.min(world.width, (event.clientX - bounds.left) / bounds.width * world.width)), Math.max(0, Math.min(world.height, (event.clientY - bounds.top) / bounds.height * world.height)))
  }
  return h('aside', { className: 'of-map-rail', 'aria-label': 'Floor map' },
    h('div', { className: 'of-map-heading' }, h('h2', null, 'Floor map'), h('button', { type: 'button', className: 'of-text-button', onClick: follow, title: 'Follow your character' }, 'Follow')),
    h('p', { className: 'of-map-current', role: 'status' }, roomName.current || 'Opening the floor…'),
    world ? h('svg', { ref: map, className: 'of-floor-map', viewBox: `0 0 ${world.width} ${world.height}`, preserveAspectRatio: 'none', role: 'application', tabIndex: 0,
      'aria-label': 'Interactive floor map. Click or drag to inspect. Arrow keys pan; Home follows your character.',
      style: { aspectRatio: `${world.width} / ${world.height}` },
      onPointerDown: event => { event.preventDefault(); dragging.current = true; event.currentTarget.focus(); event.currentTarget.setPointerCapture(event.pointerId); pointFromPointer(event) },
      onPointerMove: event => { if (dragging.current) pointFromPointer(event) },
      onPointerUp: () => { dragging.current = false }, onPointerCancel: () => { dragging.current = false },
      onKeyDown: event => {
        const moves = { ArrowLeft: [-96, 0], ArrowRight: [96, 0], ArrowUp: [0, -96], ArrowDown: [0, 96] }
        if (event.key === 'Home') { event.preventDefault(); follow() }
        else if (moves[event.key] && view) { event.preventDefault(); event.stopPropagation(); const [dx, dy] = moves[event.key]; pan((view.left + view.right) / 2 + dx, (view.top + view.bottom) / 2 + dy) }
      } },
      h('rect', { width: world.width, height: world.height, fill: '#e5eae0' }),
      rooms.map((room, index) => h('rect', { key: room.id ?? index, ...rectangle(room), fill: ROOM_COLORS[room.kind ?? room.type] ?? '#e2d6b8', stroke: '#a58a60', strokeWidth: 3 })),
      (world.furniture ?? []).map((item, index) => h('rect', { key: `fixture-${index}`, ...rectangle(item), fill: '#a8906b', opacity: 0.65 })),
      (world.walls ?? []).map((wall, index) => h('rect', { key: `wall-${index}`, ...rectangle(wall), fill: '#9aaca6' })),
      (world.doors ?? []).map((door, index) => h('rect', { key: `door-${index}`, ...rectangle(door), fill: door.open ? '#9ab183' : '#8a6440', stroke: '#f7efd9', strokeWidth: 2 })),
      view ? h('rect', { x: Math.max(0, view.left), y: Math.max(0, view.top), width: Math.max(0, Math.min(world.width, view.right) - Math.max(0, view.left)), height: Math.max(0, Math.min(world.height, view.bottom) - Math.max(0, view.top)), fill: '#ffffff14', stroke: '#486f8d', strokeWidth: Math.max(4, world.width / 130), strokeDasharray: '12 6' }) : null,
      (snapshot.actors ?? []).map(actor => h('circle', { key: actor.id, cx: actor.x, cy: actor.y, r: Math.max(7, world.width / 75), fill: actor.state === 'waiting' ? '#ad683e' : '#6d8667', stroke: '#f7f5e9', strokeWidth: 3 })),
      snapshot.player ? h('circle', { cx: snapshot.player.x, cy: snapshot.player.y, r: Math.max(9, world.width / 65), fill: '#386b91', stroke: '#fffdf4', strokeWidth: 4 }) : null)
      : h('div', { className: 'of-map-loading', role: 'status' }, 'Drawing the map…'),
    h('div', { className: 'of-map-legend' }, h('span', null, h('i', { className: 'of-map-you' }), 'You'), h('span', null, h('i', { className: 'of-map-coworker' }), 'Team'), h('span', null, h('i', { className: 'of-map-view' }), 'View')),
    h('p', { className: 'of-muted of-map-help' }, inspecting ? 'Inspecting the floor. Follow to return.' : 'Click or drag to look around.'),
    h('nav', { className: 'of-map-rooms', 'aria-label': 'Rooms on this floor' }, rooms.filter(room => !['corridor', 'hallway'].includes(room.kind ?? room.type)).map((room, index) => h('button', {
      key: room.id ?? index, type: 'button', className: 'of-map-room', 'aria-current': room.name === roomName.current ? 'location' : undefined,
      onClick: () => pan(room.x + room.width / 2, room.y + room.height / 2),
    }, h('span', { style: { background: ROOM_COLORS[room.kind ?? room.type] ?? '#d6dcc9' }, 'aria-hidden': true }), room.name ?? `Room ${index + 1}`)),
    world?.elevator ? h('button', { type: 'button', className: 'of-map-room', onClick: () => pan(world.elevator.center.x, world.elevator.center.y) },
      h('span', { style: { background: '#397e78' }, 'aria-hidden': true }), 'Lift') : null))
}
