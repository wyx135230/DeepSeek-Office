import { createElement as h, useEffect, useRef, useState } from 'react'
import { createStarRound, moveStarCatcher, tickStarRound, STAR_LANES, STAR_ROUND_MS } from '../../shared/office/arcade.js'
import { MEAL_INGREDIENTS, DRINK_STEPS, EXERCISE_REPS, FACILITY_WINDOW, facilityBeat, inFacilityWindow, addMealIngredient } from '../../shared/office/facilities.js'

const BOOKS = [
  { title: 'The window garden', author: 'A studio short story', color: '#6a8060', pages: [
    'On Monday, June found a seed in the pocket of her winter coat. She planted it in a chipped blue cup and put it beside the studio window. By Friday, everyone had asked what she was growing. “A reason to look up,” she said.',
    'The first leaf arrived during a very long meeting. Nobody saw it unfold. Still, by lunchtime, five people had stopped at the window. Someone brought water. Someone moved the cup into the sun. The work could wait for a moment.',
    'By spring, the windowsill held a small, uneven garden. The blue cup was still in the middle. June never learned what the original plant was called. She liked that there was one thing in the studio that did not need a name.'
  ] },
  { title: 'A walk after rain', author: 'Notes from the neighborhood', color: '#718a9b', pages: [
    'The rain had stopped, but the city was still listening. Water ticked from the awning of the corner shop. A bicycle made a long silver line through a puddle. At the crossing, nobody seemed in a hurry.',
    'I took the longer road home. There was a bakery I had walked past a hundred times, its window warm against the wet street. Today I went inside. The baker handed me the last small loaf and asked if I wanted it sliced.',
    'At home, I opened the window and put the kettle on. I had no new ideas, and I had solved no problems. But the room felt larger. Sometimes a walk gives you just enough space to begin again.'
  ] },
  { title: 'Small things, made well', author: 'Three notes on making', color: '#9e795b', pages: [
    'Start with the part someone touches first. The handle of a mug. The opening line of a letter. A button that does exactly what its name promises. Care is easiest to recognize when it saves someone a little effort.',
    'Leave room for the next person. A clear path through a room, a useful note beside a drawing, an empty page at the back of a notebook. Good work offers a place for someone else to continue.',
    'Know when to put the tools down. Look at the work in daylight. Make tea. Come back and notice the thing you were too close to see. Finishing is sometimes the smallest change, made after a proper rest.'
  ] }
]

function bestScore(roomId) {
  try {
    const score = Number(window.localStorage.getItem(`office-stars:${roomId}`))
    return Number.isFinite(score) ? Math.max(0, score) : 0
  } catch { return 0 }
}

function CoffeeBreak({ sceneApi }) {
  const [started, setStarted] = useState(false)
  const [activity, setActivity] = useState(null)
  const [error, setError] = useState('')
  useEffect(() => {
    if (!started) return undefined
    const poll = () => setActivity(sceneApi.current?.activity?.() ?? null)
    poll()
    const timer = window.setInterval(poll, 200)
    return () => window.clearInterval(timer)
  }, [started, sceneApi])
  const complete = activity?.complete || activity?.phase === 'complete'
  const progress = Math.max(0, Math.min(1, Number(activity?.progress) || 0))
  return h('div', { className: 'of-coffee-break' },
    h('p', { className: 'of-muted' }, 'A fresh cup and a moment away from your desk.'),
    h('div', { className: 'of-coffee-visual', 'aria-hidden': true }, h('span', { className: `of-cup${started ? ' is-brewing' : ''}` }, h('i', { style: { height: `${started ? 16 + progress * 58 : 0}%` } })), h('span', null, complete ? 'Enjoy your coffee.' : started ? 'Making a little time for yourself.' : 'The kettle is ready.')),
    started ? h('div', { className: 'of-brew-status' },
      h('progress', { max: 1, value: progress, 'aria-label': 'Coffee break progress' }),
      h('p', { role: 'status' }, complete ? 'All done. Feeling refreshed?' : activity?.label || 'Preparing your coffee…')) : null,
    error ? h('p', { role: 'alert', className: 'of-error' }, error) : null,
    h('button', { type: 'button', className: 'of-button of-primary', disabled: started && !complete, onClick: () => {
      try { sceneApi.current?.endActivity?.(); sceneApi.current?.beginActivity?.('coffee'); setActivity(null); setStarted(true); setError('') } catch (failure) { setError(failure.message) }
    } }, complete ? 'Make another cup' : started ? 'Brewing…' : 'Brew a cup'))
}

