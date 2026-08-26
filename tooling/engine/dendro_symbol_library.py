"""
Dendrological SVG & 2D CAD Symbol and Hatching Library for Landscape Projects.
Provides professional architectural symbols for conifers, deciduous trees, shrubs, perennials,
and realistic CAD hatching patterns (DPK wood decking, granite gravel, Old Town pavers, lawn).
"""

from typing import List, Tuple, Dict, Any, Optional
import math
from PIL import Image, ImageDraw, ImageFont


# Botanical palette & taxonomy mapping
PLANT_STYLES: Dict[str, Dict[str, Any]] = {
    # Conifers (Хвойные)
    "pinus_nana": {
        "code": "СЧ",
        "name_ru": "Сосна черная «НАНА»",
        "category": "conifer",
        "fill_color": (34, 90, 48, 230),
        "stroke_color": (18, 55, 30, 255),
        "accent_color": (50, 130, 70, 255),
        "pattern": "conifer_star",
    },
    "thuja_smaragd": {
        "code": "ТС",
        "name_ru": "Туя западная «Смарагд»",
        "category": "conifer",
        "fill_color": (26, 100, 52, 235),
        "stroke_color": (12, 60, 30, 255),
        "accent_color": (45, 145, 75, 255),
        "pattern": "conifer_rosette",
    },
    "juniperus_virginiana": {
        "code": "МВ",
        "name_ru": "Можжевельник Виргинский",
        "category": "conifer",
        "fill_color": (30, 110, 85, 230),
        "stroke_color": (15, 65, 50, 255),
        "accent_color": (50, 160, 120, 255),
        "pattern": "conifer_star",
    },
    "juniperus_sabina": {
        "code": "МК",
        "name_ru": "Можжевельник Казацкий",
        "category": "conifer",
        "fill_color": (35, 105, 75, 225),
        "stroke_color": (18, 60, 42, 255),
        "accent_color": (60, 150, 110, 255),
        "pattern": "conifer_spread",
    },
    # Deciduous Shrubs & Trees (Лиственные кустарники и деревья)
    "cornus_alba": {
        "code": "ДБ",
        "name_ru": "Дёрен белый «Элегантиссима»",
        "category": "deciduous",
        "fill_color": (95, 165, 90, 220),
        "stroke_color": (45, 105, 45, 255),
        "accent_color": (220, 235, 210, 255),
        "pattern": "scalloped_cloud",
    },
    "berberis_thunbergii": {
        "code": "БТ",
        "name_ru": "Барбарис Тунберга «Атропурпуреа»",
        "category": "deciduous",
        "fill_color": (145, 45, 55, 230),
        "stroke_color": (85, 20, 30, 255),
        "accent_color": (195, 70, 85, 255),
        "pattern": "scalloped_cloud",
    },
    "spiraea_japonica": {
        "code": "СЯ",
        "name_ru": "Спирея японская «Голдфлейм»",
        "category": "deciduous",
        "fill_color": (185, 160, 45, 225),
        "stroke_color": (120, 100, 20, 255),
        "accent_color": (225, 200, 70, 255),
        "pattern": "scalloped_cloud",
    },
    # Perennials & Grasses (Многолетники и травы)
    "lavandula_angustifolia": {
        "code": "ЛВ",
        "name_ru": "Лаванда узколистная «Вознесенская»",
        "category": "perennial",
        "fill_color": (120, 95, 165, 225),
        "stroke_color": (75, 50, 115, 255),
        "accent_color": (180, 155, 225, 255),
        "pattern": "perennial_stipple",
    },
    "nepeta_faassenii": {
        "code": "КТ",
        "name_ru": "Котовник Фассена «Сикс Хиллс»",
        "category": "perennial",
        "fill_color": (90, 120, 185, 225),
        "stroke_color": (45, 70, 130, 255),
        "accent_color": (145, 175, 235, 255),
        "pattern": "perennial_stipple",
    },
}


