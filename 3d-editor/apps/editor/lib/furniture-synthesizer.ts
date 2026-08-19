import { ItemNode, type AssetInput } from '@pascal-app/core/schema'
import type { GraphRoom } from './deepfloorplan-engine'

/**
 * Creates a catalog asset descriptor pointing to Pascal's local 3D GLB models
 */
function createAsset(
  id: string,
  name: string,
  category: string,
  dimensions: [number, number, number] = [1, 1, 1],
  offset: [number, number, number] = [0, 0, 0],
): AssetInput {
  return {
    id,
    name,
    category,
    thumbnail: `/items/${id}/thumbnail.webp`,
    src: `/items/${id}/model.glb`,
    dimensions,
    offset,
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
    source: 'library',
  }
}

// Built-in 3D Assets registry from public/items with proportional dimensions
const ASSETS = {
  // Living Room
  sofa: createAsset('sofa', 'Диван', 'furniture', [2.2, 0.8, 1.1]),
  couchMedium: createAsset('couch-medium', 'Мягкий диван', 'furniture', [1.8, 0.8, 1.0]),
  coffeeTable: createAsset('coffee-table', 'Журнальный столик', 'furniture', [1.0, 0.4, 0.6]),
  tvStand: createAsset('tv-stand', 'ТВ Тумба', 'furniture', [1.6, 0.4, 0.45]),
  tv: createAsset('flat-screen-tv', 'Телевизор 65"', 'electronics', [1.3, 0.8, 0.15]),
  floorLamp: createAsset('floor-lamp', 'Торшер', 'lighting', [0.4, 1.5, 0.4]),
  indoorPlant: createAsset('indoor-plant', 'Комнатное растение', 'nature', [0.5, 1.0, 0.5]),
  carpetRect: createAsset('rectangular-carpet', 'Ковер', 'decoration', [2.4, 0.02, 1.6]),
  carpetRound: createAsset('round-carpet', 'Круглый ковер', 'decoration', [1.8, 0.02, 1.8]),

  // Bedroom
  doubleBed: createAsset('double-bed', 'Двуспальная кровать', 'furniture', [1.9, 0.8, 2.1]),
  singleBed: createAsset('single-bed', 'Односпальная кровать', 'furniture', [1.1, 0.7, 2.0]),
  bedsideTable: createAsset('bedside-table', 'Прикроватная тумба', 'furniture', [0.45, 0.45, 0.45]),
  closet: createAsset('closet', 'Шкаф-купе', 'furniture', [1.6, 2.2, 0.65]),
  dresser: createAsset('dresser', 'Комод', 'furniture', [1.2, 0.8, 0.5]),

  // Kitchen & Dining
  kitchen: createAsset('kitchen', 'Кухонный гарнитур', 'kitchen', [2.4, 2.1, 0.65]),
  kitchenCounter: createAsset('kitchen-counter', 'Кухонная столешница', 'kitchen', [1.8, 0.85, 0.65]),
  stove: createAsset('stove', 'Варочная панель', 'kitchen', [0.7, 0.85, 0.65]),
  fridge: createAsset('fridge', 'Холодильник', 'kitchen', [0.8, 1.85, 0.7]),
  diningTable: createAsset('dining-table', 'Обеденный стол', 'furniture', [1.6, 0.75, 0.9]),
  diningChair: createAsset('dining-chair', 'Стул обеденный', 'furniture', [0.45, 0.85, 0.45]),

  // Bathroom
  toilet: createAsset('toilet', 'Унитаз инсталляция', 'bathroom', [0.5, 0.8, 0.65]),
  bathroomSink: createAsset('bathroom-sink', 'Раковина с тумбой', 'bathroom', [0.9, 0.85, 0.5]),
  showerSquare: createAsset('shower-square', 'Душевая кабина', 'bathroom', [1.0, 2.0, 1.0]),
  bathtub: createAsset('bathtub', 'Ванна', 'bathroom', [1.6, 0.55, 0.75]),
  mirror: createAsset('rectangular-mirror', 'Зеркало', 'bathroom', [0.7, 0.9, 0.05]),
  washingMachine: createAsset('washing-machine', 'Стиральная машина', 'appliances', [0.6, 0.85, 0.6]),

  // Outdoor / Terrace / Pool / Garden
  sunbed: createAsset('sunbed', 'Шезлонг пляжный', 'outdoor', [1.9, 0.4, 0.65]),
  patioUmbrella: createAsset('patio-umbrella', 'Зонт от солнца', 'outdoor', [2.2, 2.3, 2.2]),
  outdoorTable: createAsset('table', 'Стол для беседки', 'outdoor', [1.5, 0.75, 0.85]),

  // Vehicles & Landscape
  tesla: createAsset('tesla', 'Электромобиль Tesla', 'vehicle', [4.5, 1.45, 1.9]),
  tree: createAsset('tree', 'Лиственное дерево', 'nature', [3.0, 4.5, 3.0]),
  firTree: createAsset('fir-tree', 'Крымская сосна', 'nature', [2.2, 4.0, 2.2]),
  palm: createAsset('palm', 'Пальма', 'nature', [2.2, 3.5, 2.2]),
  bush: createAsset('bush', 'Кустарник', 'nature', [1.0, 0.9, 1.0]),
}

