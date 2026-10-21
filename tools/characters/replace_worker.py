"""Rebind an owner-supplied static GLB to the existing office animation contract.

Run in background Blender with --source, --reference and --output after --.
The input files and any interactive Blender session remain untouched.
"""
import argparse
import bpy
import bmesh
import json
import hashlib
import sys
from pathlib import Path
from mathutils import Vector, Quaternion
import numpy as np

parser = argparse.ArgumentParser()
parser.add_argument('--source', required=True)
parser.add_argument('--reference', required=True)
parser.add_argument('--output', required=True)
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
source_path = Path(args.source).resolve()
reference_path = Path(args.reference).resolve()
output = Path(args.output).resolve()
if source_path == output / 'office-worker.glb' or reference_path == output / 'office-worker.blend':
    raise ValueError('Output must not overwrite either input file')
output.mkdir(parents=True, exist_ok=True)

bpy.ops.wm.open_mainfile(filepath=str(reference_path))
scene = bpy.context.scene
rig = next(obj for obj in scene.objects if obj.type == 'ARMATURE')
reference_mesh = next(obj for obj in scene.objects if obj.type == 'MESH' and any(m.type == 'ARMATURE' for m in obj.modifiers))
old_height = max(v.co.z for v in reference_mesh.data.vertices)
old_rest = {bone.name: bone.matrix_local.to_quaternion() for bone in rig.data.bones}
old_hip = rig.data.bones['Hips'].head_local.z / old_height
clips = {}
for action in list(bpy.data.actions):
    if not action.name.startswith('Office'):
        continue
    rig.animation_data.action = action
    frames = []
    for frame in range(int(action.frame_range[0]), int(action.frame_range[1]) + 1):
        scene.frame_set(frame)
        frames.append((frame, {bone.name: (bone.rotation_quaternion.copy(), bone.location.copy()) for bone in rig.pose.bones}))
    clips[action.name] = frames
rig.animation_data_clear()
for action in list(bpy.data.actions):
    bpy.data.actions.remove(action)
for obj in list(scene.objects):
    if obj != rig:
        bpy.data.objects.remove(obj, do_unlink=True)
for bone in rig.pose.bones:
    bone.rotation_mode = 'QUATERNION'
    bone.rotation_quaternion = Quaternion()
    bone.location = (0, 0, 0)
    bone.scale = (1, 1, 1)
rig.data.pose_position = 'REST'
scene.frame_set(1)

bpy.ops.import_scene.gltf(filepath=str(source_path))
obj = next(obj for obj in bpy.context.selected_objects if obj.type == 'MESH')
bpy.context.view_layer.objects.active = obj
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
height = max(v.co.z for v in obj.data.vertices) - min(v.co.z for v in obj.data.vertices)
center_x = (min(v.co.x for v in obj.data.vertices) + max(v.co.x for v in obj.data.vertices)) / 2
floor = min(v.co.z for v in obj.data.vertices)
for vertex in obj.data.vertices:
    vertex.co.x -= center_x
    vertex.co.z -= floor
obj.name = 'OfficeWorkerReplacement'
base_image = next(node.image for material in obj.data.materials for node in material.node_tree.nodes if node.type == 'TEX_IMAGE' and 'base' in node.label.lower()) if any('base' in node.label.lower() for material in obj.data.materials for node in material.node_tree.nodes if node.type == 'TEX_IMAGE') else next(node.image for material in obj.data.materials for node in material.node_tree.nodes if node.type == 'TEX_IMAGE' and node.image.colorspace_settings.name == 'sRGB')
pixels = np.empty(len(base_image.pixels), dtype=np.float32)
base_image.pixels.foreach_get(pixels)
pixels = pixels.reshape((base_image.size[1], base_image.size[0], 4))

bpy.ops.object.select_all(action='DESELECT')
obj.select_set(True)
bpy.context.view_layer.objects.active = obj
bm = bmesh.new()
bm.from_mesh(obj.data)
bmesh.ops.remove_doubles(bm, verts=list(bm.verts), dist=height * .00001)
bm.to_mesh(obj.data)
bm.free()
obj.data.calc_loop_triangles()
source_triangles = len(obj.data.loop_triangles)
modifier = obj.modifiers.new('Office runtime density', 'DECIMATE')
modifier.ratio = min(1, 32000 / source_triangles)
modifier.use_collapse_triangulate = True
bpy.ops.object.modifier_apply(modifier=modifier.name)
obj.data.calc_loop_triangles()

