import {
  type FloorPlanGraph,
  type GraphOpening,
  type GraphRoom,
  type GraphWall,
  ROOM_PALETTE,
  calcPolygonArea,
  snapGraphJunctions,
} from './deepfloorplan-engine'

export interface LayoutGeneratorParams {
  presetId?: string
  title: string
  widthM: number
  depthM: number
  stories: number
  bedrooms: number
  bathrooms: number
  hasTerrace: boolean
  hasGarage: boolean
  hasBoilerRoom: boolean
  wallThicknessExterior?: number
  wallThicknessInterior?: number
  wallHeight?: number
}

export interface LayoutPreset {
  id: string
  name: string
  description: string
  widthM: number
  depthM: number
  stories: number
  areaSqM: number
  bedrooms: number
  bathrooms: number
  hasTerrace: boolean
  hasGarage: boolean
  hasBoilerRoom: boolean
  badge: string
}

export const POPULAR_LAYOUT_PRESETS: LayoutPreset[] = [
  {
    id: 'site_plan_screenshot_3',
    name: '«Генплан усадьбы (Скриншот №3)»',
    description: 'Полный комплекс: L-дом 10x8м, Баня с террасой, Бассейн, Хозблок, Беседка и Парковка.',
    widthM: 26.0,
    depthM: 32.0,
    stories: 1,
    areaSqM: 195,
    bedrooms: 2,
    bathrooms: 2,
    hasTerrace: true,
    hasGarage: true,
    hasBoilerRoom: true,
    badge: '⭐ Генплан Скриншот 3',
  },
  {
    id: 'kerch_classic_8x10',
    name: '«Керченский Стандарт» (8 х 10 м)',
    description: 'Оптимальный одноэтажный дом: просторная кухня-гостиная, 2 спальни, санузел и тамбур.',
    widthM: 8.0,
    depthM: 10.0,
    stories: 1,
    areaSqM: 80,
    bedrooms: 2,
    bathrooms: 1,
    hasTerrace: true,
    hasGarage: false,
    hasBoilerRoom: true,
    badge: 'Хит продаж',
  },
  {
    id: 'flagman_family_10x12',
    name: '«Флагман Семейный» (10 х 12 м)',
    description: '3 раздельные спальни, кухня-столовая 28м², 2 санузла, котельная и крытая терраса.',
    widthM: 10.0,
    depthM: 12.0,
    stories: 1,
    areaSqM: 120,
    bedrooms: 3,
    bathrooms: 2,
    hasTerrace: true,
    hasGarage: false,
    hasBoilerRoom: true,
    badge: 'Для семьи',
  },
  {
    id: 'compact_comfort_6x8',
    name: '«Компакт Энерго» (6 х 8 м)',
    description: 'Эргономичный гостевой дом или дача: студия-гостиная, спальня, совмещенный санузел.',
    widthM: 6.0,
    depthM: 8.0,
    stories: 1,
    areaSqM: 48,
    bedrooms: 1,
    bathrooms: 1,
    hasTerrace: false,
    hasGarage: false,
    hasBoilerRoom: false,
    badge: 'Бюджетный',
  },
  {
    id: 'crimea_villa_12x14',
    name: '«Крымская Вилла» (12 х 14 м)',
    description: 'Премиум проект: мастер-спальня с гардеробом, 2 детские, гараж на 1 авто, панорамная терраса.',
    widthM: 12.0,
    depthM: 14.0,
    stories: 1,
    areaSqM: 168,
    bedrooms: 3,
    bathrooms: 2,
    hasTerrace: true,
    hasGarage: true,
    hasBoilerRoom: true,
    badge: 'Премиум',
  },
]