function ReadingBreak({ sceneApi }) {
  const [book, setBook] = useState(null)
  const [page, setPage] = useState(0)
  return h('div', { className: 'of-reading-break' }, book ? h('div', null,
    h('button', { type: 'button', className: 'of-text-button', onClick: () => { sceneApi.current?.endActivity?.(); setBook(null) } }, 'Back to the shelf'),
    h('article', { key: page, className: 'of-book-page' }, h('h3', null, book.title), h('p', null, book.pages[page])),
    h('nav', { className: 'of-page-navigation', 'aria-label': 'Book pages' },
      h('button', { type: 'button', className: 'of-button', disabled: page === 0, onClick: () => { setPage(page - 1); sceneApi.current?.turnPage?.(page - 1) } }, 'Previous'),
      h('span', { role: 'status' }, `${page + 1} / ${book.pages.length}`),
      h('button', { type: 'button', className: 'of-button', disabled: page === book.pages.length - 1, onClick: () => { setPage(page + 1); sceneApi.current?.turnPage?.(page + 1) } }, 'Next')))
    : h('div', null, h('p', { className: 'of-muted' }, 'Choose a short read. Your seat by the window is waiting.'),
      h('div', { className: 'of-bookshelf' }, BOOKS.map(entry => h('button', { type: 'button', key: entry.title, className: 'of-book-choice', onClick: () => { setBook(entry); setPage(0); sceneApi.current?.beginActivity?.('reading', { title: entry.title }) } },
        h('span', { className: 'of-book-cover', style: { background: entry.color }, 'aria-hidden': true }), h('span', null, h('strong', null, entry.title), h('small', null, entry.author)), h('span', { className: 'of-muted' }, '3 pages'))))))
}

function StarArcade({ sceneApi, roomId }) {
  const [game, setGame] = useState(null)
  const [best, setBest] = useState(() => bestScore(roomId))
  const board = useRef(null)
  const playing = game?.phase === 'playing'
  useEffect(() => {
    if (!playing) return undefined
    board.current?.focus()
    let last = performance.now()
    const timer = window.setInterval(() => {
      const now = performance.now(), dt = Math.min(100, now - last)
      last = now
      setGame(state => tickStarRound(state, dt))
    }, 33)
    return () => window.clearInterval(timer)
  }, [playing])
  useEffect(() => {
    if (game?.phase !== 'complete') return
    sceneApi.current?.endActivity?.()
    if (game.score > best) {
      setBest(game.score)
      try { window.localStorage.setItem(`office-stars:${roomId}`, String(game.score)) } catch { /* storage may be disabled */ }
    }
  }, [game?.phase, game?.score, best, roomId, sceneApi])
  const move = direction => { setGame(state => state ? moveStarCatcher(state, direction) : state); board.current?.focus() }
  return h('div', { className: 'of-star-arcade' },
    h('p', { className: 'of-muted', id: 'of-arcade-help' }, 'Catch falling stars. Move with the left and right arrows or A and D. You have 30 seconds.'),
    h('div', { className: 'of-arcade-score' }, h('span', null, 'Score ', h('strong', null, game?.score ?? 0)), h('span', null, 'Best ', h('strong', null, best)), h('span', { role: 'timer', 'aria-label': 'Seconds remaining' }, `${Math.ceil((STAR_ROUND_MS - (game?.elapsed ?? 0)) / 1000)}s`)),
    h('div', { ref: board, className: 'of-star-board', tabIndex: 0, role: 'group', 'aria-label': 'Star catcher game board', 'aria-describedby': 'of-arcade-help', onKeyDown: event => {
      const key = event.key.toLowerCase()
      if (['arrowleft', 'arrowright', 'a', 'd', 'w', 's', 'arrowup', 'arrowdown', 'e', ' '].includes(key)) {
        event.preventDefault(); event.stopPropagation()
        if (key === 'arrowleft' || key === 'a') move(-1)
        if (key === 'arrowright' || key === 'd') move(1)
      }
    }, onKeyUp: event => event.stopPropagation() },
      Array.from({ length: STAR_LANES - 1 }, (_, lane) => h('span', { key: `line-${lane}`, className: 'of-star-lane', style: { left: `${(lane + 1) / STAR_LANES * 100}%` }, 'aria-hidden': true })),
      game?.stars.map(star => h('span', { key: star.id, className: 'of-falling-star', style: { left: `${(star.lane + 0.5) / STAR_LANES * 100}%`, top: `${star.y * 100}%` }, 'aria-hidden': true }, '✦')),
      h('span', { className: 'of-star-catcher', style: { left: `${((game?.lane ?? 2) + 0.5) / STAR_LANES * 100}%` }, 'aria-hidden': true }),
      !playing ? h('div', { className: 'of-arcade-screen', role: 'status' }, h('strong', null, game ? `${game.score} points` : 'Star catcher'), h('span', null, game ? 'Nice catch. One more round?' : 'A small game for your next break.')) : null),
    h('div', { className: 'of-arcade-controls' },
      h('button', { type: 'button', className: 'of-button', disabled: !playing, 'aria-label': 'Move catcher left', onClick: () => move(-1) }, '← Left'),
      h('button', { type: 'button', className: 'of-button of-primary', disabled: playing, onClick: () => { sceneApi.current?.beginActivity?.('arcade'); setGame(createStarRound(Date.now())); board.current?.focus() } }, game ? 'Play again' : 'Start game'),
      h('button', { type: 'button', className: 'of-button', disabled: !playing, 'aria-label': 'Move catcher right', onClick: () => move(1) }, 'Right →')))
}

