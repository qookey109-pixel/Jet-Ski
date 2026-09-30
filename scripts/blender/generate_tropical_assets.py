import bpy
import math
import os
import random
from mathutils import Vector

OUT_DIR = os.environ.get("JETSKI_ASSET_OUT", "//cloud-visual-output")
OUT_DIR = bpy.path.abspath(OUT_DIR)
os.makedirs(OUT_DIR, exist_ok=True)
random.seed(109)

def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)

def mat(name, rgba, roughness=0.7):
    m = bpy.data.materials.new(name)
    m.diffuse_color = rgba
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = rgba
        bsdf.inputs["Roughness"].default_value = roughness
    return m

SAND = mat("Tropical Sand", (0.95, 0.72, 0.35, 1.0), 0.9)
GRASS = mat("Tropical Grass", (0.15, 0.48, 0.16, 1.0), 0.85)
TRUNK = mat("Palm Trunk", (0.28, 0.12, 0.05, 1.0), 0.95)
LEAF = mat("Palm Leaf", (0.04, 0.34, 0.10, 1.0), 0.8)

def add_flat_sphere(name, loc, scale, material, segments=20, rings=12):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=rings, location=loc)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    obj.data.materials.append(material)
    return obj

def add_palm(base, scale=1.0, phase=0.0):
    x, y, z = base
    bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=0.18*scale, depth=3.2*scale, location=(x, y, z+1.6*scale))
    trunk = bpy.context.object
    trunk.data.materials.append(TRUNK)
    trunk.rotation_euler[0] = math.radians(3.0 * math.sin(phase))
    trunk.rotation_euler[1] = math.radians(5.0 * math.cos(phase))

    crown_z = z + 3.15*scale
    for i in range(7):
        angle = phase + i * math.tau / 7.0
        length = 2.05*scale
        width = 0.28*scale
        verts = [
            (0, -width, 0),
            (length*0.55, -width*0.45, -0.08*scale),
            (length, 0, -0.28*scale),
            (length*0.55, width*0.45, -0.08*scale),
            (0, width, 0),
        ]
        mesh = bpy.data.meshes.new("PalmLeafMesh")
        mesh.from_pydata(verts, [], [[0,1,2,3,4]])
        mesh.update()
        leaf = bpy.data.objects.new("PalmLeaf", mesh)
        bpy.context.collection.objects.link(leaf)
        leaf.data.materials.append(LEAF)
        leaf.location = (x, y, crown_z)
        leaf.rotation_euler[2] = angle
        leaf.rotation_euler[1] = math.radians(7 + (i % 3) * 3)

def add_island(cx, cy, sx, sy, palms, seed_offset):
    add_flat_sphere(f"Sand_{seed_offset}", (cx, cy, -0.35), (sx, sy, 0.52), SAND)
    add_flat_sphere(f"Grass_{seed_offset}", (cx, cy, -0.05), (sx*0.72, sy*0.72, 0.34), GRASS)
    rng = random.Random(109 + seed_offset)
    for i in range(palms):
        a = rng.uniform(0, math.tau)
        r = rng.uniform(0.15, 0.52)
        px = cx + math.cos(a) * sx * r
        py = cy + math.sin(a) * sy * r
        add_palm((px, py, 0.15), rng.uniform(0.85, 1.15), phase=a+i)

def setup_scene():
    clear_scene()
    add_island(-8.0, 0.0, 5.2, 3.6, 4, 1)
    add_island(0.0, 0.5, 4.1, 3.0, 3, 2)
    add_island(7.4, -0.4, 3.2, 2.4, 2, 3)

    bpy.ops.object.light_add(type="SUN", location=(4, -5, 10))
    sun = bpy.context.object
    sun.rotation_euler = (math.radians(28), 0, math.radians(32))
    sun.data.energy = 2.2

    bpy.ops.object.light_add(type="AREA", location=(0, -7, 9))
    area = bpy.context.object
    area.data.energy = 900
    area.data.shape = "DISK"
    area.data.size = 8

    bpy.ops.object.camera_add(location=(17, -24, 13))
    cam = bpy.context.object
    bpy.context.scene.camera = cam
    direction = Vector((0, 0, 1.3)) - cam.location
    cam.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
    cam.data.lens = 52

    scene = bpy.context.scene
    scene.render.resolution_x = 1280
    scene.render.resolution_y = 720
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = False
    scene.world.color = (0.035, 0.20, 0.33)
    scene.render.engine = "BLENDER_WORKBENCH"
    if hasattr(scene, "display"):
        scene.display.shading.light = "STUDIO"
        scene.display.shading.color_type = "MATERIAL"
        scene.display.shading.show_shadows = True
        scene.display.shading.show_cavity = True
        scene.display.shading.cavity_type = "WORLD"
    return scene

scene = setup_scene()
glb_path = os.path.join(OUT_DIR, "tropical_island_kit.glb")
png_path = os.path.join(OUT_DIR, "tropical_island_preview.png")

bpy.ops.export_scene.gltf(filepath=glb_path, export_format="GLB", export_apply=True, export_yup=True)
scene.render.filepath = png_path
bpy.ops.render.render(write_still=True)

print("JETSKI_ASSET_OK")
print(glb_path)
print(png_path)