/**
 * Computes bounding box and centroid of a 2D room polygon
 */
function getRoomBounds(polygon: Array<[number, number]>) {
  let minX = Infinity,
    maxX = -Infinity,
    minZ = Infinity,
    maxZ = -Infinity
  let sumX = 0,
    sumZ = 0

  for (const [x, z] of polygon) {
    if (x < minX) minX = x
    if (x > maxX) maxX = x
    if (z < minZ) minZ = z
    if (z > maxZ) maxZ = z
    sumX += x
    sumZ += z
  }

  const cx = Number((sumX / polygon.length).toFixed(2))
  const cz = Number((sumZ / polygon.length).toFixed(2))
  const width = Number((maxX - minX).toFixed(2))
  const depth = Number((maxZ - minZ).toFixed(2))

  return { cx, cz, minX, maxX, minZ, maxZ, width, depth }
}

/**
 * Synthesizes realistic 3D ItemNodes matching every room in the floor plan with safe wall clearances
 */
export function synthesizeRoomItems(rooms: GraphRoom[]): Array<{
  position: [number, number, number]
  rotation: [number, number, number]
  scale?: [number, number, number]
  asset: AssetInput
}> {
  const items: Array<{
    position: [number, number, number]
    rotation: [number, number, number]
    scale?: [number, number, number]
    asset: AssetInput
  }> = []

  const addItem = (
    asset: AssetInput,
    x: number,
    z: number,
    y = 0,
    rotY = 0,
    scale: [number, number, number] = [0.85, 0.85, 0.85],
  ) => {
    items.push({
      position: [Number(x.toFixed(2)), Number(y.toFixed(2)), Number(z.toFixed(2))],
      rotation: [0, Number(rotY.toFixed(2)), 0],
      scale,
      asset,
    })
  }

  for (const room of rooms) {
    if (!room.polygon || room.polygon.length < 3) continue
    const { cx, cz, minX, maxX, minZ, maxZ, width, depth } = getRoomBounds(room.polygon)
    const nameLower = (room.name || '').toLowerCase()
    const typeLower = (room.type || '').toLowerCase()

    // 1. ГОСТИНАЯ-СТОЛОВАЯ
    if (nameLower.includes('гостиная') || nameLower.includes('зал') || typeLower === 'living') {
      // Диван у задней стены с отступом 0.8м
      const sofaZ = minZ + 0.9
      addItem(ASSETS.sofa, cx, sofaZ, 0, 0, [0.85, 0.85, 0.85])
      // Ковер перед диваном
      addItem(ASSETS.carpetRect, cx, sofaZ + 0.8, 0.01, 0, [0.8, 0.8, 0.8])
      // Журнальный столик на ковре перед диваном (с зазором 0.6м от сиденья)
      addItem(ASSETS.coffeeTable, cx, sofaZ + 0.95, 0, 0, [0.8, 0.8, 0.8])
      // ТВ-тумба у противоположной стены с отступом 0.6м от стены
      const tvZ = maxZ - 0.7
      if (tvZ - (sofaZ + 1.2) > 1.2) {
        addItem(ASSETS.tvStand, cx, tvZ, 0, Math.PI, [0.8, 0.8, 0.8])
        addItem(ASSETS.tv, cx, tvZ, 0.35, Math.PI, [0.75, 0.75, 0.75])
      }
      // Растение и торшер в углах
      addItem(ASSETS.indoorPlant, maxX - 0.7, minZ + 0.7, 0, 0, [0.75, 0.75, 0.75])
      addItem(ASSETS.floorLamp, minX + 0.7, minZ + 0.7, 0, 0, [0.75, 0.75, 0.75])
    }

    // 2. КУХНЯ / СТОЛОВАЯ
    else if (nameLower.includes('кухня') || typeLower === 'kitchen' || typeLower === 'dining') {
      // Гарнитур вдоль дальней стены
      addItem(ASSETS.kitchen, cx + 0.4, maxZ - 0.7, 0, Math.PI, [0.85, 0.85, 0.85])
      addItem(ASSETS.fridge, minX + 0.7, maxZ - 0.7, 0, Math.PI, [0.8, 0.8, 0.8])
      // Обеденный стол
      addItem(ASSETS.diningTable, cx, minZ + 1.1, 0, 0, [0.8, 0.8, 0.8])
      addItem(ASSETS.diningChair, cx - 0.55, minZ + 1.1, 0, Math.PI / 2, [0.8, 0.8, 0.8])
      addItem(ASSETS.diningChair, cx + 0.55, minZ + 1.1, 0, -Math.PI / 2, [0.8, 0.8, 0.8])
    }

    // 3. СПАЛЬНЯ
    else if (nameLower.includes('спальня') || typeLower === 'bedroom') {
      // Кровать изголовьем к стене
      addItem(ASSETS.doubleBed, cx, minZ + 1.4, 0, 0, [0.8, 0.8, 0.8])
      addItem(ASSETS.bedsideTable, cx - 1.2, minZ + 1.8, 0, 0, [0.75, 0.75, 0.75])
      addItem(ASSETS.bedsideTable, cx + 1.2, minZ + 1.8, 0, 0, [0.75, 0.75, 0.75])
      // Шкаф у боковой стены
      addItem(ASSETS.closet, minX + 0.65, cz, 0, Math.PI / 2, [0.8, 0.8, 0.8])
    }

    // 4. САНУЗЕЛ / ВАННАЯ
    else if (
      nameLower.includes('санузел') ||
      nameLower.includes('ванн') ||
      nameLower.includes('душевая') ||
      nameLower.includes('моечная') ||
      typeLower === 'bathroom'
    ) {
      addItem(ASSETS.toilet, minX + 0.55, cz, 0, Math.PI / 2, [0.8, 0.8, 0.8])
      addItem(ASSETS.bathroomSink, cx, maxZ - 0.55, 0, Math.PI, [0.8, 0.8, 0.8])
      addItem(ASSETS.showerSquare, maxX - 0.65, minZ + 0.65, 0, 0, [0.8, 0.8, 0.8])
    }

    // 5. БАНЯ (Парилка, моечная, отдых и крытая терраса)
    else if (nameLower.includes('баня') || nameLower.includes('парилка') || nameLower.includes('терраса')) {
      if (nameLower.includes('парил')) {
        addItem(ASSETS.bathtub, cx, cz, 0, 0, [0.75, 0.75, 0.75])
      } else if (nameLower.includes('террас')) {
        addItem(ASSETS.outdoorTable, cx, cz, 0, 0, [0.75, 0.75, 0.75])
        addItem(ASSETS.diningChair, cx - 0.5, cz, 0, Math.PI / 2, [0.75, 0.75, 0.75])
        addItem(ASSETS.diningChair, cx + 0.5, cz, 0, -Math.PI / 2, [0.75, 0.75, 0.75])
      } else {
        addItem(ASSETS.diningTable, cx, cz, 0, 0, [0.75, 0.75, 0.75])
        addItem(ASSETS.diningChair, cx - 0.5, cz, 0, Math.PI / 2, [0.75, 0.75, 0.75])
        addItem(ASSETS.diningChair, cx + 0.5, cz, 0, -Math.PI / 2, [0.75, 0.75, 0.75])
        addItem(ASSETS.indoorPlant, minX + 0.6, minZ + 0.6, 0, 0, [0.7, 0.7, 0.7])
      }
    }

    // 6. ХОЗПОСТРОЙКА / СКЛАД
    else if (nameLower.includes('хоз') || nameLower.includes('склад') || typeLower === 'closet') {
      addItem(ASSETS.closet, cx, minZ + 0.6, 0, 0, [0.75, 0.75, 0.75])
      addItem(ASSETS.washingMachine, maxX - 0.5, cz, 0, -Math.PI / 2, [0.75, 0.75, 0.75])
    }

    // 7. БАССЕЙН
    else if (nameLower.includes('бассейн') || room.floorFinish?.includes('water') || room.floorFinish?.includes('decking')) {
      if (nameLower.includes('декинг') || nameLower.includes('бассейн')) {
        addItem(ASSETS.sunbed, maxX - 0.8, cz - 1.2, 0, -Math.PI / 2, [0.85, 0.85, 0.85])
        addItem(ASSETS.sunbed, maxX - 0.8, cz + 1.2, 0, -Math.PI / 2, [0.85, 0.85, 0.85])
        addItem(ASSETS.patioUmbrella, maxX - 0.8, cz, 0, 0, [0.85, 0.85, 0.85])
      }
    }

    // 8. БЕСЕДКА
    else if (nameLower.includes('беседка')) {
      // Стол строго по центру беседки
      addItem(ASSETS.outdoorTable, cx, cz, 0, 0, [0.8, 0.8, 0.8])
      addItem(ASSETS.diningChair, cx - 0.55, cz, 0, Math.PI / 2, [0.75, 0.75, 0.75])
      addItem(ASSETS.diningChair, cx + 0.55, cz, 0, -Math.PI / 2, [0.75, 0.75, 0.75])
    }

    // 9. ПАРКОВКА
    else if (nameLower.includes('парковка') || typeLower === 'garage') {
      // Автомобиль Tesla по центру парковки
      addItem(ASSETS.tesla, cx, cz, 0, Math.PI / 2, [0.9, 0.9, 0.9])
    }
  }

  // 9. ЛАНДШАФТНЫЕ ДЕРЕВЬЯ И ПАЛЬМЫ (Вдали от стен и парковок)
  addItem(ASSETS.tree, -12.5, 14.5, 0, 0, [0.9, 0.9, 0.9])
  addItem(ASSETS.firTree, 11.5, 14.5, 0, 0, [0.9, 0.9, 0.9])
  addItem(ASSETS.palm, 11.5, -7.5, 0, 0, [0.9, 0.9, 0.9])
  addItem(ASSETS.firTree, -12.5, -14.5, 0, 0, [0.9, 0.9, 0.9])

  return items
}
