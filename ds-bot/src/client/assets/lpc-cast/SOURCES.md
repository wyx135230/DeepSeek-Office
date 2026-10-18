# LPC Revised employee cast

These authored layers come from [ElizaWy/LPC](https://github.com/ElizaWy/LPC),
pinned to commit [`f07f7f5892e67c932c68f70bb04472f2c64e46bc`](https://github.com/ElizaWy/LPC/tree/f07f7f5892e67c932c68f70bb04472f2c64e46bc).
The 72 PNGs in this directory retain their original upstream bytes. A further
36 sheets are imported from the existing [LPC subset](../lpc/SOURCES.md), without
copying those images. There are 108 registered layer/action assets in total.

[sources.json](sources.json) records each runtime key, exact upstream path,
local or reused filename, PNG dimensions, SHA-256 digest and Git blob SHA-1.
The original 64 × 64 registration is preserved. Walk sheets are 512 × 256
(eight frames, four directions); idle and sitting sheets are 192 × 256
(three frames, four directions). Direction rows are up, left, down and right.
Body, head and clothing variants use matching feminine-thin or masculine-thin
adult registrations. Heads and bodies always share their authored skin palette.

The 96 stable presets combine eight authored hair silhouettes, four skin
palettes and four clothing cuts. Hair includes parted, side-part bob, short
curls, natural, bangs and bun, cornrows, cowlick and flat-top fade. Clothing
includes a buttoned longsleeve shirt, T-shirt, polo and V-neck longsleeve shirt.
Palette diversity is baked into the original selected assets; saved AI outfit
colors may additionally tint the shirt during runtime composition. No heads
are resized or grafted onto another anatomy, and no authored PNG is repainted.

## Attribution and license

Artwork is [OGA-BY 3.0](LICENSE.txt), separately from the plugin's code license.
The complete upstream [collection credits](Credits.txt),
[collection overview](UPSTREAM-README.md), and specific character-family
credits are retained unchanged:

- [Bodies and heads](credits/Characters.txt): Stephen Challener (Redshrike),
  Eliza Wyatt (DeathsDarling), Durrani and BenCreating; exact per-family details
  and original source links are in the retained file.
- [Clothing](credits/Characters-Clothing.txt): the same animation foundation,
  with the individual clothing authors and edits listed per item.
- [Hair](credits/Characters-Hair.txt): Eliza Wyatt (DeathsDarling),
  Johannes Sjölund (Wulax) and BlueCarrot16, with original source links and
  license history for each selected style.

The root credits also retain the wider LPC contributor list. Include this
directory's license, credits and manifest when redistributing the cast.
