import { maskTextRegions, terminateOcrWorker } from './ocr-text-mask'
import {
  segmentByColor,
  guessSemanticLabel,
  disposeSegmentation,
  type SemanticLabel,
} from './color-segmentation'

export { terminateOcrWorker }

export interface PolygonStructure {
  id: string
  points: Array<[number, number]>
  isLShape: boolean
  colorType: 'pool' | 'building' | 'zone' | 'outline' | 'unknown'
  semanticLabel?: SemanticLabel
  clusterColor?: [number, number, number]
  boundingBox?: { x: number; y: number; width: number; height: number }
}

let cvInstance: any = null

async function getCvInstance() {
  if (cvInstance) return cvInstance
  if (typeof window === 'undefined') return null
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const cvModule = require('@techstark/opencv-js')
    const cv = await (cvModule.default || cvModule)
    cvInstance = cv
    console.log('✅ [OpenCV.js Engine] Модуль OpenCV.js (WASM/C++) успешно загружен!')
    return cvInstance
  } catch (e) {
    console.warn('OpenCV.js load failed:', e)
    return null
  }
}

// Выравнивание линий строго под 0° и 90° (Ортогонализация Manhattan World Constraint)
function makeOrthogonal(points: Array<[number, number]>, threshold = 1.2): Array<[number, number]> {
  if (points.length < 3) return points

  const result: Array<[number, number]> = points.map((p) => [p[0], p[1]])

  for (let i = 0; i < result.length; i++) {
    const nextIdx = (i + 1) % result.length
    const ptI = result[i]!
    const ptNext = result[nextIdx]!

    const dx = Math.abs(ptNext[0] - ptI[0])
    const dy = Math.abs(ptNext[1] - ptI[1])

    if (dx < threshold) {
      const avgX = Number(((ptI[0] + ptNext[0]) / 2).toFixed(2))
      ptI[0] = avgX
      ptNext[0] = avgX
    } else if (dy < threshold) {
      const avgY = Number(((ptI[1] + ptNext[1]) / 2).toFixed(2))
      ptI[1] = avgY
      ptNext[1] = avgY
    }
  }

  return result
}

