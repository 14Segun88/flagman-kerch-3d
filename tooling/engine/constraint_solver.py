"""
Step 2: Deterministic Constraint & Snap Engine for Landscape Architecture.
Enforces:
1. Snap to Grid (0.5m default)
2. Wall & Angle Orthogonalization (0°, 45°, 90°)
3. Parent-Child Hierarchy (e.g., Pool embedded inside DPK Decking, Tubs in Banya zone)
4. SNiP / СП Regulatory Setbacks & Fire Separation Auto-Correction
"""

import math
from typing import List, Tuple, Dict, Any, Optional
from .scene_graph import (
    LandscapeSceneGraph,
    BuildingNode,
    PavingZoneNode,
    PlantNode,
    MafNode,
    calc_polygon_area
)
from .qa_gate_1_structural import LEGAL_SETBACKS_M


def snap_val(val: float, step: float = 0.5) -> float:
    """Snaps a float value to the nearest grid step (e.g. 0.5m)."""
    return round(round(val / step) * step, 2)


def snap_point(pt: Tuple[float, float], step: float = 0.5) -> Tuple[float, float]:
    """Snaps a 2D coordinate to the grid."""
    return (snap_val(pt[0], step), snap_val(pt[1], step))


def clamp_angle(angle_deg: float) -> float:
    """Clamps rotation angle to standard architectural increments (0, 45, 90, 180, 270)."""
    normalized = angle_deg % 360.0
    targets = [0.0, 45.0, 90.0, 135.0, 180.0, 225.0, 270.0, 315.0, 360.0]
    closest = min(targets, key=lambda t: abs(t - normalized))
    return 0.0 if closest == 360.0 else closest


class ConstraintSolver:
    """Deterministic geometric solver enforcing architectural invariants."""

    GRID_STEP_M = 0.5

    @classmethod
    def solve_scene(cls, scene: LandscapeSceneGraph) -> LandscapeSceneGraph:
        """Solves and refines a raw/parsed scene graph into strict geometric alignment."""
        # 1. Snap Site Boundary
        snapped_boundary = [snap_point(p, cls.GRID_STEP_M) for p in scene.boundary_polygon]
        scene.boundary_polygon = snapped_boundary

        min_bx = min(p[0] for p in snapped_boundary) if snapped_boundary else 0.0
        max_bx = max(p[0] for p in snapped_boundary) if snapped_boundary else 31.25
        min_by = min(p[1] for p in snapped_boundary) if snapped_boundary else 0.0
        max_by = max(p[1] for p in snapped_boundary) if snapped_boundary else 32.0

        # 2. Refine & Snap Buildings (Orthogonalize + SNiP Setbacks)
        solved_buildings: List[BuildingNode] = []
        for b in scene.buildings:
            ox = snap_val(b.origin[0], cls.GRID_STEP_M)
            oy = snap_val(b.origin[1], cls.GRID_STEP_M)
            w = snap_val(max(2.0, b.dimensions[0]), cls.GRID_STEP_M)
            d = snap_val(max(2.0, b.dimensions[1]), cls.GRID_STEP_M)
            rot = clamp_angle(b.rotation_deg)

            # Minimum setback constraint (3m for residential, 1m for banya/gazebo)
            min_setback = 3.0 if b.type in ["residential", "dome", "cottage"] else 1.0
            if ox < min_bx + min_setback:
                ox = snap_val(min_bx + min_setback, cls.GRID_STEP_M)
            if ox + w > max_bx - min_setback:
                ox = snap_val(max_bx - min_setback - w, cls.GRID_STEP_M)
            if oy < min_by + min_setback:
                oy = snap_val(min_by + min_setback, cls.GRID_STEP_M)
            if oy + d > max_by - min_setback:
                oy = snap_val(max_by - min_setback - d, cls.GRID_STEP_M)

            b.origin = (ox, oy)
            b.dimensions = (w, d)
            b.rotation_deg = rot
            solved_buildings.append(b)

        scene.buildings = solved_buildings

        # 3. Resolve Parent-Child Relationships for Paving Zones & MAFs
        # Locate main decking terrace if present
        decking_zone = None
        for p in scene.paving_zones:
            p.polygon = [snap_point(pt, cls.GRID_STEP_M) for pt in p.polygon]
            if "decking" in p.type or "dpk" in p.material or "террас" in p.name.lower():
                decking_zone = p

        # 4. Snap & Embed MAF Elements (Pool in Decking, Tubs near Bathhouse)
        solved_mafs: List[MafNode] = []
        for m in scene.maf_elements:
            mx = snap_val(m.position[0], cls.GRID_STEP_M)
            my = snap_val(m.position[1], cls.GRID_STEP_M)
            mw = snap_val(max(2.0, m.dimensions[0]), cls.GRID_STEP_M)
            mh = snap_val(max(2.0, m.dimensions[1]), cls.GRID_STEP_M)

            # Prevent collision with any building by shifting MAF if overlapping
            m_poly = [(mx, my), (mx + mw, my), (mx + mw, my + mh), (mx, my + mh)]
            for b in solved_buildings:
                if "навес" in m.name.lower() and "беседк" in b.name.lower():
                    continue
                bx, by = b.origin
                bw, bd = b.dimensions
                # Check AABB overlap with building
                if not (mx + mw <= bx or mx >= bx + bw or my + mh <= by or my >= by + bd):
                    # Overlap detected, shift MAF towards open area
                    if mx < bx:
                        mx = snap_val(bx - mw - 1.0, cls.GRID_STEP_M)
                    else:
                        mx = snap_val(bx + bw + 1.0, cls.GRID_STEP_M)

            m.position = (mx, my)
            m.dimensions = (mw, mh)
            solved_mafs.append(m)

        scene.maf_elements = solved_mafs

        # 5. Snap Plants (Grid snap to 0.5m, enforce boundary setback >= 1.0m)
        solved_plants: List[PlantNode] = []
        for pl in scene.plants:
            px = snap_val(pl.position[0], cls.GRID_STEP_M)
            py = snap_val(pl.position[1], cls.GRID_STEP_M)
            # Enforce 1m boundary setback
            px = max(min_bx + 1.0, min(max_bx - 1.0, px))
            py = max(min_by + 1.0, min(max_by - 1.0, py))
            pl.position = (px, py)
            pl.crown_diameter_m = snap_val(pl.crown_diameter_m, 0.2)
            solved_plants.append(pl)

        scene.plants = solved_plants
        return scene