def sample(uv):
    x = min(pixels.shape[1] - 1, max(0, int(uv.x * pixels.shape[1])))
    y = min(pixels.shape[0] - 1, max(0, int(uv.y * pixels.shape[0])))
    return np.clip(pixels[y, x, :3], 0, 1)

uvs = obj.data.uv_layers.active.data
face_colors = []
for face in obj.data.polygons:
    face_colors.append(np.mean([sample(uvs[loop].uv) for loop in face.loop_indices], axis=0))

def region(point, color):
    x, y, z = point.x / height, point.y / height, point.z / height
    ax = abs(x)
    r, g, b = color
    light = float(np.mean(color))
    gold = r > g * 1.18 and g > b * 1.65 and r > .22
    if z > .73:
        eye = y < -.06 and .775 < z < .855 and .018 < ax < .105
        skin_tone = r > g * 1.08 and g > b * 1.05 and light > .55
        if z > .895 or y > .025 or ax > .125 or (z > .835 and y < -.09 and not skin_tone):
            return 1
        if eye and light < .45:
            return 6
        return 0
    # Long hair is bound to the head, including the strands behind the shoulders.
    hair_color = .16 < light < .58 and .025 < r-g < .085 and b-g > .006
    if z > .46 and (light < .50 and (y > .04 or z > .53 and ax > .16 and y > .015 or z > .60 and y < -.046 and .09 < ax < .14) or hair_color and z > .59 and y < -.03 and .08 < ax < .18):
        return 1
    if gold:
        return 5
    if ax > .218 and z < .53:
        return 0
    if ax > .175 and light > .58:
        return 6
    if z < .16 or z < .21 and light < .40:
        return 4
    if z < .43 or z < .49 and light > .40:
        return 0
    if z < .565 and ax < .15:
        return 3
    if ax < .072 and y < -.025 and light > .44:
        return 6
    return 2

regions = []
for face, color in zip(obj.data.polygons, face_colors):
    center = sum((obj.data.vertices[i].co for i in face.vertices), Vector()) / len(face.vertices)
    regions.append(region(center, color))

material_specs = [('Skin', '#dca982'), ('Hair', '#49382e'), ('Shirt', '#548fb8'), ('Trousers', '#334353'), ('Shoes', '#573e2d'), ('Belt', '#ffffff'), ('Eyes', '#ffffff'), ('Iris', '#ffffff')]
def linear(value):
    return value / 12.92 if value <= .04045 else ((value + .055) / 1.055) ** 2.4

obj.data.materials.clear()
for material in list(bpy.data.materials):
    bpy.data.materials.remove(material)
for name, color in material_specs:
    material = bpy.data.materials.new('Office' + name)
    material.use_nodes = True
    bsdf = material.node_tree.nodes.get('Principled BSDF')
    rgb = tuple(linear(int(color[i:i + 2], 16) / 255) for i in (1, 3, 5))
    bsdf.inputs['Base Color'].default_value = (*rgb, 1)
    bsdf.inputs['Roughness'].default_value = .8
    vertex = material.node_tree.nodes.new('ShaderNodeVertexColor')
    vertex.layer_name = 'OfficeDetail'
    tint = material.node_tree.nodes.new('ShaderNodeMixRGB')
    tint.blend_type = 'MULTIPLY'
    tint.inputs[0].default_value = 1
    tint.inputs[2].default_value = (*rgb, 1)
    material.node_tree.links.new(vertex.outputs['Color'], tint.inputs[1])
    material.node_tree.links.new(tint.outputs['Color'], bsdf.inputs['Base Color'])
    material.diffuse_color = (*rgb, 1)
    obj.data.materials.append(material)

detail = obj.data.color_attributes.new(name='OfficeDetail', type='FLOAT_COLOR', domain='CORNER')
reference_luma = {}
for index in range(5):
    values = [float(np.mean(color)) for material, color in zip(regions, face_colors) if material == index]
    reference_luma[index] = max(.06, float(np.percentile(values, 80))) if values else 1
