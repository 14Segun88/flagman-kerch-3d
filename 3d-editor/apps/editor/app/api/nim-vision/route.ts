import { NextResponse } from 'next/server'

function convertBoxesTo3dGeometry(
  objects: any[],
  siteWidthM = 35.0,
  siteDepthM = 35.0,
  imgWidth = 624,
  imgHeight = 752,
) {
  const walls: any[] = []
  const rooms: any[] = []

  const aspectRatio = imgWidth / imgHeight

  for (const obj of objects) {
    if (!obj || !obj.box_2d || !Array.isArray(obj.box_2d) || obj.box_2d.length !== 4) continue

    let [yminNorm, xminNorm, ymaxNorm, xmaxNorm] = obj.box_2d.map(Number)
    const label = obj.label || obj.name || obj.type || 'building'

    // 1. Ограничиваем координаты от 50 до 950, чтобы точки не улетали в бесконечность по краям кадра
    yminNorm = Math.max(50, Math.min(950, yminNorm))
    ymaxNorm = Math.max(50, Math.min(950, ymaxNorm))
    xminNorm = Math.max(50, Math.min(950, xminNorm))
    xmaxNorm = Math.max(50, Math.min(950, xmaxNorm))

    if (xmaxNorm - xminNorm < 30 || ymaxNorm - yminNorm < 30) continue

    // 2. Нормализация по оси X с учетом соотношения сторон
    const xmin = Number(((((xminNorm / 1000) - 0.5) * siteWidthM * aspectRatio)).toFixed(2))
    const xmax = Number(((((xmaxNorm / 1000) - 0.5) * siteWidthM * aspectRatio)).toFixed(2))

    // 3. ИНВЕРСИЯ по оси Y (1000 - y), чтобы верх картинки совпал с верхом 3D сцены
    const zmin = Number(((((1000 - ymaxNorm) / 1000 - 0.5) * siteDepthM)).toFixed(2))
    const zmax = Number(((((1000 - yminNorm) / 1000 - 0.5) * siteDepthM)).toFixed(2))

    if (label === 'swimming_pool' || label === 'Бассейн' || label === 'pool' || obj.type === 'pool') {
      // Бассейн не должен строить внешние стены, создаем только логическую зону (воды/плитки)
      rooms.push({
        name: obj.name || 'Бассейн',
        type: 'water_pool',
        bounds: [xmin, zmin, xmax, zmax],
        polygon: [[xmin, zmin], [xmax, zmin], [xmax, zmax], [xmin, zmax]],
        approximateAreaSqM: Number(Math.abs((xmax - xmin) * (zmax - zmin)).toFixed(1)),
      })
    } else {
      // Здания превращаем в 4 внешние стены
      const height = label === 'shed' || label === 'utility' ? 2.4 : 3.0
      const thickness = 0.3

      walls.push(
        { start: [xmin, zmin], end: [xmax, zmin], thickness, height, type: label },
        { start: [xmax, zmin], end: [xmax, zmax], thickness, height, type: label },
        { start: [xmax, zmax], end: [xmin, zmax], thickness, height, type: label },
        { start: [xmin, zmax], end: [xmin, zmin], thickness, height, type: label },
      )

      rooms.push({
        name: obj.name || (label === 'main_house' ? 'Основное здание' : label),
        type: 'building',
        bounds: [xmin, zmin, xmax, zmax],
        polygon: [[xmin, zmin], [xmax, zmin], [xmax, zmax], [xmin, zmax]],
        approximateAreaSqM: Number(Math.abs((xmax - xmin) * (zmax - zmin)).toFixed(1)),
      })
    }
  }

  return { walls, rooms }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const imageBase64 = body.imageBase64 || body.image

    if (!imageBase64) {
      return NextResponse.json({ success: false, error: 'imageBase64 is missing' }, { status: 400 })
    }

    const formattedBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '')

    const nvidiaApiKey = process.env.NVIDIA_API_KEY || process.env.NIM_API_KEY || process.env.NVIDIA_NIM_API_KEY

    const modelsToTry = [
      'meta/llama-3.2-11b-vision-instruct',
      process.env.NVIDIA_NIM_VISION_MODEL || 'meta/llama-3.2-90b-vision-instruct',
    ]

    let response: Response | null = null
    let activeModel = modelsToTry[0]!

    for (const modelCandidate of modelsToTry) {
      activeModel = modelCandidate
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 45000)

        const res = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
          method: 'POST',
          signal: controller.signal,
          headers: {
            Authorization: `Bearer ${nvidiaApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: activeModel,
            messages: [
              {
                role: 'system',
                content: 'You are an expert site plan blueprint parser. You MUST reply ONLY with a valid JSON object starting with {. Do NOT write markdown syntax, explanations, or introductory text.',
              },
              {
                role: 'user',
                content: [
                  {
                    type: 'text',
                    text: `You are an expert site plan blueprint parser.
Locate all buildings, houses, pools, or structures on this image.
For each structure, return bounding box coordinates as INTEGER VALUES from 0 to 1000 [ymin, xmin, ymax, xmax].

Rules:
1. Do NOT use floats like 0.5 or 1.0. Use exact integer pixels on a 0..1000 grid (e.g. [150, 230, 420, 680]).
2. Output ONLY raw JSON matching this format:
{
  "objects": [
    { "name": "house", "type": "building", "box_2d": [ymin, xmin, ymax, xmax] }
  ]
}`,
                  },
                  {
                    type: 'image_url',
                    image_url: {
                      url: `data:image/png;base64,${formattedBase64}`,
                    },
                  },
                ],
              },
            ],
            temperature: 0.1,
            max_tokens: 1024,
          }),
        })
        clearTimeout(timeoutId)
        if (res.ok) {
          response = res
          break
        } else {
          console.warn(`⚠️ Model ${activeModel} failed with HTTP ${res.status}, trying fallback...`)
        }
      } catch (err: any) {
        console.warn(`⚠️ Model ${activeModel} request error/timeout: ${err.message}, trying fallback...`)
      }
    }

    if (!response || !response.ok) {
      const errorText = response ? await response.text() : 'No response from VLM models'
      console.error('❌ NVIDIA API Error response:', errorText)
      return NextResponse.json({ success: false, error: `NVIDIA API Error: ${errorText}` }, { status: response?.status || 500 })
    }

    const data = await response.json()
    const rawContent = data.choices?.[0]?.message?.content || ''

    console.log('🚨 RAW OUTPUT FROM NVIDIA API:', rawContent)

    let parsedObjects: any[] = []

    const jsonMatch = rawContent.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      try {
        const parsedData = JSON.parse(jsonMatch[0])
        if (parsedData.objects && Array.isArray(parsedData.objects)) {
          parsedObjects = parsedData.objects
        }
      } catch (e) {
        console.warn('⚠️ Standard JSON parse failed, trying fallback regex parser:', e)
      }
    }

    // Fallback parser if free-text bullet points with boxes are returned
    if (parsedObjects.length === 0) {
      const boxMatches = [...rawContent.matchAll(/\[\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\]/g)]
      for (let i = 0; i < boxMatches.length; i++) {
        const match = boxMatches[i]
        if (match) {
          const box_2d = [Number(match[1]), Number(match[2]), Number(match[3]), Number(match[4])]
          parsedObjects.push({
            name: `structure_${i + 1}`,
            type: 'building',
            box_2d,
          })
        }
      }
    }

    if (parsedObjects.length === 0) {
      console.warn('⚠️ No structures detected in image by VLM, returning empty scene')
      return NextResponse.json({
        success: true,
        modelUsed: activeModel,
        pipeline: 'dynamic-vlm-parser',
        objects: [],
        data: { walls: [], rooms: [] },
      })
    }

    const converted = convertBoxesTo3dGeometry(parsedObjects)

    return NextResponse.json({
      success: true,
      modelUsed: activeModel,
      pipeline: 'dynamic-vlm-parser',
      objects: parsedObjects,
      data: converted,
    })
  } catch (error: any) {
    console.error('❌ API Router Error:', error.message)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
