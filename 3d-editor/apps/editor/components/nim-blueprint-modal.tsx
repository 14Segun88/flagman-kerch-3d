'use client'

import {
  AlertCircle,
  Building,
  CheckCircle2,
  ChevronRight,
  Clipboard,
  FileCode,
  FileText,
  FolderOpen,
  HelpCircle,
  Image as ImageIcon,
  Layers,
  LayoutGrid,
  Loader2,
  Maximize2,
  Play,
  Ruler,
  Sliders,
  Sparkles,
  Trash2,
  Wand2,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  type FloorPlanGraph,
  type GraphRoom,
  type GraphWall,
  calcPolygonArea,
} from '../lib/deepfloorplan-engine'
import {
  POPULAR_LAYOUT_PRESETS,
  type LayoutPreset,
  generateFloorPlan3DLayout,
} from '../lib/floorplan-layout-generator'
import {
  importDxfFloorPlan,
  importFloorPlanJson,
} from '../lib/universal-floorplan-importer'
import { vectorizeBlueprintImage } from '../lib/ai-floorplan-graph-vectorizer'
import { build3DFromFloorPlanGraph, clearSceneBuildings, type BuildProgress } from '../lib/nim-scene-builder'
import { cn } from '../lib/utils'

interface NimBlueprintModalProps {
  isOpen: boolean
  onClose: () => void
}

type StudioTab = 'ai_scan' | 'layout_gen' | 'file_import'

