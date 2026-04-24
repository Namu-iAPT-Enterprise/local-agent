import { FileText } from 'lucide-react';
import ChatMarkdown from '../ChatMarkdown';
import { stripFileBlocksForEdit, type UserAttachmentDisplay } from '../../hooks/useChat';
import { detectCodeLanguage } from './detectCodeLanguage';

export function UserMessage({ content, attachments }: { content: string; attachments?: UserAttachmentDisplay[] }) {
  const displayText = stripFileBlocksForEdit(content);
  const hasFences = /```/.test(displayText);
  const detectedLang = !hasFences ? detectCodeLanguage(displayText) : null;

  const attachmentRow =
    attachments && attachments.length > 0 ? (
      <div className="flex flex-wrap gap-1.5 justify-end mb-1.5 max-w-[88%] sm:max-w-[75%]">
        {attachments.map((a) =>
          a.kind === 'image' && a.previewUrl ? (
            <img
              key={a.id}
              src={a.previewUrl}
              alt=""
              className="h-14 w-14 sm:h-16 sm:w-16 rounded-lg object-cover border border-white/25"
            />
          ) : (
            <span
              key={a.id}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-500/90 text-white text-xs border border-white/20"
            >
              <FileText size={12} />
              {a.name}
            </span>
          ),
        )}
      </div>
    ) : null;

  if (hasFences || detectedLang) {
    const mdContent = hasFences ? displayText : `\`\`\`${detectedLang}\n${displayText}\n\`\`\``;
    return (
      <div className="flex flex-col items-end max-w-[88%] sm:max-w-[80%]">
        {attachmentRow}
        <div className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl rounded-br-sm overflow-hidden">
          <div className="px-4 py-3">
            <ChatMarkdown content={mdContent} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end max-w-[88%] sm:max-w-[75%]">
      {attachmentRow}
      <div className="px-4 py-2.5 bg-blue-600 text-white rounded-2xl rounded-br-sm whitespace-pre-wrap leading-relaxed text-sm">
        {displayText || (attachments?.length ? '(attachment)' : '')}
      </div>
    </div>
  );
}
