import React from 'react';

export type AppView = 'chat' | 'reference';

interface HeaderProps {
  activeView: AppView;
  onViewChange: (view: AppView) => void;
}

export const Header: React.FC<HeaderProps> = ({ activeView, onViewChange }) => {
  return (
    <header
      className="sticky top-0 z-50 bg-mda-red shadow-md"
      role="banner"
      aria-label="כותרת האפליקציה"
    >
      <div className="max-w-2xl mx-auto px-4 py-2 flex items-center gap-3">
        {/* MDA Logo */}
        <div className="flex items-center justify-center shrink-0 bg-white rounded-lg px-2 py-1">
          <img
            src="/mda-logo.png"
            alt="מגן דוד אדום"
            className="h-9 w-auto"
          />
        </div>

        <div className="flex flex-col leading-tight">
          <span className="text-white font-bold text-base tracking-wide" lang="he">
            מגן דוד אדום
          </span>
          <span className="text-red-100 text-xs font-medium" lang="he">
            בדיקת זכאות לתרומת דם
          </span>
        </div>

        {/* View switcher */}
        <nav
          className="mr-auto flex items-center gap-1 rounded-lg bg-red-900/30 p-0.5"
          aria-label="מעבר בין מסכים"
        >
          <button
            type="button"
            onClick={() => onViewChange('chat')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              activeView === 'chat'
                ? 'bg-white text-mda-red shadow-sm'
                : 'text-red-100 hover:bg-white/10'
            }`}
            aria-current={activeView === 'chat' ? 'page' : undefined}
          >
            בדיקה
          </button>
          <button
            type="button"
            onClick={() => onViewChange('reference')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              activeView === 'reference'
                ? 'bg-white text-mda-red shadow-sm'
                : 'text-red-100 hover:bg-white/10'
            }`}
            aria-current={activeView === 'reference' ? 'page' : undefined}
          >
            טבלאות
          </button>
        </nav>

        {/* Pulse indicator */}
        <div className="flex items-center gap-1.5 shrink-0" aria-hidden="true">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-200 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white" />
          </span>
          <span className="text-red-100 text-xs hidden sm:inline">מערכת פעילה</span>
        </div>
      </div>
    </header>
  );
};
