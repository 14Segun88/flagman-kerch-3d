import { NextResponse } from 'next/server'
import fs from 'node:fs'
import path from 'node:path'

const GEMINI_SYSTEM_PROMPT = `You are an expert Architectural BIM Engineer and Landscape Master Plan Vectorization AI.
Your task is to analyze the provided 2D architectural drawing, master plan, or site layout and convert EVERY building, structure, pool, terrace, and landscape zone into a precise, mathematically consistent 3D coordinate model.

CRITICAL VECTORIZATION INSTRUCTIONS:
1. DETECT ALL BUILDINGS AND STRUCTURES:
   - Identify EVERY separate building on the plan: Main house, Guest cottage, Glamping domes, Banya/SPA complex, BBQ gazebo, Carport/Parking, Sheds.
   - For each building, output its 4 exterior walls (and interior room partitions if visible).
   - For Domes / Round structures: output an 8-sided or 12-sided polygonal wall loop with roof type "dome".
   - For BBQ Gazebos: output 4 corner posts/walls with roof type "hip" or "gable".
2. DETECT ALL SITE ELEMENTS & ZONING:
   - Swimming Pool: type "pool", material "pool_water", exact 4-corner polygon (e.g. 6x4m).
   - Hot tubs: type "hot_tub", material "pool_water".
   - Wooden DPK Decking & Terraces: type "decking", material "wood_timber", exact polygon.
   - Walkways & Paths: type "pathway", material "asphalt_paver" or "ceramic_tile".
   - Parking Area: type "parking", material "asphalt_paver".
   - Lawn & Greenery: type "ground", material "grass_lawn".
3. METRIC COORDINATE SPACE:
   - Center the site around [0, 0] in meters (e.g. coordinates from -16m to +16m for a 32m site).
   - Maintain relative spatial layout and real dimensions indicated on the plan.

OUTPUT MUST BE STRICT VALID JSON ONLY (no markdown outside json).
JSON Schema:
{
  "project": {
    "name": "Project Title",
    "totalAreaSqM": 1000.0,
    "buildingCount": 5
  },
  "buildings": [
    {
      "id": "main_house",
      "name": "Основной Дом",
      "type": "residential",
      "facadeMaterial": "white_plaster",
      "wallHeight": 3.0,
      "walls": [
        { "id": "w1", "start": [0.0, -2.0], "end": [6.0, -2.0], "thickness": 0.35, "height": 3.0, "isExterior": true },
        { "id": "w2", "start": [6.0, -2.0], "end": [6.0, 4.0], "thickness": 0.35, "height": 3.0, "isExterior": true },
        { "id": "w3", "start": [6.0, 4.0], "end": [0.0, 4.0], "thickness": 0.35, "height": 3.0, "isExterior": true },
        { "id": "w4", "start": [0.0, 4.0], "end": [0.0, -2.0], "thickness": 0.35, "height": 3.0, "isExterior": true }
      ],
      "openings": [
        { "id": "d1", "wallId": "w1", "type": "door", "positionFromStart": 2.5, "width": 1.0, "height": 2.1, "sillHeight": 0.0, "label": "Вход" }
      ],
      "roof": { "type": "gable", "slopeDeg": 25.0, "overhang": 0.5, "material": "charcoal_tile" },
      "rooms": [
        { "id": "r1", "name": "Кухня-Гостиная", "type": "living", "polygon": [[0.0, -2.0], [6.0, -2.0], [6.0, 4.0], [0.0, 4.0]], "areaSqM": 36.0, "floorMaterial": "parquet" }
      ]
    }
  ],
  "siteElements": [
    { "id": "pool", "type": "pool", "polygon": [[-10.0, 2.0], [-4.0, 2.0], [-4.0, 8.0], [-10.0, 8.0]], "material": "pool_water" },
    { "id": "decking", "type": "decking", "polygon": [[-12.0, 0.0], [-2.0, 0.0], [-2.0, 10.0], [-12.0, 10.0]], "material": "wood_timber" },
    { "id": "lawn", "type": "ground", "polygon": [[-16.0, -16.0], [16.0, -16.0], [16.0, 16.0], [-16.0, 16.0]], "material": "grass_lawn" }
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
