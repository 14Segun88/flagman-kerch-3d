import { NextResponse } from 'next/server'
import fs from 'node:fs'
import path from 'node:path'

const GEMINI_SYSTEM_PROMPT = `You are an expert Architectural BIM Engineer and 2D-to-3D Floorplan Vectorization AI.
Your task is to analyze the provided 2D floorplan drawing, sketch, or site master plan and convert it into a precise, mathematically consistent, topological JSON structure for direct 3D modeling.

CRITICAL RULES:
1. Real metric units (m). Center around [0, 0].
2. Load-bearing exterior walls: thickness 0.30 - 0.35m. Partitions: 0.12 - 0.15m.
3. Ceiling/wall height: 2.80 - 3.00m.
4. Openings: doors and windows with sillHeight and widths.
5. Roofs: "gable", "hip", "shed", slope 25-35 deg.
6. Materials: "white_plaster", "wood_timber", "red_brick", "dark_wood", "charcoal_tile", "pool_water", "grass_lawn".

OUTPUT MUST BE VALID JSON ONLY (no markdown outside JSON).
JSON Format:
{
  "project": { "name": "House Project", "totalAreaSqM": 120.0 },
  "buildings": [
    {
      "id": "main_house",
      "name": "Основной Дом",
      "facadeMaterial": "white_plaster",
      "wallHeight": 3.0,
      "walls": [
        { "id": "w1", "start": [-5.0, -4.0], "end": [5.0, -4.0], "thickness": 0.35, "height": 3.0, "isExterior": true },
        { "id": "w2", "start": [5.0, -4.0], "end": [5.0, 4.0], "thickness": 0.35, "height": 3.0, "isExterior": true },
        { "id": "w3", "start": [5.0, 4.0], "end": [-5.0, 4.0], "thickness": 0.35, "height": 3.0, "isExterior": true },
        { "id": "w4", "start": [-5.0, 4.0], "end": [-5.0, -4.0], "thickness": 0.35, "height": 3.0, "isExterior": true }
      ],
      "openings": [
        { "id": "d1", "wallId": "w1", "type": "door", "positionFromStart": 2.0, "width": 1.0, "height": 2.1, "sillHeight": 0.0, "label": "Входная дверь" },
        { "id": "win1", "wallId": "w2", "type": "window", "positionFromStart": 2.0, "width": 1.6, "height": 1.5, "sillHeight": 0.9, "label": "Окно гостиной" }
      ],
      "roof": { "type": "gable", "slopeDeg": 25.0, "overhang": 0.5, "material": "charcoal_tile" },
      "rooms": [
        { "id": "r1", "name": "Гостиная-Кухня", "type": "living", "polygon": [[-5.0, -4.0], [5.0, -4.0], [5.0, 4.0], [-5.0, 4.0]], "areaSqM": 80.0, "floorMaterial": "parquet" }
      ]
    }
  ],
  "siteElements": [
    { "id": "lawn", "type": "ground", "polygon": [[-12.0, -12.0], [12.0, -12.0], [12.0, 12.0], [-12.0, 12.0]], "material": "grass_lawn" }
  ]
}
`

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const rawImage = body.imageBase64 || body.image
    const clientApiKey = body.apiKey

    if (!rawImage) {
      return NextResponse.json({ success: false, error: 'imageBase64 is missing' }, { status: 400 })
    }

    let formattedBase64 = rawImage.replace(/^data:image\/\w+;base64,/, '')
    let mimeType = 'image/jpeg'

    // Handle local preset URL paths like "/assets/cottage.jpg" or "/assets/master_estate.jpg"
    if (typeof rawImage === 'string' && (rawImage.startsWith('/') || rawImage.startsWith('http'))) {
      const rootDir = path.resolve(process.cwd(), '../..')
      const publicPath = path.join(rootDir, 'public', rawImage.replace(/^\//, ''))
      const rootAssetPath = path.join(rootDir, rawImage.replace(/^\//, ''))
      const targetFile = fs.existsSync(publicPath) ? publicPath : fs.existsSync(rootAssetPath) ? rootAssetPath : null

      if (targetFile) {
        const fileBuffer = fs.readFileSync(targetFile)
        formattedBase64 = fileBuffer.toString('base64')
        if (targetFile.endsWith('.png')) mimeType = 'image/png'
      } else {
        // Fallback sample 1x1 base64 if sample asset is a placeholder
        formattedBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
        mimeType = 'image/png'
      }
    }

    const apiKey = clientApiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY

    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error: 'GEMINI_API_KEY is not configured. Please provide your Google AI Studio API key.',
        },
        { status: 401 },
      )
    }

    const modelName = body.model || 'gemini-3.6-flash'
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`

    console.log(`🔮 [Gemini API] Requesting ${modelName} for 2D-to-3D vectorization...`)

    const payload = {
      system_instruction: {
        parts: [{ text: GEMINI_SYSTEM_PROMPT }],
      },
      contents: [
        {
          parts: [
            {
              text: 'Analyze this 2D architectural drawing/sketch and vectorize it into exact 3D coordinates (walls, thickness, openings, rooms, roof, columns, site elements) according to the schema.',
            },
            {
              inline_data: {
                mime_type: mimeType,
                data: formattedBase64,
              },
            },
          ],
        },
      ],
      generationConfig: {
        response_mime_type: 'application/json',
        temperature: 0.1,
      },
    }

    const geminiRes = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!geminiRes.ok) {
      const errText = await geminiRes.text()
      console.error(`❌ [Gemini API Error ${geminiRes.status}]:`, errText)
      return NextResponse.json(
        { success: false, error: `Gemini API returned ${geminiRes.status}: ${errText}` },
        { status: geminiRes.status },
      )
    }

    const resJson = await geminiRes.json()
    const rawText = resJson?.candidates?.[0]?.content?.parts?.[0]?.text

    if (!rawText) {
      return NextResponse.json({ success: false, error: 'Empty response from Gemini Vision' }, { status: 500 })
    }

    const parsedData = JSON.parse(rawText)
    return NextResponse.json({ success: true, data: parsedData, model: modelName })
  } catch (error: any) {
    console.error('❌ [Gemini Vision Exception]:', error)
    return NextResponse.json({ success: false, error: error.message || 'Internal error' }, { status: 500 })
  }
}
