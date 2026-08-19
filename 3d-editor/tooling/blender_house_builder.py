#!/usr/bin/env python3
"""
Blender Headless Automated 3D BIM House & Site Plan Generator
Executes in background mode: blender -b -P blender_house_builder.py -- --input layout.json --output model.glb

Transforms structured 2D architectural JSON from Copilot into a full 3D PBR GLB model.
"""

import sys
import os
import json
import math

try:
    import bpy
    import mathutils
    import bmesh
except ImportError:
    # If executed with regular python, inform user to run via blender
    print("This script must be executed via Blender: blender --background --python blender_house_builder.py -- [args]")
    sys.exit(0)


def clear_scene():
    """Removes default cube, cameras, and lights from Blender startup file."""
    bpy.ops.wm.read_factory_settings(use_empty=True)
    for collection in bpy.data.collections:
        bpy.data.collections.remove(collection)
    
    # Configure Metric Scene Units
    scene = bpy.context.scene
    scene.unit_settings.system = 'METRIC'
    scene.unit_settings.scale_length = 1.0
    scene.unit_settings.length_unit = 'METERS'


def create_pbr_material(name, color_hex, roughness=0.5, metallic=0.0, is_glass=False, is_water=False):
    """Creates a photorealistic Principled BSDF PBR material."""
    mat = bpy.data.materials.get(name)
    if mat:
        return mat

    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    nodes.clear()

    output_node = nodes.new(type='ShaderNodeOutputMaterial')
    output_node.location = (400, 0)

    bsdf = nodes.new(type='ShaderNodeBsdfPrincipled')
    bsdf.location = (0, 0)

    # Convert Hex to RGBA
    hex_clean = color_hex.lstrip('#')
    r = int(hex_clean[0:2], 16) / 255.0
    g = int(hex_clean[2:4], 16) / 255.0
    b = int(hex_clean[4:6], 16) / 255.0
    
    # sRGB to linear conversion for accurate Blender rendering
    def srgb_to_lin(c):
        return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4

    linear_rgba = (srgb_to_lin(r), srgb_to_lin(g), srgb_to_lin(b), 1.0)

    bsdf.inputs['Base Color'].default_value = linear_rgba
    bsdf.inputs['Roughness'].default_value = roughness
    bsdf.inputs['Metallic'].default_value = metallic

    if is_glass:
        if 'Transmission Weight' in bsdf.inputs:
            bsdf.inputs['Transmission Weight'].default_value = 0.95
        elif 'Transmission' in bsdf.inputs:
            bsdf.inputs['Transmission'].default_value = 0.95
        bsdf.inputs['IOR'].default_value = 1.5
        bsdf.inputs['Roughness'].default_value = 0.05
        mat.blend_method = 'BLEND'
    elif is_water:
        if 'Transmission Weight' in bsdf.inputs:
            bsdf.inputs['Transmission Weight'].default_value = 0.9
        elif 'Transmission' in bsdf.inputs:
            bsdf.inputs['Transmission'].default_value = 0.9
        bsdf.inputs['IOR'].default_value = 1.333
        bsdf.inputs['Roughness'].default_value = 0.1
        mat.blend_method = 'BLEND'

    links.new(bsdf.outputs['BSDF'], output_node.inputs['Surface'])
    return mat


