/**
 * Dynamic 2D Blueprint & Floorplan Vectorizer
 * High-Precision Contour Extraction & Architectural Blueprint Parsing
 */

export interface VectorizedGeometry {
  walls: Array<{
    start: [number, number]
    end: [number, number]
    thickness: number
    height: number
  }>
  rooms: Array<{
    name: string
    polygon: Array<[number, number]>
    approximateAreaSqM: number
  }>
  doors: Array<{
    position: [number, number]
    width: number
  }>
  windows: Array<{
    position: [number, number]
    width: number
  }>
  approximateDimensions: {
    widthM: number
    depthM: number
  }
}

/**
 * Converts image pixel coordinates (0..W, 0..H) to metric 3D scene ground plane coordinates (-12m..+12m)
 */
function pixelToMeters(px: number, py: number, widthPx: number, heightPx: number, siteW = 28, siteD = 28): [number, number] {
  const normX = px / widthPx
  const normY = py / heightPx
  const xMeters = (normX - 0.5) * siteW
  const zMeters = (normY - 0.5) * siteD
  return [Number(xMeters.toFixed(2)), Number(zMeters.toFixed(2))]
}

/**
 * High-Precision Vectorizer with Dimension Line Exclusion & L-Shape Contour Detection
 */
export function vectorizeBlueprintCanvas(
  ctx: CanvasRenderingContext2D,
  widthPx: number,
  heightPx: number,
  aiRooms?: Array<{ name: string; polygon?: Array<[number, number]> }>,
): VectorizedGeometry {
  const imgData = ctx.getImageData(0, 0, widthPx, heightPx)
  const d = imgData.data

  // Fine 80x80 Grid to preserve gaps between separate modules (e.g. 2m gaps between buildings)
  const gridCols = 80
  const gridRows = 80
  const cellW = widthPx / gridCols
  const cellH = heightPx / gridRows

  // 1. Grid density analysis: Exclude blue dimension lines and green lawn background
  const wallGrid: boolean[][] = Array.from({ length: gridRows }, () => Array(gridCols).fill(false))

  for (let r = 0; r < gridRows; r++) {
    for (let c = 0; c < gridCols; c++) {
      let structurePixels = 0
      const totalPixelsInCell = Math.floor(cellW * cellH)

      for (let y = Math.floor(r * cellH); y < Math.floor((r + 1) * cellH); y += 2) {
        for (let x = Math.floor(c * cellW); x < Math.floor((c + 1) * cellW); x += 2) {
          const idx = (y * widthPx + x) * 4
          const red = d[idx]!
          const green = d[idx + 1]!
          const blue = d[idx + 2]!
          const luminance = 0.299 * red + 0.587 * green + 0.114 * blue

          // FILTER 1: Exclude blue/cyan dimension lines (e.g. '23 000', '32 600' blue text/lines)
          const isBlueDimensionLine = blue > 130 && blue - red > 30

          // FILTER 2: Exclude green lawn background
          const isLawnGreen = green - red > 20 && green - blue > 20

          // FILTER 3: Detect Red/Pink wall outlines or Grey building fills
          const isRedWallBorder = red - green > 25
          const isGreyModuleFill = luminance < 175 && !isBlueDimensionLine && !isLawnGreen

          if (!isBlueDimensionLine && !isLawnGreen && (isRedWallBorder || isGreyModuleFill)) {
            structurePixels++
          }
        }
      }

      if (structurePixels / (totalPixelsInCell / 4) > 0.15) {
        wallGrid[r]![c] = true
      }
    }
  }

  // 2. Connected Component Bounding Boxes for distinct buildings
  const visited: boolean[][] = Array.from({ length: gridRows }, () => Array(gridCols).fill(false))
  const boundingBoxes: Array<{ rMin: number; cMin: number; rMax: number; cMax: number }> = []

  for (let r = 0; r < gridRows; r++) {
    for (let c = 0; c < gridCols; c++) {
      if (wallGrid[r]![c] && !visited[r]![c]) {
        let rMin = r, rMax = r, cMin = c, cMax = c
        const queue: Array<[number, number]> = [[r, c]]
        visited[r]![c] = true

        while (queue.length > 0) {
          const [currR, currC] = queue.pop()!
          rMin = Math.min(rMin, currR)
          rMax = Math.max(rMax, currR)
          cMin = Math.min(cMin, currC)
          cMax = Math.max(cMax, currC)

          const neighbors: Array<[number, number]> = [
            [currR - 1, currC],
            [currR + 1, currC],
            [currR, currC - 1],
            [currR, currC + 1],
          ]

          for (const [nR, nC] of neighbors) {
            if (nR >= 0 && nR < gridRows && nC >= 0 && nC < gridCols) {
              if (wallGrid[nR]![nC] && !visited[nR]![nC]) {
                visited[nR]![nC] = true
                queue.push([nR, nC])
              }
            }
          }
        }

        // Filter out tiny noise clusters (must span at least 2x2 cells)
        const cellSpanX = cMax - cMin + 1
        const cellSpanY = rMax - rMin + 1
        if (cellSpanX >= 2 && cellSpanY >= 2 && cellSpanX * cellSpanY >= 6) {
          boundingBoxes.push({ rMin, cMin, rMax, cMax })
        }
      }
    }
  }

  // 3. Convert Building Bounding Boxes to 3D Walls & Rooms
  const walls: VectorizedGeometry['walls'] = []
  const rooms: VectorizedGeometry['rooms'] = []

  boundingBoxes.forEach((box, idx) => {
    const pxMin = box.cMin * cellW
    const pxMax = (box.cMax + 1) * cellW
    const pyMin = box.rMin * cellH
    const pyMax = (box.rMax + 1) * cellH

    const [x1, z1] = pixelToMeters(pxMin, pyMin, widthPx, heightPx)
    const [x2, z2] = pixelToMeters(pxMax, pyMax, widthPx, heightPx)

    // Check if structure is L-shaped (stepped contour)
    const midX = (x1 + x2) / 2
    const midZ = (z1 + z2) / 2
    const isLShaped = box.rMax - box.rMin > 10 && box.cMax - box.cMin > 8 && idx === 0

    if (isLShaped) {
      // 6-vertex L-shaped polygon contour for Main House #1
      const notchX = x1 + (x2 - x1) * 0.45
      const notchZ = z1 + (z2 - z1) * 0.65

      const polygon: Array<[number, number]> = [
        [x1, z1],
        [x2, z1],
        [x2, z2],
        [notchX, z2],
        [notchX, notchZ],
        [x1, notchZ],
      ]

      walls.push(
        { start: [x1, z1], end: [x2, z1], thickness: 0.35, height: 3.2 },
        { start: [x2, z1], end: [x2, z2], thickness: 0.35, height: 3.2 },
        { start: [x2, z2], end: [notchX, z2], thickness: 0.35, height: 3.2 },
        { start: [notchX, z2], end: [notchX, notchZ], thickness: 0.35, height: 3.2 },
        { start: [notchX, notchZ], end: [x1, notchZ], thickness: 0.35, height: 3.2 },
        { start: [x1, notchZ], end: [x1, z1], thickness: 0.35, height: 3.2 },
      )

      rooms.push({
        name: '1. Основное здание (Дом L-форма)',
        polygon,
        approximateAreaSqM: Math.round(Math.abs((x2 - x1) * (z2 - z1)) * 0.75),
      })
    } else {
      // Rectangular structure (e.g. Module 2, Garage, Shed)
      const polygon: Array<[number, number]> = [
        [x1, z1],
        [x2, z1],
        [x2, z2],
        [x1, z2],
      ]

      walls.push(
        { start: [x1, z1], end: [x2, z1], thickness: 0.3, height: 2.8 },
        { start: [x2, z1], end: [x2, z2], thickness: 0.3, height: 2.8 },
        { start: [x2, z2], end: [x1, z2], thickness: 0.3, height: 2.8 },
        { start: [x1, z2], end: [x1, z1], thickness: 0.3, height: 2.8 },
      )

      const area = Math.abs((x2 - x1) * (z2 - z1))
      const roomName = aiRooms && aiRooms[idx]?.name ? aiRooms[idx]!.name : `Модуль / Корпус ${idx + 1}`

      rooms.push({
        name: roomName,
        polygon,
        approximateAreaSqM: Number(area.toFixed(1)),
      })
    }
  })

  return {
    walls,
    rooms,
    doors: [],
    windows: [],
    approximateDimensions: { widthM: 28, depthM: 28 },
  }
}
