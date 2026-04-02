import React from 'react';

interface Template {
  id: string;
  title: string;
  description: string;
  previewBg: string;
  previewContent: React.ReactNode;
}

const templates: Template[] = [
  {
    id: 'video-understanding',
    title: 'Video Understanding',
    description: 'Recreate the website shown in this video within a single...',
    previewBg: 'bg-indigo-900',
    previewContent: (
      <div className="flex flex-col items-center justify-center h-full text-white text-center px-2">
        <div className="text-xs font-semibold mb-1">Foundation for AI Creation</div>
        <div className="text-[10px] opacity-70">Explore Infinitely Leading Foundational Models</div>
      </div>
    ),
  },
  {
    id: 'image-understanding',
    title: 'Image Understanding',
    description: 'How to make this dish?',
    previewBg: 'bg-amber-50',
    previewContent: (
      <div className="flex items-center justify-center h-full">
        <div className="text-4xl">🍖</div>
      </div>
    ),
  },
  {
    id: 'html-generation-1',
    title: 'HTML Generation',
    description: 'Based on this image, create an HTML webpage.',
    previewBg: 'bg-blue-50',
    previewContent: (
      <div className="flex flex-col gap-1 p-2 h-full">
        <div className="h-2 bg-blue-200 rounded w-3/4" />
        <div className="h-2 bg-blue-100 rounded w-full" />
        <div className="h-2 bg-blue-100 rounded w-5/6" />
        <div className="h-2 bg-blue-200 rounded w-2/3 mt-1" />
        <div className="h-2 bg-blue-100 rounded w-full" />
      </div>
    ),
  },
  {
    id: 'html-generation-2',
    title: 'HTML Generation',
    description: 'Create an X MBTI analyzer: the user pastes a tweet →...',
    previewBg: 'bg-purple-900',
    previewContent: (
      <div className="flex flex-col items-center justify-center h-full text-white text-center px-2">
        <div className="text-xs font-bold mb-1">MBTI Analyzer</div>
        <div className="w-12 h-8 bg-purple-700 rounded flex items-center justify-center text-[10px]">analyze</div>
      </div>
    ),
  },
  {
    id: 'logical-reasoning-1',
    title: 'Logical Reasoning',
    description: 'Can a 5.5-meter-long bamboo pole pass through...',
    previewBg: 'bg-gray-50',
    previewContent: (
      <div className="flex items-center justify-center h-full text-gray-400 text-2xl font-light">
        √x²
      </div>
    ),
  },
  {
    id: 'logical-reasoning-2',
    title: 'Logical Reasoning',
    description: 'I want to get my car washed. The car wash is only 50...',
    previewBg: 'bg-sky-50',
    previewContent: (
      <div className="flex items-center justify-center h-full">
        <div className="text-3xl">🏠</div>
      </div>
    ),
  },
  {
    id: 'code-generation',
    title: 'Code Generation',
    description: 'Create a complete, playable Tetris game with all standar...',
    previewBg: 'bg-gray-900',
    previewContent: (
      <div className="flex flex-col items-center justify-center h-full gap-1">
        <div className="text-green-400 text-[10px] font-mono">SCORE: 00000</div>
        <div className="flex gap-0.5">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex flex-col gap-0.5">
              {[...Array(5)].map((_, j) => (
                <div
                  key={j}
                  className="w-3 h-3 rounded-sm"
                  style={{ backgroundColor: ['#f00','#0f0','#00f','#ff0','#f0f'][((i+j) % 5)] + '99' }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: 'content-generation',
    title: 'Content Generation',
    description: "I've noticed chip giants like NVIDIA and Intel are...",
    previewBg: 'bg-slate-800',
    previewContent: (
      <div className="flex items-center justify-center h-full">
        <div className="text-3xl">🛸</div>
      </div>
    ),
  },
];

interface TemplateCardsProps {
  onSelect?: (template: Template) => void;
}

export default function TemplateCards({ onSelect }: TemplateCardsProps) {
  return (
    <div className="w-full">
      <p className="text-center text-sm text-gray-500 dark:text-gray-400 mb-4">
        Select a template and experience it with one click.
      </p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {templates.map((t) => (
          <button
            key={t.id}
            onClick={() => onSelect?.(t)}
            className="flex flex-col text-left border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md transition-all overflow-hidden group"
          >
            {/* Text section */}
            <div className="px-3 pt-3 pb-2">
              <div className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {t.title}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 leading-snug line-clamp-2">
                {t.description}
              </div>
            </div>
            {/* Preview section */}
            <div className={`mx-2 mb-2 rounded-lg h-24 ${t.previewBg} overflow-hidden`}>
              {t.previewContent}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
