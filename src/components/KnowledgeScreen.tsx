import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import Knowledge from '../pages/settings/Knowledge';

// Eager import: `React.lazy` + Vite HMR on this file often forces repeated full page reloads
// while editing. App.tsx still skips this screen when `hasKnowledgeAccess` is false, so
// unauthorized users never load this module.

interface KnowledgeScreenProps {
  onBack: () => void;
}

export default function KnowledgeScreen({ onBack }: KnowledgeScreenProps) {
  const { bgImage } = useTheme();

  return (
    <div
      className="fixed inset-0 z-40 flex flex-col bg-white dark:bg-gray-950 font-sans"
      style={
        bgImage
          ? { backgroundImage: `url(${bgImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }
          : undefined
      }
    >
      {/* 배경 오버레이 (wallpaper 위에 덧씌움) */}
      {bgImage && <div className="absolute inset-0 bg-white/90 dark:bg-gray-950/20 pointer-events-none z-0" />}

      {/* 헤더 */}
      <header className="relative z-10 flex items-center gap-3 px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-950/80 backdrop-blur-sm">
        <button
          onClick={onBack}
          className="flex items-center justify-center w-9 h-9 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          title="돌아가기"
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-base font-semibold text-gray-900 dark:text-white">지식 관리</h1>
      </header>

      {/* 본문 */}
      <main className="relative z-10 flex-1 overflow-y-auto flex justify-center px-10 py-8">
        <div className="w-full max-w-2xl">
          <Knowledge />
        </div>
      </main>
    </div>
  );
}
