/**
 * connectivity-filter.ts
 *
 * Топологический фильтр связности кандидатов.
 * Считает расстояние между bbox всех кандидатов (bboxDistance).
 * Если контур не касается ни одного соседа и не примыкает к краю кадра,
 * он помечается likelyIsolated: true.
 * Это быстрый геометрический расчет (без сетевых запросов), используемый как предфильтр.
 */

import type { CandidateClassification } from './vlm-candidate-classifier'

export interface CandidateBbox {
  id: number
  x: number
  y: number
  width: number
  height: number
}

export interface ConnectivityResult {
  id: number
  neighborCount: number
  isFrameBorder: boolean
  minNeighborDistance: number
  likelyIsolated: boolean
}

export interface ReconciledResult {
  buildable: CandidateClassification[]
  log: string[]
}

/**
 * Вычисляет кратчайшее евклидово расстояние между двумя выровненными bounding box (AABB).
 */
export function bboxDistance(b1: CandidateBbox, b2: CandidateBbox): number {
  const dx = Math.max(0, b1.x - (b2.x + b2.width), b2.x - (b1.x + b1.width))
  const dy = Math.max(0, b1.y - (b2.y + b2.height), b2.y - (b1.y + b1.height))
  return Math.sqrt(dx * dx + dy * dy)
}

/**
 * Анализирует топологическую связность кандидатов.
 * @param candidates массив bbox кандидатов
 * @param frameWidth ширина изображения кадра в пикселях
 * @param frameHeight высота изображения кадра в пикселях
 * @param distanceThreshold порог расстояния для счета "соседями" (по умолчанию 15px)
 */
export function analyzeConnectivity(
  candidates: CandidateBbox[],
  frameWidth: number,
  frameHeight: number,
  distanceThreshold = 15,
): ConnectivityResult[] {
  const results: ConnectivityResult[] = []

  for (let i = 0; i < candidates.length; i++) {
    const c1 = candidates[i]!

    // Проверка примыкания к краю листа (A4/A3 рамки кадра)
    const isFrameBorder =
      c1.x <= 20 ||
      c1.y <= 20 ||
      c1.x + c1.width >= frameWidth - 20 ||
      c1.y + c1.height >= frameHeight - 20

    let neighborCount = 0
    let minNeighborDistance = Infinity

    for (let j = 0; j < candidates.length; j++) {
      if (i === j) continue
      const c2 = candidates[j]!
      const dist = bboxDistance(c1, c2)
      if (dist < minNeighborDistance) {
        minNeighborDistance = dist
      }
      if (dist <= distanceThreshold) {
        neighborCount++
      }
    }

    if (minNeighborDistance === Infinity) {
      minNeighborDistance = 0
    }

    const likelyIsolated = neighborCount === 0 && !isFrameBorder

    results.push({
      id: c1.id,
      neighborCount,
      isFrameBorder,
      minNeighborDistance: Number(minNeighborDistance.toFixed(1)),
      likelyIsolated,
    })
  }

  return results
}

/**
 * Сводит воедино топологический анализ и результаты VLM-классификации.
 */
export function reconcileWithClassification(
  connectivity: ConnectivityResult[],
  classifications: CandidateClassification[],
): ReconciledResult {
  const buildable: CandidateClassification[] = []
  const log: string[] = []

  const connMap = new Map(connectivity.map((c) => [c.id, c]))

  for (const item of classifications) {
    const conn = connMap.get(item.id)

    if (item.category === 'furniture') {
      log.push(`❌ #${item.id} — Отклонено VLM: мебель / сантехника (${item.reason})`)
      continue
    }

    if (item.category === 'text_legend') {
      log.push(`❌ #${item.id} — Отклонено VLM: элемент легенды / текст (${item.reason})`)
      continue
    }

    if (conn && conn.likelyIsolated) {
      log.push(
        `🔗 [Connectivity Alert] #${item.id} (${item.category}): изолированный контур без соседей (${conn.minNeighborDistance}px). ` +
          `Возможно отдельно стоящее здание (баня/беседка/гараж) — строим 3D.`,
      )
    } else if (conn) {
      log.push(`✅ #${item.id} (${item.category}): подсоединен к ${conn.neighborCount} соседям.`)
    }

    buildable.push(item)
  }

  return { buildable, log }
}