class DendroSymbolLibrary:
    """Renders landscape architectural plant symbols and surface hatch patterns."""

    @staticmethod
    def get_plant_style(species_id: str, category: str = "conifer") -> Dict[str, Any]:
        """Resolves style definition by species key or falls back to category default."""
        clean_id = species_id.lower().replace(" ", "_").replace("-", "_")
        for key, style in PLANT_STYLES.items():
            if key in clean_id or clean_id in key:
                return style
        
        # Fallbacks
        if category == "conifer" or "туя" in clean_id or "сосн" in clean_id or "можжев" in clean_id:
            return PLANT_STYLES["pinus_nana"]
        elif category == "deciduous" or "дерен" in clean_id or "барбарис" in clean_id or "спире" in clean_id:
            return PLANT_STYLES["cornus_alba"]
        else:
            return PLANT_STYLES["lavandula_angustifolia"]

    @classmethod
    def draw_plant_symbol(
        cls,
        draw: ImageDraw.ImageDraw,
        center: Tuple[float, float],
        radius_px: float,
        species_id: str,
        index_num: Optional[int] = None,
        font: Optional[ImageFont.ImageFont] = None,
    ):
        """Draws professional architectural plant rosette with crown detailing and ID tag."""
        cx, cy = center
        r = max(8.0, radius_px)
        style = cls.get_plant_style(species_id)
        pattern = style["pattern"]

        if pattern in ("conifer_star", "conifer_rosette", "conifer_spread"):
            cls._draw_conifer_rosette(draw, cx, cy, r, style)
        elif pattern == "scalloped_cloud":
            cls._draw_scalloped_crown(draw, cx, cy, r, style)
        else:
            cls._draw_perennial_clump(draw, cx, cy, r, style)

        # Center Crosshair
        cross_len = max(3.0, r * 0.35)
        draw.line([(cx - cross_len, cy), (cx + cross_len, cy)], fill=(15, 23, 42, 255), width=1)
        draw.line([(cx, cy - cross_len), (cx, cy + cross_len)], fill=(15, 23, 42, 255), width=1)

        # Planting ID Badge (e.g. "ТС-1", "СЧ-2")
        if index_num is not None and font:
            label = f"{style['code']}-{index_num}"
            cls._draw_label_badge(draw, cx + r * 0.7, cy - r * 0.7, label, font)

    @staticmethod
    def _draw_conifer_rosette(draw: ImageDraw.ImageDraw, cx: float, cy: float, r: float, style: Dict[str, Any]):
        """Draws serrated star/rosette crown with radial needles."""
        points = []
        num_spikes = 16
        for i in range(num_spikes * 2):
            angle = i * (math.pi / num_spikes)
            # Alternate outer spike tip and inner trough
            curr_r = r if (i % 2 == 0) else r * 0.78
            px = cx + curr_r * math.cos(angle)
            py = cy + curr_r * math.sin(angle)
            points.append((px, py))

        # Outer serrated polygon
        draw.polygon(points, fill=style["fill_color"], outline=style["stroke_color"])

        # Inner highlight ring
        inner_r = r * 0.55
        draw.ellipse(
            [(cx - inner_r, cy - inner_r), (cx + inner_r, cy + inner_r)],
            fill=style["accent_color"],
            outline=style["stroke_color"],
            width=1,
        )

        # Radial accent needle lines
        for i in range(8):
            ang = i * (math.pi / 4)
            x1 = cx + inner_r * 0.4 * math.cos(ang)
            y1 = cy + inner_r * 0.4 * math.sin(ang)
            x2 = cx + r * 0.9 * math.cos(ang)
            y2 = cy + r * 0.9 * math.sin(ang)
            draw.line([(x1, y1), (x2, y2)], fill=style["stroke_color"], width=1)

    @staticmethod
    def _draw_scalloped_crown(draw: ImageDraw.ImageDraw, cx: float, cy: float, r: float, style: Dict[str, Any]):
        """Draws multi-lobed deciduous crown resembling leafy cluster."""
        num_lobes = 7
        lobe_r = r * 0.42
        
        # Draw overlapping outer lobes
        for i in range(num_lobes):
            ang = i * (2 * math.pi / num_lobes)
            lx = cx + (r * 0.65) * math.cos(ang)
            ly = cy + (r * 0.65) * math.sin(ang)
            draw.ellipse(
                [(lx - lobe_r, ly - lobe_r), (lx + lobe_r, ly + lobe_r)],
                fill=style["fill_color"],
                outline=style["stroke_color"],
                width=1,
            )

        # Center core dome
        center_r = r * 0.6
        draw.ellipse(
            [(cx - center_r, cy - center_r), (cx + center_r, cy + center_r)],
            fill=style["accent_color"],
            outline=style["stroke_color"],
            width=1,
        )

        # Branch structure lines
        for i in range(5):
            ang = (i * 1.3) * (math.pi / 2.5)
            x2 = cx + (r * 0.75) * math.cos(ang)
            y2 = cy + (r * 0.75) * math.sin(ang)
            draw.line([(cx, cy), (x2, y2)], fill=style["stroke_color"], width=1)

    @staticmethod
    def _draw_perennial_clump(draw: ImageDraw.ImageDraw, cx: float, cy: float, r: float, style: Dict[str, Any]):
        """Draws stippled perennial clump (lavender, ornamental grasses)."""
        # Outer soft ellipse
        draw.ellipse([(cx - r, cy - r), (cx + r, cy + r)], fill=style["fill_color"], outline=style["stroke_color"], width=1)

        # Inner cluster dots / flower heads
        inner_r = r * 0.65
        num_dots = 12
        for i in range(num_dots):
            ang = i * (2 * math.pi / num_dots)
            dist = inner_r * ((i % 3 + 1) / 3.0)
            dx = cx + dist * math.cos(ang)
            dy = cy + dist * math.sin(ang)
            dot_size = max(1.5, r * 0.12)
            draw.ellipse([(dx - dot_size, dy - dot_size), (dx + dot_size, dy + dot_size)], fill=style["accent_color"])

    @staticmethod
    def _draw_label_badge(draw: ImageDraw.ImageDraw, bx: float, by: float, label: str, font: ImageFont.ImageFont):
        """Draws neat architectural circular/pill tag for plant ID."""
        w, h = 28, 14
        draw.rounded_rectangle([(bx - 2, by - 2), (bx + w, by + h)], radius=3, fill="#ffffff", outline="#0f172a", width=1)
        draw.text((bx + 2, by - 1), label, fill="#0f172a", font=font)

    @staticmethod
    def apply_material_hatch(
        draw: ImageDraw.ImageDraw,
        polygon: List[Tuple[float, float]],
        material_type: str,
    ):
        """
        Fills a polygon with authentic architectural CAD hatching:
        - 'dpk' / 'decking': parallel wood plank lines with spacing & grain color.
        - 'pavers' / 'брусчатка': interlocking rectangular paver grid.
        - 'gravel' / 'щебень': fine stipple dot texture.
        - 'grass' / 'lawn': soft meadow green with micro-stipple.
        - 'pool_water': light azure with wave ripple lines.
        """
        if len(polygon) < 3:
            return

        mat = material_type.lower()

        # 1. DPK Wood Decking (Настил ДПК)
        if "dpk" in mat or "decking" in mat or "wood" in mat:
            # Base warm timber fill
            draw.polygon(polygon, fill="#fde8d0", outline="#c2410c", width=2)
            
            # Draw parallel plank hatch lines
            min_x = min(p[0] for p in polygon)
            max_x = max(p[0] for p in polygon)
            min_y = min(p[1] for p in polygon)
            max_y = max(p[1] for p in polygon)

            plank_step = 9  # 9px plank spacing
            y = min_y + plank_step
            while y < max_y:
                draw.line([(min_x, y), (max_x, y)], fill="#ea580c", width=1)
                y += plank_step

        # 2. Interlocking Pavers (Брусчатка въездной зоны)
        elif "paver" in mat or "parking" in mat or "брусчатк" in mat:
            draw.polygon(polygon, fill="#e2e8f0", outline="#475569", width=2)
            
            min_x = min(p[0] for p in polygon)
            max_x = max(p[0] for p in polygon)
            min_y = min(p[1] for p in polygon)
            max_y = max(p[1] for p in polygon)

            grid_step = 10
            # Horizontal joint lines
            y = min_y + grid_step
            row = 0
            while y < max_y:
                draw.line([(min_x, y), (max_x, y)], fill="#94a3b8", width=1)
                # Vertical staggered joints
                offset = (grid_step / 2) if (row % 2 == 1) else 0
                x = min_x + offset
                while x < max_x:
                    draw.line([(x, y - grid_step), (x, y)], fill="#94a3b8", width=1)
                    x += grid_step * 1.5
                y += grid_step
                row += 1

        # 3. Granite Gravel / Crushed Stone (Гравийный сад / Щебень)
        elif "gravel" in mat or "щебень" in mat or "crushed" in mat:
            draw.polygon(polygon, fill="#f1f5f9", outline="#64748b", width=2)
            min_x = min(p[0] for p in polygon)
            max_x = max(p[0] for p in polygon)
            min_y = min(p[1] for p in polygon)
            max_y = max(p[1] for p in polygon)

            step = 12
            y = min_y + 4
            while y < max_y:
                x = min_x + 4 + (y % 6)
                while x < max_x:
                    draw.point((x, y), fill="#64748b")
                    draw.point((x + 1, y), fill="#475569")
                    x += step
                y += step

        # 4. Swimming Pool / Water (Бассейн и купели)
        elif "pool" in mat or "water" in mat:
            draw.polygon(polygon, fill="#bae6fd", outline="#0284c7", width=2)
            min_x = min(p[0] for p in polygon)
            max_x = max(p[0] for p in polygon)
            min_y = min(p[1] for p in polygon)
            max_y = max(p[1] for p in polygon)

            # Ripple lines
            y = min_y + 12
            while y < max_y:
                draw.arc([(min_x + 10, y - 4), (max_x - 10, y + 4)], start=0, end=180, fill="#38bdf8", width=1)
                y += 14

        # 5. Lawn & Greenery (Газон)
        else:
            draw.polygon(polygon, fill="#ecfdf5", outline="#10b981", width=1)
