<div align="center">
  <img src="docs/images/deepseek-office-logo.png" width="144" alt="DeepSeek Office logo: two workstations inside an office-shaped conversation bubble">
  <h1>DeepSeek Office</h1>
  <p><strong>A place to work, meet and take a break with your AI team.</strong></p>
  <p>A modern 2.5D office simulation for DeepSeek Harness, built on persistent AI teammates and real group conversations.</p>
  <p><strong>English</strong> · <a href="README.zh.md">简体中文</a></p>
  <p><code>v0.6.1</code> · <code>Three.js + Phaser</code> · <code>Apache-2.0 code</code></p>
  <p><a href="#highlights">Highlights</a> · <a href="#screenshots">Screenshots</a> · <a href="#quick-start">Quick start</a> · <a href="#how-to-play">How to play</a> · <a href="#roadmap">Roadmap</a></p>
</div>

<p align="center">
  <img src="docs/images/office-readme-hero.png" width="100%" alt="Current office scene with coworkers, workstations, meeting room, coffee studio and landscaped surroundings">
</p>
<p align="center"><sub>Actual gameplay from an isolated local test team. Office models and textures are bundled with the plugin.</sub></p>

Create a team, give everyone a role, and walk into its office. Each group chat becomes a floor: coworkers have desks, gather for meetings, share sofas and head off for a coffee. Their work and conversations run through the existing Harness agent system.

