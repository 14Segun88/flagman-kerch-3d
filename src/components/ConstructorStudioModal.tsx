import React, { useState, useMemo } from 'react';
import { X, Send, FileCheck, Maximize2, Sliders, CheckCircle2, Box } from 'lucide-react';

interface ConstructorStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendProjectToEngineer: (projectDetails: {
    title: string;
    projectId: string;
    specsText: string;
    estimatedPrice: number;
  }) => void;
}

type StudioCategory = 'fence' | 'gate' | 'canopy' | 'house';

export const ConstructorStudioModal: React.FC<ConstructorStudioModalProps> = ({
  isOpen,
  onClose,
  onSendProjectToEngineer,
}) => {
  const [category, setCategory] = useState<StudioCategory>('fence');

  // --- 1. Fence Parameters ---
  const [fenceType, setFenceType] = useState<'profnastil' | 'shtaketnik' | 'gitter3d' | 'zhalyuzi'>('profnastil');
  const [fenceLength, setFenceLength] = useState<number>(40);
  const [fenceHeight, setFenceHeight] = useState<number>(1.8);
  const [fenceColor, setFenceColor] = useState<string>('#334155'); // RAL 7024
  const [fencePillar, setFencePillar] = useState<'60x60' | '80x80' | 'brick'>('60x60');
  const [fenceBaseStrip, setFenceBaseStrip] = useState<boolean>(true);
  const [fenceWicket, setFenceWicket] = useState<boolean>(true);
  const [fenceGateIncluded, setFenceGateIncluded] = useState<boolean>(true);

  // --- 2. Gate Parameters ---
  const [gateType, setGateType] = useState<'sliding' | 'swing'>('sliding');
  const [gateWidth, setGateWidth] = useState<number>(4.0);
  const [gateHeight, setGateHeight] = useState<number>(2.0);
  const [gateAutomation, setGateAutomation] = useState<'came' | 'nice' | 'doorhan' | 'none'>('came');
  const [gateColor, setGateColor] = useState<string>('#334155');
  const [gateWicketInGate, setGateWicketInGate] = useState<boolean>(false);

  // --- 3. Canopy / Gazebo Parameters ---
  const [canopyForm, setCanopyForm] = useState<'arch' | 'single' | 'double'>('arch');
  const [canopyWidth, setCanopyWidth] = useState<number>(5.0);
  const [canopyLength, setCanopyLength] = useState<number>(7.0);
  const [canopyRoofMat, setCanopyRoofMat] = useState<'polycarbonate' | 'metal_tile' | 'soft'>('polycarbonate');
  const [canopyPolyThick, setCanopyPolyThick] = useState<number>(10);
  const [canopyColor, setCanopyColor] = useState<string>('#334155');

  // --- 4. House / Shed Parameters ---
  const [houseArea, setHouseArea] = useState<number>(48);
  const [houseStories, setHouseStories] = useState<number>(1);
  const [houseInsulation, setHouseInsulation] = useState<number>(150);
  const [houseWall, setHouseWall] = useState<'sandwich' | 'siding' | 'proflist'>('sandwich');

  // Colors Palette
  const colorList = [
    { name: 'RAL 7024 (Графитовый антрацит)', hex: '#334155' },
    { name: 'RAL 8017 (Шоколадно-коричневый)', hex: '#451a03' },
    { name: 'RAL 6005 (Зеленый мох)', hex: '#064e3b' },
    { name: 'RAL 3005 (Винно-красный)', hex: '#881337' },
    { name: 'RAL 9005 (Глубокий черный)', hex: '#090d16' },
  ];

  // Dynamic Specification Engine
  const specDetails = useMemo(() => {
    const randomId = Math.floor(1000 + Math.random() * 9000);
    const projectId = `STUDIO-FLG-${randomId}`;
    let title = '';
    let estimatedPrice = 0;
    let steelWeight = 0; // in kg
    let materialsList: string[] = [];

    if (category === 'fence') {
      title = 'Индивидуальная 3D-модель забора';
      const pillars = Math.ceil(fenceLength / 2.5) + (fenceWicket ? 2 : 0) + (fenceGateIncluded ? 2 : 0);
      const basePerM = fenceType === 'zhalyuzi' ? 2400 : fenceType === 'shtaketnik' ? 1800 : fenceType === 'gitter3d' ? 1350 : 1550;
      const baseStripAdd = fenceBaseStrip ? fenceLength * 900 : 0;
      const wicketAdd = fenceWicket ? 14000 : 0;
      const gateAdd = fenceGateIncluded ? 45000 : 0;

      estimatedPrice = Math.round(fenceLength * basePerM * (fenceHeight / 1.8)) + baseStripAdd + wicketAdd + gateAdd;
      steelWeight = Math.round(pillars * 12 + fenceLength * 8);

      materialsList = [
        `Заборный профнастил/панели (${fenceType.toUpperCase()}), высота ${fenceHeight}м, длина ${fenceLength}м`,
        `Опорные столбы ${fencePillar}: ${pillars} шт. (бетонирование на 1.2м)`,
        `Поперечные лаги из профтрубы 40x20х2мм: ${Math.ceil(fenceLength * 2)} пог. м`,
        fenceBaseStrip ? `Армированный ленточный цоколь (ширина 250мм, высота 400мм)` : 'Установка на металлических столбах',
        fenceWicket ? 'Калитка с врезным защелкивающимся замком и ручкой' : '',
        fenceGateIncluded ? 'Воротный проезд в едином стиле забора' : '',
      ].filter(Boolean);

    } else if (category === 'gate') {
      title = '3D-проект ворот с автоматикой';
      const autoPrice = gateAutomation === 'came' ? 29000 : gateAutomation === 'nice' ? 26000 : gateAutomation === 'doorhan' ? 21000 : 0;
      const baseGate = gateType === 'sliding' ? 52000 : 35000;
      const wicketAdd = gateWicketInGate ? 9000 : 0;

      estimatedPrice = Math.round(baseGate * (gateWidth / 4.0)) + autoPrice + wicketAdd;
      steelWeight = Math.round(gateWidth * 45 + 30);

      materialsList = [
        `Ворота ${gateType === 'sliding' ? 'откатные консольные с направляющей балкою' : 'распашные двухстворчатые'}`,
        `Размеры проезда: ширина ${gateWidth}м, высота ${gateHeight}м`,
        `Автоматический привод: ${gateAutomation === 'none' ? 'Без автоматики' : `Итальянский комплект ${gateAutomation.toUpperCase()}`}`,
        `Зубчатая рейка, фотоэлементы безопасности и 2 пульта ДУ`,
        gateWicketInGate ? 'Встроенная врезная калитка со шпингалетом' : 'Без встроенной калитки',
      ];

    } else if (category === 'canopy') {
      title = '3D-проект силового навеса / беседки';
      const area = canopyWidth * canopyLength;
      const roofCost = canopyRoofMat === 'polycarbonate' ? 3400 : canopyRoofMat === 'metal_tile' ? 3900 : 4400;

      estimatedPrice = Math.round(area * roofCost);
      steelWeight = Math.round(area * 18);

      materialsList = [
        `Каркас навеса (${canopyForm === 'arch' ? 'арочный' : canopyForm === 'single' ? 'односкатный' : 'двускатный'})`,
        `Размеры по осям: ${canopyWidth}м х ${canopyLength}м (Площадь: ${area}м²)`,
        `Кровля: ${canopyRoofMat === 'polycarbonate' ? `Сотовый поликарбонат ${canopyPolyThick}мм с УФ-защитой` : canopyRoofMat}`,
        `Опорные стойки 80х80х3мм, фермы перекрытия 40х40х2мм`,
        `Антикоррозийная грунтование и полимерная покраска`,
      ];

    } else {
      title = '3D-проект металлокаркасного здания';
      const sqCost = houseWall === 'sandwich' ? 15000 : 11500;

      estimatedPrice = Math.round(houseArea * sqCost * (houseStories === 2 ? 1.65 : 1.0));
      steelWeight = Math.round(houseArea * 35);

      materialsList = [
        `Каркас здания из ЛСТК / усиленной профильной трубы (${houseArea}м²)`,
        `Этажность: ${houseStories} ${houseStories === 1 ? 'этаж' : 'этажа'}`,
        `Обшивка: ${houseWall === 'sandwich' ? 'Трехслойные стеновые сэндвич-панели' : houseWall}`,
        `Утепление: Негорючая базальтовая плита ${houseInsulation}мм`,
        `Оконные и дверные проемы по ТЗ клиента`,
      ];
    }

    return {
      title,
      projectId,
      estimatedPrice,
      steelWeight,
      materialsList,
    };
  }, [category, fenceType, fenceLength, fenceHeight, fencePillar, fenceBaseStrip, fenceWicket, fenceGateIncluded, fenceColor, gateType, gateWidth, gateHeight, gateAutomation, gateColor, gateWicketInGate, canopyForm, canopyWidth, canopyLength, canopyRoofMat, canopyPolyThick, canopyColor, houseArea, houseStories, houseInsulation, houseWall]);

  if (!isOpen) return null;

  const handleSendToEngineer = () => {
    const specsSummary = `3D СТУДИЯ - ${specDetails.title}\n` + specDetails.materialsList.map(m => `• ${m}`).join('\n');
    onSendProjectToEngineer({
      title: specDetails.title,
      projectId: specDetails.projectId,
      specsText: specsSummary,
      estimatedPrice: specDetails.estimatedPrice,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/95 backdrop-blur-xl overflow-hidden animate-fade-in">
      <div className="relative w-full max-w-7xl h-[94vh] rounded-3xl bg-slate-950 border border-slate-800 shadow-2xl flex flex-col overflow-hidden">
        
        {/* Top Studio Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 p-2 flex items-center justify-center text-amber-400">
              <Box className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-white font-montserrat">
                  3D Студия Конструирования ФЛАГМАН
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 text-[10px] font-mono border border-emerald-800">
                  LIVE 2D/3D Engine
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Сконструируйте ваш объект онлайн и согласуйте готовый чертеж с инженером
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 font-mono">
              <span>ID Проекта:</span>
              <strong className="text-amber-400">{specDetails.projectId}</strong>
            </div>

            <button
              onClick={onClose}
              className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Category Navigation Bar */}
        <div className="px-6 py-3 bg-slate-900/50 border-b border-slate-800/80 flex items-center gap-2 overflow-x-auto shrink-0">
          <button
            onClick={() => setCategory('fence')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 ${
              category === 'fence' ? 'bg-amber-500 text-slate-950 shadow-md glow-amber' : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <span>🚧 1. Конструктор забора</span>
          </button>

          <button
            onClick={() => setCategory('gate')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 ${
              category === 'gate' ? 'bg-amber-500 text-slate-950 shadow-md glow-amber' : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <span>🚪 2. Конструктор ворот</span>
          </button>

          <button
            onClick={() => setCategory('canopy')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 ${
              category === 'canopy' ? 'bg-amber-500 text-slate-950 shadow-md glow-amber' : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <span>⛺ 3. Навесы и Беседки</span>
          </button>

          <button
            onClick={() => setCategory('house')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 ${
              category === 'house' ? 'bg-amber-500 text-slate-950 shadow-md glow-amber' : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <span>🏠 4. Металлокаркасный дом</span>
          </button>
        </div>

        {/* 3-Column Studio Workspace */}
        <div className="flex-1 grid lg:grid-cols-12 overflow-hidden">
          
          {/* Column 1: Left Options & Sliders */}
          <div className="lg:col-span-4 p-6 overflow-y-auto space-y-6 border-r border-slate-800/80 bg-slate-950">
            
            {/* Category 1: FENCE CONTROLS */}
            {category === 'fence' && (
              <div className="space-y-5">
                <div className="text-xs font-bold text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Sliders className="w-4 h-4" />
                  Параметры забора
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-2">Тип заборной секции</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'profnastil', name: 'Профнастил С8' },
                      { id: 'shtaketnik', name: 'Евроштакетник' },
                      { id: 'gitter3d', name: '3D Сетка Gitter' },
                      { id: 'zhalyuzi', name: 'Забор-Жалюзи' },
                    ].map((item) => (
                      <button
                        key={item.id}
                        onClick={() => setFenceType(item.id as any)}
                        className={`p-3 rounded-xl border text-xs font-bold transition-all ${
                          fenceType === item.id ? 'bg-amber-500/20 border-amber-500 text-amber-400' : 'bg-slate-900 border-slate-800 text-slate-300'
                        }`}
                      >
                        {item.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-300 mb-1">
                    <span>Длина периметра:</span>
                    <span className="text-amber-400 font-mono text-sm">{fenceLength} м</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="200"
                    step="5"
                    value={fenceLength}
                    onChange={(e) => setFenceLength(Number(e.target.value))}
                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-300 mb-1">
                    <span>Высота ограждения:</span>
                    <span className="text-amber-400 font-mono text-sm">{fenceHeight} м</span>
                  </div>
                  <div className="flex gap-2">
                    {[1.5, 1.8, 2.0, 2.2].map((h) => (
                      <button
                        key={h}
                        onClick={() => setFenceHeight(h)}
                        className={`flex-1 py-2 rounded-lg border text-xs font-bold ${
                          fenceHeight === h ? 'bg-amber-500 text-slate-950 border-amber-500' : 'bg-slate-900 border-slate-800 text-slate-300'
                        }`}
                      >
                        {h} м
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-2">Опорные столбы</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: '60x60', label: '60x60 мм' },
                      { id: '80x80', label: '80x80 мм' },
                      { id: 'brick', label: 'Кирпичные' },
                    ].map((p) => (
                      <button
                        key={p.id}
                        onClick={() => setFencePillar(p.id as any)}
                        className={`p-2 rounded-lg border text-xs font-bold ${
                          fencePillar === p.id ? 'bg-amber-500 text-slate-950 border-amber-500' : 'bg-slate-900 border-slate-800 text-slate-300'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-2">Цветовое исполнение (RAL)</label>
                  <div className="flex items-center gap-3">
                    {colorList.map((c) => (
                      <button
                        key={c.hex}
                        onClick={() => setFenceColor(c.hex)}
                        className={`w-9 h-9 rounded-full border-2 transition-all ${
                          fenceColor === c.hex ? 'scale-125 border-amber-400 shadow-xl' : 'border-transparent opacity-75 hover:opacity-100'
                        }`}
                        style={{ backgroundColor: c.hex }}
                        title={c.name}
                      />
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800 space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={fenceBaseStrip}
                      onChange={(e) => setFenceBaseStrip(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-800 text-amber-500 focus:ring-amber-500"
                    />
                    <span className="text-xs text-slate-300 font-semibold">Ленточный армированный парапет</span>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={fenceWicket}
                      onChange={(e) => setFenceWicket(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-800 text-amber-500 focus:ring-amber-500"
                    />
                    <span className="text-xs text-slate-300 font-semibold">Калитка с замком в комплекте</span>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={fenceGateIncluded}
                      onChange={(e) => setFenceGateIncluded(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-800 text-amber-500 focus:ring-amber-500"
                    />
                    <span className="text-xs text-slate-300 font-semibold">Воротный проезд в общем стиле</span>
                  </label>
                </div>
              </div>
            )}

            {/* Category 2: GATE CONTROLS */}
            {category === 'gate' && (
              <div className="space-y-5">
                <div className="text-xs font-bold text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Sliders className="w-4 h-4" />
                  Параметры ворот
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-2">Механизм створок</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setGateType('sliding')}
                      className={`p-3 rounded-xl border text-xs font-bold ${
                        gateType === 'sliding' ? 'bg-amber-500 text-slate-950 border-amber-500' : 'bg-slate-900 border-slate-800 text-slate-300'
                      }`}
                    >
                      Откатные консольные
                    </button>
                    <button
                      onClick={() => setGateType('swing')}
                      className={`p-3 rounded-xl border text-xs font-bold ${
                        gateType === 'swing' ? 'bg-amber-500 text-slate-950 border-amber-500' : 'bg-slate-900 border-slate-800 text-slate-300'
                      }`}
                    >
                      Распашные
                    </button>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-300 mb-1">
                    <span>Ширина проезда:</span>
                    <span className="text-amber-400 font-mono text-sm">{gateWidth} м</span>
                  </div>
                  <input
                    type="range"
                    min="3.0"
                    max="6.0"
                    step="0.5"
                    value={gateWidth}
                    onChange={(e) => setGateWidth(Number(e.target.value))}
                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-300 mb-1">
                    <span>Высота створок:</span>
                    <span className="text-amber-400 font-mono text-sm">{gateHeight} м</span>
                  </div>
                  <div className="flex gap-2">
                    {[1.8, 2.0, 2.2].map((gh) => (
                      <button
                        key={gh}
                        onClick={() => setGateHeight(gh)}
                        className={`flex-1 py-2 rounded-lg border text-xs font-bold ${
                          gateHeight === gh ? 'bg-amber-500 text-slate-950 border-amber-500' : 'bg-slate-900 border-slate-800 text-slate-300'
                        }`}
                      >
                        {gh} м
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-2">Цвет рамы (RAL)</label>
                  <div className="flex items-center gap-3">
                    {colorList.map((c) => (
                      <button
                        key={c.hex}
                        onClick={() => setGateColor(c.hex)}
                        className={`w-8 h-8 rounded-full border-2 transition-all ${
                          gateColor === c.hex ? 'scale-125 border-amber-400 shadow-xl' : 'border-transparent opacity-75 hover:opacity-100'
                        }`}
                        style={{ backgroundColor: c.hex }}
                        title={c.name}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-2">Автоматика ворот</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'came', name: 'CAME (Италия)' },
                      { id: 'nice', name: 'NICE (Италия)' },
                      { id: 'doorhan', name: 'DoorHan (РФ)' },
                      { id: 'none', name: 'Без привода' },
                    ].map((a) => (
                      <button
                        key={a.id}
                        onClick={() => setGateAutomation(a.id as any)}
                        className={`p-3 rounded-xl border text-xs font-bold ${
                          gateAutomation === a.id ? 'bg-amber-500/20 border-amber-500 text-amber-400' : 'bg-slate-900 border-slate-800 text-slate-300'
                        }`}
                      >
                        {a.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={gateWicketInGate}
                      onChange={(e) => setGateWicketInGate(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-800 text-amber-500 focus:ring-amber-500"
                    />
                    <span className="text-xs text-slate-300 font-semibold">Встроенная калитка в створку</span>
                  </label>
                </div>
              </div>
            )}

            {/* Category 3: CANOPY CONTROLS */}
            {category === 'canopy' && (
              <div className="space-y-5">
                <div className="text-xs font-bold text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Sliders className="w-4 h-4" />
                  Параметры навеса
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-2">Форма кровли</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'arch', name: 'Арочный' },
                      { id: 'single', name: 'Односкатный' },
                      { id: 'double', name: 'Двускатный' },
                    ].map((f) => (
                      <button
                        key={f.id}
                        onClick={() => setCanopyForm(f.id as any)}
                        className={`p-2.5 rounded-xl border text-xs font-bold ${
                          canopyForm === f.id ? 'bg-amber-500 text-slate-950 border-amber-500' : 'bg-slate-900 border-slate-800 text-slate-300'
                        }`}
                      >
                        {f.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Ширина (м)</label>
                    <input
                      type="number"
                      value={canopyWidth}
                      onChange={(e) => setCanopyWidth(Number(e.target.value))}
                      className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white font-mono text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Длина (м)</label>
                    <input
                      type="number"
                      value={canopyLength}
                      onChange={(e) => setCanopyLength(Number(e.target.value))}
                      className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white font-mono text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-2">Кровельное покрытие</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'polycarbonate', name: 'Поликарбонат' },
                      { id: 'metal_tile', name: 'Черепица' },
                      { id: 'soft', name: 'Мягкая кровля' },
                    ].map((rm) => (
                      <button
                        key={rm.id}
                        onClick={() => setCanopyRoofMat(rm.id as any)}
                        className={`p-2.5 rounded-xl border text-xs font-bold ${
                          canopyRoofMat === rm.id ? 'bg-amber-500 text-slate-950 border-amber-500' : 'bg-slate-900 border-slate-800 text-slate-300'
                        }`}
                      >
                        {rm.name}
                      </button>
                    ))}
                  </div>
                </div>

                {canopyRoofMat === 'polycarbonate' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-2">Толщина поликарбоната</label>
                    <div className="flex gap-2">
                      {[6, 8, 10, 16].map((th) => (
                        <button
                          key={th}
                          onClick={() => setCanopyPolyThick(th)}
                          className={`flex-1 py-2 rounded-lg border text-xs font-bold ${
                            canopyPolyThick === th ? 'bg-amber-500 text-slate-950 border-amber-500' : 'bg-slate-900 border-slate-800 text-slate-300'
                          }`}
                        >
                          {th} мм
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-2">Цвет каркаса</label>
                  <div className="flex items-center gap-3">
                    {colorList.map((c) => (
                      <button
                        key={c.hex}
                        onClick={() => setCanopyColor(c.hex)}
                        className={`w-8 h-8 rounded-full border-2 transition-all ${
                          canopyColor === c.hex ? 'scale-125 border-amber-400 shadow-xl' : 'border-transparent opacity-75 hover:opacity-100'
                        }`}
                        style={{ backgroundColor: c.hex }}
                        title={c.name}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Category 4: HOUSE CONTROLS */}
            {category === 'house' && (
              <div className="space-y-5">
                <div className="text-xs font-bold text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Sliders className="w-4 h-4" />
                  Параметры металлокаркаса
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-300 mb-1">
                    <span>Площадь:</span>
                    <span className="text-amber-400 font-mono text-sm">{houseArea} м²</span>
                  </div>
                  <input
                    type="range"
                    min="18"
                    max="120"
                    step="6"
                    value={houseArea}
                    onChange={(e) => setHouseArea(Number(e.target.value))}
                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-2">Этажность</label>
                  <div className="flex gap-2">
                    {[1, 2].map((st) => (
                      <button
                        key={st}
                        onClick={() => setHouseStories(st)}
                        className={`flex-1 py-2 rounded-lg border text-xs font-bold ${
                          houseStories === st ? 'bg-amber-500 text-slate-950 border-amber-500' : 'bg-slate-900 border-slate-800 text-slate-300'
                        }`}
                      >
                        {st} {st === 1 ? 'этаж' : 'этажа'}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-2">Утепление (базальт)</label>
                  <div className="flex gap-2">
                    {[50, 100, 150].map((ins) => (
                      <button
                        key={ins}
                        onClick={() => setHouseInsulation(ins)}
                        className={`flex-1 py-2 rounded-lg border text-xs font-bold ${
                          houseInsulation === ins ? 'bg-amber-500 text-slate-950 border-amber-500' : 'bg-slate-900 border-slate-800 text-slate-300'
                        }`}
                      >
                        {ins} мм
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-2">Фасадная обшивка</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'sandwich', name: 'Сэндвич' },
                      { id: 'siding', name: 'Сайдинг' },
                      { id: 'proflist', name: 'Профлист' },
                    ].map((w) => (
                      <button
                        key={w.id}
                        onClick={() => setHouseWall(w.id as any)}
                        className={`p-2 rounded-lg border text-xs font-bold ${
                          houseWall === w.id ? 'bg-amber-500 text-slate-950 border-amber-500' : 'bg-slate-900 border-slate-800 text-slate-300'
                        }`}
                      >
                        {w.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* Column 2: Middle 3D Interactive Canvas Workspace */}
          <div className="lg:col-span-5 p-6 bg-slate-900/60 flex flex-col justify-between border-r border-slate-800/80">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-amber-400 flex items-center gap-1.5">
                  <Maximize2 className="w-4 h-4" />
                  Визуализатор объекта 2D/3D
                </span>
                <span className="text-[11px] text-emerald-400 bg-emerald-950 px-2.5 py-0.5 rounded border border-emerald-800">
                  В реальном времени
                </span>
              </div>

              {/* Dynamic SVG Blueprint Display */}
              <div className="h-72 sm:h-96 rounded-2xl bg-slate-950 border border-slate-800/90 p-4 flex items-center justify-center relative overflow-hidden shadow-inner">
                <div className="absolute inset-0 opacity-15 bg-[linear-gradient(to_right,#64748b_1px,transparent_1px),linear-gradient(to_bottom,#64748b_1px,transparent_1px)] bg-[size:20px_20px]" />

                {category === 'fence' && (
                  <svg className="w-full h-full" viewBox="0 0 400 220">
                    {fenceBaseStrip && <rect x="10" y="170" width="380" height="25" fill="#475569" stroke="#64748b" />}
                    {[20, 100, 180, 260, 340].map((x) => (
                      <rect key={x} x={x} y="40" width="12" height="135" fill="#1e293b" stroke="#f59e0b" strokeWidth="1.5" />
                    ))}
                    {[32, 112, 192, 272].map((x) => (
                      <rect key={x} x={x} y="50" width="68" height="120" fill={fenceColor} stroke="#0f172a" strokeWidth="2" />
                    ))}
                    <line x1="20" y1="25" x2="340" y2="25" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="4 4" />
                    <text x="180" y="20" fill="#f59e0b" fontSize="13" textAnchor="middle" fontWeight="bold">
                      Длина = {fenceLength} м (Высота = {fenceHeight} м)
                    </text>
                  </svg>
                )}

                {category === 'gate' && (
                  <svg className="w-full h-full" viewBox="0 0 400 220">
                    <rect x="40" y="50" width="18" height="130" fill="#f59e0b" />
                    <rect x="340" y="50" width="18" height="130" fill="#f59e0b" />
                    <rect x="58" y="60" width="282" height="110" fill={gateColor} stroke="#3b82f6" strokeWidth="3" />
                    {gateAutomation !== 'none' && (
                      <g>
                        <rect x="20" y="145" width="30" height="30" fill="#10b981" rx="6" />
                        <text x="35" y="164" fill="#0f172a" fontSize="12" textAnchor="middle" fontWeight="bold">AUTO</text>
                      </g>
                    )}
                    <text x="200" y="40" fill="#3b82f6" fontSize="13" textAnchor="middle" fontWeight="bold">
                      Ширина проезда = {gateWidth} м
                    </text>
                  </svg>
                )}

                {category === 'canopy' && (
                  <svg className="w-full h-full" viewBox="0 0 400 220">
                    <line x1="20" y1="180" x2="380" y2="180" stroke="#475569" strokeWidth="4" />
                    <rect x="60" y="80" width="14" height="100" fill="#1e293b" stroke="#f59e0b" />
                    <rect x="320" y="80" width="14" height="100" fill="#1e293b" stroke="#f59e0b" />
                    <path d="M 40 80 Q 200 25 360 80" fill="none" stroke="#f59e0b" strokeWidth="10" />
                    <text x="200" y="120" fill="#f59e0b" fontSize="13" textAnchor="middle" fontWeight="bold">
                      Навес {canopyWidth}м х {canopyLength}м
                    </text>
                  </svg>
                )}

                {category === 'house' && (
                  <svg className="w-full h-full" viewBox="0 0 400 220">
                    <rect x="70" y="75" width="260" height="110" fill="#1e293b" stroke="#f59e0b" strokeWidth="3" />
                    <polygon points="50,75 200,20 350,75" fill="#f59e0b" opacity="0.85" />
                    <rect x="110" y="95" width="45" height="45" fill="#38bdf8" />
                    <rect x="240" y="95" width="45" height="90" fill="#0f172a" stroke="#f59e0b" />
                    <text x="200" y="140" fill="#ffffff" fontSize="13" textAnchor="middle" fontWeight="bold">
                      Площадь {houseArea} м²
                    </text>
                  </svg>
                )}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400 flex items-center justify-between">
              <span>Расчетный вес металла: <strong className="text-white font-mono">{specDetails.steelWeight} кг</strong></span>
              <span>Гарантия цеха: <strong className="text-amber-400">5 лет</strong></span>
            </div>
          </div>

          {/* Column 3: Right Summary & Engineer Approval Action */}
          <div className="lg:col-span-3 p-6 bg-slate-950 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-widest flex items-center gap-1">
                  <FileCheck className="w-4 h-4" />
                  Спецификация
                </span>
                <span className="text-[11px] text-slate-400 font-mono">#3D-SPEC</span>
              </div>

              <h4 className="text-base font-bold text-white leading-tight">
                {specDetails.title}
              </h4>

              {/* Bill of materials */}
              <div className="space-y-2">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Ведомость материалов:</div>
                <ul className="space-y-2 text-xs text-slate-300">
                  {specDetails.materialsList.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2 bg-slate-900/80 p-2.5 rounded-lg border border-slate-800/80">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span className="leading-snug">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-slate-800">
              <div className="p-4 rounded-xl bg-slate-900 border border-amber-500/40 space-y-1">
                <div className="text-xs text-slate-400">Ориентировочная смета проекта:</div>
                <div className="text-2xl font-black text-amber-400 font-montserrat">
                  ~ {specDetails.estimatedPrice.toLocaleString('ru-RU')} ₽
                </div>
                <div className="text-[10px] text-slate-400">Включает материалы, сборку в цехе и монтаж</div>
              </div>

              <button
                onClick={handleSendToEngineer}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm shadow-xl glow-amber flex items-center justify-center gap-2 transition-all transform hover:-translate-y-0.5"
              >
                <Send className="w-4 h-4" />
                <span>Согласовать проект с инженером</span>
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
