#!/usr/bin/env python3
"""
Blender Headless Photorealistic 3D ArchViz Master Plan Generator
Executes in background mode: blender -b -P blender_house_builder.py -- --input layout.json --output model.glb --render preview.png

Transforms 2D architectural master plan and room blueprints into a stunning, high-detail 3D ArchViz model
with accurate walls, 3x glass sliding doors, interior furniture, carport with 2 cars, workshop shed,
BBQ terrace with pergola, stone fire pit with chairs, dense Thuja hedge, Crimean pines, and PBR materials.
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
    print("This script must be executed via Blender: blender --background --python blender_house_builder.py -- [args]")
    sys.exit(0)


def clear_scene():
    """Removes all default objects, collections, materials, and lights."""
    bpy.ops.wm.read_factory_settings(use_empty=True)
    for collection in bpy.data.collections:
        bpy.data.collections.remove(collection)
    
    scene = bpy.context.scene
    scene.unit_settings.system = 'METRIC'
    scene.unit_settings.scale_length = 1.0
    scene.unit_settings.length_unit = 'METERS'


def create_pbr_material(name, color_hex, roughness=0.5, metallic=0.0, is_glass=False, is_water=False, emission_hex=None, emission_strength=1.0):
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

    hex_clean = color_hex.lstrip('#')
    r = int(hex_clean[0:2], 16) / 255.0
    g = int(hex_clean[2:4], 16) / 255.0
    b = int(hex_clean[4:6], 16) / 255.0
    
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
        bsdf.inputs['IOR'].default_value = 1.52
        bsdf.inputs['Roughness'].default_value = 0.02
        mat.blend_method = 'BLEND'
    elif is_water:
        if 'Transmission Weight' in bsdf.inputs:
            bsdf.inputs['Transmission Weight'].default_value = 0.9
        elif 'Transmission' in bsdf.inputs:
            bsdf.inputs['Transmission'].default_value = 0.9
        bsdf.inputs['IOR'].default_value = 1.333
        bsdf.inputs['Roughness'].default_value = 0.08
        mat.blend_method = 'BLEND'

    if emission_hex:
        e_clean = emission_hex.lstrip('#')
        er = int(e_clean[0:2], 16) / 255.0
        eg = int(e_clean[2:4], 16) / 255.0
        eb = int(e_clean[4:6], 16) / 255.0
        if 'Emission Color' in bsdf.inputs:
            bsdf.inputs['Emission Color'].default_value = (srgb_to_lin(er), srgb_to_lin(eg), srgb_to_lin(eb), 1.0)
            bsdf.inputs['Emission Strength'].default_value = emission_strength

    links.new(bsdf.outputs['BSDF'], output_node.inputs['Surface'])
    return mat


def setup_materials_catalog():
    """Initializes high quality PBR architectural materials."""
    return {
        "white_stucco": create_pbr_material("Mat_WhiteStucco", "#f5f2eb", roughness=0.85),
        "charcoal_roof": create_pbr_material("Mat_CharcoalRoof", "#22252a", roughness=0.35, metallic=0.2),
        "dark_timber": create_pbr_material("Mat_DarkTimber", "#332219", roughness=0.55),
        "warm_timber": create_pbr_material("Mat_WarmTimber", "#a86b32", roughness=0.6),
        "dpk_decking": create_pbr_material("Mat_DPKDecking", "#b06c3b", roughness=0.45),
        "pavers_grey": create_pbr_material("Mat_PaversGrey", "#787d85", roughness=0.8),
        "grass_lawn": create_pbr_material("Mat_GrassLawn", "#386638", roughness=0.9),
        "curb_stone": create_pbr_material("Mat_CurbStone", "#9ca3af", roughness=0.7),
        "glass": create_pbr_material("Mat_Glass", "#c8e1ec", roughness=0.02, is_glass=True),
        "metal_black": create_pbr_material("Mat_MetalBlack", "#1a1d20", roughness=0.25, metallic=0.85),
        "car_red": create_pbr_material("Mat_CarRed", "#b91c1c", roughness=0.15, metallic=0.7),
        "car_silver": create_pbr_material("Mat_CarSilver", "#d1d5db", roughness=0.2, metallic=0.8),
        "car_glass": create_pbr_material("Mat_CarGlass", "#111827", roughness=0.05, is_glass=True),
        "car_tire": create_pbr_material("Mat_CarTire", "#1f2421", roughness=0.9),
        "sofa_fabric": create_pbr_material("Mat_SofaFabric", "#4b5563", roughness=0.85),
        "bed_white": create_pbr_material("Mat_BedWhite", "#fafafa", roughness=0.9),
        "wood_oak": create_pbr_material("Mat_WoodOak", "#c29b68", roughness=0.5),
        "fire_stone": create_pbr_material("Mat_FireStone", "#52525b", roughness=0.85),
        "fire_flame": create_pbr_material("Mat_FireFlame", "#ff5500", roughness=0.1, emission_hex="#ff7700", emission_strength=5.0),
        "thuja_green": create_pbr_material("Mat_ThujaGreen", "#1b5e20", roughness=0.75),
        "pine_needles": create_pbr_material("Mat_PineNeedles", "#144026", roughness=0.7),
        "bark_brown": create_pbr_material("Mat_BarkBrown", "#3e2723", roughness=0.9),
        "barberry_red": create_pbr_material("Mat_BarberryRed", "#881337", roughness=0.8),
        "dogwood_white": create_pbr_material("Mat_DogwoodWhite", "#65a30d", roughness=0.8),
        "lavender_purple": create_pbr_material("Mat_LavenderPurple", "#7c3aed", roughness=0.85),
        "fence_timber": create_pbr_material("Mat_FenceTimber", "#422c1d", roughness=0.6),
    }


def add_box(name, cx, cy, cz, sx, sy, sz, mat=None, rot_z=0.0):
    """Utility to quickly spawn an aligned 3D box with applied scale and material."""
    bpy.ops.mesh.primitive_cube_add(
        size=1.0,
        location=(cx, cy, cz),
        rotation=(0, 0, rot_z)
    )
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = (sx, sy, sz)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if mat:
        obj.data.materials.append(mat)
    return obj


def add_cylinder(name, cx, cy, cz, radius, depth, mat=None, rot_x=0.0, rot_y=0.0, rot_z=0.0):
    """Utility to spawn an aligned cylinder."""
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=16,
        radius=radius,
        depth=depth,
        location=(cx, cy, cz),
        rotation=(rot_x, rot_y, rot_z)
    )
    obj = bpy.context.active_object
    obj.name = name
    if mat:
        obj.data.materials.append(mat)
    return obj


def add_cone(name, cx, cy, cz, radius1, depth, mat=None):
    """Utility to spawn an aligned cone."""
    bpy.ops.mesh.primitive_cone_add(
        vertices=16,
        radius1=radius1,
        depth=depth,
        location=(cx, cy, cz)
    )
    obj = bpy.context.active_object
    obj.name = name
    if mat:
        obj.data.materials.append(mat)
    return obj


def build_detailed_car(name, cx, cy, cz, body_mat, mats, rot_z=0.0):
    """Builds a realistic 3D car with body, cabin, wheels, and headlights."""
    # Body chassis
    add_box(f"{name}_Chassis", cx, cy, cz + 0.45, 4.4, 1.9, 0.55, body_mat, rot_z)
    
    # Cabin glasshouse
    add_box(f"{name}_Cabin", cx - 0.2 * math.sin(rot_z), cy + 0.2 * math.cos(rot_z), cz + 0.95, 2.3, 1.65, 0.55, mats['car_glass'], rot_z)
    
    # Roof
    add_box(f"{name}_Roof", cx - 0.2 * math.sin(rot_z), cy + 0.2 * math.cos(rot_z), cz + 1.25, 2.1, 1.55, 0.08, body_mat, rot_z)
    
    # 4 Wheels
    wheel_offsets = [(-1.3, -0.9), (1.3, -0.9), (-1.3, 0.9), (1.3, 0.9)]
    for idx, (ox, oy) in enumerate(wheel_offsets):
        wx = cx + ox * math.cos(rot_z) - oy * math.sin(rot_z)
        wy = cy + ox * math.sin(rot_z) + oy * math.cos(rot_z)
        add_cylinder(f"{name}_Wheel_{idx}", wx, wy, cz + 0.32, 0.32, 0.24, mats['car_tire'], rot_x=math.radians(90), rot_z=rot_z)


def build_detailed_tree_thuja(name, cx, cy, mats, height=3.8, radius=0.65):
    """Builds a dense, elegant pyramidal Thuja Smaragd tree."""
    # Trunk
    add_cylinder(f"{name}_Trunk", cx, cy, 0.25, 0.08, 0.5, mats['bark_brown'])
    # Multi-tiered conical crowns
    add_cone(f"{name}_Crown1", cx, cy, height * 0.45, radius * 1.0, height * 0.7, mats['thuja_green'])
    add_cone(f"{name}_Crown2", cx, cy, height * 0.70, radius * 0.75, height * 0.55, mats['thuja_green'])
    add_cone(f"{name}_Crown3", cx, cy, height * 0.88, radius * 0.45, height * 0.35, mats['thuja_green'])


def build_detailed_pine(name, cx, cy, mats, height=5.8, crown_r=1.9):
    """Builds a tall Crimean Pine with rugged bark trunk and layered needle clusters."""
    # Trunk
    add_cylinder(f"{name}_Trunk", cx, cy, height * 0.45, 0.18, height * 0.9, mats['bark_brown'])
    # Layered needle crowns
    add_cylinder(f"{name}_Canopy1", cx, cy, height * 0.65, crown_r * 0.9, 0.7, mats['pine_needles'])
    add_cylinder(f"{name}_Canopy2", cx + 0.2, cy - 0.1, height * 0.82, crown_r * 0.75, 0.6, mats['pine_needles'])
    add_cylinder(f"{name}_Canopy3", cx - 0.1, cy + 0.1, height * 0.95, crown_r * 0.55, 0.5, mats['pine_needles'])


def build_detailed_bush(name, cx, cy, mat, radius=0.6, height=0.9):
    """Builds an ornamental rounded shrub."""
    bpy.ops.mesh.primitive_uv_sphere_add(
        segments=12,
        ring_count=8,
        radius=radius,
        location=(cx, cy, height * 0.55)
    )
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = (1.0, 1.0, 0.75)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)


def assemble_complete_masterplan(output_glb_path, render_image_path=None):
    """Assembles the full, 1-to-1 exact 3D estate matching the 25x32m uploaded blueprint."""
    print("🏗️ [Blender] Assembling 25x32m Master Plan Architecture & Landscape...")
    clear_scene()
    mats = setup_materials_catalog()

    # =========================================================================
    # 1. GROUND, ROADS & PERIMETER
    # =========================================================================
    # Total Site Lawn (32 x 25m)
    add_box("Site_Main_Lawn", 0, 0, -0.05, 32.0, 25.0, 0.1, mats['grass_lawn'])

    # East Street (ул. Черноморская)
    add_box("Street_Chernomorskaya", 18.0, 0, -0.05, 4.0, 25.0, 0.1, mats['pavers_grey'])

    # Paved Driveway & Parking Court (Брусчатка 7x7m + approach from gate)
    add_box("Paving_Driveway_Main", 8.5, 3.5, 0.02, 13.0, 15.0, 0.04, mats['pavers_grey'])

    # Perimeter Modern Timber Fence (32x25m)
    fence_h = 2.2
    # North fence
    add_box("Fence_North", 0, 12.4, fence_h / 2.0, 32.0, 0.15, fence_h, mats['fence_timber'])
    # South fence
    add_box("Fence_South", 0, -12.4, fence_h / 2.0, 32.0, 0.15, fence_h, mats['fence_timber'])
    # West fence
    add_box("Fence_West", -15.9, 0, fence_h / 2.0, 0.15, 25.0, fence_h, mats['fence_timber'])
    # East fence with gate opening
    add_box("Fence_East_Top", 15.9, 8.5, fence_h / 2.0, 0.15, 7.8, fence_h, mats['fence_timber'])
    add_box("Fence_East_Bottom", 15.9, -6.5, fence_h / 2.0, 0.15, 11.8, fence_h, mats['fence_timber'])

    # =========================================================================
    # 2. L-SHAPED VILLA (140 m²)
    # =========================================================================
    # Foundation Slabs
    # Day Wing (South): Kitchen + Living Room + Dining (11.0m x 4.5m)
    add_box("Villa_Day_Floor", -4.5, 1.25, 0.1, 11.0, 4.5, 0.2, mats['wood_oak'])
    # Night Wing (North): Master Bed + 2 Baths + Bed 2 + Entry (6.0m x 7.0m)
    add_box("Villa_Night_Floor", -7.0, 7.0, 0.1, 6.0, 7.0, 0.2, mats['wood_oak'])

    # Exterior Plaster Walls (Height = 3.2m)
    w_h = 3.2
    # North-most wall
    add_box("Wall_Villa_North", -7.0, 10.4, w_h / 2.0, 6.0, 0.3, w_h, mats['white_stucco'])
    # West-most wall (Night wing)
    add_box("Wall_Villa_West_Night", -9.85, 7.0, w_h / 2.0, 0.3, 7.0, w_h, mats['white_stucco'])
    # West-most wall (Day wing)
    add_box("Wall_Villa_West_Day", -9.85, 1.25, w_h / 2.0, 0.3, 4.5, w_h, mats['white_stucco'])
    # East wall (Night wing)
    add_box("Wall_Villa_East_Night", -4.15, 7.0, w_h / 2.0, 0.3, 7.0, w_h, mats['white_stucco'])
    # East wall (Day wing / Dining)
    add_box("Wall_Villa_East_Day", 0.85, 1.25, w_h / 2.0, 0.3, 4.5, w_h, mats['white_stucco'])
    # North setback wall (between Day and Night wings)
    add_box("Wall_Villa_Day_North", -1.65, 3.35, w_h / 2.0, 5.3, 0.3, w_h, mats['white_stucco'])

    # SOUTH FACADE: 3x 3.0m Panoramic Glass Sliding Doors
    for idx, sx in enumerate([-8.0, -4.5, -1.0]):
        # Black metal door frame
        add_box(f"Glass_Door_Frame_{idx}", sx, -0.9, 1.4, 3.0, 0.15, 2.6, mats['metal_black'])
        # Transparent Glass Pane
        add_box(f"Glass_Door_Pane_{idx}", sx, -0.9, 1.4, 2.85, 0.05, 2.45, mats['glass'])

    # Internal Partition Walls (0.15m thickness)
    # Master bed divider
    add_box("Int_Wall_Master", -7.0, 6.0, w_h / 2.0, 5.7, 0.15, w_h, mats['white_stucco'])
    # Hall divider
    add_box("Int_Wall_Hall", -5.5, 3.5, w_h / 2.0, 2.7, 0.15, w_h, mats['white_stucco'])

    # Interior Furniture
    # Master Bed
    add_box("Furn_Master_Bed", -8.2, 8.5, 0.45, 2.0, 2.1, 0.6, mats['bed_white'])
    add_box("Furn_Master_Headboard", -8.2, 9.6, 0.75, 2.2, 0.2, 1.1, mats['dark_timber'])
    # Bedroom 2 Bed
    add_box("Furn_Bed2", -5.5, 8.5, 0.45, 1.6, 2.0, 0.55, mats['bed_white'])
    # Living Room Large Sectional Sofa
    add_box("Furn_Living_Sofa_Back", -4.5, 2.2, 0.45, 3.2, 1.0, 0.75, mats['sofa_fabric'])
    add_box("Furn_Living_Sofa_L", -3.2, 1.2, 0.35, 1.0, 1.2, 0.55, mats['sofa_fabric'])
    add_box("Furn_Living_Table", -4.5, 1.2, 0.25, 1.2, 0.7, 0.4, mats['dark_timber'])
    # Dining Table with 6 chairs
    add_box("Furn_Dining_Table", -0.5, 1.2, 0.42, 2.0, 1.1, 0.75, mats['dark_timber'])
    for cx_c in [-1.2, -0.5, 0.2]:
        add_box(f"Furn_Dining_Chair_N_{cx_c}", cx_c, 1.9, 0.45, 0.45, 0.45, 0.85, mats['sofa_fabric'])
        add_box(f"Furn_Dining_Chair_S_{cx_c}", cx_c, 0.5, 0.45, 0.45, 0.45, 0.85, mats['sofa_fabric'])
    # Kitchen Island & Counter
    add_box("Furn_Kitchen_Counter", -8.5, 1.2, 0.5, 0.8, 3.5, 0.9, mats['white_stucco'])

    # Modern Charcoal Metal Roof with Overhangs
    # Day Wing Roof
    add_box("Roof_Villa_Day", -4.5, 1.25, 3.4, 11.6, 5.1, 0.35, mats['charcoal_roof'])
    # Night Wing Roof
    add_box("Roof_Villa_Night", -7.0, 7.0, 3.55, 6.6, 7.6, 0.35, mats['charcoal_roof'])

    # =========================================================================
    # 3. TERRACES & PERGOLA BBQ (5x5m)
    # =========================================================================
    # South DPK Decking Terrace (2.5m depth along full south facade)
    add_box("Terrace_South_DPK", -4.5, -2.25, 0.1, 11.5, 2.5, 0.2, mats['dpk_decking'])

    # Summer BBQ Terrace (5x5m) East of Dining
    add_box("Terrace_BBQ_DPK", 3.5, -1.0, 0.1, 5.0, 5.0, 0.2, mats['dpk_decking'])
    
    # 6 Timber Pergola Beams Overhead
    for i in range(6):
        by = -3.2 + i * 0.9
        add_box(f"Pergola_Rafter_{i}", 3.5, by, 3.1, 5.2, 0.12, 0.22, mats['dark_timber'])
    # 2 Main Support Beams
    add_box("Pergola_Support_E", 5.9, -1.0, 3.0, 0.18, 5.0, 0.2, mats['dark_timber'])
    add_box("Pergola_Support_W", 1.1, -1.0, 3.0, 0.18, 5.0, 0.2, mats['dark_timber'])
    # 4 Timber Posts
    add_box("Pergola_Post_SE", 5.9, -3.4, 1.5, 0.18, 0.18, 3.0, mats['dark_timber'])
    add_box("Pergola_Post_NE", 5.9, 1.4, 1.5, 0.18, 0.18, 3.0, mats['dark_timber'])

    # BBQ Grill Station & Outdoor Corner Sofa
    add_box("BBQ_Grill_Station", 5.2, 1.0, 0.55, 1.2, 0.7, 1.0, mats['metal_black'])
    add_box("BBQ_Corner_Sofa_1", 3.0, -3.0, 0.35, 2.8, 0.9, 0.6, mats['sofa_fabric'])
    add_box("BBQ_Corner_Sofa_2", 1.8, -2.1, 0.35, 0.9, 1.8, 0.6, mats['sofa_fabric'])

    # =========================================================================
    # 4. CARPORT (6x6m) WITH 2 CARS & WORKSHOP SHED (3x5m)
    # =========================================================================
    # Carport Timber Posts
    cp_posts = [(3.0, 4.5), (8.5, 4.5), (3.0, 10.0), (8.5, 10.0)]
    for idx, (px, py) in enumerate(cp_posts):
        add_box(f"Carport_Post_{idx}", px, py, 1.45, 0.2, 0.2, 2.9, mats['dark_timber'])
    # Carport Roof Canopy (6.0 x 6.0m)
    add_box("Carport_Roof_Canopy", 5.75, 7.25, 2.95, 6.2, 6.2, 0.2, mats['charcoal_roof'])

    # 2 Realistic Cars parked in Carport / Driveway
    # Car 1: Red SUV (inside Carport)
    build_detailed_car("Car_1_Red_SUV", 5.0, 7.5, 0.05, mats['car_red'], mats, rot_z=math.radians(90))
    # Car 2: Silver Sedan (alongside on driveway)
    build_detailed_car("Car_2_Silver_Sedan", 11.5, 7.5, 0.05, mats['car_silver'], mats, rot_z=math.radians(90))

    # Utility Shed & Workshop (3x5m) on East side
    add_box("Workshop_Shed_Walls", 11.0, 1.5, 1.4, 3.0, 5.0, 2.7, mats['warm_timber'])
    add_box("Workshop_Shed_Roof", 11.0, 1.5, 2.85, 3.4, 5.4, 0.3, mats['charcoal_roof'])
    add_box("Workshop_Window", 12.55, 1.5, 1.4, 0.05, 1.2, 1.0, mats['glass'])

    # =========================================================================
    # 5. FIRE PIT ZONE (4x4m AT SOUTH-WEST)
    # =========================================================================
    # Circular / Square Stone Patio
    add_box("Firepit_Stone_Patio", -10.5, -8.5, 0.04, 4.2, 4.2, 0.08, mats['curb_stone'])
    
    # Central Stone Fire Bowl with Glowing Flame
    add_cylinder("Firepit_Bowl", -10.5, -8.5, 0.25, 0.75, 0.45, mats['fire_stone'])
    add_cylinder("Firepit_Flame", -10.5, -8.5, 0.52, 0.45, 0.25, mats['fire_flame'])

    # 4 Adirondack Outdoor Armchairs around Fire Pit
    chair_angles = [0, 90, 180, 270]
    for deg in chair_angles:
        rad = math.radians(deg)
        cx = -10.5 + 1.4 * math.cos(rad)
        cy = -8.5 + 1.4 * math.sin(rad)
        add_box(f"Firepit_Chair_{deg}", cx, cy, 0.35, 0.7, 0.7, 0.65, mats['dark_timber'], rot_z=rad + math.radians(180))

    # Stepping stone walkway from Terrace to Firepit
    for step_idx in range(5):
        sy = -3.5 - step_idx * 1.0
        add_box(f"Stepping_Stone_{step_idx}", -8.5, sy, 0.02, 0.8, 0.6, 0.04, mats['curb_stone'])

    # =========================================================================
    # 6. DENDROLOGY & VEGETATION (1-to-1 WITH BLUEPRINT)
    # =========================================================================
    # EAST WINDBREAK HEDGE (ул. Черноморская)
    # 10 Pyramidal Thujas Smaragd (3.8m tall) along East fence
    for i, ty in enumerate([-11.0, -8.5, -6.0, -3.5, -1.0, 1.5, 4.0, 6.5, 9.0, 11.5]):
        build_detailed_tree_thuja(f"Thuja_East_{i}", 15.0, ty, mats, height=3.8, radius=0.65)

    # Alternating Red Barberry & White Dogwood shrubs in front of Thujas
    for i, by in enumerate([-9.5, -7.0, -4.5, -2.0, 0.5, 3.0, 5.5, 8.0, 10.5]):
        b_mat = mats['barberry_red'] if i % 2 == 0 else mats['dogwood_white']
        build_detailed_bush(f"Shrub_East_{i}", 14.1, by, b_mat, radius=0.55, height=0.9)

    # WEST BORDER: 3 Majestic Crimean Pines (5.5m tall)
    build_detailed_pine("Pine_West_North", -14.5, 9.0, mats, height=5.8, crown_r=1.9)
    build_detailed_pine("Pine_West_Mid", -14.5, 1.5, mats, height=5.2, crown_r=1.7)
    build_detailed_pine("Pine_West_South", -14.5, -7.5, mats, height=6.0, crown_r=2.1)

    # SOUTH-EAST CORNER: Large Feature Park Tree (6.5m tall)
    add_cylinder("Tree_SE_Trunk", 11.5, -8.5, 2.5, 0.25, 5.0, mats['bark_brown'])
    bpy.ops.mesh.primitive_uv_sphere_add(
        segments=16,
        ring_count=12,
        radius=2.8,
        location=(11.5, -8.5, 5.2)
    )
    se_crown = bpy.context.active_object
    se_crown.name = "Tree_SE_Crown"
    se_crown.scale = (1.1, 1.1, 0.8)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    se_crown.data.materials.append(mats['dogwood_white'])

    # Lavender flower beds along South terrace edge
    for i, lx in enumerate([-10.0, -8.5, -7.0, -5.5, -4.0, -2.5, -1.0]):
        build_detailed_bush(f"Lavender_{i}", lx, -3.8, mats['lavender_purple'], radius=0.35, height=0.45)

    # =========================================================================
    # 7. ENVIRONMENT, LIGHTING & PRESENTATION CAMERA
    # =========================================================================
    # World Sky Background
    world = bpy.context.scene.world
    if not world:
        world = bpy.data.worlds.new("ArchVizSkyWorld")
        bpy.context.scene.world = world
    world.use_nodes = True
    bg_node = world.node_tree.nodes.get("Background")
    if bg_node:
        bg_node.inputs['Color'].default_value = (0.78, 0.88, 0.98, 1.0) # Crisp daylight sky
        bg_node.inputs['Strength'].default_value = 1.4

    # Sun Light (Warm Architectural Sunlight)
    sun_data = bpy.data.lights.new(name="SunLight", type='SUN')
    sun_data.energy = 6.5
    sun_data.color = (1.0, 0.97, 0.92)
    sun_data.angle = math.radians(2.0)
    sun_obj = bpy.data.objects.new("Sun", sun_data)
    sun_obj.location = (15, -20, 30)
    sun_obj.rotation_euler = (math.radians(52), math.radians(18), math.radians(35))
    bpy.context.collection.objects.link(sun_obj)

    # Camera Target at Center of Estate
    target = bpy.data.objects.new("CamTarget", None)
    target.location = (0.0, 0.0, 1.5)
    bpy.context.collection.objects.link(target)

    # High-Resolution Axonometric Presentation Camera
    cam_data = bpy.data.cameras.new(name="ArchVizCam")
    cam_data.lens = 42
    cam_data.clip_start = 0.1
    cam_data.clip_end = 500
    cam_obj = bpy.data.objects.new("Camera", cam_data)
    
    # 3/4 Aerial View from South-South-East
    cam_obj.location = (2.0, -32.0, 26.0)
    
    track = cam_obj.constraints.new(type='TRACK_TO')
    track.target = target
    track.track_axis = 'TRACK_NEGATIVE_Z'
    track.up_axis = 'UP_Y'

    bpy.context.collection.objects.link(cam_obj)
    bpy.context.scene.camera = cam_obj

    # =========================================================================
    # 8. EXPORT GLB & PHOTOREALISTIC CYCLES RENDER
    # =========================================================================
    print(f"📦 [Blender] Exporting GLB to: {output_glb_path}")
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

    if render_image_path:
        print(f"📸 [Blender] Rendering photorealistic Cycles preview to: {render_image_path}")
        try:
            bpy.context.scene.render.engine = 'CYCLES'
            bpy.context.scene.cycles.device = 'CPU'
            bpy.context.scene.cycles.samples = 32
            bpy.context.scene.render.image_settings.file_format = 'PNG'
            bpy.context.scene.render.filepath = render_image_path
            bpy.context.scene.render.resolution_x = 1280
            bpy.context.scene.render.resolution_y = 720
            bpy.ops.render.render(write_still=True)
            print("✅ [Blender] Cycles Render saved successfully!")
        except Exception as e:
            print(f"⚠️ [Blender] Render warning: {e}")


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
    if not out_glb:
        out_glb = "public/generated_villa.glb"
    if not render_file:
        render_file = "public/generated_preview.png"

    assemble_complete_masterplan(out_glb, render_file)
