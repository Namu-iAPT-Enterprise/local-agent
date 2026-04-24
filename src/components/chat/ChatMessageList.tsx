import type React from 'react';
import ChatMarkdown from '../ChatMarkdown';
import ThinkingBlock from '../ThinkingBlock';
import { UserMessage } from './UserMessage';
import { UserMessageActions, AssistantMessageActions } from './MessageActions';
import { SkillDownloadCard } from './SkillDownloadCard';
import type { Message, ModelOption } from '../../hooks/useChat';

export interface ChatMessageListProps {
  messages: Message[];
  isStreaming: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  prepareEdit: (index: number) => string;
  setInput: (v: string) => void;
  regenerate: (
    index: number,
    thinkingMode: boolean,
    model: ModelOption,
    ragMode: boolean,
    systemPrompt?: string,
  ) => void;
  /** When set, merged into the API request on regenerate only; user bubbles stay plain text. */
  assistantSystemPrompt?: string | null;
  setVariant: (messageIndex: number, variantIndex: number) => void;
  thinkingMode: boolean;
  selectedModel: ModelOption;
  ragMode: boolean;
}

export function ChatMessageList({
  messages,
  isStreaming,
  messagesEndRef,
  textareaRef,
  prepareEdit,
  setInput,
  regenerate,
  setVariant,
  thinkingMode,
  selectedModel,
  ragMode,
  assistantSystemPrompt,
}: ChatMessageListProps) {
  return (
    <>
      {messages.map((msg, i) => (
        <div
          key={i}
          className={`group flex min-w-0 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
        >
          {msg.role === 'assistant' && (
            <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold mr-2 mt-0.5 flex-shrink-0">
              N
            </div>
          )}
          {msg.role === 'user' ? (
            <div className="flex flex-col items-end">
              <UserMessage content={msg.content} attachments={msg.attachments} />
              <UserMessageActions
                content={msg.content}
                onEdit={() => {
                  const t = prepareEdit(i);
                  setInput(t);
                  setTimeout(() => {
                    const el = textareaRef.current;
                    if (!el) return;
                    el.focus();
                    el.setSelectionRange(t.length, t.length);
                  }, 0);
                }}
              />
            </div>
          ) : (
            <div className="flex min-w-0 flex-1 flex-col">
              <div className={`min-w-0 rounded-2xl text-sm ${
                msg.error
                  ? 'max-w-[75%] px-4 py-2.5 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-bl-sm whitespace-pre-wrap leading-relaxed'
                  : 'w-full max-w-full'
              }`}>
                {!msg.error ? (() => {
                  const isLast = i === messages.length - 1;
                  const thinkingStreaming = isStreaming && isLast && !msg.content;
                  return (
                    <div className="py-1">
                      {msg.thinking && (
                        <ThinkingBlock thinking={msg.thinking} isStreaming={thinkingStreaming} />
                      )}
                      {msg.content ? (
                        <>
                          <ChatMarkdown
                            content={msg.content}
                            streaming={Boolean(isStreaming && isLast)}
                          />
                          {/* When a slash-skill was used and streaming is done, append download card */}
                          {msg.skillType && !(isStreaming && isLast) && (
                            <div className="mt-4">
                              <SkillDownloadCard content={msg.content} skillType={msg.skillType} />
                            </div>
                          )}
                        </>
                      ) : isStreaming && isLast && !msg.thinking ? (
                        msg.status === 'connecting' ? (
                          <div className="flex items-center gap-2 text-gray-400 dark:text-gray-500 text-xs py-1">
                            <span className="w-3 h-3 rounded-full border-2 border-gray-300 dark:border-gray-600 border-t-blue-500 animate-spin flex-shrink-0" />
                            <span>Connecting…</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-gray-400 dark:text-gray-500 text-xs py-1">
                            <span className="flex gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                              <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                              <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                            </span>
                          </div>
                        )
                      ) : null}
                      {isStreaming && isLast && msg.content && (
                        <span className="inline-block w-0.5 h-4 bg-gray-400 dark:bg-gray-500 ml-0.5 align-middle animate-pulse" />
                      )}
                    </div>
                  );
                })() : msg.content}
              </div>
              {!msg.error && !(isStreaming && i === messages.length - 1) && (
                <AssistantMessageActions
                  content={msg.content}
                  isStreaming={isStreaming}
                  variants={msg.variants}
                  activeVariantIdx={msg.activeVariantIdx}
                  onRegenerate={() =>
                    regenerate(i, thinkingMode, selectedModel, ragMode, assistantSystemPrompt ?? undefined)
                  }
                  onVariantChange={(idx) => setVariant(i, idx)}
                />
              )}
            </div>
          )}
        </div>
      ))}
      <div ref={messagesEndRef} />
    </>
  );
}