export function generateMasterSitePlanLayout(): FloorPlanGraph {
  const walls: GraphWall[] = []
  const openings: GraphOpening[] = []
  const rooms: GraphRoom[] = []

  let wallCounter = 1
  let openingCounter = 1
  let roomCounter = 1

  const addWall = (
    start: [number, number],
    end: [number, number],
    isExt: boolean,
    thickness = 0.3,
    height = 2.8,
    openingsList: Array<Omit<GraphOpening, 'id' | 'wallId'>> = [],
    materialPreset?: string,
  ): GraphWall => {
    const wallId = `wall-${wallCounter++}`
    const assignedOpenings: GraphOpening[] = openingsList.map((op) => {
      const fullOp: GraphOpening = {
        ...op,
        id: `open-${openingCounter++}`,
        wallId,
      }
      openings.push(fullOp)
      return fullOp
    })

    const wall: GraphWall = {
      id: wallId,
      start: [Number(start[0].toFixed(2)), Number(start[1].toFixed(2))],
      end: [Number(end[0].toFixed(2)), Number(end[1].toFixed(2))],
      thickness,
      height,
      isExterior: isExt,
      openings: assignedOpenings,
      materialPreset,
    }
    walls.push(wall)
    return wall
  }

  // =========================================================================
  // 0. ОБЩЕЕ БЛАГОУСТРОЙСТВО УЧАСТКА (Зеленый газон + садовые дорожки)
  // =========================================================================
  const lawnPoly: Array<[number, number]> = [
    [-14.0, -18.0],
    [14.0, -18.0],
    [14.0, 17.0],
    [-14.0, 17.0],
  ]
  rooms.push({
    id: `room-${roomCounter++}`,
    name: 'Территория: Зеленый газон',
    type: 'balcony',
    polygon: lawnPoly,
    areaSqM: Number(calcPolygonArea(lawnPoly).toFixed(1)),
    color: '#22c55e',
    floorFinish: 'library:preset-forest',
  })

  // Центральная вымощенная брусчаткой аллея
  const walkwayPoly: Array<[number, number]> = [
    [-2.0, -16.0],
    [3.5, -16.0],
    [3.5, 5.0],
    [-2.0, 5.0],
  ]
  rooms.push({
    id: `room-${roomCounter++}`,
    name: 'Территория: Садовая аллея',
    type: 'terrace',
    polygon: walkwayPoly,
    areaSqM: Number(calcPolygonArea(walkwayPoly).toFixed(1)),
    color: '#94a3b8',
    floorFinish: 'library:preset-midgrey',
  })

  // =========================================================================
  // 1. ОБЪЕКТ 1: ГЛАВНЫЙ L-ОБРАЗНЫЙ ДОМ (Светлая штукатурка, 8.2м х 11.5м)
  // =========================================================================
  const hX1 = -11.0
  const hX2 = -3.0
  const hXcut = -6.0
  const hY1 = -6.0
  const hYcut = -3.5
  const hY2 = 6.0
  const houseMat = 'library:preset-softwhite'

  // 6 L-shaped exterior walls
  addWall([hX1, hY1], [hXcut, hY1], true, 0.3, 2.8, [
    { type: 'door', positionRatio: 0.5, width: 1.0, height: 2.1, label: 'Главный вход в дом' },
  ], houseMat)
  addWall([hXcut, hY1], [hXcut, hYcut], true, 0.3, 2.8, [], houseMat)
  addWall([hXcut, hYcut], [hX2, hYcut], true, 0.3, 2.8, [
    { type: 'window', positionRatio: 0.5, width: 1.2, height: 1.5, sillHeight: 0.9, label: 'Окно прихожей' },
  ], houseMat)
  addWall([hX2, hYcut], [hX2, hY2], true, 0.3, 2.8, [
    { type: 'window', positionRatio: 0.35, width: 1.4, height: 1.5, sillHeight: 0.9, label: 'Окно гостиной' },
    { type: 'window', positionRatio: 0.75, width: 1.4, height: 1.5, sillHeight: 0.9, label: 'Окно кухни' },
  ], houseMat)
  addWall([hX2, hY2], [hX1, hY2], true, 0.3, 2.8, [
    { type: 'window', positionRatio: 0.3, width: 1.4, height: 1.5, sillHeight: 0.9, label: 'Окно спальни 1' },
    { type: 'window', positionRatio: 0.75, width: 1.4, height: 1.5, sillHeight: 0.9, label: 'Окно спальни 2' },
  ], houseMat)
  addWall([hX1, hY2], [hX1, hY1], true, 0.3, 2.8, [
    { type: 'window', positionRatio: 0.25, width: 1.4, height: 1.5, sillHeight: 0.9, label: 'Окно спальни' },
    { type: 'window', positionRatio: 0.7, width: 0.9, height: 1.2, sillHeight: 1.2, label: 'Окно санузла' },
  ], houseMat)

  // Interior partitions of Main House
  const midHouseX = -6.5
  const midHouseY = 1.0
  addWall([midHouseX, hY1], [midHouseX, hY2], false, 0.15, 2.8, [
    { type: 'door', positionRatio: 0.25, width: 0.8, height: 2.1, label: 'Дверь в гостиную' },
    { type: 'door', positionRatio: 0.75, width: 0.8, height: 2.1, label: 'Дверь в спальню' },
  ])
  addWall([hX1, midHouseY], [midHouseX, midHouseY], false, 0.15, 2.8, [
    { type: 'door', positionRatio: 0.5, width: 0.8, height: 2.1, label: 'Дверь межкомнатная' },
  ])
  addWall([midHouseX, midHouseY], [hX2, midHouseY], false, 0.15, 2.8, [
    { type: 'opening', positionRatio: 0.5, width: 1.8, height: 2.3, label: 'Арка гостиная/кухня' },
  ])

  // Rooms in Main House
  const houseLivingPoly: Array<[number, number]> = [
    [midHouseX, hYcut],
    [hX2, hYcut],
    [hX2, midHouseY],
    [midHouseX, midHouseY],
  ]
  rooms.push({
    id: `room-${roomCounter++}`,
    name: '1. Дом: Гостиная-столовая',
    type: 'living',
    polygon: houseLivingPoly,
    areaSqM: Number(calcPolygonArea(houseLivingPoly).toFixed(1)),
    color: ROOM_PALETTE.living.color,
    floorFinish: 'parquet',
  })

  const houseKitchenPoly: Array<[number, number]> = [
    [midHouseX, midHouseY],
    [hX2, midHouseY],
    [hX2, hY2],
    [midHouseX, hY2],
  ]
  rooms.push({
    id: `room-${roomCounter++}`,
    name: '1. Дом: Кухня',
    type: 'kitchen',
    polygon: houseKitchenPoly,
    areaSqM: Number(calcPolygonArea(houseKitchenPoly).toFixed(1)),
    color: ROOM_PALETTE.kitchen.color,
    floorFinish: 'tile',
  })

  const houseBedPoly: Array<[number, number]> = [
    [hX1, midHouseY],
    [midHouseX, midHouseY],
    [midHouseX, hY2],
    [hX1, hY2],
  ]
  rooms.push({
    id: `room-${roomCounter++}`,
    name: '1. Дом: Спальня',
    type: 'bedroom',
    polygon: houseBedPoly,
    areaSqM: Number(calcPolygonArea(houseBedPoly).toFixed(1)),
    color: ROOM_PALETTE.bedroom.color,
    floorFinish: 'parquet',
  })

  const houseBathPoly: Array<[number, number]> = [
    [hX1, hY1],
    [midHouseX, hY1],
    [midHouseX, midHouseY],
    [hX1, midHouseY],
  ]
  rooms.push({
    id: `room-${roomCounter++}`,
    name: '1. Дом: Прихожая и Санузел',
    type: 'bathroom',
    polygon: houseBathPoly,
    areaSqM: Number(calcPolygonArea(houseBathPoly).toFixed(1)),
    color: ROOM_PALETTE.bathroom.color,
    floorFinish: 'tile',
  })

  // =========================================================================
  // 2. ОБЪЕКТ 3: БАНЯ С ТЕРРАСОЙ (Деревянный брус, 6.0м х 10.0м)
  // =========================================================================
  const bX1 = 3.5
  const bX2 = 9.5
  const bY1 = 4.0
  const bYmid = 7.5
  const bY2 = 14.0
  const saunaMat = 'library:preset-ochre' // Натуральный янтарный деревянный брус

  addWall([bX1, bYmid], [bX2, bYmid], true, 0.25, 2.7, [
    { type: 'door', positionRatio: 0.5, width: 0.9, height: 2.1, label: 'Вход в баню с террасы' },
  ], saunaMat)
  addWall([bX2, bYmid], [bX2, bY2], true, 0.25, 2.7, [
    { type: 'window', positionRatio: 0.5, width: 1.2, height: 1.2, sillHeight: 1.0, label: 'Окно комнаты отдыха' },
  ], saunaMat)
  addWall([bX2, bY2], [bX1, bY2], true, 0.25, 2.7, [
    { type: 'window', positionRatio: 0.5, width: 0.8, height: 0.8, sillHeight: 1.4, label: 'Окно парной' },
  ], saunaMat)
  addWall([bX1, bY2], [bX1, bYmid], true, 0.25, 2.7, [
    { type: 'window', positionRatio: 0.5, width: 0.8, height: 0.8, sillHeight: 1.4, label: 'Окно душевой' },
  ], saunaMat)

  // Bathhouse Interior Partitions
  const bSplitY = 11.0
  const bSplitX = 6.5
  addWall([bX1, bSplitY], [bX2, bSplitY], false, 0.12, 2.7, [
    { type: 'door', positionRatio: 0.35, width: 0.75, height: 2.0, label: 'Дверь в парную/моечную' },
  ], saunaMat)
  addWall([bSplitX, bSplitY], [bSplitX, bY2], false, 0.12, 2.7, [
    { type: 'door', positionRatio: 0.5, width: 0.7, height: 1.9, label: 'Стеклянная дверь в парилку' },
  ], saunaMat)

  // Bathhouse Covered Terrace (Low decorative railing)
  addWall([bX1, bY1], [bX1, bYmid], false, 0.15, 0.9, [], 'library:preset-espresso')
  addWall([bX1, bY1], [bX2, bY1], false, 0.15, 0.9, [], 'library:preset-espresso')
  addWall([bX2, bY1], [bX2, bYmid], false, 0.15, 0.9, [], 'library:preset-espresso')

  // Bathhouse Rooms
  const saunaPoly: Array<[number, number]> = [[bSplitX, bSplitY], [bX2, bSplitY], [bX2, bY2], [bSplitX, bY2]]
  rooms.push({
    id: `room-${roomCounter++}`,
    name: '3. Баня: Парилка',
    type: 'technical',
    polygon: saunaPoly,
    areaSqM: Number(calcPolygonArea(saunaPoly).toFixed(1)),
    color: '#ef4444',
    floorFinish: 'library:preset-tan',
  })

  const washPoly: Array<[number, number]> = [[bX1, bSplitY], [bSplitX, bSplitY], [bSplitX, bY2], [bX1, bY2]]
  rooms.push({
    id: `room-${roomCounter++}`,
    name: '3. Баня: Моечная / Душ',
    type: 'bathroom',
    polygon: washPoly,
    areaSqM: Number(calcPolygonArea(washPoly).toFixed(1)),
    color: '#06b6d4',
    floorFinish: 'tile_waterproof',
  })

  const restPoly: Array<[number, number]> = [[bX1, bYmid], [bX2, bYmid], [bX2, bSplitY], [bX1, bSplitY]]
  rooms.push({
    id: `room-${roomCounter++}`,
    name: '3. Баня: Комната отдыха',
    type: 'living',
    polygon: restPoly,
    areaSqM: Number(calcPolygonArea(restPoly).toFixed(1)),
    color: '#f59e0b',
    floorFinish: 'library:preset-tan',
  })

  const bathTerracePoly: Array<[number, number]> = [[bX1, bY1], [bX2, bY1], [bX2, bYmid], [bX1, bYmid]]
  rooms.push({
    id: `room-${roomCounter++}`,
    name: '3. Баня: Крытая терраса',
    type: 'terrace',
    polygon: bathTerracePoly,
    areaSqM: Number(calcPolygonArea(bathTerracePoly).toFixed(1)),
    color: '#84cc16',
    floorFinish: 'library:preset-espresso',
  })

  // =========================================================================
  // 3. ОБЪЕКТ 4 & 5: ХОЗБЛОК И ТУАЛЕТ (Клинкерный кирпич, 5.0м х 2.8м)
  // =========================================================================
  const uX1 = -10.5
  const uX2 = -5.5
  const uXmid = -7.5
  const uY1 = 12.0
  const uY2 = 14.8
  const shedMat = 'library:preset-brickred' // Красный клинкерный кирпич

  addWall([uX1, uY1], [uX2, uY1], true, 0.2, 2.4, [
    { type: 'door', positionRatio: 0.3, width: 0.8, height: 2.0, label: 'Дверь в туалет' },
    { type: 'door', positionRatio: 0.75, width: 0.9, height: 2.0, label: 'Дверь в хозблок' },
  ], shedMat)
  addWall([uX2, uY1], [uX2, uY2], true, 0.2, 2.4, [], shedMat)
  addWall([uX2, uY2], [uX1, uY2], true, 0.2, 2.4, [], shedMat)
  addWall([uX1, uY2], [uX1, uY1], true, 0.2, 2.4, [], shedMat)
  addWall([uXmid, uY1], [uXmid, uY2], false, 0.12, 2.4) // Partition

  const toiletPoly: Array<[number, number]> = [[uX1, uY1], [uXmid, uY1], [uXmid, uY2], [uX1, uY2]]
  rooms.push({
    id: `room-${roomCounter++}`,
    name: '4. Туалет (Уличный)',
    type: 'bathroom',
    polygon: toiletPoly,
    areaSqM: Number(calcPolygonArea(toiletPoly).toFixed(1)),
    color: '#06b6d4',
    floorFinish: 'tile',
  })

  const shedPoly: Array<[number, number]> = [[uXmid, uY1], [uX2, uY1], [uX2, uY2], [uXmid, uY2]]
  rooms.push({
    id: `room-${roomCounter++}`,
    name: '5. Хозпостройка / Склад',
    type: 'closet',
    polygon: shedPoly,
    areaSqM: Number(calcPolygonArea(shedPoly).toFixed(1)),
    color: '#6b7280',
    floorFinish: 'concrete',
  })

  // =========================================================================
  // 4. ОБЪЕКТ 6: БАССЕЙН С ДЕРЕВЯННЫМ НАСТИЛОМ (6.0м х 8.0м)
  // =========================================================================
  const pX1_deck = 3.0
  const pX2_deck = 10.0
  const pY1_deck = -8.5
  const pY2_deck = 0.0

  // Деревянный настил (декинг) вокруг бассейна для шезлонгов
  const poolDeckPoly: Array<[number, number]> = [
    [pX1_deck, pY1_deck],
    [pX2_deck, pY1_deck],
    [pX2_deck, pY2_deck],
    [pX1_deck, pY2_deck],
  ]
  rooms.push({
    id: `room-${roomCounter++}`,
    name: '6. Зона бассейна: Декинг',
    type: 'terrace',
    polygon: poolDeckPoly,
    areaSqM: Number(calcPolygonArea(poolDeckPoly).toFixed(1)),
    color: '#0284c7',
    floorFinish: 'library:preset-tan',
  })

  // Внутренняя чаша бассейна с водой
  const pX1_in = 4.0
  const pX2_in = 9.0
  const pY1_in = -7.5
  const pY2_in = -1.0

  addWall([pX1_in, pY1_in], [pX2_in, pY1_in], false, 0.2, 0.25, [], 'library:preset-powderblue')
  addWall([pX2_in, pY1_in], [pX2_in, pY2_in], false, 0.2, 0.25, [], 'library:preset-powderblue')
  addWall([pX2_in, pY2_in], [pX1_in, pY2_in], false, 0.2, 0.25, [], 'library:preset-powderblue')
  addWall([pX1_in, pY2_in], [pX1_in, pY1_in], false, 0.2, 0.25, [], 'library:preset-powderblue')

  const poolWaterPoly: Array<[number, number]> = [
    [pX1_in, pY1_in],
    [pX2_in, pY1_in],
    [pX2_in, pY2_in],
    [pX1_in, pY2_in],
  ]
  rooms.push({
    id: `room-${roomCounter++}`,
    name: '6. Бассейн: Водяная чаша',
    type: 'balcony',
    polygon: poolWaterPoly,
    areaSqM: Number(calcPolygonArea(poolWaterPoly).toFixed(1)),
    color: '#38bdf8',
    floorFinish: 'library:preset-sky',
  })

  // =========================================================================
  // 5. ОБЪЕКТ 7: БЕСЕДКА С ЗОНОЙ BBQ (Дерево, 4.5м х 4.5м)
  // =========================================================================
  const gX1 = -11.0
  const gX2 = -6.5
  const gY1 = -15.5
  const gY2 = -10.5
  const gazeboMat = 'library:preset-espresso'

  addWall([gX1, gY1], [gX2, gY1], false, 0.15, 0.9, [], gazeboMat)
  addWall([gX2, gY1], [gX2, gY2], false, 0.15, 0.9, [], gazeboMat)
  addWall([gX2, gY2], [gX1, gY2], false, 0.15, 0.9, [
    { type: 'opening', positionRatio: 0.5, width: 1.4, height: 2.2, label: 'Вход в беседку' },
  ], gazeboMat)
  addWall([gX1, gY2], [gX1, gY1], false, 0.15, 0.9, [], gazeboMat)

  const gazeboPoly: Array<[number, number]> = [[gX1, gY1], [gX2, gY1], [gX2, gY2], [gX1, gY2]]
  rooms.push({
    id: `room-${roomCounter++}`,
    name: '7. Беседка с зоной BBQ',
    type: 'terrace',
    polygon: gazeboPoly,
    areaSqM: Number(calcPolygonArea(gazeboPoly).toFixed(1)),
    color: '#84cc16',
    floorFinish: 'library:preset-espresso',
  })

  // =========================================================================
  // 6. ОБЪЕКТ 2: ПАРКОВКА НА 2 АВТО (Просторная брусчатка, 6.5м х 6.5м)
  // =========================================================================
  const pkX1 = -1.0
  const pkX2 = 5.5
  const pkY1 = -16.0
  const pkY2 = -9.5

  const parkPoly: Array<[number, number]> = [[pkX1, pkY1], [pkX2, pkY1], [pkX2, pkY2], [pkX1, pkY2]]
  rooms.push({
    id: `room-${roomCounter++}`,
    name: '2. Парковка на 2 авто',
    type: 'garage',
    polygon: parkPoly,
    areaSqM: Number(calcPolygonArea(parkPoly).toFixed(1)),
    color: '#475569',
    floorFinish: 'library:preset-charcoal',
  })

  const { walls: snappedWalls, junctions } = snapGraphJunctions(walls, 0.2)
  const totalArea = rooms.reduce((acc, r) => acc + r.areaSqM, 0)

  return {
    scale: { metersPerUnit: 1.0, realMeters: 32.0 },
    dimensions: {
      widthM: 26.0,
      depthM: 32.0,
      areaSqM: Number(totalArea.toFixed(1)),
    },
    walls: snappedWalls,
    junctions,
    openings,
    rooms,
    metadata: {
      source: 'floorplan3d_layout',
      timestamp: Date.now(),
      confidence: 1.0,
    },
  }
}

