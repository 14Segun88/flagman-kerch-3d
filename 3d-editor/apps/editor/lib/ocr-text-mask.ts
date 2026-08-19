/**
 * ocr-text-mask.ts
 *
 * Пре-процессинг шаг для free-cv-parser.ts.
 * Задача: найти все текстовые области на чертеже (легенда, номера комнат,
 * размерные линии, подписи площади) через Tesseract.js и закрасить их
 * ДО вызова cv.findContours(), чтобы буквы/цифры не порождали ложных
 * мелких контуров (в логах это были кандидаты вида 25px², 49px² и т.д.)
 *
 * Устанавливается один раз:
 *   npm install tesseract.js
 */

import { createWorker, type Worker, type RecognizeResult } from 'tesseract.js'

export interface TextRegion {
  text: string
  confidence: number
  bbox: { x0: number; y0: number; x1: number; y1: number }
}

export interface OcrMaskResult {
  maskedMat: any // cv.Mat с закрашенными текстовыми зонами
  regions: TextRegion[]
}

let workerPromise: Promise<Worker> | null = null

/**
 * Ленивая инициализация Tesseract worker — переиспользуется между вызовами,
 * чтобы не грузить WASM-модель заново на каждый чертёж.
 */
function getWorker(): Promise<Worker> {
  if (!workerPromise) {
    workerPromise = (async () => {
      const worker = await createWorker(['eng', 'rus'])
      // PSM 11 = "sparse text" — хорошо подходит для чертежей,
      // где текст разбросан мелкими фрагментами, а не абзацами
      await worker.setParameters({
        tessedit_pageseg_mode: '11' as any,
      })
      return worker
    })()
  }
  return workerPromise
}

/**
 * Находит все текстовые области на изображении.
 * @param canvas исходный canvas/image, из которого cv.imread() читает src.cols/rows
 * @param minConfidence отсекает шумные ложные срабатывания OCR (по умолчанию 40%)
 */
export async function detectTextRegions(
  canvas: HTMLCanvasElement | HTMLImageElement,
  minConfidence = 40,
): Promise<TextRegion[]> {
  const worker = await getWorker()
  const result: RecognizeResult = await worker.recognize(canvas)

  const regions: TextRegion[] = []
  const words: Array<{ confidence: number; text: string; bbox: { x0: number; y0: number; x1: number; y1: number } }> =
    (result.data as any).words ?? []

  // Идём на уровне "words", а не "lines" — на чертежах текст обычно
  // короткие обрывки ("36.00", "м²", "Санузел"), а не связные строки
  for (const word of words) {
    if (word.confidence >= minConfidence && word.text.trim().length > 0) {
      regions.push({
        text: word.text,
        confidence: word.confidence,
        bbox: {
          x0: word.bbox.x0,
          y0: word.bbox.y0,
          x1: word.bbox.x1,
          y1: word.bbox.y1,
        },
      })
    }
  }

  return regions
}

/**
 * Основная функция: принимает уже загруженную в OpenCV матрицу (cv.Mat)
 * и canvas того же изображения, возвращает копию матрицы с закрашенными
 * текстовыми зонами + список найденных регионов (полезно для дебаг-лога,
 * в духе вашего [OpenCV Diagnostic]).
 *
 * Вызывать ПЕРЕД threshold/morphologyEx/findContours в free-cv-parser.ts.
 */
export async function maskTextRegions(
  cv: any,
  srcMat: any,
  sourceCanvas: HTMLCanvasElement | HTMLImageElement,
  options: { padding?: number; fillColor?: [number, number, number, number] } = {},
): Promise<OcrMaskResult> {
  const padding = options.padding ?? 3 // небольшой запас вокруг текста —
  // OCR bbox часто чуть теснее реальных пикселей символа
  const fillColor = options.fillColor ?? [255, 255, 255, 255] // закрашиваем
  // белым (фон листа), а не чёрным — иначе текст сам станет "контуром"

  const regions = await detectTextRegions(sourceCanvas)

  const maskedMat = srcMat.clone()

  for (const region of regions) {
    const { x0, y0, x1, y1 } = region.bbox
    const pt1 = new cv.Point(
      Math.max(0, x0 - padding),
      Math.max(0, y0 - padding),
    )
    const pt2 = new cv.Point(
      Math.min(maskedMat.cols, x1 + padding),
      Math.min(maskedMat.rows, y1 + padding),
    )
    cv.rectangle(
      maskedMat,
      pt1,
      pt2,
      new cv.Scalar(...fillColor),
      -1, // filled
    )
  }

  return { maskedMat, regions }
}

/**
 * Вызывать при размонтировании компонента / завершении работы с редактором,
 * чтобы освободить WASM worker.
 */
export async function terminateOcrWorker(): Promise<void> {
  if (workerPromise) {
    const worker = await workerPromise
    await worker.terminate()
    workerPromise = null
  }
}
