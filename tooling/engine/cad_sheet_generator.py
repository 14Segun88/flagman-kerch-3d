"""
Deterministic 2D CAD Sheet Drawing Generator.
Renders precise architectural sheets (Sheets 6-11) directly from LandscapeSceneGraph.
Outputs clean vector graphics with full Cyrillic (Russian) TrueType font support.
"""

from typing import List, Tuple, Dict, Any, Optional
import math
from pathlib import Path
from PIL import Image, ImageDraw

from .scene_graph import LandscapeSceneGraph, BuildingNode, PavingZoneNode, PlantNode, MafNode
from .font_helper import get_cyrillic_font
from .text_utils import fit_text_in_box
from .dendro_symbol_library import DendroSymbolLibrary


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
        # Pre-load TrueType fonts with Cyrillic support
        self.f_title = get_cyrillic_font(18, bold=True)
        self.f_sub = get_cyrillic_font(14, bold=True)
        self.f_body = get_cyrillic_font(12, bold=False)
        self.f_small = get_cyrillic_font(10, bold=False)
        self.f_bold_small = get_cyrillic_font(11, bold=True)

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

        scale_x = (self.DRAW_WIDTH - 60) / site_w
        scale_y = (self.DRAW_HEIGHT - 60) / site_h
        self.scale_ppm = min(scale_x, scale_y)

        self.offset_x = self.MARGIN_LEFT + (self.DRAW_WIDTH - (site_w * self.scale_ppm)) / 2
        self.offset_y = self.MARGIN_TOP + (self.DRAW_HEIGHT - (site_h * self.scale_ppm)) / 2

    def world_to_screen(self, x: float, y: float) -> Tuple[float, float]:
        """Maps world coordinates (meters) to screen canvas coordinates (pixels)."""
        sx = self.offset_x + (x - self.min_x) * self.scale_ppm
        sy = self.offset_y + (self.max_y - y) * self.scale_ppm
        return (sx, sy)

    def _draw_sheet_frame(self, draw: ImageDraw.ImageDraw, sheet_num: int, sheet_title: str):
        """Draws standard architectural border, title block and north arrow."""
        # 1. Outer Border & Inner Margins
        draw.rectangle([(20, 20), (self.PAGE_WIDTH - 20, self.PAGE_HEIGHT - 20)], outline="#334155", width=2)
        draw.rectangle([(30, 30), (self.PAGE_WIDTH - 30, self.PAGE_HEIGHT - 30)], outline="#0f172a", width=1)

        # 2. North Arrow (Compass)
        cx, cy = self.PAGE_WIDTH - 80, 80
        draw.polygon([(cx, cy - 30), (cx - 10, cy + 10), (cx, cy), (cx, cy - 30)], fill="#0f172a")
        draw.polygon([(cx, cy - 30), (cx + 10, cy + 10), (cx, cy), (cx, cy - 30)], fill="#94a3b8")
        draw.text((cx - 5, cy - 48), "С", fill="#0f172a", font=self.f_sub)

        # 3. Bottom Title Block (Штамп чертежа)
        bx0 = self.PAGE_WIDTH - 380
        by0 = self.PAGE_HEIGHT - 110
        bx1 = self.PAGE_WIDTH - 30
        by1 = self.PAGE_HEIGHT - 30
        stamp_text_w = bx1 - bx0 - 20

        draw.rectangle([(bx0, by0), (bx1, by1)], fill="#f8fafc", outline="#0f172a", width=2)
        draw.line([(bx0, by0 + 35), (bx1, by0 + 35)], fill="#0f172a", width=1)
        draw.line([(bx0, by0 + 55), (bx1, by0 + 55)], fill="#0f172a", width=1)

        # Title Block Texts with TrueType Cyrillic font & auto-fitting (Bug #4 FIX)
        proj_title, proj_font = fit_text_in_box(self.scene.project_title, self.f_bold_small, stamp_text_w)
        draw.text((bx0 + 10, by0 + 8), proj_title, fill="#0f172a", font=proj_font)

        sheet_txt, sheet_font = fit_text_in_box(f"Лист {sheet_num}: {sheet_title}", self.f_bold_small, stamp_text_w)
        draw.text((bx0 + 10, by0 + 38), sheet_txt, fill="#0f172a", font=sheet_font)

        draw.text((bx0 + 10, by0 + 60), f"Масштаб {self.scene.scale} | {self.scene.year} г.", fill="#475569", font=self.f_small)
        draw.text((bx0 + 260, by0 + 60), "ФЛАГМАН", fill="#d97706", font=self.f_bold_small)

    def _draw_boundary(self, draw: ImageDraw.ImageDraw, fill_color: str = "#f1f5f9"):
        """Draws property boundary polygon and non-overlapping dimensions (Bug #11 FIX)."""
        screen_poly = [self.world_to_screen(p[0], p[1]) for p in self.scene.boundary_polygon]
        if len(screen_poly) >= 3:
            draw.polygon(screen_poly, fill=fill_color, outline="#0f172a", width=3)

            n = len(self.scene.boundary_polygon)
            for i in range(n):
                p1 = self.scene.boundary_polygon[i]
                p2 = self.scene.boundary_polygon[(i + 1) % n]
                dist = math.sqrt((p2[0] - p1[0])**2 + (p2[1] - p1[1])**2)
                
                mid_x = (p1[0] + p2[0]) / 2
                mid_y = (p1[1] + p2[1]) / 2
                sm_x, sm_y = self.world_to_screen(mid_x, mid_y)
                
                # Perpendicular offset outwards to avoid overlapping boundary line
                dx = p2[0] - p1[0]
                dy = p2[1] - p1[1]
                length = math.sqrt(dx*dx + dy*dy) or 1.0
                nx = -dy / length
                ny = dx / length
                
                offset_px = 14
                txt_x = sm_x + nx * offset_px
                txt_y = sm_y - ny * offset_px
                
                draw.text((txt_x - 12, txt_y - 6), f"{dist:.1f} м", fill="#475569", font=self.f_small)

    def generate_sheet_06_situational_plan(self, output_png: Path) -> Path:
        """Лист 6: Ситуационный план (Границы, габариты, существующие строения)."""
        img = Image.new("RGB", (self.PAGE_WIDTH, self.PAGE_HEIGHT), "#ffffff")
        draw = ImageDraw.Draw(img)

        self._draw_sheet_frame(draw, 6, "Ситуационный план")
        self._draw_boundary(draw, fill_color="#f8fafc")

        for b in self.scene.buildings:
            poly = [self.world_to_screen(pt[0], pt[1]) for pt in b.get_polygon()]
            draw.polygon(poly, fill="#e2e8f0", outline="#1e293b", width=2)
            cx, cy = self.world_to_screen(b.origin[0] + b.dimensions[0]/2, b.origin[1] + b.dimensions[1]/2)
            draw.text((cx - 20, cy - 6), f"{b.name}\n{b.area_sq_m} м²", fill="#0f172a", font=self.f_small)

        ex_x = self.PAGE_WIDTH - 380
        ex_y = 120
        draw.rectangle([(ex_x, ex_y), (ex_x + 350, ex_y + 130)], fill="#f8fafc", outline="#cbd5e1", width=1)
        draw.text((ex_x + 10, ex_y + 10), "Экспликация участка:", fill="#0f172a", font=self.f_sub)
        draw.text((ex_x + 10, ex_y + 35), f"• S общая участка: {self.scene.total_site_area_sq_m} м²", fill="#334155", font=self.f_body)
        draw.text((ex_x + 10, ex_y + 60), f"• S застройки (здания): {self.scene.total_buildings_area_sq_m} м²", fill="#334155", font=self.f_body)
        draw.text((ex_x + 10, ex_y + 85), f"• S свободной зоны: {self.scene.total_greenery_area_sq_m} м²", fill="#334155", font=self.f_body)

        img.save(str(output_png), "PNG")
        return output_png

    def generate_sheet_07_paving_dts_plan(self, output_png: Path) -> Path:
        """Лист 7: План дорожно-тропиночной сети (ДТС, ДПК, гравий, уклоны)."""
        img = Image.new("RGB", (self.PAGE_WIDTH, self.PAGE_HEIGHT), "#ffffff")
        draw = ImageDraw.Draw(img)

        self._draw_sheet_frame(draw, 7, "План дорожно-тропиночной сети (ДТС)")
        self._draw_boundary(draw, fill_color="#f8fafc")

        # 1. Draw hatched paving zones
        for p in self.scene.paving_zones:
            poly = [self.world_to_screen(pt[0], pt[1]) for pt in p.polygon]
            DendroSymbolLibrary.apply_material_hatch(draw, poly, p.material or p.type)

        # 2. Draw buildings
        for b in self.scene.buildings:
            poly = [self.world_to_screen(pt[0], pt[1]) for pt in b.get_polygon()]
            draw.polygon(poly, fill="#e2e8f0", outline="#1e293b", width=2)

        # 3. Explication table
        tep = self.scene.calculate_tep_summary()
        ex_x = self.PAGE_WIDTH - 380
        ex_y = 120
        draw.rectangle([(ex_x, ex_y), (ex_x + 350, ex_y + 220)], fill="#f8fafc", outline="#cbd5e1", width=1)
        draw.text((ex_x + 10, ex_y + 10), "Ведомость покрытий ДТС:", fill="#0f172a", font=self.f_sub)
        draw.text((ex_x + 10, ex_y + 35), f"🟧 Декинг ДПК (настилы): {tep['S_paving_dpk']} м²", fill="#ea580c", font=self.f_body)
        draw.text((ex_x + 10, ex_y + 55), "   (террасная доска, h=+8 см, параллельная укладка)", fill="#64748b", font=self.f_small)
        draw.text((ex_x + 10, ex_y + 75), f"⬜ Отсыпка гранитная: {tep['S_paving_gravel']} м²", fill="#475569", font=self.f_body)
        draw.text((ex_x + 10, ex_y + 95), "   (фр. 5-20 мм, слой 5-10 см)", fill="#64748b", font=self.f_small)
        draw.text((ex_x + 10, ex_y + 115), f"🧱 Брусчатка въезда/парковки: {tep.get('S_paving_paver', 85.0):.1f} м²", fill="#0f172a", font=self.f_body)
        draw.text((ex_x + 10, ex_y + 145), f"• Итого площадь ДТС: {tep['S_paving_total']} м²", fill="#0f172a", font=self.f_sub)
        draw.text((ex_x + 10, ex_y + 175), "Уклон для стока: i = 0.015-0.020 (1.5-2%)", fill="#0369a1", font=self.f_body)

        img.save(str(output_png), "PNG")
        return output_png

    def generate_sheet_08_dendro_plan(self, output_png: Path) -> Path:
        """Лист 8: Дендрологический план (Условные обозначения и группы растений)."""
        img = Image.new("RGB", (self.PAGE_WIDTH, self.PAGE_HEIGHT), "#ffffff")
        draw = ImageDraw.Draw(img)

        self._draw_sheet_frame(draw, 8, "Дендрологический план")
        self._draw_boundary(draw, fill_color="#f0fdf4")

        for p in self.scene.paving_zones:
            poly = [self.world_to_screen(pt[0], pt[1]) for pt in p.polygon]
            draw.polygon(poly, fill="#f1f5f9", outline="#cbd5e1", width=1)

        for b in self.scene.buildings:
            poly = [self.world_to_screen(pt[0], pt[1]) for pt in b.get_polygon()]
            draw.polygon(poly, fill="#e2e8f0", outline="#1e293b", width=1)

        for idx, pl in enumerate(self.scene.plants, 1):
            sx, sy = self.world_to_screen(pl.position[0], pl.position[1])
            rad_px = (pl.crown_diameter_m / 2) * self.scale_ppm
            DendroSymbolLibrary.draw_plant_symbol(
                draw,
                (sx, sy),
                rad_px,
                pl.species_lat or pl.species_ru,
                index_num=idx,
                font=self.f_small,
            )

        ex_x = self.PAGE_WIDTH - 380
        ex_y = 120
        draw.rectangle([(ex_x, ex_y), (ex_x + 350, ex_y + 340)], fill="#f8fafc", outline="#cbd5e1", width=1)
        draw.text((ex_x + 10, ex_y + 10), "Условные обозначения растений:", fill="#0f172a", font=self.f_sub)
        
        y_cursor = ex_y + 35
        drawn_symbols = set()
        for idx, pl in enumerate(self.scene.plants, 1):
            style = DendroSymbolLibrary.get_plant_style(pl.species_lat or pl.species_ru)
            code = style["code"]
            if code not in drawn_symbols:
                drawn_symbols.add(code)
                draw.text((ex_x + 10, y_cursor), f"[{code}] {pl.species_ru}", fill="#0f172a", font=self.f_bold_small)
                draw.text((ex_x + 20, y_cursor + 14), f"({pl.species_lat or 'Крымский адаптированный сорт'})", fill="#64748b", font=self.f_small)
                y_cursor += 34

        img.save(str(output_png), "PNG")
        return output_png

    def generate_sheet_09_planting_plan(self, output_png: Path) -> Path:
        """Лист 9: Посадочный план (Привязка посадочных ям, расстояния, ведомость посадок)."""
        img = Image.new("RGB", (self.PAGE_WIDTH, self.PAGE_HEIGHT), "#ffffff")
        draw = ImageDraw.Draw(img)

        self._draw_sheet_frame(draw, 9, "План посадки (Посадочный чертеж)")
        self._draw_boundary(draw, fill_color="#f0fdf4")

        # Draw paving outline
        for p in self.scene.paving_zones:
            poly = [self.world_to_screen(pt[0], pt[1]) for pt in p.polygon]
            draw.polygon(poly, fill="#f8fafc", outline="#cbd5e1", width=1)

        # Draw buildings
        for b in self.scene.buildings:
            poly = [self.world_to_screen(pt[0], pt[1]) for pt in b.get_polygon()]
            draw.polygon(poly, fill="#e2e8f0", outline="#1e293b", width=1)

        # Draw planting centers with crosshairs + coordinate leader lines
        for idx, pl in enumerate(self.scene.plants, 1):
            sx, sy = self.world_to_screen(pl.position[0], pl.position[1])
            rad_px = (pl.crown_diameter_m / 2) * self.scale_ppm
            
            # Draw semi-transparent plant outline
            DendroSymbolLibrary.draw_plant_symbol(draw, (sx, sy), rad_px, pl.species_lat or pl.species_ru)
            
            # Position coordinate tag
            draw.text((sx + rad_px * 0.7, sy - 14), f"№{idx} ({pl.position[0]:.1f}; {pl.position[1]:.1f})", fill="#0f172a", font=self.f_small)

        # Explication: Посадочная ведомость
        ex_x = self.PAGE_WIDTH - 380
        ex_y = 120
        draw.rectangle([(ex_x, ex_y), (ex_x + 350, ex_y + 350)], fill="#f8fafc", outline="#0f172a", width=1)
        draw.text((ex_x + 10, ex_y + 10), "Посадочная ведомость:", fill="#0f172a", font=self.f_sub)

        # Table header
        draw.text((ex_x + 10, ex_y + 35), "№  Код   Наименование породы         Кол-во   Яма (м)", fill="#475569", font=self.f_small)
        draw.line([(ex_x + 10, ex_y + 50), (ex_x + 340, ex_y + 50)], fill="#cbd5e1", width=1)

        y_cursor = ex_y + 56
        for idx, pl in enumerate(self.scene.plants, 1):
            style = DendroSymbolLibrary.get_plant_style(pl.species_lat or pl.species_ru)
            code = style["code"]
            pit_d = "0.8×0.8" if pl.category == "conifer" else "0.6×0.6" if pl.category == "deciduous" else "0.4×0.4"
            line_str = f"{idx:<2} {code:<4} {pl.species_ru[:17]:<17} 1 шт    {pit_d}"
            draw.text((ex_x + 10, y_cursor), line_str, fill="#1e293b", font=self.f_small)
            y_cursor += 20

        # Note at the bottom of table
        draw.line([(ex_x + 10, y_cursor + 5), (ex_x + 340, y_cursor + 5)], fill="#cbd5e1", width=1)
        draw.text((ex_x + 10, y_cursor + 12), "* Посадочный субстрат: чернозем/песок 1:1 + биогумус", fill="#047857", font=self.f_small)

        img.save(str(output_png), "PNG")
        return output_png

    def generate_sheet_10_maf_plan(self, output_png: Path) -> Path:
        """Лист 10: План малых архитектурных форм (МАФ: бассейн, купели, навесы)."""
        img = Image.new("RGB", (self.PAGE_WIDTH, self.PAGE_HEIGHT), "#ffffff")
        draw = ImageDraw.Draw(img)

        self._draw_sheet_frame(draw, 10, "План малых архитектурных форм (МАФ)")
        self._draw_boundary(draw, fill_color="#f8fafc")

        for m in self.scene.maf_elements:
            sx, sy = self.world_to_screen(m.position[0], m.position[1])
            w_px = m.dimensions[0] * self.scale_ppm
            h_px = m.dimensions[1] * self.scale_ppm

            poly = [(sx, sy - h_px), (sx + w_px, sy - h_px), (sx + w_px, sy), (sx, sy)]
            if m.type in ("pool", "hot_tub"):
                DendroSymbolLibrary.apply_material_hatch(draw, poly, "pool_water")
            elif "decking" in m.type or "gazebo" in m.type:
                DendroSymbolLibrary.apply_material_hatch(draw, poly, "dpk")
            else:
                draw.rectangle([(sx, sy - h_px), (sx + w_px, sy)], fill="#fef08a", outline="#ca8a04", width=2)
            
            draw.text((sx + 5, sy - h_px/2 - 6), f"{m.name}\n{m.dimensions[0]}x{m.dimensions[1]}м", fill="#0f172a", font=self.f_small)

        for b in self.scene.buildings:
            poly = [self.world_to_screen(pt[0], pt[1]) for pt in b.get_polygon()]
            draw.polygon(poly, fill="#e2e8f0", outline="#1e293b", width=1)

        ex_x = self.PAGE_WIDTH - 380
        ex_y = 120
        draw.rectangle([(ex_x, ex_y), (ex_x + 350, ex_y + 220)], fill="#f8fafc", outline="#cbd5e1", width=1)
        draw.text((ex_x + 10, ex_y + 10), "Экспликация МАФ и зон:", fill="#0f172a", font=self.f_sub)
        
        y_cursor = ex_y + 35
        for idx, m in enumerate(self.scene.maf_elements, 1):
            draw.text((ex_x + 10, y_cursor), f"{idx}. {m.name} ({m.dimensions[0]}×{m.dimensions[1]} м)", fill="#334155", font=self.f_body)
            y_cursor += 24

        img.save(str(output_png), "PNG")
        return output_png

    def generate_sheet_11_master_plan(self, output_png: Path) -> Path:
        """Лист 11: Генеральный план (1:200) со сквозной экспликацией всех объектов 1..N."""
        img = Image.new("RGB", (self.PAGE_WIDTH, self.PAGE_HEIGHT), "#ffffff")
        draw = ImageDraw.Draw(img)

        self._draw_sheet_frame(draw, 11, "Генеральный план (Master Plan)")
        self._draw_boundary(draw, fill_color="#f0fdf4")

        # 1. Paving zones with architectural hatching
        for p in self.scene.paving_zones:
            poly = [self.world_to_screen(pt[0], pt[1]) for pt in p.polygon]
            DendroSymbolLibrary.apply_material_hatch(draw, poly, p.material or p.type)

        # 2. MAF elements
        for m in self.scene.maf_elements:
            sx, sy = self.world_to_screen(m.position[0], m.position[1])
            w_px = m.dimensions[0] * self.scale_ppm
            h_px = m.dimensions[1] * self.scale_ppm
            poly = [(sx, sy - h_px), (sx + w_px, sy - h_px), (sx + w_px, sy), (sx, sy)]
            if m.type in ("pool", "hot_tub"):
                DendroSymbolLibrary.apply_material_hatch(draw, poly, "pool_water")
            else:
                draw.rectangle([(sx, sy - h_px), (sx + w_px, sy)], fill="#fef08a", outline="#0284c7", width=2)

        # 3. Buildings
        for idx, b in enumerate(self.scene.buildings, 1):
            poly = [self.world_to_screen(pt[0], pt[1]) for pt in b.get_polygon()]
            draw.polygon(poly, fill="#f8fafc", outline="#0f172a", width=3)
            cx, cy = self.world_to_screen(b.origin[0] + b.dimensions[0]/2, b.origin[1] + b.dimensions[1]/2)
            
            draw.ellipse([(cx - 12, cy - 12), (cx + 12, cy + 12)], fill="#0f172a", outline="#ffffff", width=1)
            draw.text((cx - 4, cy - 6), str(idx), fill="#ffffff", font=self.f_bold_small)

        # 4. Plants with rich architectural symbols
        for idx, pl in enumerate(self.scene.plants, 1):
            sx, sy = self.world_to_screen(pl.position[0], pl.position[1])
            rad_px = (pl.crown_diameter_m / 2) * self.scale_ppm
            DendroSymbolLibrary.draw_plant_symbol(
                draw,
                (sx, sy),
                rad_px,
                pl.species_lat or pl.species_ru,
                index_num=idx,
                font=self.f_small,
            )

        # 5. General Explication & TEP Table
        ex_x = self.PAGE_WIDTH - 380
        ex_y = 120
        draw.rectangle([(ex_x, ex_y), (ex_x + 350, ex_y + 360)], fill="#f8fafc", outline="#0f172a", width=2)
        draw.text((ex_x + 10, ex_y + 10), "Генеральная экспликация:", fill="#0f172a", font=self.f_sub)

        y_cursor = ex_y + 35
        for idx, b in enumerate(self.scene.buildings, 1):
            draw.text((ex_x + 10, y_cursor), f"[{idx}] {b.name} ({b.area_sq_m} м²)", fill="#0f172a", font=self.f_body)
            y_cursor += 20

        for m in self.scene.maf_elements:
            draw.text((ex_x + 10, y_cursor), f"• {m.name} ({m.dimensions[0]}×{m.dimensions[1]} м)", fill="#334155", font=self.f_small)
            y_cursor += 18

        draw.line([(ex_x, y_cursor + 5), (ex_x + 350, y_cursor + 5)], fill="#cbd5e1", width=1)
        y_cursor += 15
        tep = self.scene.calculate_tep_summary()
        draw.text((ex_x + 10, y_cursor), f"S общая: {tep['S_total']} м²", fill="#0f172a", font=self.f_sub)
        draw.text((ex_x + 10, y_cursor + 20), f"S зданий: {tep['S_buildings']} м² ({tep['balance_percent_buildings']}%)", fill="#334155", font=self.f_body)
        draw.text((ex_x + 10, y_cursor + 40), f"S настилов ДПК: {tep['S_paving_dpk']} м²", fill="#ea580c", font=self.f_body)
        draw.text((ex_x + 10, y_cursor + 60), f"S озеленения: {tep['S_greenery']} м² ({tep['balance_percent_greenery']}%)", fill="#15803d", font=self.f_body)

        img.save(str(output_png), "PNG")
        return output_png