/**
 * Standard Single-House procedural generator
 */
export function generateFloorPlan3DLayout(params: LayoutGeneratorParams): FloorPlanGraph {
  if (params.presetId === 'site_plan_screenshot_3' || params.title.includes('Скриншот №3') || params.title.includes('Генплан')) {
    return generateMasterSitePlanLayout()
  }

  const W = Number(params.widthM.toFixed(2))
  const D = Number(params.depthM.toFixed(2))
  const extThick = params.wallThicknessExterior ?? 0.3
  const intThick = params.wallThicknessInterior ?? 0.15
  const wallH = params.wallHeight ?? 2.8

  const walls: GraphWall[] = []
  const openings: GraphOpening[] = []
  const rooms: GraphRoom[] = []

  let wallCounter = 1
  let openingCounter = 1
  let roomCounter = 1

  const addWall = (
    start: [number, number],
    end: [number, number],
    isExt: boolean,
    openingsList: Array<Omit<GraphOpening, 'id' | 'wallId'>> = [],
  ): GraphWall => {
    const wallId = `wall-${wallCounter++}`
    const assignedOpenings: GraphOpening[] = openingsList.map((op) => {
      const fullOp: GraphOpening = {
        ...op,
        id: `open-${openingCounter++}`,
        wallId,
      }
      openings.push(fullOp)
      return fullOp
    })

    const wall: GraphWall = {
      id: wallId,
      start: [Number(start[0].toFixed(2)), Number(start[1].toFixed(2))],
      end: [Number(end[0].toFixed(2)), Number(end[1].toFixed(2))],
      thickness: isExt ? extThick : intThick,
      height: wallH,
      isExterior: isExt,
      openings: assignedOpenings,
    }
    walls.push(wall)
    return wall
  }

  // 1. Center Coordinates in Scene (0, 0 is the center of the house)
  const xMin = -W / 2
  const xMax = W / 2
  const yMin = -D / 2
  const yMax = D / 2

  // 2. Exterior Perimeter Walls with Entrance Door and Windows
  addWall([xMin, yMin], [xMax, yMin], true, [
    { type: 'door', positionRatio: 0.3, width: 1.0, height: 2.1, label: 'Входная дверь' },
    { type: 'window', positionRatio: 0.75, width: 1.4, height: 1.5, sillHeight: 0.9, label: 'Окно гостиной' },
  ])

  addWall([xMax, yMin], [xMax, yMax], true, [
    { type: 'window', positionRatio: 0.3, width: 1.4, height: 1.5, sillHeight: 0.9, label: 'Окно кухни' },
    { type: 'window', positionRatio: 0.75, width: 1.4, height: 1.5, sillHeight: 0.9, label: 'Окно спальни' },
  ])

  addWall([xMax, yMax], [xMin, yMax], true, [
    { type: 'window', positionRatio: 0.3, width: 1.4, height: 1.5, sillHeight: 0.9, label: 'Окно спальни 2' },
    { type: 'window', positionRatio: 0.75, width: 0.9, height: 1.2, sillHeight: 1.2, label: 'Окно санузла' },
  ])

  addWall([xMin, yMax], [xMin, yMin], true, [
    { type: 'window', positionRatio: 0.4, width: 1.4, height: 1.5, sillHeight: 0.9, label: 'Окно спальни' },
    { type: 'window', positionRatio: 0.8, width: 1.2, height: 1.5, sillHeight: 0.9, label: 'Окно прихожей' },
  ])

  // 3. Interior Structural Partitioning
  const midX = Number((xMin + W * 0.45).toFixed(2))
  const splitY1 = Number((yMin + D * 0.45).toFixed(2))
  const splitY2 = Number((yMin + D * 0.75).toFixed(2))

  addWall([midX, yMin], [midX, yMax], false, [
    { type: 'door', positionRatio: 0.2, width: 0.9, height: 2.1, label: 'Дверь в гостиную' },
    { type: 'door', positionRatio: 0.6, width: 0.8, height: 2.1, label: 'Дверь в спальню 1' },
    { type: 'door', positionRatio: 0.85, width: 0.8, height: 2.1, label: 'Дверь в спальню 2' },
  ])

  addWall([xMin, splitY1], [midX, splitY1], false, [
    { type: 'door', positionRatio: 0.5, width: 0.8, height: 2.1, label: 'Дверь в прихожую' },
  ])

  addWall([xMin, splitY2], [midX, splitY2], false, [
    { type: 'door', positionRatio: 0.5, width: 0.8, height: 2.1, label: 'Дверь межкомнатная' },
  ])

  const kitchenY = Number((yMin + D * 0.55).toFixed(2))
  addWall([midX, kitchenY], [xMax, kitchenY], false, [
    { type: 'opening', positionRatio: 0.5, width: 1.8, height: 2.3, label: 'Широкий портал / Арка' },
  ])

  // 4. Generate Sealed Room Polygons (Zones)
  const livingPoly: Array<[number, number]> = [[midX, yMin], [xMax, yMin], [xMax, kitchenY], [midX, kitchenY]]
  rooms.push({
    id: `room-${roomCounter++}`,
    name: 'Кухня-Гостиная',
    type: 'living',
    polygon: livingPoly,
    areaSqM: Number(calcPolygonArea(livingPoly).toFixed(1)),
    color: ROOM_PALETTE.living.color,
    floorFinish: ROOM_PALETTE.living.floorFinish,
  })

  const diningPoly: Array<[number, number]> = [[midX, kitchenY], [xMax, kitchenY], [xMax, yMax], [midX, yMax]]
  rooms.push({
    id: `room-${roomCounter++}`,
    name: 'Столовая / Зал',
    type: 'dining',
    polygon: diningPoly,
    areaSqM: Number(calcPolygonArea(diningPoly).toFixed(1)),
    color: ROOM_PALETTE.dining.color,
    floorFinish: ROOM_PALETTE.dining.floorFinish,
  })

  const hallPoly: Array<[number, number]> = [[xMin, yMin], [midX, yMin], [midX, splitY1], [xMin, splitY1]]
  rooms.push({
    id: `room-${roomCounter++}`,
    name: 'Прихожая / Холл',
    type: 'hallway',
    polygon: hallPoly,
    areaSqM: Number(calcPolygonArea(hallPoly).toFixed(1)),
    color: ROOM_PALETTE.hallway.color,
    floorFinish: ROOM_PALETTE.hallway.floorFinish,
  })

  const bed1Poly: Array<[number, number]> = [[xMin, splitY1], [midX, splitY1], [midX, splitY2], [xMin, splitY2]]
  rooms.push({
    id: `room-${roomCounter++}`,
    name: 'Спальня 1 (Мастер)',
    type: 'bedroom',
    polygon: bed1Poly,
    areaSqM: Number(calcPolygonArea(bed1Poly).toFixed(1)),
    color: ROOM_PALETTE.bedroom.color,
    floorFinish: ROOM_PALETTE.bedroom.floorFinish,
  })

  const bed2Poly: Array<[number, number]> = [[xMin, splitY2], [midX, splitY2], [midX, yMax], [xMin, yMax]]
  rooms.push({
    id: `room-${roomCounter++}`,
    name: 'Спальня 2 / Кабинет',
    type: 'bedroom',
    polygon: bed2Poly,
    areaSqM: Number(calcPolygonArea(bed2Poly).toFixed(1)),
    color: ROOM_PALETTE.bedroom.color,
    floorFinish: ROOM_PALETTE.bedroom.floorFinish,
  })

  // 5. Optional Terrace
  if (params.hasTerrace) {
    const terrD = 2.5
    const terrY = yMin - terrD
    addWall([xMin + 1.0, yMin], [xMin + 1.0, terrY], false)
    addWall([xMin + 1.0, terrY], [xMax - 1.0, terrY], false)
    addWall([xMax - 1.0, terrY], [xMax - 1.0, yMin], false)

    const terrPoly: Array<[number, number]> = [
      [xMin + 1.0, yMin],
      [xMax - 1.0, yMin],
      [xMax - 1.0, terrY],
      [xMin + 1.0, terrY],
    ]
    rooms.push({
      id: `room-${roomCounter++}`,
      name: 'Крытая Терраса',
      type: 'terrace',
      polygon: terrPoly,
      areaSqM: Number(calcPolygonArea(terrPoly).toFixed(1)),
      color: ROOM_PALETTE.terrace.color,
      floorFinish: ROOM_PALETTE.terrace.floorFinish,
    })
  }

  const { walls: snappedWalls, junctions } = snapGraphJunctions(walls, 0.2)
  const totalArea = rooms.reduce((acc, r) => acc + r.areaSqM, 0)

  return {
    scale: {
      metersPerUnit: 1.0,
      realMeters: Math.max(W, D),
    },
    dimensions: {
      widthM: W,
      depthM: D,
      areaSqM: Number(totalArea.toFixed(1)),
    },
    walls: snappedWalls,
    junctions,
    openings,
    rooms,
    metadata: {
      source: 'floorplan3d_layout',
      timestamp: Date.now(),
      confidence: 1.0,
    },
  }
}
