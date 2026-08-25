"""
Crimea & Kerch Regional Fact Knowledge Base & Dendrological Plant Registry.
Deterministic lookup of soil geology, climate norms, and adapted flora.
"""

from typing import Dict, List, Any, Optional

CRIMEA_DISTRICT_FACTS = {
    "kerch_geroevskoe": {
        "name": "г. Керчь, мкр. Героевское (Эльтиген)",
        "location": "Южная часть Керчи, побережье Керченского пролива к югу от Аршинцевской косы",
        "climate_type": "Приближен к сухому средиземноморскому со степным влиянием",
        "temp_summer_avg": "+28°C ... +34°C",
        "temp_winter_avg": "-2°C ... +6°C",
        "insolation": "Высокая (до 2350 часов солнечного сияния в год)",
        "wind_profile": "Постоянные северо-восточные и юго-западные морские ветра, зимние штормы",
        "soil_type": "Песчаные и супесчаные приморские почвы",
        "soil_acidity_ph": "Слабокислая / кислая (pH 5.5 - 6.8) из-за вымывания щелочи песком",
        "soil_advantages": "Отличная аэрация корней, быстрый прогрев весной, легкость обработки",
        "soil_challenges": "Низкое удержание влаги, быстрое вымывание органики и минералов, глубокое промерзание",
        "engineering_recommendations": [
            "Поднятие деревянных настилов и ДПК на 5-10 см выше уровня грунта",
            "Организация уклонов (1.5-2%) для отвода ливневых стоков",
            "Использование щебеночной отсыпки фракции 5-20 мм по геотекстилю",
            "Применение капельного полива и мульчирования корой/гравием"
        ]
    },
    "kerch_central": {
        "name": "г. Керчь, Центральный район",
        "location": "Побережье Керченской бухты у горы Митридат",
        "climate_type": "Умеренно-континентальный приморский со степными чертами",
        "temp_summer_avg": "+26°C ... +32°C",
        "temp_winter_avg": "-1°C ... +5°C",
        "soil_type": "Каштановые и суглинистые почвы с включением известняков",
        "soil_acidity_ph": "Нейтральная / слабощелочная (pH 7.0 - 7.8)",
        "soil_advantages": "Хорошее удержание питательных веществ, плотная структура",
        "soil_challenges": "Умеренная склонность к уплотнению и растрескиванию при засухе"
    },
    "kerch_arshintsevo": {
        "name": "г. Керчь, район Аршинцево",
        "location": "Возвышенное плато вдоль Керченского пролива",
        "climate_type": "Приморский степной с сильными ветровыми нагрузками",
        "soil_type": "Суглинки и песчаники с выходами плотных глин",
        "soil_acidity_ph": "Нейтральная (pH 6.8 - 7.4)"
    }
}


