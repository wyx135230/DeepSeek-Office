// Some embedded Harness views limit rAF to 1Hz while ordinary timers remain live.
export const OFFICE_FPS = Object.freeze({ target: 60, forceSetTimeOut: true })

export function bindOfficeVisibility(game, visibility, onHide = () => {}) {
  let sleeping = false
  const update = () => {
    if (visibility.hidden && !sleeping) { onHide(); game.loop.sleep(); sleeping = true }
    else if (!visibility.hidden && sleeping) { game.loop.resetDelta(); game.loop.wake(); sleeping = false }
  }
  visibility.addEventListener('visibilitychange', update)
  update()
  return () => {
    visibility.removeEventListener('visibilitychange', update)
    // Phaser's public destroy() is deferred until the next engine frame.
    if (sleeping) { game.loop.resetDelta(); game.loop.wake(); sleeping = false }
  }
}