DeepSeek Office builds on [DS Bot](https://github.com/Fei2411/DeepSeek-Bot) and uses the public plugin interfaces of [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness). Long-lived identities, memory, group collaboration, model settings and permissions remain part of the same team.

<a id="highlights"></a>
## What makes it interesting

| Experience | What you can do |
|---|---|
| **One group, one floor** | Give different teams their own offices. Each floor keeps its seeded room placement and grows work rooms as members join. |
| **Meetings inside the scene** | Take the head seat, watch coworkers enter in order, and send messages to the real group from the meeting composer. |
| **A team you can recognize** | Coworkers have individual skin, hair, shirt, trouser and shoe colors, with walking and seated animations. |
| **Small breaks between tasks** | Brew coffee, turn pages, catch stars at the arcade, prepare lunch, mix a mocktail or follow a stretch rhythm. |
| **A shared screening room** | Six three-person sofas face a large curved TV. People can use separate seats on the same sofa. |
| **An office with a sense of time** | Local time shapes sunlight and evening lighting. Plants, gardens and the surrounding city complete the setting. |
| **Your existing AI tools** | Keep private chats, group messages, memory, capabilities, scheduled tasks and usage statistics. Real work takes priority over leisure animations. |

The meeting-room wall display opens the group's complete conversation, including history and live replies. Short speech bubbles show recent messages above the speaker; the chat panel keeps the full text and attachments.

<a id="screenshots"></a>
## A look inside

<table>
  <tr>
    <td width="50%" valign="top">
      <strong>Meet around the same table</strong><br>
      <a href="docs/images/office-meeting.png"><img src="docs/images/office-meeting.png" width="100%" alt="Coworkers gathered around the conference table with the original group composer below"></a><br>
      Your head seat, eight member chairs and orderly standing places for the rest of the team.
    </td>
    <td width="50%" valign="top">
      <strong>Keep the whole conversation in view</strong><br>
      <a href="docs/images/office-meeting-display.png"><img src="docs/images/office-meeting-display.png" width="100%" alt="Centered wall-display panel showing the group's full conversation"></a><br>
      The wall display and meeting pane reuse the same group chat, history and message input.
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <strong>Visit another team's floor</strong><br>
      <a href="docs/images/office-elevator.png"><img src="docs/images/office-elevator.png" width="100%" alt="Walk-in elevator with floor destinations and team information"></a><br>
      Step into the lift, pick a destination, and travel through a door-and-fade transition.
    </td>
    <td width="50%" valign="top">
      <strong>Save a seat for a break</strong><br>
      <a href="docs/images/office-cinema-shared.png"><img src="docs/images/office-cinema-shared.png" width="100%" alt="Screening room with a curved TV, three rows of sofas and coworkers sharing a sofa"></a><br>
      Three evenly spaced sofa rows provide 18 seats. The TV currently shows a static cinema illustration.
    </td>
  </tr>
</table>

Screenshots record working development builds; room arrangements vary by group. Click an image for the full view.

<a id="quick-start"></a>
## Quick start

### 1. Prepare Harness

- Install DeepSeek Harness. The development harness is pinned to **`0.2.0-rc.2`**; current office checks use an isolated Web profile on Windows.
- Configure a model for your AI teammates. Chat and optional AI appearance/theme design use those model settings.
- Use a desktop browser or Harness Desktop with WebGL available. **Godot and Blender are not required to run the plugin.**

> This plugin replaces the original `ds-bot` / legacy `dsh-bot` team shell in the selected profile. Disable that plugin before enabling DeepSeek Office, and keep your existing team data.

### 2. Get and install the package

Use the `deepseek-office-0.6.1.tgz` supplied with a build or published release. If a package is not available, build it from this checkout. Source builds need Node.js **22.19 or later** and npm:

```sh
cd ds-bot
npm ci
npm run build
node -e "require('node:fs').mkdirSync('../artifacts', { recursive: true })"
npm pack --pack-destination ../artifacts
```

In **Harness Desktop**, open **Plugins → Add plugin**, enter the package's absolute local path, install and enable it, then restart if prompted. For example:

```text
C:\plugins\deepseek-office-0.6.1.tgz
```

For **Harness Web**, with pnpm available, replace the example with your actual package path:

```sh
npx @deepseek-ai/dsh@0.2.0-rc.2 plugin --profile web add "/absolute/path/deepseek-office-0.6.1.tgz"
npx @deepseek-ai/dsh@0.2.0-rc.2 web
```

<details>
<summary>Installing by package name after npm publication</summary>

The configured npm package name is `deepseek-office`. After an owner publishes it to the selected registry, the add-plugin field can accept `deepseek-office` or a version such as `deepseek-office@0.6.1`. Uploading source to GitHub alone does not publish that npm package. Use the local package if registry publication has not happened.

The plugin lives in the repository's `ds-bot/` subdirectory. A repository URL is therefore not interchangeable with a published package name.

</details>

### 3. Create your first office

1. Create at least **two AI teammates**, and set their names, roles, instructions and models.
2. Create a group chat and add the teammates. A group supports **2–12 AI members**; you do not count toward that limit.
3. The new group opens its office. **Office building** in the sidebar opens reception; **Floors** lets you visit a group.
4. Walk toward a coworker or facility, or choose someone through **Team**. You can return to the usual conversation with **Back to chat**.

The office entry appears once the team has a group. With no groups, the regular direct-chat experience remains available.

<a id="how-to-play"></a>
## Your first five minutes

### Walk, look around and talk

| Control | Action |
|---|---|
| Click the floor | Walk there using a route around walls and furniture |
| `WASD` / arrow keys | Move in screen directions, including after rotating the camera |
| Hold `Shift` | Run |
| `E` near a person or object | Interact |
| Mouse wheel / zoom buttons | Zoom in or out |
| **Rotate view / Overview** | Rotate the camera or inspect the whole floor |
| Floor map / **Follow** | Inspect a room, then return to following your character |
| **Quiet motion** | Pause autonomous leisure movement and reduce ambient animation |
| **Back to chat** | Leave the office view and use the ordinary conversation |

### Call a meeting

Walk into **Meeting room** and confirm **Start meeting**. You take the head seat; teammates enter in roster order, fill the member chairs, and stand around the perimeter when those seats are full. Send a message in the lower conversation area exactly as you would in the group chat.

Interact with the wall display or select **Open display** to read the full group history in a centered panel. Choose **End meeting** to stand up and let coworkers resume their routines.

### Take a break or change floors

Click a sofa and choose **Sit down**; close the activity panel to stand up. In **Screening room**, several people can share a sofa's independent seats. Other leisure rooms offer coffee, books, a 30-second star-catching arcade round, lunch, mocktails or stretching, depending on that floor's facilities. You can also greet Momo in the corridor.

Choose **Lift** on the floor map to locate the elevator. Walk inside, read the destination list and select a floor. The cabin closes, the current scene fades, and the destination appears before the doors open.

### Make the team feel like yours

Choose a teammate to inspect or regenerate its appearance. **Decorate** adjusts the floor's theme; AI design can propose wall, floor and accent colors. Explicit appearance descriptions can influence the character's palette. Optional AI design makes additional model calls; saved results are reused.

Current 3D characters share one body, hairstyle and clothing shape. Distinct palettes provide identity; multiple character meshes, furniture placement and room-shape editing are future work. The 3D wardrobe is stored in the current browser.

<a id="floor-layout"></a>
## How floors are arranged

Every group floor includes **one meeting room, one screening room, two seeded leisure facilities and one to three work rooms**. The leisure choices are coffee, reading, arcade, kitchen, mocktail bar and movement. Four employees fit in a work room; members five and nine open additional rooms without moving the existing rooms.

| AI members | Work rooms | Total furnished rooms, including screening |
|---|---:|---:|
| 2–4 | 1 | 5 |
| 5–8 | 2 | 6 |
| 9–12 | 3 | 7 |

The first six room slots are shuffled deterministically from the group ID, so returning to a group preserves its layout. Unused slots become gardens. The screening room occupies the east wing, and the lift sits at the right end of the shared corridor. Reception has its own welcome studio and leisure rooms.

<details>
<summary>See the current full-floor overview</summary>

![Full-floor overview including the meeting room, screening room, work rooms and landscaped city](docs/images/office-readme-overview.png)

</details>

<a id="current-scope"></a>
## Current scope

Version **0.6.1** focuses on a playable office setting for an existing AI team. Group messages, agent work and permissions use the original Harness flow. The scene currently has **no cross-device multiplayer, cloud-synchronized avatar placement, free-form building editor or management economy**. The screening-room TV has a static display; video playback is not implemented. The 3D view requires WebGL, and phones are not the primary target yet.

More on memory, permissions, working folders, models, scheduled tasks and backups: [plugin reference](ds-bot/README.md).

<a id="development"></a>
## Development and verification

```sh
cd ds-bot
npm ci
npm run harness
npm run build
npm test
node scripts/build-client.mjs --check
npm run lint
```

Edit `src/client/` and rebuild; `client.js` is generated and committed. For an isolated preview with mock models and project-local test data, follow [Office development](ds-bot/README.md#office-development). Never use a normal Harness data directory for tests.

| Area | Source or evidence |
|---|---|
| Plugin and host behavior | [`ds-bot/`](ds-bot/) · [plugin reference](ds-bot/README.md) |
| World layout, navigation and simulation | [`src/shared/office/`](ds-bot/src/shared/office/) |
| 2.5D rendering and interface | [`src/client/office/`](ds-bot/src/client/office/) · [rendering checks](docs/office-25d-verification.md) |
| Characters and individual looks | [Character checks](docs/office-character-verification.md) |
| Meetings, history and the group composer | [Meeting checks](docs/office-meeting-verification.md) |
| Floor travel and screening seats | [Elevator checks](docs/office-elevator-verification.md) · [screening-room checks](docs/office-cinema-verification.md) |

## Credits and license

Built on [DS Bot](https://github.com/Fei2411/DeepSeek-Bot) and [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness). Code retains the project's [Apache-2.0 license](LICENSE), [NOTICE](NOTICE) and [third-party notices](ds-bot/THIRD-PARTY-NOTICES.txt).

Three.js and Phaser provide the rendering and simulation foundations. Architecture, room composition and interface work are authored for this fork. Character, lift and TV models are owner-supplied; their provenance is recorded under [office-worker](ds-bot/src/client/assets/office-worker/SOURCES.md), [elevator](ds-bot/src/client/assets/elevator/SOURCES.md) and [cinema](ds-bot/src/client/assets/cinema/SOURCES.md), without claiming additional third-party rights. Momo uses CC0 Ninja Adventure artwork by Pixel-Boy / Sparklin Labs. Retained LPC resources keep their own [licenses and credits](ds-bot/src/client/assets/lpc/SOURCES.md).

The new project logo is original AI-generated artwork; see [brand source and prompt](docs/branding/SOURCES.md). This is an independent community project.

<a id="roadmap"></a>
## What's next

These are development plans, not features included in the current release.

- [ ] **Cross-device multiplayer** — shared rooms, presence, player movement and appearance synchronization, reconnection and session permissions, so people on different computers can enter the same office.
- [ ] **Richer environments** — improve furniture, materials, lighting, gardens and architectural detail; expand character shapes, outfits and animation quality.
- [ ] **More expressive interactions** — refine approaching, turning, sitting and standing; add richer facility behavior, meeting feedback and video controls for the screening room.
- [ ] **User-designed spaces** — let users place furniture, adjust room layouts, choose styles and save reusable floor templates, then explore AI-assisted scene design.