export async function extractBlueprintPolygons(
  imageElement: HTMLImageElement,
  sceneScale = 35,
): Promise<PolygonStructure[]> {
  const cv = await getCvInstance()
  if (!cv || !cv.Mat || !cv.imread) {
    console.warn('⚠️ [OpenCV.js Engine] cv.imread недоступен или модуль не инициализирован')
    return []
  }

  console.log('🔄 [OpenCV.js Engine] Запуск синхронизации размеров матрицы и анализа кадра...')

  const src = cv.imread(imageElement)
  
  const imgWidth = src.cols
  const imgHeight = src.rows
  const frameArea = imgWidth * imgHeight

  console.log(`📐 [Canvas Sync Log] Точные размеры матрицы: src.cols=${src.cols}px, src.rows=${src.rows}px, Площадь = ${frameArea}px²`)

  // 0. OCR Пре-процессинг: поиск и закрашивание текстовых зон (легенда, номера комнат, размеры)
  let matToProcess = src
  let maskedMatToDelete: any = null

  try {
    console.log('🔤 [OCR Pre-processing] Поиск текстовых зон через Tesseract.js...')
    const { maskedMat, regions } = await maskTextRegions(cv, src, imageElement)
    matToProcess = maskedMat
    maskedMatToDelete = maskedMat
    console.log(
      `🔤 [OCR Pre-processing] Найдено и закрашено ${regions.length} текстовых областей:`,
      regions.map((r) => `"${r.text}" (${Math.round(r.confidence)}%)`).join(', ')
    )
  } catch (ocrErr) {
    console.warn('⚠️ [OCR Pre-processing] Ошибка Tesseract OCR, продолжаем без маскирования текста:', ocrErr)
  }

  const results: PolygonStructure[] = []
  const minArea = frameArea * 0.003 // 0.3% минимальный порог площади

  // 1. Цветовая кластеризация через cv.kmeans (N=6 доминирующих кластеров)
  let segmentation: any = null

  try {
    segmentation = segmentByColor(cv, matToProcess, 6)
    console.group('🎨 [Color Segmentation] Анализ доминирующих цветовых слоев')
    console.log(`Найдено ${segmentation.clusters.length} цветовых кластеров:`)

    for (const cluster of segmentation.clusters) {
      const guess = guessSemanticLabel(cluster.color, cluster.pixelShare)
      console.log(
        `  Кластер #${cluster.clusterId}: RGB(${cluster.color.join(',')}), ` +
          `${(cluster.pixelShare * 100).toFixed(1)}% кадра → ${guess}`,
      )

      // Пропускаем буманжный фон листа
      if (guess === 'background_paper') continue

      const clusterContours = new cv.MatVector()
      const clusterHierarchy = new cv.Mat()

      const morphedMask = new cv.Mat()
      const kernelSize = Math.max(3, Math.round(Math.min(imgWidth, imgHeight) * 0.015))
      const kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(kernelSize, kernelSize))
      cv.morphologyEx(cluster.mask, morphedMask, cv.MORPH_CLOSE, kernel)

      cv.findContours(
        morphedMask,
        clusterContours,
        clusterHierarchy,
        cv.RETR_EXTERNAL,
        cv.CHAIN_APPROX_SIMPLE,
      )

      for (let i = 0; i < clusterContours.size(); ++i) {
        const cnt = clusterContours.get(i)
        const area = cv.contourArea(cnt)
        const rect = cv.boundingRect(cnt)

        const isOuterSheetFrame =
          rect.width >= imgWidth * 0.94 && rect.height >= imgHeight * 0.94

        if (isOuterSheetFrame || area < minArea) {
          cnt.delete()
          continue
        }

        const approx = new cv.Mat()
        const epsilon = 0.025 * cv.arcLength(cnt, true)
        cv.approxPolyDP(cnt, approx, epsilon, true)

        const rawPoints: Array<[number, number]> = []

        if (approx.rows >= 4 && approx.rows <= 12) {
          for (let j = 0; j < approx.rows; ++j) {
            const x = approx.data32S[j * 2]!
            const y = approx.data32S[j * 2 + 1]!
            const worldX = Number((((x / imgWidth) - 0.5) * sceneScale).toFixed(2))
            const worldY = Number((((1 - (y / imgHeight)) - 0.5) * sceneScale).toFixed(2))
            rawPoints.push([worldX, worldY])
          }
        } else {
          const minRect = cv.minAreaRect(cnt)
          const vertices = cv.RotatedRect.points(minRect)
          for (let j = 0; j < 4; j++) {
            const v = vertices[j]!
            const worldX = Number((((v.x / imgWidth) - 0.5) * sceneScale).toFixed(2))
            const worldY = Number((((1 - (v.y / imgHeight)) - 0.5) * sceneScale).toFixed(2))
            rawPoints.push([worldX, worldY])
          }
        }

        const orthoPoints = makeOrthogonal(rawPoints, 1.2)
        const isLShape = orthoPoints.length > 4

        let colorType: 'pool' | 'building' | 'zone' | 'outline' | 'unknown' = 'building'
        if (guess === 'water_pool') colorType = 'pool'
        else if (guess === 'lawn_zone') colorType = 'zone'
        else if (guess === 'outline_red') colorType = 'outline'
        else if (guess === 'unknown') colorType = 'unknown'

        results.push({
          id: `structure-${results.length}`,
          points: orthoPoints,
          isLShape,
          colorType,
          semanticLabel: guess,
          clusterColor: cluster.color,
          boundingBox: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
        })

        cnt.delete()
        approx.delete()
      }

      kernel.delete()
      morphedMask.delete()
      clusterContours.delete()
      clusterHierarchy.delete()
    }
    console.groupEnd()
  } catch (segErr) {
    console.warn('⚠️ [Color Segmentation] Ошибка при кластеризации цвета, переходим к фолбэку:', segErr)
  }

  // 2. Фолбэк на стандартный бинарный пайплайн (для ч/б чертежей без выраженной цветовой заливки)
  if (results.length === 0) {
    console.log('🔄 [OpenCV.js Fallback] Запуск традиционной инвертированной бинаризации (ч/б чертеж)...')
    const gray = new cv.Mat()
    const thresh = new cv.Mat()
    const morphed = new cv.Mat()
    const contours = new cv.MatVector()
    const hierarchy = new cv.Mat()

    cv.cvtColor(matToProcess, gray, cv.COLOR_RGBA2GRAY)
    cv.threshold(gray, thresh, 190, 255, cv.THRESH_BINARY_INV)

    const kernelSize = Math.max(3, Math.round(Math.min(imgWidth, imgHeight) * 0.02))
    const kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(kernelSize, kernelSize))
    cv.dilate(thresh, morphed, kernel, new cv.Point(-1, -1), 1)
    cv.morphologyEx(morphed, morphed, cv.MORPH_CLOSE, kernel)

    cv.findContours(morphed, contours, hierarchy, cv.RETR_TREE, cv.CHAIN_APPROX_SIMPLE)

    for (let i = 0; i < contours.size(); ++i) {
      const cnt = contours.get(i)
      const area = cv.contourArea(cnt)
      const rect = cv.boundingRect(cnt)

      const firstChildIndex = hierarchy.data32S[i * 4 + 2] ?? -1
      const parentIndex = hierarchy.data32S[i * 4 + 3] ?? -1

      const isOuterSheetFrame =
        (rect.width >= imgWidth * 0.94 && rect.height >= imgHeight * 0.94) ||
        (firstChildIndex !== -1 && parentIndex === -1 && rect.width >= imgWidth * 0.85 && rect.height >= imgHeight * 0.85)

      if (isOuterSheetFrame || area < minArea) {
        cnt.delete()
        continue
      }

      const approx = new cv.Mat()
      const epsilon = 0.025 * cv.arcLength(cnt, true)
      cv.approxPolyDP(cnt, approx, epsilon, true)

      const rawPoints: Array<[number, number]> = []
      if (approx.rows >= 4 && approx.rows <= 12) {
        for (let j = 0; j < approx.rows; ++j) {
          const x = approx.data32S[j * 2]!
          const y = approx.data32S[j * 2 + 1]!
          const worldX = Number((((x / imgWidth) - 0.5) * sceneScale).toFixed(2))
          const worldY = Number((((1 - (y / imgHeight)) - 0.5) * sceneScale).toFixed(2))
          rawPoints.push([worldX, worldY])
        }
      } else {
        const minRect = cv.minAreaRect(cnt)
        const vertices = cv.RotatedRect.points(minRect)
        for (let j = 0; j < 4; j++) {
          const v = vertices[j]!
          const worldX = Number((((v.x / imgWidth) - 0.5) * sceneScale).toFixed(2))
          const worldY = Number((((1 - (v.y / imgHeight)) - 0.5) * sceneScale).toFixed(2))
          rawPoints.push([worldX, worldY])
        }
      }

      const orthoPoints = makeOrthogonal(rawPoints, 1.2)
      const isLShape = orthoPoints.length > 4

      results.push({
        id: `structure-${results.length}`,
        points: orthoPoints,
        isLShape,
        colorType: 'building',
        boundingBox: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
      })

      cnt.delete()
      approx.delete()
    }

    gray.delete()
    thresh.delete()
    kernel.delete()
    morphed.delete()
    contours.delete()
    hierarchy.delete()
  }

  console.log(`🎯 [Итог детекции]: Найдено точных 3D-полигонов: ${results.length}`)

  // Очистка C++ памяти
  src.delete()
  if (maskedMatToDelete) {
    maskedMatToDelete.delete()
  }
  if (segmentation) {
    disposeSegmentation(segmentation)
  }

  return results
}
