import type { LucideIcon } from 'lucide-react';
import { ChatInput, type ChatInputProps } from './ChatInput';

const ASSISTANT_META: Record<string, { iconBg: string; iconColor: string }> = {
  governance: { iconBg: 'bg-amber-100 dark:bg-amber-900/30', iconColor: 'text-amber-600 dark:text-amber-400' },
  hr:         { iconBg: 'bg-cyan-100 dark:bg-cyan-900/30',   iconColor: 'text-cyan-600 dark:text-cyan-400'   },
  finance:    { iconBg: 'bg-orange-100 dark:bg-orange-900/30', iconColor: 'text-orange-600 dark:text-orange-400' },
  legal:      { iconBg: 'bg-rose-100 dark:bg-rose-900/30',   iconColor: 'text-rose-600 dark:text-rose-400'   },
  operations: { iconBg: 'bg-violet-100 dark:bg-violet-900/30', iconColor: 'text-violet-600 dark:text-violet-400' },
};

interface AssistantChatIntroProps {
  id: string;
  name: string;
  description: string;
  Icon: LucideIcon;
  chatInputProps: ChatInputProps;
}

export function AssistantChatIntro({ id, name, description, Icon, chatInputProps }: AssistantChatIntroProps) {
  const meta = ASSISTANT_META[id] ?? {
    iconBg: 'bg-gray-100 dark:bg-gray-800',
    iconColor: 'text-gray-600 dark:text-gray-400',
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 items-center justify-center px-4 py-8 sm:px-8 md:px-12 md:py-12 lg:px-16 overflow-y-auto">
      <div className="w-full max-w-3xl lg:max-w-4xl mx-auto flex flex-col items-center">

        {/* Icon */}
        <div className={`w-20 h-20 rounded-3xl ${meta.iconBg} flex items-center justify-center mb-6 shadow-sm`}>
          <Icon size={40} className={meta.iconColor} />
        </div>

        {/* Title */}
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-3 text-center">
          {name}
        </h1>

        {/* Description */}
        <p className="text-base text-gray-500 dark:text-gray-400 text-center max-w-md mb-10 leading-relaxed">
          {description}
        </p>

        {/* Chat input */}
        <div className="w-full max-w-[720px]">
          <ChatInput {...chatInputProps} />
        </div>
      </div>
    </div>
  );
}
