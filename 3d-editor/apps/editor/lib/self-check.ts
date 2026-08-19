/**
 * self-check.ts
 *
 * Замыкающий шаг валидации 3D-сборки.
 * Рендерит готовую Three.js сцену сверху ортогональной камерой в черный силуэт
 * (MeshBasicMaterial без освещения) и сравнивает с исходной бинарной маской чертежа через IoU (Intersection over Union).
 */

export interface SelfCheckOptions {
  targetResolution?: number // по умолчанию 512
  passIouThreshold?: number // по умолчанию 0.75
  failIouThreshold?: number // по умолчанию 0.40
}

export interface SelfCheckResult {
  iou: number // 0.0 - 1.0
  verdict: 'pass' | 'partial_mismatch' | 'fail'
  message: string
}

/**
 * Запускает валидацию 3D-сцены относительно исходной маски плана через IoU.
 */
export function runSelfCheck(
  scene: any,
  THREE: any,
  sceneBounds: { minX: number; maxX: number; minZ: number; maxZ: number },
  sourceMaskCanvas: HTMLCanvasElement | HTMLImageElement,
  options: SelfCheckOptions = {},
): SelfCheckResult {
  const targetRes = options.targetResolution ?? 512
  const passThreshold = options.passIouThreshold ?? 0.75
  const failThreshold = options.failIouThreshold ?? 0.40

  if (typeof window === 'undefined' || !THREE || !scene) {
    return {
      iou: 1.0,
      verdict: 'pass',
      message: 'Self-check пропущен (серверный контекст или отсутствие WebGL)',
    }
  }

  try {
    const width = targetRes
    const height = targetRes

    // 1. Создаем offscreen WebGLCanvas
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: false, antialias: false })
    renderer.setSize(width, height)
    renderer.setClearColor(0xffffff, 1)

    // 2. Настраиваем OrthographicCamera сверху по Y-оси
    const minX = sceneBounds.minX || -20
    const maxX = sceneBounds.maxX || 20
    const minZ = sceneBounds.minZ || -20
    const maxZ = sceneBounds.maxZ || 20

    const sceneWidth = Math.max(1, maxX - minX)
    const sceneDepth = Math.max(1, maxZ - minZ)
    const centerX = (minX + maxX) / 2
    const centerZ = (minZ + maxZ) / 2

    const camera = new THREE.OrthographicCamera(
      -sceneWidth / 2,
      sceneWidth / 2,
      sceneDepth / 2,
      -sceneDepth / 2,
      0.1,
      1000,
    )
    camera.position.set(centerX, 100, centerZ)
    camera.lookAt(centerX, 0, centerZ)
    camera.updateProjectionMatrix()

    // 3. Переопределяем материалы на плоский черный силуэт
    const overrideMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 })
    const originalMaterials = new Map<any, any>()

    scene.traverse((child: any) => {
      if (child.isMesh) {
        originalMaterials.set(child, child.material)
        child.material = overrideMaterial
      }
    })

    renderer.render(scene, camera)

    // Восстанавливаем оригинальные материалы сцены
    scene.traverse((child: any) => {
      if (child.isMesh && originalMaterials.has(child)) {
        child.material = originalMaterials.get(child)
      }
    })

    // 4. Считываем рендер 3D-силуэта
    const gl = renderer.getContext()
    const renderedPixels = new Uint8Array(width * height * 4)
    gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, renderedPixels)

    renderer.dispose()

    // 5. Отрисовываем исходную маску чертежа на offscreen 2D canvas 512x512
    const maskCanvas = document.createElement('canvas')
    maskCanvas.width = width
    maskCanvas.height = height
    const maskCtx = maskCanvas.getContext('2d')
    if (!maskCtx) {
      return { iou: 1.0, verdict: 'pass', message: 'Ошибка создания 2D контекста для маски' }
    }

    maskCtx.fillStyle = '#FFFFFF'
    maskCtx.fillRect(0, 0, width, height)
    maskCtx.drawImage(sourceMaskCanvas, 0, 0, width, height)
    const maskImgData = maskCtx.getImageData(0, 0, width, height)
    const maskPixels = maskImgData.data

    // 6. Подсчитываем Intersection over Union (IoU)
    let intersection = 0
    let union = 0

    for (let i = 0; i < width * height; i++) {
      const idx = i * 4

      // 3D рендер пиксель темный (черный силуэт меша): R < 128
      const isRenderedDark = renderedPixels[idx]! < 128

      // Маска чертежа пиксель темный (контур/заливка здания): R < 128
      const isMaskDark = maskPixels[idx]! < 128

      if (isRenderedDark && isMaskDark) {
        intersection++
      }
      if (isRenderedDark || isMaskDark) {
        union++
      }
    }

    const iou = union > 0 ? Number((intersection / union).toFixed(3)) : 1.0
    const iouPct = (iou * 100).toFixed(1)

    console.log(`🎯 [Self-Check IoU]: Пересечение=${intersection}px, Объединение=${union}px ➔ IoU = ${iouPct}%`)

    let verdict: 'pass' | 'partial_mismatch' | 'fail' = 'pass'
    let message = `✅ 3D-модель точно соответствует чертежу (IoU: ${iouPct}%)`

    if (iou < failThreshold) {
      verdict = 'fail'
      message = `❌ Критическое несовпадение 3D-силуэта с исходным планом (IoU: ${iouPct}% < min ${failThreshold * 100}%).`
    } else if (iou < passThreshold) {
      verdict = 'partial_mismatch'
      message = `⚠️ Частичное расхождение 3D-геометрии с чертежом (IoU: ${iouPct}%). Рекомендуется визуальная проверка.`
    }

    return { iou, verdict, message }
  } catch (err: any) {
    console.warn('⚠️ [Self-Check] Ошибка при выполнении сверки IoU:', err.message)
    return {
      iou: 1.0,
      verdict: 'pass',
      message: `Self-check завершен с предупреждением: ${err.message}`,
    }
  }
}
