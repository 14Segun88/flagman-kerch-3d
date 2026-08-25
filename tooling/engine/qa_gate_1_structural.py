"""
QA Gate 1: Structural & Regulatory Pre-Check (СП / СНиП & RAG Tag Filter).
Fails fast before passing into expensive geometry calculation.
"""

from typing import Dict, Any, List, Tuple
from .crimea_knowledge_base import query_plants_for_site, get_district_facts

# Hardcoded Regulatory Setbacks (СП 53.13330 / СП 42.13330 / Пожарные нормы РФ)
LEGAL_SETBACKS_M: Dict[str, float] = {
    "residential_house_to_boundary": 3.0,     # Жилой дом до границы участка (межи)
    "bathhouse_to_boundary": 1.0,             # Баня/сауна до межи
    "gazebo_to_boundary": 1.0,                # Беседка/навес до межи
    "pool_to_boundary": 2.0,                  # Чаша бассейна до границы участка
    "pool_to_building": 3.0,                  # Бассейн до фундаментов зданий
    "septic_to_house": 5.0,                   # Септик/ЛОС до жилого дома
    "tall_tree_to_boundary": 4.0,             # Высокорослые деревья до границы
    "medium_tree_to_boundary": 2.0,           # Среднерослые деревья до границы
    "shrub_to_boundary": 1.0,                 # Кустарники до границы
}


class QaGate1StructuralValidator:
    """Gate 1: Verifies feasibility, zone capacities, legal norms and plant tags."""

    @staticmethod
    def validate_pre_layout(
        site_area_sq_m: float,
        requested_buildings: List[Dict[str, Any]],
        requested_zones: List[Dict[str, Any]],
        requested_plants: List[str],
        soil_type: str = "sand"
    ) -> Tuple[bool, List[str], Dict[str, Any]]:
        """
        Validates structural input feasibility.
        Returns: (is_valid, error_feedback_list, feedback_payload)
        """
        errors = []
        feedback = {}

        # 1. Check Total Zone & Footprint Capacity
        sum_buildings_area = sum(b.get("width", 0) * b.get("depth", 0) for b in requested_buildings)
        sum_zones_area = sum(z.get("area_sq_m", 0) for z in requested_zones)
        total_requested_footprint = sum_buildings_area + sum_zones_area

        max_allowed_footprint = site_area_sq_m * 0.45  # Max 45% dense building coefficient (СП 42)
        if total_requested_footprint > max_allowed_footprint:
            diff = total_requested_footprint - max_allowed_footprint
            errors.append(
                f"❌ Перегруз участка: Суммарное пятно застройки ({total_requested_footprint:.1f} м²) "
                f"превышает нормативный предел 45% ({max_allowed_footprint:.1f} м²). "
                f"Необходимо сократить площади зон минимум на {diff:.1f} м²."
            )

        # 2. Hard Tag Matching for Plants (RAG Validation)
        valid_plants_db = query_plants_for_site(soil_type=soil_type)
        valid_plant_ids = {p["id"]: p for p in valid_plants_db}
        valid_plant_names = {p["species_ru"].lower(): p for p in valid_plants_db}

        unsuitable_plants = []
        for p_name in requested_plants:
            p_clean = p_name.strip().lower()
            if p_clean not in valid_plant_names and p_clean not in valid_plant_ids:
                unsuitable_plants.append(p_name)

        if unsuitable_plants:
            errors.append(
                f"❌ Неподходящие растения для почвы '{soil_type}': {', '.join(unsuitable_plants)}. "
                f"Используйте только проверенные культуры из дендрологического реестра."
            )

        # 3. Inject Legal Norms into Feedback Payload
        feedback["legal_setbacks"] = LEGAL_SETBACKS_M
        feedback["max_allowed_footprint_sq_m"] = max_allowed_footprint
        feedback["calculated_footprint_sq_m"] = total_requested_footprint

        is_valid = len(errors) == 0
        return is_valid, errors, feedback
