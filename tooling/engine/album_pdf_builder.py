"""
13-Page Landscape & Architectural Explanatory Note PDF Album Builder.
Assembles text sheets and 2D CAD/3D render graphics into a clean, printable PDF.
"""

from pathlib import Path
from typing import Dict, Any, List
import fitz  # PyMuPDF
from PIL import Image, ImageDraw, ImageFont

from .scene_graph import LandscapeSceneGraph
from .cad_sheet_generator import CadSheetGenerator


class AlbumPdfBuilder:
    """Constructs the complete 13-sheet PDF project album."""

    PAGE_WIDTH_PT = 842   # A4 Landscape in points (297mm)
    PAGE_HEIGHT_PT = 595  # A4 Landscape in points (210mm)

    def __init__(self, scene: LandscapeSceneGraph, output_dir: Path):
        self.scene = scene
        self.output_dir = output_dir
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.cad_gen = CadSheetGenerator(scene)

    def _create_text_sheet_image(self, sheet_num: int, title: str, sections: List[Dict[str, str]]) -> Path:
        """Generates a styled A4 landscape graphic page for narrative text sheets."""
        width_px = 1200
        height_px = 850
        img = Image.new("RGB", (width_px, height_px), "#ffffff")
        draw = ImageDraw.Draw(img)

        # Border & Title block
        draw.rectangle([(20, 20), (width_px - 20, height_px - 20)], outline="#334155", width=2)
        draw.rectangle([(30, 30), (width_px - 30, height_px - 30)], outline="#0f172a", width=1)

        # Header Title
        draw.text((60, 50), title, fill="#0f172a")
        draw.line([(60, 75), (width_px - 60, 75)], fill="#cbd5e1", width=1)

        y_cursor = 95
        for sec in sections:
            if sec.get("heading"):
                draw.text((60, y_cursor), sec["heading"], fill="#0f172a")
                y_cursor += 25
            
            body = sec.get("body", "")
            # Word wrap simulation
            lines = body.split("\n")
            for l in lines:
                draw.text((60, y_cursor), l, fill="#334155")
                y_cursor += 20
            y_cursor += 15

        # Bottom Stamp
        bx0 = width_px - 380
        by0 = height_px - 110
        bx1 = width_px - 30
        by1 = height_px - 30
        draw.rectangle([(bx0, by0), (bx1, by1)], fill="#f8fafc", outline="#0f172a", width=2)
        draw.text((bx0 + 10, by0 + 8), self.scene.project_title[:38], fill="#0f172a")
        draw.text((bx0 + 10, by0 + 38), f"Лист {sheet_num}: {title}", fill="#0f172a")
        draw.text((bx0 + 10, by0 + 60), f"{self.scene.year} г.", fill="#475569")
        draw.text((bx0 + 260, by0 + 60), "ФЛАГМАН", fill="#d97706")

        out_path = self.output_dir / f"sheet_{sheet_num:02d}.png"
        img.save(str(out_path), "PNG")
        return out_path

    def _create_cover_page(self) -> Path:
        """Лист 1: Титульный лист."""
        width_px = 1200
        height_px = 850
        img = Image.new("RGB", (width_px, height_px), "#0f172a")
        draw = ImageDraw.Draw(img)

        draw.rectangle([(30, 30), (width_px - 30, height_px - 30)], outline="#d97706", width=2)
        draw.text((80, 80), f"Ландшафтное бюро / {self.scene.author}", fill="#94a3b8")
        draw.text((80, 105), "тел: +7 (978) 066-23-80 | flagman-kerch.ru", fill="#64748b")

        draw.text((80, 300), "Э С К И З Н Ы Й   П Р О Е К Т", fill="#d97706")
        draw.text((80, 340), "Благоустройства и 3D-моделирования территории", fill="#ffffff")
        draw.text((80, 390), f"Адрес объекта: {self.scene.address}", fill="#cbd5e1")
        draw.text((80, 420), f"Площадь участка: S = {self.scene.total_site_area_sq_m} м²", fill="#94a3b8")

        draw.text((80, height_px - 80), f"г. Керчь, {self.scene.year} г.", fill="#64748b")
        draw.text((width_px - 220, height_px - 80), "ФЛАГМАН 3D", fill="#d97706")

        out_path = self.output_dir / "sheet_01.png"
        img.save(str(out_path), "PNG")
        return out_path

    def build_pdf_album(self, pdf_filename: str = "Пояснительная_записка_проект.pdf") -> Path:
        """Compiles all 13 sheets into the master PDF."""
        sheet_files: List[Path] = []

        # Sheet 1: Cover
        sheet_files.append(self._create_cover_page())

        # Sheet 2: Table of contents
        sheet_files.append(self._create_text_sheet_image(2, "Содержание", [
            {"heading": "1. Введение", "body": "Общие сведения об объекте, баланс площадей и инвентаризация насаждений."},
            {"heading": "2. Климат и микроклиматические условия", "body": "Температурный режим, ветровые нагрузки, инсоляция побережья Керчи."},
            {"heading": "3. Почвы и грунтовые условия", "body": "Физико-механические свойства песчаных почв, дренаж и устройство оснований."},
            {"heading": "4. Проектные предложения", "body": "Зонирование (BBQ, релакс, бассейн), конструкции дорожно-тропиночной сети (ДТС)."},
            {"heading": "5. Дендрологический состав", "body": "Каталог хвойных, лиственных и многолетних культур, адаптированных к почве."},
            {"heading": "6. Графическая часть (Чертежи и 3D)", "body": "Листы 6–11: 2D CAD планы М 1:200. Листы 12–13: 3D-визуализации и рендеры."}
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

        # Sheets 6-11: CAD Drawings
        sheet_files.append(self.cad_gen.generate_sheet_06_situational_plan(self.output_dir / "sheet_06.png"))
        sheet_files.append(self.cad_gen.generate_sheet_07_paving_dts_plan(self.output_dir / "sheet_07.png"))
        sheet_files.append(self.cad_gen.generate_sheet_08_dendro_plan(self.output_dir / "sheet_08.png"))
        sheet_files.append(self.cad_gen.generate_sheet_08_dendro_plan(self.output_dir / "sheet_09.png"))  # Planting layout
        sheet_files.append(self.cad_gen.generate_sheet_10_maf_plan(self.output_dir / "sheet_10.png"))
        sheet_files.append(self.cad_gen.generate_sheet_11_master_plan(self.output_dir / "sheet_11.png"))

        # Sheets 12-13: 3D Visualizations
        # If real 3D render exists, use it; otherwise generate styled 3D visual preview sheet
        render_path = self.output_dir / "render_preview.png"
        vis_12 = render_path if render_path.exists() else self._create_text_sheet_image(12, "3D-Визуализация (Общий вид)", [
            {"heading": "Архитектурная 3D-визуализация комплекса", "body": "Рендер генерального плана с высоты птичьего полета (Daylight Scene)."}
        ])
        vis_13 = self._create_text_sheet_image(13, "3D-Визуализация (Зоны отдыха и SPA)", [
            {"heading": "Видовые кадры зоны бассейна и банного комплекса", "body": "Визуализация освещения, террасы из ДПК и ландшафтных групп."}
        ])
        sheet_files.append(vis_12)
        sheet_files.append(vis_13)

        # Assemble into PDF via PyMuPDF (fitz)
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
        print(f"🎉 [PDF Builder] Successfully assembled 13-sheet PDF Album: {final_pdf_path}")
        return final_pdf_path
