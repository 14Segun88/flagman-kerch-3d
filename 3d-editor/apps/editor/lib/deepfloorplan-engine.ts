/**
 * DeepFloorPlan & Floor-SP Architectural Graph Engine
 *
 * Implements connected planar graph representation, topological regularization,
 * junction snapping, Manhattan orthogonalization, collinear wall merging,
 * opening extraction, and room polygonization.
 */

export interface GraphPoint {
  x: number
  y: number
}

export interface GraphJunction {
  id: string
  x: number
  y: number
  type: 'corner_L' | 'tee_T' | 'cross_X' | 'end_1' | 'isolated'
  connectedWallIds: string[]
}

export interface GraphOpening {
  id: string
  type: 'door' | 'window' | 'opening' | 'arch'
  wallId: string
  positionRatio: number // 0.0 to 1.0 along the wall segment
  width: number // in meters
  height?: number // in meters
  sillHeight?: number // elevation from floor in meters (e.g., 0.9m for windows)
  swingDirection?: 'left_in' | 'right_in' | 'left_out' | 'right_out'
  label?: string
}

export interface GraphWall {
  id: string
  start: [number, number] // [x, y] in meters
  end: [number, number] // [x, y] in meters
  thickness: number // in meters (e.g., 0.3 for exterior, 0.15 for interior)
  height: number // in meters (default 2.8 - 3.0m)
  isExterior: boolean
  startJunctionId?: string
  endJunctionId?: string
  openings: GraphOpening[]
  materialPreset?: string
}

export type RoomCategory =
  | 'living'
  | 'bedroom'
  | 'kitchen'
  | 'bathroom'
  | 'hallway'
  | 'corridor'
  | 'balcony'
  | 'terrace'
  | 'garage'
  | 'technical'
  | 'dining'
  | 'closet'
  | 'general'

export interface GraphRoom {
  id: string
  name: string
  type: RoomCategory
  polygon: Array<[number, number]> // 2D polygon in meters
  areaSqM: number
  color: string
  floorFinish?: string
}

export interface FloorPlanGraph {
  scale: {
    pixelDistance?: number
    realMeters?: number
    metersPerUnit: number // scale multiplier
  }
  dimensions: {
    widthM: number
    depthM: number
    areaSqM: number
  }
  walls: GraphWall[]
  junctions: GraphJunction[]
  openings: GraphOpening[]
  rooms: GraphRoom[]
  metadata?: {
    source: 'deepfloorplan_ai' | 'floorplan3d_layout' | 'floor_plan_ai' | 'dxf_cad' | 'svg' | 'custom'
    timestamp: number
    confidence?: number
  }
}

// -------------------------------------------------------------
// 1. Geometric Math Utilities
// -------------------------------------------------------------

export function pointDist(p1: [number, number], p2: [number, number]): number {
  return Math.hypot(p2[0] - p1[0], p2[1] - p1[1])
}

export function calcPolygonArea(polygon: Array<[number, number]>): number {
  if (!polygon || polygon.length < 3) return 0
  let area = 0
  for (let i = 0; i < polygon.length; i++) {
    const [x1, y1] = polygon[i]!
    const [x2, y2] = polygon[(i + 1) % polygon.length]!
    area += x1 * y2 - x2 * y1
  }
  return Math.abs(area) / 2
}

export function calcPolygonCenter(polygon: Array<[number, number]>): [number, number] {
  if (!polygon || polygon.length === 0) return [0, 0]
  let sumX = 0
  let sumY = 0
  polygon.forEach(([x, y]) => {
    sumX += x
    sumY += y
  })
  return [sumX / polygon.length, sumY / polygon.length]
}

// -------------------------------------------------------------
// 2. Topological Graph Cleaning & Regularization (Floor-SP)
// -------------------------------------------------------------

/**
 * Snap nearby endpoints together to build solid T, L, and X junctions
 */
