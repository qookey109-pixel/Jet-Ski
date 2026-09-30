import bpy
import math
import os
import random
from mathutils import Vector

OUT_DIR = os.environ.get("JETSKI_ASSET_OUT", "//cloud-visual-output")
OUT_DIR = bpy.path.abspath(OUT_DIR)
os.makedirs(OUT_DIR, exist_ok=True)

SEED = 109
random.seed(SEED)

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

SAND_LIGHT = mat("Sand Light", (0.96, 0.76, 0.42, 1.0), 0.92)
SAND_DARK = mat("Sand Wet Edge", (0.72, 0.47, 0.24, 1.0), 0.96)
GRASS = mat("Tropical Grass", (0.13, 0.54, 0.20, 1.0), 0.86)
GRASS_DARK = mat("Tropical Grass Dark", (0.06, 0.31, 0.12, 1.0), 0.9)
TRUNK = mat("Palm Trunk", (0.34, 0.17, 0.07, 1.0), 0.95)
LEAF_A = mat("Palm Leaf A", (0.03, 0.42, 0.12, 1.0), 0.83)
LEAF_B = mat("Palm Leaf B", (0.08, 0.58, 0.18, 1.0), 0.83)
ROCK = mat("Volcanic Rock", (0.24, 0.25, 0.22, 1.0), 0.97)
COCONUT = mat("Coconut", (0.26, 0.11, 0.035, 1.0), 0.9)
WATER = mat("Preview Water", (0.03, 0.40, 0.58, 1.0), 0.58)

ASSET_OBJECTS = []

def remember(obj):
    ASSET_OBJECTS.append(obj)
    return obj

def polar_blob(name, cx, cy, rx, ry, z, height, material, seed, points=26, irregularity=0.16):
    rng = random.Random(seed)
    verts = []
    faces = []
    # perimeter rings + center create a low-poly, irregular sandbar silhouette.
    ring_scales = [1.0, 0.72, 0.22]
    for ring_i, ring_scale in enumerate(ring_scales):
        for i in range(points):
            a = math.tau * i / points
            wave = (
                math.sin(a * 3.0 + seed * 0.11) * 0.055
                + math.sin(a * 5.0 + seed * 0.07) * 0.035
                + rng.uniform(-irregularity, irregularity) * (0.65 if ring_i == 0 else 0.24)
            )
            s = ring_scale * (1.0 + wave)
            zz = z + height * (1.0 - ring_scale) + (0.06 * math.sin(a * 4.0 + seed))
            verts.append((cx + math.cos(a) * rx * s, cy + math.sin(a) * ry * s, zz))
    center_index = len(verts)
    verts.append((cx, cy, z + height))

    for ring_i in range(len(ring_scales) - 1):
        outer = ring_i * points
        inner = (ring_i + 1) * points
        for i in range(points):
            j = (i + 1) % points
            faces.append((outer + i, outer + j, inner + j, inner + i))
    inner = (len(ring_scales) - 1) * points
    for i in range(points):
        j = (i + 1) % points
        faces.append((inner + i, inner + j, center_index))

    mesh = bpy.data.meshes.new(name + "Mesh")
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(material)
    return remember(obj)

def add_rock(x, y, z, scale, seed):
    rng = random.Random(seed)
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=1.0, location=(x, y, z))
    obj = bpy.context.object
    obj.name = "ShoreRock"
    obj.scale = (
        scale * rng.uniform(0.75, 1.25),
        scale * rng.uniform(0.65, 1.15),
        scale * rng.uniform(0.55, 0.95),
    )
    obj.rotation_euler = (
        rng.uniform(-0.35, 0.35),
        rng.uniform(-0.35, 0.35),
        rng.uniform(0, math.tau),
    )
    obj.data.materials.append(ROCK)
    return remember(obj)

def leaf_mesh(length, width, droop):
    verts = [
        (0.0, -width, 0.0),
        (length * 0.28, -width * 0.72, 0.05),
        (length * 0.62, -width * 0.38, -droop * 0.35),
        (length, 0.0, -droop),
        (length * 0.62, width * 0.38, -droop * 0.35),
        (length * 0.28, width * 0.72, 0.05),
        (0.0, width, 0.0),
    ]
    mesh = bpy.data.meshes.new("PalmLeafMesh")
    mesh.from_pydata(verts, [], [[0, 1, 2, 3, 4, 5, 6]])
    mesh.update()
    return mesh

