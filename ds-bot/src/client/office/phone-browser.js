// A phone-shaped browser inside the phone. A page in a Web iframe keeps the desktop
// browser's User-Agent, so the plugin fetches it with a phone User-Agent and hands
// the HTML to a sandboxed frame; links and GET forms come back through the address
// bar. The fetch runs on the machine running DSH, so local and LAN addresses work.
import { createElement as h, useEffect, useRef, useState } from 'react'
import { call } from '../api.js'
import { phoneBrowserAddress, phoneBrowserHost, phoneBrowserSecure } from './phone-browser-data.js'

const SHORTCUTS = [
  { label: 'Google', url: 'https://www.google.com/' },
  { label: 'Bing', url: 'https://www.bing.com/' },
  { label: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/Main_Page' },
]

const icon = paths => function BrowserGlyph({ size = 18 }) {
  return h('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true },
    paths.map((path, index) => h('path', { key: index, d: path })))
}
const BackIcon = icon(['M14.5 5.5 8 12l6.5 6.5'])
const ForwardIcon = icon(['M9.5 5.5 16 12l-6.5 6.5'])
const ReloadIcon = icon(['M18.5 12a6.5 6.5 0 1 1-1.9-4.6', 'M18.5 4.5V9H14'])
const MenuIcon = icon(['M12 5.5v.1', 'M12 12v.1', 'M12 18.5v.1'])
const ExternalIcon = icon(['M14 4h6v6', 'M20 4 11 13', 'M18 14v5H5V6h5'])
const LockIcon = icon(['M7.5 10V8a4.5 4.5 0 0 1 9 0v2', 'M6 10h12v9H6z'])
const GlobeIcon = icon(['M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z', 'M3.5 12h17', 'M12 3c2.4 2.6 3.6 5.6 3.6 9s-1.2 6.4-3.6 9c-2.4-2.6-3.6-5.6-3.6-9S9.6 5.6 12 3z'])

export function PhoneBrowser({ onBack }) {
  const [stack, setStack] = useState([])
  const [index, setIndex] = useState(-1)
  const [page, setPage] = useState(null)
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(false)
  const [menu, setMenu] = useState(false)
  const [notice, setNotice] = useState('')
  const [failure, setFailure] = useState(null)
  const input = useRef(null)
  const frame = useRef(null)
  const navigation = useRef(0)
  const pending = useRef(null)
  const navigateRef = useRef(null)
  const url = index >= 0 ? stack[index] : null

  useEffect(() => { setDraft(url ?? '') }, [url])
  useEffect(() => { input.current?.focus({ preventScroll: true }) }, [])
  useEffect(() => () => { navigation.current += 1; pending.current?.abort() }, [])

  const load = async (target, message = '') => {
    const token = ++navigation.current
    pending.current?.abort()
    const controller = new AbortController()
    pending.current = controller
    setLoading(true); setNotice(message); setMenu(false); setFailure(null); setPage(null)
    try {
      const result = await call('mobile-page', { url: target }, controller.signal)
      if (token !== navigation.current) return
      setPage({ url: result.url, html: result.html })
      setDraft(result.url)
    } catch (error) {
      if (token !== navigation.current) return
      const text = error?.message ?? String(error)
      setPage(null); setDraft(target)
      setFailure({ url: target, message: text })
    } finally { if (token === navigation.current) setLoading(false) }
  }

  const navigate = (raw) => {
    const next = phoneBrowserAddress(raw)
    if (!next) {
      setNotice(String(raw ?? '').trim() === '' ? 'Type an address or a search.' : 'Only http and https pages open here.')
      return
    }
    const kept = stack.slice(0, index + 1)
    if (kept[kept.length - 1] === next) { void load(next); return }
    const updated = [...kept, next]
    setStack(updated); setIndex(updated.length - 1); setDraft(next)
    void load(next)
  }
  navigateRef.current = navigate

  useEffect(() => {
    const onMessage = (event) => {
      if (!frame.current || event.source !== frame.current.contentWindow) return
      const data = event.data
      if (!data || typeof data !== 'object') return
      if (data.type === 'of-pb-navigate' && typeof data.url === 'string') navigateRef.current?.(data.url)
      if (data.type === 'of-pb-form') setNotice('This form needs the activity in your system browser.')
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  const move = (delta) => {
    const target = index + delta
    if (target < 0 || target >= stack.length) return
    setIndex(target); void load(stack[target])
  }
  const reload = () => { if (url) void load(url); else setMenu(false) }
  const goHome = () => {
    navigation.current += 1
    pending.current?.abort()
    setStack([]); setIndex(-1); setPage(null); setDraft(''); setLoading(false); setNotice(''); setFailure(null); setMenu(false)
    input.current?.focus({ preventScroll: true })
  }
  const openSystem = () => {
    if (!url) { setMenu(false); return }
    window.open(page?.url ?? url, '_blank', 'noopener,noreferrer')
    setMenu(false)
  }
  const copy = () => {
    if (!url) return
    void navigator.clipboard?.writeText(page?.url ?? url).then(() => setNotice('Address copied.'), () => setNotice('Could not copy the address.'))
    setMenu(false)
  }
  const host = page?.url ? phoneBrowserHost(page.url) : url ? phoneBrowserHost(url) : ''
  const secure = page?.url ? phoneBrowserSecure(page.url) : url ? phoneBrowserSecure(url) : false

  const view = url
    ? h('div', { className: 'of-pb-page' },
        failure ? h('section', { className: 'of-pb-error', role: 'alert' },
          h(GlobeIcon, { size: 28 }), h('strong', null, 'This page needs attention'),
          h('p', null, failure.message), h('span', { className: 'of-pb-error-host' }, phoneBrowserHost(failure.url)),
          h('div', { className: 'of-pb-error-actions' },
            h('button', { type: 'button', onClick: () => { void load(failure.url) } }, 'Try again'),
            h('button', { type: 'button', onClick: openSystem }, 'Open in system browser')))
        : page ? h('iframe', {
          key: page.url,
          ref: frame,
          className: 'of-pb-frame',
          srcDoc: page.html,
          title: host || 'Browser page',
          sandbox: 'allow-scripts allow-forms allow-popups',
          referrerPolicy: 'no-referrer',
        }) : null,
        loading ? h('div', { className: 'of-pb-loading', role: 'status' }, h('span', { className: 'of-pb-spinner', 'aria-hidden': true }), 'Loading the phone view…') : null)
    : h('div', { className: 'of-pb-start' },
        h('span', { className: 'of-pb-start-glyph', 'aria-hidden': true }, h(GlobeIcon, { size: 30 })),
        h('strong', null, 'Phone Browser'),
        h('p', null, 'Pages are fetched by this computer and shown in the phone’s mobile layout.'),
        h('div', { className: 'of-pb-shortcuts', 'aria-label': 'Shortcuts' },
          SHORTCUTS.map(item => h('button', { key: item.label, type: 'button', className: 'of-pb-shortcut', onClick: () => navigate(item.url) }, item.label))),
        h('p', { className: 'of-pb-start-hint' }, 'Sign-in and heavily scripted sites may need the system browser.'))

  return h('div', { className: 'of-pb-root', 'data-loading': loading || undefined },
    h('div', { className: 'of-pb-toolbar' },
      h('button', { type: 'button', className: 'of-pb-icon', 'aria-label': 'Back', title: 'Back', disabled: index <= 0, onClick: () => move(-1) }, h(BackIcon, { size: 17 })),
      h('button', { type: 'button', className: 'of-pb-icon', 'aria-label': 'Forward', title: 'Forward', disabled: index >= stack.length - 1, onClick: () => move(1) }, h(ForwardIcon, { size: 17 })),
      h('button', { type: 'button', className: 'of-pb-icon', 'aria-label': 'Reload', title: 'Reload', onClick: reload }, h(ReloadIcon, { size: 16 })),
      h('form', { className: 'of-pb-address', onSubmit: event => { event.preventDefault(); navigate(draft) } },
        url ? h('span', { className: `of-pb-lock${secure ? ' is-secure' : ''}`, 'aria-hidden': true }, h(LockIcon, { size: 13 })) : h('span', { className: 'of-pb-lock', 'aria-hidden': true }, h(GlobeIcon, { size: 13 })),
        h('input', {
          ref: input,
          type: 'text',
          inputMode: 'search',
          enterKeyHint: 'go',
          autoComplete: 'off',
          autoCapitalize: 'off',
          spellCheck: false,
          value: draft,
          placeholder: 'Search Google or type a URL',
          'aria-label': 'Address',
          onChange: event => { setDraft(event.target.value); setNotice('') },
          onFocus: event => event.currentTarget.select(),
        })),
      h('button', { type: 'button', className: 'of-pb-icon', 'aria-label': 'Open in system browser', title: 'Open in system browser', disabled: !url, onClick: openSystem }, h(ExternalIcon, { size: 16 })),
      h('button', { type: 'button', className: 'of-pb-icon', 'aria-label': 'Browser options', title: 'Browser options', 'aria-haspopup': 'menu', 'aria-expanded': menu, onClick: () => setMenu(value => !value) }, h(MenuIcon, { size: 18 }))),
    h('div', { className: 'of-pb-progress', 'aria-hidden': true }),
    notice ? h('div', { className: 'of-pb-notice', role: 'status' }, notice) : null,
    h('div', { className: 'of-pb-view' }, view),
    menu ? h('div', { className: 'of-pb-menu-wrap' },
      h('div', { className: 'of-pb-menu-scrim', 'aria-hidden': true, onClick: () => setMenu(false) }),
      h('div', { className: 'of-pb-menu', role: 'menu', 'aria-label': 'Browser options' },
        h('button', { type: 'button', role: 'menuitem', disabled: !url, onClick: reload }, 'Reload'),
        h('button', { type: 'button', role: 'menuitem', disabled: !url, onClick: openSystem }, 'Open in system browser'),
        h('button', { type: 'button', role: 'menuitem', disabled: !url, onClick: copy }, 'Copy address'),
        h('button', { type: 'button', role: 'menuitem', onClick: goHome }, 'Home page'),
        h('button', { type: 'button', role: 'menuitem', onClick: () => { setMenu(false); onBack?.() } }, 'Back to phone'))) : null)
}

export const PHONE_BROWSER_CSS = `
.of-pb-root{position:relative;display:flex;flex-direction:column;flex:1;min-height:0;min-width:0;background:#fff;color:#26343f;font-family:'Segoe UI',system-ui,sans-serif}
.of-pb-toolbar{display:flex;align-items:center;gap:2px;flex:none;height:44px;padding:0 5px;border-bottom:1px solid #e2e8df;background:#f8faf7}
.of-pb-icon{display:grid;place-items:center;flex:none;width:30px;height:30px;padding:0;border:0;border-radius:8px;background:transparent;color:#45655a;cursor:pointer}
.of-pb-icon:hover{background:#e9efe6}
.of-pb-icon:disabled{opacity:.32;cursor:default;background:transparent}
.of-pb-address{display:flex;align-items:center;gap:5px;flex:1;min-width:0;height:32px;margin:0 3px;padding:0 10px;border:1px solid #dfe6dc;border-radius:999px;background:#eef2ec}
.of-pb-address:focus-within{border-color:#a9c2ad;background:#fff;box-shadow:0 0 0 2px #7ba18e22}
.of-pb-lock{display:grid;place-items:center;flex:none;color:#8a978c}
.of-pb-lock.is-secure{color:#4e7a68}
.of-pb-address input{flex:1;min-width:0;height:28px;padding:0;border:0;background:transparent;color:#26343f;font:inherit;font-size:12px;outline:none}
.of-pb-address input::placeholder{color:#8a978c}
.of-pb-progress{position:relative;flex:none;height:2px;overflow:hidden;background:transparent}
.of-pb-root[data-loading] .of-pb-progress::after{content:'';position:absolute;top:0;left:-40%;width:40%;height:100%;background:linear-gradient(90deg,transparent,#4e7a68,transparent);animation:of-pb-run .9s ease-in-out infinite}
@keyframes of-pb-run{to{left:100%}}
.of-pb-notice{flex:none;padding:5px 10px;border-bottom:1px solid #e6ece3;background:#f5f8f1;color:#6d7d72;font-size:11px;line-height:1.4}
.of-pb-view{position:relative;flex:1;min-height:0;overflow:hidden;background:#fff}
.of-pb-page{position:absolute;inset:0}
.of-pb-error{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;height:100%;padding:24px 18px;text-align:center;background:#f8faf7;color:#45655a}.of-pb-error strong{font-size:16px;font-weight:600}.of-pb-error p{margin:0;max-width:32ch;font-size:14px;line-height:1.6;overflow-wrap:anywhere}.of-pb-error-host{max-width:100%;overflow-wrap:anywhere;font-size:12px;color:#718578}.of-pb-error-actions{display:flex;flex-wrap:wrap;justify-content:center;gap:8px;margin-top:8px}.of-pb-error-actions button{min-height:38px;padding:7px 11px;border:1px solid #bdcdbb;border-radius:8px;background:#fff;color:#365b4b;font:inherit;font-size:13px;cursor:pointer}
.of-pb-frame{display:block;width:100%;height:100%;border:0;background:#fff}
.of-pb-loading{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;background:#fbfcf8f2;color:#6d7d72;font-size:11.5px}
.of-pb-spinner{width:22px;height:22px;border:2px solid #d6e0d1;border-top-color:#4e7a68;border-radius:50%;animation:of-pb-spin .8s linear infinite}
@keyframes of-pb-spin{to{transform:rotate(360deg)}}
.of-pb-start{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:7px;height:100%;padding:24px 22px;text-align:center;background:linear-gradient(170deg,#fbfcf8,#f1f5ed)}
.of-pb-start-glyph{display:grid;place-items:center;width:56px;height:56px;margin-bottom:4px;border:1px solid #d6e0d1;border-radius:18px;background:#fff;color:#4e7a68;box-shadow:0 4px 14px #26343f12}
.of-pb-start strong{font-size:15px;font-weight:600;color:#2e463f}
.of-pb-start p{max-width:26ch;margin:0;color:#7b8c80;font-size:11.5px;line-height:1.55}
.of-pb-shortcuts{display:flex;flex-wrap:wrap;justify-content:center;gap:7px;margin:8px 0 2px}
.of-pb-shortcut{min-height:32px;padding:5px 13px;border:1px solid #d6e0d1;border-radius:999px;background:#fff;color:#45655a;font:inherit;font-size:11.5px;cursor:pointer}
.of-pb-shortcut:hover{background:#eef3ea;border-color:#bfd0b8}
.of-pb-start-hint{margin-top:6px!important;color:#98a397!important;font-size:10.5px!important}
.of-pb-menu-wrap{position:absolute;inset:44px 0 0;z-index:12}
.of-pb-menu-scrim{position:absolute;inset:0;background:#26343f0a}
.of-pb-menu{position:absolute;top:4px;right:6px;min-width:196px;padding:4px;border:1px solid #dfe6dc;border-radius:10px;background:#fff;box-shadow:0 8px 24px #26343f1f}
.of-pb-menu button{display:block;width:100%;padding:9px 10px;border:0;border-radius:7px;background:transparent;color:#2c423b;font:inherit;font-size:12px;text-align:left;cursor:pointer;white-space:nowrap}
.of-pb-menu button:hover{background:#eff3ec}
.of-pb-menu button:disabled{opacity:.4;cursor:default;background:transparent}
.of-pb-root :is(button,input,[tabindex]):focus-visible{outline:2px solid #6f9483;outline-offset:2px;border-radius:8px}
.of-phone[data-quiet] .of-pb-progress::after,.of-phone[data-quiet] .of-pb-spinner{animation:none;background:transparent}
@media (prefers-reduced-motion:reduce){.of-pb-progress::after,.of-pb-spinner{animation:none!important}}
`
