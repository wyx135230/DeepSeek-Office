# DeepSeek Office

English | [中文](README.zh.md)

A personal [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) plugin based on [DeepSeek-Office](https://github.com/wyx135230/DeepSeek-Office) and DS Bot. Keep your existing AI team and chats, and visit them in a cozy pixel studio.

![Pixel office](docs/images/pixel-office.png)

## Your team, in a little building

- Every group chat becomes an office floor. The lobby shows each floor's name, purpose, desk count and current activity.
- Adding or removing a member adds or removes its workstation. Creating a group in the interface opens its office.
- Each floor has separate rooms, physical walls and automatic doors around a shared corridor. Four desks fit each work room; members five and nine add connected work rooms. A stable floor seed selects three of six facilities: cafe, library, arcade, restaurant, mocktail bar and gym. Ordered room slots and materials vary between floors.
- A stable library of 96 full-body coworker presets combines eight hairstyles, four skin palettes, four outfits and two adult body types. Coworkers use the LPC artists' compatible body, clothing, head and hair layers in their original 64 × 64 registration, with authored walk, idle and sitting poses. AI outfit colors customize their shirts. Actual Harness work takes priority over coffee, reading, arcade breaks and short social greetings.
- Brew a cup through preparation and sipping, choose one of three original short books and turn its pages, play the 30-second Star catcher arcade game, assemble a lunch bowl, mix a timed mocktail, or complete a six-stretch rhythm break. Arcade best scores are saved per office. Close an activity to return to the room.
- Click to walk around furniture, use WASD or arrow keys, hold Shift to run, and press E near a coworker or object. All floors keep the same 2x character scale. The camera pans through connected rooms. A left-side minimap shows the layout and moving people: click or drag to inspect, then choose Follow or move your character to return.
- Meet coworkers in the room, send group messages or mentions, and open a private chat. The Team menu also provides direct, keyboard-accessible conversations.
- A readable Segoe UI/system interface frames the canvas. Nearby names and short speech use fixed-screen HTML text; ambient greetings stay in the scene and do not send model or group messages.
- A Bot's configured model generates a saved pixel portrait and outfit palette. Its outfit colors also customize the directional game character. Describe a new look to regenerate it; built-in characters remain available if generation fails.
- Choose daytime or moonlit presets, or ask AI for an office palette and atmosphere. Each floor saves its own design.
- With no groups, the office entry and scene are absent. Direct chat works as before. Return to chat at any time.

The original team features remain: long-lived Bots, group relays, memory, model selection, permission controls, capabilities, scheduled tasks and usage. See the [plugin reference](ds-bot/README.md).

The current build targets desktop keyboard and mouse use. Phone optimization is deferred.

## Install the local build

Tested against DSH `0.2.0-rc.2`. Configure at least one model in DSH for chat and AI design. This fork's npm name is `deepseek-office`; use the local package until you publish your own release.

The package is an alternative to `ds-bot`, not an additional team shell. In the target DSH profile, disable or remove the original `ds-bot` / legacy `dsh-bot` plugin before enabling this one. Keep your existing team data. Both variants use the same internal team identity and storage format.

**DSH Desktop**

1. Open Plugins → Add plugin.
2. Enter the absolute path of `deepseek-office-0.4.0.tgz` from this build's `artifacts/` folder.
3. Install, enable and fully restart DSH if requested.
4. Create a group chat. Its office opens automatically; the sidebar's **Office building** entry opens the lobby.

**DSH Web**

Requires Node.js 22.19 or newer and pnpm. Replace the example path with the local tarball path:

```sh
npx @deepseek-ai/dsh@0.2.0-rc.2 plugin --profile web add "/absolute/path/deepseek-office-0.4.0.tgz"
npx @deepseek-ai/dsh@0.2.0-rc.2 web
```

## AI design and current scope

Character design uses the Bot's configured text model through Harness. It returns validated 16 × 24 pixel data and a palette, not executable code. Missing characters are generated sequentially on office entry and saved for reuse. Regeneration and AI room design make additional model calls and use tokens. Model quality and availability affect results; failures keep the previous or built-in design and offer a retry.

Room customization currently changes wall, floor and accent colors plus day/night lighting. Room geometry and furniture come from seeded, connected facility templates. Custom furniture art is bundled locally; online AI generation of arbitrary geometry or animations is not included. This provides a base for later AI layout and furniture customization.

The game uses locally bundled Phaser 4.2.1 with Arcade Physics, directional sprite animation, collision-aware routes and a fixed-scale following camera and interactive minimap. It starts only when an office is opened and uses WebGL with Canvas fallback. Closing the office destroys the game and its listeners. Quiet motion stops coffee steam, monitor cursors and autonomous leisure/social movement while retaining player controls. Activity panels hold the player in place while coworkers continue their routines; real work interrupts a coworker's break. The plugin interface is English independently of the surrounding Harness language; your names and conversation content are preserved.

## Development

Source: [ds-bot/](ds-bot/). Design: [campus architecture and asset pipeline](docs/office-campus.md). Validation and limits: [verification](docs/verification.md).

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

Phaser and embedded components have their licenses in [THIRD-PARTY-NOTICES](ds-bot/THIRD-PARTY-NOTICES.txt). LPC Revised artwork by Eliza Wyatt and the LPC contributors is used under OGA-BY 3.0 from [ElizaWy/LPC](https://github.com/ElizaWy/LPC), pinned at `f07f7f5892e67c932c68f70bb04472f2c64e46bc`; the [LPC source record](ds-bot/src/client/assets/lpc/SOURCES.md) links the file manifest, contributor credits and license. Original PNGs are retained; runtime rendering composes character layers, recolors shirts, and crops/scales furniture. The [96-character library](ds-bot/src/client/assets/lpc-cast/SOURCES.md) retains additional family credits. [Custom facility atlas](ds-bot/src/client/assets/custom/SOURCES.md) records the generated art and reuse pipeline. Room composition, arcade overlays, short books and interface code are original to this fork.

Momo uses CC0 [Ninja Adventure](https://github.com/sparklinlabs/superpowers-asset-packs/tree/master/ninja-adventure) artwork by Pixel-Boy / Sparklin Labs; the [Ninja source record](ds-bot/src/client/assets/ninja/SOURCES.md) pins its source. Public activity-visualization ideas from [Pixel Agents](https://github.com/pixel-agents-hq/pixel-agents) and [Star Office UI](https://github.com/ringhyacinth/Star-Office-UI) informed the design; their code and art are not included.
