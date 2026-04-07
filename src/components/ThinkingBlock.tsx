import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, Brain } from 'lucide-react';

interface ThinkingBlockProps {
  thinking: string;
  isStreaming: boolean; // true while the <think> block is still being written
}

export default function ThinkingBlock({ thinking, isStreaming }: ThinkingBlockProps) {
  // Auto-open while streaming, auto-collapse when done
  const [open, setOpen] = useState(true);
  useEffect(() => {
    if (!isStreaming) setOpen(false);
  }, [isStreaming]);

  return (
    <div className="mb-3">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors group"
      >
        {open ? (
          <ChevronDown size={13} className="flex-shrink-0" />
        ) : (
          <ChevronRight size={13} className="flex-shrink-0" />
        )}
        <Brain size={13} className="flex-shrink-0 text-purple-400" />
        <span className="font-medium">
          {isStreaming ? (
            <span className="flex items-center gap-1">
              Thinking
              <span className="flex gap-0.5">
                <span className="w-1 h-1 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1 h-1 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1 h-1 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              </span>
            </span>
          ) : (
            'Thought process'
          )}
        </span>
        {!isStreaming && (
          <span className="text-gray-400 dark:text-gray-500 font-normal ml-0.5">
            ({thinking.split(/\s+/).filter(Boolean).length} words)
          </span>
        )}
      </button>

      {open && (
        <div className="mt-2 pl-4 border-l-2 border-purple-200 dark:border-purple-800">
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed whitespace-pre-wrap font-mono">
            {thinking}
            {isStreaming && (
              <span className="inline-block w-1 h-3 bg-purple-400 ml-0.5 align-middle animate-pulse" />
            )}
          </p>
        </div>
      )}
    </div>
  );
}
