import React, { useState } from 'react';
import { Camera, X, ChevronRight, ZoomIn } from 'lucide-react';

interface PortfolioGalleryProps {
  onOpenModal: (serviceName?: string) => void;
}

interface PortfolioItem {
  id: string;
  category: 'excavator' | 'metal' | 'landscaping' | 'branding';
  title: string;
  location: string;
  image: string;
  description: string;
  tags: string[];
}

export const PortfolioGallery: React.FC<PortfolioGalleryProps> = ({ onOpenModal }) => {
  const [activeFilter, setActiveFilter] = useState<'all' | 'excavator' | 'metal' | 'landscaping'>('all');
  const [selectedItem, setSelectedItem] = useState<PortfolioItem | null>(null);

  const portfolioItems: PortfolioItem[] = [
    {
      id: 'item-1',
      category: 'excavator',
      title: 'Разработка траншеи под водопровод и фундамент',
      location: 'г. Керчь, пос. Героевское',
      image: '/assets/miniexcavator.jpg',
      description: 'Выполнено копание 85 метров траншеи под центральный водопровод и электрокабель с филигранной точностью вблизи существующего дома.',
      tags: ['Мини-экскаватор', 'Траншея 0.4м', '85 пог. м'],
    },
    {
      id: 'item-2',
      category: 'metal',
      title: 'Изготовление и установка металлокаркасной беседки и навеса',
      location: 'г. Керчь, район Семь Ветров',
      image: '/assets/metal-frame.jpg',
      description: 'Спроектирован и смонтирован усиленный металлокаркас беседки с антикоррозийной грунтовой обработкой и последующей зашивкой.',
      tags: ['Металлокаркас', 'Беседка', 'Профтруба 80x80'],
    },
    {
      id: 'item-3',
      category: 'landscaping',
      title: 'Комплексный покос травы и расчистка участка под застройку',
      location: 'Ленинский район, с. Войково',
      image: '/assets/grass-mowing.jpg',
      description: 'Произведен покос 15 соток густого бурьяна и полыни, спилен мелколесный кустарник, организован вывоз 2 машин растительных остатков.',
      tags: ['Покос 15 соток', 'Расчистка', 'Спил кустарника'],
    },
    {
      id: 'item-4',
      category: 'branding',
      title: 'Официальный фирменный логотип и структура компании ФЛАГМАН',
      location: 'Офис ФЛАГМАН, Керчь',
      image: '/assets/flagman-logo-concepts.png',
      description: 'Фирменная концепция бренда ФЛАГМАН — Символ надежности, спецтехники, производства и ландшафтного благоустройства.',
      tags: ['ФЛАГМАН Керчь', 'Брендинг', 'Строительный цех'],
    },
  ];

  const filteredItems = activeFilter === 'all'
    ? portfolioItems
    : portfolioItems.filter((item) => item.category === activeFilter);

  return (
    <section id="portfolio" className="py-24 bg-slate-950 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase tracking-widest">
            <Camera className="w-4 h-4" />
            Реальные фотографии объектов
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white font-montserrat">
            Галерея наших выполненных работ
          </h2>
          <p className="text-slate-400 text-base sm:text-lg">
            Посмотрите примеры наших объектов в Керчи и Ленинском районе. Никаких чужих картинках из интернета — только наши люди и спецтехника.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center justify-center gap-3 mt-10">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-5 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all ${
              activeFilter === 'all'
                ? 'bg-amber-500 text-slate-950 glow-amber'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Все работы
          </button>
          <button
            onClick={() => setActiveFilter('excavator')}
            className={`px-5 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all ${
              activeFilter === 'excavator'
                ? 'bg-amber-500 text-slate-950 glow-amber'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Мини-экскаватор
          </button>
          <button
            onClick={() => setActiveFilter('metal')}
            className={`px-5 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all ${
              activeFilter === 'metal'
                ? 'bg-amber-500 text-slate-950 glow-amber'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Металлоконструкции & Беседки
          </button>
          <button
            onClick={() => setActiveFilter('landscaping')}
            className={`px-5 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all ${
              activeFilter === 'landscaping'
                ? 'bg-amber-500 text-slate-950 glow-amber'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Покос травы и расчистка
          </button>
        </div>

        {/* Gallery Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-2 gap-8 mt-12">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              onClick={() => setSelectedItem(item)}
              className="group relative rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden cursor-pointer hover:border-amber-500/50 transition-all duration-300 shadow-2xl flex flex-col"
            >
              {/* Image Container */}
              <div className="relative h-72 sm:h-80 overflow-hidden bg-slate-950">
                <img
                  src={item.image}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent opacity-90" />

                {/* Hover overlay icon */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-slate-950/40 backdrop-blur-xs">
                  <div className="p-3 rounded-full bg-amber-500 text-slate-950 font-bold shadow-xl flex items-center gap-2 transform group-hover:scale-110 transition-transform">
                    <ZoomIn className="w-5 h-5" />
                    <span>Увеличить фото</span>
                  </div>
                </div>

                {/* Tags */}
                <div className="absolute top-4 left-4 flex flex-wrap gap-2">
                  {item.tags.map((tag, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-slate-950/80 text-amber-400 border border-slate-800 backdrop-blur-md"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Bottom text */}
                <div className="absolute bottom-4 left-4 right-4 space-y-1">
                  <div className="text-xs text-amber-400 font-bold">{item.location}</div>
                  <h3 className="text-xl font-black text-white group-hover:text-amber-400 transition-colors">
                    {item.title}
                  </h3>
                </div>
              </div>

              {/* Description box */}
              <div className="p-5 bg-slate-900 flex-1 flex flex-col justify-between">
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  {item.description}
                </p>
                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-amber-400 font-bold">
                  <span>Хотите аналогичный результат?</span>
                  <span className="flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    Рассчитать заказ <ChevronRight className="w-4 h-4" />
                  </span>
                </div>
              </div>

            </div>
          ))}
        </div>

        {/* Lightbox Modal */}
        {selectedItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-fade-in">
            <div className="relative max-w-4xl w-full rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-2xl space-y-4">
              
              {/* Close Button */}
              <button
                onClick={() => setSelectedItem(null)}
                className="absolute top-4 right-4 z-10 p-2.5 rounded-full bg-slate-950/80 border border-slate-700 text-slate-300 hover:text-white hover:bg-amber-500 hover:border-amber-500 hover:text-slate-950 transition-all"
              >
                <X className="w-6 h-6" />
              </button>

              {/* High-res Image */}
              <div className="relative max-h-[60vh] bg-slate-950 flex items-center justify-center overflow-hidden">
                <img
                  src={selectedItem.image}
                  alt={selectedItem.title}
                  className="max-h-[60vh] w-auto object-contain"
                />
              </div>

              {/* Details Content */}
              <div className="p-6 space-y-4">
                <div>
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-widest">
                    {selectedItem.location}
                  </span>
                  <h3 className="text-2xl font-black text-white font-montserrat mt-1">
                    {selectedItem.title}
                  </h3>
                </div>

                <p className="text-sm text-slate-300 leading-relaxed">
                  {selectedItem.description}
                </p>

                <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex flex-wrap gap-2">
                    {selectedItem.tags.map((t, i) => (
                      <span key={i} className="px-3 py-1 rounded-lg text-xs bg-slate-800 text-slate-300">
                        #{t}
                      </span>
                    ))}
                  </div>

                  <button
                    onClick={() => {
                      const title = selectedItem.title;
                      setSelectedItem(null);
                      onOpenModal(`Заказ по объекту: ${title}`);
                    }}
                    className="w-full sm:w-auto px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm glow-amber shadow-lg"
                  >
                    Заказать такой же объект
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

      </div>
    </section>
  );
};
