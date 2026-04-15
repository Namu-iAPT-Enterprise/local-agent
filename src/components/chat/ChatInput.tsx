import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowUp,
  Plus,
  Brain,
  Database,
  X,
  FileText,
  Paperclip,
  Image,
  Zap,
} from 'lucide-react';
import { type ModelOption, type PendingChatAttachment } from '../../hooks/useChat';
import { ModelSelector } from './ModelSelector';
import { getInstalledSkills, type Skill } from '../../data/skills';

/** Shown next to the attach (+) control when an office assistant is selected. */
export interface ActiveAssistantChipData {
  id: string;
  name: string;
  Icon: LucideIcon;
}

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
  /** Selected 업무 어시스턴트 — icon + title beside the + button. */
  activeAssistant?: ActiveAssistantChipData | null;
  onClearAssistant?: () => void;
}

/** All MIME types — “Photos” menu still uses `image/*` only */
const CHAT_FILE_ACCEPT = '*/*';

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
  onOpenPreview,
  index,
}: {
  attachment: PendingChatAttachment;
  onRemove: () => void;
  onOpenPreview: () => void;
  index: number;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const isImage = attachment.kind === 'image' && attachment.previewUrl && !imgFailed;
  const canPreview =
    (attachment.kind === 'image' && attachment.previewUrl && !imgFailed) ||
    (attachment.kind === 'file' && attachment.text);

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
      className={`group flex-shrink-0 flex items-center gap-1.5 h-8 pl-1 pr-1 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-500 transition-colors max-w-[160px] ${
        canPreview ? 'cursor-pointer' : ''
      }`}
      title={canPreview ? `${attachment.name} — click to preview` : attachment.name}
    >
      <button
        type="button"
        disabled={!canPreview}
        onClick={() => canPreview && onOpenPreview()}
        className="flex min-w-0 flex-1 items-center gap-1.5 text-left disabled:cursor-default"
      >
        {isImage ? (
          <div className="flex-shrink-0 h-6 w-6 rounded-md overflow-hidden bg-gray-100 dark:bg-gray-700">
            <img
              src={attachment.previewUrl}
              alt=""
              className="h-full w-full object-cover pointer-events-none"
              onError={() => setImgFailed(true)}
              referrerPolicy="no-referrer"
            />
          </div>
        ) : (
          <div className="flex-shrink-0 h-6 w-6 rounded-md flex items-center justify-center bg-gray-100 dark:bg-gray-700">
            <FileTypeIcon name={attachment.name} />
          </div>
        )}
        <span className="min-w-0 flex-1 text-xs text-gray-600 dark:text-gray-300 truncate leading-none">
          {attachment.name}
        </span>
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="flex-shrink-0 flex items-center justify-center h-5 w-5 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
        aria-label={`Remove ${attachment.name}`}
      >
        <X size={11} strokeWidth={2.5} />
      </button>
    </div>
  );
}

