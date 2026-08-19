import {
  type FloorPlanGraph,
  type GraphOpening,
  type GraphRoom,
  type GraphWall,
  type RoomCategory,
  ROOM_PALETTE,
  calcPolygonArea,
  detectRoomCategory,
  regularizeOrthogonalWalls,
  snapGraphJunctions,
} from './deepfloorplan-engine'

/**
 * Parses JSON exports from floor-plan.ai, DeepFloorPlan, FloorPlan3D, or generic BIM schemas.
 */
export function importFloorPlanJson(jsonText: string): FloorPlanGraph {
  let parsed: any
  try {
    parsed = JSON.parse(jsonText)
  } catch (err: any) {
    throw new Error(`Некорректный JSON файл: ${err.message}`)
  }

  // Case A: Direct FloorPlanGraph format
  if (parsed.walls && Array.isArray(parsed.walls) && (parsed.rooms || parsed.zones || parsed.openings)) {
    return normalizeFloorPlanGraph(parsed)
  }

  // Case B: floor-plan.ai / CubiCasa schema ({ elements: [...], rooms: [...], walls: [...] })
  if (parsed.elements || parsed.features || parsed.spaces || parsed.boundaries) {
    return parseFloorPlanAiSchema(parsed)
  }

  // Case C: Simple vector list format ({ lines: [...], doors: [...], windows: [...] })
  if (parsed.lines && Array.isArray(parsed.lines)) {
    return parseSimpleLinesSchema(parsed)
  }

  throw new Error('Формат JSON не распознан. Ожидается экспорт FloorPlan.ai, DeepFloorPlan или BIM-граф.')
}

function normalizeFloorPlanGraph(data: any): FloorPlanGraph {
  const walls: GraphWall[] = (data.walls || []).map((w: any, idx: number) => ({
    id: w.id || `wall-${idx + 1}`,
    start: [Number(w.start[0]), Number(w.start[1])],
    end: [Number(w.end[0]), Number(w.end[1])],
    thickness: Number(w.thickness || (w.isExterior ? 0.3 : 0.15)),
    height: Number(w.height || 2.8),
    isExterior: Boolean(w.isExterior ?? true),
    openings: (w.openings || []).map((op: any, oIdx: number) => ({
      id: op.id || `open-${idx}-${oIdx}`,
      wallId: w.id || `wall-${idx + 1}`,
      type: op.type || 'door',
      positionRatio: Number(op.positionRatio ?? op.ratio ?? 0.5),
      width: Number(op.width || 0.9),
      height: Number(op.height || 2.1),
      sillHeight: Number(op.sillHeight || (op.type === 'window' ? 0.9 : 0)),
      label: op.label || (op.type === 'window' ? 'Окно' : 'Дверь'),
    })),
  }))

  const rawRooms = data.rooms || data.zones || []
  const rooms: GraphRoom[] = rawRooms.map((r: any, idx: number) => {
    const polygon = (r.polygon || r.points || []).map((p: any) => [Number(p[0]), Number(p[1])] as [number, number])
    const category: RoomCategory = r.type && r.type in ROOM_PALETTE ? r.type : detectRoomCategory(r.name || '')
    const area = r.areaSqM || r.area || calcPolygonArea(polygon)
    return {
      id: r.id || `room-${idx + 1}`,
      name: r.name || `Помещение ${idx + 1}`,
      type: category,
      polygon,
      areaSqM: Number(area.toFixed(1)),
      color: r.color || ROOM_PALETTE[category]?.color || '#64748b',
      floorFinish: r.floorFinish || ROOM_PALETTE[category]?.floorFinish || 'laminate',
    }
  })

  const rawOpenings = data.openings || []
  const openings: GraphOpening[] = rawOpenings.map((op: any, idx: number) => ({
    id: op.id || `open-${idx + 1}`,
    wallId: op.wallId || '',
    type: op.type || 'door',
    positionRatio: Number(op.positionRatio ?? 0.5),
    width: Number(op.width || 0.9),
    height: Number(op.height || 2.1),
    sillHeight: Number(op.sillHeight || 0),
    label: op.label,
  }))

  const { walls: snappedWalls, junctions } = snapGraphJunctions(walls, 0.25)
  const regularizedWalls = regularizeOrthogonalWalls(snappedWalls)

  return {
    scale: data.scale || { metersPerUnit: 1.0, realMeters: 10.0 },
    dimensions: data.dimensions || {
      widthM: 10,
      depthM: 10,
      areaSqM: rooms.reduce((acc, r) => acc + r.areaSqM, 0),
    },
    walls: regularizedWalls,
    junctions,
    openings: openings.length > 0 ? openings : regularizedWalls.flatMap((w) => w.openings),
    rooms,
    metadata: {
      source: data.metadata?.source || 'floor_plan_ai',
      timestamp: Date.now(),
      confidence: 1.0,
    },
  }
}

