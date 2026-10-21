# Modern isometric office

## Brief and chosen direction

The owner requested a detailed, playable 2.5D office, explicitly selecting a
realistic modern office building. Preserve the existing Harness integration,
messages, permissions, coworker life, facility activities and collision data.
This is a presentation redesign of the existing game, not an economy rewrite.

## Design

Use an orthographic Three.js architectural model above the existing Phaser
simulation. World coordinates, physics bodies and interaction stations remain
authoritative. Three.js meshes use those same footprints and actor positions.
The Phaser canvas remains the input/physics surface; its drawing is hidden.
There is one simulation clock, no second actor simulation or animation loop.

Godot export would introduce a second runtime and a WebAssembly payload; the
browser-native view integrates directly with the existing plugin. Neither a
Godot install nor Blender is required on the end user's computer. Geometry is
original, procedural and local; no external models, textures or services.

Visual vocabulary: architectural cutaway, warm oak, acoustic carpet, concrete,
clear glass, steel, detailed desks, swivel chairs, monitor interfaces, plants,
books, cafe equipment and overhead linear lights. People have articulated
limbs, distinct hair/outfits, seated poses and walking animation. Light tracks
the existing local-time model. Interior-facing walls stay low for readability.

Palette: chalk #f4f5f3, graphite #26343f, architectural blue #346c94,
oak #b99970, muted foliage #688373, concrete #c5cdce. Segoe UI / system sans
for readable controls. The model is the focal point; a restrained floor
directory, compact status header and floating camera tools surround it.

The owner-approved [compact HUD](2026-10-20-office-hud.md) consolidates that
navigation in the top-right corner, with room directories opened on demand.

Click-to-walk and E interaction use raycasting into the same world. WASD is
relative to the screen. Provide zoom, quarter-turn, overview and follow.
Map inspection does not move people. Existing conversation/activities retain
their contracts and keyboard focus behavior. Small screens use a compact map.

## Implementation plan

1. Add and test pure isometric projection and screen-relative movement math.
2. Add original geometry helpers, furniture/room model and articulated people.
3. Add the orthographic view: lights/shadows, picking, camera, disposal and
   per-frame synchronization. Connect it to existing renderer and DOM labels.
4. Replace parchment presentation with architectural HUD; add camera controls.
5. Build generated client, run full tests, stale-build check and lint. Exercise
   an isolated mock profile in the browser: walking, map, team, facilities,
   quiet motion, zoom/rotation, narrow viewport and reopen. Save visual evidence.

## Constraints and review focus

- English product UI; keep user-provided names/messages untouched.
- No changes to Harness, host APIs, shared life/world geometry or user DSH data.
- Existing uncommitted changes belong to the user. Work in place; do not reset,
  overwrite the tree from Git, commit their work, or create an unrelated branch.
- Dispose geometry, materials, textures, listeners and the WebGL context when
  the scene is destroyed. Per the owner's 2026-10-20 request, returning to chat
  only hides the office; it retains its simulation and resumes the last floor.
- Picking remains correct after rotation, resize and zoom; movement must keep
  its speed and collision boundaries; quiet motion still permits walking.
- Include Three.js license; no CDN or paid asset dependency at runtime.
- Do not interpret this visual upgrade as implementation of a management economy.

## Execution record

- Read the current office-campus design and repository rules. Existing changes
  include the newer character/lighting pipeline and must be preserved.
- The referenced chat preview omits its technical answer and no chat-reading
  tool is exposed here. Decisions are grounded in the current repository and
  the owner's explicit permission to choose the implementation.
- UI design search returned generic dashboard guidance, and the focused game
  query had no match. The architectural visual system above is original to
  this brief; only general accessibility/interaction guidance is reused.
- Completed the projection, models, view adapter, HUD and browser acceptance.
  All 714 tests and the generated-build check pass; lint has no new warnings.
- Independent code review identified corridor-wall ownership, replaced texture
  disposal, off-viewport picking/labels and floor/accent theme preservation.
  Fixed all four. New lifecycle/input regression tests and repeated real UI
  theme changes verify the fixes. Geometry/texture counts remain stable.
- Responsive rules use the office container width, because the Harness sidebar
  makes the game narrower than the browser viewport. Verified a 620px game pane.
- Working-tree changes remain uncommitted; no user's existing modifications
  were reverted or committed. The 0.5.0 local install archive is the deliverable.
