# Office overview and detail verification — 0.2.1

The desktop office now fits the complete room between the measured top and
bottom HUD bars. It uses quarter-step zoom up to 3× and centers the scene with
no player following. If fitting would reduce a 16-pixel character below 24
screen pixels, the existing bounded following camera is used instead. Window
and HUD resizing reevaluate the view without restarting the game.

## Evidence

- 666 unit tests passed, zero failures. Three new camera tests cover ordinary
  offices at three desktop sizes, large-room fallback and expansion, and taller
  HUD content. Existing collision/navigation tests still pass.
- The generated-client check passed. Lint has zero errors and the 13 existing
  upstream warnings. The source diff has no whitespace errors.
- In the real isolated Harness web profile, the 3-person office is entirely
  visible at 1366×768, 1440×960 and 1920×1080, using 1.75×, 2.25× and 2.75×
  zoom respectively. Camera inverse transforms confirm that all four room
  edges are inside the viewport, which sits between the HUD bars.
- Native keyboard movement changes the player's position while the overview
  camera's scroll remains fixed.
- A 12-person office uses 2× following at 1366×768. Running along the left
  aisle moves the camera scroll from y=46.043 to y=44.429; the player reaches
  approximately (158.8, 321.7). Enlarging to 1920×1080 switches the same room
  to a 1.75× overview with all 480 art pixels of room height visible.
- A native pointer click, calculated using the offset camera viewport, moves
  the player to the intended ordinary-office ground point.
- Both focused desktop browser runs completed with no page errors. An earlier
  follow check correctly stopped at the meeting table; its revised route uses
  the open aisle. Another observation was interrupted when rebuilding the
  development client, so the final run used the unchanged final build.
- Independent review found no P1/P2 issues in viewport transforms, camera
  bounds/following, HUD resizing, cleanup or unchanged collision geometry.

## Scene detail

New original decorations include shoji-grid light on the floor, wall lamps and
a noticeboard, window plants, reading lamps, mugs, notebooks, pencils and desk
notes, tea trays and snacks, bookshelf ledges, tatami cushions, Momo's woven
bed and water dish, entrance slippers, bamboo, a stone lantern, garden flowers
and stepping stones. These details preserve the existing walking geometry.
Drifting petals, a wind chime, tea steam and monitor cursors use a small set of
Phaser tweens; Quiet motion pauses them together with NPC wandering.

The final distributable is `artifacts/deepseek-office-0.2.1.tgz` (915,993 bytes),
SHA-256 `c1055ca1cc5f8cb0cef961786915de0a1fbaa47ee4902946a1f146636f6aa56e`.
Its client matches the final source build and the test installation. All
required licenses are present; test profiles and conversations are excluded.

These checks establish camera/layout behavior and interactions. The previous
[foreground performance limitation](2026-10-17-office-rpg-verification.md)
remains open; this change does not claim a measured production frame rate.
