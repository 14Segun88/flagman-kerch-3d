import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { prompt, imageBase64, maxTokens = 256 } = body

    if (!imageBase64) {
      return NextResponse.json(
        { success: false, error: 'imageBase64 is required' },
        { status: 400 },
      )
    }

    const formattedBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '')

    const nvidiaApiKey =
      process.env.NVIDIA_API_KEY ||
      process.env.NIM_API_KEY ||
      process.env.NVIDIA_NIM_API_KEY

    if (!nvidiaApiKey) {
      return NextResponse.json(
        { success: false, error: 'NVIDIA API Key is missing on server environment' },
        { status: 500 },
      )
    }

    const modelsToTry = [
      process.env.NVIDIA_NIM_VISION_MODEL || 'meta/llama-3.2-90b-vision-instruct',
      'meta/llama-3.2-11b-vision-instruct',
    ]

    let response: Response | null = null
    let activeModel = modelsToTry[0]!

    for (const modelCandidate of modelsToTry) {
      activeModel = modelCandidate
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 35000)

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
                content:
                  'You are a high-precision VLM architectural classifier. You MUST reply ONLY with a valid JSON object starting with {. Do NOT write markdown syntax, explanations, or introductory text.',
              },
              {
                role: 'user',
                content: [
                  {
                    type: 'text',
                    text:
                      prompt ||
                      'Classify this cropped region of an architectural plan into category: building, swimming_pool, lawn_zone, furniture, text_legend, or unknown.',
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
            max_tokens: maxTokens,
          }),
        })
        clearTimeout(timeoutId)

        if (res.ok) {
          response = res
          break
        } else {
          console.warn(`⚠️ Model ${activeModel} classify failed HTTP ${res.status}, trying fallback...`)
        }
      } catch (err: any) {
        console.warn(`⚠️ Model ${activeModel} request error/timeout: ${err.message}, trying fallback...`)
      }
    }

    if (!response || !response.ok) {
      const errorText = response ? await response.text() : 'No response from NIM VLM models'
      console.warn('⚠️ NVIDIA Vision Classify API fallback to unknown:', errorText)
      return NextResponse.json({
        success: true,
        modelUsed: activeModel,
        text: '{"category": "unknown", "confidence": 0.5, "reason": "API timeout or rate limit"}',
      })
    }

    const data = await response.json()
    const rawContent = data.choices?.[0]?.message?.content || ''

    return NextResponse.json({
      success: true,
      modelUsed: activeModel,
      text: rawContent,
    })
  } catch (error: any) {
    console.error('❌ API Router nim-vision-classify Error:', error.message)
    return NextResponse.json({
      success: true,
      text: '{"category": "unknown", "confidence": 0.5, "reason": "Internal fallback"}',
    })
  }
}
