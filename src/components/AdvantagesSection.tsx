import React from 'react';
import { ShieldCheck, Truck, Clock, FileText, Award, Layers } from 'lucide-react';

export const AdvantagesSection: React.FC = () => {
  const advantages = [
    {
      icon: Truck,
      title: 'Собственный парк техники',
      description: 'Вам не придется переплачивать посредникам. У нас свой рабочий мини-экскаватор со сменными ковшами и гидровращателем.',
    },
    {
      icon: Layers,
      title: 'Производственный цех в Керчи',
      description: 'Собственное цеховое изготовление ворот, металлокаркасных домов, навесов и беседок с точной геометрией и зачисткой швов.',
    },
    {
      icon: FileText,
      title: 'Работа по договору и смете',
      description: 'Фиксированная цена перед началом работ. Никаких внезапных наценок, скрытых комиссий или доплат во время исполнения.',
    },
    {
      icon: Clock,
      title: 'Выезд мастера в течение 1 часа',
      description: 'Оперативно выезжаем на замер и оценку объектов по Керчи, Багерово, Героевскому, Подмаячному и всему району.',
    },
    {
      icon: Award,
      title: 'Гарантия до 5 лет',
      description: 'Официальная письменная гарантия на все виды земляных работ, бетонирование фундаментов и сварные металлоконструкции.',
    },
    {
      icon: ShieldCheck,
      title: 'Любая форма оплаты',
      description: 'Работаем с физическими и юридическими лицами (наличный и безналичный расчет, перевод по СБП/картам).',
    },
  ];

  return (
    <section id="advantages" className="py-24 bg-slate-900 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase tracking-widest">
            <Award className="w-4 h-4" />
            Надежный подрядчик
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white font-montserrat">
            Почему клиенты выбирают ФЛАГМАН
          </h2>
          <p className="text-slate-400 text-base sm:text-lg">
            Мы берем на себя весь комплекс задач по подготовке территории, копке фундаментов и изготовлению металлоконструкций под ключ.
          </p>
        </div>

        {/* Advantages Cards Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mt-16">
          {advantages.map((adv, idx) => {
            const IconComponent = adv.icon;
            return (
              <div
                key={idx}
                className="p-8 rounded-2xl bg-slate-950 border border-slate-800 hover:border-amber-500/40 transition-all duration-300 space-y-4 group shadow-xl hover:-translate-y-1"
              >
                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 p-3 flex items-center justify-center text-amber-400 group-hover:bg-amber-500 group-hover:text-slate-950 transition-colors">
                  <IconComponent className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold text-white group-hover:text-amber-400 transition-colors">
                  {adv.title}
                </h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  {adv.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* Workflow steps */}
        <div className="mt-20 p-8 sm:p-12 rounded-3xl bg-slate-950 border border-slate-800">
          <h3 className="text-2xl font-black text-white text-center font-montserrat mb-10">
            Как мы работаем от звонка до сдачи объекта
          </h3>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="relative p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
              <div className="text-amber-400 font-black text-xl font-montserrat">01. Заявка</div>
              <div className="text-sm font-bold text-white">Звонок или заявка на сайте</div>
              <p className="text-xs text-slate-400">Уточняем параметры объекта и ориентировочную смету.</p>
            </div>

            <div className="relative p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
              <div className="text-amber-400 font-black text-xl font-montserrat">02. Замер</div>
              <div className="text-sm font-bold text-white">Выезд на бесплатный замер</div>
              <p className="text-xs text-slate-400">Инженер выезжает на участок, проводит замеры и нивелирование.</p>
            </div>

            <div className="relative p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
              <div className="text-amber-400 font-black text-xl font-montserrat">03. Договор</div>
              <div className="text-sm font-bold text-white">Согласование и договор</div>
              <p className="text-xs text-slate-400">Фиксируем сроки, смету и обязательства в договоре.</p>
            </div>

            <div className="relative p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
              <div className="text-amber-400 font-black text-xl font-montserrat">04. Сдача</div>
              <div className="text-sm font-bold text-white">Выполнение и приемка</div>
              <p className="text-xs text-slate-400">Приемка выполненных работ, выдача гарантийного сертификата.</p>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
};
