# Character wardrobe and scene integration

The owner approved randomized clothing and skin colors on the supplied office
worker, then inspection in the existing office. Preserve the supplied silhouette
and all agent, movement, activity and chat behavior. This pass changes colors and
uses the rigged model; it does not introduce new body types or clothing meshes.

Use a restrained modern-office wardrobe: oxford blue #548fb8, teal #36897f,
ivory #ded7c5, burgundy #87465d, sage #91a58b and muted secondary colors.
Separate skin, hair, shirt, trousers, shoes and belt into editable materials.
Keep the current UI typography and layout. Shirt color carries recognition at
office scale; skin, hair and trousers provide secondary distinctions.

Identity-seeded choices remain reproducible. Save the automatic wardrobe per
identity in local browser storage; retain existing choices as coworkers arrive.
Prefer unused shirt colors for new people, and avoid duplicate full automatic
outfits on each floor. Avatar colors from a nonempty user direction take
precedence; background automatic portrait generation keeps its own colors and
does not replace the saved 3D wardrobe. Storage
failure must still allow deterministic choices and a playable office.

Implementation and verification:

- [x] Test deterministic allocation, distinct initial shirts, retained identities,
  malformed saved looks and explicit color overrides; implement pure allocation
  plus the local storage adapter.
- [x] Derive a reduced-density, weighted GLB from the supplied test rig. Author
  material regions and neutral, walking and seated clips in background Blender.
  Inspect the colored mesh and export metadata; keep the original untouched.
- [x] Bundle the model locally; clone skeletons/materials per actor and share
  geometry. Synchronize clips with existing actor state and respect quiet motion.
  Dispose all cloned and shared resources when the scene closes.
- [x] Check actual mock-office screenshots with twelve coworkers, walking,
  seating, rotation and reopen. Run full tests, generated-client check and lint;
  save a local installation archive and visual evidence.

Review focus: saved choices versus roster changes; user overrides; skinning at
shoulders and hips; seat/feet alignment; loading/cancellation and GPU disposal.
No host or Harness changes, production profile access, or remote asset dependency.