DENDROLOGICAL_REGISTRY: List[Dict[str, Any]] = [
    # 1. Хвойные породы (Conifers)
    {
        "id": "pinus_nigra_nana",
        "species_ru": "Сосна черная «НАНА»",
        "species_lat": "Pinus nigra Nana",
        "category": "conifer",
        "height_m": 1.5,
        "crown_diameter_m": 1.8,
        "soil_compat": ["sand", "loam", "acid", "neutral"],
        "drought_resistant": True,
        "salt_wind_resistant": True,
        "sun_exposure": "full_sun",
        "symbol_code": "СЧ",
        "description": "Компактная подушковидная сосна, идеально подходит для песчаных кислых почв побережья."
    },
    {
        "id": "juniperus_virginiana",
        "species_ru": "Можжевельник Виргинский",
        "species_lat": "Juniperus virginiana",
        "category": "conifer",
        "height_m": 4.0,
        "crown_diameter_m": 1.2,
        "soil_compat": ["sand", "loam", "clay", "acid", "neutral", "alkaline"],
        "drought_resistant": True,
        "salt_wind_resistant": True,
        "sun_exposure": "full_sun",
        "symbol_code": "МВ",
        "description": "Колоновидный хвойный акцент, высокая устойчивость к штормовым морским ветрам."
    },
    {
        "id": "juniperus_sabina",
        "species_ru": "Можжевельник Казацкий",
        "species_lat": "Juniperus sabina",
        "category": "conifer",
        "height_m": 1.0,
        "crown_diameter_m": 2.5,
        "soil_compat": ["sand", "loam", "rocky", "acid", "neutral"],
        "drought_resistant": True,
        "salt_wind_resistant": True,
        "sun_exposure": "full_sun",
        "symbol_code": "МК",
        "description": "Стелющийся вечнозеленый кустарник, удерживает песчаный грунт и декорирует склоны."
    },
    {
        "id": "juniperus_horizontalis",
        "species_ru": "Можжевельник Горизонтальный",
        "species_lat": "Juniperus horizontalis",
        "category": "conifer",
        "height_m": 0.3,
        "crown_diameter_m": 2.0,
        "soil_compat": ["sand", "acid", "neutral"],
        "drought_resistant": True,
        "salt_wind_resistant": True,
        "sun_exposure": "full_sun",
        "symbol_code": "МГ",
        "description": "Почвопокровный можжевельник с серебристо-голубой хвоей."
    },

    # 2. Лиственные и красивоцветущие кустарники (Deciduous)
    {
        "id": "spiraea_vanhouttei",
        "species_ru": "Спирея Вангутта",
        "species_lat": "Spiraea vanhouttei",
        "category": "deciduous",
        "height_m": 2.0,
        "crown_diameter_m": 2.0,
        "soil_compat": ["sand", "loam", "acid", "neutral"],
        "drought_resistant": True,
        "salt_wind_resistant": True,
        "sun_exposure": "full_sun",
        "symbol_code": "СВ",
        "description": "Обильно цветущий белоснежный каскадный кустарник для живых изгородей и миксбордеров."
    },
    {
        "id": "acer_negundo",
        "species_ru": "Клен ясенелистный «Фламинго»",
        "species_lat": "Acer negundo Flamingo",
        "category": "deciduous",
        "height_m": 4.5,
        "crown_diameter_m": 3.0,
        "soil_compat": ["sand", "loam", "clay", "acid", "neutral"],
        "drought_resistant": True,
        "salt_wind_resistant": True,
        "sun_exposure": "partial_sun",
        "symbol_code": "КЯ",
        "description": "Декоративное дерево с пестрой бело-розовой листвой."
    },
    {
        "id": "berberis_thunbergii",
        "species_ru": "Барбарис Тунберга",
        "species_lat": "Berberis thunbergii",
        "category": "deciduous",
        "height_m": 1.2,
        "crown_diameter_m": 1.2,
        "soil_compat": ["sand", "loam", "acid", "neutral"],
        "drought_resistant": True,
        "salt_wind_resistant": True,
        "sun_exposure": "full_sun",
        "symbol_code": "БТ",
        "description": "Пурпурнолистный кустарник с яркой осенней окраской и ягодами."
    },

    # 3. Многолетники и ароматические травы (Perennials & Herbs)
    {
        "id": "lavandula_angustifolia",
        "species_ru": "Лаванда узколистная",
        "species_lat": "Lavandula angustifolia",
        "category": "perennial",
        "height_m": 0.5,
        "crown_diameter_m": 0.6,
        "soil_compat": ["sand", "rocky", "acid", "neutral"],
        "drought_resistant": True,
        "salt_wind_resistant": True,
        "sun_exposure": "full_sun",
        "symbol_code": "ЛВ",
        "description": "Классическое крымское ароматическое растение с фиолетовыми соцветиями."
    },
    {
        "id": "nepeta_faassenii",
        "species_ru": "Котовник Фассена",
        "species_lat": "Nepeta faassenii",
        "category": "perennial",
        "height_m": 0.4,
        "crown_diameter_m": 0.5,
        "soil_compat": ["sand", "loam", "acid", "neutral"],
        "drought_resistant": True,
        "salt_wind_resistant": True,
        "sun_exposure": "full_sun",
        "symbol_code": "КТ",
        "description": "Обильное лавандово-синее цветение с мая по октябрь, привлекает бабочек."
    },
    {
        "id": "salvia_nemorosa",
        "species_ru": "Шалфей дубравный",
        "species_lat": "Salvia nemorosa",
        "category": "perennial",
        "height_m": 0.6,
        "crown_diameter_m": 0.5,
        "soil_compat": ["sand", "loam", "acid", "neutral"],
        "drought_resistant": True,
        "salt_wind_resistant": True,
        "sun_exposure": "full_sun",
        "symbol_code": "ШД",
        "description": "Устойчивый крымский многолетник с вертикальными фиолетовыми свечами."
    }
]


def get_district_facts(district_key: str = "kerch_geroevskoe") -> Dict[str, Any]:
    """Returns official climate and soil facts for the given region."""
    return CRIMEA_DISTRICT_FACTS.get(district_key, CRIMEA_DISTRICT_FACTS["kerch_geroevskoe"])


def query_plants_for_site(soil_type: str = "sand", category: Optional[str] = None) -> List[Dict[str, Any]]:
    """Deterministic filter for plant selection matching site conditions."""
    results = []
    for plant in DENDROLOGICAL_REGISTRY:
        if soil_type in plant["soil_compat"]:
            if category is None or plant["category"] == category:
                results.append(plant)
    return results
