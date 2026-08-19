import React from 'react';
import { Phone, MapPin, Clock, MessageCircle, ShieldCheck } from 'lucide-react';

export const Footer: React.FC<{ onOpenModal: (serviceName?: string) => void }> = ({ onOpenModal }) => {
  return (
    <footer id="contacts" className="bg-slate-950 text-slate-400 border-t border-slate-800">
      
      {/* Top CTA Bar */}
      <div className="border-b border-slate-800 bg-slate-900/50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 border border-amber-500/30 p-8 sm:p-10 flex flex-col lg:flex-row items-center justify-between gap-8 shadow-2xl">
            <div className="space-y-2 text-center lg:text-left">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-widest">
                Строительный цех & Аренда техники
              </span>
              <h3 className="text-2xl sm:text-3xl font-black text-white font-montserrat">
                Готовы начать ваш объект уже сегодня?
              </h3>
              <p className="text-sm text-slate-300 max-w-xl">
                Свяжитесь с нами прямо сейчас для бесплатного выезда специалиста, замеров и согласования сметы по Керчи.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 shrink-0">
              <a
                href="https://wa.me/79785550199"
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-colors"
              >
                <MessageCircle className="w-5 h-5" />
                Написать в WhatsApp
              </a>

              <button
                onClick={() => onOpenModal('Вызов мастера из футера')}
                className="px-8 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm shadow-lg glow-amber transition-all"
              >
                Перезвонить мне
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Columns */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-10">
          
          {/* Brand Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-900 border border-amber-500/40 p-2 flex items-center justify-center">
                <img src="/logo-icon.svg" alt="ФЛАГМАН Керчь" className="w-full h-full object-contain" />
              </div>
              <span className="text-2xl font-black text-white font-montserrat tracking-tight">
                ФЛАГМАН
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Компания «ФЛАГМАН» в Керчи: профессиональные услуги мини-экскаватора, копка траншей и фундаментов, изготовление заборов, ворот, навесов, беседок, металлокаркасов и покос травы.
            </p>
            <div className="pt-2 text-xs text-emerald-400 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" />
              Официальный договор и личная ответственность
            </div>
          </div>

          {/* Contacts */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider font-montserrat">
              Контакты и выезд
            </h4>
            <ul className="space-y-3 text-xs">
              <li>
                <a href="tel:+79785550199" className="flex items-center gap-2 text-white font-bold hover:text-amber-400 transition-colors">
                  <Phone className="w-4 h-4 text-amber-400" />
                  +7 (978) 555-01-99
                </a>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>г. Керчь, производственная база и выезд по всему Ленинскому району</span>
              </li>
              <li className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Ежедневно с 8:00 до 20:00 без выходных</span>
              </li>
            </ul>
          </div>

          {/* Services Quick Links */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider font-montserrat">
              Основные направления
            </h4>
            <ul className="space-y-2 text-xs">
              <li><a href="#services" className="hover:text-amber-400 transition-colors">Услуги мини-экскаватора</a></li>
              <li><a href="#services" className="hover:text-amber-400 transition-colors">Траншеи под воду и кабель</a></li>
              <li><a href="#services" className="hover:text-amber-400 transition-colors">Ленточный фундамент и дренаж</a></li>
              <li><a href="#services" className="hover:text-amber-400 transition-colors">Заборы из профнастила и 3D</a></li>
              <li><a href="#services" className="hover:text-amber-400 transition-colors">Ворота распашные и автоматика</a></li>
              <li><a href="#services" className="hover:text-amber-400 transition-colors">Навесы, беседки, металлокаркасы</a></li>
              <li><a href="#services" className="hover:text-amber-400 transition-colors">Покос травы и расчистка</a></li>
            </ul>
          </div>

          {/* Service Locations */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider font-montserrat">
              Зона обслуживания
            </h4>
            <p className="text-xs text-slate-400">
              Оперативно выезжаем собственной спецтехникой в следующие населенные пункты:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {['Керчь', 'Героевское', 'Войково', 'Багерово', 'Подмаячный', 'Глазовка', 'Курортное', 'Аршинцево', 'Ленинский р-н'].map((loc, i) => (
                <span key={i} className="px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 text-[11px] text-slate-300">
                  {loc}
                </span>
              ))}
            </div>
          </div>

        </div>

        {/* Bottom copyright */}
        <div className="mt-12 pt-8 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div>
            © {new Date().getFullYear()} ФЛАГМАН Керчь (Цех Керчь). Все права защищены.
          </div>
          <div className="flex items-center gap-1">
            <span>Создано для развития строительства в Керчи и Крыму</span>
          </div>
        </div>

      </div>
    </footer>
  );
};
