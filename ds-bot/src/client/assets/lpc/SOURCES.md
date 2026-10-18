# LPC Revised asset sources

This directory contains a selected subset of [ElizaWy/LPC](https://github.com/ElizaWy/LPC), pinned to commit [`f07f7f5892e67c932c68f70bb04472f2c64e46bc`](https://github.com/ElizaWy/LPC/tree/f07f7f5892e67c932c68f70bb04472f2c64e46bc). The [LPC Revised office collection](https://opengameart.org/content/lpc-revised-the-office) provides the related collection page.

The upstream [Credits.txt](Credits.txt) declares OGA-BY 3.0. The complete retained license is [LICENSE.txt](LICENSE.txt); the upstream overview is retained as [UPSTREAM-README.md](UPSTREAM-README.md). This license applies to the artwork, separately from the plugin's Apache-2.0 code license.

The collection credits Eliza Wyatt (DeathsDarling), Lanea Zimmerman (Sharm), Stephen Challener (Redshrike), Johannes Sjölund (Wulax), BlueCarrot16, BenCreating, Durrani, YuriNikolai, and Craftpix.net 2D Game Assets. Exact asset-family attribution, original source links, prior edits and license details are preserved in the [credits directory](credits/).

## File mapping and use

[sources.json](sources.json) maps every local PNG filename to its exact upstream path at the pinned commit. Local names are shortened for imports; the original PNG data is unmodified.

- Masculine and feminine body, pants, shoes, shirt, head and hair layers include authored walk, idle and sitting sheets. Runtime composition preserves their shared 64 × 64 frame registration and anatomy; shirt pixels receive the saved AI outfit palette.
- Furniture, small objects, wood floors, drywall and windows use the upstream 32-pixel visual scale. Runtime drawing selects object regions, crops them and scales them into the room composition.
- Arcade cabinet overlays, the Star catcher mini-game, short book texts, room composition and interface elements are original to DeepSeek Office. They do not replace the attribution or license of the underlying LPC artwork.

Momo's dog sprite comes from the separately credited CC0 [Ninja Adventure subset](../ninja/SOURCES.md). Phaser and other bundled code retain their own licenses in [THIRD-PARTY-NOTICES.txt](../../../../THIRD-PARTY-NOTICES.txt).