function MealBreak({ sceneApi }) {
  const [phase, setPhase] = useState('ready')
  const [ingredients, setIngredients] = useState([])
  const [progress, setProgress] = useState(0)
  const [feedback, setFeedback] = useState('Layer rice, greens and tofu to make a lunch bowl.')
  useEffect(() => {
    if (phase !== 'serving') return undefined
    const start = performance.now()
    const timer = window.setInterval(() => {
      const amount = Math.min(1, (performance.now() - start) / 1600)
      setProgress(amount)
      sceneApi.current?.activityStep?.({ step: 4, progress: 0.75 + amount * 0.25, label: 'Serving your lunch…' })
      if (amount === 1) { setPhase('complete'); setFeedback('Lunch is ready. A bowl made with care.'); sceneApi.current?.endActivity?.() }
    }, 100)
    return () => window.clearInterval(timer)
  }, [phase, sceneApi])
  const start = () => {
    sceneApi.current?.beginActivity?.('meal', { recipe: 'Garden lunch bowl', manual: true })
    setIngredients([]); setProgress(0); setPhase('preparing'); setFeedback('Start with a layer of rice.')
  }
  const add = ingredient => {
    const next = addMealIngredient(ingredients, ingredient)
    if (next === ingredients) { setFeedback(`Next, add ${MEAL_INGREDIENTS[ingredients.length].toLowerCase()}.`); return }
    setIngredients(next)
    setFeedback(next.length === 3 ? 'Your bowl is assembled. Ready to serve?' : `Good. Next, add ${MEAL_INGREDIENTS[next.length].toLowerCase()}.`)
    sceneApi.current?.activityStep?.({ step: next.length, progress: next.length / 4, label: `Added ${ingredient.toLowerCase()}.` })
  }
  return h('div', { className: 'of-facility-game' },
    h('p', { className: 'of-muted' }, 'Garden lunch bowl · Rice, greens, then tofu.'),
    h('div', { className: 'of-lunch-bowl', 'aria-label': `Bowl: ${ingredients.join(', ') || 'empty'}` },
      h('div', { className: 'of-bowl-ingredients' }, ingredients.map(ingredient => h('span', { key: ingredient, 'data-ingredient': ingredient }, ingredient))), h('div', { className: 'of-bowl-base', 'aria-hidden': true })),
    h('p', { className: 'of-facility-feedback', role: 'status' }, feedback),
    phase === 'preparing' ? h('div', { className: 'of-ingredient-controls' }, ['Tofu', 'Rice', 'Greens'].map(ingredient => h('button', { type: 'button', key: ingredient, className: 'of-button', disabled: ingredients.includes(ingredient), onClick: () => add(ingredient) }, `Add ${ingredient.toLowerCase()}`))) : null,
    phase === 'serving' ? h('progress', { className: 'of-facility-progress', max: 1, value: progress, 'aria-label': 'Serving lunch' }) : null,
    phase === 'ready' || phase === 'complete' ? h('button', { type: 'button', className: 'of-button of-primary', onClick: start }, phase === 'complete' ? 'Make another bowl' : 'Prepare lunch') : null,
    phase === 'preparing' && ingredients.length === 3 ? h('button', { type: 'button', className: 'of-button of-primary', onClick: () => { setPhase('serving'); setFeedback('Serving your lunch…') } }, 'Serve the bowl') : null)
}