def add_palm(base, scale, phase, seed):
    x, y, z = base
    rng = random.Random(seed)
    lean_x = math.radians(rng.uniform(-7.0, 7.0))
    lean_y = math.radians(rng.uniform(-10.0, 10.0))
    trunk_h = 3.0 * scale * rng.uniform(0.92, 1.15)

    bpy.ops.mesh.primitive_cone_add(
        vertices=9,
        radius1=0.22 * scale,
        radius2=0.14 * scale,
        depth=trunk_h,
        location=(x, y, z + trunk_h * 0.5),
    )
    trunk = bpy.context.object
    trunk.name = "PalmTrunk"
    trunk.rotation_euler = (lean_x, lean_y, phase * 0.04)
    trunk.data.materials.append(TRUNK)
    remember(trunk)

    top = Vector((0, 0, trunk_h * 0.5))
    top.rotate(trunk.rotation_euler)
    crown = Vector((x, y, z + trunk_h * 0.5)) + top

    leaf_count = rng.randint(7, 9)
    for i in range(leaf_count):
        a = phase + i * math.tau / leaf_count + rng.uniform(-0.10, 0.10)
        length = scale * rng.uniform(1.65, 2.25)
        width = scale * rng.uniform(0.22, 0.34)
        droop = scale * rng.uniform(0.28, 0.58)
        leaf = bpy.data.objects.new("PalmLeaf", leaf_mesh(length, width, droop))
        bpy.context.collection.objects.link(leaf)
        leaf.location = crown
        leaf.rotation_euler = (
            math.radians(rng.uniform(-4, 6)),
            math.radians(rng.uniform(4, 13)),
            a,
        )
        leaf.data.materials.append(LEAF_A if i % 2 == 0 else LEAF_B)
        remember(leaf)

    for i in range(rng.randint(2, 4)):
        a = phase + i * 2.2
        bpy.ops.mesh.primitive_ico_sphere_add(
            subdivisions=1,
            radius=0.14 * scale,
            location=(
                crown.x + math.cos(a) * 0.16 * scale,
                crown.y + math.sin(a) * 0.16 * scale,
                crown.z - 0.10 * scale,
            ),
        )
        coconut = bpy.context.object
        coconut.name = "Coconut"
        coconut.data.materials.append(COCONUT)
        remember(coconut)

def add_island(cx, cy, rx, ry, palms, rocks, seed):
    rng = random.Random(SEED + seed)

    # Three shoreline layers give a readable beach edge from racing distance.
    polar_blob(f"WetSand_{seed}", cx, cy, rx * 1.08, ry * 1.08, -0.42, 0.26, SAND_DARK, seed * 17 + 1, irregularity=0.18)
    polar_blob(f"DrySand_{seed}", cx, cy, rx, ry, -0.25, 0.34, SAND_LIGHT, seed * 17 + 2, irregularity=0.15)
    polar_blob(f"Grass_{seed}", cx, cy, rx * 0.68, ry * 0.65, 0.02, 0.28, GRASS, seed * 17 + 3, irregularity=0.10)
    polar_blob(f"GrassCore_{seed}", cx + rx * 0.05, cy - ry * 0.04, rx * 0.44, ry * 0.42, 0.16, 0.18, GRASS_DARK, seed * 17 + 4, irregularity=0.08)

    for i in range(palms):
        a = rng.uniform(0, math.tau)
        r = rng.uniform(0.14, 0.54)
        px = cx + math.cos(a) * rx * r
        py = cy + math.sin(a) * ry * r
        add_palm((px, py, 0.30), rng.uniform(0.78, 1.18), a + i * 0.4, seed * 101 + i)

    for i in range(rocks):
        a = rng.uniform(0, math.tau)
        r = rng.uniform(0.78, 1.03)
        px = cx + math.cos(a) * rx * r
        py = cy + math.sin(a) * ry * r
        add_rock(px, py, -0.02, rng.uniform(0.28, 0.62), seed * 233 + i)

def setup_assets():
    clear_scene()
    # Deliberately asymmetrical kit: different silhouettes instead of three discs in a row.
    add_island(-6.8, 1.6, 5.4, 3.4, palms=5, rocks=7, seed=1)
    add_island(1.1, -1.0, 3.7, 2.8, palms=3, rocks=5, seed=2)
    add_island(7.2, 2.5, 2.8, 2.0, palms=2, rocks=4, seed=3)

def export_assets():
    bpy.ops.object.select_all(action="DESELECT")
    for obj in ASSET_OBJECTS:
        obj.select_set(True)
    if ASSET_OBJECTS:
        bpy.context.view_layer.objects.active = ASSET_OBJECTS[0]
    glb_path = os.path.join(OUT_DIR, "tropical_island_kit.glb")
    bpy.ops.export_scene.gltf(
        filepath=glb_path,
        export_format="GLB",
        export_apply=True,
        export_yup=True,
        use_selection=True,
    )
    return glb_path

def setup_preview():
    bpy.ops.mesh.primitive_plane_add(size=70, location=(0, 0, -0.58))
    water = bpy.context.object
    water.name = "PreviewWater"
    water.data.materials.append(WATER)

    bpy.ops.object.camera_add(location=(17.5, -24.5, 12.5))
    cam = bpy.context.object
    bpy.context.scene.camera = cam
    direction = Vector((0.2, 0.8, 0.7)) - cam.location
    cam.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
    cam.data.lens = 50

    scene = bpy.context.scene
    scene.render.resolution_x = 1280
    scene.render.resolution_y = 720
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = False
    scene.world.color = (0.055, 0.20, 0.31)
    scene.render.engine = "BLENDER_WORKBENCH"
    if hasattr(scene, "display"):
        scene.display.shading.light = "STUDIO"
        scene.display.shading.color_type = "MATERIAL"
        scene.display.shading.show_shadows = True
        scene.display.shading.show_cavity = True
        scene.display.shading.cavity_type = "WORLD"
        scene.display.shading.show_specular_highlight = True
    return scene

setup_assets()
glb_path = export_assets()
scene = setup_preview()
png_path = os.path.join(OUT_DIR, "tropical_island_preview.png")
scene.render.filepath = png_path
bpy.ops.render.render(write_still=True)

print("JETSKI_ASSET_OK")
print(glb_path)
print(png_path)
