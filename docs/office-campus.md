# Office campus

The desktop plugin combines existing Harness conversations with a playable,
Japanese-inspired pixel workplace. Group chats are floors; no groups means no
office entry or scene. All game UI is English. User names and messages retain
their original language.

## Floor rules

- A fixed native art scale and camera zoom apply to every floor. Window size
  and team size change the visible area, never character anatomy or scale.
- Work rooms hold four desks, arranged in two aligned rows. Members five and nine
  add work rooms on the same floor, up to the existing Harness limit of 12. Existing offices remain reachable.
- A reproducible seed derived from the floor identity chooses its facility
  combination, room slots, materials and ordered room slots. Reopening a
  floor does not reshuffle it. Membership changes do not reroll facilities.
- A central circulation spine connects rooms through wide doorways. Room
  walls have physical footprints; doorways have explicit navigation portals.
  Doors open near actors, then close after they leave the threshold.
- Facility templates include cafe, library, arcade, restaurant, bar and gym.
  The generator selects a coherent subset per floor instead of placing every
  facility in one undivided room. Furniture stays on a shared pixel grid.
- Each fixture declares a collision footprint, reachable use point, optional
  sitting pose and activity. The same data drives art, pathfinding and maps.

## Navigation and play

WASD/arrows walk, Shift runs, E interacts. The camera follows the visitor at a
fixed zoom, allowing the room to pan at the viewport edges. A left-side map
shows room names, walls, doors, the visitor, coworkers and the camera area.
Clicking or dragging the map pans the camera; a follow control returns to the
visitor. Moving the visitor also resumes following. Map inspection does not
teleport characters or send chat messages.

Facilities have actual actions: coffee stages, seated reading with page
turns, a scored arcade round, meal preparation, a nonalcoholic drink recipe,
and a short gym exercise. Coworkers reserve use points, navigate between
rooms, take breaks and exchange brief greetings. Real Harness work always
preempts leisure. Scene conversations never call a model or send messages.

## Character and asset library

Character presets combine compatible authored body, head, hair and clothing
layers. The 96 presets use eight hairstyles, four skin palettes, four outfits and two adult body types. Every direction and action uses the same frame registration. New
employee identities select a reproducible preset; this avoids changing their
appearance on reload. AI portraits and outfit palettes remain supported.

Third-party art is pinned and attributed. Custom assets follow a controlled
pipeline: consistent perspective and palette, transparent output, a measured
footprint and foot anchor, matched animation registration, visual review at
the actual game scale, and provenance recorded with the final asset. Runtime
art composition must not stretch heads or cut off legs.

Research references:

- [LPC Revised](https://github.com/ElizaWy/LPC) for compatible authored layers.
- [PixelLab API](https://api.pixellab.ai/v2/docs) for optional online custom
  characters, animation and tilesets; generation requires separate credentials.
- [Pixel Art skill](https://github.com/ervareza/agent-skill-pixel-art) for local
  palette, frame and export validation ideas. It is a small community project,
  not a vetted mandatory dependency.
- [Rooms and mazes](https://journal.stuffwithstuff.com/2014/12/21/rooms-and-mazes/)
  for explicit room connectivity. This plugin uses ordered workplace templates
  and deterministic room graphs instead of an unconstrained dungeon generator.

## Module boundaries

`src/shared/office/world.js` owns deterministic geometry, navigation, room and
fixture data. `src/shared/office/life.js` owns leisure, reservations and scene dialogue.
`src/client/office/renderer.js` owns physics, poses, door and camera behavior;
art modules own textures. `src/client/office/index.js`, activity and map modules own readable
React interfaces. Harness host APIs continue to own real conversations.

Tests cover room connectivity and doors, all supported member counts, stable
generation, layout diversity, furniture clearance, fixed camera scale,
reservations and activity cancellation. Browser acceptance covers map
inspection, returning to follow, room traversal and each facility action.

## Repository hygiene

Keep source, tests, licenses, source manifests, necessary documentation and
the latest install archive. Generated client.js remains a required committed
entry point. Remove mock profiles, copied source trees, research downloads,
temporary screenshots, logs and superseded archives after verification.
Installed development dependencies are reproducible and excluded from Git.

## Scope and extension points

This is the playable campus foundation, not a finished economy or management
campaign. There is no budget, construction editor, research tree, job queue,
multiplayer synchronization of visitor positions or paid asset-service account.
Room geometry is deterministic from the group identity. Human actors select
stable authored presets; the existing text-model generator saves a portrait
and outfit palette, not a newly animated sprite sheet.

The built-in game-assets workflow handles native-size footprints, frame
registration and interaction integration. The imagegen workflow creates
custom transparent facility art; the retained [atlas recipe](../ds-bot/src/client/assets/custom/SOURCES.md)
records how to expand it. PixelLab is an optional researched extension for
consistent characters and animation, not an installed runtime dependency.
It requires separate service credentials. Low-adoption community wrappers
were not installed automatically.

The interface uses a 12/14/18/24px system-font hierarchy and aligned paper/sage
panels. World textures use nearest-neighbor sampling. Names and short speech
stay at a fixed screen size. Dialogue reserves bottom camera space; activity
panels reserve the right, and the map reserves the left. Closing a panel
returns keyboard focus to the scene. Travel deadlines include route length
at the actual coworker speed so distant rooms remain usable.
