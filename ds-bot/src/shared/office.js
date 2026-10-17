export const DEFAULT_OFFICE_THEME = Object.freeze({ name: 'Komorebi studio', wall: '#efe4d0', floor: '#c99e72', accent: '#779d83', night: false })
export const PIXEL_WIDTH = 16
export const PIXEL_HEIGHT = 24

const invalid = message => Object.assign(new Error(message), { code: 'bot/invalid' })
const color = value => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value)

export function cleanOfficeTheme(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw invalid('An office theme must be an object')
  const theme = { ...DEFAULT_OFFICE_THEME }
  if (value.name !== undefined) {
    if (typeof value.name !== 'string' || value.name.trim().length === 0 || value.name.length > 60) throw invalid('Office theme names need 1–60 characters')
    theme.name = value.name.trim()
  }
  for (const key of ['wall', 'floor', 'accent']) {
    if (value[key] === undefined) continue
    if (!color(value[key])) throw invalid('Office colors must be #rrggbb colors')
    theme[key] = value[key]
  }
  if (value.night !== undefined) {
    if (typeof value.night !== 'boolean') throw invalid('Night mode must be true or false')
    theme.night = value.night
  }
  return theme
}

export function cleanPixelAvatar(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw invalid('A pixel character must be an object')
  const { palette, pixels } = value
  if (!Array.isArray(palette) || palette.length < 4 || palette.length > 16 || palette[0] !== '#00000000' || palette.slice(1).some(entry => !color(entry))) throw invalid('Pixel characters need a transparent first color and 3–15 #rrggbb colors')
  if (!Array.isArray(pixels) || pixels.length !== PIXEL_HEIGHT || pixels.some(row => typeof row !== 'string' || row.length !== PIXEL_WIDTH || !/^[0-9a-f]+$/i.test(row) || [...row].some(pixel => parseInt(pixel, 16) >= palette.length))) throw invalid('Pixel characters need a 16 × 24 grid with valid palette indexes')
  if (pixels.join('').replace(/0/g, '').length < 30) throw invalid('The pixel character is empty')
  return { version: 1, name: String(value.name ?? 'Coworker').slice(0, 60), palette: [...palette], pixels: pixels.map(row => row.toUpperCase()) }
}

export function hashOf(value) {
  let hash = 2166136261
  for (const char of String(value)) { hash ^= char.codePointAt(0); hash = Math.imul(hash, 16777619) }
  return hash >>> 0
}

export function defaultPixelAvatar(bot = {}) {
  const seed = hashOf(`${bot.id}:${bot.name}`)
  const shirts = ['#718eab', '#b47d86', '#809b73', '#c49b62', '#9b8ab6', '#77a5a0']
  const hairs = ['#493a35', '#654c3b', '#343d4e', '#9c7250', '#756475']
  const skins = ['#f2cead', '#d9ac87', '#b47e5d', '#efd6bf']
  const grid = Array.from({ length: PIXEL_HEIGHT }, () => Array(PIXEL_WIDTH).fill('0'))
  const fill = (x, y, w, hh, ink) => { for (let yy = y; yy < y + hh; yy++) for (let xx = x; xx < x + w; xx++) grid[yy][xx] = ink }
  fill(5, 1, 6, 1, '1'); fill(3, 2, 10, 7, '1')
  fill(4, 3, 8, 7, '3'); fill(4, 5, 8, 6, '2')
  fill(4, 4, 3 + seed % 4, 2, '3'); fill(3, 6, 1, 3, '3'); fill(12, 6, 1, 3, '3')
  fill(5, 7, 1, 1, '1'); fill(10, 7, 1, 1, '1'); fill(7, 9, 2, 1, '6')
  if (seed % 3 === 0) { fill(2, 2, 3, 3, '3'); fill(2, 5, 2, 1, '5') }
  fill(6, 11, 4, 2, '2'); fill(4, 13, 8, 6, '1'); fill(5, 13, 6, 5, '4')
  fill(7, 13, 2, 2, '5'); fill(3, 14, 2, 5, '4'); fill(11, 14, 2, 5, '4')
  fill(3, 18, 2, 2, '2'); fill(11, 18, 2, 2, '2')
  fill(5, 19, 3, 3, '7'); fill(9, 19, 2, 3, '7'); fill(4, 22, 4, 1, '1'); fill(9, 22, 3, 1, '1')
  return cleanPixelAvatar({ name: bot.name ?? 'Coworker', palette: ['#00000000', '#363b46', skins[seed % skins.length], hairs[(seed >>> 4) % hairs.length], shirts[(seed >>> 8) % shirts.length], '#f5e9cd', '#be826e', '#535d70'], pixels: grid.map(row => row.join('')) })
}

export function officeLayout(count) {
  const size = Math.max(0, Math.min(12, Math.floor(count)))
  const rows = Math.max(2, Math.ceil(size / 3))
  return {
    width: 800, height: Math.max(480, 190 + rows * 112),
    desks: Array.from({ length: size }, (_, index) => ({ x: 210 + (index % 3) * 178, y: 125 + Math.floor(index / 3) * 112 })),
  }
}

export function officeActivity(botId, room, work = {}, questions = {}, bot = {}) {
  const local = (work.rooms?.[room.id] ?? []).find(entry => entry.botId === botId)
  const doing = local ?? work.bots?.[botId]
  const approvals = (work.approvals ?? []).filter(entry => entry.botId === botId)
  const question = questions[bot.sessionId ?? botId]
  let state = 'idle'
  if (approvals.length > 0 || question) state = 'waiting'
  else if (doing && !local && doing.roomId !== room.id) state = 'away'
  else if (doing?.speaking) state = 'speaking'
  else if (doing) state = /read|search|browse|fetch|list|recall|look/i.test(doing.tool ?? '') ? 'reading' : doing.tool ? 'typing' : 'thinking'
  return { state, doing, approvals, question, here: local !== undefined }
}

export function officeBuilding(roster, work = {}) {
  const byId = Object.fromEntries((roster.bots ?? []).map(bot => [bot.id, bot]))
  const rooms = [...(roster.rooms ?? [])].sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0) || a.id.localeCompare(b.id))
  const floors = rooms.map((room, index) => {
    const members = [...new Set(room.members ?? [])].filter(id => byId[id]).map(id => ({ bot: byId[id], ...officeActivity(id, room, work, roster.questions, byId[id]) }))
    let theme
    try { theme = cleanOfficeTheme(room.office?.theme ?? {}) } catch { theme = { ...DEFAULT_OFFICE_THEME } }
    return { id: room.id, number: index + 1, room, name: room.name, purpose: room.notice?.trim() || members.map(member => member.bot.role).filter(Boolean).join(' / ') || room.name, members, theme, layout: officeLayout(members.length), working: members.filter(member => !['idle', 'away'].includes(member.state)).length }
  })
  return { enabled: floors.length > 0, floors }
}
