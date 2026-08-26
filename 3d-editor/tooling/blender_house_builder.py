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
    """Initializes the PBR material catalog matching the website & landscape taxonomy."""
    return {
        "white_plaster": create_pbr_material("Mat_WhitePlaster", "#faf6f0", roughness=0.85),
        "wood_timber": create_pbr_material("Mat_WoodTimber", "#c58c3a", roughness=0.55),
        "dpk_decking": create_pbr_material("Mat_DPKDecking", "#c26d38", roughness=0.5),
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
        "water": create_pbr_material("Mat_Water", "#5b9bd5", roughness=0.1, is_water=True),
        "asphalt_paver": create_pbr_material("Mat_Asphalt", "#2b2b2b", roughness=0.85),
        "pavers": create_pbr_material("Mat_Pavers", "#8c8c8c", roughness=0.8),
        "concrete_slab": create_pbr_material("Mat_ConcreteSlab", "#d4d4d4", roughness=0.7),
        "gravel": create_pbr_material("Mat_GraniteGravel", "#9ca3af", roughness=0.9),
        "foliage_pine": create_pbr_material("Mat_FoliagePine", "#1a4329", roughness=0.7),
        "foliage_thuja": create_pbr_material("Mat_FoliageThuja", "#165b33", roughness=0.75),
        "foliage_deciduous": create_pbr_material("Mat_FoliageDeciduous", "#4d7c0f", roughness=0.8),
        "foliage_barberry": create_pbr_material("Mat_FoliageBarberry", "#881337", roughness=0.8),
        "foliage_lavender": create_pbr_material("Mat_FoliageLavender", "#7c3aed", roughness=0.85),
        "trunk_bark": create_pbr_material("Mat_TrunkBark", "#422006", roughness=0.9),
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


def setup_lighting_and_camera(bounds_center=(0, 0, 0), scene_radius=18.0):
    """Sets up realistic sunlight, ambient sky, and isometric presentation camera."""
    # 0. World Environment Sky Lighting
    world = bpy.context.scene.world
    if not world:
        world = bpy.data.worlds.new("ArchVizWorld")
        bpy.context.scene.world = world
    world.use_nodes = True
    bg_node = world.node_tree.nodes.get("Background")
    if bg_node:
        bg_node.inputs['Color'].default_value = (0.75, 0.85, 0.98, 1.0) # Soft blue sky
        bg_node.inputs['Strength'].default_value = 1.5

    # 1. Sun Light
    sun_data = bpy.data.lights.new(name="SunLight", type='SUN')
    sun_data.energy = 6.5
    sun_data.color = (1.0, 0.97, 0.92)
    sun_data.angle = math.radians(2.0)
    sun_obj = bpy.data.objects.new("Sun", sun_data)
    sun_obj.location = (bounds_center[0] + 20, bounds_center[1] - 25, 30)
    sun_obj.rotation_euler = (math.radians(50), math.radians(20), math.radians(35))
    bpy.context.collection.objects.link(sun_obj)

    # 2. Camera with precise Look-At Target
    target = bpy.data.objects.new("CamTarget", None)
    target.location = (bounds_center[0], bounds_center[1], bounds_center[2] + 1.2)
    bpy.context.collection.objects.link(target)

    cam_data = bpy.data.cameras.new(name="ArchVizCam")
    cam_data.lens = 45
    cam_data.clip_start = 0.1
    cam_data.clip_end = 500
    cam_obj = bpy.data.objects.new("Camera", cam_data)
    
    # Position camera at front-south 3/4 perspective
    cam_obj.location = (bounds_center[0] - scene_radius * 0.3, bounds_center[1] - scene_radius * 1.4, bounds_center[2] + scene_radius * 1.1)
    
    track = cam_obj.constraints.new(type='TRACK_TO')
    track.target = target
    track.track_axis = 'TRACK_NEGATIVE_Z'
    track.up_axis = 'UP_Y'

    bpy.context.collection.objects.link(cam_obj)
    bpy.context.scene.camera = cam_obj


def build_procedural_tree(plant_data, materials):
    """Builds realistic 3D tree/shrub geometry matching dendro species."""
    pos = plant_data.get('position', [0, 0])
    px, py = float(pos[0]), float(pos[1])
    crown_d = float(plant_data.get('crown_diameter_m', 2.5))
    crown_r = max(0.4, crown_d / 2.0)
    height = float(plant_data.get('height_m', 3.0))
    species = str(plant_data.get('species', plant_data.get('species_ru', 'thuja'))).lower()

    # 1. Thuja / Pyramidal conifer (Туя Смарагд)
    if 'thuja' in species or 'туя' in species:
        foliage_mat = materials.get('foliage_thuja', materials['foliage_pine'])
        bpy.ops.mesh.primitive_cone_add(
            vertices=12,
            radius1=crown_r,
            radius2=0.05,
            depth=height,
            location=(px, py, height / 2.0)
        )
        tree_obj = bpy.context.active_object
        tree_obj.name = f"Tree_Thuja_{px:.1f}_{py:.1f}"
        if foliage_mat:
            tree_obj.data.materials.append(foliage_mat)
        return tree_obj

    # 2. Pine / Spherical conifer (Сосна «Нана»)
    elif 'pine' in species or 'сосн' in species or 'pinus' in species:
        foliage_mat = materials.get('foliage_pine', materials['foliage_pine'])
        trunk_mat = materials.get('trunk_bark', materials['dark_wood'])
        
        # Trunk
        bpy.ops.mesh.primitive_cylinder_add(
            vertices=8,
            radius=0.12,
            depth=height * 0.4,
            location=(px, py, height * 0.2)
        )
        trunk_obj = bpy.context.active_object
        if trunk_mat:
            trunk_obj.data.materials.append(trunk_mat)

        # Flattened spherical crown
        bpy.ops.mesh.primitive_uv_sphere_add(
            segments=12,
            ring_count=8,
            radius=crown_r,
            location=(px, py, height * 0.65)
        )
        crown_obj = bpy.context.active_object
        crown_obj.name = f"Tree_Pine_{px:.1f}_{py:.1f}"
        crown_obj.scale = (1.0, 1.0, 0.7)
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        if foliage_mat:
            crown_obj.data.materials.append(foliage_mat)
        return crown_obj

    # 3. Barberry / Red Shrub (Барбарис)
    elif 'barberry' in species or 'барбарис' in species or 'berberis' in species:
        foliage_mat = materials.get('foliage_barberry', materials['foliage_deciduous'])
        bpy.ops.mesh.primitive_uv_sphere_add(
            segments=10,
            ring_count=6,
            radius=crown_r,
            location=(px, py, crown_r * 0.8)
        )
        bush_obj = bpy.context.active_object
        bush_obj.name = f"Bush_Barberry_{px:.1f}_{py:.1f}"
        if foliage_mat:
            bush_obj.data.materials.append(foliage_mat)
        return bush_obj

    # 4. Lavender / Perennial Clump (Лаванда)
    elif 'lavender' in species or 'лаванда' in species or 'nepeta' in species or 'котовник' in species:
        foliage_mat = materials.get('foliage_lavender', materials['foliage_deciduous'])
        bpy.ops.mesh.primitive_uv_sphere_add(
            segments=8,
            ring_count=6,
            radius=crown_r,
            location=(px, py, crown_r * 0.6)
        )
        lav_obj = bpy.context.active_object
        lav_obj.name = f"Perennial_Lavender_{px:.1f}_{py:.1f}"
        lav_obj.scale = (1.0, 1.0, 0.5)
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        if foliage_mat:
            lav_obj.data.materials.append(foliage_mat)
        return lav_obj

    # 5. Deciduous (Дёрен белый / Спирея / Лиственные)
    else:
        foliage_mat = materials.get('foliage_deciduous', materials['grass_lawn'])
        trunk_mat = materials.get('trunk_bark', materials['dark_wood'])
        bpy.ops.mesh.primitive_cylinder_add(
            vertices=8,
            radius=0.08,
            depth=height * 0.35,
            location=(px, py, height * 0.17)
        )
        trunk = bpy.context.active_object
        if trunk_mat:
            trunk.data.materials.append(trunk_mat)

        bpy.ops.mesh.primitive_uv_sphere_add(
            segments=12,
            ring_count=8,
            radius=crown_r,
            location=(px, py, height * 0.6)
        )
        crown = bpy.context.active_object
        crown.name = f"Tree_Deciduous_{px:.1f}_{py:.1f}"
        if foliage_mat:
            crown.data.materials.append(foliage_mat)
        return crown


def assemble_scene_from_json(json_path, output_glb_path, render_image_path=None):
    """Main pipeline execution: loads JSON, builds geometry, and exports GLB."""
    print(f"🚀 [Blender] Loading floorplan data from: {json_path}")
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    clear_scene()
    materials = setup_materials_catalog()

    # 1. Build Site Elements & Paving Zones
    site_elems = data.get('siteElements', [])
    paving_zones = data.get('pavingZones', [])
    all_ground_elems = list(site_elems) + list(paving_zones)

    for elem in all_ground_elems:
        mat_key = elem.get('material', 'concrete_slab')
        if 'dpk' in mat_key or 'decking' in elem.get('type', '') or 'wood' in mat_key:
            mat_key = 'dpk_decking'
        elif 'gravel' in mat_key:
            mat_key = 'gravel'
        elif 'paver' in mat_key or 'parking' in elem.get('type', ''):
            mat_key = 'asphalt_paver'
        
        mat = materials.get(mat_key, materials['concrete_slab'])
        poly = elem.get('polygon', [])
        if len(poly) >= 3:
            thickness = 1.5 if elem.get('type') == 'water' else 0.1
            z_pos = -0.05 if elem.get('type') == 'ground' else 0.0
            build_polygon_slab(f"Site_{elem.get('id', 'slab')}", poly, z_pos, thickness, mat)

    # 1.1 Build MAF Elements (Pools, Hot Tubs, Pergolas, BBQ)
    for maf in data.get('mafElements', []):
        pos = maf.get('position', [0, 0])
        dims = maf.get('dimensions', [4, 4])
        px, py = float(pos[0]), float(pos[1])
        w, d = float(dims[0]), float(dims[1])
        poly = [[px, py], [px + w, py], [px + w, py + d], [px, py + d]]
        m_type = maf.get('type', 'generic')
        if m_type == 'pool':
            build_polygon_slab(f"MAF_{maf.get('id')}", poly, 0.0, 1.5, materials['water'])
        else:
            build_polygon_slab(f"MAF_{maf.get('id')}", poly, 0.0, 0.4, materials['concrete_slab'])

    # 2. Build Buildings
    for bldg in data.get('buildings', []):
        facade_mat_key = bldg.get('facadeMaterial', 'white_plaster')
        facade_mat = materials.get(facade_mat_key, materials['white_plaster'])
        walls = bldg.get('walls', [])

        if walls:
            # Walls & Openings
            wall_objs = {}
            for w_data in walls:
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
            roof_mat_key = bldg.get('roof', {}).get('material', 'charcoal_tile') if isinstance(bldg.get('roof'), dict) else 'charcoal_tile'
            roof_mat = materials.get(roof_mat_key, materials['charcoal_tile'])
            build_gable_roof(bldg, roof_mat)
        else:
            # Solid Polygonal Building
            b_poly = bldg.get('polygon', [])
            if not b_poly and 'origin' in bldg and 'dimensions' in bldg:
                ox, oy = float(bldg['origin'][0]), float(bldg['origin'][1])
                bw, bd = float(bldg['dimensions'][0]), float(bldg['dimensions'][1])
                b_poly = [[ox, oy], [ox + bw, oy], [ox + bw, oy + bd], [ox, oy + bd]]
            
            if len(b_poly) >= 3:
                b_height = float(bldg.get('height', 3.0))
                build_polygon_slab(f"Building_{bldg.get('id')}", b_poly, 0.0, b_height, facade_mat)

    # 3. Build Procedural Plants (Trees, Shrubs, Perennials)
    for plant_data in data.get('plants', []):
        build_procedural_tree(plant_data, materials)

    # 3.1 Calculate True Dynamic Bounding Box from Geometry Vertices
    import mathutils
    all_meshes = [obj for obj in bpy.context.scene.objects if obj.type == 'MESH']
    if all_meshes:
        xs, ys, zs = [], [], []
        for obj in all_meshes:
            for v in obj.bound_box:
                world_v = obj.matrix_world @ mathutils.Vector(v)
                xs.append(world_v.x)
                ys.append(world_v.y)
                zs.append(world_v.z)
        min_x, max_x = min(xs), max(xs)
        min_y, max_y = min(ys), max(ys)
        min_z, max_z = min(zs), max(zs)
        cx = (min_x + max_x) / 2.0
        cy = (min_y + max_y) / 2.0
        cz = (min_z + max_z) / 2.0
        radius = max(max_x - min_x, max_y - min_y, 18.0)
        bounds_center = (cx, cy, cz)
    else:
        bounds_center = (0.0, 0.0, 0.0)
        radius = 25.0

    # 3.2 Environment & Lighting
    setup_lighting_and_camera(bounds_center=bounds_center, scene_radius=radius)

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
        try:
            bpy.context.scene.render.engine = 'CYCLES'
            bpy.context.scene.cycles.device = 'CPU'
            bpy.context.scene.cycles.samples = 32
            bpy.context.scene.render.image_settings.file_format = 'PNG'
            bpy.context.scene.render.filepath = render_image_path
            bpy.context.scene.render.resolution_x = 1280
            bpy.context.scene.render.resolution_y = 720
            bpy.ops.render.render(write_still=True)
            print("✅ [Blender] Render image saved!")
        except Exception as e:
            print(f"⚠️ [Blender] Headless render skipped: {e}")


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
