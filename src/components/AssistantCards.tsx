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
          className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
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
              onClick={() => onSelectAssistant(assistant)}
              className={`
                relative text-left p-4 rounded-2xl transition-all duration-200
                ${isActive 
                  ? 'bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-400' 
                  : 'bg-slate-50 dark:bg-gray-800/50 border-2 border-transparent hover:bg-slate-100 dark:hover:bg-gray-800'
                }
              `}
            >
              {/* Header with icon and menu */}
              <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 rounded-full ${meta.iconBg} flex items-center justify-center flex-shrink-0`}>
                  <Icon size={20} className={meta.iconColor} />
                </div>
                <button 
                  className="p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                  onClick={(e) => { e.stopPropagation(); }}
                >
                  <MoreVertical size={16} className="text-gray-400" />
                </button>
              </div>

              {/* Title */}
              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
                {assistant.name}
              </h3>

              {/* Description */}
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-2">
                {assistant.description}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