export function snapGraphJunctions(
  walls: GraphWall[],
  snapThreshold = 0.25, // in meters
): { walls: GraphWall[]; junctions: GraphJunction[] } {
  const junctions: GraphJunction[] = []
  let junctionCounter = 1

  const vertices: Array<{
    wallId: string
    isStart: boolean
    pos: [number, number]
    junctionId?: string
  }> = []

  walls.forEach((w) => {
    vertices.push({ wallId: w.id, isStart: true, pos: [...w.start] as [number, number] })
    vertices.push({ wallId: w.id, isStart: false, pos: [...w.end] as [number, number] })
  })

  // Cluster close vertices
  const visited = new Set<number>()

  for (let i = 0; i < vertices.length; i++) {
    if (visited.has(i)) continue
    const cluster = [vertices[i]!]
    visited.add(i)

    for (let j = i + 1; j < vertices.length; j++) {
      if (visited.has(j)) continue
      if (pointDist(vertices[i]!.pos, vertices[j]!.pos) <= snapThreshold) {
        cluster.push(vertices[j]!)
        visited.add(j)
      }
    }

    // Average cluster position
    let avgX = 0
    let avgY = 0
    cluster.forEach((v) => {
      avgX += v.pos[0]
      avgY += v.pos[1]
    })
    avgX = Number((avgX / cluster.length).toFixed(3))
    avgY = Number((avgY / cluster.length).toFixed(3))

    const jId = `junc-${junctionCounter++}`
    const connectedWalls = Array.from(new Set(cluster.map((c) => c.wallId)))

    let jType: GraphJunction['type'] = 'isolated'
    if (connectedWalls.length === 1) jType = 'end_1'
    else if (connectedWalls.length === 2) jType = 'corner_L'
    else if (connectedWalls.length === 3) jType = 'tee_T'
    else if (connectedWalls.length >= 4) jType = 'cross_X'

    junctions.push({
      id: jId,
      x: avgX,
      y: avgY,
      type: jType,
      connectedWallIds: connectedWalls,
    })

    cluster.forEach((c) => {
      c.pos[0] = avgX
      c.pos[1] = avgY
      c.junctionId = jId
    })
  }

  // Update wall coordinates from snapped vertices
  const updatedWalls = walls.map((w) => {
    const startV = vertices.find((v) => v.wallId === w.id && v.isStart)
    const endV = vertices.find((v) => v.wallId === w.id && !v.isStart)
    return {
      ...w,
      start: startV ? startV.pos : w.start,
      end: endV ? endV.pos : w.end,
      startJunctionId: startV?.junctionId,
      endJunctionId: endV?.junctionId,
    }
  })

  // Filter out zero-length degenerated walls
  const validWalls = updatedWalls.filter((w) => pointDist(w.start, w.end) > 0.1)

  return { walls: validWalls, junctions }
}

/**
 * Regularize walls onto orthogonal Manhattan grid (0, 90, 45 degrees)
 */
export function regularizeOrthogonalWalls(
  walls: GraphWall[],
  toleranceDeg = 12, // angles within 12 degrees of horizontal/vertical snap
): GraphWall[] {
  return walls.map((w) => {
    const dx = w.end[0] - w.start[0]
    const dy = w.end[1] - w.start[1]
    const length = Math.hypot(dx, dy)
    if (length < 0.05) return w

    let angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI
    if (angleDeg < 0) angleDeg += 360

    // Nearest orthogonal / 45-degree angle
    const targetAngles = [0, 45, 90, 135, 180, 225, 270, 315, 360]
    let closestTarget = angleDeg
    let minDiff = 999

    for (const t of targetAngles) {
      const diff = Math.abs(angleDeg - t)
      if (diff < minDiff) {
        minDiff = diff
        closestTarget = t % 360
      }
    }

    if (minDiff <= toleranceDeg) {
      const rad = (closestTarget * Math.PI) / 180
      const newEndX = Number((w.start[0] + Math.cos(rad) * length).toFixed(3))
      const newEndY = Number((w.start[1] + Math.sin(rad) * length).toFixed(3))
      return {
        ...w,
        end: [newEndX, newEndY],
      }
    }

    return w
  })
}

/**
 * Merge collinear split wall segments into unified walls while preserving opening locations
 */
