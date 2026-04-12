import React from 'react';

export const Header: React.FC = () => {
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

        {/* Pulse indicator */}
        <div className="mr-auto flex items-center gap-1.5" aria-hidden="true">
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