export function NimBlueprintModal({ isOpen, onClose }: NimBlueprintModalProps) {
  const [activeTab, setActiveTab] = useState<StudioTab>('ai_scan')
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [progress, setProgress] = useState<BuildProgress | null>(null)

  // AI Scan Parameters
  const [scaleHint, setScaleHint] = useState<string>('')
  const [realWidthMeters, setRealWidthMeters] = useState<number>(10.0)

  // Layout Generator Parameters
  const [selectedPresetId, setSelectedPresetId] = useState<string>('site_plan_screenshot_3')
  const [genWidth, setGenWidth] = useState<number>(26.0)
  const [genDepth, setGenDepth] = useState<number>(32.0)
  const [genBedrooms, setGenBedrooms] = useState<number>(2)
  const [genBathrooms, setGenBathrooms] = useState<number>(2)
  const [genHasTerrace, setGenHasTerrace] = useState<boolean>(true)
  const [genHasGarage, setGenHasGarage] = useState<boolean>(true)
  const [genHasBoiler, setGenHasBoiler] = useState<boolean>(true)

  // Stage 3 3D Volumetric & Realism Toggles
  const [optRoof, setOptRoof] = useState<boolean>(true)
  const [optFinishes, setOptFinishes] = useState<boolean>(true)
  const [optCeilings, setOptCeilings] = useState<boolean>(false)
  const [optFurniture, setOptFurniture] = useState<boolean>(true)

  // Current Generated / Recognized Graph Preview
  const [activeGraph, setActiveGraph] = useState<FloorPlanGraph | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const cadFileInputRef = useRef<HTMLInputElement>(null)
  const pasteInputRef = useRef<HTMLInputElement>(null)
  const canvasPreviewRef = useRef<HTMLCanvasElement>(null)

  // Set default initial layout graph
  useEffect(() => {
    if (!activeGraph && isOpen) {
      const defaultLayout = generateFloorPlan3DLayout({
        presetId: 'site_plan_screenshot_3',
        title: 'Генплан усадьбы (Скриншот №3)',
        widthM: 26.0,
        depthM: 32.0,
        stories: 1,
        bedrooms: 2,
        bathrooms: 2,
        hasTerrace: true,
        hasGarage: true,
        hasBoilerRoom: true,
      })
      setActiveGraph(defaultLayout)
    }
  }, [isOpen, activeGraph])

  // Redraw 2D Interactive Canvas Preview whenever activeGraph changes
  useEffect(() => {
    if (!canvasPreviewRef.current || !activeGraph) return
    const canvas = canvasPreviewRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const W = canvas.width
    const H = canvas.height

    // Clear background
    ctx.fillStyle = '#090d16'
    ctx.fillRect(0, 0, W, H)

    // Grid lines
    ctx.strokeStyle = '#1e293b'
    ctx.lineWidth = 1
    const gridSize = 25
    for (let x = 0; x < W; x += gridSize) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke()
    }
    for (let y = 0; y < H; y += gridSize) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke()
    }

    // Determine graph bounding box
    const allX = activeGraph.walls.flatMap((w) => [w.start[0], w.end[0]])
    const allY = activeGraph.walls.flatMap((w) => [w.start[1], w.end[1]])
    const minX = Math.min(...allX, -5)
    const maxX = Math.max(...allX, 5)
    const minY = Math.min(...allY, -5)
    const maxY = Math.max(...allY, 5)

    const spanX = Math.max(maxX - minX, 6)
    const spanY = Math.max(maxY - minY, 6)

    const padding = 40
    const scale = Math.min((W - padding * 2) / spanX, (H - padding * 2) / spanY)

    const toScreenX = (x: number) => W / 2 + (x - (minX + maxX) / 2) * scale
    const toScreenY = (y: number) => H / 2 - (y - (minY + maxY) / 2) * scale

    // 1. Draw Room Polygons & Labels
    activeGraph.rooms.forEach((room) => {
      if (room.polygon && room.polygon.length >= 3) {
        ctx.beginPath()
        room.polygon.forEach(([rx, ry], idx) => {
          const sx = toScreenX(rx)
          const sy = toScreenY(ry)
          if (idx === 0) ctx.moveTo(sx, sy)
          else ctx.lineTo(sx, sy)
        })
        ctx.closePath()

        ctx.fillStyle = `${room.color}25` // 15% opacity
        ctx.fill()
        ctx.strokeStyle = `${room.color}80`
        ctx.lineWidth = 1.5
        ctx.stroke()

        // Center room label
        let avgX = 0; let avgY = 0
        room.polygon.forEach(([px, py]) => { avgX += px; avgY += py })
        avgX /= room.polygon.length
        avgY /= room.polygon.length

        const labelX = toScreenX(avgX)
        const labelY = toScreenY(avgY)

        ctx.fillStyle = '#ffffff'
        ctx.font = 'bold 11px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText(room.name, labelX, labelY - 4)

        ctx.fillStyle = room.color
        ctx.font = '10px monospace'
        ctx.fillText(`${room.areaSqM} м²`, labelX, labelY + 10)
      }
    })

    // 2. Draw Walls
    activeGraph.walls.forEach((wall) => {
      const sx1 = toScreenX(wall.start[0])
      const sy1 = toScreenY(wall.start[1])
      const sx2 = toScreenX(wall.end[0])
      const sy2 = toScreenY(wall.end[1])

      ctx.beginPath()
      ctx.moveTo(sx1, sy1)
      ctx.lineTo(sx2, sy2)

      ctx.strokeStyle = wall.isExterior ? '#10b981' : '#f59e0b'
      ctx.lineWidth = wall.isExterior ? Math.max(4, wall.thickness * scale) : Math.max(2.5, wall.thickness * scale)
      ctx.lineCap = 'round'
      ctx.stroke()
    })

    // 3. Draw Openings (Doors & Windows)
    activeGraph.openings.forEach((op) => {
      const hostWall = activeGraph.walls.find((w) => w.id === op.wallId)
      if (!hostWall) return

      const ratio = op.positionRatio ?? 0.5
      const ox = hostWall.start[0] + (hostWall.end[0] - hostWall.start[0]) * ratio
      const oy = hostWall.start[1] + (hostWall.end[1] - hostWall.start[1]) * ratio

      const soX = toScreenX(ox)
      const soY = toScreenY(oy)

      ctx.beginPath()
      ctx.arc(soX, soY, op.type === 'door' ? 5 : 4, 0, Math.PI * 2)
      ctx.fillStyle = op.type === 'door' ? '#f43f5e' : '#38bdf8'
      ctx.fill()
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 1.5
      ctx.stroke()
    })
  }, [activeGraph])

  // Handle Preset selection
  const handleSelectPreset = (preset: LayoutPreset) => {
    setSelectedPresetId(preset.id)
    setGenWidth(preset.widthM)
    setGenDepth(preset.depthM)
    setGenBedrooms(preset.bedrooms)
    setGenBathrooms(preset.bathrooms)
    setGenHasTerrace(preset.hasTerrace)
    setGenHasGarage(preset.hasGarage)
    setGenHasBoiler(preset.hasBoilerRoom)

    const newGraph = generateFloorPlan3DLayout({
      title: preset.name,
      widthM: preset.widthM,
      depthM: preset.depthM,
      stories: preset.stories,
      bedrooms: preset.bedrooms,
      bathrooms: preset.bathrooms,
      hasTerrace: preset.hasTerrace,
      hasGarage: preset.hasGarage,
      hasBoilerRoom: preset.hasBoilerRoom,
    })
    setActiveGraph(newGraph)
  }

  // Handle Parametric Slider Changes
  const handleRegenerateCustomLayout = () => {
    const newGraph = generateFloorPlan3DLayout({
      title: 'Индивидуальная планировка',
      widthM: genWidth,
      depthM: genDepth,
      stories: 1,
      bedrooms: genBedrooms,
      bathrooms: genBathrooms,
      hasTerrace: genHasTerrace,
      hasGarage: genHasGarage,
      hasBoilerRoom: genHasBoiler,
    })
    setActiveGraph(newGraph)
  }

  // Process File Drag & Drop / Upload
  const handleImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMessage('Пожалуйста, выберите графический файл (PNG, JPG, WEBP).')
      return
    }
    setErrorMessage(null)
    const reader = new FileReader()
    reader.onload = (e) => {
      if (e.target?.result) {
        setSelectedImage(e.target.result as string)
      }
    }
    reader.readAsDataURL(file)
  }

  // Paste handler
  const handlePaste = useCallback(
    (e: React.ClipboardEvent | ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return
      for (let i = 0; i < items.length; i++) {
        if (items[i]!.type.startsWith('image/')) {
          const file = items[i]!.getAsFile()
          if (file) {
            handleImageFile(file)
            return
          }
        }
      }
    },
    [],
  )

  useEffect(() => {
    if (!isOpen) return
    const onWindowPaste = (e: ClipboardEvent) => handlePaste(e)
    window.addEventListener('paste', onWindowPaste)
    return () => window.removeEventListener('paste', onWindowPaste)
  }, [isOpen, handlePaste])

  // Run DeepFloorPlan AI Vectorization
  const handleRunAiVectorize = async () => {
    if (!selectedImage) {
      setErrorMessage('Сначала загрузите изображение чертежа или вставьте скриншот (Ctrl+V).')
      return
    }

    setIsProcessing(true)
    setErrorMessage(null)
    setProgress({
      step: 'init',
      current: 10,
      total: 100,
      message: '🧠 [DeepFloorPlan AI]: Анализ топологии стен и комнат...',
    })

    try {
      const graph = await vectorizeBlueprintImage(selectedImage, {
        scaleRealMeters: realWidthMeters,
        userPromptHint: scaleHint,
      })

      setActiveGraph(graph)
      setIsProcessing(false)
      setProgress(null)
    } catch (err: any) {
      setIsProcessing(false)
      setErrorMessage(`Ошибка распознавания чертежа: ${err.message}`)
    }
  }

  // Handle CAD / JSON file import
  const handleCadFile = async (file: File) => {
    setErrorMessage(null)
    setIsProcessing(true)
    try {
      const text = await file.text()
      let graph: FloorPlanGraph

      if (file.name.endsWith('.json') || file.type.includes('json')) {
        graph = importFloorPlanJson(text)
      } else if (file.name.toLowerCase().endsWith('.dxf')) {
        graph = importDxfFloorPlan(text)
      } else {
        throw new Error('Поддерживаются только форматы .json (FloorPlan.ai / BIM) и .dxf (AutoCAD).')
      }

      setActiveGraph(graph)
      setIsProcessing(false)
    } catch (err: any) {
      setIsProcessing(false)
      setErrorMessage(`Ошибка импорта файла: ${err.message}`)
    }
  }

  // Final 1-Click Build 3D in Pascal Editor
  const handleBuildIn3DEditor = async () => {
    if (!activeGraph) return
    setIsProcessing(true)
    setErrorMessage(null)

    try {
      console.log('🚀 [Stage 3 3D Engine] Начало сборки фотореалистичной 3D-модели в редакторе...')
      await build3DFromFloorPlanGraph(activeGraph, (p) => setProgress(p), {
        includeRoof: optRoof,
        includeCeilings: optCeilings,
        includeFinishes: optFinishes,
        includeSkirting: optFinishes,
        includeFurniture: optFurniture,
        stepDelayMs: 40,
      })
      setIsProcessing(false)

      setTimeout(() => {
        onClose()
      }, 1000)
    } catch (err: any) {
      setIsProcessing(false)
      setErrorMessage(`Ошибка при сборке 3D-сцены: ${err.message}`)
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-5 backdrop-blur-md transition-all"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isProcessing) onClose()
      }}
    >
      <div
        className="relative w-full max-w-5xl overflow-hidden rounded-3xl border border-zinc-700/80 bg-zinc-900 shadow-2xl text-zinc-100 flex flex-col max-h-[94vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4 bg-zinc-950/80">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-inner">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black tracking-tight text-white font-montserrat">
                  DeepFloorPlan & FloorPlan3D — 2D➔3D Студия
                </h2>
                <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/30">
                  v3.0 BIM
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Распознавание чертежей (AI Graph), генератор планировок и моментальный перенос в 3D конструктор со сметой
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (window.confirm('Очистить 3D-сцену от всех объектов, стен и крыш?')) {
                  clearSceneBuildings()
                }
              }}
              disabled={isProcessing}
              title="Очистить сцену от всех объектов"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-800 bg-zinc-900/80 text-zinc-400 hover:text-rose-400 hover:border-rose-500/30 text-xs font-semibold transition cursor-pointer"
            >
              <Trash2 className="h-4 w-4" />
              <span className="hidden sm:inline">Очистить сцену</span>
            </button>

            <button
              onClick={onClose}
              disabled={isProcessing}
              className="rounded-xl p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white transition cursor-pointer"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-zinc-800 bg-zinc-950/40 text-xs">
          <button
            onClick={() => setActiveTab('ai_scan')}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 font-bold rounded-t-xl transition-all border-b-2 cursor-pointer',
              activeTab === 'ai_scan'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10'
                : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40',
            )}
          >
            <Wand2 className="h-4 w-4" />
            <span>1. Распознавание чертежа (AI Vision)</span>
          </button>

          <button
            onClick={() => setActiveTab('layout_gen')}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 font-bold rounded-t-xl transition-all border-b-2 cursor-pointer',
              activeTab === 'layout_gen'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10'
                : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40',
            )}
          >
            <LayoutGrid className="h-4 w-4" />
            <span>2. Генератор планировок (FloorPlan3D)</span>
          </button>

          <button
            onClick={() => setActiveTab('file_import')}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 font-bold rounded-t-xl transition-all border-b-2 cursor-pointer',
              activeTab === 'file_import'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10'
                : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40',
            )}
          >
            <FileCode className="h-4 w-4" />
            <span>3. Импорт (FloorPlan.ai / DXF / JSON)</span>
          </button>
        </div>

        {/* Modal Main Workspace: 2-Columns */}
        <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-[420px]">
          {/* Left Column: Controls by Tab (5 cols) */}
          <div className="lg:col-span-5 space-y-4 flex flex-col justify-between">
            {activeTab === 'ai_scan' && (
              <div className="space-y-4">
                {!selectedImage ? (
                  <div
                    onDragEnter={() => setDragActive(true)}
                    onDragLeave={() => setDragActive(false)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault()
                      setDragActive(false)
                      if (e.dataTransfer.files?.[0]) handleImageFile(e.dataTransfer.files[0])
                    }}
                    className={cn(
                      'flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition-all bg-zinc-950/60 min-h-[220px]',
                      dragActive ? 'border-emerald-500 bg-emerald-500/10' : 'border-zinc-700 hover:border-emerald-500/50',
                    )}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => e.target.files?.[0] && handleImageFile(e.target.files[0])}
                      className="hidden"
                    />
                    <ImageIcon className="h-10 w-10 text-emerald-400 mb-2.5 opacity-80" />
                    <p className="text-xs font-semibold text-zinc-200">Перетащите 2D чертёж дома или скриншот</p>
                    <p className="text-[11px] text-zinc-500 mt-1">Поддерживается вставка из буфера (Ctrl + V)</p>

                    <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-2 rounded-xl bg-zinc-800 border border-zinc-700 px-4 py-2 text-xs font-semibold text-zinc-200 hover:bg-zinc-700 transition"
                      >
                        <FolderOpen className="h-4 w-4" />
                        <span>Выбрать файл</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const siteGraph = generateFloorPlan3DLayout({
                            presetId: 'site_plan_screenshot_3',
                            title: 'Генплан усадьбы (Скриншот №3)',
                            widthM: 26.0,
                            depthM: 32.0,
                            stories: 1,
                            bedrooms: 2,
                            bathrooms: 2,
                            hasTerrace: true,
                            hasGarage: true,
                            hasBoilerRoom: true,
                          })
                          setActiveGraph(siteGraph)
                          setErrorMessage(null)
                        }}
                        className="flex items-center gap-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 px-3.5 py-2 text-xs font-bold text-emerald-400 hover:bg-emerald-500/30 transition shadow-sm cursor-pointer"
                      >
                        <Sparkles className="h-4 w-4" />
                        <span>⚡ Демо: Генплан (Скриншот №3)</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="relative rounded-2xl border border-zinc-700 overflow-hidden bg-zinc-950 p-2 group max-h-[180px]">
                      <img src={selectedImage} alt="Preview" className="h-full w-full object-contain rounded-xl" />
                      <button
                        onClick={() => setSelectedImage(null)}
                        className="absolute top-3 right-3 rounded-lg bg-zinc-900/90 border border-zinc-700 p-1.5 text-zinc-400 hover:text-white"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="rounded-xl bg-zinc-950 border border-zinc-800 p-3 space-y-2.5 text-xs">
                      {/* Blueprint Type Selection */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-zinc-400">Тип чертежа:</label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setScaleHint('Одиночный жилой дом')
                              setRealWidthMeters(10.0)
                            }}
                            className={cn(
                              'px-2.5 py-1.5 rounded-lg border text-center font-medium transition cursor-pointer',
                              realWidthMeters < 20
                                ? 'border-emerald-500 bg-emerald-500/15 text-white'
                                : 'border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:text-white',
                            )}
                          >
                            🏡 Дом (8-12 м)
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setScaleHint('Генплан участка (Скриншот №3)')
                              setRealWidthMeters(32.0)
                            }}
                            className={cn(
                              'px-2.5 py-1.5 rounded-lg border text-center font-medium transition cursor-pointer',
                              realWidthMeters >= 20
                                ? 'border-emerald-500 bg-emerald-500/15 text-white'
                                : 'border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:text-white',
                            )}
                          >
                            ⭐ Генплан участка (32 м)
                          </button>
                        </div>
                      </div>

                      <label className="flex items-center justify-between text-zinc-300 font-semibold pt-1 border-t border-zinc-800/80">
                        <span className="flex items-center gap-1.5">
                          <Ruler className="h-3.5 w-3.5 text-emerald-400" />
                          <span>Калибровка размера (м):</span>
                        </span>
                        <input
                          type="number"
                          value={realWidthMeters}
                          onChange={(e) => setRealWidthMeters(Math.max(1, Number(e.target.value)))}
                          className="w-16 text-center rounded bg-zinc-900 border border-zinc-700 text-emerald-400 font-mono py-0.5"
                        />
                      </label>
                      <input
                        type="text"
                        placeholder="Примечание (напр. 'Генплан участка', 'Дом 10х8м')"
                        value={scaleHint}
                        onChange={(e) => setScaleHint(e.target.value)}
                        className="w-full text-xs rounded-lg bg-zinc-900 border border-zinc-700 px-3 py-1.5 text-zinc-200 focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <button
                      onClick={handleRunAiVectorize}
                      disabled={isProcessing}
                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-500 transition shadow-lg shadow-emerald-600/30 cursor-pointer"
                    >
                      {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                      <span>Распознать топологию стен (DeepFloorPlan)</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'layout_gen' && (
              <div className="space-y-3.5 text-xs">
                {/* Presets List */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Готовые проекты:</label>
                  <div className="grid grid-cols-2 gap-2">
                    {POPULAR_LAYOUT_PRESETS.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => handleSelectPreset(p)}
                        className={cn(
                          'p-2.5 rounded-xl border text-left transition-all',
                          selectedPresetId === p.id
                            ? 'border-emerald-500 bg-emerald-500/15 text-white shadow-sm'
                            : 'border-zinc-800 bg-zinc-950 hover:border-zinc-700 text-zinc-300',
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[11px] truncate">{p.name}</span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-800 text-emerald-400 font-mono">
                            {p.areaSqM}м²
                          </span>
                        </div>
                        <p className="text-[10px] text-zinc-400 mt-1 line-clamp-1">{p.description}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Parametric Customizer */}
                <div className="rounded-2xl bg-zinc-950 border border-zinc-800 p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between font-bold text-zinc-200">
                    <span className="flex items-center gap-1.5">
                      <Sliders className="h-3.5 w-3.5 text-emerald-400" />
                      <span>Параметры дома:</span>
                    </span>
                    <button
                      onClick={handleRegenerateCustomLayout}
                      className="text-[10px] text-emerald-400 hover:underline"
                    >
                      Обновить схему
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] text-zinc-400">Ширина: {genWidth}м</span>
                      <input
                        type="range"
                        min="5"
                        max="16"
                        step="0.5"
                        value={genWidth}
                        onChange={(e) => {
                          setGenWidth(Number(e.target.value))
                          setSelectedPresetId('')
                        }}
                        className="w-full accent-emerald-500 h-1"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-400">Длина: {genDepth}м</span>
                      <input
                        type="range"
                        min="5"
                        max="18"
                        step="0.5"
                        value={genDepth}
                        onChange={(e) => {
                          setGenDepth(Number(e.target.value))
                          setSelectedPresetId('')
                        }}
                        className="w-full accent-emerald-500 h-1"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] pt-1">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={genHasTerrace}
                        onChange={(e) => setGenHasTerrace(e.target.checked)}
                        className="accent-emerald-500 rounded"
                      />
                      <span>Терраса</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={genHasGarage}
                        onChange={(e) => setGenHasGarage(e.target.checked)}
                        className="accent-emerald-500 rounded"
                      />
                      <span>Гараж</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={genHasBoiler}
                        onChange={(e) => setGenHasBoiler(e.target.checked)}
                        className="accent-emerald-500 rounded"
                      />
                      <span>Котельная</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'file_import' && (
              <div className="space-y-3">
                <input
                  ref={cadFileInputRef}
                  type="file"
                  accept=".json,.dxf"
                  onChange={(e) => e.target.files?.[0] && handleCadFile(e.target.files[0])}
                  className="hidden"
                />

                <div
                  onClick={() => cadFileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-zinc-700 hover:border-emerald-500 p-6 text-center cursor-pointer bg-zinc-950/60 transition"
                >
                  <FileCode className="h-10 w-10 text-emerald-400 mb-2 opacity-80" />
                  <p className="text-xs font-semibold text-zinc-200">Загрузите файл FloorPlan.ai / DXF</p>
                  <p className="text-[11px] text-zinc-500 mt-1">Поддерживаются форматы: .json, .dxf (AutoCAD/Revit)</p>
                </div>

                <div className="rounded-xl bg-zinc-950 border border-zinc-800 p-3 text-xs text-zinc-400 space-y-1">
                  <p className="font-semibold text-zinc-300">Прямой перенос из Floor-Plan.AI:</p>
                  <p className="text-[11px]">
                    Выгрузите JSON или DXF с сайта <code className="text-emerald-400">floor-plan.ai</code> и перетащите сюда. Система автоматически восстановит стены, окна, двери и экспликацию помещений.
                  </p>
                </div>
              </div>
            )}

            {/* Error banner */}
            {errorMessage && (
              <div className="flex items-start gap-2.5 rounded-xl bg-red-500/10 border border-red-500/30 p-3 text-xs text-red-400">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <p className="text-[11px] leading-tight">{errorMessage}</p>
              </div>
            )}
          </div>

          {/* Right Column: 2D Interactive Vector Plan Preview (7 cols) */}
          <div className="lg:col-span-7 flex flex-col rounded-2xl bg-zinc-950 border border-zinc-800 p-3 space-y-2.5">
            <div className="flex items-center justify-between text-xs px-1">
              <span className="font-bold text-zinc-300 flex items-center gap-1.5">
                <Layers className="h-4 w-4 text-emerald-400" />
                <span>Интерактивный 2D-план (BIM граф):</span>
              </span>

              {activeGraph && (
                <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-400">
                  <span className="text-emerald-400 font-bold">{activeGraph.dimensions.areaSqM} м²</span>
                  <span>|</span>
                  <span>{activeGraph.walls.length} стен</span>
                  <span>|</span>
                  <span>{activeGraph.rooms.length} комнат</span>
                </div>
              )}
            </div>

            {/* Canvas Area */}
            <div className="relative flex-1 min-h-[300px] rounded-xl overflow-hidden border border-zinc-800 bg-[#090d16] flex items-center justify-center">
              <canvas
                ref={canvasPreviewRef}
                width={560}
                height={380}
                className="w-full h-full object-contain"
              />

              {/* Legend Badges */}
              <div className="absolute bottom-2.5 left-2.5 flex flex-wrap items-center gap-2 text-[10px] bg-zinc-900/90 backdrop-blur px-2.5 py-1 rounded-lg border border-zinc-800">
                <span className="flex items-center gap-1 text-emerald-400">
                  <span className="w-2.5 h-1 bg-emerald-500 rounded-full" /> Несущие стены
                </span>
                <span className="flex items-center gap-1 text-amber-400">
                  <span className="w-2.5 h-1 bg-amber-500 rounded-full" /> Перегородки
                </span>
                <span className="flex items-center gap-1 text-rose-400">
                  <span className="w-2 h-2 rounded-full bg-rose-500" /> Двери
                </span>
                <span className="flex items-center gap-1 text-sky-400">
                  <span className="w-2 h-2 rounded-full bg-sky-500" /> Окна
                </span>
              </div>
            </div>

            {/* Room Explication Tags */}
            {activeGraph?.rooms && activeGraph.rooms.length > 0 && (
              <div className="flex flex-wrap gap-1.5 max-h-16 overflow-y-auto">
                {activeGraph.rooms.map((room) => (
                  <span
                    key={room.id}
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-medium border"
                    style={{
                      backgroundColor: `${room.color}15`,
                      borderColor: `${room.color}40`,
                      color: room.color,
                    }}
                  >
                    <span>{room.name}</span>
                    <span className="font-mono font-bold opacity-90">{room.areaSqM}м²</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Progress Bar during 3D Build */}
        {progress && (
          <div className="px-6 py-2.5 border-t border-emerald-500/30 bg-emerald-500/10 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold text-emerald-400">
              <span className="flex items-center gap-2">
                {progress.step === 'complete' ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                <span>{progress.message}</span>
              </span>
              <span className="font-mono">{progress.current}/{progress.total}</span>
            </div>
            <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all duration-200"
                style={{
                  width: `${Math.round((progress.current / Math.max(1, progress.total)) * 100)}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-800 px-6 py-4 bg-zinc-950/80">
          <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-400">
            {/* Stage 3 Visual Toggles */}
            <label className="flex items-center gap-1.5 text-xs text-zinc-300 cursor-pointer select-none bg-zinc-900 border border-zinc-800 px-2.5 py-1 rounded-lg hover:border-zinc-700">
              <input
                type="checkbox"
                checked={optFinishes}
                onChange={(e) => setOptFinishes(e.target.checked)}
                className="rounded border-zinc-700 text-emerald-500 focus:ring-emerald-500/20"
              />
              <span>✨ PBR Отделка & Плинтусы</span>
            </label>

            <label className="flex items-center gap-1.5 text-xs text-zinc-300 cursor-pointer select-none bg-zinc-900 border border-zinc-800 px-2.5 py-1 rounded-lg hover:border-zinc-700">
              <input
                type="checkbox"
                checked={optFurniture}
                onChange={(e) => setOptFurniture(e.target.checked)}
                className="rounded border-zinc-700 text-emerald-500 focus:ring-emerald-500/20"
              />
              <span>🛋️ Мебель & Ландшафт</span>
            </label>

            <label className="flex items-center gap-1.5 text-xs text-zinc-300 cursor-pointer select-none bg-zinc-900 border border-zinc-800 px-2.5 py-1 rounded-lg hover:border-zinc-700">
              <input
                type="checkbox"
                checked={optRoof}
                onChange={(e) => setOptRoof(e.target.checked)}
                className="rounded border-zinc-700 text-emerald-500 focus:ring-emerald-500/20"
              />
              <span>🏠 Скатная кровля</span>
            </label>

            <label className="flex items-center gap-1.5 text-xs text-zinc-300 cursor-pointer select-none bg-zinc-900 border border-zinc-800 px-2.5 py-1 rounded-lg hover:border-zinc-700">
              <input
                type="checkbox"
                checked={optCeilings}
                onChange={(e) => setOptCeilings(e.target.checked)}
                className="rounded border-zinc-700 text-emerald-500 focus:ring-emerald-500/20"
              />
              <span>🏢 Потолки</span>
            </label>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="px-4 py-2 text-xs font-semibold text-zinc-400 hover:bg-zinc-800 hover:text-white rounded-xl transition"
            >
              Отмена
            </button>

            <button
              onClick={handleBuildIn3DEditor}
              disabled={isProcessing || !activeGraph}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-600/30 transition active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Возведение 3D-дома...</span>
                </>
              ) : (
                <>
                  <Building className="h-4 w-4" />
                  <span>Собрать 3D-дом & Смета</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