def setup_materials_catalog():
    """Initializes the PBR material catalog matching the website."""
    return {
        "white_plaster": create_pbr_material("Mat_WhitePlaster", "#faf6f0", roughness=0.85),
        "wood_timber": create_pbr_material("Mat_WoodTimber", "#c58c3a", roughness=0.55),
        "red_brick": create_pbr_material("Mat_RedBrick", "#9e3b34", roughness=0.8),
        "dark_wood": create_pbr_material("Mat_DarkWood", "#3e2d27", roughness=0.45),
        "charcoal_tile": create_pbr_material("Mat_RoofCharcoal", "#242424", roughness=0.4, metallic=0.15),
        "terracotta_tile": create_pbr_material("Mat_RoofTerracotta", "#bf573f", roughness=0.65),
        "glass": create_pbr_material("Mat_WindowGlass", "#a8c0d0", roughness=0.05, is_glass=True),
        "window_frame": create_pbr_material("Mat_WindowFrame", "#1f2937", roughness=0.3, metallic=0.8),
        "door_wood": create_pbr_material("Mat_DoorWood", "#4a3528", roughness=0.5),
        "parquet": create_pbr_material("Mat_FloorParquet", "#be9b7b", roughness=0.45),
        "ceramic_tile": create_pbr_material("Mat_FloorTile", "#e2e8f0", roughness=0.25),
        "grass_lawn": create_pbr_material("Mat_GrassLawn", "#2e5339", roughness=0.9),
        "pool_water": create_pbr_material("Mat_PoolWater", "#5b9bd5", roughness=0.1, is_water=True),
        "asphalt_paver": create_pbr_material("Mat_Asphalt", "#2b2b2b", roughness=0.85),
        "concrete_slab": create_pbr_material("Mat_ConcreteSlab", "#d4d4d4", roughness=0.7),
    }


def build_wall_mesh(wall_data, facade_mat):
    """Builds an accurate 3D wall segment from 2D coordinates."""
    x1, y1 = wall_data['start']
    x2, y2 = wall_data['end']
    thick = wall_data.get('thickness', 0.3)
    height = wall_data.get('height', 3.0)

    dx = x2 - x1
    dy = y2 - y1
    length = math.sqrt(dx * dx + dy * dy)
    if length < 0.001:
        return None

    angle = math.atan2(dy, dx)
    cx = (x1 + x2) / 2.0
    cy = (y1 + y2) / 2.0
    cz = height / 2.0

    # Create box mesh
    bpy.ops.mesh.primitive_cube_add(
        size=1.0,
        location=(cx, cy, cz),
        rotation=(0, 0, angle)
    )
    wall_obj = bpy.context.active_object
    wall_obj.name = f"Wall_{wall_data.get('id', 'w')}"
    wall_obj.scale = (length, thick, height)
    
    # Apply transform scale for proper UV & boolean modifiers
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)

    if facade_mat:
        wall_obj.data.materials.append(facade_mat)

    return wall_obj


def cut_opening_in_wall(wall_obj, wall_data, opening_data, materials):
    """Creates a boolean cut for door/window and inserts realistic frame & glass."""
    x1, y1 = wall_data['start']
    x2, y2 = wall_data['end']
    dx = x2 - x1
    dy = y2 - y1
    wall_len = math.sqrt(dx * dx + dy * dy)
    angle = math.atan2(dy, dx)

    pos_m = opening_data.get('positionFromStart', wall_len * opening_data.get('positionRatio', 0.5))
    width = opening_data.get('width', 1.2)
    height = opening_data.get('height', 1.4)
    sill = opening_data.get('sillHeight', 0.9 if opening_data.get('type') == 'window' else 0.0)
    thick = wall_data.get('thickness', 0.3) + 0.1  # slightly thicker for clean boolean cut

    # Opening center in local wall space along length
    frac = pos_m / wall_len if wall_len > 0 else 0.5
    ox = x1 + dx * frac
    oy = y1 + dy * frac
    oz = sill + height / 2.0

    # 1. Boolean Cutter Box
    bpy.ops.mesh.primitive_cube_add(
        size=1.0,
        location=(ox, oy, oz),
        rotation=(0, 0, angle)
    )
    cutter = bpy.context.active_object
    cutter.name = f"Cutter_{opening_data.get('id')}"
    cutter.scale = (width, thick, height)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)

    # Boolean Modifier on Wall
    bool_mod = wall_obj.modifiers.new(name="BooleanCut", type='BOOLEAN')
    bool_mod.operation = 'DIFFERENCE'
    bool_mod.object = cutter
    bpy.context.view_layer.objects.active = wall_obj
    bpy.ops.object.modifier_apply(modifier=bool_mod.name)

    # Delete cutter object
    bpy.data.objects.remove(cutter, do_unlink=True)

    # 2. Insert Frame and Glass for Window / Door
    if opening_data.get('type') == 'window':
        # Window Frame
        bpy.ops.mesh.primitive_cube_add(
            size=1.0,
            location=(ox, oy, oz),
            rotation=(0, 0, angle)
        )
        frame = bpy.context.active_object
        frame.name = f"Frame_{opening_data.get('id')}"
        frame.scale = (width, 0.08, height)
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        frame.data.materials.append(materials['window_frame'])

        # Window Glass
        bpy.ops.mesh.primitive_cube_add(
            size=1.0,
            location=(ox, oy, oz),
            rotation=(0, 0, angle)
        )
        glass = bpy.context.active_object
        glass.name = f"Glass_{opening_data.get('id')}"
        glass.scale = (width - 0.1, 0.02, height - 0.1)
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        glass.data.materials.append(materials['glass'])

    elif opening_data.get('type') == 'door':
        # Door Leaf
        bpy.ops.mesh.primitive_cube_add(
            size=1.0,
            location=(ox, oy, oz),
            rotation=(0, 0, angle)
        )
        door = bpy.context.active_object
        door.name = f"DoorLeaf_{opening_data.get('id')}"
        door.scale = (width, 0.06, height)
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        door.data.materials.append(materials['door_wood'])


