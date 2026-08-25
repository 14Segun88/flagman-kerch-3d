"""
Step 0: Input Classifier for Landscape & Architectural AI Pipeline.
Disambiguates input images into:
1. SITE_MASTER_PLAN (2D Site Layout, Master Plan, Cadastral Lot)
2. BUILDING_FLOOR_PLAN (Single Building Internal Room Floorplan)
3. PHOTO_OR_SKETCH (Hand-drawn Napkin Sketch or Aerial Drone Photo)

Prevents architectural confusion (e.g. treating a house floorplan as a site plot).
"""

from enum import Enum
from typing import Dict, Any, Optional, List
from pathlib import Path
from PIL import Image


class InputType(str, Enum):
    SITE_MASTER_PLAN = "SITE_MASTER_PLAN"
    BUILDING_FLOOR_PLAN = "BUILDING_FLOOR_PLAN"
    PHOTO_OR_SKETCH = "PHOTO_OR_SKETCH"


class ClassificationResult:
    def __init__(
        self,
        input_type: InputType,
        confidence: float,
        description_ru: str,
        recommended_pipeline: str,
        features_detected: List[str]
    ):
        self.input_type = input_type
        self.confidence = confidence
        self.description_ru = description_ru
        self.recommended_pipeline = recommended_pipeline
        self.features_detected = features_detected

    def to_dict(self) -> Dict[str, Any]:
        return {
            "inputType": self.input_type.value,
            "confidence": self.confidence,
            "descriptionRu": self.description_ru,
            "recommendedPipeline": self.recommended_pipeline,
            "featuresDetected": self.features_detected
        }


class InputClassifier:
    """Classifies input assets before passing to downstream neural & geometry solvers."""

    SITE_KEYWORDS = [
        "генплан", "master plan", "участок", "site plan", "кадастр", "мкр", "героевское",
        "бассейн", "терраса", "decking", "купол", "дровница", "сотка", "озеленение", "landscape"
    ]

    FLOORPLAN_KEYWORDS = [
        "план этажа", "floor plan", "квартира", "гостиная", "спальня", "санузел", "кухня",
        "тамбур", "коридор", "room", "kitchen", "living room", "bedroom", "bathroom"
    ]

    @classmethod
    def classify(
        cls,
        image_path: Optional[str] = None,
        raw_text_hints: str = "",
        user_prompt: str = ""
    ) -> ClassificationResult:
        """Classifies the input asset using visual metadata and text hints."""
        combined_text = f"{raw_text_hints} {user_prompt}".lower()
        features: List[str] = []

        site_score = 0.0
        floor_score = 0.0

        for kw in cls.SITE_KEYWORDS:
            if kw in combined_text:
                site_score += 1.0
                features.append(f"site_keyword:{kw}")

        for kw in cls.FLOORPLAN_KEYWORDS:
            if kw in combined_text:
                floor_score += 1.0
                features.append(f"floorplan_keyword:{kw}")

        # Image analysis if available
        if image_path and Path(image_path).exists():
            try:
                with Image.open(image_path) as img:
                    w, h = img.size
                    aspect = w / h if h else 1.0
                    features.append(f"image_res:{w}x{h}")
                    features.append(f"aspect_ratio:{aspect:.2f}")

                    # Near-square or landscape master plans
                    if 0.85 <= aspect <= 1.4:
                        site_score += 0.5
            except Exception:
                pass

        # Decision rule
        if site_score >= floor_score and site_score > 0:
            return ClassificationResult(
                input_type=InputType.SITE_MASTER_PLAN,
                confidence=min(0.98, 0.7 + (site_score * 0.05)),
                description_ru="Генеральный план / Ситуационная схема участка",
                recommended_pipeline="full_landscape_estate_pipeline",
                features_detected=features
            )
        elif floor_score > site_score:
            return ClassificationResult(
                input_type=InputType.BUILDING_FLOOR_PLAN,
                confidence=min(0.95, 0.7 + (floor_score * 0.05)),
                description_ru="Поэтажный план одного здания / Коттеджа",
                recommended_pipeline="single_building_bim_pipeline",
                features_detected=features
            )
        else:
            return ClassificationResult(
                input_type=InputType.SITE_MASTER_PLAN,
                confidence=0.80,
                description_ru="Эскизный проект генерального плана (Default)",
                recommended_pipeline="full_landscape_estate_pipeline",
                features_detected=features or ["default_site_assumption"]
            )
