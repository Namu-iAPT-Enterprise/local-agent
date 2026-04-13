import React from 'react';
import { Plus } from 'lucide-react';
import type { OfficeAssistant } from '../data/officeAssistants';

interface AssistantChipsProps {
  assistants: OfficeAssistant[];
  activeAssistantId: string | null;
  onSelectAssistant: (assistant: OfficeAssistant) => void;
  onCreateAssistant: () => void;
}

export default function AssistantChips({
  assistants,
  activeAssistantId,
  onSelectAssistant,
  onCreateAssistant,
}: AssistantChipsProps) {
  return (
    <div className="w-full">
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 text-center">
        업무용 어시스턴트를 선택하세요
      </p>

      <div className="overflow-x-auto hide-scrollbar">
        <div className="flex items-center justify-center gap-2 px-4 pb-2 min-w-max">
          {assistants.map((assistant) => {
            const Icon = assistant.icon;
            const isActive = activeAssistantId === assistant.id;

            return (
              <button
                key={assistant.id}
                onClick={() => onSelectAssistant(assistant)}
                title={assistant.description}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-full
                  text-sm font-medium whitespace-nowrap
                  transition-all duration-200 ease-out
                  hover:scale-105 active:scale-95
                  ${isActive
                    ? `${assistant.color} text-white shadow-lg shadow-blue-500/30 ring-2 ring-white dark:ring-gray-800`
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }
                `}
              >
                <Icon size={16} className={isActive ? 'text-white' : 'text-gray-500 dark:text-gray-400'} />
                <span>{assistant.name}</span>
              </button>
            );
          })}

          <button
            onClick={onCreateAssistant}
            title="새 어시스턴트 만들기"
            className="
              flex items-center gap-1.5 px-3 py-2 rounded-full
              text-sm font-medium whitespace-nowrap
              border-2 border-dashed border-gray-300 dark:border-gray-600
              text-gray-500 dark:text-gray-400
              hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-400
              hover:bg-blue-50 dark:hover:bg-blue-950/30
              transition-all duration-200
            "
          >
            <Plus size={16} />
            <span>추가</span>
          </button>
        </div>
      </div>
    </div>
  );
}
