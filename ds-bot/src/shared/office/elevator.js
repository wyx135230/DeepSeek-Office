export const inElevator = (point, lift) => point.x >= lift.center.x - 12 && point.x <= lift.center.x + 12 && Math.abs(point.y - lift.center.y) <= 14

export function createElevatorJourney({ floors, current, quiet, navigate, change, complete, now = () => performance.now(), schedule = setTimeout, cancel = clearTimeout }) {
  let state = null, timer = null, disposed = false, generation = 0
  const emit = next => { state = next; if (!disposed) change(next) }
  const clear = () => { generation++; if (timer !== null) cancel(timer); timer = null }
  const later = (delay, fn) => {
    const token = generation
    timer = schedule(() => { timer = null; if (!disposed && token === generation) fn() }, delay)
  }
  const error = message => { clear(); emit({ ...state, phase: 'error', error: message }) }
  const fail = message => {
    if (!state || disposed) return
    if (state.phase === 'recovering') { error(message); return }
    clear()
    const destination = floors().find(f => f.id === state.from.id) ?? floors().find(f => f.id === 'lobby') ?? floors()[0]
    if (!destination || current() === destination.id) { error(message); return }
    emit({ ...state, phase: 'recovering', recovery: destination.id, error: message })
    later(12000, () => error('The floor could not open. Close the lift panel or return to chat.'))
    navigate(destination.id)
  }
  const controller = {
    get state() { return state },
    select(id) {
      if (disposed || state || id === current()) return false
      const from = floors().find(f => f.id === current()), to = floors().find(f => f.id === id)
      if (!from || !to) return false
      clear()
      const reduced = quiet(), fadeMs = reduced ? 100 : 550, doorMs = reduced ? 100 : 450
      const stop = value => ({ id: value.id, number: value.number, name: value.name })
      emit({ phase: 'closing', from: stop(from), to: stop(to), direction: to.number > from.number ? 'up' : 'down', progress: 0, reduced, fadeMs, doorMs })
      later(doorMs, () => {
        const start = now(), duration = reduced ? 120 : 1050 + Math.min(1600, Math.abs(to.number - from.number) * 160)
        const move = () => {
          if (!floors().some(f => f.id === id)) { fail('This floor is no longer available.'); return }
          const progress = Math.min(1, (now() - start) / duration)
          emit({ ...state, phase: 'moving', progress })
          if (progress < 1) later(50, move)
          else {
            emit({ ...state, phase: 'loading' })
            later(12000, () => fail('The destination took too long to open.'))
            navigate(id)
          }
        }
        move()
      })
      return true
    },
    ready(id) {
      if (disposed || !state) return
      if (state.phase === 'recovering' && state.recovery === id) { error(state.error); return }
      if (state.phase !== 'loading' || state.to.id !== id) return
      clear(); emit({ ...state, phase: 'arriving' })
      later(state.fadeMs, () => {
        emit({ ...state, phase: 'opening' })
        later(state.doorMs, () => { clear(); emit(null); complete() })
      })
    },
    loading(id) {
      if (disposed || !state || state.to.id !== id || !['arriving', 'opening'].includes(state.phase)) return
      clear(); emit({ ...state, phase: 'loading' })
      later(12000, () => fail('The destination took too long to reopen.'))
    },
    failed(id, message) {
      if (state && [state.to.id, state.recovery].includes(id)) fail(message || 'This floor could not open.')
    },
    reconcile() {
      if (!state || state.phase === 'error') return
      const expected = state.phase === 'recovering' ? state.recovery : state.to.id
      if (!floors().some(f => f.id === expected)) fail('This floor is no longer available.')
    },
    reset() { if (state?.phase === 'error') { clear(); emit(null) } },
    dispose() { clear(); disposed = true; state = null },
  }
  return controller
}
