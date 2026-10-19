"""Derive the office runtime asset from the owner's previously approved test rig.

Run in background Blender, passing --source and --output after --.
Never opens or saves the interactive Blender session.
"""
import argparse
import bpy
import json
import math
import sys
from pathlib import Path
from mathutils import Vector, Quaternion

parser = argparse.ArgumentParser()
parser.add_argument('--source', required=True)
parser.add_argument('--output', required=True)
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
output = Path(args.output)
output.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=args.source)
scene = bpy.context.scene
rig = next(o for o in scene.objects if o.type == 'ARMATURE')
obj = next(o for o in scene.objects if o.type == 'MESH' and any(m.type == 'ARMATURE' for m in o.modifiers))
rig.animation_data_clear()
for p in rig.pose.bones:
    p.rotation_mode = 'QUATERNION'
    p.rotation_quaternion = Quaternion()
    p.location = (0, 0, 0)
    p.scale = (1, 1, 1)
bpy.ops.object.select_all(action='DESELECT')
obj.select_set(True)
bpy.context.view_layer.objects.active = obj
mod = obj.modifiers.new('Runtime density', 'DECIMATE')
mod.ratio = .4
mod.use_collapse_triangulate = True
# Collapse the rest mesh, before the skin deformation.
bpy.ops.object.modifier_move_up(modifier=mod.name)
bpy.ops.object.modifier_apply(modifier=mod.name)
obj.data.calc_loop_triangles()
height = max(v.co.z for v in obj.data.vertices)
cx = (min(v.co.x for v in obj.data.vertices) + max(v.co.x for v in obj.data.vertices)) / 2
obj.name = 'OfficeWorker'
rig.name = 'OfficeSkeleton'

for vertex in obj.data.vertices:
    groups = sorted([(g.weight, g.group) for g in vertex.groups], reverse=True)
    for _, index in groups[4:]:
        obj.vertex_groups[index].remove([vertex.index])
    total = sum(weight for weight, _ in groups[:4])
    if total < .0001:
        raise RuntimeError('Unweighted runtime vertex')
    for weight, index in groups[:4]:
        obj.vertex_groups[index].add([vertex.index], weight / total, 'REPLACE')

def srgb(value):
    value /= 255
    return value / 12.92 if value <= .04045 else ((value + .055) / 1.055) ** 2.4

materials = [
    ('Skin', '#dca982', .66), ('Hair', '#49382e', .8),
    ('Shirt', '#548fb8', .88), ('Trousers', '#334353', .9),
    ('Shoes', '#573e2d', .48), ('Belt', '#45392e', .55),
    ('Eyes', '#dedbd2', .42), ('Iris', '#463a30', .42),
]
obj.data.materials.clear()
for name, color, roughness in materials:
    material = bpy.data.materials.new('Office' + name)
    rgb = tuple(srgb(int(color[i:i + 2], 16)) for i in (1, 3, 5))
    material.diffuse_color = (*rgb, 1)
    material.use_nodes = True
    bsdf = next((node for node in material.node_tree.nodes if node.type == 'BSDF_PRINCIPLED'), None)
    if bsdf is None:
        bsdf = material.node_tree.nodes.new('ShaderNodeBsdfPrincipled')
        surface = material.node_tree.nodes.new('ShaderNodeOutputMaterial')
        material.node_tree.links.new(bsdf.outputs['BSDF'], surface.inputs['Surface'])
    bsdf.inputs['Base Color'].default_value = (*rgb, 1)
    bsdf.inputs['Roughness'].default_value = roughness
    obj.data.materials.append(material)

def region(point):
    x, y, z = (point.x - cx) / height, point.y / height, point.z / height
    ax = abs(x)
    if z > .823:
        # The back and sides of the sculpt have a lower hairline than the face.
        hairline = .947 - .039 * min(1, (ax / .075) ** 1.4) if y < -.02 else .876
        if ax > .065 and z < .917 and y < .018:
            return 0
        if z > hairline:
            return 1
        # Keep ears and facial relief in skin. Restrict eyes to the front plane.
        eye = ((ax - .028) / .017) ** 2 + ((z - .895) / .006) ** 2
        if y < -.051 and eye < 1:
            return 7 if abs(ax - .028) < .005 else 6
        return 0
    # Neck opens between the shirt collar panels.
    if (z > .815 and ax < .024) or (z > .805 and ax < .016 and y < -.022):
        return 0
    # Sleeve cuffs slope with the original A-pose, rather than cutting hands flat.
    if ax > .165 and z < .505 - (ax - .19) * .36:
        return 0
    if ax > .13 and z > .48:
        return 2
    if z > .586:
        return 2
    if .565 < z <= .586:
        return 5
    if z < .063 - max(0, -y - .012) * .18:
        return 4
    return 3

counts = [0] * len(materials)
for face in obj.data.polygons:
    point = sum((obj.data.vertices[i].co for i in face.vertices), Vector()) / len(face.vertices)
    face.material_index = region(point)
    face.use_smooth = True
    counts[face.material_index] += 1

scene.render.fps = 30
for old in list(bpy.data.actions):
    bpy.data.actions.remove(old)

def reset():
    for p in rig.pose.bones:
        p.rotation_quaternion = Quaternion()
        p.location = (0, 0, 0)