for face, material in zip(obj.data.polygons, regions):
    face.material_index = material
    face.use_smooth = True
    for loop in face.loop_indices:
        rgb = sample(uvs[loop].uv)
        if material < 5:
            shade = max(.16, min(1, float(np.mean(rgb)) / reference_luma[material]))
            # Vertex colors are linear, while the source image samples are sRGB.
            rgba = (linear(shade),) * 3 + (1,)
        else:
            rgba = tuple(linear(float(value)) for value in rgb) + (1,)
        detail.data[loop].color = rgba

joint = {'Root': ((0,0,0),(0,0,.07)), 'Hips':((0,0,.51),(0,0,.57)), 'Spine':((0,0,.57),(0,0,.62)), 'Spine1':((0,0,.62),(0,0,.66)), 'Spine2':((0,0,.66),(0,0,.70)), 'Neck':((0,0,.70),(0,-.005,.745)), 'Head':((0,-.005,.745),(0,-.005,.98))}
for side, sign in [('Left',1),('Right',-1)]:
    def point(x,y,z):
        return (x*sign,y,z)
    joint.update({side+'Shoulder':(point(.025,0,.695),point(.112,0,.69)), side+'Arm':(point(.112,0,.69),point(.178,-.004,.575)), side+'ForeArm':(point(.178,-.004,.575),point(.232,-.008,.505)), side+'Hand':(point(.232,-.008,.505),point(.269,-.012,.462)), side+'UpLeg':(point(.063,.005,.51),point(.07,-.014,.30)), side+'Leg':(point(.07,-.014,.30),point(.072,.008,.087)), side+'Foot':(point(.072,.008,.087),point(.072,-.080,.029)), side+'ToeBase':(point(.072,-.080,.029),point(.072,-.108,.029))})
bpy.ops.object.select_all(action='DESELECT')
rig.select_set(True)
bpy.context.view_layer.objects.active=rig
bpy.ops.object.mode_set(mode='EDIT')
for bone in rig.data.edit_bones:
    head, tail = joint[bone.name]
    bone.use_connect = False
    bone.head = Vector(head) * height
    bone.tail = Vector(tail) * height
bpy.ops.object.mode_set(mode='OBJECT')
rig.data.pose_position='POSE'
new_rest={bone.name:bone.matrix_local.to_quaternion() for bone in rig.data.bones}
obj.select_set(True)
bpy.context.view_layer.objects.active=rig
bpy.ops.object.parent_set(type='ARMATURE_AUTO')

# Seed heat weights on the closed source first; opened contact boundaries make
# the heat solver singular. BMesh carries its deform layer through the split.
bm=bmesh.new()
bm.from_mesh(obj.data)
boundary=[edge for edge in bm.edges if len({face.material_index==1 for face in edge.link_faces})>1]
bmesh.ops.split_edges(bm,edges=boundary)
remaining={face for face in bm.faces if face.material_index!=1}
while remaining:
    seed=remaining.pop()
    component={seed}
    pending=[seed]
    while pending:
        face=pending.pop()
        for edge in face.edges:
            for neighbor in edge.link_faces:
                if neighbor in remaining:
                    remaining.remove(neighbor)
                    component.add(neighbor)
                    pending.append(neighbor)
    # Small isolated ribbons left between hair cuts belong to the long strands,
    # rather than to an otherwise disconnected piece of sleeve.
    if len(component)<100 and all(face.material_index==2 for face in component) and min(vertex.co.z/height for face in component for vertex in face.verts)>.55:
        for face in component:
            face.material_index=1
hair_layer=bm.verts.layers.int.new('OfficeHair')
for face in bm.faces:
    if face.material_index==1:
        for vertex in face.verts:
            vertex[hair_layer]=1
