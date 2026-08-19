/**
 * vlm-candidate-classifier.ts
 *
 * Модуль VLM-классификации кропов контуров кандидата.
 * Вместо того чтобы просить VLM генерировать 2D bounding box по всему чертежу,
 * OpenCV находить геометрические контуры кандидатов, а VLM выполняет узкую
 * и детерминированную задачу: классификацию вырезанного фрагмента (кропа).
 */

export interface BoundingBox {
  x: number
  y: number
  width: number
  height: number
}

export interface CandidateCrop {
  id: number
  imageBase64: string
  bbox: BoundingBox
}

export type CandidateCategory =
  | 'building'
  | 'swimming_pool'
  | 'lawn_zone'
  | 'furniture'
  | 'text_legend'
  | 'unknown'

export interface CandidateClassification {
  id: number
  category: CandidateCategory
  confidence: number // 0.0 - 1.0
  reason: string
  isBuildable: boolean
  bbox: BoundingBox
}

export interface ClassificationFilterResult {
  buildable: CandidateClassification[]
  rejected: CandidateClassification[]
}

export const CLASSIFICATION_PROMPT = `Analyze this cropped image patch from an architectural site plan / blueprint.
Classify what object or area this image contains into EXACTLY ONE of the following categories:
1. "building" - A house, main residential building, shed, garage, or architectural structure.
2. "swimming_pool" - A swimming pool, artificial pond, or outdoor water feature.
3. "lawn_zone" - Lawn, garden, vegetation, grass, or outdoor landscape zone.
4. "furniture" - Interior furniture, tables, chairs, beds, sanitary fixtures, or small equipment.
5. "text_legend" - Text labels, dimension lines, legend tables, title block, numbers, or text captions.
6. "unknown" - Unclear, noise, or unidentifiable fragment.

Reply ONLY with a valid raw JSON object matching this schema:
{
  "category": "building" | "swimming_pool" | "lawn_zone" | "furniture" | "text_legend" | "unknown",
  "confidence": 0.95,
  "reason": "Brief one-sentence explanation"
}`

/**
 * Вырезает кроп кандидата из исходного HTMLCanvasElement / HTMLImageElement с отступом (padding).
 */
export function cropCandidate(
  sourceCanvas: HTMLCanvasElement | HTMLImageElement,
  candidateId: number,
  boundingBox: BoundingBox,
  padding = 10,
): CandidateCrop {
  if (typeof window === 'undefined') {
    return {
      id: candidateId,
      imageBase64: '',
      bbox: boundingBox,
    }
  }

  const srcWidth = (sourceCanvas as any).naturalWidth || (sourceCanvas as any).width || 800
  const srcHeight = (sourceCanvas as any).naturalHeight || (sourceCanvas as any).height || 600

  const x0 = Math.max(0, boundingBox.x - padding)
  const y0 = Math.max(0, boundingBox.y - padding)
  const x1 = Math.min(srcWidth, boundingBox.x + boundingBox.width + padding)
  const y1 = Math.min(srcHeight, boundingBox.y + boundingBox.height + padding)

  const cropW = Math.max(1, x1 - x0)
  const cropH = Math.max(1, y1 - y0)

  const canvas = document.createElement('canvas')
  canvas.width = cropW
  canvas.height = cropH
  const ctx = canvas.getContext('2d')

  if (ctx) {
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, cropW, cropH)
    ctx.drawImage(sourceCanvas, x0, y0, cropW, cropH, 0, 0, cropW, cropH)
  }

  const imageBase64 = canvas.toDataURL('image/png')

  return {
    id: candidateId,
    imageBase64,
    bbox: boundingBox,
  }
}

/**
 * Отправляет кроп на эндпоинт VLM-классификации (/api/nim-vision-classify).
 */
async function classifySingleCrop(crop: CandidateCrop): Promise<CandidateClassification> {
  if (!crop.imageBase64) {
    return {
      id: crop.id,
      category: 'unknown',
      confidence: 0.5,
      reason: 'Пустой кроп изображения',
      isBuildable: true,
      bbox: crop.bbox,
    }
  }

  try {
    const res = await fetch('/api/nim-vision-classify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: CLASSIFICATION_PROMPT,
        imageBase64: crop.imageBase64,
        maxTokens: 200,
      }),
    })

    if (!res.ok) {
      console.warn(`⚠️ VLM API error HTTP ${res.status} for crop #${crop.id}`)
      return {
        id: crop.id,
        category: 'unknown',
        confidence: 0.5,
        reason: `VLM API error ${res.status}`,
        isBuildable: true,
        bbox: crop.bbox,
      }
    }

    const data = await res.json()
    const rawText = data.text || ''
    const jsonMatch = rawText.match(/\{[\s\S]*\}/)

    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      const category: CandidateCategory = parsed.category || 'unknown'
      const confidence = typeof parsed.confidence === 'number' ? parsed.confidence : 0.8
      const reason = parsed.reason || 'Классификация VLM'

      const isBuildable =
        category === 'building' ||
        category === 'swimming_pool' ||
        category === 'lawn_zone' ||
        category === 'unknown'

      return {
        id: crop.id,
        category,
        confidence,
        reason,
        isBuildable,
        bbox: crop.bbox,
      }
    }

    return {
      id: crop.id,
      category: 'unknown',
      confidence: 0.5,
      reason: 'VLM не вернул валидный JSON',
      isBuildable: true,
      bbox: crop.bbox,
    }
  } catch (err: any) {
    console.warn(`⚠️ VLM Classification exception for crop #${crop.id}:`, err.message)
    return {
      id: crop.id,
      category: 'unknown',
      confidence: 0.5,
      reason: `Сбой сети: ${err.message}`,
      isBuildable: true,
      bbox: crop.bbox,
    }
  }
}

/**
 * Параллельная классификация массива кропов с ограничением concurrency.
 */
export async function classifyCandidates(
  crops: CandidateCrop[],
  options: { concurrency?: number } = {},
): Promise<CandidateClassification[]> {
  const concurrency = options.concurrency ?? 2
  const results: CandidateClassification[] = new Array(crops.length)

  console.log(`🤖 [VLM Classifier] Запуск параллельной VLM-классификации ${crops.length} кропов (concurrency=${concurrency})...`)

  for (let i = 0; i < crops.length; i += concurrency) {
    const chunk = crops.slice(i, i + concurrency)
    const promises = chunk.map((crop) => classifySingleCrop(crop))
    const chunkResults = await Promise.all(promises)

    chunkResults.forEach((res, idx) => {
      results[i + idx] = res
    })

    if (i + concurrency < crops.length) {
      await new Promise((resolve) => setTimeout(resolve, 250))
    }
  }

  return results
}

/**
 * Разделяет результаты классификации на buildable (строящиеся объекты) и rejected (мебель, надписи, шум).
 */
export function filterBuildableCandidates(
  classifications: CandidateClassification[],
): ClassificationFilterResult {
  const buildable: CandidateClassification[] = []
  const rejected: CandidateClassification[] = []

  for (const item of classifications) {
    if (item.category === 'furniture') {
      rejected.push({
        ...item,
        reason: item.reason || 'Отклонено: мебель / мелкое оборудование',
      })
    } else if (item.category === 'text_legend') {
      rejected.push({
        ...item,
        reason: item.reason || 'Отклонено: легенда / надписи чертежа',
      })
    } else {
      buildable.push(item)
    }
  }

  return { buildable, rejected }
}
