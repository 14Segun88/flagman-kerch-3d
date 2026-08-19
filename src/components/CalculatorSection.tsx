import React, { useState, useMemo } from 'react';
import { Calculator, ArrowRight, Zap, Info } from 'lucide-react';

interface CalculatorSectionProps {
  onOpenModalWithEstimate: (details: { service: string; params: string; estimatedPrice: number }) => void;
}

type MainCategory = 'excavator' | 'fence' | 'gate' | 'mowing';

export const CalculatorSection: React.FC<CalculatorSectionProps> = ({ onOpenModalWithEstimate }) => {
  const [category, setCategory] = useState<MainCategory>('excavator');

  // Excavator state
  const [excavatorSubtype, setExcavatorSubtype] = useState<'trench' | 'foundation' | 'drainage'>('trench');
  const [excavatorVolume, setExcavatorVolume] = useState<number>(25); // meters or hours

  // Fence state
  const [fenceType, setFenceType] = useState<'profnastil' | 'shtaketnik' | 'gitter3d'>('profnastil');
  const [fenceLength, setFenceLength] = useState<number>(40); // meters
  const [fenceHeight, setFenceHeight] = useState<'1.5' | '1.8' | '2.0'>('1.8');

  // Gate state
  const [gateType, setGateType] = useState<'swing_manual' | 'sliding_manual' | 'sliding_auto'>('sliding_auto');
  const [gateWidth, setGateWidth] = useState<'3.5' | '4.0' | '4.5'>('4.0');

  // Mowing state
  const [mowingArea, setMowingArea] = useState<number>(10); // сотки
  const [mowingType, setMowingType] = useState<'light' | 'heavy' | 'full_prep'>('heavy');

  // Calculated estimates
  const calculation = useMemo(() => {
    let basePrice = 0;
    let summaryText = '';
    let serviceTitle = '';

    if (category === 'excavator') {
      if (excavatorSubtype === 'trench') {
        serviceTitle = 'Услуги мини-экскаватора: Копка траншей';
        const pricePerMeter = 250;
        basePrice = excavatorVolume * pricePerMeter;
        summaryText = `Копка траншеи: ${excavatorVolume} пог. м (${pricePerMeter} ₽/м)`;
      } else if (excavatorSubtype === 'foundation') {
        serviceTitle = 'Услуги мини-экскаватора: Ленточный фундамент';
        const pricePerHour = 2000;
        const hours = Math.ceil(excavatorVolume / 5);
        basePrice = Math.max(hours, 3) * pricePerHour;
        summaryText = `Аренда мини-экскаватора: ${hours} ч (смена)`;
      } else {
        serviceTitle = 'Услуги мини-экскаватора: Дренаж и сваи';
        const pricePerMeter = 500;
        basePrice = excavatorVolume * pricePerMeter;
        summaryText = `Дренажная система/сваи: ${excavatorVolume} пог. м`;
      }
    } else if (category === 'fence') {
      serviceTitle = 'Изготовление и установка забора';
      let pricePerMeter = 1400;
      if (fenceType === 'shtaketnik') pricePerMeter = 1700;
      if (fenceType === 'gitter3d') pricePerMeter = 1300;

      const heightMult = fenceHeight === '2.0' ? 1.15 : fenceHeight === '1.5' ? 0.9 : 1.0;
      basePrice = Math.round(fenceLength * pricePerMeter * heightMult);
      summaryText = `Забор (${fenceType === 'profnastil' ? 'Профнастил' : fenceType === 'shtaketnik' ? 'Евроштакетник' : '3D Сетка'}), ${fenceLength}м, высота ${fenceHeight}м`;
    } else if (category === 'gate') {
      serviceTitle = 'Изготовление и монтаж ворот';
      if (gateType === 'swing_manual') {
        basePrice = 35000;
        summaryText = `Распашные механические ворота, ширина ${gateWidth}м`;
      } else if (gateType === 'sliding_manual') {
        basePrice = 55000;
        summaryText = `Откатные консольные ворота (механика), ширина ${gateWidth}м`;
      } else {
        basePrice = 78000;
        summaryText = `Откатные ворота с итальянской автоматикой, ширина ${gateWidth}м`;
      }
    } else if (category === 'mowing') {
      serviceTitle = 'Покос травы и расчистка участка';
      let pricePerSotka = 400;
      if (mowingType === 'heavy') pricePerSotka = 700;
      if (mowingType === 'full_prep') pricePerSotka = 1800;

      basePrice = mowingArea * pricePerSotka;
      summaryText = `Расчистка/покос участка: ${mowingArea} соток (${mowingType === 'light' ? 'Обычная трава' : mowingType === 'heavy' ? 'Густой бурьян/камыш' : 'Спил кустов и выравнивание'})`;
    }

    return {
      serviceTitle,
      summaryText,
      estimatedPrice: basePrice,
    };
  }, [category, excavatorSubtype, excavatorVolume, fenceType, fenceLength, fenceHeight, gateType, gateWidth, mowingArea, mowingType]);

  const handleOrder = () => {
    onOpenModalWithEstimate({
      service: calculation.serviceTitle,
      params: calculation.summaryText,
      estimatedPrice: calculation.estimatedPrice,
    });
  };

  return (
    <section id="calculator" className="py-24 bg-slate-900 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase tracking-widest">
            <Calculator className="w-4 h-4" />
            Онлайн-расчет за 1 минуту
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white font-montserrat">
            Калькулятор стоимости работ
          </h2>
          <p className="text-slate-400 text-base sm:text-lg">
            Укажите параметры вашего объекта, чтобы узнать предварительную смету работ и материалов.
          </p>
        </div>

        {/* Calculator Main Box */}
        <div className="mt-12 rounded-3xl bg-slate-950 border border-slate-800 p-6 sm:p-10 shadow-2xl">
          
          {/* Step 1: Category Selection Tabs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 border-b border-slate-800 pb-8">
            <button
              onClick={() => setCategory('excavator')}
              className={`p-4 rounded-2xl border text-left transition-all ${
                category === 'excavator'
                  ? 'bg-amber-500/10 border-amber-500 text-white glow-amber'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <div className="text-2xl mb-1">🚜</div>
              <div className="font-bold text-sm sm:text-base">Мини-экскаватор</div>
              <div className="text-xs text-slate-400 mt-0.5">Траншеи, фундамент, дренаж</div>
            </button>

            <button
              onClick={() => setCategory('fence')}
              className={`p-4 rounded-2xl border text-left transition-all ${
                category === 'fence'
                  ? 'bg-amber-500/10 border-amber-500 text-white glow-amber'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <div className="text-2xl mb-1">🏗️</div>
              <div className="font-bold text-sm sm:text-base">Заборы</div>
              <div className="text-xs text-slate-400 mt-0.5">Профнастил, штакетник, 3D</div>
            </button>

            <button
              onClick={() => setCategory('gate')}
              className={`p-4 rounded-2xl border text-left transition-all ${
                category === 'gate'
                  ? 'bg-amber-500/10 border-amber-500 text-white glow-amber'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <div className="text-2xl mb-1">🚪</div>
              <div className="font-bold text-sm sm:text-base">Ворота и Навесы</div>
              <div className="text-xs text-slate-400 mt-0.5">Автоматические & откатные</div>
            </button>

            <button
              onClick={() => setCategory('mowing')}
              className={`p-4 rounded-2xl border text-left transition-all ${
                category === 'mowing'
                  ? 'bg-amber-500/10 border-amber-500 text-white glow-amber'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <div className="text-2xl mb-1">🌿</div>
              <div className="font-bold text-sm sm:text-base">Покос и Подготовка</div>
              <div className="text-xs text-slate-400 mt-0.5">Трава, бурьян, выравнивание</div>
            </button>
          </div>

          {/* Step 2: Controls Grid */}
          <div className="grid lg:grid-cols-12 gap-8 pt-8 items-center">
            
            {/* Left Controls Column */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* Excavator Controls */}
              {category === 'excavator' && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-300 mb-2">Вид земляных работ</label>
                    <div className="grid sm:grid-cols-3 gap-2">
                      {[
                        { id: 'trench', label: 'Траншеи под кабель/водопровод' },
                        { id: 'foundation', label: 'Ленточный фундамент' },
                        { id: 'drainage', label: 'Дренаж & Винтовые сваи' },
                      ].map((item) => (
                        <button
                          key={item.id}
                          onClick={() => setExcavatorSubtype(item.id as any)}
                          className={`p-3 rounded-xl border text-xs font-bold transition-all ${
                            excavatorSubtype === item.id
                              ? 'bg-amber-500 text-slate-950 border-amber-500'
                              : 'bg-slate-900 border-slate-800 text-slate-300'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-sm font-bold text-slate-300">
                        {excavatorSubtype === 'foundation' ? 'Ориентировочный объем (часов/смен)' : 'Длина траншеи / линии (метры)'}
                      </label>
                      <span className="text-amber-400 font-extrabold text-lg">
                        {excavatorVolume} {excavatorSubtype === 'foundation' ? 'ч' : 'м'}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="150"
                      step="5"
                      value={excavatorVolume}
                      onChange={(e) => setExcavatorVolume(Number(e.target.value))}
                      className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                    />
                  </div>
                </div>
              )}

              {/* Fence Controls */}
              {category === 'fence' && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-300 mb-2">Материал забора</label>
                    <div className="grid sm:grid-cols-3 gap-2">
                      {[
                        { id: 'profnastil', label: 'Профнастил (оцинкованный/цветной)' },
                        { id: 'shtaketnik', label: 'Евроштакетник (шахматка/односторонний)' },
                        { id: 'gitter3d', label: '3D Сетка Gitter' },
                      ].map((item) => (
                        <button
                          key={item.id}
                          onClick={() => setFenceType(item.id as any)}
                          className={`p-3 rounded-xl border text-xs font-bold transition-all ${
                            fenceType === item.id
                              ? 'bg-amber-500 text-slate-950 border-amber-500'
                              : 'bg-slate-900 border-slate-800 text-slate-300'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-sm font-bold text-slate-300">Длина ограждения (метры)</label>
                      <span className="text-amber-400 font-extrabold text-lg">{fenceLength} м</span>
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
                    <label className="block text-sm font-bold text-slate-300 mb-2">Высота забора</label>
                    <div className="flex gap-3">
                      {['1.5', '1.8', '2.0'].map((h) => (
                        <button
                          key={h}
                          onClick={() => setFenceHeight(h as any)}
                          className={`flex-1 py-2 rounded-xl border text-sm font-bold transition-all ${
                            fenceHeight === h
                              ? 'bg-amber-500 text-slate-950 border-amber-500'
                              : 'bg-slate-900 border-slate-800 text-slate-300'
                          }`}
                        >
                          {h} метра
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Gate Controls */}
              {category === 'gate' && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-300 mb-2">Тип конструкции ворот</label>
                    <div className="grid sm:grid-cols-3 gap-2">
                      {[
                        { id: 'swing_manual', label: 'Распашные механические' },
                        { id: 'sliding_manual', label: 'Откатные консольные' },
                        { id: 'sliding_auto', label: 'Откатные + Автоматика' },
                      ].map((item) => (
                        <button
                          key={item.id}
                          onClick={() => setGateType(item.id as any)}
                          className={`p-3 rounded-xl border text-xs font-bold transition-all ${
                            gateType === item.id
                              ? 'bg-amber-500 text-slate-950 border-amber-500'
                              : 'bg-slate-900 border-slate-800 text-slate-300'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-300 mb-2">Ширина проезда</label>
                    <div className="flex gap-3">
                      {['3.5', '4.0', '4.5'].map((w) => (
                        <button
                          key={w}
                          onClick={() => setGateWidth(w as any)}
                          className={`flex-1 py-2 rounded-xl border text-sm font-bold transition-all ${
                            gateWidth === w
                              ? 'bg-amber-500 text-slate-950 border-amber-500'
                              : 'bg-slate-900 border-slate-800 text-slate-300'
                          }`}
                        >
                          {w} м
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Mowing Controls */}
              {category === 'mowing' && (
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-sm font-bold text-slate-300">Площадь участка (сотки)</label>
                      <span className="text-amber-400 font-extrabold text-lg">{mowingArea} соток</span>
                    </div>
                    <input
                      type="range"
                      min="2"
                      max="60"
                      step="1"
                      value={mowingArea}
                      onChange={(e) => setMowingArea(Number(e.target.value))}
                      className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-300 mb-2">Состояние растительности</label>
                    <div className="grid sm:grid-cols-3 gap-2">
                      {[
                        { id: 'light', label: 'Обычная газонная трава' },
                        { id: 'heavy', label: 'Густой бурьян и камыш' },
                        { id: 'full_prep', label: 'Спил мелких кустов + Выравнивание' },
                      ].map((item) => (
                        <button
                          key={item.id}
                          onClick={() => setMowingType(item.id as any)}
                          className={`p-3 rounded-xl border text-xs font-bold transition-all ${
                            mowingType === item.id
                              ? 'bg-amber-500 text-slate-950 border-amber-500'
                              : 'bg-slate-900 border-slate-800 text-slate-300'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* Right Result Card Column */}
            <div className="lg:col-span-5">
              <div className="rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-amber-500/40 p-6 space-y-6 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <span className="text-xs font-extrabold text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Zap className="w-4 h-4" />
                    Расчет сметы онлайн
                  </span>
                  <span className="text-[11px] text-slate-400">Гарантия лучшей цены</span>
                </div>

                <div>
                  <div className="text-xs text-slate-400">Выбранная конфигурация:</div>
                  <div className="text-sm font-bold text-white mt-1 leading-snug">
                    {calculation.summaryText}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <div className="text-xs text-slate-400">Предварительная стоимость:</div>
                  <div className="text-3xl font-black text-amber-400 font-montserrat">
                    ~ {calculation.estimatedPrice.toLocaleString('ru-RU')} ₽
                  </div>
                  <div className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Info className="w-3.5 h-3.5 text-amber-400" />
                    Включает работу техники и монтаж на объекте
                  </div>
                </div>

                <button
                  onClick={handleOrder}
                  className="w-full py-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-base shadow-xl glow-amber flex items-center justify-center gap-2 transition-all"
                >
                  <span>Зафиксировать цену и заказать</span>
                  <ArrowRight className="w-5 h-5" />
                </button>

                <div className="text-center text-[11px] text-slate-400">
                  * Точная сметная стоимость закрепляется в договоре после бесплатного замера.
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
};
