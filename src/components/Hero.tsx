import React, { useState, useRef, useEffect } from 'react';
import { Truck, ArrowRight, CheckCircle2, Flame, MapPin, Sparkles } from 'lucide-react';

interface HeroProps {
  onOpenModal: (serviceName?: string) => void;
  onOpenStudio?: () => void;
}

const videoPlaylist = [
  '/videos/video1_real.mp4',
  '/videos/video2_end.mp4',
];

export const Hero: React.FC<HeroProps> = ({ onOpenModal, onOpenStudio }) => {
  const [activeVideoIndex, setActiveVideoIndex] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleVideoEnded = () => {
    setActiveVideoIndex((prevIndex) => (prevIndex + 1) % videoPlaylist.length);
  };

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch(() => { });
    }
  }, [activeVideoIndex]);

  return (
    <section className="relative min-h-screen pt-28 pb-16 flex items-center overflow-hidden bg-radial-gradient">
      {/* Background Media & Overlay */}
      <div className="absolute inset-0 z-0">
        <img
          src="/assets/flagman-hero-bg.png"
          alt="ФЛАГМАН Керчь спецтехника и металлоконструкции"
          className="w-full h-full object-cover object-center opacity-25 mix-blend-luminosity scale-105 transform hover:scale-100 transition-transform duration-1000"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-slate-950/50" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-amber-500/10 via-transparent to-transparent" />
      </div>

      <div className="relative z-10 max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 items-center">

          {/* Main Hero Content */}
          <div className="lg:col-span-6 space-y-8 lg:pr-4">

            {/* Top Pill Badge */}
            <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-slate-900/90 border border-amber-500/40 text-amber-400 text-xs sm:text-sm font-semibold shadow-xl">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
              <MapPin className="w-4 h-4 text-amber-400" />
              <span>Работаем по Керчи, Ленинскому району и всему Крыму</span>
            </div>

            {/* Hero Main Headline */}
            <h1 className="text-3xl sm:text-5xl lg:text-[3.25rem] font-black text-white leading-tight font-montserrat tracking-tight">
              Мини-экскаватор, <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500">
                металлоконструкции
              </span> <br />
              и подготовка участков
            </h1>

            {/* Detailed Description */}
            <p className="text-lg sm:text-xl text-slate-300 font-normal leading-relaxed max-w-2xl">
              Профессиональное выполнение строительных и земляных работ любой сложности. Собственный парк техники, квалифицированная бригада и производственный цех.
            </p>

            {/* Key Service Highlights (Compact Layout) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
              <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800/80 flex items-center gap-2.5 shadow-sm">
                <span className="text-base shrink-0 p-1.5 rounded-md bg-amber-500/10">🚜</span>
                <div>
                  <h4 className="text-xs font-bold text-white leading-tight">Мини-экскаватор</h4>
                  <p className="text-[11px] text-slate-400 leading-tight mt-0.5">Траншеи, дренаж, сваи</p>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800/80 flex items-center gap-2.5 shadow-sm">
                <span className="text-base shrink-0 p-1.5 rounded-md bg-blue-500/10">🏗️</span>
                <div>
                  <h4 className="text-xs font-bold text-white leading-tight">Металлоконструкции</h4>
                  <p className="text-[11px] text-slate-400 leading-tight mt-0.5">Заборы, ворота, навесы</p>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800/80 flex items-center gap-2.5 shadow-sm">
                <span className="text-base shrink-0 p-1.5 rounded-md bg-emerald-500/10">🌿</span>
                <div>
                  <h4 className="text-xs font-bold text-white leading-tight">Покос и расчистка</h4>
                  <p className="text-[11px] text-slate-400 leading-tight mt-0.5">Подготовка участков</p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-4">
              {onOpenStudio && (
                <button
                  onClick={onOpenStudio}
                  className="px-8 py-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-base shadow-xl glow-amber flex items-center justify-center gap-3 transition-all transform hover:-translate-y-0.5 cursor-pointer"
                >
                  <Sparkles className="w-5 h-5 text-slate-950 animate-pulse" />
                  <span>Создать проект</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              )}

              <button
                onClick={() => onOpenModal('Заказ спецтехники или мастера')}
                className="px-8 py-4 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-white font-bold text-base flex items-center justify-center gap-3 transition-all"
              >
                <Truck className="w-5 h-5 text-amber-400" />
                Вызвать мастера / технику
              </button>
            </div>

            {/* Guarantees List */}
            <div className="flex flex-wrap items-center gap-6 pt-4 text-xs sm:text-sm text-slate-400">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Фиксированная смета по договору</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Выезд мастера на замер — БЕСПЛАТНО</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Гарантия на все работы до 5 лет</span>
              </div>
            </div>
          </div>

          {/* Hero Feature Showcase Banner (Full Size, Shifted Side) */}
          <div className="lg:col-span-6 relative z-10 w-full">
            <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-900/90 p-5 sm:p-6 shadow-2xl space-y-6">

              {/* Pure Large Sequential Video Screen */}
              <div className="relative rounded-2xl overflow-hidden h-64 sm:h-72 lg:h-80 border-2 border-slate-800 shadow-2xl bg-slate-950 hover:border-amber-500/40 transition-colors">
                <video
                  ref={videoRef}
                  key={videoPlaylist[activeVideoIndex]}
                  src={videoPlaylist[activeVideoIndex]}
                  autoPlay
                  muted
                  playsInline
                  onEnded={handleVideoEnded}
                  className="w-full h-full object-cover bg-slate-950"
                />
              </div>

              {/* Express Order Widget inside Hero */}
              <div className="p-5 rounded-xl bg-slate-950 border border-amber-500/30 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Flame className="w-4 h-4 text-amber-400 animate-pulse" />
                    Срочный вызов спецтехники
                  </span>
                  <span className="text-[11px] text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800">
                    В наличии 2 спецмашины
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white">
                  Нужна консультация или точный расчет?
                </h3>
                <p className="text-xs text-slate-400">
                  Оставьте номер телефона — инженер перезвонит вам в течение 5 минут для консультации по объекту.
                </p>
                <button
                  onClick={() => onOpenModal('Срочный выезд инженера')}
                  className="w-full py-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-sm shadow-md transition-colors flex items-center justify-center gap-2"
                >
                  Заказать обратный звонок
                </button>
              </div>

              {/* Company Stats Bar */}
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800 text-center">
                <div>
                  <div className="text-2xl font-black text-amber-400 font-montserrat">100%</div>
                  <div className="text-[11px] text-slate-400">Собственный парк</div>
                </div>
                <div>
                  <div className="text-2xl font-black text-amber-400 font-montserrat">450+</div>
                  <div className="text-[11px] text-slate-400">Объектов сдано</div>
                </div>
                <div>
                  <div className="text-2xl font-black text-amber-400 font-montserrat">0 ₽</div>
                  <div className="text-[11px] text-slate-400">Выезд на замер</div>
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
