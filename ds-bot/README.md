# DeepSeek Office

The DeepSeek Office plugin, based on DS Bot, for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (dsh). It turns dsh into a team of long-lived Bots that talk to you, to each other and in group chats. See the [project page](../README.md) for an overview, install steps and screenshots.

> Version 0.7.0 brings in-scene phone chat and web reading, illustrated face-to-face dialogue, compact navigation and activity controls, an updated character model, and warmer details in work studios, coffee studios and screening rooms. Conversations still use the existing Harness Sessions and native composer. The screening-room TV remains a static display. Features, tools and the saved data format can still change.

The office uses a bundled Three.js orthographic view over the existing Phaser
simulation. Camera rotation, zoom, overview, screen-relative movement and the
responsive game HUD do not change the Harness Bot or conversation contracts.
Architecture is original and procedural; the worker is derived from the owner's
supplied generated GLB. All resources are bundled locally. The wardrobe combines
skin, hair, shirt, trouser and shoe colors and saves each identity in browser
storage. A background AI portrait does not overwrite these choices; an explicit
user direction can. Characters share the supplied long-haired model with a jacket,
skirt and boots; the existing trouser-color channel colors the skirt.
See the [character checks](../docs/office-character-verification.md) and the
[design](../docs/plans/2026-10-19-isometric-office.md) and
[verification](../docs/office-25d-verification.md).

The owner's elevator GLB supplies a walk-in cabin on the right of every corridor.
The map's Lift button inspects it; clicking or walking inside opens the adjacent
destination panel. Travel closes doors, fades the old scene, waits for the new
renderer, reveals the destination and walks out. IDs identify floors throughout;
duplicate trips are locked, unavailable destinations recover safely and closing
the office cancels pending work. See [elevator checks](../docs/office-elevator-verification.md).

Every group floor reserves a meeting room. Confirm entry to sit at the head of
the table; coworkers queue, enter in roster order, then take up to eight seats
or orderly perimeter positions. The lower meeting pane and centered wall display
borrow the same group Session and native conversation/composer. History, live
replies, attachments and full messages stay in the original chat. Recent messages
also show truncated overhead captions. Ending a meeting restores daily routines;
sofas and workstation chairs support seated breaks. See [meeting checks](../docs/office-meeting-verification.md).

The development harness is pinned to dsh `0.2.0-rc.2`. Current office browser
checks use an isolated Web profile on Windows; see the linked verification records.

## Features

