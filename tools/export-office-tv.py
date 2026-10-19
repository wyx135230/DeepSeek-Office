"""Run with Blender --background --disable-autoexec SOURCE.blend --python this.py -- OUTPUT.glb."""
import bpy
import sys
from pathlib import Path

output = Path(sys.argv[sys.argv.index('--') + 1]).resolve()
output.parent.mkdir(parents=True, exist_ok=True)
colors = {
    'BlackPlastic': ((0.018, 0.023, 0.028, 1), .24, .12),
    'Screen': ((1, 1, 1, 1), .42, 0),
    'Silver': ((.52, .56, .59, 1), .32, .72),
    'RemoteRubber': ((.025, .03, .035, 1), .8, 0),
    'RemotePlastic': ((.055, .065, .075, 1), .36, .1),
    'Clear': ((.12, .15, .18, 1), .24, .15),
}
# The source uses Cycles procedural mixes and missing generated bake images.
# Export portable PBR surfaces; the game supplies its own original screen art.
for name, (color, roughness, metallic) in colors.items():
    material = bpy.data.materials.get(name)
    if not material:
        continue
    material.use_nodes = True
    material.node_tree.nodes.clear()
    shader = material.node_tree.nodes.new('ShaderNodeBsdfPrincipled')
    shader.inputs['Base Color'].default_value = color
    shader.inputs['Roughness'].default_value = roughness
    shader.inputs['Metallic'].default_value = metallic
    target = material.node_tree.nodes.new('ShaderNodeOutputMaterial')
    material.node_tree.links.new(shader.outputs['BSDF'], target.inputs['Surface'])

bpy.ops.object.select_all(action='DESELECT')
for name in ['TV', 'Remote']:
    obj = bpy.data.objects[name]
    obj.hide_set(False)
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    if name == 'TV':
        screen_faces = [p for p in obj.data.polygons if obj.data.materials[p.material_index].name == 'Screen']
        print('SCREEN_NORMALS', [(tuple(p.normal), p.area) for p in screen_faces[:4]])
bpy.ops.export_scene.gltf(filepath=str(output), export_format='GLB', use_selection=True, export_yup=True, export_animations=False, export_cameras=False, export_lights=False)
print('OFFICE_TV_EXPORT', output.name, output.stat().st_size)
