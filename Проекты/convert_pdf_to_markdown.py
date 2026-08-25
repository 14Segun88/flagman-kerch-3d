#!/usr/bin/env python3
"""
PDF Processor & Extractor for 'Пояснительная записка-объединены.pdf'
Extracts:
1. All page texts with exact structure.
2. High-res page render images (PNG).
3. Embedded images and architectural plans.
4. Generates a readable, indexed Markdown file with direct image links and tables.
"""

import os
import fitz  # PyMuPDF
from pathlib import Path

PDF_PATH = Path("/home/segun/CascadeProjects/Цех Керчь/Проекты/Пояснительная записка-объединены.pdf")
BASE_DIR = PDF_PATH.parent
PAGES_DIR = BASE_DIR / "pages"
IMAGES_DIR = BASE_DIR / "images"
OUTPUT_MD = BASE_DIR / "ПОЯСНИТЕЛЬНАЯ_ЗАПИСКА_ГЕРОЕВСКОЕ.md"

PAGES_DIR.mkdir(parents=True, exist_ok=True)
IMAGES_DIR.mkdir(parents=True, exist_ok=True)

print(f"📖 Opening: {PDF_PATH.name} ({PDF_PATH.stat().st_size / 1024 / 1024:.2f} MB)")
doc = fitz.open(PDF_PATH)
num_pages = len(doc)
print(f"📄 Total pages: {num_pages}")

md_lines = []
md_lines.append("# 📋 Пояснительная записка: Эскизный проект благоустройства (г. Керчь, мкр. Героевское)")
md_lines.append("")
md_lines.append("> **Адрес объекта:** г. Керчь, мкр. Героевское, пер. Генерала Косоногова, д. 12  ")
md_lines.append("> **Площадь территории:** $S_{общ} = 1000\\text{ м}^2$ (Здания: $162\\text{ м}^2$, Озеленение: $838\\text{ м}^2$)  ")
md_lines.append("> **Автор проекта:** Ландшафтный архитектор Анна (+7 978 066-23-80)  ")
md_lines.append("> **Год:** г. Керчь, 2024 г.  ")
md_lines.append("")
md_lines.append("---")
md_lines.append("")
md_lines.append("## 📑 Навигация по страницам")
md_lines.append("")
for page_num in range(1, num_pages + 1):
    md_lines.append(f"- [Страница {page_num}](#страница-{page_num})")
md_lines.append("")
md_lines.append("---")
md_lines.append("")

image_counter = 0

for idx, page in enumerate(doc):
    page_num = idx + 1
    print(f"Processing page {page_num}/{num_pages}...")

    # 1. Render high-res page image (2x scale = 144 DPI, crisp text & graphics)
    zoom = 2.0
    mat = fitz.Matrix(zoom, zoom)
    pix = page.get_pixmap(matrix=mat, alpha=False)
    page_img_rel = f"pages/page_{page_num:02d}.png"
    page_img_path = BASE_DIR / page_img_rel
    pix.save(str(page_img_path))

    # 2. Extract embedded images
    image_list = page.get_images(full=True)
    embedded_img_tags = []
    for img_idx, img_info in enumerate(image_list):
        xref = img_info[0]
        base_image = doc.extract_image(xref)
        image_bytes = base_image["image"]
        image_ext = base_image["ext"]
        image_counter += 1
        img_name = f"img_p{page_num:02d}_{img_idx+1:02d}.{image_ext}"
        img_path = IMAGES_DIR / img_name
        with open(img_path, "wb") as f_img:
            f_img.write(image_bytes)
        embedded_img_tags.append(f"images/{img_name}")

    # 3. Extract text
    text = page.get_text("text").strip()

    # 4. Format Markdown block
    md_lines.append(f"## 📄 Страница {page_num}")
    md_lines.append("")
    md_lines.append(f"![Страница {page_num}]({page_img_rel})")
    md_lines.append("")
    
    if text:
        md_lines.append("### 📝 Текст страницы:")
        md_lines.append("```text")
        md_lines.append(text)
        md_lines.append("```")
        md_lines.append("")

    if embedded_img_tags:
        md_lines.append(f"**Извлеченные графические материалы ({len(embedded_img_tags)} шт.):**")
        for embed_rel in embedded_img_tags:
            md_lines.append(f"- ![{embed_rel}]({embed_rel})")
        md_lines.append("")

    md_lines.append("---")
    md_lines.append("")

# Save master markdown
with open(OUTPUT_MD, "w", encoding="utf-8") as f_md:
    f_md.write("\n".join(md_lines))

print(f"🎉 Done! Markdown written to: {OUTPUT_MD}")
print(f"🖼️ Total {num_pages} page renders in: {PAGES_DIR}")
print(f"📸 Total {image_counter} extracted images in: {IMAGES_DIR}")
