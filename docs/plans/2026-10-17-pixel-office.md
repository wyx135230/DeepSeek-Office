# DeepSeek Office: a living pixel workplace

The user's fork keeps DS Bot's conversations and adds an optional, Japanese-inspired
pixel office. A group is an office; its members own desks; several groups form a
building. Without any group there is no office entry, scene, renderer or AI request.

## Experience

- Keep direct chats, group relays, permissions, memory and model selection intact.
- Add a building entry to the sidebar only when groups exist. The lobby lists each
  group's purpose, members and current work. Floors follow creation order, not recent
  message order. Creating a group opens its office after normal chat setup.
- Use an original 2D pixel diorama: shoji windows, light wood, plants, tea corner,
  bookshelves, desks and a wandering cat. A desk appears for each existing member.
- Render true activity from the existing state poll: thinking, typing, reading,
  speaking, waiting for a person, working elsewhere and idle. Idle motions (tea,
  stretching, strolling) are decorative and never presented as completed work.
- Let the user walk by keyboard or click, inspect a character, greet it, open its
  private chat, mention it in the group, send a group message, or return to chat.
- Generate a persistent pixel character with the Bot's configured text model, using
  bounded palette/pixel data rather than arbitrary code or external image URLs.
  Generate missing appearances on office entry once; permit regeneration with a
  prompt. A deterministic original character remains usable on missing models,
  invalid output or failure. Report failures and allow retry without retry loops.
- Start every office with a Japanese preset. Allow explicit, model-assisted theme
  customization using validated colors and day/night atmosphere; save per room.
- Support keyboard navigation, reduced motion, mobile layout, hidden tabs and cleanup.

## Integration

Use existing DSH plugin APIs only. The renderer is PixiJS v8, bundled locally and
created lazily when an office opens. Pure shared helpers derive building/layout and
validate AI output. A host office module stores appearances on Bots and themes on
rooms using the existing atomic team save. Add channel endpoints for generation and
theme updates. Use the ordinary send endpoint for every office conversation.

Use the display name DeepSeek Office and a distinct package identity for this fork;
retain internal compatibility keys and the team state format. Do not automatically
replace a user's installed original plugin or touch their DSH data. The two variants
are alternatives, not simultaneously mounted team shells. Provide a local tarball.

## Art and references

All art and implementation are original. Studied the public descriptions of
[Pixel Agents](https://github.com/pixel-agents-hq/pixel-agents) (activity-to-animation,
clickable coworkers) and [Star Office UI](https://github.com/ringhyacinth/Star-Office-UI)
(cozy state visualization). Do not copy their code, characters or furniture.

## Implementation and verification

1. Test and implement pure building, activity, layout, sprite and theme helpers.
2. Test and implement persistent, cancellable, deduplicated AI generation through
   DSH's LLM stream. Respect read-only state and concurrent member removal.
3. Build original pixel art and a Pixi renderer; handle resize, visibility and disposal.
4. Integrate the lobby, office overlay, character interactions and group entry points.
5. Build generated client, run unit tests, lint and stale-bundle check; run mock DSH
   smoke tests plus browser interaction and screenshots using isolated test data.
6. Package the plugin and document local install, AI usage and the upstream source.

The source archive was retrieved from wyx135230/DeepSeek-Office main, commit
939a6635830cb5b246e7dd19c67b0e1352ad1c07, after Git transport reset. A local baseline
commit preserves the original source for reviewing the feature diff. This fork has
only a main branch, so feature work starts from that downloaded main snapshot.