def build_gable_roof(building, roof_mat):
    """Builds a parametric gable or hip roof with eaves overhang."""
    walls = building.get('walls', [])
    if not walls:
        return None

    roof_cfg = building.get('roof', {})
    wall_height = building.get('wallHeight', 3.0)
    overhang = roof_cfg.get('overhang', 0.5)
    slope_deg = roof_cfg.get('slopeDeg', 25.0)

    # Compute bounding box of the building
    xs = [w['start'][0] for w in walls] + [w['end'][0] for w in walls]
    ys = [w['start'][1] for w in walls] + [w['end'][1] for w in walls]
    min_x, max_x = min(xs) - overhang, max(xs) + overhang
    min_y, max_y = min(ys) - overhang, max(ys) + overhang

    w = max_x - min_x
    d = max_y - min_y
    ridge_axis = roof_cfg.get('ridgeAxis', 'X' if w >= d else 'Y')

    slope_rad = math.radians(slope_deg)
    ridge_h = (d / 2.0 if ridge_axis == 'X' else w / 2.0) * math.tan(slope_rad)
    base_z = wall_height

    mesh = bpy.data.meshes.new(f"RoofMesh_{building['id']}")
    obj = bpy.data.objects.new(f"Roof_{building['id']}", mesh)
    bpy.context.collection.objects.link(obj)

    bm = bmesh.new()

    if ridge_axis == 'X':
        mid_y = (min_y + max_y) / 2.0
        v1 = bm.verts.new((min_x, min_y, base_z))
        v2 = bm.verts.new((max_x, min_y, base_z))
        v3 = bm.verts.new((max_x, mid_y, base_z + ridge_h))
        v4 = bm.verts.new((min_x, mid_y, base_z + ridge_h))
        v5 = bm.verts.new((max_x, max_y, base_z))
        v6 = bm.verts.new((min_x, max_y, base_z))

        bm.faces.new((v1, v2, v3, v4))  # South pitch
        bm.faces.new((v4, v3, v5, v6))  # North pitch
        bm.faces.new((v1, v4, v6))      # West gable
        bm.faces.new((v2, v5, v3))      # East gable
    else:
        mid_x = (min_x + max_x) / 2.0
        v1 = bm.verts.new((min_x, min_y, base_z))
        v2 = bm.verts.new((mid_x, min_y, base_z + ridge_h))
        v3 = bm.verts.new((max_x, min_y, base_z))
        v4 = bm.verts.new((max_x, max_y, base_z))
        v5 = bm.verts.new((mid_x, max_y, base_z + ridge_h))
        v6 = bm.verts.new((min_x, max_y, base_z))

        bm.faces.new((v1, v2, v5, v6))  # West pitch
        bm.faces.new((v3, v4, v5, v2))  # East pitch
        bm.faces.new((v1, v6, v2))      # South gable
        bm.faces.new((v3, v2, v5, v4))  # North gable

    bm.to_mesh(mesh)
    bm.free()

    # Add Solidify modifier for realistic roofing thickness
    solid_mod = obj.modifiers.new(name="Solidify", type='SOLIDIFY')
    solid_mod.thickness = 0.15
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.modifier_apply(modifier=solid_mod.name)

    if roof_mat:
        obj.data.materials.append(roof_mat)

    return obj


