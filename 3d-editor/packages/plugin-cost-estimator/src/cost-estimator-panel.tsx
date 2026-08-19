import { useScene } from '@pascal-app/core'
import { SegmentedControl } from '@pascal-app/editor'
import React, { useMemo } from 'react'
import { create } from 'zustand'

// Поставщики газоблока в Крыму
const GASBLOCK_SUPPLIERS = [
  { id: 'massiv', name: 'Завод «Массив» (Симферополь)', price: 7900 },
  { id: 'glavstroy', name: 'Завод «ГлавСтрой-Блок» (Симферополь)', price: 8200 },
  { id: 'kerch_gaz', name: 'ООО «Крымский Газобетон» (Керчь)', price: 8100 },
  { id: 'vkblock', name: '«ВКБлок» (Доставка по Крыму)', price: 8500 },
]

// Поставщики бетона в Крыму
const CONCRETE_SUPPLIERS = [
  { id: 'kerch_beton', name: 'БЗ «Керчь-Бетон» (Керчь)', price: 6900 },
  { id: 'krym_beton', name: 'ТПК «Крым-Бетон» (Симферополь)', price: 7200 },
  { id: 'monolith', name: 'ООО «Монолит-Крым» (Севастополь)', price: 7400 },
  { id: 'yug_beton', name: 'Завод «ЮгБетон» (Ялта/Алушта)', price: 7600 },
]

// Поставщики кровельных материалов в Крыму
const ROOF_SUPPLIERS = [
  { id: 'metall_profil', name: '«Металл Профиль Крым» (Металлочерепица 0.5мм)', price: 2450 },
  { id: 'krym_krovlya', name: '«КрымКровля» (Премиум металлочерепица)', price: 2650 },
  { id: 'techno_krovlya', name: '«Крым-ТехноКровля» (Мягкая гибкая черепица)', price: 2950 },
]

// Производители окон в Крыму
const WINDOW_SUPPLIERS = [
  { id: 'lider_kerch', name: 'Завод «Окна Лидер Керчь» (5-камерные)', price: 11800 },
  { id: 'krym_okna', name: 'Фабрика «Крымские Окна» (Rehau 70mm)', price: 12500 },
  { id: 'nova_okna', name: 'ООО «Нова Окна» (Симферополь/Севастополь)', price: 13200 },
]

// Населенные пункты Крыма и стоимость логистики
const CRIMEA_CITIES = [
  { id: 'kerch', name: 'г. Керчь', deliveryBase: 2500 },
  { id: 'simferopol', name: 'г. Симферополь', deliveryBase: 4500 },
  { id: 'sevastopol', name: 'г. Севастополь', deliveryBase: 5500 },
  { id: 'yalta', name: 'г. Ялта (ЮБК)', deliveryBase: 6500 },
  { id: 'feodosia', name: 'г. Феодосия', deliveryBase: 3500 },
  { id: 'evpatoria', name: 'г. Евпатория', deliveryBase: 5000 },
  { id: 'alushta', name: 'г. Алушта', deliveryBase: 6000 },
  { id: 'dzhankoy', name: 'г. Джанкой', deliveryBase: 4800 },
  { id: 'bakhchysarai', name: 'г. Бахчисарай', deliveryBase: 5200 },
]

const LABOR_RATES = { concrete: 3500, wall: 2500, roof: 1800, window: 2000, door: 3000 }

// Модульное глобальное хранилище Zustand — сохраняет выбор при перерисовках
interface EstimatorState {
  includeLabor: boolean
  selectedCityId: string
  customAddress: string
  gasblockSupplierId: string
  concreteSupplierId: string
  roofSupplierId: string
  windowSupplierId: string
  showLogs: boolean
  useDemoFallback: boolean

  setIncludeLabor: (val: boolean) => void
  setSelectedCityId: (val: string) => void
  setCustomAddress: (val: string) => void
  setGasblockSupplierId: (val: string) => void
  setConcreteSupplierId: (val: string) => void
  setRoofSupplierId: (val: string) => void
  setWindowSupplierId: (val: string) => void
  setShowLogs: (val: boolean) => void
  setUseDemoFallback: (val: boolean) => void
}

