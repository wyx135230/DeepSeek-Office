# Pixel office verification — 2026-10-17

Verified on Windows with Node.js 22.23.0, DSH Web 0.2.0-rc.2 and locally bundled
PixiJS 8.22.0. All model calls used the project's mock model. No personal DSH home,
real API key or production model was used for these checks.

## Automated checks

- `npm test`: 658 passed, zero failed. Includes 23 office tests for building and
  desk derivation, real activity mapping, avatar/theme validation, walking paths,
  AI persistence, cancellation, concurrent windows, read-only transitions and
  members removed during generation.
- `node scripts/build-client.mjs --check`: passed.
- `npm run lint`: passed, with 13 existing upstream warnings.
- `node dev/smoke.mjs office 3106`: all 41 original API smoke steps passed,
  including direct chats, group relays, membership changes, memory and capabilities.
- Repository release-tree scan: zero must-fix findings. Public dependency license
  contacts and literal documentation example paths are reported as allowed findings.
- `git diff --cached --check`: passed.

## Browser checks

Used Tabbit and the public Harness interface against isolated mock benches.

- With all test groups removed, there is no office entry or scene canvas.
- Two groups produce two directory entries with their own purposes and desk counts.
- Adding/removing a member updates the member list and corresponding derived layout.
- E selects a coworker; arrow keys and click-to-walk are accepted by the scene.
- The character card opens private chat; office messages enter the ordinary group
  conversation and show a sent confirmation.
- A prompted AI appearance is saved on the Bot. AI room colors and the night preset
  are saved per room. Appearances, floors and themes survive a host restart.
- Creating a group through the interface automatically opens its office and adds
  a third floor. Collapsing the sidebar updates the office's left edge.
- At 390 × 844, there is no horizontal overflow and the composer remains accessible.
  The reduced-motion preference is respected. Toggling quiet motion preserves the
  same canvas and renderer.
- The final office, AI design, chat and new-group checks completed without page errors.
  A transient error during earlier resize/reload testing could not be reproduced;
  subsequent checks included repeated resize/reload cycles and quiet-motion changes.
  Initial drawing now occurs before the loading state ends, and quiet-motion changes
  no longer recreate the WebGL application.

Screenshots: [office](../images/pixel-office.png), [lobby](../images/pixel-lobby.png).

## Installation artifact

`deepseek-office-0.1.7.tgz` contains 47 files, 931,076 compressed bytes. It includes
the generated client, host/shared modules and required license notices, without
test data, logs, keys or local dependencies.

SHA-256: `7abd68b7f61e1c4e317669cbc778a02f4aef52d07ebebea0af6b82b01a6c11a6`.

Installed that tarball with the public DSH plugin command into a fresh
`.dsh-test-office-package/` profile, without a source junction. On ports 3116/8816,
the installed package passed browser checks for no-group hiding, opening a pixel
office, AI character generation, AI room design and message sending, with no page errors.

## Limits

Real model output quality and real-provider compatibility need validation with the
user's configured model. AI room customization currently changes colors and day/night
atmosphere; furniture layout uses the preset. DSH Desktop and Docker were not run in
this Windows environment. Docker and release package-name references were updated,
but Docker runtime checks remain for a machine with Docker available.

The install package is local. No GitHub push, npm publication or change to the user's
normal Harness profile was performed.
