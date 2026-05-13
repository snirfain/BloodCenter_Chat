import React, { useEffect, useState } from 'react';
import { Header } from './components/Header';
import { ChatWindow } from './components/ChatWindow';
import { AdminDashboard } from './pages/AdminDashboard';

const App: React.FC = () => {
  const [adminRoute, setAdminRoute] = useState(() =>
    typeof window !== 'undefined'
      ? window.location.pathname.replace(/\/+$/, '') === '/admin'
      : false,
  );

  useEffect(() => {
    const sync = () =>
      setAdminRoute(window.location.pathname.replace(/\/+$/, '') === '/admin');
    window.addEventListener('popstate', sync);
    return () => window.removeEventListener('popstate', sync);
  }, []);

  if (adminRoute) {
    return (
      <div className="min-h-dvh overflow-auto bg-gray-200" dir="rtl" lang="he">
        <AdminDashboard />
      </div>
    );
  }

  return (
    /* Outer wrapper: exactly the viewport — no page scroll ever */
    <div className="h-dvh overflow-hidden bg-gray-200 flex flex-col py-0 sm:py-8 px-0 sm:px-4" dir="rtl" lang="he">
      {/* Inner card: fills available height, scrolling stays inside ChatWindow */}
      <div className="flex flex-col h-full sm:h-auto sm:flex-1 w-full max-w-2xl mx-auto bg-gray-50 shadow-2xl rounded-none sm:rounded-2xl overflow-hidden">
        <Header />
        <div id="main" className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <ChatWindow />
        </div>
      </div>

      {/* Accessibility: skip to content */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:right-2 focus:px-4 focus:py-2 focus:bg-mda-red focus:text-white focus:rounded focus:z-50"
      >
        דלג לתוכן
      </a>
    </div>
  );
};

export default App;
