import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowUp,
  Plus,
  Brain,
  Database,
  X,
  FileText,
  Paperclip,
  Image,
} from 'lucide-react';
import { type ModelOption, type PendingChatAttachment } from '../../hooks/useChat';
import { ModelSelector } from './ModelSelector';

export interface ChatInputProps {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  chatFileInputRef: React.RefObject<HTMLInputElement | null>;
  onChatFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /** Same pipeline as the hidden file input — used for drag-and-drop onto the composer. */
  onAddFilesFromBrowser: (files: File[]) => void | Promise<void>;
  pendingAttachments: PendingChatAttachment[];
  onRemovePendingAttachment: (id: string) => void;
  input: string;
  setInput: (v: string) => void;
  isStreaming: boolean;
  thinkingMode: boolean;
  onThinkingToggle: () => void;
  ragMode: boolean;
  onRagToggle: () => void;
  selectedModel: ModelOption;
  onModelChange: (m: ModelOption) => void;
  onSend: () => void;
  onStop?: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  placeholder: string;
}

/** Document/code picker; image extensions included so “Upload files” still accepts photos (Electron-friendly). */
const CHAT_FILE_ACCEPT =
  '.txt,.text,.md,.markdown,.mdx,.csv,.json,.xml,.log,.ts,.tsx,.js,.jsx,.mjs,.cjs,.py,.java,.c,.cpp,.h,.hpp,.go,.rs,.sql,.yaml,.yml,.sh,.env,.css,.scss,.html,.vue,.svelte,.png,.jpg,.jpeg,.gif,.webp,.bmp,.svg,.ico,.heic,.heif,.avif,.tif,.tiff';

function FileTypeIcon({ name }: { name: string }) {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  const imageExts = ['png','jpg','jpeg','gif','webp','bmp','svg','ico','heic','heif','avif','tif','tiff'];
  const codeExts = ['ts','tsx','js','jsx','mjs','cjs','py','java','c','cpp','h','hpp','go','rs','vue','svelte','html','css','scss'];
  const dataExts = ['json','xml','csv','yaml','yml','sql'];
  if (imageExts.includes(ext)) return <Image size={14} className="text-blue-400 flex-shrink-0" />;
  if (codeExts.includes(ext)) return <FileText size={14} className="text-purple-400 flex-shrink-0" />;
  if (dataExts.includes(ext)) return <FileText size={14} className="text-emerald-400 flex-shrink-0" />;
  return <FileText size={14} className="text-gray-400 flex-shrink-0" />;
}