# Close the contact cuts on both surfaces, so a lifted sleeve still has a back.
caps=bmesh.ops.holes_fill(bm,edges=[edge for edge in bm.edges if len(edge.link_faces)==1],sides=0)['faces']
cap_set=set(caps)
color_layer=bm.loops.layers.float_color.get('OfficeDetail')
for face in caps:
    adjacent=[other.material_index for edge in face.edges for other in edge.link_faces if other not in cap_set]
    face.material_index=1 if all(vertex[hair_layer] for vertex in face.verts) else max(set(adjacent),key=adjacent.count) if adjacent else 2
    face.smooth=True
    if color_layer:
        for loop in face.loops:
            shade=1 if face.material_index==0 else .3
            loop[color_layer]=(shade,shade,shade,1)
bm.to_mesh(obj.data)
bm.free()
obj.data.calc_loop_triangles()
hair_vertices={index for face in obj.data.polygons if face.material_index==1 for index in face.vertices}
body_vertices={index for face in obj.data.polygons if face.material_index!=1 for index in face.vertices}
if hair_vertices & body_vertices:
    raise ValueError('Hair and clothing must have independent contact vertices')

def smooth(low, high, value):
    value=max(0,min(1,(value-low)/(high-low)))
    return value*value*(3-2*value)

unweighted=0
weight_field=np.zeros((len(obj.data.vertices),len(obj.vertex_groups)),dtype=np.float64)
locked=[]
for vertex in obj.data.vertices:
    point=vertex.co/height
    weights={obj.vertex_groups[entry.group].name:entry.weight for entry in vertex.groups}
    if vertex.index in hair_vertices:
        weights={'Head':1}
    elif point.z<.565 and abs(point.x)<.13:
        for name in weights:
            if any(name.endswith(part) for part in ['Shoulder','Arm','ForeArm','Hand']):
                weights[name]=0
    for name,weight in weights.items():
        weight_field[vertex.index,obj.vertex_groups[name].index]=weight
    locked.append(vertex.index in hair_vertices or point.z>.76 or point.z<.42)

# Diffuse along the actual surface, rather than across nearby but unrelated
# surfaces in space. This keeps the fused contact seams from tearing on a reach.
edges=np.array([edge.vertices[:] for edge in obj.data.edges])
starts=np.concatenate((edges[:,0],edges[:,1]))
ends=np.concatenate((edges[:,1],edges[:,0]))
counts=np.bincount(starts,minlength=len(weight_field))[:,None]
locked=np.array(locked)
for _ in range(100):
    neighbors=np.zeros_like(weight_field)
    np.add.at(neighbors,starts,weight_field[ends])
    average=neighbors/np.maximum(1,counts)
    weight_field[~locked]=.5*weight_field[~locked]+.5*average[~locked]

for vertex in obj.data.vertices:
    point=vertex.co/height
    weights={}
    for group in obj.vertex_groups:
        weight=weight_field[vertex.index,group.index]
        name=group.name
        # These child bones have identical skin transforms in the existing clips.
        # Combining them prevents a fifth small influence being abruptly dropped
        # when exporting four-weight vertices at a seam.
        if name in ['Root','Spine','Spine1']:
            name='Hips'
        elif name in ['LeftShoulder','RightShoulder','Neck']:
            name='Spine2'
        elif name.endswith('Hand'):
            name=name.replace('Hand','ForeArm')
        elif name.endswith('Foot') or name.endswith('ToeBase'):
            name=name.replace('Foot','Leg').replace('ToeBase','Leg')
        if vertex.index not in hair_vertices and name=='Head' and point.z<.70:
            name='Spine2'
        if vertex.index not in hair_vertices:
            arm=name.endswith('Arm')
            if point.z<.565 and abs(point.x)<.13 and arm:
                name='Hips'
            elif point.z<.56 and name=='Spine2':
                name='Hips'
            elif point.z>.56 and name.endswith('Leg'):
                name='Hips'
            elif point.z<.56 and abs(point.x)>.13 and name.endswith('Leg'):
                name='Hips'
            if arm and point.z>.565:
                keep=smooth(.04,.15,abs(point.x))*(1-smooth(.68,.74,point.z))
                weights['Spine2']=weights.get('Spine2',0)+weight*(1-keep)
                weight*=keep
        weights[name]=weights.get(name,0)+weight
    if vertex.index not in hair_vertices and point.z>.70:
        head=smooth(.70,.76,point.z)
        weights={name:weight*(1-head) for name,weight in weights.items()}
        weights['Head']=weights.get('Head',0)+head
    groups=sorted([(weight,obj.vertex_groups[name].index) for name,weight in weights.items() if weight>.00001],reverse=True)
    for group in obj.vertex_groups:
        group.remove([vertex.index])
    if not groups:
        unweighted+=1
        nearest=min(rig.data.bones, key=lambda bone:(vertex.co-bone.head_local).length if bone.use_deform else 100)
        groups=[(1,obj.vertex_groups[nearest.name].index)]
    total=sum(weight for weight,_ in groups[:4])
    for weight,index in groups[:4]:
        obj.vertex_groups[index].add([vertex.index],weight/total,'REPLACE')

