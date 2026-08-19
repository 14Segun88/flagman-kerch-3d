import React, { useState } from 'react';
import { HelpCircle, ChevronDown, MessageSquare } from 'lucide-react';

interface FAQItem {
  question: string;
  answer: string;
}

export const FAQSection: React.FC<{ onOpenModal: (serviceName?: string) => void }> = ({ onOpenModal }) => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs: FAQItem[] = [
    {
      question: 'Каково минимальное время заказа мини-экскаватора?',
      answer: 'Минимальный заказ мини-экскаватора по Керчи составляет от 3 часов (плюс доставка спецтехники до объекта эвакуатором). При больших объемах работ (от 1 смены) действуют гибкие скидки.',
    },
    {
      question: 'Как рассчитывается стоимость доставки спецтехники на участок?',
      answer: 'В пределах городской черты Керчи доставка фиксированная. Для отдаленных поселков Ленинского района (Героевское, Подмаячный, Войково, Багерово, Глазовка) стоимость рассчитывается исходя из километража.',
    },
    {
      question: 'Можете ли вы установить автоматику на уже имеющиеся ворота?',
      answer: 'Да! Мы занимаемся как изготовлением ворот под ключ, так и автоматизацией уже установленных распашных и откатных ворот. Подберем приводы под вес и парусность ваших створок.',
    },
    {
      question: 'Входит ли утилизация и вывоз скошенной травы в услугу покоса?',
      answer: 'По умолчанию мы производим покос и укладку травы в валки. При необходимости мы организуем сгребание, упаковку в мешки и вывоз самосвалами за пределы участка.',
    },
    {
      question: 'Какая гарантия предоставляется на готовые металлоконструкции?',
      answer: 'На сварные швы и геометрию металлокаркасов (навесы, беседки, заборы) дается официальная гарантия 5 лет. На установленную автоматику ворот — официальная гарантия завода-изготовителя (до 3 лет).',
    },
    {
      question: 'Как заказать бесплатный замер участка?',
      answer: 'Просто оставьте заявку на нашем сайте или позвоните по телефону. Инженер согласует удобное время и приедет к вам на объект с измерительными инструментами и каталогами материалов.',
    },
  ];

  return (
    <section className="py-24 bg-slate-950 border-t border-slate-800">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase tracking-widest">
            <HelpCircle className="w-4 h-4" />
            Ответы на вопросы
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-white font-montserrat">
            Часто задаваемые вопросы
          </h2>
          <p className="text-slate-400 text-sm sm:text-base">
            Не нашли ответ на свой вопрос? Свяжитесь с нашим техническим специалистом напрямую.
          </p>
        </div>

        <div className="mt-12 space-y-4">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <div
                key={index}
                className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden transition-colors"
              >
                <button
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  className="w-full p-6 text-left flex items-center justify-between gap-4 font-bold text-white text-base hover:text-amber-400 transition-colors"
                >
                  <span>{faq.question}</span>
                  <ChevronDown
                    className={`w-5 h-5 text-amber-400 shrink-0 transition-transform duration-300 ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-6 pb-6 text-sm text-slate-300 leading-relaxed border-t border-slate-800/80 pt-4">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-12 text-center p-6 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-left">
            <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <div className="text-sm font-bold text-white">Остались вопросы по вашему объекту?</div>
              <div className="text-xs text-slate-400">Задайте их инженеру ФЛАГМАН напрямую</div>
            </div>
          </div>
          <button
            onClick={() => onOpenModal('Задать вопрос инженеру')}
            className="px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm shadow-md transition-colors shrink-0"
          >
            Задать вопрос
          </button>
        </div>

      </div>
    </section>
  );
};
