import React from 'react';
import { Shield, Users, DollarSign, Scale, Activity, Plus, MoreVertical } from 'lucide-react';
import type { OfficeAssistant } from '../data/officeAssistants';

interface AssistantCardsProps {
  assistants: OfficeAssistant[];
  activeAssistantId: string | null;
  onSelectAssistant: (assistant: OfficeAssistant) => void;
  onCreateAssistant: () => void;
}

const assistantMeta: Record<string, { iconBg: string; iconColor: string }> = {
  governance: { iconBg: 'bg-amber-100', iconColor: 'text-amber-600' },
  hr: { iconBg: 'bg-cyan-100', iconColor: 'text-cyan-600' },
  finance: { iconBg: 'bg-orange-100', iconColor: 'text-orange-600' },
  legal: { iconBg: 'bg-rose-100', iconColor: 'text-rose-600' },
  operations: { iconBg: 'bg-violet-100', iconColor: 'text-violet-600' },
};

export default function AssistantCards({
  assistants,
  activeAssistantId,
  onSelectAssistant,
  onCreateAssistant,
}: AssistantCardsProps) {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          업무용 어시스턴트
        </h2>
        <button
          onClick={onCreateAssistant}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-black hover:bg-neutral-900 text-white text-sm font-medium transition-colors dark:bg-black dark:hover:bg-neutral-900"
        >
          <Plus size={18} />
          <span>새 어시스턴트</span>
        </button>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {assistants.map((assistant) => {
          const Icon = assistant.icon;
          const isActive = activeAssistantId === assistant.id;
          const meta = assistantMeta[assistant.id] || { iconBg: 'bg-gray-100', iconColor: 'text-gray-600' };

          return (
            <button
              key={assistant.id}
              type="button"
              aria-label={`${assistant.name}. ${assistant.description}`}
              onClick={() => onSelectAssistant(assistant)}
              className={`
                relative text-left p-4 rounded-2xl transition-all duration-200
                ${isActive 
                  ? 'bg-blue-50 dark:bg-blue-900/20 border-2 border-transparent' 
                  : 'bg-slate-50 dark:bg-gray-800/50 border-2 border-transparent hover:bg-slate-100 dark:hover:bg-gray-800'
                }
              `}
            >
              {/* Header with icon and menu */}
              <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 rounded-full ${meta.iconBg} flex items-center justify-center flex-shrink-0`}>
                  <Icon size={20} className={meta.iconColor} />
                </div>
                <div
                  role="button"
                  tabIndex={0}
                  className="p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                  onClick={(e) => { e.stopPropagation(); }}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') e.stopPropagation(); }}
                >
                  <MoreVertical size={16} className="text-gray-400" />
                </div>
              </div>

              {/* Title only — description / system prompt hidden in UI */}
              <h3 className="text-base font-semibold text-gray-900 dark:text-white text-left">
                {assistant.name}
              </h3>
            </button>
          );
        })}
      </div>
    </div>
  );
}
