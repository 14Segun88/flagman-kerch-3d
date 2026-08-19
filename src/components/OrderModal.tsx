import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, Phone, User, MapPin, Send, ShieldAlert, Sparkles } from 'lucide-react';

interface OrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  serviceTitle?: string;
  prefilledParams?: string;
  estimatedPrice?: number;
}

export const OrderModal: React.FC<OrderModalProps> = ({
  isOpen,
  onClose,
  serviceTitle = 'Заказ услуги / Замер',
  prefilledParams = '',
  estimatedPrice,
}) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [comment, setComment] = useState(prefilledParams);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (prefilledParams) {
      setComment(prefilledParams);
    }
  }, [prefilledParams]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const cleanName = name.trim();
    const cleanPhone = phone.trim();

    if (!cleanName || cleanName.length < 2) {
      setErrorMsg('Пожалуйста, укажите ваше имя (не менее 2 символов)');
      return;
    }

    if (!cleanPhone || cleanPhone.length < 10) {
      setErrorMsg('Укажите корректный номер телефона для связи');
      return;
    }

    // Simulate safe order dispatching
    setSubmitted(true);
  };

  const handleResetAndClose = () => {
    setSubmitted(false);
    setName('');
    setPhone('');
    setAddress('');
    setComment('');
    setErrorMsg('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-800 p-6 sm:p-8 shadow-2xl space-y-6">
        
        {/* Close Button */}
        <button
          onClick={handleResetAndClose}
          className="absolute top-5 right-5 p-2 rounded-full bg-slate-950 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {submitted ? (
          <div className="text-center py-8 space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 p-4 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 animate-bounce" />
            </div>
            <h3 className="text-2xl font-black text-white font-montserrat">
              Заявка успешно принята!
            </h3>
            <p className="text-sm text-slate-300 max-w-sm mx-auto">
              Спасибо, <span className="text-amber-400 font-bold">{name}</span>. Наш главный инженер свяжется с вами по номеру <span className="text-amber-400 font-bold">{phone}</span> в течение 5-10 минут.
            </p>
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400">
              📍 Объект: Керчь и Ленинский район
            </div>
            <button
              onClick={handleResetAndClose}
              className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm shadow-lg glow-amber transition-colors"
            >
              Отлично, закрыть окно
            </button>
          </div>
        ) : (
          <>
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-widest">
                <Sparkles className="w-4 h-4" />
                ФЛАГМАН • Керчь
              </div>
              <h3 className="text-2xl font-black text-white font-montserrat mt-1">
                {serviceTitle}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Заполните форму для бесплатного выезда специалиста и закрепления сметы
              </p>
            </div>

            {estimatedPrice && (
              <div className="p-4 rounded-xl bg-slate-950 border border-amber-500/30 flex items-center justify-between">
                <span className="text-xs text-slate-300">Расчетная стоимость:</span>
                <span className="text-xl font-black text-amber-400 font-montserrat">
                  ~ {estimatedPrice.toLocaleString('ru-RU')} ₽
                </span>
              </div>
            )}

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Ваше имя *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    required
                    placeholder="Например, Александр"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-amber-500 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Телефон для связи *
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                  <input
                    type="tel"
                    required
                    placeholder="+7 (978) 000-00-00"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-amber-500 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Адрес объекта или район (необязательно)
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    placeholder="Например: Керчь, пос. Героевское"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-amber-500 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Детали заказа / Пожелания
                </label>
                <textarea
                  rows={3}
                  placeholder="Опишите объем работ, глубину траншеи или размеры забора..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-amber-500 focus:outline-none transition-colors resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm shadow-xl glow-amber flex items-center justify-center gap-2 transition-all"
              >
                <Send className="w-4 h-4" />
                <span>Отправить заявку мастеру</span>
              </button>

              <p className="text-[10px] text-slate-400 text-center">
                Нажимая кнопку, вы соглашаетесь на обработку персональных данных. Никакого спама.
              </p>
            </form>
          </>
        )}

      </div>
    </div>
  );
};
