# Warm office decoration

The owner selected a warm, lived-in modern office. The first pass follows the
original decoration study in `artifacts/scene-design/2026-10-21/`, concentrating
on work studios, coffee studios and screening rooms. Other facilities retain
their current appearance for a later pass.

- Work studios: felt desk pads, pencil pots, task lamps or headphones, cable
  trays, a corkboard and a decorative clock, woven rugs and backrest throws.
- Coffee studios: cup trays, bean jars, saucers, a slim wall cup shelf, original
  botanical prints, a magazine and woven upholstery details.
- Screening rooms: acoustic panels, an original print, a warm wall sconce,
  backrest fabric and television cabinet vents. Keep the supplied TV and remote.

All added solid geometry fits within existing furniture or wall footprints.
Fabric on sofas stays on the backrest, away from reserved seated bodies. Wall
details mount on the left wall, clear of the existing work board and visible
from the default camera; they follow that wall's existing cutaway transform.
The study's wall markers are updated in `floor-plan-implemented.svg`.

`decoration-3d.js` builds original, static presentation geometry. Its two canvas
textures are shared across rooms. The TV cabinet uses one additional grille
texture on its existing door face, without adding or moving geometry.
Model-kit ownership and static batches
handle materials, geometry and disposal. Wall batches use coordinates relative
to their root so rotated and lowered walls retain the correct placement.

Do not add interaction targets, lights with a new update loop, furniture
colliders, seats or activity stations. Keep the original world generation,
movement, conversations, host code, permissions and Bot behavior unchanged.
No external asset download, runtime service or dependency is added.

Verification covers geometry and seated-body clearance, unchanged world data,
interaction identities, batch transforms and resource disposal. Use the real
renderer in an isolated local preview to check walking, coffee, seating, camera
rotation, themes, daylight, night and narrow viewports. Run the complete unit
suite, generated-client check and lint before delivery.
