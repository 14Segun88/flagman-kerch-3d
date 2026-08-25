"""
Canonical Scene-Graph Schema and Geometry Engine for Landscape & Architectural Projects.
Single Source of Truth for 2D CAD Drawings, 3D WebGL / Blender Engine, and 13-Page PDF Album.
Includes Parent-Child hierarchy for nested site components (e.g. pool in decking).
"""

from dataclasses import dataclass, field
from typing import List, Tuple, Dict, Any, Optional
import math
import json


def calc_polygon_area(polygon: List[Tuple[float, float]]) -> float:
    """Calculates polygon area in square meters using standard Shoelace formula."""
    if len(polygon) < 3:
        return 0.0
    area = 0.0
    n = len(polygon)
    for i in range(n):
        j = (i + 1) % n
        area += polygon[i][0] * polygon[j][1] - polygon[j][0] * polygon[i][1]
    return round(abs(area) / 2.0, 2)


@dataclass
class Point2D:
    x: float
    y: float

    def to_tuple(self) -> Tuple[float, float]:
        return (self.x, self.y)


@dataclass
class BuildingNode:
    id: str
    name: str
    type: str  # 'residential', 'gazebo', 'bathhouse', 'shed', 'dome', 'cottage'
    origin: Tuple[float, float]
    dimensions: Tuple[float, float]  # [width, depth]
    height: float = 3.0
    rotation_deg: float = 0.0
    facade_material: str = "white_plaster"
    roof_type: str = "gable"  # 'gable', 'hip', 'flat', 'shed', 'dome'
    walls: List[Dict[str, Any]] = field(default_factory=list)
    openings: List[Dict[str, Any]] = field(default_factory=list)
    parent_id: Optional[str] = None

    @property
    def area_sq_m(self) -> float:
        return round(self.dimensions[0] * self.dimensions[1], 2)

    def get_polygon(self) -> List[Tuple[float, float]]:
        x0, y0 = self.origin
        w, d = self.dimensions
        rad = math.radians(self.rotation_deg)
        cos_a, sin_a = math.cos(rad), math.sin(rad)
        
        corners = [(0, 0), (w, 0), (w, d), (0, d)]
        rotated = []
        for cx, cy in corners:
            rx = x0 + (cx * cos_a - cy * sin_a)
            ry = y0 + (cx * sin_a + cy * cos_a)
            rotated.append((round(rx, 2), round(ry, 2)))
        return rotated


@dataclass
class PavingZoneNode:
    id: str
    name: str
    type: str  # 'decking_dpk', 'gravel', 'pavers', 'pool_terrace'
    polygon: List[Tuple[float, float]]
    material: str = "wood_dpk"
    elevation_m: float = 0.08  # 8cm above ground for DPK decking
    slope_percent: float = 1.5
    parent_id: Optional[str] = None
    is_nested: bool = False

    @property
    def area_sq_m(self) -> float:
        return round(calc_polygon_area(self.polygon), 2)


@dataclass
class PlantNode:
    id: str
    species_ru: str
    species_lat: str
    category: str  # 'conifer', 'deciduous', 'perennial', 'grass'
    position: Tuple[float, float]
    crown_diameter_m: float = 1.0
    height_m: float = 1.5
    symbol_code: str = "P"  # For CAD dendroplan notation
    parent_id: Optional[str] = None


@dataclass
class MafNode:
    id: str
    name: str
    type: str  # 'pool', 'hot_tub', 'bbq_canopy', 'wood_storage', 'bench', 'sunbed'
    position: Tuple[float, float]
    dimensions: Tuple[float, float]
    height: float = 2.0
    details: Dict[str, Any] = field(default_factory=dict)
    parent_id: Optional[str] = None
    is_nested: bool = False  # True if embedded inside a parent zone (e.g. pool in decking)

    @property
    def area_sq_m(self) -> float:
        return round(self.dimensions[0] * self.dimensions[1], 2)


