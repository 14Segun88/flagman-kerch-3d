import { useState, useEffect } from 'react';
import { Phone, Menu, X, HardHat, Sparkles } from 'lucide-react';

interface NavbarProps {
  onOpenModal: (serviceName?: string) => void;
  onOpenStudio?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenModal, onOpenStudio }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 shadow-2xl py-3'
          : 'bg-gradient-to-b from-slate-950/90 to-transparent py-5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Brand Logo */}
          <a href="#" className="flex items-center gap-3 group">
            <div className="w-11 h-11 rounded-xl bg-slate-900 border border-amber-500/40 p-2 flex items-center justify-center shadow-lg group-hover:border-amber-500 transition-colors">
              <img src="/logo-icon.svg" alt="ФЛАГМАН Логотип" className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-2xl font-black tracking-tight text-white font-montserrat">
                  ФЛАГМАН
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-bold border border-amber-500/30 uppercase tracking-widest">
                  Керчь
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium tracking-wide">
                Спецтехника • Строительство • Благоустройство
              </p>
            </div>
          </a>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-6">
            <a
              href="#services"
              className="text-sm font-semibold text-slate-300 hover:text-amber-400 transition-colors"
            >
              Услуги
            </a>
            {onOpenStudio && (
              <button
                onClick={onOpenStudio}
                className="text-sm font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1.5 bg-amber-500/10 px-3.5 py-1.5 rounded-xl border border-amber-500/30 transition-all hover:bg-amber-500/20 cursor-pointer shadow-sm"
              >
                <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
                <span>Создать проект</span>
              </button>
            )}
            <a
              href="#calculator"
              className="text-sm font-semibold text-slate-300 hover:text-amber-400 transition-colors flex items-center gap-1"
            >
              <span>Калькулятор</span>
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
            </a>
            <a
              href="#portfolio"
              className="text-sm font-semibold text-slate-300 hover:text-amber-400 transition-colors"
            >
              Галерея работ
            </a>
            <a
              href="#contacts"
              className="text-sm font-semibold text-slate-300 hover:text-amber-400 transition-colors"
            >
              Контакты
            </a>
          </nav>

          {/* Quick Actions & Phone */}
          <div className="hidden lg:flex items-center gap-5">
            <a
              href="tel:+79780000000"
              className="flex flex-col items-end group"
            >
              <div className="flex items-center gap-2 text-white font-bold text-base group-hover:text-amber-400 transition-colors">
                <Phone className="w-4 h-4 text-amber-400 animate-bounce" />
                <span>+7 (978) 555-01-99</span>
              </div>
              <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                На связи Пн-Вс: 8:00 - 20:00
              </span>
            </a>

            <button
              onClick={() => onOpenModal('Консультация с мастером')}
              className="relative group overflow-hidden rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-5 py-2.5 text-sm font-bold text-slate-950 shadow-lg hover:shadow-amber-500/25 hover:scale-105 active:scale-95 transition-all duration-200"
            >
              <span className="relative z-10 flex items-center gap-2">
                <HardHat className="w-4 h-4" />
                Вызвать мастера
              </span>
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white"
            aria-label="Переключить меню"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-slate-950/95 backdrop-blur-xl border-b border-slate-800 px-4 pt-4 pb-6 mt-2 space-y-4">
          <nav className="flex flex-col space-y-3">
            <a
              href="#services"
              onClick={() => setMobileMenuOpen(false)}
              className="text-base font-semibold text-slate-200 hover:text-amber-400 py-1"
            >
              Услуги и цены
            </a>
            <a
              href="#calculator"
              onClick={() => setMobileMenuOpen(false)}
              className="text-base font-semibold text-slate-200 hover:text-amber-400 py-1"
            >
              Рассчитать стоимость
            </a>
            <a
              href="#portfolio"
              onClick={() => setMobileMenuOpen(false)}
              className="text-base font-semibold text-slate-200 hover:text-amber-400 py-1"
            >
              Наши объекты (Фото)
            </a>
            <a
              href="#advantages"
              onClick={() => setMobileMenuOpen(false)}
              className="text-base font-semibold text-slate-200 hover:text-amber-400 py-1"
            >
              Почему ФЛАГМАН
            </a>
            <a
              href="#contacts"
              onClick={() => setMobileMenuOpen(false)}
              className="text-base font-semibold text-slate-200 hover:text-amber-400 py-1"
            >
              Контакты
            </a>
          </nav>

          <div className="pt-3 border-t border-slate-800 flex flex-col gap-3">
            <a
              href="tel:+79780000000"
              className="flex items-center gap-3 text-amber-400 font-bold text-lg"
            >
              <Phone className="w-5 h-5" />
              +7 (978) 555-01-99
            </a>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenModal('Быстрый заказ');
              }}
              className="w-full py-3 rounded-xl bg-amber-500 text-slate-950 font-extrabold text-center shadow-lg"
            >
              Заказать звонок
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
