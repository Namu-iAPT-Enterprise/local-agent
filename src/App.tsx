import React, { useState } from 'react';
import { ArrowUp, Plus, Star, Menu, X } from 'lucide-react';
import TemplateCards from './components/TemplateCards';
import Sidebar from './components/Sidebar';
import Settings from './pages/Settings';
import { useTheme } from './context/ThemeContext';
import { useLang } from './context/LanguageContext';

const modelIcons = [
  { label: 'Gemini', bg: 'bg-blue-500', symbol: '✦' },
  { label: 'ChatGPT', bg: 'bg-gray-800', symbol: '⊕' },
  { label: 'Claude', bg: 'bg-orange-500', symbol: '◎' },
  { label: 'X', bg: 'bg-black', symbol: 'X' },
  { label: 'Other', bg: 'bg-gray-400', symbol: '⊙' },
];

export default function App() {
  const [message, setMessage] = useState('');
  const [page, setPage] = useState<'home' | 'settings'>('home');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { bgImage } = useTheme();
  const { tr } = useLang();

  if (page === 'settings') {
    return <Settings onBack={() => setPage('home')} />;
  }

  return (
    <div className="flex h-screen font-sans overflow-hidden">
      {/* Sidebar — hidden on mobile */}
      <div className="hidden md:flex">
        <Sidebar onSettings={() => setPage('settings')} />
      </div>

      {/* Mobile sidebar drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="w-64 flex-shrink-0">
            <Sidebar onSettings={() => { setPage('settings'); setMobileMenuOpen(false); }} />
          </div>
          <div className="flex-1 bg-black/40" onClick={() => setMobileMenuOpen(false)} />
        </div>
      )}

      {/* Main content */}
      <main
        className="relative flex flex-col flex-1 overflow-y-auto bg-white dark:bg-gray-950"
        style={bgImage ? { backgroundImage: `url(${bgImage})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
      >
        {bgImage && <div className="absolute inset-0 bg-white/90 dark:bg-gray-950/20 pointer-events-none z-0" />}

        <div className="relative z-10 flex flex-col flex-1">
          {/* Mobile top bar */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800 md:hidden">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <Menu size={20} />
            </button>
            <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">NAMU LA</span>
            <div className="w-9" /> {/* spacer */}
          </div>

          {/* Content */}
          <div className="flex flex-col flex-1 items-center justify-center px-4 md:px-8 py-8 md:py-12">
            {/* Greeting */}
            <h1 className="text-2xl md:text-4xl font-bold text-gray-900 dark:text-white mb-6 md:mb-8 text-center px-2">
              {tr.greeting}
            </h1>

            <div className="w-full max-w-[800px]">
              {/* Model selector row */}
              <div className="flex items-center justify-center gap-2 mb-5 flex-wrap">
                {/* Active model pill */}
                <button className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm text-sm font-medium text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  <span className="text-blue-500">✦</span>
                  Gemini CLI
                  <Star size={13} className="text-yellow-400 fill-yellow-400 ml-0.5" />
                </button>

                {/* Other model icons */}
                {modelIcons.map(({ label, symbol }) => (
                  <button
                    key={label}
                    title={label}
                    className="w-9 h-9 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm flex items-center justify-center text-gray-600 dark:text-gray-300 text-sm font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    {symbol === '✦' ? <span className="text-blue-500 text-base">✦</span>
                      : symbol === '⊕' ? <span className="text-gray-700 dark:text-gray-300 text-base font-light">⊕</span>
                      : symbol === '◎' ? <span className="text-gray-600 dark:text-gray-300 text-base">◎</span>
                      : symbol === 'X' ? <span className="text-gray-800 dark:text-gray-200 text-sm font-bold">𝕏</span>
                      : <span className="text-gray-400 dark:text-gray-400 text-base">⊙</span>}
                  </button>
                ))}
              </div>

              {/* Input box */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-2xl bg-white dark:bg-gray-900 shadow-md overflow-hidden">
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={tr.inputPlaceholder}
                  rows={3}
                  className="w-full px-4 md:px-5 pt-4 pb-2 text-sm text-gray-700 dark:text-gray-200 placeholder-gray-400 outline-none resize-none bg-transparent"
                />

                {/* Input footer */}
                <div className="flex items-center justify-between px-3 md:px-4 py-3 border-t border-gray-100 dark:border-gray-700">
                  <button className="w-8 h-8 rounded-full border border-gray-300 dark:border-gray-600 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                    <Plus size={16} />
                  </button>

                  <div className="flex items-center gap-2">
                    <button className="hidden sm:block px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 text-xs text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors font-medium">
                      gemini-3-pro-preview
                    </button>
                    <button className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 text-xs text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors font-medium">
                      YOLO
                    </button>
                    <button
                      disabled={!message.trim()}
                      className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-300 hover:bg-blue-600 hover:text-white disabled:opacity-40 disabled:hover:bg-gray-200 dark:disabled:hover:bg-gray-700 disabled:hover:text-gray-500 transition-colors"
                    >
                      <ArrowUp size={16} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Template cards */}
              <div className="mt-6 md:mt-8">
                <TemplateCards onSelect={(t) => setMessage(t.description.replace('...', ''))} />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
