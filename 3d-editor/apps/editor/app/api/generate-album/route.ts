import { NextResponse } from 'next/server'
import { spawn } from 'child_process'
import path from 'path'
import fs from 'fs'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const address = body.address || 'г. Керчь, мкр. Героевское, пер. Генерала Косоногова, д. 12'
    const imageBase64 = body.imageBase64 || body.image

    const outDir = path.resolve(process.cwd(), '../../output_album')
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true })
    }

    let tempImagePath = ''
    if (imageBase64) {
      const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '')
      tempImagePath = path.join(outDir, 'input_sketch.jpg')
      fs.writeFileSync(tempImagePath, Buffer.from(cleanBase64, 'base64'))
    }

    const scriptPath = path.resolve(process.cwd(), '../../tooling/landscape_album_pipeline.py')

    console.log(`🚀 [Album API] Running PDF Album generator for: ${address}`)

    const args = ['--address', address, '--output', outDir]
    if (tempImagePath) {
      args.push('--image', tempImagePath)
    }

    await new Promise((resolve, reject) => {
      const py = spawn('python3', [scriptPath, ...args])
      let stdout = ''
      let stderr = ''

      py.stdout.on('data', (d) => (stdout += d.toString()))
      py.stderr.on('data', (d) => (stderr += d.toString()))

      py.on('close', (code) => {
        if (code === 0) {
          resolve(stdout)
        } else {
          console.error('Python album generator error:', stderr)
          reject(new Error(stderr || 'Python error'))
        }
      })
    })

    const pdfPath = path.join(outDir, 'Пояснительная_записка_проект.pdf')
    const jsonPath = path.join(outDir, 'scene_graph.json')

    if (!fs.existsSync(pdfPath)) {
      return NextResponse.json({ success: false, error: 'PDF file was not created' }, { status: 500 })
    }

    const pdfBytes = fs.readFileSync(pdfPath)
    const pdfBase64 = pdfBytes.toString('base64')
    const sceneData = fs.existsSync(jsonPath) ? JSON.parse(fs.readFileSync(jsonPath, 'utf-8')) : null

    return NextResponse.json({
      success: true,
      pdfBase64: `data:application/pdf;base64,${pdfBase64}`,
      filename: 'Пояснительная_записка_проект.pdf',
      sceneData,
    })
  } catch (error: any) {
    console.error('❌ [Album API Exception]:', error)
    return NextResponse.json({ success: false, error: error.message || 'Internal error' }, { status: 500 })
  }
}
