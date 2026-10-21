// The phone browser's page view. A phone-shaped frame inside a Web page cannot ask
// for a mobile User-Agent, so the plugin fetches the page itself with a phone
// User-Agent and hands the HTML back to the sandboxed frame. The page's assets load
// from their own site through <base>; links and GET forms are routed back through the
// phone's address bar. Only the machine running DSH makes these requests, so local
// and LAN addresses work like they do in a local browser.

import { execFile } from 'node:child_process'
import http from 'node:http'
import https from 'node:https'
import tls from 'node:tls'
import { promisify } from 'node:util'
import zlib from 'node:zlib'

const MOBILE_UA = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36'
const MAX_BYTES = 4_000_000
const TIMEOUT_MS = 15_000
const METADATA_HOST = /^(169\.254\.\d+\.\d+|\[fd00:ec2::254\]|metadata\.google\.internal)$/i
const LOCAL_HOST = /^(localhost|127\.\d+\.\d+\.\d+|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|\[::1\])$/i
const execFileAsync = promisify(execFile)

const invalid = message => Object.assign(new Error(message), { code: 'bot/invalid' })

export const MOBILE_AGENT = MOBILE_UA

export function mobilePageTarget(value) {
  let url
  try { url = new URL(String(value ?? '')) } catch { throw invalid('Type an address or a search first.') }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') throw invalid('Only http and https pages open here.')
  if (METADATA_HOST.test(url.hostname)) throw invalid('This address is reserved for cloud metadata and does not open here.')
  return url.href
}

