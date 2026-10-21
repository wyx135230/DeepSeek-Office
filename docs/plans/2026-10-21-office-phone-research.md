# Office phone — research & design brief

- Date: 2026-10-21
- Status: research only, no implementation decided here
- Scope: player pulls out a smartphone; screen panel bottom-right; character holds the phone; WeChat-like chat app listing all group chats and all agents; full native DSH conversation features; English UI copy.
- Related: [office HUD](2026-10-20-office-hud.md), [visual novel dialogue](2026-10-20-visual-novel-dialogue.md), [office conversations](2026-10-20-office-conversations.md)
- Everything below is original analysis. No external icon, logo, asset or copy is to be imported into the repo. WeChat is a reference for structure and usability behaviour only; the product must not read as a WeChat clone.

---

## 0. TL;DR — the decisions I would make

| Topic | Recommendation |
|---|---|
| Model | Hybrid: diegetic prop in the character's right hand (3D) + a phone-sized DOM "screen" panel in the bottom-right (not full-screen). |
| Panel size | `--phone-h: clamp(480px, calc(100cqh - 56px), 720px)`, aspect 2.05 → **≈340×720** at a 960px pane; screen inside bezel **320×700**. |
| Anchor | `right: max(20px, safe-area)`, `bottom: max(20px, safe-area+12px)`; same 20px edge as the HUD. |
| HUD conflict | 260px HUD + 340px phone = 600px of a ~1000px pane. Below **1180px** pane width: dim + `inert` the HUD while the phone is open. At **≥1180px**: slide the HUD left by `phoneW + 16` (220ms). |
| Dialogue conflict | Opening the phone **suspends** the face-to-face visual-novel panel (collapse, keep draft, unmount its composer). Only one composer may exist at a time — this is already a project invariant. |
| Camera tools | Hidden while the phone is open (they sit at right:24/bottom:24). |
| Camera | If the player is in the right 42% of the frame, ease the camera target ~120px left over 220ms so the prop animation is visible. |
| Tabs | 3: **Chats / Contacts / You**. (WeChat's 4th "Discover" tab has no analogue in our data.) |
| Rows | 64px rows, 40px rounded-square avatar (r8), 14px name, 12px preview, 10.5px time, 18px badge. |
| Chat detail | Custom bubble transcript projected from the same message model the VN panel already uses; **native composer kept** via the existing `conversation.content` Factory + `views` override (proven pattern in `novel.js`). |
| Motion | Arm raise 0–90ms, panel 60–260ms (`cubic-bezier(.2,.7,.2,1)`), close 180ms. Reduced motion: opacity only, 120ms. |
| Input | Movement is already focus-gated on the scene element (`renderer.js:383`), so typing in the phone cannot move the player — but we must move focus and push an Escape layer deliberately. |
| Narrow | Container < 760px wide or < 640px tall → "sheet mode": no bezel, phone fills the pane, HUD hidden. Min usable screen width 300px. |
| Keybind | **P** toggles the phone; **Esc** closes one layer at a time (picker → detail → phone). |

---

## 1. WeChat mobile app anatomy (current 2024–2026)

> Confidence note. WeChat publishes **no** general app UI spec. The only official numbers are the Mini Program design guide and Tencent's WeUI component library, which are close to but not identical to the WeChat app itself. Values marked **≈** are measured/teardown values and should be treated as targets. Everything from WeUI is exact and citable.

### 1.1 Global structure

- Four bottom tabs: **Chats / Contacts / Discover / Me** (微信 / 通讯录 / 发现 / 我). The official Mini Program guide allows 2–5 tabs, and recommends ≤4 to keep tap targets comfortable ([design guide](https://developers.weixin.qq.com/miniprogram/design/), [app.json tabBar](https://developers.weixin.qq.com/miniprogram/dev/reference/configuration/app.html#tabBar)).
- Tab bar: iOS native tab bar is 49pt + 34pt home-indicator inset; WeUI's tab-bar variable is **60px** ([`weui-tab.less`](https://api.github.com/repos/Tencent/weui/contents/src/style/base/variable/weui-tab.less)). Icon artwork is authored at **81×81px** and displayed at ≈27px; labels ≈10–11pt. Active label/icon uses brand green; inactive uses grey.
- Unread badge on the tab: a red dot or a number, same red as list badges.
- Navigation bar: WeUI nav bar is **56px** ([`weui-tab.less`](https://api.github.com/repos/Tencent/weui/contents/src/style/base/variable/weui-tab.less)); the WeChat app uses ≈44pt nav + status bar. Title 17px semibold, centered; back chevron left; 1–2 actions right. Group titles carry the member count: `Group Name (5)`.
- Red-dot rules: badges are **unread counts**, not read receipts. WeChat famously has **no read receipts at all** and has committed to never adding them; "对方正在输入…" is a limited presence signal, shown in 1:1 only when (a) you send a message and the other side opens the thread **within 10 seconds** and (b) they actually type (even a space) ([IT之家, 2026-03-26](https://www.ithome.com/0/932/783.htm)). This is a design decision worth stealing: presence, not surveillance.
- Muted conversations still show unread state; the exact dot-vs-number rule has changed across versions, so do not depend on it. Muted chats are silent (no sound/vibration) and show a mute glyph.
- Current-version drift (all verified in 2025–2026 reporting): 8.0.62 (2025-08) re-balanced information hierarchy — primary headings bold, secondary headings grey, placeholder-style text where a value is unset ([uisdc](https://www.uisdc.com/wechat-2)). 8.0.79 (2026-09) changed the photo/video picker from a full-screen dark page to a **half-screen light sheet** that slides up over the chat, reworked contacts search into "search contacts" with filters (permission, source, add time, last chat, tag), and merged several contacts entries ([IT之家](https://m.ithome.com/html/1008902.htm)). Lesson for us: **half-sheets over a live chat beat full-screen takeovers**.

### 1.2 Chats list

- Page background `#EDEDED`; rows are white cells with 0.5px separators `rgba(0,0,0,.1)` inset to align with the text column (WeUI cell spec: 16px padding, 56px min cell, 17px font, line-height 1.4118, [`weui-cell.less`](https://api.github.com/repos/Tencent/weui/contents/src/style/base/variable/weui-cell.less)). WeChat's own rows are ≈64pt because of the 40pt avatar.
- Row anatomy: avatar (≈40pt, **rounded square**, r≈4 — not a circle) · name (17pt, primary `rgba(0,0,0,.9)`) · preview (14pt, secondary `rgba(0,0,0,.55)`), carrying an `[有人@我]`-style mention marker when relevant (exact wording varies by version) · time (≈12pt, right, top-aligned) · unread badge (red circle `#FA5151`, white number, min ≈18pt, 99+ cap) · mute glyph at the end of the preview line when muted.
- Pinned chats: sorted to the top and given a **grey background** (`#EDEDED`-ish) so the block reads as one unit; separators continue through it.
- Preview content: plain text strip of the last message, `[图片]` / `[语音]` / `[文件]` placeholders for media, sender name prefix in groups.
- Row tap: push a chat detail screen (iOS slide-in). Long-press: mark unread / mute / pin / delete. Swipe: reveal actions — WeUI's swipe cell uses `#EDEDED` default and `#FA5151` destructive.
- Top of list: search field, and a **+** in the nav bar that opens New Chat / Add Contacts / Scan / Pay. For us the "+" analogue is "New chat".

### 1.3 Chat detail

- Nav: back chevron · title (private: name; group: name + `(n)`) · **…** menu (chat info, search in chat, mute, pin, background, clear history).
- Message area background `#EDEDED`. **Mine: right, light-green bubble `#95EC69`** (WeUI `--weui-LIGHTGREEN`), text `rgba(0,0,0,.9)`. **Theirs: left, white bubble**, same text colour. Bubbles ≈8px radius with a small tail, padding ≈10×12, max width ≈70% of the screen. Consecutive messages from one sender group into a run.
- Group messages add a 12pt grey sender name above the bubble and a 40pt avatar beside it.
- Timestamps: centered grey 12pt separators inserted when the gap between messages exceeds ~5 minutes, plus relative labels (Today/Yesterday/date).
- System notices: centered 12pt grey text on a translucent grey pill (`rgba(0,0,0,.05)`): "you added X", "X recalled a message", "X joined the group".
- @mentions: rendered as a highlighted run inside the bubble; the list preview gets a mention prefix.
- Reply quotes: a grey quote block on top of the bubble with the quoted sender + first line.
- Read receipts: **none**. Only 1:1 typing presence (conditions above). Group chats show no typing indicator.
- Input bar: bottom, white, top hairline, min ≈44–48pt, grows to ≈5 lines. Left: voice/keyboard toggle. Middle: white rounded input. Right: emoji, then **+**; the **Send** button only appears once there is text (green, r≈4, ≈56–64pt wide). Voice mode replaces the field with a "hold to talk" bar; the plus panel is a 2×4 grid (photos, camera, call, location, red packet, transfer, voice-input, favourites). Keyboard opens → transcript scrolls to bottom, input bar rides above the keyboard.
- Media ask (8.0.79): picker is now a half-sheet that keeps the chat visible behind it ([IT之家](https://m.ithome.com/html/1008902.htm)) — copy this for attachments.

### 1.4 Contacts

- Vertical list with an **A–Z index rail** on the right (plus `#`); section headers are grey 14px bars.
- Top entries: New Friends, **Group Chats** (a single entry that opens the list of groups), Tags & Permissions (merged in 8.0.79), Official Accounts / Service Accounts / Enterprise (merged in 8.0.79).
- Friend row: 40pt avatar, 17pt name, optional status/description line.
- Search: 8.0.79 made contacts search filter-based (permission, source, add time, last chat time, tag) — powerful, and **out of scope for v1** in our phone.
- Add friend: separate flow (search ID/phone, scan, from group). We do not need "add friend": the roster is the friend list.

### 1.5 Design tokens (exact where official)

| Token | Value | Source |
|---|---|---|
| Brand green | `#07C160` (`-80 #059A4C`, `-90 #06AE56`) | WeUI CSS v2.6.24 |
| My bubble | `#95EC69` (`--weui-LIGHTGREEN`) | WeUI CSS |
| Page background | `#EDEDED` (`--weui-BG-0`); `#F7F7F7` (`BG-1`); white `BG-2` | WeUI CSS |
| Primary text | `rgba(0,0,0,.9)`; secondary `.55`; tertiary `.3`; hairline `.1` | WeUI CSS |
| Badge red | `#FA5151`; orange-red `#FF6146`; orange `#FA9D3B`; link blue `#576B95` | WeUI CSS |
| Dark mode | `#111` / `#1E1E1E` / `#191919` / `#2C2C2C` | WeUI CSS |
| Cell | min 56px, 16px padding, 17px, radius 0, separator 0.5px | `weui-cell.less` |
| Nav / tab bar | 56px / 60px | `weui-tab.less` |
| Type scale | 22 / 17 / 15 / 14 / 12 pt (WeChat app), base width 375 or 390 | [design guide](https://developers.weixin.qq.com/miniprogram/design/) |
| Tap target | 7–9 mm | [design guide](https://developers.weixin.qq.com/miniprogram/design/) |
| Tab bars | 2–5 tabs; icon art 81×81px | [app.json tabBar](https://developers.weixin.qq.com/miniprogram/dev/reference/configuration/app.html#tabBar) |

**Contrast trap (measured):** white text on `#07C160` is **2.38:1** — it fails WCAG AA for normal text. WeChat gets away with it because the send button's label is short/large-ish, but a phone UI at 320px must not repeat it. Black text on `#95EC69` is **8.8:1**, which is why WeChat's own bubbles are easy to read.

### 1.6 Accessibility and desktop/web differences

- WeChat ships accessibility and elderly-mode guides for mini programs: font-size follows a user setting, targets 7–9mm, layout reflows at larger type ([elderly guide](https://developers.weixin.qq.com/miniprogram/design/elderly.html), [accessibility guide](https://developers.weixin.qq.com/miniprogram/design/accessibility.html)).
- Desktop WeChat is a multi-column app: nav rail (avatar + icons) · conversation list · chat. Windows/Mac windows are resizable with a real minimum width, hover states replace touch affordances, and Enter sends while Shift+Enter breaks the line. The PC adaptation guide explicitly tells developers to translate touch gestures to mouse and to make layouts fluid ([PC adaptation guide](https://developers.weixin.qq.com/miniprogram/design/adapt.html)).
- **Cautionary 2026 story:** WeChat's grey-tested three-column PC layout angered users because "the usable area got much smaller" on small laptops; support said the layout could not be reverted ([sohu](https://www.sohu.com/a/1077410299_120914498)). The lesson transfers directly: our game pane is the narrow laptop, so the phone must **overlay**, never squeeze the scene into a third column.

### 1.7 What we must not copy

The WeChat logo (two speech bubbles), the name "WeChat", the exact `#95EC69`/`#07C160` pair, its icon set, its wordmark, its "发现/我" tab set, or its chat wallpaper. Structure and behaviour (list → detail, bubbles, half-sheets, presence) are fine and generic; the visual identity must be ours.

---

## 2. In-game phone patterns (commercial games)

| Game | Invocation | Placement / scale | Diegetic? | Open/close | Pause policy | Text input | HUD conflict | Lesson |
|---|---|---|---|---|---|---|---|---|
| **GTA V / Online — iFruit** | D-pad up / arrow key; also story-driven calls | Phone model held in hand, screen faces camera in the lower-right third; ≈15–20% of screen height | Yes — real hand prop, first-person view shows the device | Raise-arm animation, ≈250–350ms; phone OS zooms in | World **keeps running** | PC uses the physical keyboard for in-game text entry | Uses the bottom-right corner; weapon/radar HUD stays left | The canonical "phone in the right hand, screen bottom-right". The prop does most of the immersion work ([GTA Wiki iFruit](https://gta.wiki/w/IFruit)). |
| **Cyberpunk 2077** | Phone/messages key; calls arrive as UI | No held device; translucent panel on the left/centre | No (HUD), framed as an implant | Fade/slide in, ~200ms | World continues; player control limited | Replies are canned choices; no free typing | Panel covers the left/centre, never the minimap | Proof that functional phone UI beats physical realism, but also why it feels less "physical" ([IGN: how to call](https://www.ign.com/wikis/cyberpunk-2077/How_to_Call_Someone)). |
| **Persona 5 / Royal** | Contextual (SMS/map prompts) and menu shortcut | Joker **holds the phone**; it **rotates up from the bottom of the screen into portrait** for chat, and into landscape for the map; occupies most of the screen | Yes — the phone is the camera move | Rotation-in ≈300–500ms, very stylised | Player control locked; scene remains behind | Canned dialogue options | Chat is full-screen-ish, so the combat HUD (dense, bottom-right in dungeons) is gone by design | Best-in-class transition: a real object that becomes the UI. Also warns that a dense bottom-right HUD and a bottom-right phone can't coexist ([UI analysis](https://game.3loumao.org/840320216); [P5 menu series](https://indienova.com/indie-game-development/p5-ui-design/)). |
| **Stardew Valley** | Telephone is a furniture item (1.5+) | None — audio only | Yes (diegetic audio) | n/a | World continues | n/a | None | Story can be delivered by a device without spending screen area ([Stardew Wiki: Telephone](https://wiki.stardewvalley.net/mediawiki/index.php?title=Telephone&oldid=126342)). |
| **The Sims 4** | Click Sim → phone pie menu | No screen; Sim holds phone to ear / texts | Yes, prop + animation | Short arm/pose animation | World continues | None (choices only) | None (radial menu is transient) | The "character is holding it" read comes from pose + prop, not from a screen ([Sims 4 Studio thread](https://sims4studio.forums.net/thread/14815/)). |
| **Animal Crossing: NH — NookPhone** | **ZL** | Phone fills most of the screen, centred, with a status bar, wallpaper, and a grid of 12 apps | Yes — the player's own device, with customisable case | Pop-in + slight zoom, ≈200ms; app icons highlight on hover | Player movement locked; island time continues | None | No other HUD while open | The best reference for our **home screen** and app grid; case customisation is a free personalisation hook ([Nookipedia](https://nookipedia.com/wiki/NookPhone)). |
| **Zenless Zone Zero — Inter-Knot** | Menu shortcut / in-world prompts | Floating smartphone UI with app grid and messages; opened while standing in the world | Yes, presented as the Proxy's phone | Slide/scale in | World continues (menu layer) | Free text only in chat-style social features | Opens over the world; HUD yields | Confirms modern gacha players expect a phone-shaped menu, not a settings list ([Inter-Knot](https://zenless-zone-zero.fandom.com/wiki/Inter-Knot)). |
| **Wuthering Waves — WavesLine** | Menu/app | In-game social phone app with feed and messages | Yes | Panel transition | World continues | On-screen keyboard for social | Menu layer | "Phone as community feed" is a different job from 1:1 chat; don't overload our chat list with it ([Game8](https://game8.co/games/Wuthering-Waves/archives/570882)). |
| **Infinity Nikki — Pear-Pal** | Menu button | Phone-like device that hosts the whole menu (map, quests, wardrobe…) | Yes | Panel transition | World continues | Minimal | Menu layer | A phone can be the **whole** menu. For us that is a scope trap: keep the phone to chat + 3 shortcuts ([IGN video](https://www.ign.com/videos/infinity-nikki-what-do-all-the-menu-options-mean-pear-pal-explained)). |
| **Watch Dogs** | Hold/tap phone key | Aiden holds the phone up; the Profiler overlay reads as the phone's camera | Yes — the phone is the weapon | Raise animation + UI bloom | World continues, real-time | None for profiling | Overlay is the main HUD | The prop and the UI are one system; if we animate the arm, the screen must feel attached to it ([Gamer Guides: profiling](https://www.gamerguides.com/watch-dogs/guide/gameplay/game-features/profiling-hacking)). |
| **Life is Strange** | Contextual prompts | SMS threads as a small overlay panel (upper area), phone in hand in some shots | Partly | Quick fade | Reading pauses player movement | Replies are choices | Avoids the bottom-right | Even a small, quiet phone panel reads as a phone if the typography mimics SMS ([LiS wiki: texting](https://life-is-strange.fandom.com/wiki/Texting)). |
| **Firewatch** | n/a (walkie-talkie) | Dialogue choices sit in the **bottom-right** of the screen | Diegetic radio + HUD choices | Instant | World continues | None | Occupies our chosen corner | Our phone and our dialogue choices compete for the same corner: never show both ([dialogue analysis](https://core.ac.uk/download/232614196.pdf)). |

### 2.1 Cross-game lessons

1. **Bottom-right is the phone corner** because the right hand is there (GTA, P5, Watch Dogs). It is also where dense HUDs live (P5 dungeons, our camera tools) — so the phone must make the HUD yield, not coexist.
2. **Two viable models, and the hybrid wins.** Model A: prop + prop-scale screen (GTA, P5, Watch Dogs) — high presence, needs arm animation. Model B: full-screen app (ACNH, ZZZ, Nikki) — high readability, low presence. Do A's staging with B's legibility.
3. **Phone UIs do not pause the world.** They lock player input and dim/hide HUD. Our office already keeps simulating when hidden, so "world keeps living while you text" is both cheap and correct.
4. **Console games avoid keyboards** by using canned replies; PC/social games use the real keyboard. Our users are on desktop web with a real composer — we should behave like desktop WeChat, not like a console game.
5. **Openings are 200–500ms.** P5's rotate-in is the most expressive; GTA's raise is the most grounded. 180–260ms is the sweet spot for a web game that must stay responsive.
6. **Readability beats realism.** Text below ~13px, low-contrast bubbles, or a phone scaled to the character (too small to read) all fail. The screen must be a fixed UI size independent of camera zoom.
7. **The prop sells the fiction, the panel does the work.** If the panel and the hand are not coordinated (arm raised but no panel, or panel with no arm), the illusion breaks.

---

## 3. Recommendations for DS Office

### 3.1 Constraints from our own code (measured)

- Scene: Three.js orthographic canvas at z0, Phaser canvas hidden, DOM HUD above; all React.
- Right-top HUD: `--of-hud-width: 260px`, `--of-hud-edge: 20px` (narrow: 228/12), `z-index 8`, `max-height: calc(100% - 40px)` — it is a **vertical column on the right**, not just a corner card (`hud-styles.js:3-4`, `modern-styles.js:3`).
- Face-to-face panel: `height: 286px`, `width: min(1050px, 100% - 48px)`, `bottom: 22px`, centred (`novel.js:166`), with the native composer on its right; `z-index` ~18. Older standalone dialogue: 760px wide, bottom 86px, `max-height: calc(100% - 200px)`.
- Bottom hint bar: `bottom: 14px`, min-height 48px. Camera tools: `right: 24px; bottom: 24px`, 38px buttons.
- Movement: `document.activeElement === element` gate (`renderer.js:383`) — **typing outside the scene element already cannot move the player**. Keydown is attached to the scene element (`renderer.js:624`).
- Escape: a single stack, newest layer wins (`overlay-hooks.js:8-22`).
- Composer: rendered by the native `conversation.content` Factory; the VN panel **keeps that Factory as the only input** and overrides only the message view via `views` (`2026-10-20-visual-novel-dialogue.md:16-19`). Only one chat input area is mounted at a time (`2026-10-20-office-conversations.md:13`). It is same-DOM React — no iframe — so the phone can style it directly; the risk is desktop layout assumptions, not cross-document boundaries.
- Container queries: `container-type: inline-size; container-name: office` with breakpoints at 1100 / 760 / 420 (`modern-styles.js`). Use the same container, not the browser viewport.
- The HUD already has a compact mode driven by the office container (`index.js:189-201`: width ≤760 or height ≤650) and an auto-compact flag that turns on for member/meeting/board/interaction/editing (`index.js:256`). Drawers are 320px wide (`--of-hud-width` + edge + 12) at z24 and overlay the HUD in compact mode. **Add `phoneOpen` to the auto-compact condition and close any open drawer before the phone opens** — the project already treats drawers as mutually exclusive.

**Consequence:** at a 1000px-wide pane, HUD column (260 + 20 edge) + a 340px phone = 600px gone. The phone cannot simply sit next to the HUD; the HUD has to yield.

### 3.2 Geometry, anchoring, layering

```
┌──────────────────────────────────────────────────────────────┐
│  scene (Three.js)                              ┌───────────┐ │  HUD: 260×auto, right 20, top 20, z8
│                                               │  HUD      │ │
│                                               │  (yields) │ │
│                                  ┌────────────┴───────────┐ │
│                                  │  phone 340 × 720       │ │  z30, right 20, bottom 20
│                                  │  screen 320 × 700      │ │
│  ┌──────────────────────┐        │  ┌──────────────────┐  │ │
│  │ VN dialogue 286h     │        │  │ WeChat-like app  │  │ │
│  │ (suspended)          │        │  └──────────────────┘  │ │
│  └──────────────────────┘        └────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

- **Outer size:** `--phone-h: clamp(480px, calc(100cqh - 56px), 720px); --phone-w: calc(var(--phone-h) * 0.472)`.
  - Any pane ≥776px tall → 720×340 (screen 700×320).
  - 700px tall pane → `100cqh - 56` = 644 → 644×304 (still above the 300px usable minimum).
  - Below **640px pane height** → sheet mode (see 3.8).
- **Anchor:** `right: max(20px, env(safe-area-inset-right)); bottom: max(20px, calc(env(safe-area-inset-bottom) + 12px))`. Matches the HUD edge token so the two objects align.
- **Bezel:** 10px sides/top, 12px chin; shell radius 40px; screen radius 30px (inner). Screen is the only clipped area.
- **HUD interplay (two plans, chosen by container width):**
  - `@container office (min-width: 1180px)`: keep both. HUD gets `transform: translateX(calc(-1 * (var(--phone-w) + 16px)))` over 220ms; scene loses 340px on the right — acceptable at ≥1180 because 1180 − 600 ≈ 580px of scene remains.
  - `@container office (max-width: 1179px)`: phone overlays. HUD goes to `opacity: .3; pointer-events: none; filter: saturate(.6)`, its buttons `inert`, plus a faint scrim over the whole scene at `rgba(38,52,63,.14)` so the phone reads as the focused object. No layout shift.
- **Dialogue panel:** on phone open, if the face-to-face panel is mounted → collapse it (`translateY(calc(100% + 24px)); opacity: .35`, 180ms) and **unmount its composer**; keep the native draft. On phone close, restore with 200ms and return focus to the dialogue panel if it was open. Never two composers.
- **Camera tools / bottom hints:** hide while the phone is open (`opacity 0`, `pointer-events:none`), restore on close.
- **Camera:** if the player's projected x > 58% of the pane width, ease the camera target left by `min(120px, phoneW*0.35)` over 220ms, in follow mode only. Do not rotate, do not zoom, do not move the player.
- **Z-index scale (declare once, comment it):** scene 0 · HUD 8 · dialogue 18 · drawers/meeting 24 · **phone 30** · phone sheets/pickers 34 · toasts 40 · modal backdrop 50. Do not add a new number outside this list.
- **Pointer:** the phone root captures wheel/pointer; the scene below keeps working for camera drag only if we choose to allow it — recommend blocking it (the phone is a focused surface).

### 3.3 Shell, home screen

- **Original industrial design:** warm graphite unibody (`#1b2830 → #2b3a42` vertical gradient), cream-paper screen, a 6px centred camera dot (generic punch-hole, not an iPhone notch), thin side-button slivers, soft ambient shadow. No Apple/Samsung silhouette, no WeChat styling.
- **Wallpaper (original):** layered sage arcs + blurred leaf-shadow ellipses, evoking the "Komorebi" theme (`DEFAULT_OFFICE_THEME` accent `#779d83`, wall `#efe4d0`, floor `#c99e72` in `src/shared/office.js`). Use a `linear-gradient(160deg, #eef3ea, #d9e6d6 55%, #cfdcc9)` plus 2–3 low-opacity bezier "shadow" shapes; no text, no logo.
- **Status bar (24px):** left — real local time `HH:mm` (matches the HUD clock); right — original signal/wifi/battery glyphs drawn as inline SVG. Keep them abstract; no vendor icon shapes.
- **Home layout:**
  - Clock/date widget: 1 row (`Tuesday 21 October`), 12px/10.5px, ink `#26343F`.
  - App grid: 4 columns × 44px icons on a 320px screen (4×44 + 3×12 gap + 2×16 padding = 244px, leaving 76px slack). 1–2 rows only.
  - **Chat icon (original):** a rounded-square tile using the game accent gradient (`#4E7A68 → #3B7180`), containing an asymmetric speech bubble whose tail is a caret, cut by a thin cream highlight. Reads as "chat" without copying WeChat's two-bubble logo.
  - Apps: **Chats** (primary, 64px), **Team** (opens the existing Team drawer), **Map** (opens the existing floor map), **Settings** (quiet motion + return to chat). All four map to existing actions — **no fake apps**.
  - Dock (56px, 4 slots): **Chats · Team · Map · Close phone**. The dock is the only place that duplicates the grid, and deliberately so: it is always one tap away.
  - Home indicator: 120×4px pill, `rgba(38,52,63,.25)`.
- **Shell states:** when closed, `display:none` after the first open (keep mounted so drafts and scroll survive) and `inert`; when open, focus moves in.

### 3.4 Information architecture

- **Chats** — one merged list, sorted by pinned → last activity. Row = avatar (agent portrait or group glyph), name, last-message preview, time, badge, status chip.
  - Groups first-class: group avatar = 2×2 mini collage of member portraits (original composition), name, `n members` in the subtitle.
  - Status chip: reuse the existing state vocabulary (`idle "On a break"`, `thinking "Thinking…"`, `typing "Working"`, `reading`, `speaking`, `waiting "Needs you"`, `away`) — but in the list only show **Working** and **Needs you** to avoid noise.
  - Pinned: user-pinned rows get the cream-grey background `#EDF1EA` (our analogue of WeChat's grey pin), one block at the top.
  - Muted: bell-off glyph; still counts unread but no badge animation.
  - Unread badge: number, `99+` cap; **separate** from "Needs you" (amber chip). Do not conflate "unread message" with "agent is blocked on you".
  - Timestamps: today `HH:mm`; yesterday `Yesterday`; ≤6 days weekday; older `YYYY/MM/DD`. Use `Intl.DateTimeFormat` in the user's locale/timezone (product copy stays English).
  - Search: **defer**. If the list exceeds ~20 rows, add a filter chip row (All / Groups / Agents) before adding full-text search.
- **Contacts** — all agents (the roster), alphabetical with a right index rail like WeChat, plus a **Group chats** entry on top. No "New friends", no "add friend": the roster is authoritative. Tapping an agent opens the private chat; long-press/… shows "Open in Team drawer".
- **You** — player name + avatar, phone case colour (tie to the character's outfit accent), Quiet motion toggle, "Return to chat" (existing action), and a short "how the phone works" hint. This is where settings live so the chat app stays clean.
- Empty states (all original copy):
  - Chats: "No conversations yet." / "Open Contacts to message a teammate."
  - Contacts: "No teammates yet." / "The team roster is empty."
  - Chat with no history: "Say hello. Messages here go to {name}'s real conversation."
  - Loading: "Opening the conversation…" (reuse the existing string); error: "Couldn't open this conversation." + Retry.
- Unread state is **client-memory only** (last-opened timestamp per session id); never persisted host-side, never a new source of truth.
- **Closed state:** while the phone is closed, its only presence in the world is a small HUD "Phone" button (22px icon) with the total unread count. New messages still use the existing overhead speech previews; do not add a second notification system. The phone's own icon badge appears on the phone's home screen when reopened.

### 3.5 Chat detail and the native composer

- Header (48px): back chevron · title (private: name; group: `name (n)`) · **…** menu (Mute, Pin, "Open full conversation" — the escape hatch to the real chat page, "Close phone"). Group subtitle: floor/room name. Private subtitle: live status ("Working", "Needs you", "On a break").
- **Transcript = bubbles, projected from the same message model the VN panel already uses** (`novel.js` handles text / reasoning / tool / file / terminal / attachment blocks). Reuse that projection; do not re-render the desktop conversation at 300px.
  - Mine: right, `#D9E8D2` bubble (ink `#26343F`, 9.98:1), radius 12 with 4px on the tail corner, padding 8×11, max width 78%.
  - Theirs: left, `#FFFFFF` with 1px `#E2E8DF` border, ink `#26343F`, avatar 26px rounded-square beside the first bubble of a run.
  - Group: 11px sender name above the first bubble; consecutive messages from the same sender collapse avatars.
  - Reasoning: a collapsed line "Thought for 12s" that expands inside the bubble (never leaks raw chain-of-thought into the list preview).
  - Tool calls: compact grey cards — icon + verb + target + result (`Ran terminal · exit 0`) — expandable to the existing detail view. These are the "file/link cards" of our chat.
  - Streaming: typing dots + the growing text, with a caret; stop the dots once tokens arrive.
  - Queue: a "Queued · 2" pill above the composer, tappable to review.
  - System notices: centered 11px `#5A6A62` on `#EEF2ED`: "Turn stopped", "Session compacted", "Message delivered" — never a modal.
  - @mentions: highlighted run; when the bot @s the player, show a mention chip in the row preview.
  - Reply quotes: if we later add quoting, a 2-line grey strip above the bubble; v1 can omit.
  - Read receipts / "seen": **do not add** — matches WeChat and avoids pressure. Presence is the status chip + streaming animation.
- **Composer:** mount the native Factory inside the phone, exactly like the VN panel does (native `conversation.content`, `views` override for the message area). Keep attachments, voice, model, queue, slash commands, @mentions and tool-call handling untouched.
  - Phone-specific CSS overrides: `--dsh-chat-content-width: 100%` (the default 720px is wrong here), `--dsh-content-font-size: 13px`, composer card background `#FFFFFF`, radius 14, `[contenteditable]` min-height 28px / max-height 88px / 13px, padding 0 6px, and the native composer seat stripped of its desktop gradient.
  - The native "more" surfaces (attachments, model, queue, slash menu) must not try to fit in 320px: present them as a **phone bottom sheet** (max-height 60% of the screen, own scroll, `overscroll-behavior: contain`) above the input bar, like WeChat's plus panel. This is the single biggest integration risk.
  - Send button: the native one stays (feature parity). Style it to the house style (deep sage `#4E7A68`, white, 4.88:1) — do not copy WeChat's `#07C160`/white (2.38:1).
  - Attachments: 8.0.79's half-sheet pattern is the right model — open the picker sheet *over* the thread, keep the thread visible.
  - Placeholder: "Message {name}" / "Message {group}" (reuse the existing `--bt-placeholder` convention).
- **Scrolling and history:** transcript `overflow-y:auto; overscroll-behavior: contain; scrollbar-width: thin`. Auto-scroll only when within 64px of the bottom; otherwise show a "Latest ↓" pill. At `scrollTop < 48px` call the existing public `Session.loadOlder` paging and preserve the anchor by `scrollHeight` delta. New messages while scrolled up must not yank the view.
- **Group vs private:** group sends require the real `@Name` insertion in the native editor (existing public, version-guarded insert API — reuse; do not replace the draft); private does not. Group replies may arrive from other members mid-turn (existing room-progress merge); show the real sender, never "assistant".
  - Careful: the VN panel auto-inserts `@Name ` on Enter (`novel.js:142-151,159`) so a face-to-face group reply always mentions the person in front of you. The phone must **not** copy that — phone sends are plain native sends; insert a mention only when the user explicitly picks an `@` chip.
- **Keyboard:** Enter sends (native default), Shift+Enter newline, Esc layered. Do **not** add Ctrl/Cmd+Enter as "send" (users expect Enter). Guard IME: never send while `event.isComposing` or `keyCode === 229`.
- **One input:** if the user opens the phone while a meeting/board chat is open, close that surface first (existing mutual-exclusion rule for drawers) — one composer ever.

### 3.6 Motion

| Phase | Open | Close |
|---|---|---|
| 0 | lock movement, push Escape layer, dim HUD/scrim (120ms) | release nothing yet |
| 0–90ms | 3D right arm `rotation.x` → −1.15 rad, ease-out | — |
| 40–160ms | 3D phone prop appears at hand point, scale 0.6→1 | — |
| 60–260ms | panel `translateY(28px) scale(.94) → 0/1`, opacity 0→1, `cubic-bezier(.2,.7,.2,1)` 200ms | panel `translateY(18px)`, opacity →0, 180ms |
| 90–220ms | list rows fade in 40ms stagger (max 3 rows) | — |
| 90–200ms | — | arm lowers; prop hides at 200ms; scene/HUD restore 200ms |

- `prefers-reduced-motion` / existing Quiet motion: no translate/scale, 120ms opacity, arm snaps to pose, prop appears instantly, no row stagger.
- Use transform/opacity only; do not animate `width`, `height`, `filter` or `box-shadow` on the panel. Never re-render the 3D scene because of phone state.

### 3.7 Input, focus and Escape

- **Open:** `P` or the HUD "Phone" button. Focus moves to the phone root (`tabindex="-1"`, `aria-label="Phone"`); do **not** autofocus the composer (avoids keyboard/IME surprises and makes the list the landing view).
- **Availability:** the phone is a no-op while the office is hidden, during an elevator ride/fade, or while a modal board is up; opening it closes the HUD drawer and suspends the VN panel first.
- The scene's movement gate is already `document.activeElement === element`; once focus is in the phone, WASD/E/arrows cannot move the character or trigger interactions. Verify no **window-level** shortcut (`E`, `Enter`, `P`) is handled outside that gate; if any is, guard with `event.target.closest('.of-phone')`.
- **Tab trap** inside the phone (reuse the `useOfficeDialog` pattern from `conversation.js:4-19`), and set `inert` on the scene + HUD while the phone is open so screen readers stay inside.
- **Escape layering:** push exactly one layer per phone level: picker/sheet open → close it; chat detail → back to list; list → close phone and restore focus to the scene element. Use the existing `useEscape` stack (`overlay-hooks.js`) so a HUD drawer opened earlier does not swallow the first Escape.
- **Close:** return focus to the scene element (the one the renderer's keydown listens on) so movement resumes without an extra click. If the VN panel was open when the phone opened, restore focus to it instead.
- **What if the player clicks the scene while the phone is open?** Recommended: keep the phone open, leave focus in the phone (a click on the scene would otherwise move the character and select a target behind the phone). Clicking the scrim does nothing; only Esc / X / P closes.
- **Click-to-walk:** disabled while the phone is open (the scene is behind a scrim). Do not auto-close the phone on a scene click.

### 3.8 Narrow containers

Judge by the office container, never the browser window (existing rule):

| `@container office` | Behaviour |
|---|---|
| ≥1180×640 | Full shell; HUD slides left; phone 340px. |
| 760–1179 wide, ≥640 tall | Full shell; HUD dimmed + inert + scrim; phone stays 340px as long as the pane is ≥640 tall. |
| <760 wide or <640 tall | **Sheet mode:** bezel/notch/camera dot hidden, phone fills the pane with 12px margins, top bar 44px (`‹ Office` + title + …), list/detail full-bleed, composer expands as a bottom sheet; HUD and bottom hints hidden. |
| <480 wide | Same as sheet mode; hide the "You" tab label, keep icons; min screen width 300px is guaranteed. |
| <420 wide | Drop app-grid labels on the home screen; keep 4 large icons. |

- Do not shrink the phone below **300px** screen width: at that point bubbles + composer stop being usable and typing becomes a scroll fight.
- The tab bar is 56px with 22px icons and 10px labels; in sheet mode it stays (bottom, safe-area padded).

### 3.9 Risks and pitfalls

1. **HUD collision is arithmetic, not taste.** 260px HUD + 340px phone + edges = 600px. Any pane under ~1180px must overlay/dim the HUD; test 1440, 1100, 900, 800, 390 panes.
2. **Double composer / draft loss.** The project invariant is one chat input. Suspend the VN panel and the meeting chat before mounting the phone composer; keep drafts; test reopen.
3. **Native composer at 320px.** The composer is same-DOM React (there is no iframe to worry about), but the desktop toolbar (attachments, model, queue, slash, mentions) will wrap or overflow at 320px. Make every secondary surface a bottom sheet; override `--dsh-chat-content-width`; test at 320 and 300px; if a control cannot fit, move it into the "…" menu rather than shrinking tap targets.
4. **Scroll chaining.** The transcript, the phone root and the page must not scroll into each other: `overscroll-behavior: contain` on the transcript and the phone; lock body scroll while a phone sheet is open.
5. **IME Enter.** Chinese/Japanese input fires Enter to commit candidates; check `isComposing`. Sending a half-composed message is the classic bug.
6. **z-index drift.** Existing layers are 3/8/18/24/32. Declare the phone scale once; never eyeball a number. Test with a meeting board open, a HUD drawer open, a toast visible.
7. **Focus leak.** Any window-level key handler bypassing the scene-focus gate can move the player while typing. Also ensure closing the phone returns focus to the scene element, not `<body>` (otherwise WASD silently stops working).
8. **Escape ordering.** With the HUD drawer + phone, two independent Escape handlers can both fire. Route all phone layers through the existing stack; test drawer → phone → Esc order.
9. **Readability at 320px.** 13px body, 78% bubble width, long code/tool output. Cap line length, allow code blocks to scroll horizontally, and offer an "expand" (phone grows to 1.35×, up to full pane) for long reads; do not scale text below 12px.
10. **Contrast.** Measured: `#D9E8D2` + `#26343F` = 9.98:1 ok; `#4E7A68` + white = 4.88 ok; `#B4553F` + white = 4.87 ok; `#5A6A62` on `#F4F6F2` = 5.26 ok; `#8A9A90` = 2.72 **fail** (placeholder grey); WeChat's own white-on-`#07C160` = 2.38 **fail**. Use the passing set; verify every new token.
11. **Backdrop blur cost.** The HUD already uses `backdrop-filter`. Do not stack blur on the phone screen; use solid surfaces + one shadow.
12. **Session lifecycle.** Reuse `retainOfficeChat` / `OfficeGroupChat` so the phone never holds a session after closing; release on close and on scene destroy; no leaked subscriptions across floor changes.
13. **Simulation/regression.** Opening the phone must not pause or rebuild the scene (the project explicitly keeps it alive), must not move the player, and must not reset camera mode.
14. **Screen readers.** `role="dialog" aria-modal="true"` on the phone, `inert` behind it, one `aria-live="polite"` region for the active transcript only when at the bottom; never announce every streaming token.
15. **Originality/legal.** No WeChat logo/brand green/icon set/wordmark; no iPhone silhouette; no Nintendo/Atlus/Rockstar visual language. The icon and shell above are original and must be drawn locally (SVG/CSS), not imported.
16. **Privacy.** Messages stay on screen; do not put previews of tool output or reasoning into the locked/home screen; do not persist unread state.

### 3.10 Open questions for the Lead

1. When a face-to-face conversation is active, does the phone **replace** the VN panel (my recommendation) or refuse to open?
2. Should the office simulation keep running (recommended) or pause while the phone is up? (Bots keep working = the team feels alive; player input is locked either way.)
3. Keybind: **P** ok? It must not collide with an existing binding; also add a HUD button for discoverability.
4. Is "You" acceptable as a third tab, or do we want only Chats/Contacts and move settings into "…"?
5. Do we add a "focus/expand" mode for long messages in v1, or defer?
6. Should unread counts survive closing the phone within the page session only, or not at all? (No host persistence either way.)

---

## 4. Sources

WeChat / Tencent:
- WeChat Mini Program design guide (type scale 22/17/15/14/12, 375/390 base, 7–9mm targets, 2–5 tabs, tab icon 81×81): <https://developers.weixin.qq.com/miniprogram/design/>
- Mini Program `app.json` `tabBar` (2–5 tabs, 81×81 icon): <https://developers.weixin.qq.com/miniprogram/dev/reference/configuration/app.html#tabBar>
- WeUI 2.6.24 official CSS (colors, cell, dark mode): <https://cdn.jsdelivr.net/npm/weui@2.6.24/dist/style/weui.css>
- WeUI variables: nav 56px / tab bar 60px: <https://api.github.com/repos/Tencent/weui/contents/src/style/base/variable/weui-tab.less>; cell 56px / 17px / 16px: <https://api.github.com/repos/Tencent/weui/contents/src/style/base/variable/weui-cell.less>
- Mini Program PC adaptation guide: <https://developers.weixin.qq.com/miniprogram/design/adapt.html>
- Mini Program elderly / accessibility guides: <https://developers.weixin.qq.com/miniprogram/design/elderly.html>, <https://developers.weixin.qq.com/miniprogram/design/accessibility.html>
- IT之家, 2026-03-26, WeChat explains why it has no read receipts and when "对方正在输入" appears: <https://www.ithome.com/0/932/783.htm>
- IT之家, 2026-09-30, WeChat iOS 8.0.79 redesign (half-sheet picker, contacts search filters, merged entries): <https://m.ithome.com/html/1008902.htm>
- 优设, 2025-08-15, WeChat 8.0.62 information-hierarchy refinements: <https://www.uisdc.com/wechat-2>
- 搜狐/潇湘晨报, 2026-09-17, desktop WeChat three-column layout grey test and complaints: <https://www.sohu.com/a/1077410299_120914498>

Games:
- GTA Wiki, iFruit (held device, iOS-like UI, apps): <https://gta.wiki/w/IFruit>
- Nookipedia, NookPhone (opened with ZL, app grid, phone cases): <https://nookipedia.com/wiki/NookPhone>
- Persona 5 Royal UI analysis (phone rotates up from the bottom, portrait chat, landscape map, bottom-right dungeon HUD): <https://game.3loumao.org/840320216>; P5 menu design series referenced there: <https://indienova.com/indie-game-development/p5-ui-design/>
- Stardew Valley Wiki, Telephone (audio-only calls): <https://wiki.stardewvalley.net/mediawiki/index.php?title=Telephone&oldid=126342>
- Cyberpunk 2077, how calls/messages work: <https://www.ign.com/wikis/cyberpunk-2077/How_to_Call_Someone>
- Watch Dogs, phone profiling/hacking: <https://www.gamerguides.com/watch-dogs/guide/gameplay/game-features/profiling-hacking>
- Life is Strange, texting UI documentation: <https://life-is-strange.fandom.com/wiki/Texting>
- Firewatch dialogue system analysis (choices in the bottom-right): <https://core.ac.uk/download/232614196.pdf>
- Zenless Zone Zero, Inter-Knot: <https://zenless-zone-zero.fandom.com/wiki/Inter-Knot>
- Wuthering Waves, WavesLine phone features: <https://game8.co/games/Wuthering-Waves/archives/570882>
- Infinity Nikki, Pear-Pal phone menu: <https://www.ign.com/videos/infinity-nikki-what-do-all-the-menu-options-mean-pear-pal-explained>
- The Sims 4 phone pie menu discussion: <https://sims4studio.forums.net/thread/14815/>
- Diegetic vs non-diegetic game displays (concept): <http://www.cas.mcmaster.ca/~carette/publications/GEM2014_poster2.pdf>
- Game HUD readability on small screens (concept): <https://xplorestaging.ieee.org/document/11197475/>

Access caveat: several game-wiki/guide hosts (Fandom, Game8, Gamer Guides, Icy Veins, PCGamingWiki) returned 403/blocked responses from this environment. Claims for those games are based on the linked pages' titles/abstracts plus documented in-game behaviour, and are marked accordingly; they should be re-checked against the games before being treated as canon. WeChat app metrics marked ≈ are not officially published and are targets, not law.

Repo references: `ds-bot/src/client/office/hud-styles.js`, `modern-styles.js`, `novel.js`, `conversation.js`, `renderer.js`, `styles.js`; `ds-bot/src/shared/office.js` (`DEFAULT_OFFICE_THEME`); `docs/plans/2026-10-20-office-hud.md`, `2026-10-20-visual-novel-dialogue.md`, `2026-10-20-office-conversations.md`.
