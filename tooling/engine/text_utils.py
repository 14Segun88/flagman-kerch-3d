"""
Text utilities for PDF album generation.
Provides word-wrapping for Pillow/ImageDraw text rendering within pixel-width constraints.
"""

from typing import List, Tuple
from PIL import ImageFont


def word_wrap(text: str, font: ImageFont.FreeTypeFont, max_width_px: int) -> List[str]:
    """Splits text into lines that fit within max_width_px using the given font.
    
    Handles explicit newlines, long words, and bullet points gracefully.
    Returns a list of lines ready for sequential draw.text() calls.
    """
    result_lines: List[str] = []

    for raw_line in text.split("\n"):
        raw_line = raw_line.rstrip()
        if not raw_line:
            result_lines.append("")
            continue

        words = raw_line.split(" ")
        current_line = ""

        for word in words:
            test_line = f"{current_line} {word}".strip() if current_line else word
            bbox = font.getbbox(test_line)
            text_width = bbox[2] - bbox[0] if bbox else 0

            if text_width <= max_width_px:
                current_line = test_line
            else:
                if current_line:
                    result_lines.append(current_line)
                # If a single word is wider than max_width, force it on its own line
                current_line = word

        if current_line:
            result_lines.append(current_line)

    return result_lines


def fit_text_in_box(text: str, font: ImageFont.FreeTypeFont, max_width_px: int) -> Tuple[str, ImageFont.FreeTypeFont]:
    """Returns (possibly truncated) text and font that fits within max_width_px.
    
    First tries the original font; if text doesn't fit, tries smaller sizes down to 8pt.
    If nothing fits, truncates with '…'.
    """
    bbox = font.getbbox(text)
    text_width = bbox[2] - bbox[0] if bbox else 0

    if text_width <= max_width_px:
        return text, font

    # Try reducing font size
    font_path = font.path if hasattr(font, 'path') else None
    if font_path:
        for size in range(font.size - 1, 7, -1):
            try:
                smaller_font = ImageFont.truetype(font_path, size)
                bbox = smaller_font.getbbox(text)
                tw = bbox[2] - bbox[0] if bbox else 0
                if tw <= max_width_px:
                    return text, smaller_font
            except Exception:
                break

    # Last resort: truncate
    for i in range(len(text), 0, -1):
        truncated = text[:i] + "…"
        bbox = font.getbbox(truncated)
        tw = bbox[2] - bbox[0] if bbox else 0
        if tw <= max_width_px:
            return truncated, font

    return text[:10] + "…", font
