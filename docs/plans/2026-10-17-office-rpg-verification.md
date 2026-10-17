# Office RPG desktop verification — 2026-10-17

Target: desktop keyboard and mouse, as requested. Phone adaptation is deferred.
Runtime: DeepSeek Harness 0.2.0-rc.2, Phaser 4.2.1. All model calls used the
project's mock provider. Only isolated project-local test profiles were used.

## Automated checks

- `npm test`: 663 passed, zero failures. Five new world tests cover all team
  sizes from 0 through 12, every workstation and prop, collision-aware routes,
  local interaction, directions and paths starting at exact collision contacts.
- `node scripts/build-client.mjs --check`: generated client matches source.
- `npm run lint`: zero errors; the 13 existing upstream warnings remain.
- `git diff --check`: no whitespace errors.
- The release scanner reports zero must-fix findings. Public Phaser author
  credits and exact legacy storage identifiers remain explicitly attributed.

## Desktop browser checks

- A fresh installation has no office entry or game canvas before a group exists.
  Creating two mock groups produces two floors in the lobby directory.
- Creating another group through the English UI automatically opens its office
  on the third floor with two members and two desks. The lobby then lists three
  floors, and the scene still contains only one game canvas.
- The installed tarball's client hash matches the source build; it is not a
  source junction. The actual installation was tested through the public CLI.
- 1366×768, 1440×960 and 1920×1080 desktop layouts, sidebar collapse and
  dialogue/composer visibility work without horizontal overflow.
- Adding a fourth member adds its workstation and actor. Removing it returns
  the room to three desks. Only one game canvas remains after each transition.
  A Unicode teammate name also renders successfully.
- Holding W and Shift moves the player north; the player stops at y=244,
  exactly four art pixels below the meeting table's bottom edge at y=240.
- A native pointer click on Chief causes the player to route around the table
  and approach to within 25 art pixels before opening dialogue. Closing the
  dialogue and pressing E opens the local interaction again.
- Typing `wasd` in the composer does not move the player. Group mentions send
  through the ordinary conversation action. Sending still works after restarting
  the test server.
- Three AI portraits were generated and saved. Their palettes customize the
  directional character sheets; full directional art is supplied by the licensed
  character templates. AI does not currently synthesize a full animation sheet.
- An AI night theme saves correctly. Restoring the Komorebi preset updates the
  room texture while preserving the existing game canvas.
- A real mock group task produces a speaking activity in the scene, then returns
  to idle. Turning quiet motion off produces idle wandering. These activity
  changes preserve the game canvas.
- The focused desktop layout, membership, chat and activity checks completed
  without page errors. A separate mixed-size run observed two transient browser
  script errors, including a missing extension connection; they did not recur in
  the focused desktop run and are not used as passing evidence.

## Performance acceptance remains open

The engine is configured for 60 Hz Arcade Physics and a 60 FPS game loop.
The installed browser automation preserves the user's foreground window and
throttles its test page, sometimes to 1 FPS. The long pointer approach therefore
exceeded its first observation timeout but subsequently reached the expected
position and dialogue; the same live page was inspected and the interaction was
completed without restarting it. Those background timing samples do not prove
foreground frame rate.

After the user offered to foreground the page, a 14-second sample still recorded
13 frames after warm-up, a median interval of 1000.1 ms, and no page errors.
The document reported `visible` and focused. A separate A/B check compared the
office with ordinary chat after destroying the game canvas: both produced six
frames over approximately six seconds, the same 1000.1 ms median, and no long
tasks. Their 16 ms timers fired 363 and 362 times respectively. This supports
browser-level frame throttling rather than game-specific main-thread overload;
it does not establish actual foreground game performance. A 500 ms movement
sample under that cap was inconclusive. Device-specific foreground smoothness
still needs an unthrottled manual pass before production acceptance.

## Review and artifacts

Independent code review identified a one-pixel physics/navigation footprint
mismatch and missing Phaser notices. Both were corrected and independently
rechecked. The package includes Phaser's MIT grant, embedded-component notices,
the original CC0 license and a pinned asset source manifest.

Screenshots: [office](../images/pixel-office.png),
[lobby](../images/pixel-lobby.png),
[desktop dialogue](../images/pixel-office-dialogue.png).

The distributable is `artifacts/deepseek-office-0.2.0.tgz`. It contains local
game assets and browser code, not test conversations, profile data or model keys.