def build_column(col_data, col_mat):
    """Builds a structural support column (e.g. for terrace, porch or gazebo)."""
    x, y = col_data['position']
    h = col_data.get('height', 3.0)
    w = col_data.get('width', 0.25)
    d = col_data.get('depth', 0.25)

    bpy.ops.mesh.primitive_cube_add(
        size=1.0,
        location=(x, y, h / 2.0)
    )
    col_obj = bpy.context.active_object
    col_obj.name = f"Column_{col_data.get('id', 'col')}"
    col_obj.scale = (w, d, h)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)

    if col_mat:
        col_obj.data.materials.append(col_mat)
    return col_obj


def build_polygon_slab(name, polygon, z_level, thickness, material):
    """Builds a floor slab, pool basin, or grass ground polygon."""
    if len(polygon) < 3:
        return None

    mesh = bpy.data.meshes.new(f"{name}_Mesh")
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)

    bm = bmesh.new()
    verts = [bm.verts.new((p[0], p[1], z_level)) for p in polygon]
    bm.faces.new(verts)
    bm.to_mesh(mesh)
    bm.free()

    # Extrude / Solidify
    solid_mod = obj.modifiers.new(name="Solidify", type='SOLIDIFY')
    solid_mod.thickness = thickness
    solid_mod.offset = -1.0  # extrude downwards
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.modifier_apply(modifier=solid_mod.name)

    if material:
        obj.data.materials.append(material)

    return obj


def setup_lighting_and_camera(bounds_center=(0, 0, 0), scene_radius=15.0):
    """Sets up realistic sunlight, ambient sky, and isometric presentation camera."""
    # 1. Sun Light
    sun_data = bpy.data.lights.new(name="SunLight", type='SUN')
    sun_data.energy = 4.5
    sun_data.color = (1.0, 0.96, 0.90)
    sun_obj = bpy.data.objects.new("Sun", sun_data)
    sun_obj.location = (bounds_center[0] + 15, bounds_center[1] - 15, 25)
    sun_obj.rotation_euler = (math.radians(50), math.radians(15), math.radians(45))
    bpy.context.collection.objects.link(sun_obj)

    # 2. Camera (3/4 ArchViz perspective view)
    cam_data = bpy.data.cameras.new(name="ArchVizCam")
    cam_data.lens = 50
    cam_obj = bpy.data.objects.new("Camera", cam_data)
    cam_dist = scene_radius * 2.2
    cam_obj.location = (bounds_center[0] - cam_dist * 0.7, bounds_center[1] - cam_dist * 0.7, cam_dist * 0.65)
    cam_obj.rotation_euler = (math.radians(60), 0, math.radians(-45))
    bpy.context.collection.objects.link(cam_obj)
    bpy.context.scene.camera = cam_obj


