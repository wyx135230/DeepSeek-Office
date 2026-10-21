import { canStand, clearSegment, findPath } from './world.js'

const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y)
const empty = () => ({ id: null, mode: null, held: null, desk: null, goal: null })

// Classification controls animation only. A search executed through a shell still
// needs the desk; an unknown capability may operate the local computer too.
export function officeToolNeedsDesk(tool) {
  if (!tool) return false
  if (/^(read_skill|skill|run_code|execute|exec|bash|pwsh|powershell|shell|terminal|read_file|write_file|edit_file|apply_patch|list_directory|glob|grep)(?:$|_)/i.test(tool)) return true
  if (/^mcp__[^]*?(?:filesystem|computer|desktop|terminal|shell|skill)[^]*?__/i.test(tool)) return true
  if (/^(?:web_|browser_|read_browser$|search_web$|fetch_url$)/i.test(tool)) return false
  if (/^mcp__.*(?:browser|playwright|puppeteer|web|search|fetch|internet).*__/i.test(tool)) return false
  return !/^(list_bots|message_bot|stop_bot|create_bot|update_bot|list_models|create_group|update_group|delete_group|post_to_group|read_group_chat|read_own_chat|group_relay|ask_user|recall|remember|forget|request_secret|list_capabilities|list_skills|list_schedules|create_schedule|update_schedule|delete_schedule)$/.test(tool)
}

export function deskCompanion(world, home, from) {
  const candidates = [[36, 16], [-36, 16], [0, 36], [48, 0], [-48, 0]]
    .map(([x, y]) => ({ x: home.x + x, y: home.y + y }))
    .filter(point => !world.bounds || canStand(point, world) && findPath(from, point, world).length)
  return candidates.sort((a, b) => distance(from, a) - distance(from, b))[0] ?? null
}

export function conversationPlace(world, agent, from) {
  return [[0, 32], [32, 0], [-32, 0], [0, -32]]
    .map(([x, y]) => ({ x: agent.x + x, y: agent.y + y }))
    .filter(point => canStand(point, world) && clearSegment(point, agent, world) && findPath(from, point, world).length)
    .sort((a, b) => distance(from, a) - distance(from, b))[0] ?? null
}

export function createOfficeEncounter(world) {
  let current = null
  const clear = () => { current = null }
  return {
    clear,
    requireDesk(id) { if (current?.id === id) current.deskRequested = true },
    select(id, agents, player, now) {
      if (current?.id === id) return
      clear()
      const agent = agents.find(a => a.id === id)
      if (!agent || distance(agent, player) > 96 || world.bounds && !clearSegment(agent, player, world)) return
      current = { id, mode: 'talk', started: now, companion: null }
    },
    interrupt() { if (current?.mode === 'escort') current.mode = 'desk'; else clear() },
    step(agents, player, now, { quiet = false, blocked = false } = {}) {
      const agent = agents.find(a => a.id === current?.id)
      if (!agent || blocked) { clear(); return empty() }
      if (current.mode === 'talk' && distance(agent, player) > 140) { clear(); return empty() }
      if (current.mode === 'talk' && (current.deskRequested || agent.desk || officeToolNeedsDesk(agent.doing?.tool))) {
        current.companion = deskCompanion(world, agent.home, player)
        current.mode = quiet || !current.companion ? 'desk' : 'escort'
        current.started = now
      }
      if (current.mode === 'escort' && (quiet || now - current.started > 90000
        || distance(agent, agent.home) <= 8 && distance(player, current.companion) <= 8)) current.mode = 'desk'
      let goal = null
      if (current.mode === 'escort') {
        if (distance(agent, agent.home) <= 24) goal = current.companion
        else if (distance(agent, player) > 42) goal = { x: agent.x, y: agent.y }
      }
      return { id: current.id, mode: current.mode, held: current.mode === 'talk' ? current.id : null, desk: current.mode === 'talk' ? null : current.id, goal }
    },
  }
}
