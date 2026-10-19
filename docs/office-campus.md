# Office campus

The desktop plugin combines existing Harness conversations with a playable,
modern isometric workplace. Group chats are floors; no groups means no
office entry or scene. All game UI is English. User names and messages retain
their original language.

## Current 2.5D presentation

Version 0.5.0 presents this same campus as an orthographic architectural model.
Three.js draws original furniture, people, cutaway glass partitions and surfaces;
Phaser retains authoritative collision, navigation, coworker life and activities.
The user can zoom, rotate, inspect the entire floor or return to follow. WASD is
screen-relative. Pointer picking, the map and labels use the same projection.
The modern HUD adapts to the plugin's container width, including when the Harness
sidebar remains open. See [the design](plans/2026-10-19-isometric-office.md).

The floor dimensions below remain logical world units. Earlier pixel art modules
are retained for source provenance, portraits and the hidden simulation. Their
native 3x camera and parchment presentation no longer describe the visible game.

## Floor rules

- Logical world geometry remains unchanged across floors. Orthographic zoom
  changes display scale without altering character proportions or collisions.
- Each room is 320 × 256 native pixels (20 × 16 tiles) with 16px walls. A
  typical plugin viewport shows almost a whole room, so desks, windows,
  furniture and people read as one composition instead of a corridor slice.
- Work rooms hold four desks, arranged in two aligned rows. Members five and nine
  add work rooms on the same floor, up to the existing Harness limit of 12.
- A reproducible seed derived from the floor identity chooses its facility
  combination, room slots, materials and ordered room slots. Reopening a
  floor does not reshuffle it. Membership changes do not reroll facilities.
- A central circulation spine connects rooms through wide doorways. Room
  walls have physical footprints; doorways have explicit navigation portals.
  Doors open near actors, then close after they leave the threshold.
- Empty room slots become small courtyard gardens with a stone path, pond,
  flower border, lanterns and night fireflies. The floor never opens onto an
  unlit void.
- Facility templates include cafe, library, arcade, restaurant, bar and gym.
  The generator selects a coherent subset per floor. Furniture stays on a
  shared pixel grid and every fixture declares its collision footprint,
  reachable use point, optional sitting pose and activity. The same data drives
  art, pathfinding and maps.

## Navigation and play

WASD/arrows walk, Shift runs, E interacts. The camera follows the visitor at a
user-adjustable zoom and opens on the team's own work room. A left floor map shows
room names, walls, doors, the visitor, coworkers and the camera area. Clicking or
dragging the map pans the camera; a follow control returns to the visitor. Map
inspection does not teleport characters or send chat messages.

Facilities have actual actions: coffee stages, seated reading with page turns, a
scored arcade round, meal preparation, a nonalcoholic drink recipe, and a short
gym exercise. Coworkers sit at their desks while real work is active, reserve
use points, navigate between rooms, take breaks and exchange brief greetings.
Real Harness work always preempts leisure. Scene conversations never call a model
or send messages.

The room is baked with soft lighting: sunlight through the windows, warm pools
under lamps, a vignette and time-of-day tint. The tint follows the visitor's
local clock (dawn, morning, midday, afternoon, evening, night), and the game HUD
shows the same clock. Steam, monitor cursor blinks, dust motes and night
fireflies animate at a fixed timestep; Quiet motion pauses all of them.

## Retained pixel character and asset library

Runtime office art is original to this fork. Characters are 16 × 32 chibi
sprites drawn from role layers (outline, skin, hair, shirt, pants, shoes, eyes,
accessories) at one native registration: four directions, four-frame walk
(contact, passing, contact, passing), four-frame idle with a blink, and a seated
pose. Left/right are mirror images. 96 stable presets combine eight hairstyles,
four skin palettes, four outfits and two body types; AI designs select those
authored traits, recolor hair and clothing and add glasses, badges, hair clips
or scarves. AI still saves a 16 × 24 pixel portrait; it does not synthesize a new
animation rig. New employee identities select a reproducible preset so their
appearance does not change on reload.

The art pipeline is procedural and data-driven:

- `client/office/pixel.js` owns the palette, color mixing, dithering and pixel
  surfaces.
- `client/office/chibi.js` draws characters from deterministic pixel roles and
  caches one sheet per appearance.
- `client/office/furniture.js` draws every fixture, prop and wall object to its
  declared footprint, with a shadow and a draw depth.
- `client/office/room-art.js` composes floors, wallpaper, wainscot, windows,
  rugs, wall decor, courtyards and baked lighting at native resolution.
- `shared/office/lighting.js` is a pure local-time lighting model; `shared/office/camera.js`
  fixes the zoom; `shared/office/world.js` owns geometry, navigation and room data.

