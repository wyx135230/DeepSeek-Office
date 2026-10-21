// The phone's chat list, built from the same team state the sidebar uses. No new
// requests: every entry is a Bot's current chat part or a group's own Session.
import { currentPart, previewOf } from '../text.js'

const text = value => String(value ?? '').replace(/\s+/g, ' ').trim()
const stampOf = (list, id) => Number(list?.byId?.[id]?.updatedAt ?? 0)

function botEntry(bot, list, unread) {
  const sessionId = currentPart(bot)
  return {
    id: bot.id,
    kind: 'bot',
    sessionId,
    name: text(bot.name) || 'Teammate',
    role: text(bot.role),
    preview: text(previewOf(list, sessionId)),
    updatedAt: stampOf(list, sessionId) || Number(bot.createdAt ?? 0),
    unread: Boolean(unread?.[bot.id]),
    bot,
  }
}

function roomEntry(room, list, roster, unread) {
  const bots = (room.members ?? []).map(id => roster?.byId?.[id]).filter(Boolean)
  const preview = text(room.preview) || text(previewOf(list, room.id))
  return {
    id: room.id,
    kind: 'group',
    sessionId: room.id,
    name: text(room.name) || 'Group',
    role: bots.map(bot => bot.name).join(' / '),
    preview,
    updatedAt: stampOf(list, room.id) || Number(room.createdAt ?? 0),
    unread: Boolean(unread?.[room.id]),
    members: bots,
    room,
  }
}

// Newest first, with the name breaking ties so the order stays still between polls.
export function phoneChats(roster = {}, sessions = {}, unread = {}) {
  const list = sessions ?? {}
  const groups = (roster.rooms ?? []).map(room => roomEntry(room, list, roster, unread))
  const bots = (roster.bots ?? []).map(bot => botEntry(bot, list, unread))
  return [...groups, ...bots].sort((a, b) => b.updatedAt - a.updatedAt || a.name.localeCompare(b.name) || a.id.localeCompare(b.id))
}

export function phoneContacts(roster = {}, sessions = {}, unread = {}) {
  const chats = phoneChats(roster, sessions, unread)
  const groups = chats.filter(entry => entry.kind === 'group')
  const teammates = chats.filter(entry => entry.kind === 'bot').sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id))
  return { groups, teammates }
}

export function phoneSearch(entries = [], query = '') {
  const needle = text(query).toLowerCase()
  if (!needle) return entries
  return entries.filter(entry => `${entry.name} ${entry.role} ${entry.preview}`.toLowerCase().includes(needle))
}

const DAY = 86_400_000
const startOfDay = value => { const date = new Date(value); date.setHours(0, 0, 0, 0); return date.getTime() }

// Chat-list stamps read like a phone's: today's time, "Yesterday", a weekday inside
// the week, then the date. An empty history has no stamp.
export function phoneStamp(ms, now = Date.now()) {
  if (!Number.isFinite(ms) || ms <= 0) return ''
  const time = new Date(ms)
  const today = startOfDay(now), day = startOfDay(ms)
  if (day === today) return time.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  if (day === today - DAY) return 'Yesterday'
  if (day > today - 7 * DAY) return time.toLocaleDateString('en-US', { weekday: 'short' })
  const sameYear = time.getFullYear() === new Date(now).getFullYear()
  return sameYear
    ? time.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })
    : time.toLocaleDateString('en-US', { year: 'numeric', month: 'numeric', day: 'numeric' })
}

export function phoneClock(now = Date.now()) {
  return new Date(now).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
}

// A group shows the faces of its first members, like a stacked avatar at a glance.
export function groupAvatarMembers(entry, max = 4) {
  return (entry?.members ?? []).slice(0, max)
}

// The row's second line: what was said, or why there is nothing yet.
export function phonePreview(entry) {
  if (entry.preview) return entry.preview
  if (entry.kind === 'group') return entry.members?.length ? 'Say hello to the team' : 'No messages yet'
  return entry.role ? `Start a private chat · ${entry.role}` : 'Start a private chat'
}