function AttachmentChip({
  attachment,
  onRemove,
  index,
}: {
  attachment: PendingChatAttachment;
  onRemove: () => void;
  index: number;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const isImage = attachment.kind === 'image' && attachment.previewUrl && !imgFailed;

  if (attachment.status === 'loading') {
    return (
      <div
        className="chat-composer-attachment-skeleton flex-shrink-0 h-8 w-28 rounded-lg"
        style={{ animationDelay: `${index * 60}ms` }}
        aria-hidden
      />
    );
  }

  return (
    <div
      className="group flex-shrink-0 flex items-center gap-1.5 h-8 pl-1 pr-1 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-500 transition-colors max-w-[160px]"
      title={attachment.name}
    >
      {/* Thumbnail or icon */}
      {isImage ? (
        <div className="flex-shrink-0 h-6 w-6 rounded-md overflow-hidden bg-gray-100 dark:bg-gray-700">
          <img
            src={attachment.previewUrl}
            alt=""
            className="h-full w-full object-cover"
            onError={() => setImgFailed(true)}
          />
        </div>
      ) : (
        <div className="flex-shrink-0 h-6 w-6 rounded-md flex items-center justify-center bg-gray-100 dark:bg-gray-700">
          <FileTypeIcon name={attachment.name} />
        </div>
      )}
      {/* Filename */}
      <span className="min-w-0 flex-1 text-xs text-gray-600 dark:text-gray-300 truncate leading-none">
        {attachment.name}
      </span>
      {/* Remove */}
      <button
        type="button"
        onClick={onRemove}
        className="flex-shrink-0 flex items-center justify-center h-5 w-5 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
        aria-label={`Remove ${attachment.name}`}
      >
        <X size={11} strokeWidth={2.5} />
      </button>
    </div>
  );
}

export function ChatInput({
  textareaRef,
  chatFileInputRef,
  onChatFileChange,
  onAddFilesFromBrowser,
  pendingAttachments,
  onRemovePendingAttachment,
  input, setInput,
  isStreaming, thinkingMode, onThinkingToggle,
  ragMode, onRagToggle,
  selectedModel, onModelChange,
  onSend, onStop, onKeyDown, placeholder,
}: ChatInputProps) {
  const [attachMenuOpen, setAttachMenuOpen] = useState(false);
  const attachMenuRef = useRef<HTMLDivElement>(null);
  const chatImageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!attachMenuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (attachMenuRef.current && !attachMenuRef.current.contains(e.target as Node)) {
        setAttachMenuOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAttachMenuOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [attachMenuOpen]);

  const attachmentBusy = pendingAttachments.some((a) => a.status === 'loading');
  const canSend =
    !attachmentBusy && (input.trim().length > 0 || pendingAttachments.length > 0);
  const hasAttachments = pendingAttachments.length > 0;
  return (
    <div
      className="border border-gray-200 dark:border-gray-700 rounded-2xl bg-white dark:bg-gray-900 shadow-md overflow-visible"
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        const files = Array.from(e.dataTransfer.files);
        if (files.length) void onAddFilesFromBrowser(files);
      }}
      title="Drop images or text files here, or use + to attach"
    >
      <input
        ref={chatFileInputRef}
        id="composer-attach-file"
        type="file"
        multiple
        className="sr-only"
        accept={CHAT_FILE_ACCEPT}
        onChange={onChatFileChange}
      />
      <input
        ref={chatImageInputRef}
        id="composer-attach-image"
        type="file"
        multiple
        className="sr-only"
        accept="image/*"
        onChange={onChatFileChange}
      />
      <div
        className={`flex flex-col min-w-0 px-4 md:px-5 ${hasAttachments ? 'pt-3' : ''}`}
      >
        {hasAttachments && (
          <div
            className="flex flex-row gap-1.5 pb-2.5 overflow-x-auto hide-scrollbar"
            aria-busy={attachmentBusy}
          >
            {pendingAttachments.map((a, idx) => (
              <AttachmentChip
                key={a.id}
                attachment={a}
                onRemove={() => onRemovePendingAttachment(a.id)}
                index={idx}
              />
            ))}
          </div>
        )}
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          rows={3}
          disabled={isStreaming}
          className={`w-full pb-2 text-sm text-gray-700 dark:text-gray-200 placeholder-gray-400 outline-none resize-none bg-transparent disabled:opacity-60 ${
            hasAttachments ? 'pt-2' : 'pt-4 rounded-t-2xl'
          }`}
        />
      </div>
      <div className="flex items-center justify-between px-3 md:px-4 py-3 border-t border-gray-100 dark:border-gray-700">
        <div className="relative" ref={attachMenuRef}>
          <button
            type="button"
            disabled={isStreaming}
            onClick={() => setAttachMenuOpen((o) => !o)}
            title="Attach files or photos"
            aria-expanded={attachMenuOpen}
            aria-haspopup="menu"
            className="w-8 h-8 rounded-full border border-gray-300 dark:border-gray-600 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-40"
          >
            <Plus size={16} />
          </button>
          {attachMenuOpen && (
            <div
              role="menu"
              className="absolute bottom-full left-0 mb-2 z-[60] min-w-[220px] rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-lg py-1 overflow-hidden"
            >
              <button
                type="button"
                role="menuitem"
                className="w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm text-gray-800 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700/80 transition-colors cursor-pointer"
                onClick={() => { chatFileInputRef.current?.click(); setAttachMenuOpen(false); }}
              >
                <Paperclip size={18} className="text-gray-500 dark:text-gray-400 flex-shrink-0" />
                <span>Upload files</span>
              </button>
              <button
                type="button"
                role="menuitem"
                className="w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm text-gray-800 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700/80 transition-colors cursor-pointer"
                onClick={() => { chatImageInputRef.current?.click(); setAttachMenuOpen(false); }}
              >
                <Image size={18} className="text-gray-500 dark:text-gray-400 flex-shrink-0" />
                <span>Photos</span>
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <ModelSelector selected={selectedModel} onChange={onModelChange} />

          <button
            type="button"
            onClick={onRagToggle}
            title={ragMode ? 'Knowledge base ON — click to disable' : 'Knowledge base OFF — click to enable'}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
              ragMode
                ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400'
                : 'border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <Database size={13} />
            <span className="hidden sm:inline">Knowledge</span>
          </button>

          <button
            type="button"
            onClick={onThinkingToggle}
            title={thinkingMode ? 'Thinking mode ON' : 'Thinking mode OFF'}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
              thinkingMode
                ? 'border-purple-400 bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400'
                : 'border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <Brain size={13} />
            <span className="hidden sm:inline">Thinking</span>
          </button>

          {isStreaming ? (
            <button
              type="button"
              onClick={() => onStop?.()}
              title="Stop generation"
              className="w-8 h-8 rounded-lg bg-red-500 hover:bg-red-600 flex items-center justify-center text-white transition-colors"
            >
              <span className="w-3 h-3 rounded-sm bg-white" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onSend}
              disabled={!canSend}
              className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-300 hover:bg-blue-600 hover:text-white disabled:opacity-40 disabled:hover:bg-gray-200 dark:disabled:hover:bg-gray-700 disabled:hover:text-gray-500 transition-colors"
            >
              <ArrowUp size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
