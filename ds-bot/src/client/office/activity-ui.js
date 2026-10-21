import { createElement as h, useEffect, useRef, useState } from 'react'
import { interactionPlacement } from './activity-input.js'

export function NearbyPrompt({ sceneApi, active }) {
  const ref = useRef(null)
  const [hint, setHint] = useState(null)
  useEffect(() => {
    if (!active) { setHint(null); return undefined }
    const read = () => {
      const next = sceneApi.current?.nearbyInteraction?.()
      const workspace = ref.current?.closest('.of-workspace') ?? document.querySelector('.of-workspace')
      if (!next || !workspace) { setHint(null); return }
      const bounds = workspace.getBoundingClientRect(), hud = workspace.querySelector('.of-hud')?.getBoundingClientRect()
      const obstacle = hud ? { x: hud.x - bounds.x, y: hud.y - bounds.y, width: hud.width, height: hud.height } : null
      setHint({ ...next, ...interactionPlacement(next.anchor, bounds, { width: Math.min(216, bounds.width - 24), height: 40 }, obstacle) })
    }
    read(); const timer = setInterval(read, 150)
    return () => clearInterval(timer)
  }, [sceneApi, active])
  if (!active || !hint) return null
  return h('button', { ref, type: 'button', className: 'of-nearby-prompt', style: { left: hint.left, top: hint.top }, onClick: () => sceneApi.current?.activateNearby?.(), 'aria-label': hint.label },
    h('kbd', null, 'E'), h('span', null, hint.label))
}

export const ACTIVITY_CSS = `
.of-modern .of-nearby-prompt{position:absolute;z-index:9;display:flex;align-items:center;gap:9px;max-width:min(216px,calc(100% - 24px));min-height:36px;padding:6px 10px;border:1px solid #cad7c4;border-radius:8px;background:#f8faf3f5;box-shadow:0 3px 12px #304a381c;color:#456451;font:500 11px/1.4 'Segoe UI',sans-serif;cursor:pointer;white-space:nowrap}.of-nearby-prompt span{overflow:hidden;text-overflow:ellipsis}.of-modern .of-nearby-prompt kbd{display:grid;place-items:center;width:23px;height:23px;border:1px solid #bed0b4;border-radius:5px;background:#e8efdf;font:600 11px 'Segoe UI',sans-serif;color:#4f7054;flex:none}
.of-modern .of-activity-panel{position:absolute;inset:auto auto 20px 20px;z-index:24;transform:none;width:320px;max-width:calc(100% - 40px);height:auto;min-height:0;max-height:min(440px,calc(100% - 180px));padding:14px 15px 11px;display:flex;flex-direction:column;gap:10px;background:#f8faf3f5;border:1px solid #cbd8c5;border-radius:12px;box-shadow:0 5px 20px #304a381a;overflow:hidden}
.of-modern .of-activity-panel>.of-section-heading{flex:none;margin:0;padding:0 0 9px;border-bottom:1px solid #e0e8d8;gap:9px}.of-modern .of-activity-panel .of-section-heading h2{font-size:13px;font-weight:600;line-height:1.5;color:#456451}.of-modern .of-activity-panel .of-section-heading .of-text-button{font-size:10px;min-height:26px;padding:3px 6px}
.of-modern .of-activity-panel:focus-visible{outline:1px solid #95b184;outline-offset:3px}
.of-activity-body{min-height:0;overflow:auto;overscroll-behavior:contain;scrollbar-width:thin;scrollbar-color:#bfd0b3 transparent}.of-modern .of-activity-panel .of-muted,.of-modern .of-activity-panel .of-facility-feedback{font-size:11px;line-height:1.6}.of-modern .of-activity-panel .of-button{min-height:30px;padding:5px 8px;font-size:11px}.of-modern .of-activity-panel .of-book-choice{padding:7px 4px;gap:8px}.of-modern .of-activity-panel .of-book-choice strong{font-size:12px}.of-modern .of-activity-panel .of-book-choice small{font-size:10px}.of-modern .of-activity-panel .of-book-cover{width:24px;height:35px}.of-modern .of-activity-panel .of-book-page{padding:12px}.of-modern .of-activity-panel .of-book-page p{font-size:12px;line-height:1.7}.of-modern .of-activity-panel .of-star-board{height:160px;min-height:0}.of-modern .of-activity-panel .of-arcade-score{font-size:11px}.of-modern .of-activity-panel .of-recipe-steps li{padding:5px 0;font-size:11px}.of-modern .of-activity-panel .of-exercise-count strong{font-size:32px}
.of-activity-keys{flex:none;display:flex;flex-wrap:wrap;gap:4px 10px;margin:0;padding-top:8px;border-top:1px solid #e0e8d8;color:#82917b;font-size:9px;line-height:1.5}.of-activity-keys kbd{font:inherit;color:#557552}.of-modern .of-activity-rest,.of-modern .of-activity-coffee{width:264px}.of-simple-status{display:flex;align-items:center;gap:9px;color:#5c775e;font-size:12px;line-height:1.6}.of-simple-status i{display:block;width:7px;height:7px;flex:none;border-radius:50%;background:#8aa576}.of-simple-break progress{display:block;width:100%;height:4px;margin:10px 0 3px;accent-color:#799b69}.of-simple-break .of-error{font-size:11px}.of-modern[data-hud-open=activity] .of-hud{visibility:visible}
.of-modern .of-activity-panel .of-facility-game{gap:10px}.of-modern .of-activity-panel .of-facility-feedback{min-height:30px}.of-modern .of-activity-panel .of-lunch-bowl{height:96px}.of-modern .of-activity-panel .of-bowl-base{width:180px;height:37px}.of-modern .of-activity-panel .of-bowl-ingredients span{font-size:10px;padding:5px 7px}
.of-modern .of-prop-dialogue{width:280px;max-width:calc(100% - 32px);bottom:20px;padding:15px;border:1px solid #cbd8c5;border-radius:10px;background:#f8faf3f5;box-shadow:0 5px 20px #304a381a}.of-modern .of-prop-dialogue>h2{font-size:13px}.of-modern .of-prop-dialogue>p{font-size:12px;margin:8px 0 12px}.of-modern .of-prop-dialogue>.of-button{font-size:11px;min-height:28px}
@container office (max-width:760px){.of-modern .of-activity-panel{inset:auto auto 12px 12px;max-width:calc(100% - 24px);max-height:min(360px,calc(100% - 150px));padding:12px}.of-modern .of-activity-arcade .of-star-board{height:130px}}
`
