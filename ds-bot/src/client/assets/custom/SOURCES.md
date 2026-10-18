# Custom campus facility atlas

`campus-props.png` is original generated artwork created for DeepSeek Office
on 2026-10-18 with OpenAI's built-in image generation tool. It is not extracted
from Pokemon, Stardew Valley or another game's assets. The source raster is
retained unmodified: 1774 x 887 pixels, transparent RGBA, four columns by two rows.

Row-major cells: treadmill, dumbbell rack, bento preparation island, mocktail
bar, ramen stove, exercise bike, book lectern, low chess table. Current rooms
use cells 0, 1, 2, 3, 5 and 7; the remaining two share the same single atlas.

## Generation direction

Create a transparent eight-object sprite atlas for a warm Japanese-inspired
pixel workplace. Use a consistent three-quarter top-down perspective, crisp
pixel clusters, rich walnut wood grain, sage upholstery, cream ceramic,
slate metal and terracotta accents. Give each object one equally spaced cell
in a four-column, two-row grid with clear transparent gutters. Include the
eight facilities listed above, with recognizable small controls, shelves,
utensils, cushions and highlights. No people, lettering, logos or backdrop.

## Runtime integration and reuse

`office/room-art.js` rounds cell boundaries from the original dimensions,
then draws them into native 96 or 112 pixel objects with nearest-neighbor
sampling. It does not edit the source image. `shared/office/world.js` declares
each placed fixture's physical footprint, room identity and interaction point.
Do not add freestanding decorative furniture without a matching footprint.

For new art: keep this perspective and palette, export transparent pixels,
record cell order and dimensions, check silhouette at the actual 2x game
scale, and test foot clearance and draw depth. Animated characters must keep
their frame size, foot anchor and directional registration across all poses.
The bundled LPC layers supply authored animation; this atlas is static art.

This generated atlas is distributed with this fork under its Apache-2.0
project terms. Third-party LPC and Ninja artwork retain their own licenses.
