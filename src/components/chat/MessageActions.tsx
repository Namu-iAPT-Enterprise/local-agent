import { Check, Copy, Pencil, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { useCopy } from '../../hooks/useCopy';
import type { AssistantVariant } from '../../hooks/useChat';

export function UserMessageActions({ content, onEdit }: { content: string; onEdit: () => void }) {
  const [copied, copy] = useCopy();
  return (
    <div className="flex items-center gap-1 mt-1 justify-end opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => copy(content)}
        title="Copy"
        className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      >
        {copied ? <Check size={13} className="text-green-500" /> : <Copy size={13} />}
      </button>
      <button
        type="button"
        onClick={onEdit}
        title="Edit"
        className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      >
        <Pencil size={13} />
      </button>
    </div>
  );
}

interface AssistantMessageActionsProps {
  content: string;
  isStreaming: boolean;
  variants?: AssistantVariant[];
  activeVariantIdx?: number;
  onRegenerate: () => void;
  onVariantChange: (idx: number) => void;
}

export function AssistantMessageActions({
  content, isStreaming, variants, activeVariantIdx, onRegenerate, onVariantChange,
}: AssistantMessageActionsProps) {
  const [copied, copy] = useCopy();
  const hasVariants = variants && variants.length > 1;
  const currentIdx = activeVariantIdx ?? (variants ? variants.length - 1 : 0);
  const total = variants?.length ?? 1;

  return (
    <div className="flex items-center gap-1 mt-1.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => copy(content)}
        title="Copy"
        className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      >
        {copied ? <Check size={13} className="text-green-500" /> : <Copy size={13} />}
      </button>
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={onRegenerate}
        disabled={isStreaming}
        title="Regenerate"
        className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 transition-colors"
      >
        <RefreshCw size={13} />
      </button>
      {hasVariants && (
        <div className="flex items-center gap-0.5 ml-1">
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onVariantChange(currentIdx - 1)}
            disabled={currentIdx === 0 || isStreaming}
            className="p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 transition-colors"
          >
            <ChevronLeft size={13} />
          </button>
          <span className="text-[10px] text-gray-400 dark:text-gray-500 tabular-nums min-w-[28px] text-center">
            {currentIdx + 1}/{total}
          </span>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onVariantChange(currentIdx + 1)}
            disabled={currentIdx === total - 1 || isStreaming}
            className="p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 transition-colors"
          >
            <ChevronRight size={13} />
          </button>
        </div>
      )}
    </div>
  );
}