# Contact caps count towards the same runtime triangle budget as the source LOD.
if len(obj.data.loop_triangles)>32000:
    bpy.context.view_layer.objects.active=obj
    modifier=obj.modifiers.new('Closed contact density','DECIMATE')
    modifier.ratio=32000/len(obj.data.loop_triangles)
    modifier.use_collapse_triangulate=True
    bpy.ops.object.modifier_apply(modifier=modifier.name)
    obj.data.calc_loop_triangles()

for name,frames in clips.items():
    rig.animation_data_create()
    action=bpy.data.actions.new(name)
    action.use_fake_user=True
    rig.animation_data.action=action
    for frame,poses in frames:
        for bone in rig.pose.bones:
            rotation,location=poses[bone.name]
            basis=new_rest[bone.name].inverted() @ old_rest[bone.name]
            bone.rotation_quaternion=basis @ rotation @ basis.inverted()
            translation=(old_rest[bone.name] @ location) * (height/old_height)
            if name=='OfficeSeated' and bone.name=='Root':
                translation.z+=(old_hip-.51)*height
            bone.location=new_rest[bone.name].inverted() @ translation
            bone.keyframe_insert(data_path='rotation_quaternion',frame=frame,group=bone.name)
            bone.keyframe_insert(data_path='location',frame=frame,group=bone.name)

# Validate and relax residual contact gradients after LOD and four-weight
# packing. Work in skin space across every existing pose, leaving Actions intact.
samples=[('OfficeIdle',1),('OfficeWalk',9),('OfficeWalk',25),('OfficeSeated',1),('OfficeDrink',1),('OfficeExercise',9),('OfficeExercise',17)]
matrices=[]
for name,frame in samples:
    rig.animation_data.action=bpy.data.actions[name]
    scene.frame_set(frame)
    matrices.append([np.array(rig.pose.bones[group.name].matrix @ rig.data.bones[group.name].matrix_local.inverted()) for group in obj.vertex_groups])
points=np.array([(*vertex.co,1) for vertex in obj.data.vertices])
transformed=np.einsum('pbij,vj->pbvi',np.array(matrices),points)[...,:3]
packed=np.zeros((len(points),len(obj.vertex_groups)))
for vertex in obj.data.vertices:
    for entry in vertex.groups:
        packed[vertex.index,entry.group]=entry.weight
edges=np.array([edge.vertices[:] for edge in obj.data.edges])

def pack(field):
    keep=np.argsort(field,axis=1)[:,-4:]
    result=np.zeros_like(field)
    np.put_along_axis(result,keep,np.take_along_axis(field,keep,axis=1),axis=1)
    return result/np.maximum(1e-12,result.sum(axis=1,keepdims=True))

packed=pack(packed)
for relaxation in range(512):
    poses=np.einsum('vb,pbvi->pvi',packed,transformed)
    lengths=np.linalg.norm(poses[:,edges[:,0]]-poses[:,edges[:,1]],axis=2)
    ratios=lengths/np.maximum(1e-12,lengths[0])
    ratios[:,lengths[0]<height*.001]=1
    bad=np.any(ratios>4.4,axis=0)
    if not np.any(bad):
        break
    pairs=edges[bad]
    average=(packed[pairs[:,0]]+packed[pairs[:,1]])*.5
    totals=np.zeros_like(packed)
    counts=np.zeros((len(packed),1))
    for column in [0,1]:
        np.add.at(totals,pairs[:,column],average)
        np.add.at(counts,pairs[:,column],1)
    affected=counts[:,0]>0
    packed[affected]=pack(.25*packed[affected]+.75*totals[affected]/counts[affected])
