import React from 'react';
import { X, ExternalLink, Sparkles } from 'lucide-react';

interface CadSoftwareAppProps {
  onCloseApp: () => void;
}

export const CadSoftwareApp: React.FC<CadSoftwareAppProps> = ({
  onCloseApp,
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-slate-950 text-slate-100 flex flex-col font-sans overflow-hidden">
      {/* 1. TOP CAD APPLICATION MENUBAR */}
      <div className="h-14 bg-slate-900 border-b border-slate-800 px-4 flex items-center justify-between shrink-0 text-xs shadow-md z-10 relative">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500 text-slate-950 font-black flex items-center justify-center text-xs shadow-md">
              CAD
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-white tracking-tight font-montserrat text-sm">
                ФЛАГМАН CAD v3.0 <span className="text-[10px] text-amber-400 font-mono">PRO (Pascal Editor)</span>
              </span>
              <span className="text-[10px] text-slate-400">Полноценный 3D-движок (Original GitHub Build)</span>
            </div>
          </div>
        </div>

        {/* Close App Button & AI Button */}
        <div className="flex items-center gap-3">
          <a
            href="/editor-app/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 font-bold hover:bg-emerald-500/30 transition-colors shadow-sm cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span>✨ DeepFloorPlan 2D➔3D & Планировки</span>
          </a>

          <a
            href="/editor-app/"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Открыть в новой вкладке</span>
          </a>

          <button
            onClick={onCloseApp}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs shadow-lg flex items-center gap-1.5 transition-colors"
          >
            <X className="w-4 h-4" />
            <span>Вернуться на сайт</span>
          </button>
        </div>
      </div>

      {/* 2. MAIN IFRAME WORKSPACE */}
      <div className="flex-1 w-full h-full bg-slate-950 relative">
        {/* Loading Spinner Background */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <div className="w-10 h-10 border-4 border-slate-800 border-t-amber-500 rounded-full animate-spin mb-4" />
          <div className="text-slate-400 text-sm font-medium animate-pulse">Загрузка 3D-движка Pascal...</div>
        </div>
        
        {/* The actual GitHub Editor */}
        <iframe
          src="/editor-app/"
          className="w-full h-full border-0 relative z-10 bg-transparent"
          title="Pascal 3D Architecture Editor"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    </div>
  );
};