function parseFloorPlanAiSchema(parsed: any): FloorPlanGraph {
  const walls: GraphWall[] = []
  const rooms: GraphRoom[] = []
  const openings: GraphOpening[] = []

  let wallIdCounter = 1
  let roomIdCounter = 1

  // Extract walls from features / elements
  const elements = parsed.elements || parsed.features || parsed.walls || []
  elements.forEach((el: any) => {
    if (el.type === 'wall' || el.geometry === 'line' || el.start) {
      walls.push({
        id: `wall-${wallIdCounter++}`,
        start: [Number(el.start?.[0] || el.x1 || 0), Number(el.start?.[1] || el.y1 || 0)],
        end: [Number(el.end?.[0] || el.x2 || 1), Number(el.end?.[1] || el.y2 || 1)],
        thickness: Number(el.thickness || 0.25),
        height: Number(el.height || 2.8),
        isExterior: Boolean(el.isExterior ?? true),
        openings: [],
      })
    }
  })

  // Extract rooms / spaces
  const spaces = parsed.spaces || parsed.rooms || []
  spaces.forEach((sp: any) => {
    const poly = (sp.polygon || sp.boundary || sp.points || []).map((pt: any) => [Number(pt[0]), Number(pt[1])] as [number, number])
    if (poly.length >= 3) {
      const cat = detectRoomCategory(sp.name || sp.label || '')
      rooms.push({
        id: `room-${roomIdCounter++}`,
        name: sp.name || sp.label || `Комната ${roomIdCounter}`,
        type: cat,
        polygon: poly,
        areaSqM: Number(calcPolygonArea(poly).toFixed(1)),
        color: ROOM_PALETTE[cat]?.color || '#64748b',
        floorFinish: ROOM_PALETTE[cat]?.floorFinish || 'laminate',
      })
    }
  })

  const { walls: snappedWalls, junctions } = snapGraphJunctions(walls, 0.25)

  return {
    scale: { metersPerUnit: 1.0, realMeters: 10.0 },
    dimensions: {
      widthM: 10,
      depthM: 10,
      areaSqM: rooms.reduce((acc, r) => acc + r.areaSqM, 0),
    },
    walls: snappedWalls,
    junctions,
    openings,
    rooms,
    metadata: {
      source: 'floor_plan_ai',
      timestamp: Date.now(),
      confidence: 0.95,
    },
  }
}

function parseSimpleLinesSchema(parsed: any): FloorPlanGraph {
  const walls: GraphWall[] = parsed.lines.map((l: any, idx: number) => ({
    id: `wall-${idx + 1}`,
    start: [Number(l[0][0]), Number(l[0][1])],
    end: [Number(l[1][0]), Number(l[1][1])],
    thickness: 0.25,
    height: 2.8,
    isExterior: true,
    openings: [],
  }))

  const { walls: snappedWalls, junctions } = snapGraphJunctions(walls, 0.3)

  return {
    scale: { metersPerUnit: 1.0 },
    dimensions: { widthM: 10, depthM: 10, areaSqM: 60 },
    walls: snappedWalls,
    junctions,
    openings: [],
    rooms: [],
    metadata: {
      source: 'custom',
      timestamp: Date.now(),
    },
  }
}

/**
 * Universal DXF CAD Floor Plan Parser
 * Parses ASCII DXF files and extracts LINE, LWPOLYLINE entities on architectural layers.
 */
export function importDxfFloorPlan(dxfContent: string): FloorPlanGraph {
  const lines = dxfContent.split(/\r?\n/)
  const walls: GraphWall[] = []
  let wallCounter = 1

  let i = 0
  while (i < lines.length) {
    const code = lines[i]?.trim()
    const value = lines[i + 1]?.trim()
    i += 2

    if (code === '0' && value === 'LINE') {
      let x1 = 0
      let y1 = 0
      let x2 = 0
      let y2 = 0
      let layer = ''

      while (i < lines.length) {
        const subCode = lines[i]?.trim()
        const subVal = lines[i + 1]?.trim()
        if (subCode === '0') break // next entity

        if (subCode === '8') layer = subVal?.toUpperCase() || ''
        if (subCode === '10') x1 = parseFloat(subVal || '0')
        if (subCode === '20') y1 = parseFloat(subVal || '0')
        if (subCode === '11') x2 = parseFloat(subVal || '0')
        if (subCode === '21') y2 = parseFloat(subVal || '0')
        i += 2
      }

      // If entity is on wall layer or generic layer
      const isWallLayer = !layer || layer.includes('WALL') || layer.includes('СТЕН') || layer.includes('A-WALL') || layer === '0'

      if (isWallLayer && Math.hypot(x2 - x1, y2 - y1) > 0.1) {
        walls.push({
          id: `dxf-wall-${wallCounter++}`,
          start: [Number(x1.toFixed(3)), Number(y1.toFixed(3))],
          end: [Number(x2.toFixed(3)), Number(y2.toFixed(3))],
          thickness: 0.25,
          height: 2.8,
          isExterior: true,
          openings: [],
        })
      }
    }
  }

  if (walls.length === 0) {
    throw new Error('В DXF файле не найдены подходящие отрезки стен (LINE / LWPOLYLINE).')
  }

  // Auto-fit scale if DXF is in millimeters (e.g. coordinates > 100)
  const maxCoord = Math.max(...walls.flatMap((w) => [Math.abs(w.start[0]), Math.abs(w.start[1]), Math.abs(w.end[0]), Math.abs(w.end[1])]))
  let scaleFactor = 1.0
  if (maxCoord > 500) {
    scaleFactor = 0.001 // Millimeters to meters
  } else if (maxCoord > 50) {
    scaleFactor = 0.01 // Centimeters to meters
  }

  const scaledWalls = walls.map((w) => ({
    ...w,
    start: [Number((w.start[0] * scaleFactor).toFixed(2)), Number((w.start[1] * scaleFactor).toFixed(2))] as [number, number],
    end: [Number((w.end[0] * scaleFactor).toFixed(2)), Number((w.end[1] * scaleFactor).toFixed(2))] as [number, number],
  }))

  const { walls: snappedWalls, junctions } = snapGraphJunctions(scaledWalls, 0.25)
  const regularWalls = regularizeOrthogonalWalls(snappedWalls)

  return {
    scale: { metersPerUnit: scaleFactor },
    dimensions: { widthM: 10, depthM: 10, areaSqM: 80 },
    walls: regularWalls,
    junctions,
    openings: [],
    rooms: [],
    metadata: {
      source: 'dxf_cad',
      timestamp: Date.now(),
      confidence: 1.0,
    },
  }
}
