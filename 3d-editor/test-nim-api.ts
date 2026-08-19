import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.join(__dirname, 'apps/editor/.env.local') })

async function testLMStudio() {
  const baseUrl = process.env.LM_STUDIO_URL || 'http://127.0.0.1:1235/v1'
  const model = process.env.LM_STUDIO_MODEL || 'qwen2.5-vl'

  console.log('Testing LM Studio Qwen 2.5 Vision at:', baseUrl)
  console.log('Model:', model)

  // Sample small base64 image (1x1 red dot)
  const sampleImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Analyze this blueprint. Return JSON: {"walls": [{"start": [0,0], "end": [10,0], "thickness": 0.3, "height": 3.0}], "rooms": [{"name": "House", "polygon": [[0,0],[10,0],[10,8],[0,8]]}]}' },
              { type: 'image_url', image_url: { url: sampleImage } },
            ],
          },
        ],
        temperature: 0.1,
        max_tokens: 500,
      }),
    })

    console.log('Response Status:', res.status, res.statusText)
    const text = await res.text()
    console.log('Response Body:', text.slice(0, 500))
  } catch (err) {
    console.error('Fetch error:', err)
  }
}

testLMStudio()
