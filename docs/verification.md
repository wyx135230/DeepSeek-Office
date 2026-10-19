# Campus verification — 0.4.2

Verified on Windows with Node.js 22.23.0, DSH Web 0.2.0-rc.2 and a headless
Chrome driven through playwright-core. All model and group mutations used an
isolated project-local mock profile. No personal DSH home, production provider
or paid asset account was used.

## Automated checks

- Full suite: 709 passed, zero failed, including the new chibi registration and
  local-time lighting tests.
- `node scripts/build-client.mjs --check`: passed.
- `npm run lint`: zero errors, 13 existing upstream warnings; no new warnings.
- World tests cover every supported count from 0 to 12, reproducible room
  seeds, varied facility combinations, doors, collision and reachable stations.
- The long-distance coworker regression retains the booking after 26 seconds
  and reaches the distant station; outbound and home deadlines use route length.
- The build in this tree contains no test, profile, node_modules, credential or
  log files.

## Browser acceptance

- Three- and twelve-member floors keep exactly the same camera zoom: 3x. At the
  tested 1440×960 window one room (320 × 256 native pixels) fits almost fully in
  the viewport, and a 16px tile renders as 48 display pixels.
- Lobby, floor directory, work floor, team drawer and a member dialogue were
  opened end-to-end on the mock bench in this run; the page reported zero errors.
- Click/drag inspection and Follow work on the minimap. Actors move on the map
  and the camera pans to each selected room.
- Unused room slots render planted courtyard gardens instead of unlit voids.
- The clock HUD and baked room light change together across dawn, morning,
  midday, afternoon, evening and night; night windows show stars and wall lamps
  warm the room. Quiet motion pauses steam, dust and fireflies.
- The dialogue panel keeps a framed portrait, name plate, state badge, actions
  and the message composer; closing it returns focus to the scene.
- Screenshots reviewed at the real game scale: chibi sprites, furniture, walls,
  automatic doors, minimap, parchment HUD, courtyards and facility rooms.

## Performance limits

Raw native requestAnimationFrame measurements vary with browser conditions.
An existing WebGL office page produced about 200 callbacks per two seconds;
a 14-second blank-page control stayed near the same rate. After navigation,
Harness with no office and later office samples both ran near one callback
per second, despite visible/focus flags. Scene update CPU samples were about
0.1–0.4ms. Static review found no plugin frame limiter or global rAF override.
The exact browser/host throttling cause is unresolved; these measurements do
not certify stable 60 FPS. No Harness internals or browser scheduling policies
were patched.

## Package audit

`deepseek-office-0.4.2.tgz`: 59 files, 1,496,743 compressed bytes.
SHA-256: `769a0739532894d5f3288f6c5461fe18ad8a1813365e290030af13df6a723582`.
The packaged client matches the generated source build byte for byte. The Ninja
Adventure license/source record for Momo ships with the package; LPC and the
earlier custom atlas are no longer used at runtime and are not packaged, but
their pinned source records, credits and licenses remain in the repository under
`src/client/assets/`. Tests, profiles, node_modules, credentials and logs are
absent. This tarball was audited; a separate fresh-profile installation was not
repeated for 0.4.2. Source runtime acceptance used the same client bytes.

## Current scope

Desktop keyboard and mouse; game UI English. AI design produces a saved 16 × 24
portrait plus a bounded full-body trait design; the scene draws original 16 × 32
chibi sprites from those traits. Furniture, tiles, rooms, lighting and interface
art are original and procedural. Background music/ambient audio and arbitrary
online sprite animation or AI geometry generation are not included. This is a
playable campus foundation, with no economy, build editor or management campaign
yet. DSH Desktop packaging and real-provider quality were not run in this
environment. No remote push or public publication was performed.

[Office preview](images/pixel-office.png) · [Reading room preview](images/pixel-reading-room.png)
