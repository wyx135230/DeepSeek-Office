// The phone browser's address bar: an http(s) address, a host on the local network,
// or a web search. Kept free of React so the rules can be tested on their own.
const SEARCH_URL = 'https://www.google.com/search?q='
const METADATA_HOST = /^(169\.254\.\d+\.\d+|\[fd00:ec2::254\]|metadata\.google\.internal)$/i
const LOCAL_HOST = /^(localhost|127(\.\d+){3}|10(\.\d+){3}|192\.168(\.\d+){2}|172\.(1[6-9]|2\d|3[01])(\.\d+){2}|\[[\da-f:]+\])(:\d+)?$/i

export const BROWSER_SEARCH_URL = SEARCH_URL

export function phoneBrowserAddress(input) {
  const text = String(input ?? '').trim()
  if (text === '') return null
  if (/^[a-z][a-z\d+.-]*:\/\//i.test(text)) {
    if (!/^https?:\/\//i.test(text) || !URL.canParse(text)) return null
    const url = new URL(text)
    if (METADATA_HOST.test(url.hostname)) return null
    return url.href
  }
  if (/^(about|javascript|data|file|blob|chrome|devtools|view-source):/i.test(text)) return null
  const host = text.split(/[/?#]/)[0]
  const local = LOCAL_HOST.test(host)
  const looksLikeHost = !/\s/.test(text) && (local || /^[^\s.]+(\.[^\s.]+)+(:\d+)?$/.test(host))
  if (looksLikeHost && URL.canParse(`${local ? 'http' : 'https'}://${text}`)) {
    const url = new URL(`${local ? 'http' : 'https'}://${text}`)
    if (METADATA_HOST.test(url.hostname)) return null
    return url.href
  }
  return `${SEARCH_URL}${encodeURIComponent(text)}`
}

// The compact address a phone shows in a narrow bar.
export function phoneBrowserLabel(url) {
  if (!url) return ''
  try {
    const parsed = new URL(url)
    return `${parsed.host}${parsed.pathname === '/' && !parsed.search ? '' : `${parsed.pathname}${parsed.search}`}`
  } catch { return url }
}

export function phoneBrowserHost(url) {
  try { return new URL(url).host } catch { return '' }
}

// Only https pages get the lock; a local http page is still the user's own network.
export function phoneBrowserSecure(url) {
  try { return new URL(url).protocol === 'https:' } catch { return false }
}
