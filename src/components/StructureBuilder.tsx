import React, { useState } from 'react';
import { Sparkles, ChevronLeft, ChevronRight, Video, Image as ImageIcon, FileText, Download, Maximize2, X, PhoneCall } from 'lucide-react';

interface StructureBuilderProps {
  onOpenModalWithProject: (projectDetails: {
    title: string;
    projectId: string;
    specsText: string;
    estimatedPrice: number;
  }) => void;
}

const slides = [
  {
    id: 'video',
    type: 'video',
    title: 'Видеообзор гибридного каркасного дома',
    subtitle: 'Наглядная демонстрация процессов возведения и материалов',
    icon: Video,
    src: '/media/hybrid_house_video.mp4',
    badge: 'Видео'
  },
  {
    id: 'image',
    type: 'image',
    title: 'Инфографика технологии строительства',
    subtitle: 'Гибридные дома — современная энергоэффективная технология',
    icon: ImageIcon,
    src: '/media/hybrid_house_image.png',
    badge: 'Инфографика'
  },
  {
    id: 'pdf',
    type: 'pdf',
    title: 'Презентация Flagship Hybrid Engineering',
    subtitle: 'Подробный технический паспорт и каталог инженерных решений',
    icon: FileText,
    src: '/media/hybrid_house_presentation.pdf',
    badge: 'PDF Документ'
  }
];

