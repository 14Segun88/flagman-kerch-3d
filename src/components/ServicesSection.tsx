import React, { useState } from 'react';
import { Shovel, Fence, Trees, Check, ArrowUpRight, Wrench } from 'lucide-react';
import { StructureBuilder } from './StructureBuilder';

interface ServicesSectionProps {
  onOpenModal: (serviceName?: string) => void;
  onOpenModalWithProject: (projectDetails: {
    title: string;
    projectId: string;
    specsText: string;
    estimatedPrice: number;
  }) => void;
  onOpenStudio?: () => void;
}

interface ServiceItem {
  id: string;
  category: 'excavator' | 'metal' | 'landscaping';
  categoryLabel: string;
  title: string;
  description: string;
  price: string;
  features: string[];
  image: string;
  popular?: boolean;
}

export const ServicesSection: React.FC<ServicesSectionProps> = ({ onOpenModal, onOpenModalWithProject }) => {
  const [activeTab, setActiveTab] = useState<'all' | 'excavator' | 'metal' | 'landscaping'>('all');

  const services: ServiceItem[] = [
    // 1. Мини-экскаватор
    {
      id: 'trench',
      category: 'excavator',
      categoryLabel: 'Мини-экскаватор',
      title: 'Траншеи под воду, газ, электричество и кабель',
      description: 'Копаем траншеи любой глубины и ширины в стесненных условиях, вблизи построек и ограждений без повреждения участка.',
      price: 'от 200 ₽ / пог. м',
      features: ['Ковши шириной 30, 40, 60 см', 'Минимальный радиус разворота', 'Аккуратная укладка грунта', 'Выезд в день обращения'],
      image: '/assets/miniexcavator.jpg',
      popular: true,
    },
    {
      id: 'foundation',
      category: 'excavator',
      categoryLabel: 'Мини-экскаватор',
      title: 'Ленточный фундамент и копка котлованов',
      description: 'Разработка грунта под ленточные фундаменты дома, гаража, бани или забора. Выемка грунта с точным соблюдением геометрии.',
      price: 'от 1 800 ₽ / час',
      features: ['Точный контроль глубины', 'Подготовка под засыпку песчаной подушки', 'Выемка под погреб и септик', 'Работа с тяжелым грунтом/скальником'],
      image: '/assets/miniexcavator.jpg',
    },
    {
      id: 'drainage-piles',
      category: 'excavator',
      categoryLabel: 'Мини-экскаватор',
      title: 'Дренаж участка и монтаж винтовых свай',
      description: 'Устройство ливневого и глубинного дренажа, водоотведение. Закручивание винтовых свай с помощью гидровращателя.',
      price: 'от 450 ₽ / пог. м',
      features: ['Глубинный дренаж от грунтовых вод', 'Монтаж винтовых свай гидровращателем', 'Установка дренажных колодцев', 'Засыпка щебнем и гравием'],
      image: '/assets/miniexcavator.jpg',
    },

    // 2. Изготовление и установка
    {
      id: 'fences',
      category: 'metal',
      categoryLabel: 'Изготовление и установка',
      title: 'Заборы под ключ (профнастил, 3D сетка, евроштакетник)',
      description: 'Изготовление и монтаж долговечных ограждений на металлических столбах с бетонированием и качественной покраской.',
      price: 'от 1 200 ₽ / пог. м',
      features: ['Заборы из профнастила и евроштакетника', '3D и 2D сетка Гиттер', 'Бетонирование столбов на 1-1.2 м', 'Антикоррозийное покрытие каркаса'],
      image: '/assets/metal-frame.jpg',
      popular: true,
    },
    {
      id: 'gates',
      category: 'metal',
      categoryLabel: 'Изготовление и установка',
      title: 'Ворота (распашные, механические, автоматические)',
      description: 'Изготовление и качественный монтаж откатных и распашных ворот. Установка автоматики итальянских и немецких брендов.',
      price: 'от 25 000 ₽',
      features: ['Обычные распашные ворота с калиткой', 'Откатные консольные ворота', 'Автоматика с дистанционным пультом', 'Встроенные или отдельные калитки'],
      image: '/assets/metal-frame.jpg',
    },
    {
      id: 'canopies-gazebos',
      category: 'metal',
      categoryLabel: 'Изготовление и установка',
      title: 'Навесы для авто и беседки из металлокаркаса',
      description: 'Прочные навесы из поликарбоната, мягкой кровли или металлочерепицы. Изготовление садовых беседок под ключ.',
      price: 'от 3 500 ₽ / м²',
      features: ['Навесы для авто любой формы', 'Беседки с элементами ковки', 'Расчет ветровых и снеговых нагрузок', 'Усиленный металлопрофиль'],
      image: '/assets/metal-frame.jpg',
    },
    {
      id: 'metal-houses',
      category: 'metal',
      categoryLabel: 'Изготовление и установка',
      title: 'Металлокаркасные дома и хозпостройки (ЛСТК / Профтруба)',
      description: 'Быстровозводимые дома, торговые павильоны, бытовки, гаражи и пристройки на основе жесткого металлического каркаса.',
      price: 'по запросу',
      features: ['Высокая сейсмостойкость и прочность', 'Быстрый монтаж в любое время года', 'Свободная планировка помещений', 'Утепление и финишная обшивка'],
      image: '/assets/metal-frame.jpg',
    },

    // 3. Покос и подготовка участков
    {
      id: 'grass-mowing',
      category: 'landscaping',
      categoryLabel: 'Покос и подготовка',
      title: 'Покос травы любой сложности и высоты',
      description: 'Быстрый покос бурьяна, высокого камыша, полыни, сухостоя и газонной травы мощными триммерами и сенокосилками.',
      price: 'от 300 ₽ / сотка',
      features: ['Покос травы любой высоты', 'Сбор травы в стога или мешки', 'Вывоз растительного мусора', 'Обслуживание коммерческих объектов'],
      image: '/assets/grass-mowing.jpg',
      popular: true,
    },
    {
      id: 'site-prep',
      category: 'landscaping',
      categoryLabel: 'Покос и подготовка',
      title: 'Подготовка участков под застройку и продажу',
      description: 'Комплексная расчистка целинных земель: спил мелкого кустарника и мелколесья, корчевание пней, планировка грунта.',
      price: 'от 1 500 ₽ / сотка',
      features: ['Спил мелколесья и полыни', 'Корчевание пней мини-экскаватором', 'Планировка и выравнивание территории', 'Вывоз строительного и растительного мусора'],
      image: '/assets/grass-mowing.jpg',
    },
  ];

  const filteredServices = activeTab === 'all'
    ? services
    : services.filter((s) => s.category === activeTab);

  return (
    <section id="services" className="py-24 bg-slate-950 relative overflow-hidden">
      {/* Glow effect background */}
      <div className="absolute top-1/4 left-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase tracking-widest">
            <Wrench className="w-4 h-4" />
            Полный спектр услуг
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white font-montserrat">
            Что мы делаем в Керчи и Крыму
          </h2>
          <p className="text-slate-400 text-base sm:text-lg">
            Собственная спецтехника, производственная база и опытная бригада рабочих под руководством грамотных инженеров.
          </p>
        </div>

        {/* Category Tabs */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 mt-10">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'all'
                ? 'bg-amber-500 text-slate-950 shadow-lg glow-amber'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            Все направления ({services.length})
          </button>

          <button
            onClick={() => setActiveTab('excavator')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'excavator'
                ? 'bg-amber-500 text-slate-950 shadow-lg glow-amber'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Shovel className="w-4 h-4" />
            Услуги мини-экскаватора
          </button>

          <button
            onClick={() => setActiveTab('metal')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'metal'
                ? 'bg-amber-500 text-slate-950 shadow-lg glow-amber'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Fence className="w-4 h-4" />
            Изготовление и установка
          </button>

          <button
            onClick={() => setActiveTab('landscaping')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'landscaping'
                ? 'bg-amber-500 text-slate-950 shadow-lg glow-amber'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Trees className="w-4 h-4" />
            Покос и подготовка участков
          </button>
        </div>

        {/* Services Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mt-12">
          {filteredServices.map((service) => (
            <div
              key={service.id}
              className="group relative rounded-2xl bg-slate-900/80 border border-slate-800 overflow-hidden hover:border-amber-500/50 transition-all duration-300 flex flex-col justify-between hover:-translate-y-1 shadow-xl"
            >
              {/* Top Image Preview & Badge */}
              <div className="relative h-48 overflow-hidden bg-slate-950">
                <img
                  src={service.image}
                  alt={service.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-80"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent" />

                <div className="absolute top-3 left-3 flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-md text-[11px] font-extrabold uppercase tracking-wider bg-slate-950/90 text-amber-400 border border-amber-500/40">
                    {service.categoryLabel}
                  </span>
                  {service.popular && (
                    <span className="px-2.5 py-1 rounded-md text-[11px] font-extrabold uppercase tracking-wider bg-amber-500 text-slate-950">
                      Хит заказов
                    </span>
                  )}
                </div>

                <div className="absolute bottom-3 right-3 text-sm font-black text-amber-400 bg-slate-950/90 px-3 py-1 rounded-lg border border-slate-800">
                  {service.price}
                </div>
              </div>

              {/* Service Card Content */}
              <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                <div>
                  <h3 className="text-xl font-extrabold text-white group-hover:text-amber-400 transition-colors leading-snug">
                    {service.title}
                  </h3>
                  <p className="text-slate-400 text-xs sm:text-sm mt-2 leading-relaxed">
                    {service.description}
                  </p>
                </div>

                {/* Features Bullets */}
                <ul className="space-y-2 pt-2 border-t border-slate-800/80">
                  {service.features.map((feat, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-xs text-slate-300">
                      <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>

                {/* Order Button */}
                <div className="pt-4">
                  <button
                    onClick={() => onOpenModal(`Заказ: ${service.title}`)}
                    className="w-full py-3 rounded-xl bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-white font-extrabold text-sm transition-all flex items-center justify-center gap-2 group/btn"
                  >
                    <span>Заказать услугу</span>
                    <ArrowUpRight className="w-4 h-4 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
                  </button>
                </div>
              </div>

            </div>
          ))}
        </div>

        {/* 2D/3D Custom Project Builder Embed */}
        <StructureBuilder onOpenModalWithProject={onOpenModalWithProject} />

        {/* Bottom Banner */}
        <div className="mt-16 rounded-2xl bg-gradient-to-r from-amber-500/10 via-slate-900 to-amber-500/10 border border-amber-500/30 p-8 text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-6 shadow-2xl">
          <div className="space-y-2">
            <h3 className="text-xl sm:text-2xl font-black text-white font-montserrat">
              Нужно нестандартное решение или комплексный объем?
            </h3>
            <p className="text-slate-300 text-sm">
              Бесплатно выедем на ваш объект в Керчи и районе, рассчитаем полную смету с учетом закупки материалов и работы спецтехники.
            </p>
          </div>
          <button
            onClick={() => onOpenModal('Комплексный объект / Выезд инженера')}
            className="shrink-0 px-8 py-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm shadow-lg glow-amber transition-all"
          >
            Бесплатный выезд инженера
          </button>
        </div>

      </div>
    </section>
  );
};