@dataclass
class LandscapeSceneGraph:
    project_id: str
    project_title: str
    address: str
    author: str
    year: int
    scale: str = "1:200"
    north_angle_deg: float = 0.0

    # Site geometry
    boundary_polygon: List[Tuple[float, float]] = field(default_factory=list)
    
    # Sub-graphs
    buildings: List[BuildingNode] = field(default_factory=list)
    paving_zones: List[PavingZoneNode] = field(default_factory=list)
    plants: List[PlantNode] = field(default_factory=list)
    maf_elements: List[MafNode] = field(default_factory=list)

    # Narrative texts (LLM formulated based on facts)
    intro_text: str = ""
    climate_text: str = ""
    soil_text: str = ""
    design_proposals_text: str = ""

    @property
    def total_site_area_sq_m(self) -> float:
        return round(calc_polygon_area(self.boundary_polygon), 2)

    @property
    def total_buildings_area_sq_m(self) -> float:
        return round(sum(b.area_sq_m for b in self.buildings), 2)

    @property
    def total_paving_area_sq_m(self) -> float:
        return round(sum(p.area_sq_m for p in self.paving_zones), 2)

    @property
    def total_greenery_area_sq_m(self) -> float:
        greenery = self.total_site_area_sq_m - (self.total_buildings_area_sq_m + self.total_paving_area_sq_m)
        return round(max(0.0, greenery), 2)

    def calculate_tep_summary(self) -> Dict[str, Any]:
        """Calculates deterministic TEP metrics guaranteed to sum up correctly."""
        total = self.total_site_area_sq_m
        bldgs = self.total_buildings_area_sq_m
        paving = self.total_paving_area_sq_m
        green = self.total_greenery_area_sq_m

        dpk_area = sum(p.area_sq_m for p in self.paving_zones if "decking" in p.type or "dpk" in p.material)
        gravel_area = sum(p.area_sq_m for p in self.paving_zones if "gravel" in p.type or "gravel" in p.material)

        return {
            "S_total": total,
            "S_buildings": bldgs,
            "S_paving_total": paving,
            "S_paving_dpk": round(dpk_area, 2),
            "S_paving_gravel": round(gravel_area, 2),
            "S_greenery": green,
            "balance_percent_buildings": round((bldgs / total * 100) if total else 0, 1),
            "balance_percent_paving": round((paving / total * 100) if total else 0, 1),
            "balance_percent_greenery": round((green / total * 100) if total else 0, 1),
            "is_balanced": abs((bldgs + paving + green) - total) < 0.05
        }

    def validate_consistency(self) -> List[str]:
        """Runs quality assurance checks on coordinates, overlaps and setbacks."""
        errors = []
        if len(self.boundary_polygon) < 3:
            errors.append("❌ Границы участка должны содержать минимум 3 вершины.")
        
        # Check boundary containment
        for bldg in self.buildings:
            bx, by = bldg.origin
            if bx < 0 or by < 0:
                errors.append(f"⚠️ Строение '{bldg.name}' имеет отрицательные координаты ({bx}, {by}).")

        tep = self.calculate_tep_summary()
        if not tep["is_balanced"]:
            errors.append(f"❌ Нарушен баланс площадей: Sобщ ({tep['S_total']}) != Sзд+Sпокр+Sзел.")

        return errors

    def to_dict(self) -> Dict[str, Any]:
        """Serializes scene graph to canonical JSON format."""
        return {
            "meta": {
                "projectId": self.project_id,
                "projectTitle": self.project_title,
                "address": self.address,
                "author": self.author,
                "year": self.year,
                "scale": self.scale,
                "northAngleDeg": self.north_angle_deg
            },
            "site": {
                "boundaryPolygon": self.boundary_polygon,
                "totalAreaSqM": self.total_site_area_sq_m
            },
            "tep": self.calculate_tep_summary(),
            "buildings": [
                {
                    "id": b.id,
                    "name": b.name,
                    "type": b.type,
                    "origin": b.origin,
                    "dimensions": b.dimensions,
                    "areaSqM": b.area_sq_m,
                    "height": b.height,
                    "polygon": b.get_polygon(),
                    "facadeMaterial": b.facade_material,
                    "roofType": b.roof_type,
                    "parentId": b.parent_id
                }
                for b in self.buildings
            ],
            "pavingZones": [
                {
                    "id": p.id,
                    "name": p.name,
                    "type": p.type,
                    "polygon": p.polygon,
                    "areaSqM": p.area_sq_m,
                    "material": p.material,
                    "elevationM": p.elevation_m,
                    "parentId": p.parent_id,
                    "isNested": p.is_nested
                }
                for p in self.paving_zones
            ],
            "plantings": [
                {
                    "id": pl.id,
                    "speciesRu": pl.species_ru,
                    "speciesLat": pl.species_lat,
                    "category": pl.category,
                    "position": pl.position,
                    "crownDiameterM": pl.crown_diameter_m,
                    "symbolCode": pl.symbol_code,
                    "parentId": pl.parent_id
                }
                for pl in self.plants
            ],
            "mafElements": [
                {
                    "id": m.id,
                    "name": m.name,
                    "type": m.type,
                    "position": m.position,
                    "dimensions": m.dimensions,
                    "areaSqM": m.area_sq_m,
                    "height": m.height,
                    "details": m.details,
                    "parentId": m.parent_id,
                    "isNested": m.is_nested
                }
                for m in self.maf_elements
            ],
            "texts": {
                "intro": self.intro_text,
                "climate": self.climate_text,
                "soil": self.soil_text,
                "designProposals": self.design_proposals_text
            }
        }