const useEstimatorStore = create<EstimatorState>((set) => ({
  includeLabor: false,
  selectedCityId: 'kerch',
  customAddress: '',
  gasblockSupplierId: 'massiv',
  concreteSupplierId: 'kerch_beton',
  roofSupplierId: 'metall_profil',
  windowSupplierId: 'lider_kerch',
  showLogs: false,
  useDemoFallback: false,

  setIncludeLabor: (includeLabor) => set({ includeLabor }),
  setSelectedCityId: (selectedCityId) => set({ selectedCityId }),
  setCustomAddress: (customAddress) => set({ customAddress }),
  setGasblockSupplierId: (gasblockSupplierId) => set({ gasblockSupplierId }),
  setConcreteSupplierId: (concreteSupplierId) => set({ concreteSupplierId }),
  setRoofSupplierId: (roofSupplierId) => set({ roofSupplierId }),
  setWindowSupplierId: (windowSupplierId) => set({ windowSupplierId }),
  setShowLogs: (showLogs) => set({ showLogs }),
  setUseDemoFallback: (useDemoFallback) => set({ useDemoFallback }),
}))

function safeNum(val: any, fallback = 0): number {
  const n = Number(val)
  return Number.isFinite(n) ? n : fallback
}

function safeFormatMoney(val: any): string {
  return Math.round(safeNum(val, 0)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

function getShortSupplierName(name?: string): string {
  if (!name) return ''
  const parts = name.split('(')
  return (parts[0] ?? '').trim()
}

// Извлечение 2D-координат плоскости (X, Z) из любого формата точки (2D [x,z] или 3D [x,y,z])
function getPoint2D(p: any): [number, number] {
  if (!Array.isArray(p) || p.length < 2) return [0, 0]
  const x = safeNum(p[0])
  const z = safeNum(p.length >= 3 ? p[2] : p[1])
  return [x, z]
}

function calculatePolygonArea(polygon?: any): number {
  if (!Array.isArray(polygon) || polygon.length < 3) return 0
  try {
    let area = 0
    for (let i = 0; i < polygon.length; i++) {
      const [x1, z1] = getPoint2D(polygon[i])
      const [x2, z2] = getPoint2D(polygon[(i + 1) % polygon.length])
      area += x1 * z2 - x2 * z1
    }
    return Math.abs(area) / 2
  } catch { return 0 }
}

class LocalPanelErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: string; resetCount: number }
> {
  state = { hasError: false, error: '', resetCount: 0 }
  static getDerivedStateFromError(e: Error) { return { hasError: true, error: e?.message || String(e) } }
  componentDidCatch(e: Error) { console.error('[CostEstimatorPanel] Error:', e) }
  render() {
    if (this.state.hasError) return (
      <div className="p-4 text-xs text-amber-600 bg-amber-50 rounded border border-amber-200 pointer-events-auto">
        <p className="font-semibold">⚠️ Расчет сметы обновлен</p>
        <p className="mt-1 text-[10px] break-all">{this.state.error}</p>
        <button
          type="button"
          onClick={() => this.setState((s) => ({ hasError: false, error: '', resetCount: s.resetCount + 1 }))}
          className="mt-3 px-3 py-1 bg-amber-200 text-amber-900 rounded text-xs font-medium hover:bg-amber-300 pointer-events-auto"
        >
          Восстановить панель
        </button>
      </div>
    )
    return <div key={this.state.resetCount} className="w-full h-full flex flex-col min-h-0">{this.props.children}</div>
  }
}

export default function CostEstimatorPanel() {
  return (
    <div className="notranslate w-full h-full flex flex-col overflow-hidden min-h-0 pointer-events-auto" translate="no">
      <LocalPanelErrorBoundary>
        <CostEstimatorPanelInner />
      </LocalPanelErrorBoundary>
    </div>
  )
}

function CostEstimatorPanelInner() {
  // Подписка на 3D сцену
  const nodes = useScene((state) => state?.nodes || {})

  // Хранилище настроек
  const includeLabor = useEstimatorStore((s) => s.includeLabor)
  const selectedCityId = useEstimatorStore((s) => s.selectedCityId)
  const customAddress = useEstimatorStore((s) => s.customAddress)
  const gasblockSupplierId = useEstimatorStore((s) => s.gasblockSupplierId)
  const concreteSupplierId = useEstimatorStore((s) => s.concreteSupplierId)
  const roofSupplierId = useEstimatorStore((s) => s.roofSupplierId)
  const windowSupplierId = useEstimatorStore((s) => s.windowSupplierId)
  const showLogs = useEstimatorStore((s) => s.showLogs)
  const useDemoFallback = useEstimatorStore((s) => s.useDemoFallback)

  const setIncludeLabor = useEstimatorStore((s) => s.setIncludeLabor)
  const setSelectedCityId = useEstimatorStore((s) => s.setSelectedCityId)
  const setCustomAddress = useEstimatorStore((s) => s.setCustomAddress)
  const setGasblockSupplierId = useEstimatorStore((s) => s.setGasblockSupplierId)
  const setConcreteSupplierId = useEstimatorStore((s) => s.setConcreteSupplierId)
  const setRoofSupplierId = useEstimatorStore((s) => s.setRoofSupplierId)
  const setWindowSupplierId = useEstimatorStore((s) => s.setWindowSupplierId)
  const setShowLogs = useEstimatorStore((s) => s.setShowLogs)
  const setUseDemoFallback = useEstimatorStore((s) => s.setUseDemoFallback)

  const selectedGasblock = GASBLOCK_SUPPLIERS.find((s) => s.id === gasblockSupplierId) || GASBLOCK_SUPPLIERS[0]
  const selectedConcrete = CONCRETE_SUPPLIERS.find((s) => s.id === concreteSupplierId) || CONCRETE_SUPPLIERS[0]
  const selectedRoof = ROOF_SUPPLIERS.find((s) => s.id === roofSupplierId) || ROOF_SUPPLIERS[0]
  const selectedWindow = WINDOW_SUPPLIERS.find((s) => s.id === windowSupplierId) || WINDOW_SUPPLIERS[0]
  const selectedCity = CRIMEA_CITIES.find((c) => c.id === selectedCityId) || CRIMEA_CITIES[0]

  // Подсчет объемов строго из 3D сцены
  const { stats, logs, counts } = useMemo(() => {
    let wallVolume = 0
    let slabVolume = 0
    let roofArea = 0
    let windowArea = 0
    let doorCount = 0

    let wallCount = 0
    let slabCount = 0
    let roofCount = 0
    let windowCount = 0

    const logsList: string[] = []
    const nodeList = Object.values(nodes || {})

    logsList.push(`[INIT] Всех узлов в 3D: ${nodeList.length}`)

    nodeList.forEach((node: any) => {
      if (!node || typeof node !== 'object') return
      const type = String(node.type || node.kind || '').toLowerCase()
      const safeId = node.id ? String(node.id).slice(0, 6) : 'elem'

      if (type === 'wall') {
        wallCount++
        const thickness = safeNum(node.thickness, 0.3)
        const height = safeNum(node.height, 2.8)
        let length = 0

        if (Array.isArray(node.start) && Array.isArray(node.end)) {
          const [x1, z1] = getPoint2D(node.start)
          const [x2, z2] = getPoint2D(node.end)
          length = safeNum(Math.hypot(x2 - x1, z2 - z1), 0)
        }
        if (length === 0 && node.length) {
          length = safeNum(node.length, 4.0)
        }
        if (length === 0) length = 4.0

        const vol = safeNum(length * height * thickness, 0)
        wallVolume += vol
        logsList.push(`[WALL #${wallCount}] ${safeId}: L=${length.toFixed(2)}м, H=${height}м, T=${thickness}м -> ${vol.toFixed(2)}м³`)

      } else if (type === 'slab') {
        slabCount++
        let area = 0
        if (node.polygon) {
          area = calculatePolygonArea(node.polygon)
        }
        if (area === 0 && node.area) {
          area = safeNum(node.area)
        }
        if (area === 0 && node.width && node.depth) {
          area = safeNum(node.width) * safeNum(node.depth)
        }
        if (area === 0) area = 15.0

        const thickness = safeNum(node.thickness, 0.2)
        const vol = safeNum(area * thickness, 0)
        slabVolume += vol
        logsList.push(`[SLAB #${slabCount}] ${safeId}: S=${area.toFixed(2)}м², T=${thickness}м -> ${vol.toFixed(2)}м³`)

      } else if (type === 'roof' || type === 'roof-segment') {
        roofCount++
        let area = 0
        if (node.width && node.depth) {
          const oh = safeNum(node.overhang, 0.3)
          const baseArea = (safeNum(node.width) + 2 * oh) * (safeNum(node.depth) + 2 * oh)
          const pitch = safeNum(node.pitch, 30)
          const cosPitch = Math.max(0.5, Math.cos((pitch * Math.PI) / 180))
          area = baseArea / cosPitch
        }
        if (area === 0 && node.polygon) {
          area = calculatePolygonArea(node.polygon)
        }
        if (area === 0 && node.area) {
          area = safeNum(node.area)
        }
        if (area === 0) area = 40.0

        roofArea += area
        logsList.push(`[ROOF #${roofCount}] ${safeId}: ${area.toFixed(2)}м²`)

      } else if (type === 'window') {
        windowCount++
        const width = safeNum(node.width, 1.5)
        const height = safeNum(node.height, 1.5)
        const area = safeNum(width * height, 2.25)
        windowArea += area
        logsList.push(`[WINDOW #${windowCount}] ${safeId}: ${width}x${height}м -> ${area.toFixed(2)}м²`)

      } else if (type === 'door') {
        doorCount++
        logsList.push(`[DOOR #${doorCount}] ${safeId}: 1 шт`)
      }
    })

    const hasRealBuilding = wallCount > 0 || slabCount > 0 || roofCount > 0 || windowCount > 0 || doorCount > 0

    // Если включен демо-режим (или пользователь его активировал для показа примера)
    if (useDemoFallback && !hasRealBuilding) {
      wallVolume = 33.65
      slabVolume = 15.0
      roofArea = 40.0
      windowArea = 4.5
      doorCount = 1
      logsList.push('[DEMO] Применен пример дома 8×8м (демо-режим)')
    }

    return {
      stats: {
        wallVolume: safeNum(wallVolume),
        slabVolume: safeNum(slabVolume),
        roofArea: safeNum(roofArea),
        windowArea: safeNum(windowArea),
        doorCount: safeNum(doorCount),
        hasRealBuilding,
      },
      counts: { wallCount, slabCount, roofCount, windowCount, doorCount },
      logs: logsList,
    }
  }, [nodes, useDemoFallback])

  // Строгий расчет стоимости по факту присутствия элементов в 3D сцене
  const matFoundation = Math.round(stats.slabVolume * (selectedConcrete?.price ?? 7200))
  const matWalls = Math.round(stats.wallVolume * (selectedGasblock?.price ?? 8000))
  const matRoof = Math.round(stats.roofArea * (selectedRoof?.price ?? 2500))
  const matWindows = Math.round(stats.windowArea * (selectedWindow?.price ?? 12000))
  const matDoors = Math.round(stats.doorCount * 15000)
  const totalMaterials = matFoundation + matWalls + matRoof + matWindows + matDoors

  const laborFoundation = Math.round(stats.slabVolume * LABOR_RATES.concrete)
  const laborWalls = Math.round(stats.wallVolume * LABOR_RATES.wall)
  const laborRoof = Math.round(stats.roofArea * LABOR_RATES.roof)
  const laborWindows = Math.round(stats.windowArea * LABOR_RATES.window)
  const laborDoors = Math.round(stats.doorCount * LABOR_RATES.door)
  const totalLabor = includeLabor ? laborFoundation + laborWalls + laborRoof + laborWindows + laborDoors : 0

  const hasAnyVolume = stats.slabVolume > 0 || stats.wallVolume > 0 || stats.roofArea > 0
  const estimatedTrips = hasAnyVolume ? Math.max(1, Math.ceil((stats.slabVolume + stats.wallVolume) / 10)) : 0
  const totalDelivery = hasAnyVolume ? Math.round(estimatedTrips * (selectedCity?.deliveryBase ?? 3500)) : 0
  const grandTotal = totalMaterials + totalLabor + totalDelivery

  const btnSupplier = (isActive: boolean) =>
    `p-2 text-left rounded-lg border text-xs transition-all pointer-events-auto cursor-pointer select-none ${
      isActive
        ? 'border-primary bg-primary/10 text-primary font-semibold ring-2 ring-primary/40 shadow-sm'
        : 'bg-background hover:bg-muted/80 text-foreground border-border/70 hover:border-primary/50'
    }`

  const btnCity = (isActive: boolean) =>
    `p-1.5 text-center rounded text-[11px] border transition-all pointer-events-auto cursor-pointer select-none ${
      isActive
        ? 'border-primary bg-primary text-primary-foreground font-semibold shadow-sm ring-1 ring-primary'
        : 'bg-background hover:bg-muted text-muted-foreground border-border/50'
    }`

  return (
    <div
      onPointerDown={(e) => e.stopPropagation()}
      className="pointer-events-auto flex flex-col gap-4 p-4 text-sm text-foreground overflow-y-auto max-h-full"
    >
      {/* Заголовок */}
      <div className="flex items-center justify-between border-b pb-2">
        <div>
          <h2 className="text-lg font-semibold leading-tight"><span>Смета строительства</span></h2>
          <div className="text-[11px] text-muted-foreground"><span>Крымские поставщики 2026</span></div>
        </div>
        <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded font-mono font-medium">
          Крым 2026
        </span>
      </div>

      {/* Сообщение если 3D сцена пустая */}
      <div>
        {!stats.hasRealBuilding && !useDemoFallback && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs flex flex-col gap-2">
            <div className="font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
              <span>🏗️</span>
              <span>На холсте нет построенных элементов</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              <span>Постройте стены, фундамент или кровлю в 3D редакторе — стоимость рассчитается автоматически в реальном времени.</span>
            </p>
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation()
                setUseDemoFallback(true)
              }}
              className="self-start px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-700 dark:text-amber-300 text-[11px] font-medium rounded transition-colors"
            >
              <span>👁️ Показать пример сметы (Дом 8×8м)</span>
            </button>
          </div>
        )}

        {useDemoFallback && !stats.hasRealBuilding && (
          <div className="p-2.5 bg-sky-500/10 border border-sky-500/30 rounded-lg text-xs flex items-center justify-between">
            <span className="text-sky-700 dark:text-sky-300 font-medium">ℹ️ Отображается пример дома 8×8м</span>
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation()
                setUseDemoFallback(false)
              }}
              className="text-[10px] px-2 py-0.5 bg-sky-500/20 hover:bg-sky-500/30 text-sky-800 dark:text-sky-200 rounded font-medium"
            >
              <span>Сбросить (0 ₽)</span>
            </button>
          </div>
        )}
      </div>

      {/* 1. Режим расчета */}
      <div className="flex flex-col gap-1.5" onPointerDown={(e) => e.stopPropagation()}>
        <label className="text-xs font-semibold text-muted-foreground"><span>Режим расчета:</span></label>
        <SegmentedControl
          value={includeLabor ? 'labor' : 'materials'}
          onChange={(val) => setIncludeLabor(val === 'labor')}
          options={[
            { label: 'Только материалы', value: 'materials' },
            { label: 'Материалы + Работа', value: 'labor' },
          ]}
        />
      </div>

      {/* 2. Город доставки */}
      <div className="flex flex-col gap-2 p-2.5 bg-muted/40 rounded-lg border">
        <label className="text-xs font-semibold text-muted-foreground"><span>📍 Город доставки в Крыму:</span></label>
        <div className="grid grid-cols-3 gap-1.5 max-h-36 overflow-y-auto pr-0.5">
          {CRIMEA_CITIES.map((city) => (
            <button
              key={city.id}
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation()
                setSelectedCityId(city.id)
              }}
              className={btnCity(selectedCityId === city.id)}
            >
              <div className="truncate font-medium"><span>{city.name.replace('г. ', '')}</span></div>
              <div className="text-[9px] opacity-90 font-mono mt-0.5"><span>{safeFormatMoney(city.deliveryBase)} ₽</span></div>
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="Улица, дом или название поселка..."
          value={customAddress}
          onChange={(e) => setCustomAddress(e.target.value)}
          onPointerDown={(e) => e.stopPropagation()}
          className="w-full text-xs p-1.5 mt-1 rounded border bg-background text-foreground"
        />
      </div>

      {/* 3. Выбор заводов и поставщиков */}
      <div className="flex flex-col gap-3.5 p-2.5 bg-muted/40 rounded-lg border">
        <label className="text-xs font-semibold text-muted-foreground"><span>🏭 Подрядчики и заводы в Крыму:</span></label>
        <div className="flex flex-col gap-3 text-xs">
          {/* Газобетон */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center text-[11px]">
              <span className="font-semibold text-muted-foreground">Газобетонный блок:</span>
              <span className="font-bold text-primary font-mono bg-primary/10 px-2 py-0.5 rounded">
                {safeFormatMoney(selectedGasblock?.price)} ₽/м³
              </span>
            </div>
            {stats.wallVolume === 0 && !useDemoFallback && (
              <div className="text-[10px] text-muted-foreground italic">
                <span>(Стены в 3D пока не построены)</span>
              </div>
            )}
            <div className="grid grid-cols-2 gap-1.5">
              {GASBLOCK_SUPPLIERS.map((s) => {
                const isActive = gasblockSupplierId === s.id
                return (
                  <button
                    key={s.id}
                    type="button"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation()
                      setGasblockSupplierId(s.id)
                    }}
                    className={btnSupplier(isActive)}
                  >
                    <div className="flex justify-between items-start">
                      <span className="font-medium text-[11px] leading-tight truncate pr-1">
                        {getShortSupplierName(s?.name)}
                      </span>
                      {isActive && <span className="text-[10px] text-primary font-bold">✓</span>}
                    </div>
                    <div className="text-[10px] font-mono mt-1 opacity-90 font-semibold">
                      <span>{safeFormatMoney(s.price)} ₽/м³</span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Бетон */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center text-[11px]">
              <span className="font-semibold text-muted-foreground">Товарный бетон (Фундамент):</span>
              <span className="font-bold text-primary font-mono bg-primary/10 px-2 py-0.5 rounded">
                {safeFormatMoney(selectedConcrete?.price)} ₽/м³
              </span>
            </div>
            {stats.slabVolume === 0 && !useDemoFallback && (
              <div className="text-[10px] text-muted-foreground italic">
                <span>(Фундамент/плита в 3D пока не построена)</span>
              </div>
            )}
            <div className="grid grid-cols-2 gap-1.5">
              {CONCRETE_SUPPLIERS.map((s) => {
                const isActive = concreteSupplierId === s.id
                return (
                  <button
                    key={s.id}
                    type="button"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation()
                      setConcreteSupplierId(s.id)
                    }}
                    className={btnSupplier(isActive)}
                  >
                    <div className="flex justify-between items-start">
                      <span className="font-medium text-[11px] leading-tight truncate pr-1">
                        {getShortSupplierName(s?.name)}
                      </span>
                      {isActive && <span className="text-[10px] text-primary font-bold">✓</span>}
                    </div>
                    <div className="text-[10px] font-mono mt-1 opacity-90 font-semibold">
                      <span>{safeFormatMoney(s.price)} ₽/м³</span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Кровля */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center text-[11px]">
              <span className="font-semibold text-muted-foreground">Кровельное покрытие:</span>
              <span className="font-bold text-primary font-mono bg-primary/10 px-2 py-0.5 rounded">
                {safeFormatMoney(selectedRoof?.price)} ₽/м²
              </span>
            </div>
            {stats.roofArea === 0 && !useDemoFallback && (
              <div className="text-[10px] text-muted-foreground italic">
                <span>(Кровля в 3D пока не построена)</span>
              </div>
            )}
            <div className="grid grid-cols-2 gap-1.5">
              {ROOF_SUPPLIERS.map((s) => {
                const isActive = roofSupplierId === s.id
                return (
                  <button
                    key={s.id}
                    type="button"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation()
                      setRoofSupplierId(s.id)
                    }}
                    className={btnSupplier(isActive)}
                  >
                    <div className="flex justify-between items-start">
                      <span className="font-medium text-[11px] leading-tight truncate pr-1">
                        {getShortSupplierName(s?.name)}
                      </span>
                      {isActive && <span className="text-[10px] text-primary font-bold">✓</span>}
                    </div>
                    <div className="text-[10px] font-mono mt-1 opacity-90 font-semibold">
                      <span>{safeFormatMoney(s.price)} ₽/м²</span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Окна */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center text-[11px]">
              <span className="font-semibold text-muted-foreground">Оконные системы:</span>
              <span className="font-bold text-primary font-mono bg-primary/10 px-2 py-0.5 rounded">
                {safeFormatMoney(selectedWindow?.price)} ₽/м²
              </span>
            </div>
            {stats.windowArea === 0 && !useDemoFallback && (
              <div className="text-[10px] text-muted-foreground italic">
                <span>(Окна в 3D пока не добавлены)</span>
              </div>
            )}
            <div className="grid grid-cols-2 gap-1.5">
              {WINDOW_SUPPLIERS.map((s) => {
                const isActive = windowSupplierId === s.id
                return (
                  <button
                    key={s.id}
                    type="button"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation()
                      setWindowSupplierId(s.id)
                    }}
                    className={btnSupplier(isActive)}
                  >
                    <div className="flex justify-between items-start">
                      <span className="font-medium text-[11px] leading-tight truncate pr-1">
                        {getShortSupplierName(s?.name)}
                      </span>
                      {isActive && <span className="text-[10px] text-primary font-bold">✓</span>}
                    </div>
                    <div className="text-[10px] font-mono mt-1 opacity-90 font-semibold">
                      <span>{safeFormatMoney(s.price)} ₽/м²</span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 4. Детализация расчета */}
      <div className="flex flex-col gap-2 pt-1 border-t">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          <span>Детализация расчета:</span>
        </h3>

        <div className="flex justify-between items-center text-xs">
          <span>Фундамент / Перекрытия:</span>
          <span className="font-semibold">{safeFormatMoney(matFoundation + (includeLabor ? laborFoundation : 0))} ₽</span>
        </div>
        <div className="text-[11px] text-muted-foreground text-right -mt-1 mb-1">
          {stats.slabVolume > 0 ? (
            <span>
              <span>{safeNum(stats.slabVolume).toFixed(2)} м³ бетона × {safeFormatMoney(selectedConcrete?.price)} ₽/м³</span>
              {counts.slabCount > 0 && <span className="opacity-80"> ({counts.slabCount} шт в 3D)</span>}
              {includeLabor && <span> + работа ({safeFormatMoney(laborFoundation)} ₽)</span>}
            </span>
          ) : (
            <span className="italic opacity-70">0.00 м³ (не построены в 3D)</span>
          )}
        </div>

        <div className="flex justify-between items-center text-xs">
          <span>Стены (Газоблок):</span>
          <span className="font-semibold">{safeFormatMoney(matWalls + (includeLabor ? laborWalls : 0))} ₽</span>
        </div>
        <div className="text-[11px] text-muted-foreground text-right -mt-1 mb-1">
          {stats.wallVolume > 0 ? (
            <span>
              <span>{safeNum(stats.wallVolume).toFixed(2)} м³ × {safeFormatMoney(selectedGasblock?.price)} ₽/м³</span>
              {counts.wallCount > 0 && <span className="opacity-80"> ({counts.wallCount} стен в 3D)</span>}
              {includeLabor && <span> + работа ({safeFormatMoney(laborWalls)} ₽)</span>}
            </span>
          ) : (
            <span className="italic opacity-70">0.00 м³ (не построены в 3D)</span>
          )}
        </div>

        <div className="flex justify-between items-center text-xs">
          <span>Кровля:</span>
          <span className="font-semibold">{safeFormatMoney(matRoof + (includeLabor ? laborRoof : 0))} ₽</span>
        </div>
        <div className="text-[11px] text-muted-foreground text-right -mt-1 mb-1">
          {stats.roofArea > 0 ? (
            <span>
              <span>{safeNum(stats.roofArea).toFixed(2)} м² × {safeFormatMoney(selectedRoof?.price)} ₽/м²</span>
              {counts.roofCount > 0 && <span className="opacity-80"> ({counts.roofCount} элементов в 3D)</span>}
              {includeLabor && <span> + работа ({safeFormatMoney(laborRoof)} ₽)</span>}
            </span>
          ) : (
            <span className="italic opacity-70">0.00 м² (не построена в 3D)</span>
          )}
        </div>

        <div className="flex justify-between items-center text-xs">
          <span>Оконные блоки:</span>
          <span className="font-semibold">{safeFormatMoney(matWindows + (includeLabor ? laborWindows : 0))} ₽</span>
        </div>
        <div className="text-[11px] text-muted-foreground text-right -mt-1 mb-1">
          {stats.windowArea > 0 ? (
            <span>
              <span>{safeNum(stats.windowArea).toFixed(2)} м² × {safeFormatMoney(selectedWindow?.price)} ₽/м²</span>
              {counts.windowCount > 0 && <span className="opacity-80"> ({counts.windowCount} окон в 3D)</span>}
              {includeLabor && <span> + работа ({safeFormatMoney(laborWindows)} ₽)</span>}
            </span>
          ) : (
            <span className="italic opacity-70">0.00 м² (не добавлены в 3D)</span>
          )}
        </div>

        <div className="flex justify-between items-center text-xs border-b pb-2">
          <span>Двери:</span>
          <span className="font-semibold">{safeFormatMoney(matDoors + (includeLabor ? laborDoors : 0))} ₽</span>
        </div>
        <div className="text-[11px] text-muted-foreground text-right -mt-1 mb-1">
          {stats.doorCount > 0 ? (
            <span>
              <span>{safeNum(stats.doorCount)} шт × 15 000 ₽/шт</span>
              {includeLabor && <span> + работа ({safeFormatMoney(laborDoors)} ₽)</span>}
            </span>
          ) : (
            <span className="italic opacity-70">0 шт (не добавлены в 3D)</span>
          )}
        </div>

        <div className="flex justify-between items-center text-xs pt-1 text-sky-600 dark:text-sky-400 font-medium">
          <span>🚚 Доставка ({selectedCity?.name ?? 'Крым'}{estimatedTrips > 0 ? `, ${estimatedTrips} ${estimatedTrips === 1 ? 'рейс' : 'рейса'}` : ''}):</span>
          <span>{safeFormatMoney(totalDelivery)} ₽</span>
        </div>
      </div>

      {/* ИТОГО */}
      <div className="flex justify-between items-center mt-2 pt-3 border-t-2 text-base font-bold text-primary bg-primary/5 p-2.5 rounded-lg">
        <div className="flex flex-col">
          <span>ИТОГО:</span>
          <span className="text-[10px] font-normal text-muted-foreground">
            {includeLabor ? 'Материалы + Работы + Доставка' : 'Только материалы + Доставка'}
          </span>
        </div>
        <span className="text-xl font-extrabold">{safeFormatMoney(grandTotal)} ₽</span>
      </div>

      {/* Логи 3D объекта */}
      <div className="mt-2 border-t pt-3">
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation()
            setShowLogs(!showLogs)
          }}
          className="flex items-center justify-between w-full text-xs font-semibold text-muted-foreground hover:text-foreground py-1"
        >
          <span>🤖 Логи сметчика (анализ 3D сцены)</span>
          <span>{showLogs ? '▲' : '▼'}</span>
        </button>
        {showLogs && (
          <div className="mt-2 flex flex-col gap-2">
            <div className="p-2 bg-muted/60 rounded text-[10px] font-mono leading-relaxed space-y-1 max-h-48 overflow-y-auto border">
              {logs.map((log, i) => (
                <div
                  key={i}
                  className={
                    log.includes('⚠️')
                      ? 'text-amber-500 font-semibold'
                      : log.includes('[INIT]')
                      ? 'text-sky-500'
                      : log.includes('[DEMO]')
                      ? 'text-purple-400'
                      : ''
                  }
                >
                  <span>{log}</span>
                </div>
              ))}
            </div>
            <div className="text-[10px] text-muted-foreground">
              <span>Элементов в 3D сцене: <strong>{Object.keys(nodes).length}</strong></span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
