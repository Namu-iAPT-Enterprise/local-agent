import AssistantCards from '../AssistantCards';
import { ChatInput, type ChatInputProps } from './ChatInput';
import type { OfficeAssistant } from '../../data/officeAssistants';

export interface EmptyChatHomeProps {
  greeting: string;
  chatInputProps: ChatInputProps;
  assistants: OfficeAssistant[];
  activeAssistantId: string | null;
  onSelectAssistant: (assistant: OfficeAssistant) => void;
  onCreateAssistant: () => void;
  onEditAssistant: (assistant: OfficeAssistant) => void;
  onDeleteAssistant: (id: string) => void;
}

export function EmptyChatHome({
  greeting,
  chatInputProps,
  assistants,
  activeAssistantId,
  onSelectAssistant,
  onCreateAssistant,
  onEditAssistant,
  onDeleteAssistant,
}: EmptyChatHomeProps) {
  return (
    <div className="flex flex-col flex-1 min-h-0 items-center justify-center px-4 py-8 sm:px-8 md:px-12 md:py-12 lg:px-16 overflow-y-auto">
      <div className="w-full max-w-3xl lg:max-w-4xl mx-auto flex flex-col items-center">
        <h1 className="text-2xl md:text-4xl font-bold text-gray-900 dark:text-white mb-6 md:mb-8 text-center px-2">
          {greeting}
        </h1>
        <div className="w-full max-w-[720px]">
          <ChatInput {...chatInputProps} />
          <div className="mt-6 w-full">
            <AssistantCards
              assistants={assistants}
              activeAssistantId={activeAssistantId}
              onSelectAssistant={onSelectAssistant}
              onCreateAssistant={onCreateAssistant}
              onEditAssistant={onEditAssistant}
              onDeleteAssistant={onDeleteAssistant}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