else:
    raise ValueError('Contact weights did not converge across the office poses')
for group in obj.vertex_groups:
    group.remove(list(range(len(points))))
for vertex,weights in zip(obj.data.vertices,packed):
    for index in np.flatnonzero(weights>0):
        obj.vertex_groups[int(index)].add([vertex.index],float(weights[index]),'REPLACE')

rig.animation_data.action=bpy.data.actions['OfficeIdle']
scene.frame_set(1)
scene.render.fps=30
bpy.ops.object.select_all(action='DESELECT')
rig.select_set(True)
obj.select_set(True)
bpy.context.view_layer.objects.active=rig
obj['officeSource']=source_path.name
obj['officeSourceSha256']=hashlib.sha256(source_path.read_bytes()).hexdigest()
links=[]
for material in obj.data.materials:
    bsdf=material.node_tree.nodes.get('Principled BSDF')
    link=bsdf.inputs['Base Color'].links[0]
    links.append((material,link.from_socket,bsdf.inputs['Base Color']))
    material.node_tree.links.remove(link)
bpy.ops.export_scene.gltf(filepath=str(output/'office-worker.glb'),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='ACTIONS',export_force_sampling=True,export_def_bones=False,export_yup=True,export_vertex_color='ACTIVE',export_all_vertex_colors=False,export_extras=True)
for material,source,target in links:
    material.node_tree.links.new(source,target)
for image in list(bpy.data.images):
    if image.users==0:
        bpy.data.images.remove(image)
bpy.ops.wm.save_as_mainfile(filepath=str(output/'office-worker.blend'))

camera=bpy.data.objects.new('VerificationCamera',bpy.data.cameras.new('VerificationCamera'))
scene.collection.objects.link(camera)
camera.data.type='ORTHO'
camera.data.ortho_scale=height*1.35
scene.camera=camera
scene.render.engine='CYCLES'
scene.cycles.samples=12
scene.world=bpy.data.worlds.new('VerificationWorld')
scene.world.use_nodes=True
scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.18,.20,.22,1)
for name,location,power,size in [('Key',(1,-3,4),450,4),('Fill',(-2,-1,2),180,3)]:
    data=bpy.data.lights.new(name,'AREA')
    data.energy=power
    data.shape='DISK'
    data.size=size
    light=bpy.data.objects.new(name,data)
    scene.collection.objects.link(light)
    light.location=Vector(location)*height
    light.rotation_euler=(Vector((0,0,height*.5))-light.location).to_track_quat('-Z','Y').to_euler()
scene.render.resolution_x=750
scene.render.resolution_y=900
scene.render.resolution_percentage=100
for name,clip,frame in [('idle','OfficeIdle',1),('walk','OfficeWalk',9),('seated','OfficeSeated',1),('drink','OfficeDrink',1),('exercise','OfficeExercise',17)]:
    rig.animation_data.action=bpy.data.actions[clip]
    scene.frame_set(frame)
    camera.location=Vector((height*.8,-height*3,height*.66))
    camera.rotation_euler=(Vector((0,0,height*.5))-camera.location).to_track_quat('-Z','Y').to_euler()
    scene.render.filepath=str(output/f'{name}.png')
    bpy.ops.render.render(write_still=True)
report=dict(source=source_path.name,source_triangles=source_triangles,triangles=len(obj.data.loop_triangles),vertices=len(obj.data.vertices),bones=len(rig.data.bones),max_influences=max(len(v.groups) for v in obj.data.vertices),fallback_vertices=unweighted,materials={name:sum(triangle.material_index==index for triangle in obj.data.loop_triangles) for index,(name,_) in enumerate(material_specs)},clips=list(clips),height=height,vertex_detail=True,pose_checks=samples,weight_relaxations=relaxation,max_edge_ratio=float(np.max(ratios)),runtime_bytes=(output/'office-worker.glb').stat().st_size)
(output/'report.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print('REPLACEMENT_REPORT',json.dumps(report),flush=True)