def assemble_scene_from_json(json_path, output_glb_path, render_image_path=None):
    """Main pipeline execution: loads JSON, builds geometry, and exports GLB."""
    print(f"🚀 [Blender] Loading floorplan data from: {json_path}")
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    clear_scene()
    materials = setup_materials_catalog()

    # 1. Build Site Elements (Lawn, Pool, Parking Slabs)
    for elem in data.get('siteElements', []):
        mat_key = elem.get('material', 'concrete_slab')
        mat = materials.get(mat_key, materials['concrete_slab'])
        poly = elem.get('polygon', [])
        thickness = 1.5 if elem.get('type') == 'water' else 0.1
        z_pos = -0.05 if elem.get('type') == 'ground' else 0.0
        build_polygon_slab(f"Site_{elem.get('id')}", poly, z_pos, thickness, mat)

    # 2. Build Buildings
    for bldg in data.get('buildings', []):
        facade_mat_key = bldg.get('facadeMaterial', 'white_plaster')
        facade_mat = materials.get(facade_mat_key, materials['white_plaster'])

        # Walls & Openings
        wall_objs = {}
        for w_data in bldg.get('walls', []):
            wall_obj = build_wall_mesh(w_data, facade_mat)
            if wall_obj:
                wall_objs[w_data.get('id')] = (wall_obj, w_data)

        for op_data in bldg.get('openings', []):
            wall_id = op_data.get('wallId')
            if wall_id in wall_objs:
                w_obj, w_data = wall_objs[wall_id]
                cut_opening_in_wall(w_obj, w_data, op_data, materials)

        # Columns
        for col_data in bldg.get('columns', []):
            col_mat_key = col_data.get('material', 'dark_wood')
            col_mat = materials.get(col_mat_key, materials['dark_wood'])
            build_column(col_data, col_mat)

        # Rooms / Floors
        for room in bldg.get('rooms', []):
            fl_mat_key = room.get('floorMaterial', 'parquet')
            fl_mat = materials.get(fl_mat_key, materials['parquet'])
            poly = room.get('polygon', [])
            build_polygon_slab(f"Floor_{room.get('id')}", poly, 0.01, 0.05, fl_mat)

        # Roof
        roof_mat_key = bldg.get('roof', {}).get('material', 'charcoal_tile')
        roof_mat = materials.get(roof_mat_key, materials['charcoal_tile'])
        build_gable_roof(bldg, roof_mat)

    # 3. Environment & Lighting
    setup_lighting_and_camera()

    # 4. Export GLB
    print(f"📦 [Blender] Exporting GLB 3D scene to: {output_glb_path}")
    os.makedirs(os.path.dirname(os.path.abspath(output_glb_path)), exist_ok=True)
    
    bpy.ops.export_scene.gltf(
        filepath=output_glb_path,
        export_format='GLB',
        use_selection=False,
        export_materials='EXPORT',
        export_apply=True,
        export_yup=True
    )
    print("✅ [Blender] GLB Export successfully completed!")

    # 5. Optional Photorealistic Render
    if render_image_path:
        print(f"📸 [Blender] Rendering high-res still image to: {render_image_path}")
        bpy.context.scene.render.image_settings.file_format = 'PNG'
        bpy.context.scene.render.filepath = render_image_path
        bpy.context.scene.render.resolution_x = 1920
        bpy.context.scene.render.resolution_y = 1080
        bpy.ops.render.render(write_still=True)
        print("✅ [Blender] Render image saved!")


def parse_args():
    """Extracts custom script arguments passed after '--'."""
    args = sys.argv
    if '--' not in args:
        return None, None, None

    custom_args = args[args.index('--') + 1:]
    input_json = None
    output_glb = None
    render_img = None

    for i in range(len(custom_args)):
        if custom_args[i] in ('-i', '--input') and i + 1 < len(custom_args):
            input_json = custom_args[i + 1]
        elif custom_args[i] in ('-o', '--output') and i + 1 < len(custom_args):
            output_glb = custom_args[i + 1]
        elif custom_args[i] in ('-r', '--render') and i + 1 < len(custom_args):
            render_img = custom_args[i + 1]

    return input_json, output_glb, render_img


if __name__ == '__main__':
    in_json, out_glb, render_file = parse_args()
    if not in_json or not out_glb:
        print("Usage: blender -b -P blender_house_builder.py -- --input layout.json --output model.glb [--render preview.png]")
        sys.exit(1)

    assemble_scene_from_json(in_json, out_glb, render_file)