def rotate(name, axis, angle):
    bone = rig.pose.bones[name]
    local = bone.bone.matrix_local.to_3x3().inverted() @ Vector(axis)
    bone.rotation_quaternion = bone.rotation_quaternion @ Quaternion(local, angle)

def neutral():
    reset()
    for side, sign in [('Left', 1), ('Right', -1)]:
        rotate(side + 'Arm', (0, 1, 0), sign * .29)
        rotate(side + 'ForeArm', (1, 0, 0), -.065)

def key(frame):
    for bone in rig.pose.bones:
        bone.keyframe_insert(data_path='rotation_quaternion', frame=frame, group=bone.name)
        bone.keyframe_insert(data_path='location', frame=frame, group=bone.name)

def action(name):
    rig.animation_data_create()
    result = bpy.data.actions.new(name)
    result.use_fake_user = True
    rig.animation_data.action = result
    return result

idle = action('OfficeIdle')
for frame in [1, 17, 33, 49, 65]:
    neutral()
    rotate('Spine2', (1, 0, 0), math.sin((frame - 1) / 64 * math.tau) * .008)
    key(frame)

walk = action('OfficeWalk')
for frame in range(1, 34, 4):
    neutral()
    phase = (frame - 1) / 32 * math.tau
    for side, offset in [('Left', 0), ('Right', math.pi)]:
        swing = math.sin(phase + offset)
        rotate(side + 'UpLeg', (1, 0, 0), -swing * .35)
        rotate(side + 'Leg', (1, 0, 0), max(0, -swing) * .55 + .02)
        rotate(side + 'Arm', (1, 0, 0), swing * .20)
        rotate(side + 'ForeArm', (1, 0, 0), -.08)
    rotate('Spine2', (0, 0, 1), math.sin(phase) * .018)
    key(frame)

sit = action('OfficeSeated')
for frame in [1, 33, 65]:
    neutral()
    for side in ['Left', 'Right']:
        rotate(side + 'UpLeg', (1, 0, 0), -math.radians(70))
        rotate(side + 'Leg', (1, 0, 0), math.radians(70))
        rotate(side + 'Arm', (1, 0, 0), -.38)
        rotate(side + 'ForeArm', (1, 0, 0), -.98)
    rig.pose.bones['Root'].location = rig.data.bones['Root'].matrix_local.to_3x3().inverted() @ Vector((0, 0, -.15 * height))
    key(frame)

drink = action('OfficeDrink')
for frame in [1, 33, 65]:
    neutral()
    rotate('RightArm', (1, 0, 0), -.65)
    rotate('RightForeArm', (1, 0, 0), -1.45)
    key(frame)

exercise = action('OfficeExercise')
for frame in [1, 9, 17, 25, 33]:
    neutral()
    reach = (1 - math.cos((frame - 1) / 32 * math.tau)) / 2
    for side, sign in [('Left', 1), ('Right', -1)]:
        rotate(side + 'Arm', (0, 1, 0), -sign * reach * 1.35)
        rotate(side + 'ForeArm', (1, 0, 0), -reach * .2)
    key(frame)

rig.animation_data.action = idle
scene.frame_set(1)
scene.frame_start = 1
scene.frame_end = 65
bpy.ops.object.select_all(action='DESELECT')
obj.select_set(True)
rig.select_set(True)
bpy.context.view_layer.objects.active = rig
options = dict(filepath=str(output / 'office-worker.glb'), export_format='GLB', use_selection=True,
               export_animations=True, export_animation_mode='ACTIONS', export_force_sampling=True,
               export_def_bones=False, export_yup=True)
bpy.ops.export_scene.gltf(**options)
bpy.ops.wm.save_as_mainfile(filepath=str(output / 'office-worker-wardrobe.blend'))

scene.render.engine = 'BLENDER_WORKBENCH'
scene.display.shading.color_type = 'MATERIAL'
scene.display.shading.light = 'STUDIO'
scene.display.shading.show_shadows = True
scene.display.shading.show_cavity = True
scene.display.shading.cavity_type = 'BOTH'
scene.render.resolution_x = 900
scene.render.resolution_y = 1100
scene.render.resolution_percentage = 100
for name, clip, frame in [('front', idle, 1), ('walk', walk, 9), ('seated', sit, 1)]:
    rig.animation_data.action = clip
    scene.frame_set(frame)
    scene.camera.location = Vector((height * .8, -height * 3, height * .7))
    target = Vector((cx, 0, height * .47))
    scene.camera.rotation_euler = (target - scene.camera.location).to_track_quat('-Z', 'Y').to_euler()
    scene.camera.data.ortho_scale = height * 1.16
    scene.render.filepath = str(output / f'wardrobe-{name}.png')
    bpy.ops.render.render(write_still=True)
report = dict(vertices=len(obj.data.vertices), triangles=len(obj.data.loop_triangles), bones=len(rig.data.bones),
              height=height, materials={name: counts[i] for i, (name, _, _) in enumerate(materials)},
              clips=['OfficeIdle', 'OfficeWalk', 'OfficeSeated', 'OfficeDrink', 'OfficeExercise'], max_influences=max(len(v.groups) for v in obj.data.vertices))
(output / 'wardrobe-report.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
print('WARDROBE_REPORT', json.dumps(report), flush=True)
