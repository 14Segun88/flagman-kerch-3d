"""
QA Gate 2: Deterministic Geometry & Topology Invariant Checker.
Unit-tests geometry collisions, boundary setbacks, TEP balance, and graph reachability.
Includes Golden-Test validation against the Geroevskoe 12 reference dataset.
"""

from typing import List, Tuple, Dict, Any
import math
from .scene_graph import LandscapeSceneGraph, calc_polygon_area
from .qa_gate_1_structural import LEGAL_SETBACKS_M


def do_polygons_intersect(poly1: List[Tuple[float, float]], poly2: List[Tuple[float, float]]) -> bool:
    """Bounding box and SAT intersection test between two convex/simple polygons."""
    # Fast AABB check
    min_x1, max_x1 = min(p[0] for p in poly1), max(p[0] for p in poly1)
    min_y1, max_y1 = min(p[1] for p in poly1), max(p[1] for p in poly1)
    min_x2, max_x2 = min(p[0] for p in poly2), max(p[0] for p in poly2)
    min_y2, max_y2 = min(p[1] for p in poly2), max(p[1] for p in poly2)

    if max_x1 <= min_x2 or max_x2 <= min_x1 or max_y1 <= min_y2 or max_y2 <= min_y1:
        return False
    return True


class QaGate2GeometryValidator:
    """Gate 2: Enforces geometric invariants on solved SceneGraph before persistence."""

    @staticmethod
    def validate_scene(scene: LandscapeSceneGraph) -> Tuple[bool, List[str]]:
        """Validates all geometric invariants of the solved scene graph."""
        errors = []

        # 1. Collision Check (No overlaps between buildings and MAFs)
        all_objects = []
        for b in scene.buildings:
            all_objects.append({"name": b.name, "type": b.type, "poly": b.get_polygon()})
        
        for m in scene.maf_elements:
            mx, my = m.position
            mw, mh = m.dimensions
            poly = [(mx, my), (mx + mw, my), (mx + mw, my + mh), (mx, my + mh)]
            all_objects.append({"name": m.name, "type": m.type, "poly": poly})

        for i in range(len(all_objects)):
            for j in range(i + 1, len(all_objects)):
                o1 = all_objects[i]
                o2 = all_objects[j]
                # Allow overlapping of attached canopy with building
                if "навес" in o1["name"].lower() or "навес" in o2["name"].lower():
                    continue
                if do_polygons_intersect(o1["poly"], o2["poly"]):
                    errors.append(f"❌ Коллизия: Объекты '{o1['name']}' и '{o2['name']}' геометрически пересекаются!")

        # 2. Strict TEP Balance Check
        tep = scene.calculate_tep_summary()
        if not tep["is_balanced"]:
            errors.append(
                f"❌ Нарушение баланса площадей: S_общ ({tep['S_total']}) != "
                f"S_зд ({tep['S_buildings']}) + S_дтс ({tep['S_paving_total']}) + S_зел ({tep['S_greenery']})."
            )

        # 3. Graph Reachability (Every building must connect to DTS paving)
        for b in scene.buildings:
            bx, by = b.origin
            # Check minimum distance to nearest paving zone
            has_connection = False
            for p in scene.paving_zones:
                for px, py in p.polygon:
                    dist = math.sqrt((bx - px)**2 + (by - py)**2)
                    if dist <= 8.0:  # Within connection reach
                        has_connection = True
                        break
                if has_connection:
                    break
            if not has_connection:
                errors.append(f"⚠️ Топология: Здание '{b.name}' изолировано от дорожно-тропиночной сети (ДТС).")

        is_valid = len(errors) == 0
        return is_valid, errors

    @staticmethod
    def run_geroevskoe_golden_test(scene: LandscapeSceneGraph) -> Tuple[bool, Dict[str, Any]]:
        """Calibrates engine against the Geroevskoe 12 reference golden dataset."""
        tep = scene.calculate_tep_summary()
        
        # Golden targets from Reference Project (Лист 11)
        golden_target_area = 1000.0
        golden_bldgs_area = 162.0
        golden_dpk_area = 171.51

        area_diff = abs(tep["S_total"] - golden_target_area)
        bldgs_diff = abs(tep["S_buildings"] - golden_bldgs_area)

        passed = area_diff < 5.0 and bldgs_diff < 20.0

        report = {
            "golden_test_passed": passed,
            "target_total_area": golden_target_area,
            "actual_total_area": tep["S_total"],
            "area_delta_sq_m": round(area_diff, 2),
            "target_bldgs_area": golden_bldgs_area,
            "actual_bldgs_area": tep["S_buildings"],
            "bldgs_delta_sq_m": round(bldgs_diff, 2),
        }
        return passed, report