function AttachmentPreviewModal({
  attachment,
  onClose,
}: {
  attachment: PendingChatAttachment;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const body =
    attachment.kind === 'image' && attachment.previewUrl ? (
      <img
        src={attachment.previewUrl}
        alt=""
        className="max-h-[min(70vh,560px)] max-w-full object-contain rounded-lg shadow-lg"
        referrerPolicy="no-referrer"
      />
    ) : attachment.kind === 'file' && attachment.text ? (
      <pre className="max-h-[min(70vh,560px)] w-full max-w-2xl overflow-auto rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 p-4 text-left text-xs text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words">
        {attachment.text}
      </pre>
    ) : (
      <p className="text-sm text-gray-500 dark:text-gray-400">No preview available for this attachment.</p>
    );

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/55 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-label="Attachment preview"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[90vh] max-w-[min(96vw,720px)] flex-col items-center gap-3 rounded-2xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 p-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex w-full items-center justify-between gap-2 border-b border-gray-100 dark:border-gray-700 pb-2">
          <span className="min-w-0 truncate text-sm font-medium text-gray-900 dark:text-gray-100">
            {attachment.name}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="flex-shrink-0 rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label="Close preview"
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex max-h-[min(75vh,600px)] justify-center overflow-auto">{body}</div>
      </div>
    </div>,
    document.body,
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
  activeAssistant = null,
  onClearAssistant,
}: ChatInputProps) {
  const [attachMenuOpen, setAttachMenuOpen] = useState(false);
  const [previewAttachment, setPreviewAttachment] = useState<PendingChatAttachment | null>(null);
  const attachMenuRef = useRef<HTMLDivElement>(null);
  const chatImageInputRef = useRef<HTMLInputElement>(null);

  // ── Slash command autocomplete ────────────────────────────────────────────
  const [slashSuggestions, setSlashSuggestions] = useState<Skill[]>([]);
  const [slashIndex, setSlashIndex] = useState(0);
  const slashMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const match = /(?:^|\s)(\/(\w*))$/.exec(input);
    if (match) {
      const query = match[2].toLowerCase();
      const installed = getInstalledSkills();
      const hits = installed.filter((s) => s.id.toLowerCase().startsWith(query));
      setSlashSuggestions(hits);
      setSlashIndex(0);
    } else {
      setSlashSuggestions([]);
    }
  }, [input]);

  const applySlashSkill = (skill: Skill) => {
    const updated = input.replace(/\/\w*$/, `/${skill.id} `);
    setInput(updated);
    setSlashSuggestions([]);
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const handleSlashKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (slashSuggestions.length === 0) return false;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSlashIndex((i) => (i + 1) % slashSuggestions.length);
      return true;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSlashIndex((i) => (i - 1 + slashSuggestions.length) % slashSuggestions.length);
      return true;
    }
    if (e.key === 'Enter' || e.key === 'Tab') {
      const skill = slashSuggestions[slashIndex];
      if (skill) { e.preventDefault(); applySlashSkill(skill); return true; }
    }
    if (e.key === 'Escape') {
      setSlashSuggestions([]);
      return true;
    }
    return false;
  };

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
      className="relative border border-neutral-200/90 dark:border-neutral-700 rounded-2xl bg-white dark:bg-neutral-950 shadow-md overflow-visible"
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
      title="Drop files here, or use + to attach (any file type)"
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
        className={`flex flex-col min-w-0 px-4 md:px-5 rounded-t-2xl bg-transparent ${
          hasAttachments ? 'pt-3' : ''
        }`}
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
                onOpenPreview={() => setPreviewAttachment(a)}
                index={idx}
              />
            ))}
          </div>
        )}
        {/* Slash command suggestions popup */}
        {slashSuggestions.length > 0 && (
          <div
            ref={slashMenuRef}
            className="absolute bottom-full left-0 right-0 mb-2 z-[60] rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-lg overflow-hidden"
          >
            <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 dark:border-gray-700">
              <Zap size={12} className="text-blue-500" />
              <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Skills</span>
            </div>
            {slashSuggestions.map((skill, i) => (
              <button
                key={skill.id}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); applySlashSkill(skill); }}
                onMouseEnter={() => setSlashIndex(i)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                  i === slashIndex
                    ? 'bg-blue-50 dark:bg-blue-900/30'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-700/60'
                }`}
              >
                <span className="text-base w-7 text-center flex-shrink-0">{skill.icon}</span>
                <div className="min-w-0">
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-100">/{skill.id}</span>
                  <p className="text-xs text-gray-400 truncate mt-0.5">{skill.description}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (!handleSlashKeyDown(e)) onKeyDown(e); }}
          placeholder={placeholder}
          rows={3}
          disabled={isStreaming}
          className={`w-full pb-2 text-sm text-neutral-800 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 outline-none resize-none bg-transparent disabled:opacity-60 ${
            hasAttachments ? 'pt-2' : 'pt-4 rounded-t-2xl'
          }`}
        />
      </div>
      <div className="flex items-center justify-between gap-2 px-3 md:px-4 py-3 border-t border-neutral-100 dark:border-neutral-800 bg-transparent">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <div className="relative flex-shrink-0" ref={attachMenuRef}>
            <button
              type="button"
              disabled={isStreaming}
              onClick={() => setAttachMenuOpen((o) => !o)}
              title="Attach files or photos"
              aria-expanded={attachMenuOpen}
              aria-haspopup="menu"
              className="w-8 h-8 rounded-full border border-neutral-300 dark:border-neutral-600 flex items-center justify-center text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-500 active:bg-neutral-200/80 dark:active:bg-neutral-700 transition-colors disabled:opacity-40"
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

          {activeAssistant && (() => {
            const AssistantIcon = activeAssistant.Icon;
            return (
              <div
                className="group relative flex min-w-0 max-w-[min(100%,240px)] items-center gap-1.5 rounded-lg border border-neutral-200 dark:border-neutral-600 bg-transparent pl-1.5 pr-1"
                title={activeAssistant.name}
              >
                <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md text-neutral-700 dark:text-neutral-200">
                  <AssistantIcon size={15} strokeWidth={2} />
                </div>
                <span className="min-w-0 flex-1 truncate text-left text-xs font-medium text-neutral-800 dark:text-neutral-100">
                  {activeAssistant.name}
                </span>
                {onClearAssistant && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onClearAssistant();
                    }}
                    className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md text-neutral-400 opacity-0 transition-opacity hover:bg-neutral-200 hover:text-neutral-800 group-hover:opacity-100 dark:hover:bg-neutral-700 dark:hover:text-neutral-100"
                    aria-label="Remove assistant"
                    title="Remove assistant"
                  >
                    <X size={14} strokeWidth={2.5} />
                  </button>
                )}
              </div>
            );
          })()}
        </div>

        <div className="flex flex-shrink-0 items-center gap-2">
          <ModelSelector selected={selectedModel} onChange={onModelChange} />

          <button
            type="button"
            onClick={onRagToggle}
            title={ragMode ? 'Knowledge base ON — click to disable' : 'Knowledge base OFF — click to enable'}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
              ragMode
                ? 'border-black/20 bg-black text-white hover:bg-neutral-900 dark:border-white/15 dark:bg-black dark:text-white dark:hover:bg-neutral-900'
                : 'border-neutral-200 dark:border-neutral-600 text-neutral-600 dark:text-neutral-400 bg-neutral-100/90 dark:bg-neutral-900/80 hover:bg-neutral-200/90 dark:hover:bg-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-500 active:bg-neutral-200 dark:active:bg-neutral-800'
            }`}
          >
            <Database size={13} />
            <span className="hidden sm:inline">Knowledge</span>
          </button>

          {selectedModel.supportsThinking !== false && (
            <button
              type="button"
              onClick={onThinkingToggle}
              title={thinkingMode ? 'Thinking mode ON' : 'Thinking mode OFF'}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                thinkingMode
                  ? 'border-black/20 bg-black text-white hover:bg-neutral-900 dark:border-white/15 dark:bg-black dark:text-white dark:hover:bg-neutral-900'
                  : 'border-neutral-200 dark:border-neutral-600 text-neutral-600 dark:text-neutral-400 bg-neutral-100/90 dark:bg-neutral-900/80 hover:bg-neutral-200/90 dark:hover:bg-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-500 active:bg-neutral-200 dark:active:bg-neutral-800'
              }`}
            >
              <Brain size={13} />
              <span className="hidden sm:inline">Thinking</span>
            </button>
          )}

          {isStreaming ? (
            <button
              type="button"
              onClick={() => onStop?.()}
              title="Stop generation"
              className="w-8 h-8 rounded-lg bg-black hover:bg-neutral-900 text-white shadow-sm flex items-center justify-center transition-colors dark:bg-black dark:hover:bg-neutral-900"
            >
              <span className="w-3 h-3 rounded-sm bg-white" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onSend}
              disabled={!canSend}
              title={canSend ? 'Send message' : 'Type a message or attach a file'}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                canSend
                  ? 'bg-black text-white shadow-sm hover:bg-neutral-900 active:bg-neutral-950 dark:bg-black dark:text-white dark:hover:bg-neutral-900'
                  : 'bg-neutral-200/90 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500 opacity-60 cursor-not-allowed shadow-none'
              }`}
            >
              <ArrowUp size={14} strokeWidth={2.5} />
            </button>
          )}
        </div>
      </div>
      {previewAttachment && (
        <AttachmentPreviewModal
          attachment={previewAttachment}
          onClose={() => setPreviewAttachment(null)}
        />
      )}
    </div>
  );
}
