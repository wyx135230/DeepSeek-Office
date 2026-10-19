# Modern office verification — 0.5.0

Verified on 2026-10-19 on Windows, Node.js 22.23.0, Three.js 0.186.1,
Phaser 4.2.1 and the bundled DSH 0.2.0-rc.2 mock harness.

## Automated checks

- Full suite: **714 passed, 0 failed**.
- Generated `client.js` consistency check: passed.
- Linter: 0 errors, 13 existing warnings in unrelated modules.
- New regression coverage: projection/unprojection at four rotations,
  screen-relative normalized movement, vertical registration, viewport input
  boundaries and complete architecture disposal across repeated rebuilds.
- Initial sandbox-only baseline could not atomically rename its temporary
  fixture files (EPERM). It was stopped. The successful full suite used a
  dedicated task-local temporary directory under normal local permissions.

## Browser acceptance

Real keyboard/mouse operations in Tabbit against an isolated project-local mock
profile, on dedicated test ports. No production DSH home, real provider or
user conversation was used.

- Four-member and twelve-member floors render. Twelve members retain twelve
  desks. Glass partitions, detailed furniture, people and original procedural
  textures were inspected in screenshots.
- WASD moves in screen directions; zoom, quarter-turn, overview and follow
  operate. Room-map inspection changes the camera without teleporting people.
- Existing member selection, dialogue and message composer remain reachable.
- Clicked the reading station in the 3D scene, walked between rooms, opened
  the reading panel, sat down, selected a book and changed to page 2 of 3.
- Quiet motion stops decorative movement and still permits walking.
- Closing and reopening removes the old Three canvas and creates exactly one
  new Three canvas. The separate hidden Phaser simulation canvas is intentional.
- Actual workspace width 620px inside a 900px browser uses the compact 176px
  floor map. Team drawer, controls and scene remain accessible; no horizontal
  workspace overflow. Named container queries account for the Harness sidebar.
- Three night/day theme cycles: renderer geometry count stayed at 100 and
  texture count at 13 for each matching daytime sample. Night lighting applied.
  Replaced architecture uses its own disposed geometry/material/texture kit.
- Clicks in blank canvas margins outside the visible 3D viewport do not walk
  toward or interact with offscreen world objects. Labels are clipped too.
- No page errors occurred during the office interaction acceptance runs.

## Performance and scope

Short desktop samples reported about 59–60 FPS, including the twelve-member
floor. This is an observed sample, not a sustained performance guarantee. The
busy floor used roughly 1,200 draw calls; static furniture is batched by
material, while articulated people, transparent partitions and doors remain
independent. Integrated/mobile GPU benchmarking is still outstanding.

Models and textures are original local procedural artwork. Three.js and Phaser
licenses ship in `THIRD-PARTY-NOTICES.txt`. No remote assets or paid generation
service are required. Existing saved appearance traits still control people;
existing pixel portraits remain in conversation cards. The simplified people
and architectural rendering are stylized, not photorealistic scans.

No agent, message, permission, life or world rules were rewritten. There is no
new budget/economy/build editor. DSH Desktop native packaging and production
provider behavior were not exercised; browser integration uses the actual
plugin entry point and generated client. Existing uncommitted work was retained.

Screenshots: [overview](images/office-isometric.png),
[details](images/office-isometric-detail.png),
[compact layout](images/office-isometric-compact.png).

## Local installation artifact

`artifacts/deepseek-office-0.5.0.tgz`: 60 files, 1,649,120 compressed bytes.
The packaged client matches the generated source byte for byte and includes
the Three.js license. No test profile, dependency directory, test script or
environment file is packaged.

SHA-256: `8d845aeadbbc439e515cb389584f3d6ec585db8bce52810685c18254205bce9a`.

Install/update the local archive through the user's normal Harness plugin
installation flow, then reload its interface. The existing production profile
was not changed automatically. A fresh packaged-profile installation was not
repeated; browser acceptance used the same verified generated client bytes.