export const StructureBuilder: React.FC<StructureBuilderProps> = ({ onOpenModalWithProject }) => {
  const [currentSlide, setCurrentSlide] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const activeSlide = slides[currentSlide];

  const handlePrev = () => {
    setCurrentSlide((prev) => (prev === 0 ? slides.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentSlide((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
  };

  const handleConsultation = () => {
    onOpenModalWithProject({
      title: 'Консультация по гибридным домам',
      projectId: 'HYBRID-2026',
      specsText: 'Запрос подробного расчета и выезда специалиста по технологии гибридного каркасного строительства.',
      estimatedPrice: 0
    });
  };

  return (
    <div id="additional-info" className="mt-16 rounded-3xl bg-slate-950 border border-slate-800 p-4 sm:p-8 shadow-2xl space-y-6">
      
      {/* 1. Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 text-xs font-bold uppercase tracking-wider mb-2 border border-amber-500/20">
            <Sparkles className="w-4 h-4 text-amber-400" />
            Раздел дополнительной информации
          </div>
          <h3 className="text-2xl sm:text-3xl font-black text-white font-montserrat">
            Гибридные дома — современная технология
          </h3>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
            Изучите видеообзор, техническую инфографику и полную презентацию инженерных решений компании в едином интерактивном окне.
          </p>
        </div>

        <button
          onClick={handleConsultation}
          className="px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs shadow-lg flex items-center justify-center gap-2 transition-colors shrink-0"
        >
          <PhoneCall className="w-4 h-4" />
          <span>Рассчитать гибридный дом</span>
        </button>
      </div>

      {/* 2. Top Material Selector Tabs */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        {slides.map((slide, index) => {
          const Icon = slide.icon;
          const isActive = index === currentSlide;
          return (
            <button
              key={slide.id}
              onClick={() => setCurrentSlide(index)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                isActive
                  ? 'bg-amber-500 text-slate-950 shadow-lg scale-102'
                  : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white border border-slate-800'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-slate-950' : 'text-amber-400'}`} />
              <span>{slide.badge}</span>
            </button>
          );
        })}
      </div>

      {/* 3. Main Interactive Unified Viewer with Side Arrows */}
      <div className="relative rounded-2xl overflow-hidden border-2 border-slate-800 bg-slate-900/90 shadow-2xl group">
        
        {/* Top Viewer Control Bar */}
        <div className="h-12 bg-slate-950 border-b border-slate-800 px-4 flex items-center justify-between z-20 relative text-xs">
          <div className="flex items-center gap-2 text-white font-bold truncate">
            <span className="text-amber-400">[{currentSlide + 1} / {slides.length}]</span>
            <span className="truncate">{activeSlide.title}</span>
          </div>

          <div className="flex items-center gap-2">
            {activeSlide.type === 'pdf' && (
              <a
                href={activeSlide.src}
                download="Flagship_Hybrid_Engineering.pdf"
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 font-medium transition-colors border border-slate-700"
                title="Скачать PDF"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Скачать PDF</span>
              </a>
            )}

            <button
              onClick={() => setIsFullscreen(true)}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-colors border border-slate-700"
              title="Развернуть на весь экран"
            >
              <Maximize2 className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">На весь экран</span>
            </button>
          </div>
        </div>

        {/* Media Container Box */}
        <div className="relative w-full h-[380px] sm:h-[480px] lg:h-[560px] bg-slate-950 flex items-center justify-center overflow-hidden">
          
          {/* Side Navigation Arrow: PREV */}
          <button
            onClick={handlePrev}
            className="absolute left-3 top-1/2 -translate-y-1/2 z-30 w-11 h-11 rounded-full bg-slate-950/80 hover:bg-amber-500 text-slate-200 hover:text-slate-950 border border-slate-700/80 shadow-2xl flex items-center justify-center transition-all backdrop-blur-md hover:scale-110"
            title="Предыдущий материал"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          {/* Side Navigation Arrow: NEXT */}
          <button
            onClick={handleNext}
            className="absolute right-3 top-1/2 -translate-y-1/2 z-30 w-11 h-11 rounded-full bg-slate-950/80 hover:bg-amber-500 text-slate-200 hover:text-slate-950 border border-slate-700/80 shadow-2xl flex items-center justify-center transition-all backdrop-blur-md hover:scale-110"
            title="Следующий материал"
          >
            <ChevronRight className="w-6 h-6" />
          </button>

          {/* Content Display */}
          {activeSlide.type === 'video' && (
            <video
              key={activeSlide.src}
              src={activeSlide.src}
              controls
              autoPlay
              muted
              loop
              playsInline
              className="w-full h-full object-contain bg-slate-950"
            />
          )}

          {activeSlide.type === 'image' && (
            <div className="w-full h-full p-2 flex items-center justify-center bg-slate-950">
              <img
                src={activeSlide.src}
                alt={activeSlide.title}
                className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
              />
            </div>
          )}

          {activeSlide.type === 'pdf' && (
            <div className="w-full h-full relative bg-slate-900">
              <iframe
                src={`${activeSlide.src}#toolbar=1`}
                className="w-full h-full border-0"
                title={activeSlide.title}
              />
            </div>
          )}
        </div>

        {/* Bottom Subtitle Caption */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span>{activeSlide.subtitle}</span>
          </div>
          <div className="hidden sm:flex items-center gap-4 text-slate-400 text-[11px]">
            <span>Используйте стрелки по бокам для переключения</span>
          </div>
        </div>
      </div>

      {/* 4. Fullscreen Modal Viewer */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-xl flex flex-col p-4 sm:p-6 overflow-hidden">
          {/* Modal Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
            <div className="flex items-center gap-3">
              <span className="text-amber-400 font-bold text-sm">[{currentSlide + 1} / {slides.length}]</span>
              <h4 className="text-base sm:text-lg font-bold text-white truncate">{activeSlide.title}</h4>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handlePrev}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white transition-colors"
                title="Назад"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={handleNext}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white transition-colors"
                title="Вперед"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
              <button
                onClick={() => setIsFullscreen(false)}
                className="p-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition-colors ml-2"
                title="Закрыть полноэкранный режим"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Modal Content */}
          <div className="flex-1 w-full h-full py-4 flex items-center justify-center overflow-hidden">
            {activeSlide.type === 'video' && (
              <video
                src={activeSlide.src}
                controls
                autoPlay
                className="max-w-full max-h-full rounded-xl shadow-2xl"
              />
            )}

            {activeSlide.type === 'image' && (
              <img
                src={activeSlide.src}
                alt={activeSlide.title}
                className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
              />
            )}

            {activeSlide.type === 'pdf' && (
              <iframe
                src={`${activeSlide.src}#toolbar=1`}
                className="w-full h-full border-0 rounded-xl bg-white"
                title={activeSlide.title}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};
