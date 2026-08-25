"""
Deterministic 2D CAD Sheet Drawing Generator.
Renders precise architectural sheets (Sheets 6-11) directly from LandscapeSceneGraph.
Outputs clean vector SVG and high-res PNG for the 13-page PDF Album.
"""

from typing import List, Tuple, Dict, Any, Optional
import math
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import fitz

from .scene_graph import LandscapeSceneGraph, BuildingNode, PavingZoneNode, PlantNode, MafNode


class CadSheetGenerator:
    """Generates standardized 1:200 architectural CAD sheets from LandscapeSceneGraph."""

    PAGE_WIDTH = 1200
    PAGE_HEIGHT = 850
    MARGIN_LEFT = 80
    MARGIN_TOP = 80
    DRAW_WIDTH = 800
    DRAW_HEIGHT = 650

    def __init__(self, scene: LandscapeSceneGraph):
        self.scene = scene
        self._calculate_bounds_and_scale()

    def _calculate_bounds_and_scale(self):
        """Calculates bounding box and scale factors to fit 1:200 draw area."""
        all_xs = [p[0] for p in self.scene.boundary_polygon] or [0, 30]
        all_ys = [p[1] for p in self.scene.boundary_polygon] or [0, 35]

        self.min_x = min(all_xs)
        self.max_x = max(all_xs)
        self.min_y = min(all_ys)
        self.max_y = max(all_ys)

        site_w = max(1.0, self.max_x - self.min_x)
        site_h = max(1.0, self.max_y - self.min_y)

        # Scale factor (pixels per meter)
        scale_x = (self.DRAW_WIDTH - 60) / site_w
        scale_y = (self.DRAW_HEIGHT - 60) / site_h
        self.scale_ppm = min(scale_x, scale_y)

        # Offset to center drawing
        self.offset_x = self.MARGIN_LEFT + (self.DRAW_WIDTH - (site_w * self.scale_ppm)) / 2
        self.offset_y = self.MARGIN_TOP + (self.DRAW_HEIGHT - (site_h * self.scale_ppm)) / 2

    def world_to_screen(self, x: float, y: float) -> Tuple[float, float]:
        """Maps world coordinates (meters) to screen canvas coordinates (pixels)."""
        sx = self.offset_x + (x - self.min_x) * self.scale_ppm
        # Invert Y for architectural top-down CAD view
        sy = self.offset_y + (self.max_y - y) * self.scale_ppm
        return (sx, sy)

    def _draw_sheet_frame(self, draw: ImageDraw.ImageDraw, sheet_num: int, sheet_title: str):
        """Draws standard architectural border, title block and north arrow."""
        # 1. Outer Border & Inner Margins (GOST style)
        draw.rectangle([(20, 20), (self.PAGE_WIDTH - 20, self.PAGE_HEIGHT - 20)], outline="#334155", width=2)
        draw.rectangle([(30, 30), (self.PAGE_WIDTH - 30, self.PAGE_HEIGHT - 30)], outline="#0f172a", width=1)

        # 2. North Arrow (Compass)
        cx, cy = self.PAGE_WIDTH - 80, 80
        draw.polygon([(cx, cy - 30), (cx - 10, cy + 10), (cx, cy), (cx, cy - 30)], fill="#0f172a")
        draw.polygon([(cx, cy - 30), (cx + 10, cy + 10), (cx, cy), (cx, cy - 30)], fill="#94a3b8")
        draw.text((cx - 4, cy - 45), "С", fill="#0f172a")

        # 3. Bottom Title Block (Штамп чертежа)
        bx0 = self.PAGE_WIDTH - 380
        by0 = self.PAGE_HEIGHT - 110
        bx1 = self.PAGE_WIDTH - 30
        by1 = self.PAGE_HEIGHT - 30

        draw.rectangle([(bx0, by0), (bx1, by1)], fill="#f8fafc", outline="#0f172a", width=2)
        draw.line([(bx0, by0 + 35), (bx1, by0 + 35)], fill="#0f172a", width=1)
        draw.line([(bx0, by0 + 55), (bx1, by0 + 55)], fill="#0f172a", width=1)

        # Title Block Texts
        draw.text((bx0 + 10, by0 + 8), self.scene.project_title[:38], fill="#0f172a")
        draw.text((bx0 + 10, by0 + 38), f"Лист {sheet_num}: {sheet_title}", fill="#0f172a")
        draw.text((bx0 + 10, by0 + 60), f"Масштаб {self.scene.scale} | {self.scene.year} г.", fill="#475569")
        draw.text((bx0 + 260, by0 + 60), "ФЛАГМАН", fill="#d97706")

    def _draw_boundary(self, draw: ImageDraw.ImageDraw, fill_color: str = "#f1f5f9"):
        """Draws property boundary polygon and dimensions."""
        screen_poly = [self.world_to_screen(p[0], p[1]) for p in self.scene.boundary_polygon]
        if len(screen_poly) >= 3:
            draw.polygon(screen_poly, fill=fill_color, outline="#0f172a", width=3)

            # Draw side dimension labels
            n = len(self.scene.boundary_polygon)
            for i in range(n):
                p1 = self.scene.boundary_polygon[i]
                p2 = self.scene.boundary_polygon[(i + 1) % n]
                dist = math.sqrt((p2[0] - p1[0])**2 + (p2[1] - p1[1])**2)
                
                mid_x = (p1[0] + p2[0]) / 2
                mid_y = (p1[1] + p2[1]) / 2
                sm_x, sm_y = self.world_to_screen(mid_x, mid_y)
                draw.text((sm_x, sm_y), f"{dist:.1f} м", fill="#64748b")

    def generate_sheet_06_situational_plan(self, output_png: Path) -> Path:
        """Лист 6: Ситуационный план (Границы, габариты, существующие строения)."""
        img = Image.new("RGB", (self.PAGE_WIDTH, self.PAGE_HEIGHT), "#ffffff")
        draw = ImageDraw.Draw(img)

        self._draw_sheet_frame(draw, 6, "Ситуационный план")
        self._draw_boundary(draw, fill_color="#f8fafc")

        # Existing and main buildings
        for b in self.scene.buildings:
            poly = [self.world_to_screen(pt[0], pt[1]) for pt in b.get_polygon()]
            draw.polygon(poly, fill="#e2e8f0", outline="#1e293b", width=2)
            cx, cy = self.world_to_screen(b.origin[0] + b.dimensions[0]/2, b.origin[1] + b.dimensions[1]/2)
            draw.text((cx - 20, cy - 6), f"{b.name}\n{b.area_sq_m} м²", fill="#0f172a")

        # Explication box
        ex_x = self.PAGE_WIDTH - 380
        ex_y = 120
        draw.rectangle([(ex_x, ex_y), (ex_x + 350, ex_y + 120)], fill="#f8fafc", outline="#cbd5e1", width=1)
        draw.text((ex_x + 10, ex_y + 10), "Экспликация участка:", fill="#0f172a")
        draw.text((ex_x + 10, ex_y + 35), f"• S общая участка: {self.scene.total_site_area_sq_m} м²", fill="#334155")
        draw.text((ex_x + 10, ex_y + 60), f"• S застройки (здания): {self.scene.total_buildings_area_sq_m} м²", fill="#334155")
        draw.text((ex_x + 10, ex_y + 85), f"• S свободной зоны: {self.scene.total_greenery_area_sq_m} м²", fill="#334155")

        img.save(str(output_png), "PNG")
        return output_png

    def generate_sheet_07_paving_dts_plan(self, output_png: Path) -> Path:
        """Лист 7: План дорожно-тропиночной сети (ДТС, ДПК, гравий, уклоны)."""
        img = Image.new("RGB", (self.PAGE_WIDTH, self.PAGE_HEIGHT), "#ffffff")
        draw = ImageDraw.Draw(img)

        self._draw_sheet_frame(draw, 7, "План дорожно-тропиночной сети (ДТС)")
        self._draw_boundary(draw, fill_color="#f8fafc")

        # Draw paving zones
        for p in self.scene.paving_zones:
            poly = [self.world_to_screen(pt[0], pt[1]) for pt in p.polygon]
            is_dpk = "dpk" in p.material or "decking" in p.type
            fill_col = "#fed7aa" if is_dpk else "#cbd5e1"  # Orange-tint for DPK, Grey for gravel
            outline_col = "#ea580c" if is_dpk else "#475569"
            
            draw.polygon(poly, fill=fill_col, outline=outline_col, width=2)

        # Buildings footprints
        for b in self.scene.buildings:
            poly = [self.world_to_screen(pt[0], pt[1]) for pt in b.get_polygon()]
            draw.polygon(poly, fill="#e2e8f0", outline="#1e293b", width=2)

        # Explication box for DTS
        tep = self.scene.calculate_tep_summary()
        ex_x = self.PAGE_WIDTH - 380
        ex_y = 120
        draw.rectangle([(ex_x, ex_y), (ex_x + 350, ex_y + 200)], fill="#f8fafc", outline="#cbd5e1", width=1)
        draw.text((ex_x + 10, ex_y + 10), "Ведомость покрытий ДТС:", fill="#0f172a")
        draw.text((ex_x + 10, ex_y + 35), f"🟧 Декинг ДПК (настилы): {tep['S_paving_dpk']} м²", fill="#ea580c")
        draw.text((ex_x + 10, ex_y + 55), "   (террасная доска, h=+8 см)", fill="#64748b")
        draw.text((ex_x + 10, ex_y + 80), f"⬜ Отсыпка гранитная: {tep['S_paving_gravel']} м²", fill="#475569")
        draw.text((ex_x + 10, ex_y + 100), "   (фр. 5-20 мм, слой 5-10 см)", fill="#64748b")
        draw.text((ex_x + 10, ex_y + 130), f"• Итого площадь ДТС: {tep['S_paving_total']} м²", fill="#0f172a")
        draw.text((ex_x + 10, ex_y + 160), "Уклон для стока: i = 0.015-0.020", fill="#0369a1")

        img.save(str(output_png), "PNG")
        return output_png

    def generate_sheet_08_dendro_plan(self, output_png: Path) -> Path:
        """Лист 8: Дендрологический план (Условные обозначения и группы растений)."""
        img = Image.new("RGB", (self.PAGE_WIDTH, self.PAGE_HEIGHT), "#ffffff")
        draw = ImageDraw.Draw(img)

        self._draw_sheet_frame(draw, 8, "Дендрологический план")
        self._draw_boundary(draw, fill_color="#f0fdf4")

        # Paving outlines for context
        for p in self.scene.paving_zones:
            poly = [self.world_to_screen(pt[0], pt[1]) for pt in p.polygon]
            draw.polygon(poly, fill="#f1f5f9", outline="#cbd5e1", width=1)

        # Buildings
        for b in self.scene.buildings:
            poly = [self.world_to_screen(pt[0], pt[1]) for pt in b.get_polygon()]
            draw.polygon(poly, fill="#e2e8f0", outline="#1e293b", width=1)

        # Draw Plant Symbols
        for pl in self.scene.plants:
            sx, sy = self.world_to_screen(pl.position[0], pl.position[1])
            rad_px = (pl.crown_diameter_m / 2) * self.scale_ppm
            
            # Conifer (Dark green), Deciduous (Light green), Perennial (Purple/Lavender)
            col_map = {"conifer": "#15803d", "deciduous": "#84cc16", "perennial": "#a855f7"}
            fill_c = col_map.get(pl.category, "#15803d")

            draw.ellipse([(sx - rad_px, sy - rad_px), (sx + rad_px, sy + rad_px)], fill=None, outline=fill_c, width=2)
            draw.point((sx, sy), fill=fill_c)
            draw.text((sx - 6, sy - 6), pl.symbol_code, fill="#0f172a")

        # Plant legend box
        ex_x = self.PAGE_WIDTH - 380
        ex_y = 120
        draw.rectangle([(ex_x, ex_y), (ex_x + 350, ex_y + 260)], fill="#f8fafc", outline="#cbd5e1", width=1)
        draw.text((ex_x + 10, ex_y + 10), "Условные обозначения растений:", fill="#0f172a")
        
        y_cursor = ex_y + 35
        drawn_symbols = set()
        for pl in self.scene.plants:
            if pl.symbol_code not in drawn_symbols:
                drawn_symbols.add(pl.symbol_code)
                draw.text((ex_x + 10, y_cursor), f"[{pl.symbol_code}] {pl.species_ru}", fill="#334155")
                draw.text((ex_x + 20, y_cursor + 14), f"({pl.species_lat})", fill="#64748b")
                y_cursor += 34

        img.save(str(output_png), "PNG")
        return output_png

    def generate_sheet_10_maf_plan(self, output_png: Path) -> Path:
        """Лист 10: План малых архитектурных форм (МАФ: бассейн, купели, навесы)."""
        img = Image.new("RGB", (self.PAGE_WIDTH, self.PAGE_HEIGHT), "#ffffff")
        draw = ImageDraw.Draw(img)

        self._draw_sheet_frame(draw, 10, "План малых архитектурных форм (МАФ)")
        self._draw_boundary(draw, fill_color="#f8fafc")

        # Draw MAF Elements
        for m in self.scene.maf_elements:
            sx, sy = self.world_to_screen(m.position[0], m.position[1])
            w_px = m.dimensions[0] * self.scale_ppm
            h_px = m.dimensions[1] * self.scale_ppm

            # Pool = Blue, Hot tub = Cyan, BBQ = Amber
            fill_c = "#bae6fd" if m.type == "pool" else "#a5f3fc" if m.type == "hot_tub" else "#fef08a"
            draw.rectangle([(sx, sy - h_px), (sx + w_px, sy)], fill=fill_c, outline="#0284c7", width=2)
            draw.text((sx + 5, sy - h_px/2 - 6), f"{m.name}\n{m.dimensions[0]}x{m.dimensions[1]}м", fill="#0f172a")

        # Buildings outlines
        for b in self.scene.buildings:
            poly = [self.world_to_screen(pt[0], pt[1]) for pt in b.get_polygon()]
            draw.polygon(poly, fill="#e2e8f0", outline="#1e293b", width=1)

        # MAF Explication box
        ex_x = self.PAGE_WIDTH - 380
        ex_y = 120
        draw.rectangle([(ex_x, ex_y), (ex_x + 350, ex_y + 220)], fill="#f8fafc", outline="#cbd5e1", width=1)
        draw.text((ex_x + 10, ex_y + 10), "Экспликация МАФ и зон:", fill="#0f172a")
        
        y_cursor = ex_y + 35
        for idx, m in enumerate(self.scene.maf_elements, 1):
            draw.text((ex_x + 10, y_cursor), f"{idx}. {m.name} ({m.dimensions[0]}×{m.dimensions[1]} м)", fill="#334155")
            y_cursor += 22

        img.save(str(output_png), "PNG")
        return output_png

    def generate_sheet_11_master_plan(self, output_png: Path) -> Path:
        """Лист 11: Генеральный план (1:200) со сквозной экспликацией всех объектов 1..N."""
        img = Image.new("RGB", (self.PAGE_WIDTH, self.PAGE_HEIGHT), "#ffffff")
        draw = ImageDraw.Draw(img)

        self._draw_sheet_frame(draw, 11, "Генеральный план (Master Plan)")
        self._draw_boundary(draw, fill_color="#f0fdf4")

        # 1. Paving zones
        for p in self.scene.paving_zones:
            poly = [self.world_to_screen(pt[0], pt[1]) for pt in p.polygon]
            is_dpk = "dpk" in p.material or "decking" in p.type
            draw.polygon(poly, fill="#fed7aa" if is_dpk else "#e2e8f0", outline="#ea580c" if is_dpk else "#64748b", width=2)

        # 2. MAF
        for m in self.scene.maf_elements:
            sx, sy = self.world_to_screen(m.position[0], m.position[1])
            w_px = m.dimensions[0] * self.scale_ppm
            h_px = m.dimensions[1] * self.scale_ppm
            draw.rectangle([(sx, sy - h_px), (sx + w_px, sy)], fill="#bae6fd" if m.type=="pool" else "#fef08a", outline="#0284c7", width=2)

        # 3. Buildings
        for idx, b in enumerate(self.scene.buildings, 1):
            poly = [self.world_to_screen(pt[0], pt[1]) for pt in b.get_polygon()]
            draw.polygon(poly, fill="#f8fafc", outline="#0f172a", width=3)
            cx, cy = self.world_to_screen(b.origin[0] + b.dimensions[0]/2, b.origin[1] + b.dimensions[1]/2)
            
            # Number circle
            draw.ellipse([(cx - 12, cy - 12), (cx + 12, cy + 12)], fill="#0f172a", outline="#ffffff", width=1)
            draw.text((cx - 4, cy - 6), str(idx), fill="#ffffff")

        # 4. Plants
        for pl in self.scene.plants:
            sx, sy = self.world_to_screen(pl.position[0], pl.position[1])
            rad_px = (pl.crown_diameter_m / 2) * self.scale_ppm
            draw.ellipse([(sx - rad_px, sy - rad_px), (sx + rad_px, sy + rad_px)], fill="#15803d", outline="#166534", width=1)

        # Master Explication Table
        ex_x = self.PAGE_WIDTH - 380
        ex_y = 120
        draw.rectangle([(ex_x, ex_y), (ex_x + 350, ex_y + 320)], fill="#f8fafc", outline="#0f172a", width=2)
        draw.text((ex_x + 10, ex_y + 10), "Генеральная экспликация:", fill="#0f172a")

        y_cursor = ex_y + 35
        for idx, b in enumerate(self.scene.buildings, 1):
            draw.text((ex_x + 10, y_cursor), f"[{idx}] {b.name} ({b.area_sq_m} м²)", fill="#0f172a")
            y_cursor += 20

        for m in self.scene.maf_elements:
            draw.text((ex_x + 10, y_cursor), f"• {m.name} ({m.dimensions[0]}×{m.dimensions[1]} м)", fill="#334155")
            y_cursor += 18

        draw.line([(ex_x, y_cursor + 5), (ex_x + 350, y_cursor + 5)], fill="#cbd5e1", width=1)
        y_cursor += 15
        tep = self.scene.calculate_tep_summary()
        draw.text((ex_x + 10, y_cursor), f"S общая: {tep['S_total']} м²", fill="#0f172a")
        draw.text((ex_x + 10, y_cursor + 18), f"S зданий: {tep['S_buildings']} м² ({tep['balance_percent_buildings']}%)", fill="#334155")
        draw.text((ex_x + 10, y_cursor + 36), f"S настилов ДПК: {tep['S_paving_dpk']} м²", fill="#ea580c")
        draw.text((ex_x + 10, y_cursor + 54), f"S озеленения: {tep['S_greenery']} м² ({tep['balance_percent_greenery']}%)", fill="#15803d")

        img.save(str(output_png), "PNG")
        return output_png
