import { NextResponse } from 'next/server'

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
    const imageBase64 = body.imageBase64 || body.image
    const clientApiKey = body.apiKey

    if (!imageBase64) {
      return NextResponse.json({ success: false, error: 'imageBase64 is missing' }, { status: 400 })
    }

    const formattedBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '')
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
                mime_type: 'image/jpeg',
                data: formattedBase64,
              },
            },
          ],
        },
      ],
      generationConfig: {
        response_mime_type: 'application/json',
        temperature: 0.1,
        maxOutputTokens: 8192,
      },
    }

    console.log(`🔮 [Gemini API] Requesting ${modelName} for 2D-to-3D vectorization...`)

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const errText = await res.text()
      console.error(`❌ [Gemini API Error ${res.status}]:`, errText)
      return NextResponse.json(
        { success: false, error: `Google AI Studio Error (${res.status}): ${errText}` },
        { status: res.status },
      )
    }

    const resData = await res.json()
    const candidates = resData.candidates || []
    if (candidates.length === 0) {
      return NextResponse.json({ success: false, error: 'No response candidates from Gemini' }, { status: 500 })
    }

    const rawText = candidates[0]?.content?.parts?.[0]?.text || '{}'
    const parsedJson = JSON.parse(rawText)

    console.log('✅ [Gemini API] Successfully vectorized 2D drawing!')
    return NextResponse.json({
      success: true,
      data: parsedJson,
      source: 'google_ai_studio_gemini',
      model: modelName,
    })
  } catch (error: any) {
    console.error('❌ [Gemini API Exception]:', error)
    return NextResponse.json({ success: false, error: error.message || 'Internal error' }, { status: 500 })
  }
}
