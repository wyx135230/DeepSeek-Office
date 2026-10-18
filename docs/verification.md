# Campus verification — 0.4.0

Verified on Windows with Node.js 22.23.0, DSH Web 0.2.0-rc.2 and Tabbit.
All model and group mutations used an isolated project-local mock profile.
No personal DSH home, production provider or paid asset account was used.

## Automated checks

- Full suite: 694 passed, zero failed; the final client build also passed
  the suite after the dialogue focus fix.
- `node scripts/build-client.mjs --check`: passed.
- `npm run lint`: zero errors, 13 existing upstream warnings; no new warnings.
- `git diff --cached --check`: passed.
- Release source scan: 459 files, zero must-fix findings. The scanner's
  allow-listed dependency author contacts and documentation examples remain.
- World tests cover every supported count from 0 to 12, reproducible room
  seeds, varied facility combinations, doors, collision and reachable stations.
- The long-distance coworker regression retains the booking after 26 seconds
  and reaches the distant station; outbound and home deadlines use route length.

## Browser acceptance

- Three- and twelve-member floors keep exactly the same camera zoom: 2x.
- Membership sequence 4, 5, 9, 12, 3 creates 1, 2, 3, 3, 1 work rooms.
  Facilities and their positions remain unchanged; there is one canvas.
- Four additional mock groups cover all six facility kinds with different
  room combinations. Stable employee identities retain their selected preset.
- Click/drag inspection and Follow work on the minimap. Actors move on the map.
- Opening a coworker dialogue retains an 868px-wide world viewport at the
  tested 1440x960 window. Mouse-close restores scene focus; the next 650ms
  right-arrow press moves the visitor 53.3 native pixels. Drawer close also
  restores keyboard focus.
- Actual mocktail mixing, all six timed stretches and lunch preparation finish
  through native mouse/keyboard input. The lunch uses a seated pose, rejects
  an ingredient out of order, and releases the pose/activity when finished.
  This run reported zero page errors.
- Seated reading reaches page 2/3 and releases its pose on close; coffee
  completes preparation, brewing and sipping in the new room layout.
- A complete arcade round finishes in 30.9 seconds with score 60, best 60
  and timer 0s. Arrow input moves the catcher while the visitor stays at
  (920,160). Verification pauses all repository writes: development hot
  reload can otherwise restart a scene during a round.
- Reviewed screenshots show full-body characters, walls and working automatic
  doors, the minimap, authored office furniture and the custom gym facilities.

## Performance limits

Raw native requestAnimationFrame measurements vary with browser conditions.
An existing WebGL office page produced about 200 callbacks per two seconds;
a 14-second blank-page control stayed near the same rate. After navigation,
Harness with no office and later office samples both ran near one callback
per second, despite visible/focus flags. Scene update CPU samples were about
0.3–0.4ms, and NPC movement continued. Static review found no plugin frame
limiter or global rAF override. The exact browser/host throttling cause is
unresolved; these measurements do not certify stable 60 FPS. No Harness
internals or browser scheduling policies were patched.

## Package audit

`deepseek-office-0.4.0.tgz`: 203 files, 5,416,019 compressed bytes.
SHA-256: `4030b62a2de6effe31096f7f058334fba43bd0a280e466988b7718b4473decd1`.
The packaged client matches the generated source build byte for byte.
LPC, the 96-preset cast, custom atlas and Ninja licenses/source manifests
are included. Tests, profiles, node_modules, credentials and logs are absent.
This final tarball was audited; a separate fresh-profile installation was not
repeated for 0.4.0. Source runtime acceptance used the same client bytes.

## Current scope

Desktop keyboard and mouse; game UI English. AI design currently produces
saved portraits/outfit palettes and room colors/atmosphere. Arbitrary online
sprite animation and AI geometry generation are not implemented. This is a
playable campus foundation, with no economy, build editor or management
campaign yet. DSH Desktop packaging and real-provider quality were not run
in this environment. No remote push or public publication was performed.

[Office preview](images/pixel-office.png) · [Gym preview](images/pixel-gym.png)
