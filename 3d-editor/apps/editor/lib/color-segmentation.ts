/**
 * color-segmentation.ts
 *
 * Сегментация чертежей по цветовым кластерам через cv.kmeans.
 * Позволяет авто-разбивать план на слои (здание, бассейн, газон, красная линия, фон)
 * без жесткой подгонки HSV-диапазонов вручную.
 */

export type SemanticLabel =
  | 'building'
  | 'water_pool'
  | 'lawn_zone'
  | 'outline_red'
  | 'background_paper'
  | 'unknown'

export interface ColorCluster {
  clusterId: number
  color: [number, number, number] // [R, G, B] (0-255)
  pixelShare: number // 0.0 - 1.0 (процент от общего количества пикселей кадра)
  mask: any // cv.Mat (8UC1 бинарная маска текущего цветового слоя: 255/0)
}

export interface SegmentationResult {
  clusters: ColorCluster[]
}

/**
 * Кластеризует изображение по цветам через OpenCV cv.kmeans.
 * @param cv инстанс OpenCV.js
 * @param srcMat матрица кадра (8UC4 RGBA или 8UC3 RGB)
 * @param k количество кластеров (по умолчанию 6)
 */
export function segmentByColor(cv: any, srcMat: any, k = 6): SegmentationResult {
  const rows = srcMat.rows
  const cols = srcMat.cols
  const totalPixels = rows * cols

  if (totalPixels === 0) {
    return { clusters: [] }
  }

  // 1. Приводим кадр к RGB 8UC3
  const rgbMat = new cv.Mat()
  if (srcMat.type() === cv.CV_8UC4) {
    cv.cvtColor(srcMat, rgbMat, cv.COLOR_RGBA2RGB)
  } else if (srcMat.type() === cv.CV_8UC3) {
    srcMat.copyTo(rgbMat)
  } else {
    // В случае полутонового или другого формата
    cv.cvtColor(srcMat, rgbMat, cv.COLOR_GRAY2RGB)
  }

  // 2. Преобразуем (rows, cols, 3) в плоскую матрицу пикселей (rows * cols, 3) c типом CV_32F
  const floatSamples = new cv.Mat(totalPixels, 3, cv.CV_32F)
  const rgbData = rgbMat.data
  const samplesData = floatSamples.data32F

  for (let i = 0; i < totalPixels * 3; i++) {
    samplesData[i] = rgbData[i]!
  }

  // 3. Выполняем cv.kmeans
  const labels = new cv.Mat()
  const centers = new cv.Mat()
  const criteria = new cv.TermCriteria(
    cv.TERM_CRITERIA_EPS + cv.TERM_CRITERIA_MAX_ITER,
    10,
    1.0,
  )

  cv.kmeans(
    floatSamples,
    k,
    labels,
    criteria,
    3,
    cv.KMEANS_PP_CENTERS,
    centers,
  )

  // 4. Подсчитываем распределение пикселей по кластерам
  const counts = new Array<number>(k).fill(0)
  const labelsData = labels.data32S

  for (let i = 0; i < totalPixels; i++) {
    const labelIdx = labelsData[i] ?? -1
    if (labelIdx >= 0 && labelIdx < k) {
      counts[labelIdx]!++
    }
  }

  const clusters: ColorCluster[] = []

  for (let i = 0; i < k; i++) {
    const count = counts[i] || 0
    const pixelShare = count / totalPixels

    // Получаем цвет центроида [R, G, B]
    const r = Math.min(255, Math.max(0, Math.round(centers.floatAt(i, 0))))
    const g = Math.min(255, Math.max(0, Math.round(centers.floatAt(i, 1))))
    const b = Math.min(255, Math.max(0, Math.round(centers.floatAt(i, 2))))
    const color: [number, number, number] = [r, g, b]

    // Бинарная маска данного кластера (8UC1): 255 где метка == i, иначе 0
    const mask = new cv.Mat(rows, cols, cv.CV_8UC1)
    const maskData = mask.data
    for (let p = 0; p < totalPixels; p++) {
      maskData[p] = labelsData[p] === i ? 255 : 0
    }

    clusters.push({
      clusterId: i + 1,
      color,
      pixelShare,
      mask,
    })
  }

  // Очистка промежуточных C++ матриц
  rgbMat.delete()
  floatSamples.delete()
  labels.delete()
  centers.delete()

  // Сортируем кластеры по убыванию их площади на кадре
  clusters.sort((a, b) => b.pixelShare - a.pixelShare)

  return { clusters }
}

/**
 * Преобразует RGB в HSV (H: 0-360, S: 0-1, V: 0-1).
 */
function rgbToHsv(r: number, g: number, b: number): { h: number; s: number; v: number } {
  const rNorm = r / 255
  const gNorm = g / 255
  const bNorm = b / 255

  const max = Math.max(rNorm, gNorm, bNorm)
  const min = Math.min(rNorm, gNorm, bNorm)
  const delta = max - min

  const v = max
  const s = max === 0 ? 0 : delta / max
  let h = 0

  if (delta !== 0) {
    if (max === rNorm) {
      h = ((gNorm - bNorm) / delta) % 6
    } else if (max === gNorm) {
      h = (bNorm - rNorm) / delta + 2
    } else {
      h = (rNorm - gNorm) / delta + 4
    }
    h = Math.round(h * 60)
    if (h < 0) h += 360
  }

  return { h, s, v }
}

/**
 * Оценивает цвет кластера и возвращает первичную семантическую гипотезу.
 */
export function guessSemanticLabel(
  color: [number, number, number],
  pixelShare: number,
): SemanticLabel {
  const [r, g, b] = color
  const { h, s, v } = rgbToHsv(r, g, b)

  // 1. Белая / светлая бумага фона листа
  if ((v > 0.88 && s < 0.15) || (pixelShare > 0.35 && v > 0.82 && s < 0.20)) {
    return 'background_paper'
  }

  // 2. Красный контур участка (красная обводка)
  if ((h <= 25 || h >= 335) && s > 0.35 && v > 0.3) {
    return 'outline_red'
  }

  // 3. Бассейн / Вода (голубая/синяя заливка)
  if (h >= 170 && h <= 250 && s > 0.25 && v > 0.3) {
    return 'water_pool'
  }

  // 4. Газон / Зеленая насаждаемая зона
  if (h >= 70 && h <= 165 && s > 0.20 && v > 0.25) {
    return 'lawn_zone'
  }

  // 5. Здание / Контур постройки (серый, темно-серый, серпистый, бежево-коричневый)
  if ((s < 0.25 && v >= 0.15 && v <= 0.82) || (h >= 15 && h <= 50 && s >= 0.15 && s <= 0.65 && v >= 0.25 && v <= 0.75)) {
    return 'building'
  }

  // Все сомнительные случаи отдаются под VLM-классификацию
  return 'unknown'
}

/**
 * Освобождает C++ память всех созданных масок кластеров.
 */
export function disposeSegmentation(segmentation: SegmentationResult): void {
  if (!segmentation || !segmentation.clusters) return

  for (const cluster of segmentation.clusters) {
    if (cluster.mask && typeof cluster.mask.delete === 'function') {
      try {
        cluster.mask.delete()
      } catch (_e) {
        // Уже удалена
      }
    }
  }
}