Third-party art remains pinned and attributed. The earlier LPC Revised library
and the generated campus atlas are retained in `src/client/assets/` as reference
material and source records; the running scene no longer samples them. Momo the
dog still uses the CC0 Ninja Adventure sprite. New files follow a controlled
pipeline: native footprint, transparent output, measured foot anchor, matched
frame registration, review at the actual game scale and recorded provenance.

## Research references

- [Stardew Valley modding: Farmer sprite](https://stardewvalleywiki.com/Modding:Farmer_sprite)
  documents the 16 × 32, four-direction, layered farmer registration with
  mirrored left/right frames and a contact/passing walk cycle. The chibi
  registration follows those constraints without copying any sprite.
- [Modding: Editing XNB files](https://stardewvalleywiki.com/Modding:Editing_XNB_files)
  establishes the 16 × 16 tile convention for this genre.
- [SLYNYRD — Pixelblog 35: Top Down Interiors](https://raymond-schlitter.squarespace.com/blog/2021/11/30/pixelblog-35-top-down-interiors)
  for 16px interior tiles, wall frames, rugs and tile-aligned furniture.
- [Phaser 4 Pixel Art Guide](https://phaser.io/news/2024/10/phaser-4-pixel-art-guide)
  for integer zoom, rounding and nearest-neighbour rendering; the bundled copy
  ships with the Phaser dependency used by the plugin.
- [Game Dev Agentic Skills](https://github.com/thedivergentai/Game-Dev-Agentic-Skills)
  for the discovery / ingestion / application methodology, visual review and
  performance budgets. It is a Godot/Bevy skill library and is not installed here.
- [Pixel art creator](https://github.com/willibrandon/pixel-plugin) and
  [Aseprite AI artist](https://github.com/with-pebbly/aseprite-ai-artist) are
  Aseprite-based agent workflows. Aseprite and Godot are not installed in this
  project, so the procedural canvas pipeline above is used instead; it also
  keeps the plugin free of a large WebAssembly engine download.
- [LPC Revised](https://github.com/ElizaWy/LPC) (previous character library,
  retained reference) and [Ninja Adventure](https://github.com/sparklinlabs/superpowers-asset-packs)
  (CC0 dog sprite).
- [PixelLab API](https://api.pixellab.ai/v2/docs) remains an optional researched
  online service for custom characters and animation; it needs separate
  credentials and is not a runtime dependency.

## Module boundaries

`src/shared/office/world.js` owns deterministic geometry, navigation, room and
fixture data. `src/shared/office/life.js` owns leisure, reservations and scene
dialogue. `src/shared/office/lighting.js` owns the local-time light model and
camera math lives in `src/shared/office/camera.js`. `src/client/office/renderer.js`
owns physics, poses, doors, effects and camera behavior; the art modules own
textures. `src/client/office/index.js`, activity and map modules own the readable
React game interface. Harness host APIs continue to own real conversations.

Tests cover room connectivity and doors, all supported member counts, stable
generation, layout diversity, furniture clearance, fixed camera scale, the chibi
frame registration, reservations, activity cancellation and the lighting clock.
Browser acceptance covers map inspection, returning to follow, room traversal,
each facility action, the dialogue panel and the lobby directory.

## Repository hygiene

Keep source, tests, licenses, source manifests, necessary documentation and the
latest install archive. Generated client.js remains a required committed entry
point. Remove temporary screenshot harnesses, mock profiles, copied source trees,
research downloads, temporary screenshots and logs after verification. Installed
development dependencies are reproducible and excluded from Git.

## Scope and extension points

This is the playable campus foundation, not a finished economy or management
campaign. There is no budget, construction editor, research tree, job queue,
multiplayer synchronization of visitor positions or paid asset-service account.
Room geometry is deterministic from the group identity. Human actors select
stable authored presets; the text-model generator saves a portrait and a
bounded full-body trait design. It does not synthesize a new animation rig;
compatible authored chibi animation supplies the motion.

The procedural art pipeline handles native-size footprints, frame registration
and interaction integration. The retained [atlas recipe](../ds-bot/src/client/assets/custom/SOURCES.md)
records the earlier generated-atlas workflow. PixelLab is an optional researched
extension, not an installed runtime dependency. Background music and ambient
audio are not included in this build.

The interface now uses a restrained architectural HUD with a floor directory,
camera controls, readable conversation panels and fixed-screen-size name labels.
The 3D view uses antialiasing; retained portraits keep nearest-neighbour sampling.
Dialogue reserves bottom camera space; activity panels reserve the right, and the
map reserves the left. Closing a panel returns keyboard focus to the scene.
Travel deadlines include route length at the actual coworker speed so distant
rooms remain usable.
