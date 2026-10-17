# DeepSeek Office

English | [中文](README.zh.md)

A personal [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) plugin based on [DeepSeek-Office](https://github.com/wyx135230/DeepSeek-Office) and DS Bot. Keep your existing AI team and chats, and visit them in a gentle Japanese pixel office.

![Pixel office](docs/images/pixel-office.png)

## Your team, in a little building

- Every group chat becomes an office floor. The lobby shows each floor's name, purpose, desk count and current activity.
- Adding or removing a member adds or removes its workstation. Creating a group in the interface opens its office.
- Shoji windows, timber floors, a tatami tea corner, meeting table and Momo the office dog form the default scene. Window light, reading lamps, stationery, tea trays, cushions, a dog bed and a small flower garden add everyday detail. Locally bundled CC0 Ninja Adventure art is combined with original office furniture.
- Full-body coworkers have visible arms, clothing, trouser legs and shoes, with four-direction walk animation and AI outfit colors. They show actual Harness activity, return to their desks to work and stroll during breaks.
- Click to walk around furniture, use WASD or arrow keys, hold Shift to run, and press E near a coworker or object. The whole office fits between the desktop HUD bars whenever characters remain legible; only oversized rooms use the following camera. Resizing the window automatically reevaluates the view.
- Meet coworkers in the room, send group messages or mentions, and open a private chat. The Team menu also provides direct, keyboard-accessible conversations.
- A Bot's configured model generates a saved pixel portrait and outfit palette. Its outfit colors also customize the directional game character. Describe a new look to regenerate it; built-in characters remain available if generation fails.
- Choose daytime or moonlit presets, or ask AI for an office palette and atmosphere. Each floor saves its own design.
- With no groups, the office entry and scene are absent. Direct chat works as before. Return to chat at any time.

The original team features remain: long-lived Bots, group relays, memory, model selection, permission controls, capabilities, scheduled tasks and usage. See the [plugin reference](ds-bot/README.md).

The current release targets desktop keyboard and mouse use. Phone optimization is deferred.

## Install the local build

Tested against DSH `0.2.0-rc.2`. Configure at least one model in DSH for chat and AI design. This fork's npm name is `deepseek-office`; use the local package until you publish your own release.

The package is an alternative to `ds-bot`, not an additional team shell. In the target DSH profile, disable or remove the original `ds-bot` / legacy `dsh-bot` plugin before enabling this one. Keep your existing team data. Both variants use the same internal team identity and storage format.

**DSH Desktop**

1. Open Plugins → Add plugin.
2. Enter the absolute path of `deepseek-office-0.2.2.tgz` from this build's `artifacts/` folder.
3. Install, enable and fully restart DSH if requested.
4. Create a group chat. Its office opens automatically; the sidebar's **Office building** entry opens the lobby.

**DSH Web**

Requires Node.js 22.19 or newer and pnpm. Replace the example path with the local tarball path:

```sh
npx @deepseek-ai/dsh@0.2.0-rc.2 plugin --profile web add "/absolute/path/deepseek-office-0.2.2.tgz"
npx @deepseek-ai/dsh@0.2.0-rc.2 web
```

## AI design and this first version

Character design uses the Bot's configured text model through Harness. It returns validated 16 × 24 pixel data and a palette, not executable code. Missing characters are generated sequentially on office entry and saved for reuse. Regeneration and AI room design make additional model calls and use tokens. Model quality and availability affect results; failures keep the previous or built-in design and offer a retry.

Room customization currently changes wall, floor and accent colors plus day/night lighting. Furniture placement and room geometry use the default layout. This provides a base for later AI layout and furniture customization.

The game uses locally bundled Phaser 4.2.1 with Arcade Physics, directional sprite animation, collision-aware routes and an adaptive overview/following camera. It starts only when an office is opened and uses WebGL with Canvas fallback. Closing the office destroys the game and its listeners. Quiet motion stops drifting petals, the wind chime, steam, monitor cursors and idle wandering while retaining player controls. The plugin interface is English independently of the surrounding Harness language; your names and conversation content are preserved.

## Development

Source: [ds-bot/](ds-bot/). Design: [office RPG plan](docs/plans/2026-10-17-office-rpg.md).

```sh
cd ds-bot
npm ci
npm run harness
npm run build
npm test
node scripts/build-client.mjs --check
npm run lint
npm pack --pack-destination ../artifacts
```

For an isolated local preview, run `node dev/office-bench.mjs`. It uses mock models and project-local `.dsh-test-office/` data on ports 3106/8806, never your normal DSH home. The first run needs the plugin installed into that test profile; see [development instructions](ds-bot/README.md#office-development). Stop it with Ctrl+C.

No keys, chats or models are included in the installation package. Existing team data stays in the target DSH home's `bot/` and `sessions/` folders. Uninstalling the plugin does not remove it.

## Credits and license

Built from wyx135230/DeepSeek-Office main at `939a6635830cb5b246e7dd19c67b0e1352ad1c07`, based on [DS Bot](https://github.com/Fei2411/DeepSeek-Bot). Original upstream copyright and Apache-2.0 terms are preserved in [LICENSE](LICENSE) and [NOTICE](NOTICE).

Phaser and embedded components have their licenses in [THIRD-PARTY-NOTICES](ds-bot/THIRD-PARTY-NOTICES.txt). [Ninja Adventure](https://github.com/sparklinlabs/superpowers-asset-packs/tree/master/ninja-adventure) art by Pixel-Boy / Sparklin Labs is CC0; the [asset manifest](ds-bot/src/client/assets/ninja/SOURCES.md) pins the source commit. Public activity-visualization ideas from [Pixel Agents](https://github.com/pixel-agents-hq/pixel-agents) and [Star Office UI](https://github.com/ringhyacinth/Star-Office-UI) informed the design; their code and art are not included.