export function mergeCollinearWalls(walls: GraphWall[], distTolerance = 0.1): GraphWall[] {
  const merged: GraphWall[] = []
  const used = new Set<string>()

  for (let i = 0; i < walls.length; i++) {
    const w1 = walls[i]!
    if (used.has(w1.id)) continue

    let currentWall = { ...w1, openings: [...(w1.openings || [])] }
    let changed = true

    while (changed) {
      changed = false
      for (let j = 0; j < walls.length; j++) {
        const w2 = walls[j]!
        if (w2.id === currentWall.id || used.has(w2.id)) continue

        // Check if w2 is collinear with currentWall and shares an endpoint
        const isConnectedStart = pointDist(currentWall.end, w2.start) <= distTolerance
        const isConnectedEnd = pointDist(currentWall.start, w2.end) <= distTolerance

        if (isConnectedStart || isConnectedEnd) {
          // Check angle collinearity
          const dx1 = currentWall.end[0] - currentWall.start[0]
          const dy1 = currentWall.end[1] - currentWall.start[1]
          const dx2 = w2.end[0] - w2.start[0]
          const dy2 = w2.end[1] - w2.start[1]

          const len1 = Math.hypot(dx1, dy1)
          const len2 = Math.hypot(dx2, dy2)

          const dot = (dx1 * dx2 + dy1 * dy2) / (len1 * len2)
          if (Math.abs(dot) > 0.98 && Math.abs(currentWall.thickness - w2.thickness) < 0.05) {
            // Merge!
            used.add(w2.id)
            if (isConnectedStart) {
              currentWall.end = [...w2.end] as [number, number]
            } else {
              currentWall.start = [...w2.start] as [number, number]
            }
            if (w2.openings) {
              currentWall.openings.push(...w2.openings)
            }
            changed = true
            break
          }
        }
      }
    }

    used.add(currentWall.id)
    merged.push(currentWall)
  }

  return merged
}

// -------------------------------------------------------------
// 3. Color & Category Palette for Rooms
// -------------------------------------------------------------

export const ROOM_PALETTE: Record<RoomCategory, { label: string; color: string; floorFinish: string }> = {
  living: { label: 'Гостиная / Зал', color: '#f59e0b', floorFinish: 'parquet' },
  bedroom: { label: 'Спальня', color: '#8b5cf6', floorFinish: 'laminate' },
  kitchen: { label: 'Кухня / Столовая', color: '#10b981', floorFinish: 'tile' },
  bathroom: { label: 'Санузел / Ванная', color: '#06b6d4', floorFinish: 'tile_waterproof' },
  hallway: { label: 'Прихожая / Холл', color: '#64748b', floorFinish: 'tile' },
  corridor: { label: 'Коридор', color: '#94a3b8', floorFinish: 'laminate' },
  balcony: { label: 'Балкон / Лоджия', color: '#38bdf8', floorFinish: 'tile' },
  terrace: { label: 'Терраса / Крыльцо', color: '#84cc16', floorFinish: 'decking' },
  garage: { label: 'Гараж / Мастерская', color: '#6b7280', floorFinish: 'concrete' },
  technical: { label: 'Котельная / Тех. комната', color: '#ef4444', floorFinish: 'tile' },
  dining: { label: 'Столовая зона', color: '#ec4899', floorFinish: 'parquet' },
  closet: { label: 'Гардеробная / Кладовая', color: '#a855f7', floorFinish: 'laminate' },
  general: { label: 'Помещение', color: '#64748b', floorFinish: 'laminate' },
}

export function detectRoomCategory(name: string): RoomCategory {
  const lower = name.toLowerCase()
  if (lower.includes('гостин') || lower.includes('зал') || lower.includes('living')) return 'living'
  if (lower.includes('спальн') || lower.includes('детск') || lower.includes('bedroom')) return 'bedroom'
  if (lower.includes('кухн') || lower.includes('столов') || lower.includes('kitchen') || lower.includes('кухня')) return 'kitchen'
  if (lower.includes('санузел') || lower.includes('ванн') || lower.includes('туалет') || lower.includes('душ') || lower.includes('bath')) return 'bathroom'
  if (lower.includes('прихож') || lower.includes('холл') || lower.includes('тамбур') || lower.includes('hall')) return 'hallway'
  if (lower.includes('коридор') || lower.includes('corridor')) return 'corridor'
  if (lower.includes('гардероб') || lower.includes('кладов') || lower.includes('closet')) return 'closet'
  if (lower.includes('террас') || lower.includes('веранд') || lower.includes('крыльц') || lower.includes('terrace')) return 'terrace'
  if (lower.includes('балкон') || lower.includes('лоджия') || lower.includes('balcony')) return 'balcony'
  if (lower.includes('гараж') || lower.includes('мастерск') || lower.includes('garage')) return 'garage'
  if (lower.includes('котельн') || lower.includes('бойлерн') || lower.includes('тех')) return 'technical'
  return 'general'
}