- **Long-lived Bots**: each Bot is a dsh Session in the "DS Bot" workspace, with its own name, role, instructions and model.
- **Working folders**: a Bot can work in a folder you choose instead of the team workspace, and a group chat can set one folder for all its members there. Pick it in the Bot's settings or details panel or in the group's settings, or ask a Bot (`update_bot`, `update_group`). After a change, the chat goes on in a fresh part that starts in the new folder. When a Bot sets a folder outside the team workspace, or adds a Bot to a group that works in one, it asks for your approval if those Bots can only write in their folder. Folders that hold dsh data (`$DSH_HOME`, the team's data) are refused.
- **Permission presets**: each Bot runs with its own dsh permission preset (Read only, Workspace or Full access), set in its details panel. A group chat can run all its members with one preset there, in place of their own: turn on **Same for every member** under Permissions in the group's settings. Only you set permissions; Bots cannot change them.
- **Bots work together**: `message_bot` sends a message to another Bot, `create_bot` and `update_bot` add and set up Bots, and `ask_user` asks you a question without blocking the other Bots.
- **Group chats**: members speak one at a time, and each one reads the latest messages first. A message can `@Name` a member to pass the turn on; type `@` to pick one from a list. **+ → Reference a chat** adds another Bot's chat to a message as context, and in a group the members who answer get it. A member with nothing new to add stays quiet (`[PASS]`). Each member has its own hidden Session per group, so a group never reads a Bot's private chat.
- **Roles and permissions**:

  | Who | Can do |
  |---|---|
  | You | Everything |
  | Main Bot (there can be more than one) | Manage every group; change and delete Bots |
  | Group admin | Manage its own group only (name, notice, members, reply mode) |
  | Member | Speak in the group and `@` another member |

- **Long chats stay inside the model's window**: dsh's own compaction never runs on a Bot's Session. When a turn ends past the check line (a share of the model's context window), a small separate model call, the context steward, reads the latest messages of the chat and decides once. If the work is still under way, the chat is condensed in place into a checkpoint: a handoff summary plus your recent messages word for word. If the work has reached a stopping point, the Bot writes a handoff note and continues in a new part. Either way you still see one chat, with no marker. Earlier parts and condensed messages stay searchable in a full-text index (`node:sqlite` FTS5) through `read_own_chat`.
- **Memory**: each Bot keeps notes across all its conversations, and the team shares one more. See [Memory](#memory).
- **Web search**: see [Web search](#web-search).
- **Bot browser (dsh Desktop only)**: see [Bot browser](#bot-browser).
- **Images**: for a model that cannot read images, a vision model first turns the image into text.
- **Secrets**: a Bot asks for an API key or token with a card in its own chat and never sees the value. See [Secrets](#secrets).
- **Usage**: Settings → Usage shows token usage by time (24 hours to 12 months, or days picked on a calendar), by Bot and by model, with a page for each Bot and each model. Calls that a Session logs are read from the logs, so older chats count too. Calls that leave no log (checkpoints, handoff notes, the steward, image readings, dsh titles and compaction) are counted while they stream, from the time the plugin runs. Tokens only, no cost.
- **Make it yours**: name, role, instructions, model and look (20 characters and 12 colors, or your own photo) for each Bot; a theme, an accent color and an avatar animation level (quiet, normal or lively) for the team. A pinned Bot or group chat shows a small pushpin in the sidebar. Settings has these pages: General (look), Bots (Main Bots and each Bot's settings), Group chats (each group's settings), Connectors, Capabilities, Scheduled tasks, Usage, Secrets, Feedback and About DS Bot (versions, updates and links).

## Install

Install the local `deepseek-office-0.7.0.tgz` build using DSH's Plugins page or `dsh plugin --profile web add /absolute/path/deepseek-office-0.7.0.tgz`. Disable the original `ds-bot` / legacy `dsh-bot` plugin in that profile first; both variants share the internal Bot identity. Keep your data. To update DeepSeek Office, install the new package in the same profile and restart Harness, keeping the same `DSH_HOME`. See the [project install guide](../README.md#quick-start). Installing by the `deepseek-office` package name requires that an owner has published it to the selected npm registry.

## 2.5D offices

Each group becomes one office floor. The lobby lists the team's offices; members own workstations and show real activity. Use click-to-walk, WASD/arrows and E to interact, or use the accessible member list. Chat uses the same send actions as the original interface. No groups means no office entry, canvas or automatic generation.

Version 0.7.0 uses Three.js 0.186.1 for an orthographic 3D view and Phaser 4.2.1 for movement and simulation. Animated coworkers use the supplied rigged model with independently assigned skin, hair and clothing colors. Every four employees occupy one work room; members five and nine add connected work rooms. Each group floor reserves one meeting room, two seeded leisure facilities and a screening room in the east wing. Reception has its own welcome studio and three leisure facilities, plus a screening room. Unused room slots become gardens. Walls and furniture have physical footprints, automatic doors connect rooms to the corridor, and the map supports room inspection and camera following.

Work studios now include desk pads, stationery, lamps or headphones, cable trays, corkboards and rugs. Coffee studios add cup shelves, bean jars, saucers and botanical prints. Screening rooms add acoustic panels, a wall light, backrest fabric and television cabinet vents. These original procedural details fit existing furniture and wall footprints; they preserve the UI, paths, seats, interaction targets and agent behavior. Other leisure facilities retain their existing furnishings. See the [decoration scope](../docs/plans/2026-10-21-office-decoration.md).

Facilities support brewing, seated page turns, a scored 30-second arcade round, lunch assembly, timed mocktail mixing and a six-stretch rhythm activity. Nearby prompts and compact activity cards show the available interaction and keyboard controls. Coworkers reserve reachable break spots and use individual sofa seats; real Harness work preempts leisure. Closing a panel cancels its activity. Quiet motion pauses autonomous movement and reduces ambient effects. Sunlight and evening lighting follow local time. The upper-right HUD provides a room map, camera rotation, zoom, overview, follow, Floors and Team; More holds decoration, Quiet motion and help. Face-to-face conversations use illustrated portraits and message-history controls, with private chat or a group mention through the native composer. All game interface text is English.

While exploring, take out the phone with the **Phone** button below the HUD map or the `P` key. The character holds it, its screen appears in the bottom-right corner, and `Esc` puts it away. The chat app lists every group and teammate, with search, unread marks and recent-message previews. Conversations use the same Sessions and native composer as ordinary chat, including attachments, voice, models, queues, questions, mentions and slash commands.

The **Browser** app has an address bar, back, forward, reload and a menu. The plugin host fetches pages using a phone user agent, the network and system proxy of the computer running DSH, then shows them in a sandboxed mobile layout without access to DSH. Pages requiring sign-in, form submission or complex scripts can be opened in the system browser.

The player pauses while holding the phone; the world, agent turns and scene activity continue. Simple questions can be answered on the spot; an agent that needs a workstation goes there while the player stays put. See the [phone design](../docs/plans/2026-10-21-office-phone.md).

Licenses, pinned sources and asset manifests are retained under `src/client/assets/`. Architecture and furnishings are procedural; characters, the lift and TV use owner-supplied models with source records in `office-worker/`, `elevator/` and `cinema/`. Momo retains its separately credited CC0 sprite. Older LPC resources keep their existing licenses and credits. The new project logo and its generation prompt are recorded in [brand sources](../docs/branding/SOURCES.md).

Portraits and bounded appearance traits can be generated by each Bot's configured text model and saved on `bot.officeAvatar`. Regenerate with a description from the character card. Invalid output leaves the previous or built-in appearance intact. Background portrait generation preserves the independent 3D wardrobe; explicit user descriptions can influence its colors. AI design consumes tokens; saved appearances are reused. Per-room `office.theme` stores validated wall/floor/accent colors and day/night state. Geometry uses stable seeded templates; free-form layout editing and cross-device multiplayer remain [planned work](../README.md#roadmap). The screening-room TV currently shows a static illustration.

## Office development

Build with `npm ci && npm run build`. Install test dependencies with `npm run harness`. For a mock preview, run `node dev/office-bench.mjs` from this directory. It prints the local address and writes a login URL to the private `.dsh-test-office/web.log` file. Do not share that URL.

The first run creates an isolated profile. Stop it, then install this source directory into that profile with the public DSH CLI. In PowerShell, from `ds-bot/`:

```powershell
$env:DSH_HOME = [IO.Path]::GetFullPath('../.dsh-test-office')
node dev/harness/node_modules/@deepseek-ai/dsh/lib/bin.js plugin --profile web add (Get-Location).Path
Remove-Item Env:DSH_HOME
node dev/office-bench.mjs
```

This bench uses ports 3106/8806 and mock models, never your normal DSH home. During browser acceptance, pause all repository writes, including temporary reports and audit copies: development hot reload may otherwise restart the active scene. Stop with Ctrl+C. The original API smoke test can use it with `node dev/smoke.mjs office 3106` on fresh test data.

## Configuration

Options go in the profile's `cordis.patch.yml`, under the `bot` entry. All of them are optional.

```yaml
- id: bot
  name: deepseek-office
  config:
    workspace: /path/to/workspace   # where the Bots work; default <home>/workspace
    home: /path/to/bot-data         # where the team is saved; default $DSH_HOME/bot
    checkRatio: 0.8                 # share of the model's usable window where the steward decides
    browser: true                   # force the Bot browser on or off; default on in Desktop only
    memory: true                    # false turns memory off: no memory tools, section or panel
    memoryReview: true              # false leaves memory to the Bots' own remember calls
    diagnosticsFile: false          # keep the error log in memory only; default <home>/logs/diagnostics.jsonl
    updateCheck: true               # look for a newer DS Bot when a window opens; default true
    updateRegistry: https://registry.example/   # ask only this npm registry for updates
    github: false                   # hide the GitHub connector; default shown in Connectors
```

**Updates**: when a window opens, DS Bot asks where it was installed from for a newer release: the npm registry (the one the DSH plugin manager installs from, then its fallbacks), or the latest GitHub release for a `github:…#vX.Y.Z` install. A newer version shows a cloud button at the top right of the sidebar; **Update** reinstalls DS Bot through the DSH plugin manager, and the new version runs from the next DSH start. A linked or local checkout is never offered an update. Settings → About DS Bot shows the same state, with **Check for updates** to ask again at once.

The same card can carry DSH itself: a DS Bot release may name the DSH release it was verified against (`dsBot.verifiedDsh` in its `package.json`), and only that version is offered — running something newer is a downgrade offer too. A release that names no version offers no DSH update. A DSH installed from npm is swapped by `npm install -g @deepseek-ai/dsh@<version>`. DSH Desktop installs the newest release its own updater finds, so the card shows DSH there only when that release is the verified one, and **Open updates** opens the app's update panel. A release may raise the floor with `dsBot.minBot`: until the bot itself is that new, the DSH row waits.

## Models

Model providers are set up with dsh's `llm-pi-ai` plugin in `cordis.patch.yml`. Every Bot runs on one model of its own, from the models DSH serves. A new team's first Main Bot has none: its chat opens on a model card and it greets the user only after a pick. The Create Bot form starts on the DSH default model. The Bot's details panel and settings (or a Main Bot's `update_bot`) change it; a Bot whose model is no longer served shows the card again. A team saved by an older version keeps the model each Bot last ran on.

- Give every model a `contextWindow`. DS Bot takes its lines from it: the usable window is the window minus the reply reserve (`maxTokens`), the hard line is 95% of that, and the check line is `checkRatio` of it. A model without `contextWindow` gets the adapter's default (262,144 tokens for `llm-pi-ai`), which may be wrong for that model; a model that reports no window at all counts as 500,000.
- To send images, the provider needs `defaultInput: [ text, image ]`.
- Keep API keys out of the repository. Use dsh's own key storage or environment variables.

## Memory

A Bot remembers what should last beyond one conversation: your preferences, decisions, corrections and facts it should not ask again. Memory is plain Markdown in the [Agent Memory Repo](https://github.com/AgentMemoryRepo/agentmemoryrepo) format: one entry per line, ending in `[source: …; added: …]`.

After each turn, a memory review reads what is new in the Bot's chat (and in each group, per member) and keeps, updates or removes entries itself, so memory does not depend on the Bot deciding to call `remember`. It keeps only what you say, writes entries in your language, and refuses keys, passwords and ID numbers.

- **Two scopes**: each Bot has its own memory, and the team memory is read by every Bot. A Bot writes its own. Main Bots and group admins (of any group) also write the team memory; a Main Bot can read and change another Bot's memory when you ask.
- **Tools**: `remember` saves an entry or replaces one (`replace`), `forget` removes one, and `recall` searches every entry, reads a topic whole, or lists what is saved. The Bot adds the source (a part anchor such as `part 2 #1234`, which `read_own_chat` opens) and the date; a Bot that writes for others is named with `by:`.
- **Files**: `MEMORY.md` holds what every conversation needs, and details go in topic files linked from its `## Index` as `[[topic]]`.
- **In the prompt**: both `MEMORY.md` files go into the Bot's system prompt. The section is frozen when a Session starts, so the provider's prompt cache holds; a change shows from the next part or checkpoint, and `recall` finds it at once.
- **Fixed sizes**: an entry has at most 300 characters, a `MEMORY.md` 4,000, a topic 16,000, and a scope 40 topics. A save past a limit fails and says how to make room.
- **Safety**: memory is data, not instructions. An entry that looks like a key or token is refused, and a Bot is told not to save what a web page, file or tool result asks it to remember.
- **History**: files change in place, and `journal.jsonl` keeps every change with the line before and after. When a Bot is deleted, its memory moves to `archive/`.

**The memory panel**: the Bot's details panel has a Memory row with the entry count; Manage opens the memory panel.

- **Memory summary**: the Bot's model writes a short summary in prose from every entry, in the interface language. It is written again when the entries change, and the ⋯ menu can regenerate it.
- **All entries**: the ⋯ menu lists every entry by scope and topic, with its date and author, and the size of each `MEMORY.md`. Remove takes two clicks.
- **Ask or update**: ask what the Bot remembers, or tell it what to add, correct or remove. One model call answers from the entries only, and its changes go through the same checks as the tools.
- A line in the chat ("Memory updated") shows when a Bot changes memory and opens the panel. When memory changes in the background, the Bot's capsule at the top of its chat stretches to say "Memory updated" for a moment; clicking it opens the memory panel.

A read-only dsh (see [Data and backups](#data-and-backups)) shows memory but cannot change it.

## Web search

The package includes a second plugin, `ds-bot/web-search`. It registers the search provider `auto`, and `cordis.patch.yml` makes it the default. Each search goes in this order:

1. If the profile names another `searchProvider`, that one is used.
2. The current model route's own search, with that route's key and host. The plugin knows the Anthropic Messages, OpenAI Responses and Gemini protocols, and a few search APIs (Ollama, Kimi, Zhipu, MiMo). Add more with `searchApis`.
3. A fallback without a key: the public result pages of Bing and DuckDuckGo.
4. If nothing works, the search fails and tells the model not to guess addresses.

Each result starts with a `Search backend: …` line that names the path it took.

**Turning `auto` off**: the `web` row still names `auto` when you turn off only the `web-search-auto` row (in the sidebar's Plugins page or with `disabled: true` in a profile patch). Then `web_search` fails in every session, Bot or not, with `WEB_PROVIDER_CONFIGURED_MISSING` (`configured web provider "auto" is not registered`). When you turn that row off, also name another `searchProvider` for the `web` row in the profile's `cordis.patch.yml`. The override replaces the row's whole config, so restate `fetchProvider`:

```yaml
- id: web-search-auto
  name: deepseek-office/web-search
  disabled: true
- id: web
  name: '@deepseek-ai/dsh-web'
  config:
    searchProvider: deepseek-official
    fetchProvider: http
```

Another plugin can also set the search provider while dsh runs, after the profile patch. When you turn such a plugin off, check this setting again.

## Bot browser

In dsh Desktop, a Bot's chat header has a globe button. It opens that Bot's own browser panel.

- **One partition per Bot** (`bot:<id>`): logins and cookies belong to that Bot only.
- **The Bot can read the page**: the `read_browser` tool reads the page's DOM, not a screenshot. The text becomes Markdown with headings, nested lists, tables, code blocks and quotes. Links and form controls are marked `[#n]` in place and listed below with their targets and values. The tool also reads the text you selected. Long pages are read in parts (`from`). Page content is treated as data, never as instructions.
  - It reads open Shadow DOM (with `<slot>`) and same-origin iframes up to 3 levels deep.
  - It reads only what is visible: `display:none`, `visibility:hidden`, zero-height and closed `<details>` content is skipped.
  - It never reads the values of password, credit card (`autocomplete="cc-*"`) or one-time code fields.
  - Limits: 400,000 characters, 150,000 nodes, 5,000 rows per table, 3,000 links and controls, 1.5 seconds. A cut result says so.
  - It cannot read cross-origin iframes (one line with the address), closed shadow roots, canvas content (online editors, maps), or text in CSS `::before` / `::after`. On pages that render on demand, only the rendered part is read.
  - Read only: the Bot cannot click, type, scroll or open addresses yet.
- **Addresses**: http and https only. localhost and LAN addresses are allowed; cloud metadata addresses (such as `169.254.x.x`) and dsh's own ports are not.
- The browser panel and the details drawer share the right column; opening one closes the other. Switching chats switches the panel to that Bot. Deleting a Bot clears its browser and saved address.

dsh Web has no browser panel and no `read_browser` tool.

## Secrets

When a Bot needs an API key, token or password, it calls `request_secret`, and a secret card shows in its own chat. The Bot never sees the value.

- **Fill in**: the field hides what you type, is not part of a form and is not autofilled. Choose "All Bots" or "Only this Bot" and select Save. A value must have at least 4 characters (a 4-digit PIN works). A value of 8 characters or more is hidden wherever it appears; a shorter one only where no letter or digit touches it, so ordinary words stay intact.
- **Allow**: if the secret is already saved but this Bot is not allowed to use it, the card only asks whether to allow it. You can also replace the value there.
- **Use**: the value goes into the Bot's shell environment as `DSH_SECRET_<NAME>` (`$DSH_SECRET_NAME` in bash, `$env:DSH_SECRET_NAME` in PowerShell). `list_secrets` lists the names a Bot can use. An MCP capability can also take `$DSH_SECRET_<NAME>` in its env, its headers and its URL (path or query); in the URL the value is URL-encoded. Use headers when the server accepts them.
- **Masking**: before a tool result is saved and before each request goes to the model, every copy of a secret value is replaced with `[secret:<NAME>]`.
- **Manage**: Settings → Secrets lists every secret by name, purpose, the Bot that asked and the last use. You can change who may use it, replace the value, delete it or add one. Deleting a Bot removes it from every secret.
- **Storage**: `<DSH_HOME>/bot/secrets.json`, file mode 600, written atomically. Values are never in `state.json` or logs.

Limits:

- On Windows, the file mode has no effect; the file is protected by your user folder only.
- Only exact copies of a value are masked. A Bot that encodes, splits or reverses a value can still print it. Do not give important secrets to a Bot you do not trust.
- On a page that is not HTTPS (for example dsh Web opened over http on a LAN), the value crosses the network in clear text. The card warns you.
- Group chats show no cards; a Bot asks in its own chat.

## Data and backups

The plugin saves its data in `config.home`. Without it, the folder is `$DSH_HOME/bot`, or `~/.dsh/bot` when `DSH_HOME` is not set.

| System | Default folder |
|---|---|
| Linux, macOS | `~/.dsh/bot/` |
| Windows | `C:\Users\<user>\.dsh\bot\` |

- To move all dsh data (Sessions, profiles and plugin data), set `DSH_HOME`.
- To move only the plugin data, set `home` in the configuration (see [Configuration](#configuration)).

Files in `bot/`:

| File | Content |
|---|---|
| `state.json` | The team: Bots, groups, Bot-to-Bot messages, preferences and open questions. A long message keeps only its first 2,000 characters here; all of it is in the Session it went to. |
| `group-lines/` | Long group lines, up to the 20,000 characters a member reads, one file per line; each is removed when its line leaves the group's latest 60 lines or the group is deleted |
| `state.lock` | The dsh that is using this data (pid and host). It is removed when that dsh exits. |
| `chat-index.sqlite` | Full-text index of older chat parts (`read_own_chat`); rebuilt if deleted |
| `usage.sqlite` | Token counts for the Usage page; rebuilt from the Session logs if deleted, losing only the calls outside the logs and the names of deleted Bots |
| `memory/` | Memory (see [Memory](#memory)): `bots/<id>/` and `team/` (`MEMORY.md` and topics), `journal.jsonl` (every change), `snapshots/` (the section each Session froze), `summaries/` (the panel's summary; safe to delete), `reviewed.json` (how far the memory review has read) and `archive/` (deleted Bots) |
| `ocr.json` | Cache of image text; safe to delete |
| `workspace` | The team workspace: the working folder of every Bot without one of its own (`config.workspace` changes it) |
| `secrets.json` | Saved secrets. Treat backups of it like passwords. |
| `logs/diagnostics.jsonl` | Recent errors and warnings, with keys, tokens, saved secrets and the home folder removed. It moves to `diagnostics.jsonl.1` past 1 MB. Safe to delete. |

The chats themselves are dsh Sessions and are not in `bot/`: they are in `~/.dsh/sessions/`. dsh keeps its workspace list in `~/.dsh/storages/workspace.json` and profiles (with model settings) in `~/.dsh/profiles/`. Bot browser logins are not saved: Desktop keeps each Bot's partition in memory only.

**Back up and restore**

1. Quit dsh completely (both the Web server and Desktop), so `state.json` is current.
2. Copy all of `~/.dsh/` (at least `bot/`, `sessions/` and `storages/`). A copy of `bot/` alone loses the chats.
3. To restore, quit dsh, put the folder back in the same place, then start dsh.

**Move to another computer**: `state.json` has no absolute paths except the working folders you set for Bots and groups, but dsh's `storages/workspace.json` and the Session folder names contain the workspace's absolute path. If the path is the same on the new computer, copy the folder. If it is different (another user name or system), it is not yet tested whether dsh finds the old Sessions.

**dsh Web and Desktop at the same time**: by default both use the same `~/.dsh`. The dsh that loads the team first takes `bot/state.lock` and can change the team. The other one is read-only: it shows the team and follows changes to the file, but refuses changes (`bot/read-only`, "open in another dsh"), and its Bots cannot start new Sessions. When the first one exits, the other one takes over on its next request. To change the team from both at once, give one of them a different `DSH_HOME` (two separate teams).

## Development

Work from `ds-bot/` with Node.js 22.19 or later and npm. The default setup uses `npm run harness` to install the pinned test and lint packages into `dev/harness/`; a separate Harness checkout is optional for those checks. For a cross-platform office preview, follow [Office development](#office-development).

The optional shell benches below require pnpm, a Unix-like environment and a deepseek-harness checkout with its dependencies installed, next to this repository (`../deepseek-harness`, or set `DSH_HARNESS`). The Linux Desktop bench also needs `xvfb-run` and `ffmpeg`. Scripted Web screenshots need Chrome or Chromium (`CHROME_BIN`; by default `google-chrome` or `chromium`).

```sh
npm ci                                   # build and runtime dependencies
npm run harness                          # pinned test dependencies and oxlint
npm run build                            # src/client → client.js
npm test                                 # unit tests
node scripts/build-client.mjs --check     # verify the generated client
npm run lint                             # oxlint using .oxlintrc.json

# Optional checkout-based shell benches:
dev/bench.sh dev 3100 8800 start         # Web test bench: mock model + dsh Web, data in ../.dsh-test-dev
dev/desktop-linux/desktop.sh dev start   # Desktop test bench: mock model + dsh Desktop in Xvfb
CONTEXT_WINDOW=100000 CHECK_RATIO=0.45 dev/bench.sh smoke 3101 8801 reset && node dev/smoke.mjs smoke 3101
dev/check.sh                             # all checks (see below)
```

- `client.js` is built from `src/client/` and committed, so `link:` and Git installs need no build. Do not edit `client.js` by hand; `npm test` checks that it matches the source. After a change in `src/client/`, run `npm run build` and reload the page. After a change in `index.js` or `src/host/`, restart dsh.
- **Web test bench** `dev/bench.sh <name> <web port> <mock port> [start|stop|reset|status]`: a scripted mock model (`dev/mock-llm.mjs`, no real tokens; its commands are listed at the top of the file) and a dsh Web server. Data goes in `../.dsh-test-<name>/`; `reset` clears the team and Sessions first. The login address with its token is in `../.dsh-test-<name>/web.log`.
- **Desktop test bench** `dev/desktop-linux/desktop.sh <name> [start|stop|reset|status]`: dsh does not run Desktop on Linux; `launch.mts` runs the unpackaged Desktop in Xvfb. The first start downloads Electron and a Linux runtime (a few minutes). `start` returns when the team shows in a 1400×860 window.
- **All checks** `dev/check.sh [--skip steps] [--only steps] [--out dir]`: `unit`, `build`, `lint`, `smoke`, `web` (screenshots of the sidebar, a chat, a group, Bot settings, the Bots page and group settings) and `desktop` (the same screenshots, then the Bot browser checks). It stops everything it started. On failure it names the step and its log and exits non-zero. A full run takes about 3 minutes after the first download.
- **Ports**: every script takes `SLOT=n` (0-9, default 0) so that several people or sessions on one machine do not collide: Web bench `31n0` and mock `88n0`, smoke `31n1` and `88n1`, Desktop mock `88n2`, and so on. A Desktop uses about 1 GB of memory; stop it when you are done.
- **Real models** (these cost tokens): `dev/steward-eval.mjs` sends hand-written conversation endings through the context steward's own prompt to an OpenAI-compatible route (or, with `--api messages`, an Anthropic Messages route such as DeepSeek's official one) and checks each decision. `dev/llm-tap.mjs <port> <upstream base URL> <log.jsonl> [body dir]` is a logging pass-through for either format: point a provider's `baseURL` at it, and it writes one JSON line per call (steward, checkpoint, handoff note or main turn, the Bot's name, token usage, the answer, and where the request first differs from the same Bot's previous one, which is what a provider's cache can reuse; never headers). With a body dir it also saves every request body. Each file explains its use at the top.
- **Screenshots**: `dev/ui-shots.mjs` works for both apps (`desktop <dsh repo> <dir> <renderer port>` or `web <dsh repo> <dir> <bench name> <web port>`).
- `npm test` loads the `@deepseek-ai/*` packages from `dev/harness/` by default; `DSH_HARNESS` can select an external Harness installation or checkout instead.

## Layout

| Path | Purpose |
|---|---|
| `index.js` | Host entry: installs the `src/host/` modules in order |
| `src/host/` | Host: team and storage (`roster`, `store`), tools (`tools`), turns and delivery (`turns`, `delivery`), group chats (`groups`), chat parts, the context steward and the index (`parts`, `steward`, `chat-index`), image text (`images`), secrets (`secrets`), Bot browser (`browser`), the `POST api/bot` route (`channel`) |
| `src/client/` | Browser source: sidebar, chat header, transcript cells, panels and dialogs, themes, Bot browser panel |
| `client.js` | Built from `src/client/` by `scripts/build-client.mjs` (esbuild); committed |
| `web-search.js` | The `auto` search provider; independent of the team code |
| `test/` | Unit tests and fixtures |
| `dev/characters.mjs` | Builds the characters (small 3D models traced to outlines) into the `CHARACTERS` table in `src/client/characters.js` |
| `dev/` | Mock model, test benches, smoke test, Desktop scripts, real-model tools (steward evaluation, logging pass-through) |

## License

[Apache-2.0](LICENSE)
