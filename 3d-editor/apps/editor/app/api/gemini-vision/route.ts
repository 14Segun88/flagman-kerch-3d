import { NextResponse } from 'next/server'
import fs from 'node:fs'
import path from 'node:path'

const GEMINI_SYSTEM_PROMPT = `You are an expert Architectural BIM Engineer and Landscape Master Plan Vectorization AI.
Your task is to analyze the provided 2D architectural drawing, master plan, or site layout and convert EVERY building, room, structure, carport, shed, terrace, and landscape zone into an EXACT, dimensionally accurate 3D coordinate model for direct Blender assembly.

CRITICAL DIMENSION OCR & VECTORIZATION INSTRUCTIONS:
1. READ AND ENFORCE ALL METRIC DIMENSION TEXT ANNOTATIONS ON THE DRAWING:
   - Extract the exact numbers written on each room, wall, walkway, and structure:
     * Plot dimensions: e.g. 32.0m width (top) x 25.0m depth (left) = 800 sq.m.
     * Master Bedroom: 4.2m x 4.5m.
     * Master Bathroom: 2.5m en.
     * Wardrobe / Гардеробная: 1.8m.
     * Bathroom 2: 2.4m x 2.8m.
     * Bedroom 2 / Спальня: 4.0m x 2.8m.
     * Study / Guest Room / Кабинет: 4.0m.
     * Kitchen: 3.5m x 4.5m.
     * Living Room: 14.0 sq.m (4.2m x 3.5m).
     * Dining / Столовая: 3.0m x 4.5m.
     * South Sliding Glass Doors: 3.0m + 3.0m + 3.0m openings along the south facade.
     * Carport (Навес для 2 авто): 6.0m x 6.0m with 4 corner posts and roof canopy.
     * Utility Shed & Workshop (Мастерская / Хозблок): 3.0m x 5.0m.
     * Summer BBQ Terrace: 5.0m x 5.0m pergola decking.
     * Fire Pit (Зона костра): 4.0m x 4.0m circular seating zone.
     * Walkway paths: 2.5m wide connecting paths, 7.0m x 7.0m parking driveway.
     * Windbreak hedge along East fence (ул. Черноморская): Thuja, Barberry, Dogwood white.
2. TOPOLOGICAL WALL COORDINATES:
   - Output every exterior and interior partition wall with start [x, y] and end [x, y] in METERS matching the OCR dimensions.
   - All rooms MUST form water-tight closed polygons with area matching the annotations.
3. DETECT ALL DENDROLOGY & PLANTS:
   - Output an array of "plants" with their exact positions along the fences (Thuja, Barberry, Dogwood, Pine, Lavender).

OUTPUT MUST BE STRICT VALID JSON ONLY (no markdown outside json).
JSON Schema:
{
  "project": {
    "name": "L-SHAPED VILLA 140 sq.m",
    "siteAreaSqM": 800.0,
    "siteDimensions": [32.0, 25.0],
    "buildingAreaSqM": 140.0,
    "address": "г. Керчь, ул. Черноморская",
    "buildingCount": 3
  },
  "coPilotDecisions": [
    {
      "id": "carport_roof",
      "categoryRu": "Автонавес 6×6 м",
      "question": "1. Материал кровли навеса для 2 автомобилей:",
      "options": [
        { "id": "polycarb", "title": "🛡️ Монолитный поликарбонат (дымчатый)", "desc": "Максимум рассеянного света без нагрева авто", "isRecommended": true },
        { "id": "metal_seam", "title": "🏠 Фальцевая кровля в цвет дома", "desc": "Единый строгий архитектурный ансамбль" }
      ]
    },
    {
      "id": "firepit_masonry",
      "categoryRu": "Зона костра и BBQ",
      "question": "2. Облицовка костровой чаши и BBQ-террасы:",
      "options": [
        { "id": "basalt", "title": "🔥 Природный базальт и огнеупорный кирпич", "desc": "Долговечная теплоемкая кладка", "isRecommended": true },
        { "id": "corten", "title": "✨ Кортеновская сталь (Loft / Rust)", "desc": "Современный дизайнерский акцент" }
      ]
    },
    {
      "id": "hedge_plants",
      "categoryRu": "Живая изгородь вдоль ул. Черноморская",
      "question": "3. Состав ветрозащитной живой изгороди:",
      "options": [
        { "id": "tuya_smaragd", "title": "🌲 Туя Смарагд (вечнозеленая стена)", "desc": "Плотная круглогодичная защита от пыли и шума", "isRecommended": true },
        { "id": "derien_barberry", "title": "🌿 Дёрен белый + Барбарис Тунберга", "desc": "Яркая ярусная кулиса с сезонной сменой окраски" }
      ]
    },
    {
      "id": "paving_driveway",
      "categoryRu": "Мощение въездной зоны",
      "question": "4. Тип брусчатки для парковки и дорожек:",
      "options": [
        { "id": "old_town", "title": "🧱 Брусчатка «Старый город» (графит/серый)", "desc": "Классическая вибропрессованная плитка 60мм", "isRecommended": true },
        { "id": "granite_cut", "title": "🪨 Колотый гранит", "desc": "Максимальная прочность и вековая стойкость" }
      ]
    }
  ],
  "buildings": [
    {
      "id": "main_villa",
      "name": "L-образная Вилла 140 м²",
      "type": "residential",
      "facadeMaterial": "white_plaster",
      "wallHeight": 3.0,
      "walls": [ ... ],
      "openings": [ ... ],
      "roof": { "type": "flat", "slopeDeg": 5.0, "material": "charcoal_tile" },
      "rooms": [
        { "id": "r_master_bed", "name": "Мастер-спальня", "type": "bedroom", "polygon": [ ... ], "areaSqM": 18.9 },
        { "id": "r_kitchen", "name": "Кухня", "type": "kitchen", "polygon": [ ... ], "areaSqM": 15.75 },
        { "id": "r_living", "name": "Гостиная", "type": "living", "polygon": [ ... ], "areaSqM": 14.7 },
        { "id": "r_dining", "name": "Столовая", "type": "dining", "polygon": [ ... ], "areaSqM": 13.5 }
      ]
    },
    {
      "id": "carport",
      "name": "Автонавес 6×6 м",
      "type": "carport",
      "facadeMaterial": "wood_timber",
      "wallHeight": 2.7,
      "columns": [ ... ],
      "roof": { "type": "shed", "material": "dark_wood" }
    },
    {
      "id": "utility_shed",
      "name": "Мастерская 3×5 м",
      "type": "utility",
      "facadeMaterial": "white_plaster",
      "wallHeight": 2.8,
      "walls": [ ... ]
    }
  ],
  "siteElements": [
    { "id": "summer_bbq_terrace", "type": "decking", "polygon": [ ... ], "material": "wood_timber" },
    { "id": "driveway_paving", "type": "parking", "polygon": [ ... ], "material": "asphalt_paver" },
    { "id": "pathways", "type": "pathway", "polygon": [ ... ], "material": "asphalt_paver" },
    { "id": "fire_pit", "type": "fire_pit", "polygon": [ ... ], "material": "concrete_slab" },
    { "id": "lawn", "type": "ground", "polygon": [ ... ], "material": "grass_lawn" }
  ],
  "plants": [
    { "id": "pl_1", "species_ru": "Туя Смарагд", "species_lat": "Thuja occidentalis Smaragd", "category": "conifer", "position": [30.5, 5.0], "crown_diameter_m": 1.2, "symbol_code": "ТС" },
    { "id": "pl_2", "species_ru": "Барбарис Тунберга", "species_lat": "Berberis thunbergii", "category": "deciduous", "position": [30.5, 8.0], "crown_diameter_m": 1.0, "symbol_code": "БТ" },
    { "id": "pl_3", "species_ru": "Дёрен белый", "species_lat": "Cornus alba", "category": "deciduous", "position": [30.5, 11.0], "crown_diameter_m": 1.5, "symbol_code": "ДБ" }
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

    // Execute local Blender builder on user PC
    const rootDir = path.resolve(process.cwd(), '../..')
    const outDir = path.join(rootDir, 'output_album_test')
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true })
    }
    const sceneJsonPath = path.join(outDir, 'last_extracted_scene.json')
    fs.writeFileSync(sceneJsonPath, JSON.stringify(parsedData, null, 2))

    const publicDir = path.join(rootDir, 'public')
    const outGlb = path.join(publicDir, 'generated_villa.glb')
    const outRender = path.join(publicDir, 'generated_preview.png')
    const builderScript = path.join(rootDir, '3d-editor/tooling/blender_house_builder.py')
    const blenderBin = path.join(process.env.HOME || '/home/segun', '.local/bin/blender')

    console.log(`🔨 [Blender Local Engine] Building 3D scene: ${outGlb}`)
    try {
      const { spawnSync } = await import('node:child_process')
      spawnSync(
        blenderBin,
        ['--background', '--python', builderScript, '--', '--input', sceneJsonPath, '--output', outGlb, '--render', outRender],
        { cwd: rootDir, timeout: 35000 }
      )
    } catch (bErr) {
      console.warn('Blender background execution warning:', bErr)
    }

    const timestamp = Date.now()
    return NextResponse.json({
      success: true,
      data: parsedData,
      previewUrl: `/generated_preview.png?t=${timestamp}`,
      glbUrl: `/generated_villa.glb?t=${timestamp}`,
      model: modelName
    })
  } catch (error: any) {
    console.error('❌ [Gemini Vision Exception]:', error)
    return NextResponse.json({ success: false, error: error.message || 'Internal error' }, { status: 500 })
  }
}
