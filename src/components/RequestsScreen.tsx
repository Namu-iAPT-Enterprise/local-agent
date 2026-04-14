import React, { Suspense } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

// ── 코드 스플리팅 (lazy import) ────────────────────────────────────────────────
//
// Requests 컴포넌트는 이 화면이 실제로 렌더링될 때만 번들이 로드됩니다.
// App.tsx 에서 hasAdminAccess 조건이 false 이면 이 컴포넌트 자체가 렌더링되지 않으므로
// 권한 없는 클라이언트에는 Requests 코드가 전달되지 않습니다.
const Requests = React.lazy(() => import('../pages/settings/Requests'));

interface RequestsScreenProps {
  onBack: () => void;
}

export default function RequestsScreen({ onBack }: RequestsScreenProps) {
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
        <h1 className="text-base font-semibold text-gray-900 dark:text-white">문의사항</h1>
      </header>

      {/* 본문 */}
      <main className="relative z-10 flex-1 overflow-y-auto flex justify-center px-10 py-8">
        <div className="w-full max-w-2xl">
          <Suspense
            fallback={
              <div className="flex items-center justify-center h-40 text-gray-400">
                <Loader2 size={24} className="animate-spin" />
              </div>
            }
          >
            <Requests />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
