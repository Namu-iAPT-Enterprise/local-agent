import React, { useState, useRef, useEffect } from 'react';
import { Plus, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import type { OfficeAssistant } from '../data/officeAssistants';

interface AssistantCardsProps {
  assistants: OfficeAssistant[];
  activeAssistantId: string | null;
  onSelectAssistant: (assistant: OfficeAssistant) => void;
  onCreateAssistant: () => void;
  onEditAssistant: (assistant: OfficeAssistant) => void;
  onDeleteAssistant: (id: string) => void;
}

const assistantMeta: Record<string, { iconBg: string; iconColor: string }> = {
  governance: { iconBg: 'bg-amber-100', iconColor: 'text-amber-600' },
  hr:         { iconBg: 'bg-cyan-100',  iconColor: 'text-cyan-600'  },
  finance:    { iconBg: 'bg-orange-100',iconColor: 'text-orange-600'},
  legal:      { iconBg: 'bg-rose-100',  iconColor: 'text-rose-600'  },
  operations: { iconBg: 'bg-violet-100',iconColor: 'text-violet-600'},
};

export default function AssistantCards({
  assistants,
  activeAssistantId,
  onSelectAssistant,
  onCreateAssistant,
  onEditAssistant,
  onDeleteAssistant,
}: AssistantCardsProps) {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!openMenuId) return;
    const handle = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [openMenuId]);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">업무용 어시스턴트</h2>
        <button
          onClick={onCreateAssistant}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-black hover:bg-neutral-900 text-white text-sm font-medium transition-colors"
        >
          <Plus size={18} />
          <span>새 어시스턴트</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {assistants.map((assistant) => {
          const Icon = assistant.icon;
          const isActive = activeAssistantId === assistant.id;
          const meta = assistantMeta[assistant.id] ?? { iconBg: 'bg-gray-100', iconColor: 'text-gray-600' };
          const isMenuOpen = openMenuId === assistant.id;

          return (
            <div
              key={assistant.id}
              onClick={() => onSelectAssistant(assistant)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelectAssistant(assistant); }}
              aria-label={`${assistant.name}. ${assistant.description}`}
              className={`
                relative text-left p-4 rounded-2xl cursor-pointer transition-all duration-200 select-none
                ${isActive
                  ? 'bg-blue-50 dark:bg-blue-900/20 border-2 border-transparent'
                  : 'bg-slate-50 dark:bg-gray-800/50 border-2 border-transparent hover:bg-slate-100 dark:hover:bg-gray-800'
                }
              `}
            >
              {/* Header row */}
              <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 rounded-full ${meta.iconBg} flex items-center justify-center flex-shrink-0`}>
                  <Icon size={20} className={meta.iconColor} />
                </div>

                {/* 3-dot menu */}
                <div
                  ref={isMenuOpen ? menuRef : null}
                  className="relative"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => setOpenMenuId(isMenuOpen ? null : assistant.id)}
                    className="p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                    aria-label="메뉴 열기"
                  >
                    <MoreVertical size={16} className="text-gray-400" />
                  </button>

                  {isMenuOpen && (
                    <div className="absolute right-0 top-8 z-50 min-w-[140px] bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 py-1 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => { setOpenMenuId(null); onEditAssistant(assistant); }}
                        className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        <Pencil size={14} className="text-gray-400" />
                        수정
                      </button>

                      {!assistant.isDefault && (
                        <button
                          type="button"
                          onClick={() => { setOpenMenuId(null); onDeleteAssistant(assistant.id); }}
                          className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        >
                          <Trash2 size={14} />
                          삭제
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Title */}
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                {assistant.name}
              </h3>
            </div>
          );
        })}
      </div>
    </div>
  );
}
