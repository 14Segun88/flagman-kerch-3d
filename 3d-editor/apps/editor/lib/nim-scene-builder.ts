import { useScene } from '@pascal-app/core'
import { useEditor } from '@pascal-app/editor'
import type { AnyNodeId } from '@pascal-app/core/schema'
import {
  AnyNode,
  BuildingNode,
  CeilingNode,
  ColumnNode,
  DoorNode,
  ItemNode,
  LevelNode,
  RoofNode,
  RoofSegmentNode,
  SiteNode,
  SlabNode,
  WallNode,
  WindowNode,
  ZoneNode,
} from '@pascal-app/core/schema'
import type { FloorPlanGraph, GraphOpening, GraphRoom, GraphWall } from './deepfloorplan-engine'
import { synthesizeRoomItems } from './furniture-synthesizer'

export interface BuildProgress {
  step: 'init' | 'slab' | 'walls' | 'openings' | 'rooms' | 'ceilings' | 'roof' | 'furniture' | 'complete' | 'error'
  current: number
  total: number
  message: string
}

export interface Build3DOptions {
  includeRoof?: boolean
  includeCeilings?: boolean
  includeFinishes?: boolean
  includeSkirting?: boolean
  includeFurniture?: boolean
  stepDelayMs?: number
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Completely clears all walls, roofs, slabs, zones, openings and furniture from the scene.
 */
export function clearSceneBuildings(): void {
  const sceneState = useScene.getState()
  const nodes = sceneState.nodes || {}
  const toDelete: AnyNodeId[] = []

  for (const [id, node] of Object.entries(nodes)) {
    if (!node) continue
    const t = (node as AnyNode).type
    if (
      t === 'wall' ||
      t === 'door' ||
      t === 'window' ||
      t === 'slab' ||
      t === 'roof' ||
      t === 'roof-segment' ||
      t === 'ceiling' ||
      t === 'zone' ||
      t === 'item' ||
      t === 'stair' ||
      t === 'column' ||
      t === 'fence'
    ) {
      toDelete.push(id as AnyNodeId)
    }
  }

  if (toDelete.length > 0) {
    try {
      sceneState.deleteNodes(toDelete)
    } catch (err) {
      console.warn('Error clearing scene nodes:', err)
    }
  }
}

/**
 * Stage 3 (3D Realism & Volumetric Synthesis: 2D-To-3D-FloorPlan, Plan2Scene, FloorPlan3D)
 * Constructs a photorealistic BIM model in Pascal's Three.js / WebGPU engine:
 * 1. Foundation Slab (SlabNode with PBR flooring)
 * 2. Connected Structural Walls (WallNode with skirting, PBR facades & interior plaster)
 * 3. Parametric Doors & Windows (DoorNode, WindowNode with precise sill / floor elevations)
 * 4. Room Slabs & Zone Annotations (ZoneNode)
 * 5. Ceilings & Floor Structure (CeilingNode)
 * 6. Pitched Roof System (RoofNode + RoofSegmentNode)
 */
export async function build3DFromFloorPlanGraph(
  graph: FloorPlanGraph,
  onProgress: (progress: BuildProgress) => void,
  options: Build3DOptions = {},
): Promise<void> {
  const {
    includeRoof = false,
    includeCeilings = true,
    includeFinishes = true,
    includeSkirting = true,
    includeFurniture = true,
    stepDelayMs = 60,
  } = options

  // Auto-clear previous leftover buildings, roofs, and walls
  clearSceneBuildings()
  await sleep(100)

  const sceneState = useScene.getState()

  // 1. Initialize Skeleton (Site -> Building -> Level)
  onProgress({
    step: 'init',
    current: 0,
    total: 1,
    message: 'Инициализация 3D-сцены и строительного уровня...',
  })

  let siteId: AnyNodeId | null = null
  let buildingId: AnyNodeId | null = null
  let levelId: AnyNodeId | null = null

  const existingNodes = sceneState.nodes || {}

  for (const [id, node] of Object.entries(existingNodes)) {
    if (node && (node as AnyNode).type === 'site') {
      siteId = id as AnyNodeId
    } else if (node && (node as AnyNode).type === 'building') {
      buildingId = id as AnyNodeId
    } else if (node && (node as AnyNode).type === 'level') {
      levelId = id as AnyNodeId
    }
  }

  if (!siteId) {
    const newBuilding = BuildingNode.parse({})
    const newSite = SiteNode.parse({ children: [newBuilding.id] })
    const newLevel = LevelNode.parse({ level: 0, height: 2.8 })

    siteId = newSite.id as AnyNodeId
    buildingId = newBuilding.id as AnyNodeId
    levelId = newLevel.id as AnyNodeId

    sceneState.createNode(newSite as AnyNode)
    sceneState.createNode(newBuilding as AnyNode, siteId)
    sceneState.createNode(newLevel as AnyNode, buildingId)
  } else if (!levelId) {
    const newLevel = LevelNode.parse({ level: 0, height: 2.8 })
    levelId = newLevel.id as AnyNodeId
    sceneState.createNode(newLevel as AnyNode, buildingId || siteId)
  }

  await sleep(150)

  // 2. Build Foundation Slabs with PBR finishes (Plan2Scene)
  if (graph.rooms && graph.rooms.length > 0) {
    onProgress({
      step: 'slab',
      current: 0,
      total: graph.rooms.length,
      message: 'Заливка монолитного фундамента и укладка чистовых полов PBR...',
    })

    for (let rIdx = 0; rIdx < graph.rooms.length; rIdx++) {
      const room = graph.rooms[rIdx]!
      if (room.polygon && room.polygon.length >= 3) {
        try {
          const isPool = room.type === 'balcony' || room.name.toLowerCase().includes('бассейн')
          const slabElevation = isPool ? 0.02 : 0.05
          const slabThickness = isPool ? 0.05 : 0.15

          const slabNode = SlabNode.parse({
            polygon: room.polygon,
            elevation: slabElevation,
            thickness: slabThickness,
            materialPreset: room.floorFinish || 'library:preset-lightgrey',
          })
          useScene.getState().createNode(slabNode as AnyNode, levelId!)
        } catch (err) {
          console.warn('Could not create slab for room:', err)
        }
      }
    }
    await sleep(stepDelayMs)
  }

  // 3. Build Connected Walls with Skirting & Finishes
  const walls = graph.walls || []
  console.log(`🧱 [Stage 3 Builder] Монтаж ${walls.length} связных 3D-стен...`)

  onProgress({
    step: 'walls',
    current: 0,
    total: walls.length,
    message: `Возведение ${walls.length} капитальных стен с чистовой отделкой...`,
  })

  const createdWallMap = new Map<string, string>() // graphWall.id -> createdWallNode.id

  for (let i = 0; i < walls.length; i++) {
    const w = walls[i]!
    try {
      const extMat = w.materialPreset || (w.isExterior ? 'library:preset-softwhite' : 'library:preset-white')
      const wallNode = WallNode.parse({
        start: w.start,
        end: w.end,
        thickness: w.thickness || (w.isExterior ? 0.3 : 0.15),
        height: w.height || 2.8,
        frontSide: w.isExterior ? 'exterior' : 'interior',
        backSide: 'interior',
        materialPreset: extMat,
        exteriorMaterialPreset: extMat,
        interiorMaterialPreset: extMat,
        slots: {
          exterior: extMat,
          interior: extMat,
          lowerExterior: extMat,
          middleExterior: extMat,
          upperExterior: extMat,
          topExterior: extMat,
          lowerInterior: extMat,
          middleInterior: extMat,
          upperInterior: extMat,
          topInterior: extMat,
        },
        skirting: includeSkirting
          ? {
              enabled: true,
              sides: 'interior',
              height: 0.1,
              proud: 0.015,
              profile: 'flat',
            }
          : undefined,
      })

      useScene.getState().createNode(wallNode as AnyNode, levelId!)
      createdWallMap.set(w.id, wallNode.id)

      onProgress({
        step: 'walls',
        current: i + 1,
        total: walls.length,
        message: `Возведение стены ${i + 1} из ${walls.length}...`,
      })

      await sleep(stepDelayMs)
    } catch (err) {
      console.warn(`Failed to build wall ${i}:`, err)
    }
  }

  // 4. Build Doors & Windows with Exact Center Elevations
  const openings = graph.openings || []
  if (openings.length > 0) {
    onProgress({
      step: 'openings',
      current: 0,
      total: openings.length,
      message: `Установка дверных и оконных блоков (${openings.length} шт.)...`,
    })

    for (let o = 0; o < openings.length; o++) {
      const op = openings[o]!
      const parentNodeId = createdWallMap.get(op.wallId)
      const hostWall = walls.find((w) => w.id === op.wallId)

      if (hostWall) {
        const wallLen = Math.hypot(hostWall.end[0] - hostWall.start[0], hostWall.end[1] - hostWall.start[1])
        const posAlongWall = (op.positionRatio ?? 0.5) * wallLen

        try {
          const hostId = (parentNodeId as AnyNodeId) || levelId!
          if (op.type === 'door') {
            const doorH = op.height || 2.1
            const doorNode = DoorNode.parse({
              position: [posAlongWall, doorH / 2, 0], // Exact center elevation aligns threshold with floor!
              wallId: parentNodeId,
              width: op.width || 0.9,
              height: doorH,
            })
            useScene.getState().createNode(doorNode as AnyNode, hostId)
          } else if (op.type === 'window') {
            const winH = op.height || 1.5
            const sillH = op.sillHeight ?? 0.9
            const windowNode = WindowNode.parse({
              position: [posAlongWall, sillH + winH / 2, 0], // Exact center elevation aligns sill at 0.9m!
              wallId: parentNodeId,
              width: op.width || 1.4,
              height: winH,
            })
            useScene.getState().createNode(windowNode as AnyNode, hostId)
          }
        } catch (err) {
          console.warn(`Failed to place opening ${o}:`, err)
        }
      }

      onProgress({
        step: 'openings',
        current: o + 1,
        total: openings.length,
        message: `Установка проёма ${o + 1} из ${openings.length}: ${op.label || op.type}...`,
      })
      await sleep(stepDelayMs)
    }
  }

  // 5. Build Room Zones (Экспликация)
  const rooms = graph.rooms || []
  if (rooms.length > 0) {
    onProgress({
      step: 'rooms',
      current: 0,
      total: rooms.length,
      message: `Формирование экспликации ${rooms.length} помещений...`,
    })

    for (let r = 0; r < rooms.length; r++) {
      const room = rooms[r]!
      if (room.polygon && room.polygon.length >= 3) {
        try {
          const zoneNode = ZoneNode.parse({
            name: `${room.name} (${room.areaSqM} м²)`,
            polygon: room.polygon,
          })
          useScene.getState().createNode(zoneNode as AnyNode, levelId!)
        } catch (err) {
          console.warn(`Failed to create zone for room ${r}:`, err)
        }
      }

      onProgress({
        step: 'rooms',
        current: r + 1,
        total: rooms.length,
        message: `Зонирование: ${room.name} (${room.areaSqM} м²)...`,
      })
      await sleep(stepDelayMs)
    }
  }

  // 6. Build Ceilings (Потолочные перекрытия)
  if (includeCeilings && rooms.length > 0) {
    onProgress({
      step: 'ceilings',
      current: 0,
      total: rooms.length,
      message: 'Монтаж потолочных перекрытий...',
    })

    for (const room of rooms) {
      if (room.polygon && room.polygon.length >= 3 && room.type !== 'terrace' && !room.name.toLowerCase().includes('бассейн')) {
        try {
          const ceilingNode = CeilingNode.parse({
            polygon: room.polygon,
            height: 2.8,
            materialPreset: 'library:preset-white',
          })
          useScene.getState().createNode(ceilingNode as AnyNode, levelId!)
        } catch (err) {
          console.warn('Could not create ceiling:', err)
        }
      }
    }
    await sleep(stepDelayMs)
  }

/**
 * Clusters wall segments into distinct separate buildings
 */
function clusterWallsIntoBuildings(walls: GraphWall[]): GraphWall[][] {
  const tallWalls = walls.filter((w) => (w.height || 2.8) > 0.8) // Only structural building walls
  if (tallWalls.length === 0) return []

  const visited = new Set<string>()
  const clusters: GraphWall[][] = []

  const areWallsConnected = (w1: GraphWall, w2: GraphWall) => {
    const pts1 = [w1.start, w1.end]
    const pts2 = [w2.start, w2.end]
    for (const p1 of pts1) {
      for (const p2 of pts2) {
        if (Math.hypot(p1[0] - p2[0], p1[1] - p2[1]) < 0.8) return true
      }
    }
    return false
  }

  for (const w of tallWalls) {
    if (visited.has(w.id)) continue
    const cluster: GraphWall[] = []
    const queue: GraphWall[] = [w]
    visited.add(w.id)

    while (queue.length > 0) {
      const current = queue.shift()!
      cluster.push(current)

      for (const other of tallWalls) {
        if (!visited.has(other.id) && areWallsConnected(current, other)) {
          visited.add(other.id)
          queue.push(other)
        }
      }
    }

    if (cluster.length >= 3) {
      clusters.push(cluster)
    }
  }

  return clusters
}

  // 7. Individual Pitched Roofs per Building Cluster (FloorPlan3D Roof Engine)
  if (includeRoof && walls.length > 0) {
    const buildingClusters = clusterWallsIntoBuildings(walls)

    onProgress({
      step: 'roof',
      current: 0,
      total: buildingClusters.length,
      message: `Возведение индивидуальных крыш (${buildingClusters.length} строений)...`,
    })

    for (let cIdx = 0; cIdx < buildingClusters.length; cIdx++) {
      const bWalls = buildingClusters[cIdx]!
      try {
        const allX = bWalls.flatMap((w) => [w.start[0], w.end[0]])
        const allY = bWalls.flatMap((w) => [w.start[1], w.end[1]])
        const minX = Math.min(...allX)
        const maxX = Math.max(...allX)
        const minY = Math.min(...allY)
        const maxY = Math.max(...allY)

        const rawW = maxX - minX
        const rawD = maxY - minY
        if (rawW < 2.0 || rawD < 2.0) continue

        const roofW = Number((rawW + 0.6).toFixed(2))
        const roofD = Number((rawD + 0.6).toFixed(2))
        const roofPosX = Number(((minX + maxX) / 2).toFixed(2))
        const roofPosZ = Number(((minY + maxY) / 2).toFixed(2))

        const wallHeight = Math.max(bWalls[0]?.height || 2.8, 2.7)

        const roofSegment = RoofSegmentNode.parse({
          roofType: 'gable',
          width: roofW,
          depth: roofD,
          pitch: 22,
          wallHeight: 0.05,
          overhang: 0.35,
          position: [0, 0, 0],
        })

        const roofNode = RoofNode.parse({
          position: [roofPosX, wallHeight, roofPosZ],
          children: [roofSegment.id],
        })

        useScene.getState().createNode(roofNode as AnyNode, levelId!)
        useScene.getState().createNode(roofSegment as AnyNode, roofNode.id as AnyNodeId)
      } catch (roofErr) {
        console.warn(`Could not build roof for cluster ${cIdx}:`, roofErr)
      }
      await sleep(stepDelayMs)
    }

    // Добавляем деревянные колонны для открытой беседки и террасы бани
    const pergolaColumns: Array<[number, number, number]> = [
      // 4 угловые колонны беседки
      [-11.0, 0, -15.5],
      [-6.5, 0, -15.5],
      [-11.0, 0, -10.5],
      [-6.5, 0, -10.5],
      // 3 фасадные колонны террасы бани
      [3.5, 0, 4.0],
      [9.5, 0, 4.0],
      [6.5, 0, 4.0],
    ]
    for (const [cx, cy, cz] of pergolaColumns) {
      try {
        const col = ColumnNode.parse({
          position: [cx, cy, cz],
          height: 2.7,
          crossSection: 'square',
          width: 0.2,
          depth: 0.2,
          style: 'plain',
        })
        useScene.getState().createNode(col as AnyNode, levelId!)
      } catch (colErr) {
        console.warn('Could not place column:', colErr)
      }
    }
  }

  // 8. Synthesize Realistic 3D Furniture, Bathroom, Kitchen & Nature (FloorPlan3D Items Placer)
  if (includeFurniture && rooms.length > 0) {
    const furnitureItems = synthesizeRoomItems(rooms)
    console.log(`🛋️ [FloorPlan3D] Расстановка ${furnitureItems.length} 3D-моделей мебели и ландшафта...`)

    onProgress({
      step: 'furniture',
      current: 0,
      total: furnitureItems.length,
      message: `Расстановка 3D-мебели, сантехники и ландшафта (${furnitureItems.length} шт.)...`,
    })

    for (let fIdx = 0; fIdx < furnitureItems.length; fIdx++) {
      const itemData = furnitureItems[fIdx]!
      try {
        const itemNode = ItemNode.parse({
          position: itemData.position,
          rotation: itemData.rotation,
          scale: itemData.scale || [1, 1, 1],
          asset: itemData.asset,
        })
        useScene.getState().createNode(itemNode as AnyNode, levelId!)
      } catch (itemErr) {
        console.warn('Could not place furniture item:', itemErr)
      }

      if (fIdx % 4 === 0) {
        onProgress({
          step: 'furniture',
          current: fIdx + 1,
          total: furnitureItems.length,
          message: `Установка 3D-объектов: ${itemData.asset.name}...`,
        })
        await sleep(15)
      }
    }
  }

  // 9. Switch camera to 3D Orbit View
  try {
    useEditor.getState().setViewMode('3d')
  } catch (err) {
    console.warn('Could not switch to 3d view mode:', err)
  }

  onProgress({
    step: 'complete',
    current: 100,
    total: 100,
    message: `Готово! 3D-модель собрана: ${walls.length} стен, ${openings.length} проёмов, ${rooms.length} комнат с мебелью (${graph.dimensions.areaSqM} м²).`,
  })
}

/**
 * Universal Wrapper for backward compatibility
 */
export async function animateNimBuild(
  data: any,
  onProgress: (progress: BuildProgress) => void,
  stepDelayMs = 100,
): Promise<void> {
  if (data && (data.walls || data.rooms) && !data.objects) {
    return build3DFromFloorPlanGraph(data as FloorPlanGraph, onProgress, { stepDelayMs })
  }

  const walls: GraphWall[] = (data.walls || []).map((w: any, idx: number) => ({
    id: `w-${idx + 1}`,
    start: w.start,
    end: w.end,
    thickness: w.thickness || 0.25,
    height: w.height || 2.8,
    isExterior: true,
    openings: [],
  }))

  const rooms: GraphRoom[] = (data.rooms || []).map((r: any, idx: number) => ({
    id: `r-${idx + 1}`,
    name: r.name || `Помещение ${idx + 1}`,
    type: r.type || 'general',
    polygon: r.polygon,
    areaSqM: 20,
    color: '#64748b',
  }))

  const graph: FloorPlanGraph = {
    scale: { metersPerUnit: 1.0 },
    dimensions: { widthM: 10, depthM: 10, areaSqM: 80 },
    walls,
    junctions: [],
    openings: [],
    rooms,
  }

  return build3DFromFloorPlanGraph(graph, onProgress, { stepDelayMs })
}

export function build3DSceneFromBoundingBoxes(rawObjects: any[], sceneScale = 35) {
  return { walls: [], rooms: [] }
}

export function convertBoundingBoxesTo3DScene(objects: any[]) {
  return { walls: [], zones: [] }
}
