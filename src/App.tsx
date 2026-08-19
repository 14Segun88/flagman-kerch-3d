import { useState } from 'react';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { ServicesSection } from './components/ServicesSection';
import { CalculatorSection } from './components/CalculatorSection';
import { PortfolioGallery } from './components/PortfolioGallery';
import { AdvantagesSection } from './components/AdvantagesSection';
import { FAQSection } from './components/FAQSection';
import { Footer } from './components/Footer';
import { OrderModal } from './components/OrderModal';
import { ConstructorStudioModal } from './components/ConstructorStudioModal';
import { AiProjectBuilderModal } from './components/AiProjectBuilderModal';

export function App() {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalServiceTitle, setModalServiceTitle] = useState('Заявка на консультацию');
  const [modalParams, setModalParams] = useState('');
  const [modalEstimate, setModalEstimate] = useState<number | undefined>(undefined);

  // AI 2D-to-3D Project Builder Modal State
  const [aiBuilderOpen, setAiBuilderOpen] = useState(false);
  const [studioOpen, setStudioOpen] = useState(false);

  const handleOpenModal = (serviceTitle: string = 'Консультация с мастером') => {
    setModalServiceTitle(serviceTitle);
    setModalParams('');
    setModalEstimate(undefined);
    setModalOpen(true);
  };

  const handleOpenModalWithEstimate = (details: { service: string; params: string; estimatedPrice: number }) => {
    setModalServiceTitle(details.service);
    setModalParams(details.params);
    setModalEstimate(details.estimatedPrice);
    setModalOpen(true);
  };

  const handleOpenModalWithProject = (projectDetails: {
    title: string;
    projectId: string;
    specsText: string;
    estimatedPrice: number;
  }) => {
    setModalServiceTitle(`Согласование чертежа (${projectDetails.projectId})`);
    setModalParams(`ПРОЕКТ CAD №${projectDetails.projectId}\n${projectDetails.title}\n\nСпецификация:\n${projectDetails.specsText}`);
    setModalEstimate(projectDetails.estimatedPrice);
    setModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      {/* Header */}
      <Navbar
        onOpenModal={handleOpenModal}
        onOpenStudio={() => setAiBuilderOpen(true)}
      />

      {/* Main Content */}
      <main className="flex-grow">
        <Hero
          onOpenModal={handleOpenModal}
          onOpenStudio={() => setAiBuilderOpen(true)}
        />
        <ServicesSection
          onOpenModal={handleOpenModal}
          onOpenModalWithProject={handleOpenModalWithProject}
          onOpenStudio={() => setAiBuilderOpen(true)}
        />
        <CalculatorSection onOpenModalWithEstimate={handleOpenModalWithEstimate} />
        <PortfolioGallery onOpenModal={handleOpenModal} />
        <AdvantagesSection />
        <FAQSection onOpenModal={handleOpenModal} />
      </main>

      {/* Footer */}
      <Footer onOpenModal={handleOpenModal} />

      {/* Direct AI Project Builder (Gemini 3.6 Flash + Blender 3D Engine) */}
      <AiProjectBuilderModal
        isOpen={aiBuilderOpen}
        onClose={() => setAiBuilderOpen(false)}
        onSendToEngineer={handleOpenModalWithProject}
      />

      {/* Full-Screen 3D Constructor Modal */}
      <ConstructorStudioModal
        isOpen={studioOpen}
        onClose={() => setStudioOpen(false)}
        onSendProjectToEngineer={handleOpenModalWithProject}
      />

      {/* Lead Modal */}
      <OrderModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        serviceTitle={modalServiceTitle}
        prefilledParams={modalParams}
        estimatedPrice={modalEstimate}
      />
    </div>
  );
}

export default App;
