# Office RPG implementation plan

**Goal:** Turn the group office into an English, playable, Japanese-inspired pixel RPG with directional animation and deliberate interactions.

**Architecture:** Keep the public Harness APIs, group lifecycle and chat actions. Replace the lazy Pixi renderer with a lazy Phaser 4.2.1 scene. Pure world geometry supplies both pathfinding and physics colliders; React supplies accessible HUD and dialogue controls.

**Tech stack:** Phaser Arcade Physics, React, esbuild, CC0 Ninja Adventure art by Pixel-Boy / Sparklin Labs (pinned original GitHub release).

**Spec:** User requests dated 2026-10-17 supersede the previous prototype's visual direction and authorize licensed open-source assets. No Pokemon artwork is used.

**Current target:** Desktop keyboard and mouse. The user explicitly deferred phone adaptation on 2026-10-17; laptop and desktop layouts are the acceptance target.

## Implementation

- [x] Vendor a small, version-pinned CC0 asset subset with original license and source manifest; inspect actual sprite frames.
- [x] Implement world layout, obstacle-aware paths and proximity interactions with focused tests (all member counts from 0 through 12, inaccessible targets and exact collision contacts).
- [x] Replace rendering with Phaser: 60 Hz physics, four-direction animation, foot colliders, camera follow, pointer paths, keyboard run, NPC routines, interactive tea area and lift. Pause ambient effects in quiet mode.
- [x] Replace dashboard composition with game viewport and English HUD, optional team drawer, proximity dialogue and accessible desktop controls.
- [x] Preserve saved AI portraits; use their palettes to customize directional characters and clearly describe this customization.
- [ ] Validate unit tests, deterministic build, lint and actual Harness browser use; inspect screenshots and exercise movement/collisions/interactions/resizing/cleanup. Package and document the result.

Functional checks and packaging are complete. Foreground performance acceptance
remains open: both the office and ordinary chat are limited to approximately
one animation frame per second in the current browser test environment. See
[verification evidence](2026-10-17-office-rpg-verification.md).

## Review focus

- Engine initialization stays lazy when there are no group chats.
- Cancelled mounting and scene changes clean up canvas, listeners, timers and textures.
- A path cannot cross furniture, and interactions cannot activate through distant walls.
- Streaming work updates do not reset a character's position or restart the game.
- Chat text entry must never move the player; pointer and keyboard input remain usable at laptop and desktop widths.
- All game artwork is bundled locally; no runtime CDN or third-party network requests.
