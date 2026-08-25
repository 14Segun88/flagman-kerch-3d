"""
13-Page Landscape & Architectural Explanatory Note PDF Album Builder.
Assembles text sheets and 2D CAD/3D render graphics into a clean, printable PDF
with 100% Cyrillic TrueType font support.
"""

from pathlib import Path
from typing import Dict, Any, List
import fitz  # PyMuPDF
from PIL import Image, ImageDraw

from .scene_graph import LandscapeSceneGraph
from .cad_sheet_generator import CadSheetGenerator
from .font_helper import get_cyrillic_font
from .text_utils import word_wrap, fit_text_in_box


class AlbumPdfBuilder:
    """Constructs the complete 13-sheet PDF project album."""

    PAGE_WIDTH_PT = 842   # A4 Landscape in points (297mm)
    PAGE_HEIGHT_PT = 595  # A4 Landscape in points (210mm)

    # Drawing canvas constants
    CANVAS_W = 1200
    CANVAS_H = 850
    TEXT_LEFT = 60
    TEXT_RIGHT = 1140  # right boundary for text
    TEXT_MAX_W = 1060  # max text width in px (TEXT_RIGHT - TEXT_LEFT - small margin)

    def __init__(self, scene: LandscapeSceneGraph, output_dir: Path):
        self.scene = scene
        self.output_dir = output_dir
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.cad_gen = CadSheetGenerator(scene)

        # Pre-load TrueType Cyrillic fonts
        self.f_hero = get_cyrillic_font(28, bold=True)
        self.f_title = get_cyrillic_font(20, bold=True)
        self.f_h2 = get_cyrillic_font(15, bold=True)
        self.f_body = get_cyrillic_font(13, bold=False)
        self.f_small = get_cyrillic_font(10, bold=False)
        self.f_stamp = get_cyrillic_font(11, bold=True)
        self.f_stamp_sm = get_cyrillic_font(9, bold=True)

    def _draw_stamp(self, draw: ImageDraw.ImageDraw, sheet_num: int, title: str):
        """Draws bottom-right title block (штамп) with auto-fitting text."""
        bx0 = self.CANVAS_W - 380
        by0 = self.CANVAS_H - 110
        bx1 = self.CANVAS_W - 30
        by1 = self.CANVAS_H - 30
        stamp_text_w = bx1 - bx0 - 20  # usable text width inside stamp

        draw.rectangle([(bx0, by0), (bx1, by1)], fill="#f8fafc", outline="#0f172a", width=2)
        draw.line([(bx0, by0 + 35), (bx1, by0 + 35)], fill="#0f172a", width=1)
        draw.line([(bx0, by0 + 55), (bx1, by0 + 55)], fill="#0f172a", width=1)

        # Row 1: project title — auto-fit to stamp width
        proj_title_text, proj_title_font = fit_text_in_box(
            self.scene.project_title, self.f_stamp, stamp_text_w
        )
        draw.text((bx0 + 10, by0 + 8), proj_title_text, fill="#0f172a", font=proj_title_font)

        # Row 2: sheet number + title — auto-fit
        sheet_label = f"Лист {sheet_num}: {title}"
        sheet_label_text, sheet_label_font = fit_text_in_box(
            sheet_label, self.f_stamp, stamp_text_w
        )
        draw.text((bx0 + 10, by0 + 38), sheet_label_text, fill="#0f172a", font=sheet_label_font)

        # Row 3: year + brand
        draw.text((bx0 + 10, by0 + 60), f"{self.scene.year} г.", fill="#475569", font=self.f_small)
        draw.text((bx0 + 260, by0 + 60), "ФЛАГМАН", fill="#d97706", font=self.f_stamp)

    def _create_text_sheet_image(self, sheet_num: int, title: str, sections: List[Dict[str, str]]) -> Path:
        """Generates a styled A4 landscape graphic page for narrative text sheets."""
        img = Image.new("RGB", (self.CANVAS_W, self.CANVAS_H), "#ffffff")
        draw = ImageDraw.Draw(img)

        # Border & Inner Margin
        draw.rectangle([(20, 20), (self.CANVAS_W - 20, self.CANVAS_H - 20)], outline="#334155", width=2)
        draw.rectangle([(30, 30), (self.CANVAS_W - 30, self.CANVAS_H - 30)], outline="#0f172a", width=1)

        # Header Title
        draw.text((self.TEXT_LEFT, 50), title, fill="#0f172a", font=self.f_title)
        draw.line([(self.TEXT_LEFT, 85), (self.TEXT_RIGHT, 85)], fill="#cbd5e1", width=1)

        y_cursor = 105
        max_y = self.CANVAS_H - 130  # stop before stamp area

        for sec in sections:
            if y_cursor >= max_y:
                break

            if sec.get("heading"):
                draw.text((self.TEXT_LEFT, y_cursor), sec["heading"], fill="#0f172a", font=self.f_h2)
                y_cursor += 28

            body = sec.get("body", "")
            # Word-wrap body text to fit within text area
            wrapped_lines = word_wrap(body, self.f_body, self.TEXT_MAX_W)
            for line in wrapped_lines:
                if y_cursor >= max_y:
                    break
                draw.text((self.TEXT_LEFT, y_cursor), line, fill="#334155", font=self.f_body)
                y_cursor += 22
            y_cursor += 16

        # Bottom Stamp
        self._draw_stamp(draw, sheet_num, title)

        out_path = self.output_dir / f"sheet_{sheet_num:02d}.png"
        img.save(str(out_path), "PNG")
        return out_path

    def _create_cover_page(self) -> Path:
        """Лист 1: Титульный лист с мини-генпланом."""
        img = Image.new("RGB", (self.CANVAS_W, self.CANVAS_H), "#0f172a")
        draw = ImageDraw.Draw(img)

        draw.rectangle([(30, 30), (self.CANVAS_W - 30, self.CANVAS_H - 30)], outline="#d97706", width=2)
        draw.text((80, 55), f"Ландшафтное бюро / {self.scene.author}", fill="#94a3b8", font=self.f_h2)
        draw.text((80, 85), "тел: +7 (978) 066-23-80 | flagman-kerch.ru", fill="#64748b", font=self.f_body)

        # --- Mini master-plan preview (Bug #3 fix) ---
        preview_img = self._generate_mini_masterplan_preview()
        if preview_img:
            # Place preview image centered, with border
            pw, ph = preview_img.size
            # Scale to fit in ~700x280 area
            target_w, target_h = 700, 280
            scale = min(target_w / pw, target_h / ph)
            new_w, new_h = int(pw * scale), int(ph * scale)
            preview_resized = preview_img.resize((new_w, new_h), Image.LANCZOS)

            px = (self.CANVAS_W - new_w) // 2
            py = 130
            img.paste(preview_resized, (px, py))
            # Gold border around preview
            draw.rectangle([(px - 2, py - 2), (px + new_w + 2, py + new_h + 2)], outline="#d97706", width=2)
            title_y = py + new_h + 30
        else:
            title_y = 270

        draw.text((80, title_y), "Э С К И З Н Ы Й   П Р О Е К Т", fill="#d97706", font=self.f_hero)
        draw.text((80, title_y + 50), "Благоустройства и 3D-моделирования территории", fill="#ffffff", font=self.f_title)
        draw.text((80, title_y + 100), f"Адрес объекта: {self.scene.address}", fill="#cbd5e1", font=self.f_h2)
        draw.text((80, title_y + 135), f"Площадь участка: S = {self.scene.total_site_area_sq_m} м²", fill="#94a3b8", font=self.f_body)

        draw.text((80, self.CANVAS_H - 80), f"г. Керчь, {self.scene.year} г.", fill="#64748b", font=self.f_body)
        draw.text((self.CANVAS_W - 220, self.CANVAS_H - 80), "ФЛАГМАН 3D", fill="#d97706", font=self.f_title)

        out_path = self.output_dir / "sheet_01.png"
        img.save(str(out_path), "PNG")
        return out_path

    def _generate_mini_masterplan_preview(self) -> Image.Image | None:
        """Generates a small master-plan preview image for the cover page."""
        try:
            # Use cad_gen to render a simplified master plan
            temp_path = self.output_dir / "_temp_cover_preview.png"
            self.cad_gen.generate_sheet_11_master_plan(temp_path)
            preview = Image.open(str(temp_path))
            # Crop to just the site boundary drawing area (avoid explication box at x>=820)
            cropped = preview.crop((160, 90, 770, 720))
            return cropped
        except Exception:
            return None

    def _create_3d_visualization_sheet(self, sheet_num: int, title: str, subtitle: str) -> Path:
        """Creates a visualization sheet with stylized placeholder (Bug #2 fix)."""
        img = Image.new("RGB", (self.CANVAS_W, self.CANVAS_H), "#ffffff")
        draw = ImageDraw.Draw(img)

        # Check if real render exists
        render_candidates = [
            self.output_dir / "render_preview.png",
            self.output_dir / f"render_{sheet_num}.png",
        ]
        real_render = None
        for rp in render_candidates:
            if rp.exists():
                real_render = rp
                break

        if real_render:
            # Use real render
            render_img = Image.open(str(real_render))
            render_img = render_img.resize((self.CANVAS_W, self.CANVAS_H), Image.LANCZOS)
            img.paste(render_img)
            draw = ImageDraw.Draw(img)
        else:
            # Generate stylized placeholder with gradient sky + master plan overlay
            # Sky gradient (top → blue, bottom → lighter)
            for y_px in range(self.CANVAS_H):
                ratio = y_px / self.CANVAS_H
                r = int(15 + ratio * 80)
                g = int(23 + ratio * 100)
                b = int(42 + ratio * 120)
                draw.line([(0, y_px), (self.CANVAS_W, y_px)], fill=(r, g, b))

            # Overlay a semi-transparent version of the master plan
            try:
                mp_path = self.output_dir / "sheet_11.png"
                if mp_path.exists():
                    mp_img = Image.open(str(mp_path)).convert("RGBA")
                    mp_img = mp_img.resize((self.CANVAS_W, self.CANVAS_H), Image.LANCZOS)
                    # Create semi-transparent overlay
                    overlay = Image.new("RGBA", (self.CANVAS_W, self.CANVAS_H), (0, 0, 0, 0))
                    overlay.paste(mp_img, (0, 0))
                    # Blend with main image
                    img = img.convert("RGBA")
                    blended = Image.blend(img, overlay, alpha=0.35)
                    img = blended.convert("RGB")
                    draw = ImageDraw.Draw(img)
            except Exception:
                pass

            # Title overlay
            draw.rectangle([(40, 40), (self.CANVAS_W - 40, 130)], fill="#0f172ab0")
            draw.text((self.TEXT_LEFT, 55), title, fill="#ffffff", font=self.f_title)
            draw.text((self.TEXT_LEFT, 90), subtitle, fill="#d97706", font=self.f_h2)

            # Watermark
            draw.text((self.CANVAS_W // 2 - 120, self.CANVAS_H // 2 - 20),
                       "3D VISUALIZATION", fill="#ffffff40", font=self.f_hero)

        # Border and stamp
        draw.rectangle([(20, 20), (self.CANVAS_W - 20, self.CANVAS_H - 20)], outline="#475569", width=2)
        self._draw_stamp(draw, sheet_num, title)

        out_path = self.output_dir / f"sheet_{sheet_num:02d}.png"
        img.save(str(out_path), "PNG")
        return out_path

    def build_pdf_album(self, pdf_filename: str = "Пояснительная_записка_проект.pdf") -> Path:
        """Compiles all 13 sheets into the master PDF."""
        sheet_files: List[Path] = []

        # Sheet 1: Cover
        sheet_files.append(self._create_cover_page())

        # Sheet 2: Table of contents (Bug #5, #7 — page numbers + corrected structure)
        sheet_files.append(self._create_text_sheet_image(2, "Содержание", [
            {"heading": "1. Введение", "body": "Общие сведения об объекте, баланс площадей и инвентаризация насаждений. .................. Лист 3"},
            {"heading": "2. Климат и микроклиматические условия", "body": "Температурный режим, ветровые нагрузки, инсоляция побережья Керчи. .......................... Лист 3"},
            {"heading": "3. Почвы и грунтовые условия", "body": "Физико-механические свойства песчаных почв, дренаж и устройство оснований. ........... Лист 4"},
            {"heading": "4. Проектные предложения", "body": "Функциональное зонирование (BBQ, релакс, бассейн), конструкции ДТС. .......................... Лист 4"},
            {"heading": "5. Дендрологический состав", "body": "Каталог хвойных, лиственных и многолетних культур, адаптированных к почве. ................. Лист 5"},
            {"heading": "6. Графическая часть", "body": "Ситуационный план (Л.6), ДТС (Л.7), Дендроплан (Л.8), План посадки (Л.9),\nМАФ (Л.10), Генеральный план (Л.11). Масштаб М 1:200."},
            {"heading": "7. 3D-Визуализации", "body": "Общий вид комплекса (Л.12). Зоны отдыха и SPA (Л.13). ..................................................... Листы 12–13"},
        ]))

        # Sheet 3: Intro & Climate
        tep = self.scene.calculate_tep_summary()
        sheet_files.append(self._create_text_sheet_image(3, "1. Введение & 2. Климат", [
            {"heading": "1. Введение", "body": f"Проектируемая территория расположена по адресу: {self.scene.address}.\n"
                                               f"Общая площадь участка составляет Sобщ = {tep['S_total']} м².\n"
                                               f"Площадь зданий и строений Sзд = {tep['S_buildings']} м² ({tep['balance_percent_buildings']}%).\n"
                                               f"Площадь дорожно-тропиночной сети Sдтс = {tep['S_paving_total']} м² ({tep['balance_percent_paving']}%).\n"
                                               f"Площадь зеленой зоны Sзел = {tep['S_greenery']} м² ({tep['balance_percent_greenery']}%)."},
            {"heading": "2. Климатическая характеристика региона", "body": self.scene.climate_text or (
                "Климат района приближается к средиземноморскому с выраженным влиянием крымской степи.\n"
                "Лето сухое и жаркое (средняя температура +28...+34 °C), высокая солнечная радиация.\n"
                "Ветровой режим активный: преобладают северо-восточные и юго-западные морские ветра."
            )}
        ]))

        # Sheet 4: Soil & Design proposals
        sheet_files.append(self._create_text_sheet_image(4, "3. Почвы & 4. Проектные предложения", [
            {"heading": "3. Характеристика почвенного покрова", "body": self.scene.soil_text or (
                "Почвы участка песчаные и супесчаные приморские. Обладают высокой воздухопроницаемостью,\n"
                "быстро прогреваются весной, но имеют слабую влагоудерживающую способность.\n"
                "Рекомендовано поднятие деревянных настилов на 5-10 см над землей и организация уклонов."
            )},
            {"heading": "4. Функциональное зонирование и ДТС", "body": self.scene.design_proposals_text or (
                "• Дорожно-тропиночная сеть (ДТС): настилы из ДПК (террасная доска) и отсыпка гранитным щебнем.\n"
                "• Зона BBQ: летняя терраса под навесом (H=2.7 м) для приготовления пищи и отдыха.\n"
                "• Зона релакса: банный комплекс с двумя купелями и открытой террасой.\n"
                "• Зона бассейна: чаша 6x4 м с террасой для загара и шезлонгами."
            )}
        ]))

        # Sheet 5: Dendrological species list
        sheet_files.append(self._create_text_sheet_image(5, "5. Дендрологический каталог", [
            {"heading": "Хвойные породы (устойчивые к песчаным кислым почвам):", "body": (
                "• Сосна черная «НАНА» (Pinus nigra Nana) — подушковидная форма, засухоустойчива.\n"
                "• Можжевельник Виргинский (Juniperus virginiana) — колоновидный акцент, солестойкий.\n"
                "• Можжевельник Казацкий (Juniperus sabina) — почвопокровный кустарник для укрепления грунта."
            )},
            {"heading": "Лиственные и красивоцветущие кустарники:", "body": (
                "• Спирея Вангутта (Spiraea vanhouttei) — обильное белое цветение.\n"
                "• Клен ясенелистный «Фламинго» (Acer negundo Flamingo) — пестролистный акцент.\n"
                "• Барбарис Тунберга, Дерен белый, Сирень венгерская."
            )},
            {"heading": "Многолетники и ароматические травы:", "body": (
                "• Лаванда узколистная (Lavandula angustifolia), Котовник Фассена, Шалфей дубравный."
            )}
        ]))

        # Sheets 6-11: CAD Drawings with Cyrillic TrueType Fonts
        sheet_files.append(self.cad_gen.generate_sheet_06_situational_plan(self.output_dir / "sheet_06.png"))
        sheet_files.append(self.cad_gen.generate_sheet_07_paving_dts_plan(self.output_dir / "sheet_07.png"))
        sheet_files.append(self.cad_gen.generate_sheet_08_dendro_plan(self.output_dir / "sheet_08.png"))
        # Bug #1 FIX: Sheet 9 was a duplicate of Sheet 8 — now uses dedicated planting plan
        sheet_files.append(self.cad_gen.generate_sheet_09_planting_plan(self.output_dir / "sheet_09.png"))
        sheet_files.append(self.cad_gen.generate_sheet_10_maf_plan(self.output_dir / "sheet_10.png"))
        sheet_files.append(self.cad_gen.generate_sheet_11_master_plan(self.output_dir / "sheet_11.png"))

        # Sheets 12-13: 3D Visualizations (Bug #2 FIX: styled placeholders instead of blank pages)
        sheet_files.append(self._create_3d_visualization_sheet(
            12, "3D-Визуализация (Общий вид)",
            "Архитектурная 3D-визуализация комплекса с высоты птичьего полёта (Daylight Scene)"
        ))
        sheet_files.append(self._create_3d_visualization_sheet(
            13, "3D-Визуализация (Зоны отдыха и SPA)",
            "Видовые кадры зоны бассейна, банного комплекса и ландшафтных групп"
        ))

        # Assemble into PDF via PyMuPDF
        pdf_doc = fitz.open()
        for s_path in sheet_files:
            img_doc = fitz.open(str(s_path))
            rect = fitz.Rect(0, 0, self.PAGE_WIDTH_PT, self.PAGE_HEIGHT_PT)
            pdf_bytes = img_doc.convert_to_pdf()
            img_pdf = fitz.open("pdf", pdf_bytes)
            page = pdf_doc.new_page(width=self.PAGE_WIDTH_PT, height=self.PAGE_HEIGHT_PT)
            page.show_pdf_page(rect, img_pdf, 0)
            img_doc.close()

        final_pdf_path = self.output_dir / pdf_filename
        pdf_doc.save(str(final_pdf_path))
        pdf_doc.close()
        print(f"🎉 [PDF Builder] Successfully assembled 13-sheet PDF Album with Cyrillic fonts: {final_pdf_path}")
        return final_pdf_path