const escapeAttribute = value => String(value).replace(/[&"<>]/g, character => ({ '&': '&amp;', '"': '&quot;', '<': '&lt;', '>': '&gt;' })[character])

// Links, GET forms and scripted navigations inside the fetched page ask the phone to
// navigate. Capture-phase listeners run before the page's own handlers, so a page
// cannot navigate the sandboxed frame to its real address (which would escape the
// mobile view and hit the site's framing rules).
const BRIDGE = `<script>(function(){
  document.documentElement.setAttribute('data-of-mobile', '');
  var fitText = function () {
    if (!document.body) return;
    document.body.querySelectorAll('div,main,article,section,header,footer,nav,aside,p,span,a,label,li,td,th,button,input,textarea,select,h1,h2,h3,h4,h5,h6').forEach(function (node) {
      var control = /^(BUTTON|INPUT|TEXTAREA|SELECT)$/.test(node.tagName);
      if (!control && !Array.prototype.some.call(node.childNodes, function (child) { return child.nodeType === 3 && child.textContent.trim() })) return;
      var size = parseFloat(getComputedStyle(node).fontSize), heading = /^H[1-6]$/.test(node.tagName), minimum = control ? 16 : 13;
      var limit = heading ? node.tagName === 'H1' ? 28 : 24 : 18;
      if (size > limit || size < minimum) node.style.setProperty('font-size', Math.max(minimum, Math.min(limit, size)) + 'px', 'important');
    });
  };
  addEventListener('DOMContentLoaded', function () {
    fitText();
    var scheduled = false;
    new MutationObserver(function () {
      if (scheduled) return; scheduled = true;
      requestAnimationFrame(function () { scheduled = false; fitText() });
    }).observe(document.body, { childList: true, subtree: true });
  }, { once: true });
  addEventListener('load', fitText, { once: true });
  var send = function (url) {
    try { var next = new URL(url, document.baseURI); if (!/^https?:$/.test(next.protocol)) return; parent.postMessage({ type: 'of-pb-navigate', url: next.href }, '*') } catch (error) {}
  };
  var formUrl = function (form) {
    try {
      var method = String(form.getAttribute('method') || 'get').toLowerCase();
      if (method !== 'get') return null;
      var target = new URL(form.getAttribute('action') || document.baseURI, document.baseURI);
      new FormData(form).forEach(function (value, key) { target.searchParams.set(key, String(value)) });
      return target.href;
    } catch (error) { return null }
  };
  var sendForm = function (form) {
    var next = formUrl(form);
    if (next === null) { parent.postMessage({ type: 'of-pb-form' }, '*'); return }
    send(next);
  };
  addEventListener('click', function (event) {
    var target = event.target && event.target.closest ? event.target : null;
    if (!target) return;
    var anchor = target.closest('a[href]');
    if (anchor && !event.defaultPrevented && !event.button && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
      event.preventDefault(); event.stopImmediatePropagation(); send(anchor.getAttribute('href')); return;
    }
    var button = target.closest('button,input[type=submit],[role=button]');
    var form = button && button.closest('form');
    if (form) { event.preventDefault(); event.stopImmediatePropagation(); sendForm(form) }
  }, true);
  addEventListener('submit', function (event) {
    var form = event.target;
    if (!form || form.tagName !== 'FORM') return;
    event.preventDefault(); event.stopImmediatePropagation(); sendForm(form);
  }, true);
  addEventListener('keydown', function (event) {
    if (event.key !== 'Enter' || event.isComposing) return;
    var field = event.target;
    if (!field || !/^(INPUT|TEXTAREA)$/.test(field.tagName || '')) return;
    var form = field.closest('form');
    if (!form) return;
    event.preventDefault(); event.stopImmediatePropagation(); sendForm(form);
  }, true);
  try { HTMLFormElement.prototype.submit = function () { sendForm(this) } } catch (error) {}
  try { HTMLFormElement.prototype.requestSubmit = function () { sendForm(this) } } catch (error) {}
  try { location.assign = function (url) { send(url) } } catch (error) {}
  try { location.replace = function (url) { send(url) } } catch (error) {}
  try {
    var descriptor = Object.getOwnPropertyDescriptor(Location.prototype, 'href');
    if (descriptor && descriptor.configurable) Object.defineProperty(Location.prototype, 'href', { get: descriptor.get, set: function (url) { send(url) }, configurable: true });
  } catch (error) {}
  try {
    // A single-page app often rewrites history with a path-only URL; those are not real
    // navigations and must run on the page itself, not through the phone's address bar.
    history.pushState = function (state, title, url) { if (typeof url === 'string' && /^https?:\\/\\//i.test(url)) send(url) };
    history.replaceState = function (state, title, url) { if (typeof url === 'string' && /^https?:\\/\\//i.test(url)) send(url) };
  } catch (error) {}
  try { window.open = function (url) { if (url) send(url); return null } } catch (error) {}
})()</script>`

const MOBILE_LAYOUT = `<meta name="viewport" content="width=device-width, initial-scale=1"><style data-of-mobile>
html[data-of-mobile]{font-size:16px!important;text-size-adjust:100%;-webkit-text-size-adjust:100%;width:100%!important;min-width:0!important;max-width:100%!important}
html[data-of-mobile] body{box-sizing:border-box;min-width:0!important;max-width:100%!important;width:auto!important;margin:0!important;padding:8px!important;font-size:1rem!important;line-height:1.55!important;overflow-wrap:anywhere}
html[data-of-mobile] body :is(div,main,article,section,header,footer,nav,form,aside,p,ul,ol,fieldset){box-sizing:border-box;min-width:0!important;max-width:100%!important}
html[data-of-mobile] body :is(p,span,a,label,li,td,th){font-size:inherit;line-height:inherit}
html[data-of-mobile] :is(img,video,svg,canvas,iframe,object,embed){max-width:100%!important;height:auto}
html[data-of-mobile] :is(input,textarea,select,button){box-sizing:border-box;max-width:100%!important;font-size:16px;line-height:1.4}
html[data-of-mobile] h1{font-size:1.6rem;line-height:1.3}html[data-of-mobile] h2{font-size:1.35rem;line-height:1.35}html[data-of-mobile] h3{font-size:1.15rem;line-height:1.4}
html[data-of-mobile] :is(pre,table){display:block;box-sizing:border-box;max-width:100%!important;min-width:0!important;overflow-x:auto;overscroll-behavior:contain}html[data-of-mobile] pre{font-size:13px;white-space:pre-wrap;overflow-wrap:anywhere}
</style>`

export function mobilePageHtml(html, url) {
  let source = String(html ?? '')
  // The fetched page must not keep a sandbox/CSP rule of its own, and its own <base>
  // would steal the origin the phone needs for the page's assets.
  source = source.replace(/<meta[^>]+http-equiv\s*=\s*["']?content-security-policy[^>]*>/gi, '')
  source = source.replace(/<meta[^>]+http-equiv\s*=\s*["']?refresh[^>]*>/gi, '')
  source = source.replace(/<base\b[^>]*>/gi, '')
  source = source.replace(/<meta\b(?:[^"'<>]|"[^"]*"|'[^']*')*>/gi, tag => /\bname\s*=\s*(?:"viewport"|'viewport'|viewport(?=\s|\/?>))/i.test(tag) ? '' : tag)
  const head = `<base href="${escapeAttribute(url)}">${MOBILE_LAYOUT}${BRIDGE}`
  return /<head[^>]*>/i.test(source) ? source.replace(/<head[^>]*>/i, tag => `${tag}${head}`) : `<head>${head}</head>${source}`
}

const charsetOf = (type, bytes) => {
  const fromType = /charset\s*=\s*["']?([\w-]+)/i.exec(type)?.[1]
  if (fromType) return fromType
  const start = new TextDecoder('utf-8').decode(bytes.slice(0, 2048))
  return /<meta[^>]+charset\s*=\s*["']?([\w-]+)/i.exec(start)?.[1] ?? 'utf-8'
}

export function mobilePageText(bytes, type) {
  const charset = charsetOf(type ?? '', bytes)
  try { return new TextDecoder(charset, { fatal: false }).decode(bytes) } catch { return new TextDecoder('utf-8', { fatal: false }).decode(bytes) }
}

// The browser on this machine may reach the web through a proxy that Node's fetch
// does not use. Read the same system proxy the browser uses, so pages that open in
// Chrome open in the phone too.
export function proxyFromEnvironment(env = process.env) {
  return proxyFromValue(env.HTTPS_PROXY || env.https_proxy || env.HTTP_PROXY || env.http_proxy || env.ALL_PROXY || env.all_proxy)
}

function proxyFromValue(value) {
  if (!value) return null
  try {
    const url = new URL(/^[a-z][\w+.-]*:\/\//i.test(value) ? value : `http://${value}`)
    if (!url.hostname) return null
    return {
      host: url.hostname,
      port: Number(url.port || 80),
      auth: url.username ? `Basic ${Buffer.from(`${decodeURIComponent(url.username)}:${decodeURIComponent(url.password)}`).toString('base64')}` : null,
    }
  } catch { return null }
}

export function proxyFromRegistryText(text) {
  if (!/ProxyEnable\s+REG_DWORD\s+0x1/i.test(String(text ?? ''))) return null
  const raw = /ProxyServer\s+REG_SZ\s+([^\r\n]+)/i.exec(String(text))?.[1]?.trim()
  if (!raw) return null
  const secure = /(?:^|;)\s*https=([^;\s]+)/i.exec(raw)?.[1]
  const plain = /(?:^|;)\s*http=([^;\s]+)/i.exec(raw)?.[1]
  const chosen = secure ?? plain ?? raw.split(';')[0].replace(/^[a-z]+=/i, '')
  return proxyFromValue(chosen)
}

let cachedProxy
let cachedAt = 0
async function systemProxy() {
  const fromEnv = proxyFromEnvironment()
  if (fromEnv) return fromEnv
  if (process.platform !== 'win32') return null
  if (cachedAt !== 0 && Date.now() - cachedAt < 30_000) return cachedProxy
  try {
    const { stdout } = await execFileAsync('reg', ['query', 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings'], { windowsHide: true, timeout: 3000 })
    cachedProxy = proxyFromRegistryText(stdout)
  } catch { cachedProxy = null }
  cachedAt = Date.now()
  return cachedProxy
}

const decodeBody = (bytes, encoding) => {
  const type = String(encoding ?? '').toLowerCase()
  try {
    if (type === 'gzip') return zlib.gunzipSync(bytes)
    if (type === 'deflate') return zlib.inflateSync(bytes)
    if (type === 'br') return zlib.brotliDecompressSync(bytes)
  } catch { /* leave the raw bytes for the text decoder */ }
  return bytes
}

const collect = stream => new Promise((resolve, reject) => {
  const chunks = []
  let size = 0
  stream.on('data', chunk => {
    size += chunk.length
    if (size > MAX_BYTES) { stream.destroy(new Error('The page is too large for the phone view. Open it in your system browser.')); return }
    chunks.push(chunk)
  })
  stream.once('end', () => resolve(Buffer.concat(chunks)))
  stream.once('error', reject)
})

const requestHeaders = (target, base) => {
  const url = new URL(target)
  return {
    host: url.host,
    'user-agent': MOBILE_UA,
    accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.5',
    'accept-language': 'en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7',
    'accept-encoding': 'identity',
    connection: 'close',
    ...base,
  }
}

function throughProxy(target, proxy) {
  const url = new URL(target)
  const headers = requestHeaders(target)
  if (proxy.auth) headers['proxy-authorization'] = proxy.auth
  if (url.protocol !== 'https:') {
    return new Promise((resolve, reject) => {
      const request = http.request({ host: proxy.host, port: proxy.port, method: 'GET', path: target, headers, timeout: TIMEOUT_MS }, response => resolve({ status: response.statusCode ?? 0, headers: response.headers, stream: response, url: target }))
      request.once('error', reject)
      request.once('timeout', () => request.destroy(new Error('The page took too long to answer. Try again.')))
      request.end()
    })
  }
  return new Promise((resolve, reject) => {
    const connect = http.request({ host: proxy.host, port: proxy.port, method: 'CONNECT', path: `${url.hostname}:${url.port || 443}`, headers: { host: `${url.hostname}:${url.port || 443}`, ...(proxy.auth ? { 'proxy-authorization': proxy.auth } : {}) }, timeout: TIMEOUT_MS })
    connect.once('connect', (response, socket) => {
      if (response.statusCode !== 200) { socket.destroy(); reject(invalid(`The system proxy refused the connection (${response.statusCode}).`)); return }
      const agent = new https.Agent({ keepAlive: false, maxSockets: 1 })
      agent.createConnection = (options, callback) => {
        const secure = tls.connect({ socket, servername: url.hostname, ALPNProtocols: ['http/1.1'] })
        if (callback) callback(null, secure)
        return secure
      }
      const request = https.request({ host: url.hostname, port: url.port || 443, method: 'GET', path: `${url.pathname}${url.search}`, headers, agent, timeout: TIMEOUT_MS }, result => resolve({ status: result.statusCode ?? 0, headers: result.headers, stream: result, url: target }))
      request.once('error', reject)
      request.once('timeout', () => request.destroy(new Error('The page took too long to answer. Try again.')))
      request.end()
    })
    connect.once('error', reject)
    connect.once('timeout', () => connect.destroy(new Error('The page took too long to answer. Try again.')))
    connect.end()
  })
}

async function requestPage(target, directHeaders) {
  const url = new URL(target)
  const proxy = LOCAL_HOST.test(url.hostname) ? null : await systemProxy()
  if (!proxy) {
    const response = await fetch(target, { redirect: 'follow', signal: AbortSignal.timeout(TIMEOUT_MS), headers: directHeaders })
    const bytes = new Uint8Array(await response.arrayBuffer())
    return { status: response.status, headers: Object.fromEntries(response.headers), bytes, url: response.url || target }
  }
  let current = target
  for (let hop = 0; hop < 6; hop += 1) {
    const result = await throughProxy(current, proxy)
    const location = result.headers.location
    if ([301, 302, 303, 307, 308].includes(result.status) && location) {
      result.stream.resume()
      current = new URL(location, current).href
      continue
    }
    const bytes = new Uint8Array(decodeBody(await collect(result.stream), result.headers['content-encoding']))
    return { status: result.status, headers: result.headers, bytes, url: current }
  }
  throw invalid('The page redirected too many times. Open it in your system browser.')
}

export function mobilePageIssue(url, status, html = '') {
  const parsed = new URL(url)
  const google = /(^|\.)google\.(com|[a-z]{2}|(?:com|co)\.[a-z]{2})$/i.test(parsed.hostname)
  const content = html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '')
  const hasResults = /<h3\b/i.test(content)
  const challenge = !hasResults && (/our systems have detected unusual traffic from your computer network/i.test(content) || /<form\b[^>]*(?:\/sorry\/|["']captcha["'])/i.test(content))
  const scriptsRequired = !hasResults && /trouble accessing google search/i.test(content) && /httpservice\/retry\/enablejs|enable javascript/i.test(content)
  if (google && (/^\/sorry(?:\/|$)/.test(parsed.pathname) || [403, 429].includes(status) || challenge || scriptsRequired)) {
    return 'Google requires a full browser or network verification for this search. Open the same Google search in your system browser to continue. The search engine has not been changed.'
  }
  return null
}

export async function fetchMobilePage(value) {
  const target = mobilePageTarget(value)
  try {
    const result = await requestPage(target, requestHeaders(target))
    const url = result.url || target
    const issue = mobilePageIssue(url, result.status)
    if (issue) throw invalid(issue)
    if (result.status < 200 || result.status >= 400) throw invalid(`The page answered with HTTP ${result.status}.`)
    const type = result.headers['content-type'] ?? ''
    if (!/text\/html|application\/xhtml\+xml/i.test(type)) throw invalid('This address is not a web page. Open it in your system browser.')
    if (result.bytes.byteLength > MAX_BYTES) throw invalid('This page is too large for the phone view. Open it in your system browser.')
    if (METADATA_HOST.test(new URL(url).hostname)) throw invalid('This address is reserved for cloud metadata and does not open here.')
    const html = mobilePageText(result.bytes, type)
    const pageIssue = mobilePageIssue(url, result.status, html)
    if (pageIssue) throw invalid(pageIssue)
    return { url, html: mobilePageHtml(html, url) }
  } catch (error) {
    if (error?.name === 'AbortError' || error?.name === 'TimeoutError') throw invalid('The page took too long to answer. Try again.')
    throw error
  }
}

export function install(rt) {
  rt.fetchMobilePage = value => fetchMobilePage(value)
}
