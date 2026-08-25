import { NextResponse } from 'next/server'
import fs from 'node:fs'
import path from 'node:path'

const GEMINI_SYSTEM_PROMPT = `You are an expert Architectural BIM Engineer and Landscape Master Plan Vectorization AI.
Your task is to analyze the provided 2D architectural drawing, master plan, or site layout and convert EVERY building, structure, carport, shed, pool, terrace, and landscape zone into a precise 3D coordinate model with DYNAMIC per-project Co-Pilot decisions.

CRITICAL VECTORIZATION INSTRUCTIONS:
1. DETECT ALL BUILDINGS AND STRUCTURES:
   - Identify EVERY separate building on the plan:
     * L-Shaped or rectangular Main House / Villa (extract exterior walls + all visible interior rooms, bathrooms, bedrooms, living, kitchen).
     * Carport (e.g. 6x6m open posts + roof).
     * Utility Shed / Workshop (e.g. 3x5m).
     * BBQ Gazebo / Pergola (e.g. 5x5m).
     * Domes / Round structures / Banya / Sauna.
   - For each building, output its exterior walls loop and interior partitions.
2. DETECT ALL SITE ELEMENTS & ZONING:
   - Driveway & Parking: type "parking" or "pavers" (e.g. брусчатка).
   - Walkways & Paths: type "pathway", material "asphalt_paver" or "gravel".
   - Terraces & Decks: type "decking", material "wood_timber".
   - Fire Pit (Зона костра): type "fire_pit", material "stone".
   - Swimming Pool: type "pool", material "pool_water".
   - Lawn & Greenery: type "ground", material "grass_lawn".
3. EXTRACT SITE METRICS:
   - If boundary dimensions are indicated (e.g. 25m x 32m = 800 sq.m), set siteDimensions [25, 32] and siteAreaSqM 800.
   - Extract street name / address (e.g. "ул. Черноморская") if visible.
4. GENERATE 4 DYNAMIC CO-PILOT DECISIONS TAILORED TO THIS SPECIFIC SITE:
   - Dynamically create 3-4 decision cards specifically asking questions about the actual objects present on THIS drawing:
     * e.g., if Carport is present: ask about carport canopy material (smoky monolithic polycarbonate vs seam metal).
     * e.g., if Fire Pit / BBQ is present: ask about fire pit masonry (fireclay шамот vs basalt natural stone).
     * e.g., if Hedges (Tuya, Barberry, Dogwood) are marked: ask about hedge composition (Thuja Smaragd vs Dogwood/Barberry mixed border).
     * e.g., if Pavers/Driveway is marked: ask about paving type (Granite cobbles vs Vibropressed "Old Town").
     * e.g., if Pool is present: ask about pool surround decking vs coping stone.

OUTPUT MUST BE STRICT VALID JSON ONLY (no markdown outside json).
JSON Schema:
{
  "project": {
    "name": "L-SHAPED VILLA 140 sq.m",
    "siteAreaSqM": 800.0,
    "siteDimensions": [25.0, 32.0],
    "buildingAreaSqM": 140.0,
    "address": "г. Керчь, ул. Черноморская",
    "buildingCount": 3
  },
  "coPilotDecisions": [
    {
      "id": "carport_roof",
      "categoryRu": "Автонавес 6×6 м",
      "question": "Материал кровли навеса для 2 автомобилей:",
      "options": [
        { "id": "polycarb", "title": "🛡️ Монолитный поликарбонат (дымчатый)", "desc": "Максимум рассеянного света без нагрева авто", "isRecommended": true },
        { "id": "metal_seam", "title": "🏠 Фальцевая кровля в цвет дома", "desc": "Единый строгий архитектурный ансамбль" }
      ]
    },
    {
      "id": "firepit_masonry",
      "categoryRu": "Зона костра и BBQ",
      "question": "Облицовка костровой чаши и BBQ-террасы:",
      "options": [
        { "id": "basalt", "title": "🔥 Природный базальт и огнеупорный кирпич", "desc": "Долговечная теплоемкая кладка", "isRecommended": true },
        { "id": "corten", "title": "✨ Кортеновская сталь (Loft / Rust)", "desc": "Современный дизайнерский акцент" }
      ]
    },
    {
      "id": "hedge_plants",
      "categoryRu": "Живая изгородь вдоль ул. Черноморская",
      "question": "Состав ветрозащитной живой изгороди:",
      "options": [
        { "id": "tuya_smaragd", "title": "🌲 Туя Смарагд (вечнозеленая стена)", "desc": "Плотная круглогодичная защита от пыли и шума", "isRecommended": true },
        { "id": "derien_barberry", "title": "🌿 Дёрен белый + Барбарис Тунберга", "desc": "Яркая ярусная кулиса с сезонной сменой окраски" }
      ]
    },
    {
      "id": "paving_driveway",
      "categoryRu": "Мощение въездной зоны",
      "question": "Тип брусчатки для парковки и дорожек:",
      "options": [
        { "id": "old_town", "title": "🧱 Брусчатка «Старый город» (графит/серый)", "desc": "Классическая вибропрессованная плитка 60мм", "isRecommended": true },
        { "id": "granite_cut", "title": "🪨 Колотый гранит", "desc": "Максимальная прочность и вековая стойкость" }
      ]
    }
  ],
  "buildings": [
    {
      "id": "main_villa",
      "name": "Вилла 140 м²",
      "type": "residential",
      "facadeMaterial": "white_plaster",
      "wallHeight": 3.0,
      "walls": [ ... ],
      "openings": [ ... ],
      "roof": { "type": "flat", "slopeDeg": 5.0, "material": "charcoal_tile" },
      "rooms": [
        { "id": "r1", "name": "Кухня-Гостиная", "type": "living", "polygon": [ ... ], "areaSqM": 45.0 }
      ]
    }
  ],
  "siteElements": [
    { "id": "carport", "type": "gazebo", "polygon": [ ... ], "material": "wood_timber" },
    { "id": "shed", "type": "residential", "polygon": [ ... ], "material": "white_plaster" },
    { "id": "parking", "type": "parking", "polygon": [ ... ], "material": "asphalt_paver" },
    { "id": "lawn", "type": "ground", "polygon": [ ... ], "material": "grass_lawn" }
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
