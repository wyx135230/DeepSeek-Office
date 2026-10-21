# Office worker

Source: owner-supplied model `7b51da2fd49357e33b60fda73ec15b27.glb`.
The owner requested replacing the office base mesh, rebinding it and preserving
existing motion and wardrobe controls. No third-party asset pack was downloaded. This provenance record
does not assert a license beyond the owner's supplied rights.

The replacement retains the existing 23-bone hierarchy and bone names, with joint
positions fitted to the supplied model and the five existing Actions retargeted
to the new rest basis. Seated root translation preserves the existing pelvis height.
The runtime asset has 31,917 triangles (within the previous 32,000 budget),
16,057 geometric vertices and at most four normalized weights per vertex,
six material regions (five wardrobe channels and fixed details) and five technical
body clips: OfficeIdle, OfficeWalk, OfficeSeated, OfficeDrink and OfficeExercise.
Source detail is sampled into vertex colors so the runtime has no image textures.
The model's long hair, jacket, skirt and boots are its supplied silhouette. The
existing `pants` color channel maps to the skirt/lower garment. Skin, hair, shirt,
trousers and shoe material names remain unchanged; stored v1 wardrobe data and
prompted color overrides require no migration. Geometry is shared across
characters; skeletons and colored materials are independent. Hair follows the
head, without a new physics system. No facial, individual-finger animation or
new garment/hair shape switching is included. Automatic material boundaries
and vertex-color detail are a game-scale approximation, not the original full-resolution PBR textures.
Hair/clothing contact edges are separated and capped offline. Equivalent skin
influences are combined before four-weight packing, with residual contact
gradients relaxed across representative poses without changing the Actions.
The runtime GLB is 2,586,480 bytes; original input files remain untouched.

Build script: `tools/characters/replace_worker.py` in the repository.
Reference: `artifacts/characters/office-worker-wardrobe/office-worker-wardrobe.blend`
(the previous rig and Actions, read only). Editable replacement:
`artifacts/characters/office-worker-replacement/office-worker.blend`.
The source filename and its SHA-256 are also stored in the runtime GLB extras.
Source SHA-256: `b7438ef0934da3b0112b50c6a78e99c395a91970af38619a93a43a5d510f89f1`.
The GLB is embedded in the locally generated client, with no runtime download.

Run in an independent background Blender process, not an interactive work session:

```text
blender --background --factory-startup --python tools/characters/replace_worker.py -- --source E:/7b51da2fd49357e33b60fda73ec15b27.glb --reference artifacts/characters/office-worker-wardrobe/office-worker-wardrobe.blend --output <separate-build-folder>
```