function useFacilityBeat(running, round, duration) {
  const [beat, setBeat] = useState(0)
  const clock = useRef(performance.now())
  useEffect(() => {
    clock.current = performance.now()
    setBeat(0)
    if (!running) return undefined
    const timer = window.setInterval(() => setBeat(facilityBeat((performance.now() - clock.current) % duration, duration)), 33)
    return () => window.clearInterval(timer)
  }, [running, round, duration])
  return { beat, readBeat: () => facilityBeat((performance.now() - clock.current) % duration, duration) }
}

function BeatMeter({ beat, label }) {
  return h('div', { className: 'of-beat-meter', role: 'meter', 'aria-label': label, 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': Math.round(beat * 100) },
    h('span', { className: 'of-beat-target', style: { left: `${FACILITY_WINDOW[0] * 100}%`, width: `${(FACILITY_WINDOW[1] - FACILITY_WINDOW[0]) * 100}%` }, 'aria-hidden': true }),
    h('span', { className: 'of-beat-marker', style: { left: `${beat * 100}%` }, 'aria-hidden': true }))
}

function DrinkBreak({ sceneApi }) {
  const [started, setStarted] = useState(false)
  const [step, setStep] = useState(0)
  const [feedback, setFeedback] = useState('A citrus and mint mocktail. No alcohol, just a little sparkle.')
  const complete = step === DRINK_STEPS.length
  const { beat, readBeat } = useFacilityBeat(started && !complete, step, 2300)
  const mix = () => {
    if (!inFacilityWindow(readBeat())) { setFeedback('A little early or late. Try again in the green section.'); return }
    const next = step + 1
    setStep(next)
    sceneApi.current?.activityStep?.({ step: next, progress: next / DRINK_STEPS.length, label: DRINK_STEPS[step].label, complete: next === DRINK_STEPS.length })
    if (next === DRINK_STEPS.length) { setFeedback('Fresh, bright and ready to enjoy. Cheers!'); sceneApi.current?.endActivity?.() }
    else setFeedback(`${DRINK_STEPS[step].label} — done. Next: ${DRINK_STEPS[next].label.toLowerCase()}.`)
  }
  return h('div', { className: 'of-facility-game' },
    h('p', { className: 'of-muted' }, 'Citrus & mint · A three-step mocktail.'),
    h('ol', { className: 'of-recipe-steps' }, DRINK_STEPS.map((entry, index) => h('li', { key: entry.label, 'data-done': index < step || undefined, 'data-current': started && index === step || undefined }, h('span', null, index < step ? '✓' : `${index + 1}`), entry.label))),
    started && !complete ? h('div', null, h('p', { className: 'of-meter-help' }, 'Press the action when the marker reaches green.'), h(BeatMeter, { beat, label: 'Mixing timing' })) : null,
    h('p', { className: 'of-facility-feedback', role: 'status' }, feedback),
    !started || complete ? h('button', { type: 'button', className: 'of-button of-primary', onClick: () => { sceneApi.current?.beginActivity?.('drink', { recipe: 'Citrus & mint', manual: true }); setStarted(true); setStep(0); setFeedback('Pour the citrus when the marker reaches green.') } }, complete ? 'Mix another drink' : 'Make a mocktail')
      : h('button', { type: 'button', className: 'of-button of-primary', onClick: mix }, DRINK_STEPS[step].action))
}

function ExerciseBreak({ sceneApi }) {
  const [started, setStarted] = useState(false)
  const [reps, setReps] = useState(0)
  const [feedback, setFeedback] = useState('Six easy stretches. Find a steady rhythm.')
  const complete = reps === EXERCISE_REPS
  const { beat, readBeat } = useFacilityBeat(started && !complete, reps, 1800)
  const stretch = () => {
    if (!started || complete) return
    if (!inFacilityWindow(readBeat())) { setFeedback('Wait for green, then press once. Take your time.'); return }
    const next = reps + 1
    setReps(next)
    sceneApi.current?.activityStep?.({ step: next, progress: next / EXERCISE_REPS, label: `Stretch ${next} of ${EXERCISE_REPS}`, complete: next === EXERCISE_REPS })
    if (next === EXERCISE_REPS) { setFeedback('Six stretches complete. Nicely done.'); sceneApi.current?.endActivity?.() }
    else setFeedback(`${next} down. Breathe, then stretch on the next green.`)
  }
  return h('div', { className: 'of-facility-game', onKeyDown: event => {
    if (event.code === 'Space' && started && !complete) { event.preventDefault(); event.stopPropagation(); if (!event.repeat) stretch() }
  } }, h('p', { className: 'of-muted' }, 'Press Space or Stretch when the marker reaches green.'),
  h('div', { className: 'of-exercise-count' }, h('strong', null, reps), h('span', null, `/ ${EXERCISE_REPS} stretches`)),
  h('div', { className: 'of-exercise-rounds', 'aria-hidden': true }, Array.from({ length: EXERCISE_REPS }, (_, index) => h('span', { key: index, 'data-done': index < reps || undefined }))),
  started && !complete ? h(BeatMeter, { beat, label: 'Stretch timing' }) : null,
  h('p', { className: 'of-facility-feedback', role: 'status' }, feedback),
  !started || complete ? h('button', { type: 'button', className: 'of-button of-primary', onClick: () => { sceneApi.current?.beginActivity?.('exercise', { exercise: 'Stretch', manual: true }); setStarted(true); setReps(0); setFeedback('Wait for green, then press Space or Stretch.') } }, complete ? 'Start another round' : 'Start stretching')
    : h('button', { type: 'button', className: 'of-button of-primary', onClick: stretch }, 'Stretch'))
}

export function OfficeActivity({ interaction, roomId, sceneApi, onClose }) {
  const panel = useRef(null)
  const kind = interaction.kind
  const title = { coffee: 'Coffee break', reading: 'The reading nook', arcade: 'Arcade corner', meal: 'The lunch counter', drink: 'The mocktail bar', exercise: 'A stretch break' }[kind]
  useEffect(() => {
    const scene = sceneApi.current
    panel.current?.querySelector('button')?.focus()
    return () => { scene?.endActivity?.() }
  }, [sceneApi])
  return h('section', { ref: panel, className: `of-activity-panel of-activity-${kind}`, role: 'dialog', 'aria-modal': true, 'aria-label': title, onKeyDown: event => {
    if (event.key !== 'Tab') return
    const controls = [...panel.current.querySelectorAll('button:not(:disabled), [tabindex="0"]')]
    const first = controls[0], last = controls.at(-1)
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
  } }, h('div', { className: 'of-section-heading' }, h('h2', null, title), h('button', { type: 'button', className: 'of-text-button', onClick: onClose }, 'Close')),
  kind === 'coffee' ? h(CoffeeBreak, { sceneApi }) : kind === 'reading' ? h(ReadingBreak, { sceneApi }) : kind === 'meal' ? h(MealBreak, { sceneApi }) : kind === 'drink' ? h(DrinkBreak, { sceneApi }) : kind === 'exercise' ? h(ExerciseBreak, { sceneApi }) : h(StarArcade, { sceneApi, roomId }))
}
