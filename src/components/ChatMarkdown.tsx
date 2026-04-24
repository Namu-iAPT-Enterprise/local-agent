import React, { Component, useEffect, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';
import { normalizeMarkdownForChat } from '../utils/markdownChatNormalize';
import { padIncompleteStreamingMarkdown } from '../utils/streamingMarkdownPad';
import { debugSessionLog } from '../utils/debugSessionLog';

let debugPingSent = false;

type MarkdownEbState = { error: Error | null };
class MarkdownRenderErrorBoundary extends Component<
  { children: React.ReactNode; rawFallback: string },
  MarkdownEbState
> {
  state: MarkdownEbState = { error: null };

  static getDerivedStateFromError(error: Error): MarkdownEbState {
    return { error };
  }

  componentDidUpdate(prevProps: { rawFallback: string }) {
    if (prevProps.rawFallback !== this.props.rawFallback && this.state.error) {
      this.setState({ error: null });
    }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // #region agent log
    debugSessionLog('ChatMarkdown.tsx:MarkdownRenderErrorBoundary', 'remark/react-markdown render failed', {
      hypothesisId: 'A',
      errorMessage: error.message,
      stack: error.stack?.slice(0, 1200),
      componentStack: info.componentStack?.slice(0, 1200),
    });
    // #endregion
  }

  render() {
    const { error } = this.state;
    if (error) {
      return (
        <div className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
          <p className="font-medium">Markdown display error (showing raw text while streaming)</p>
          <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-words text-xs opacity-90">
            {this.props.rawFallback}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

interface Props {
  content: string;
  /** True while the assistant message is still receiving tokens */
  streaming?: boolean;
}

const linkClass =
  'text-blue-600 underline underline-offset-2 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300';

const markdownComponents: Components = {
  h1: ({ children }) => (
    <h1 className="mt-4 mb-2 text-2xl font-bold first:mt-0">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="mt-4 mb-2 text-xl font-semibold first:mt-0">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="mt-3 mb-1.5 text-lg font-semibold first:mt-0">{children}</h3>
  ),
  h4: ({ children }) => (
    <h4 className="mt-3 mb-1.5 text-base font-semibold first:mt-0">{children}</h4>
  ),
  p: ({ children }) => <p className="my-2 first:mt-0 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="my-2 list-disc pl-6">{children}</ul>,
  ol: ({ children }) => <ol className="my-2 list-decimal pl-6">{children}</ol>,
  li: ({ children }) => <li className="my-0.5">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="my-3 border-l-4 border-gray-300 pl-4 text-gray-700 italic dark:border-gray-600 dark:text-gray-300">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-6 border-gray-200 dark:border-gray-700" />,
  a: ({ href, children }) => {
    const h = typeof href === 'string' && href.trim() ? href.trim() : undefined;
    if (!h) {
      return <span className={linkClass}>{children}</span>;
    }
    return (
      <a
        href={h}
        className={linkClass}
        target="_blank"
        rel="noopener noreferrer"
      >
        {children}
      </a>
    );
  },
  img: ({ src, alt, ...props }) => {
    const s = typeof src === 'string' && src.trim() ? src.trim() : undefined;
    if (!s) return null;
    return (
      <img
        {...props}
        src={s}
        alt={typeof alt === 'string' ? alt : ''}
        className="my-2 max-h-96 max-w-full rounded-lg border border-gray-200 object-contain dark:border-gray-700"
        loading="lazy"
      />
    );
  },
  table: ({ children }) => (
    <div className="my-4 overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
      <table className="min-w-full w-full table-fixed border-collapse divide-y divide-gray-200 text-[15px] dark:divide-gray-700">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-gray-50 dark:bg-gray-900/50">{children}</thead>,
  th: ({ children }) => (
    <th className="border border-gray-200 px-3 py-2 text-left font-semibold dark:border-gray-700">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border border-gray-200 px-3 py-2 align-top dark:border-gray-700">{children}</td>
  ),
  tr: ({ children }) => <tr className="divide-x divide-gray-200 dark:divide-gray-700">{children}</tr>,
  pre: ({ children }) => (
    <pre className="my-3 overflow-x-auto rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm dark:border-gray-700 dark:bg-gray-900/60">
      {children}
    </pre>
  ),
  code: ({ className, children, ...props }) => {
    const isBlock = Boolean(className?.includes('language-'));
    if (isBlock) {
      return (
        <code className={`${className ?? ''} font-mono text-sm`} {...props}>
          {children}
        </code>
      );
    }
    return (
      <code
        className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[0.9em] dark:bg-gray-800"
        {...props}
      >
        {children}
      </code>
    );
  },
};

/**
 * Chat markdown via [react-markdown](https://github.com/remarkjs/react-markdown) + `remark-gfm`.
 * Incomplete tables are padded while `streaming` is true so GFM can render a grid early.
 */
/** While tokens stream, skip heavy LLM normalizers — they assume complete fences/tables and can corrupt or break remark mid-stream. */
function normalizeForStreamingChunk(raw: string): string {
  const text = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  return padIncompleteStreamingMarkdown(text);
}

export default function ChatMarkdown({ content, streaming = false }: Props) {
  const safeContent = typeof content === 'string' ? content : String(content ?? '');

  useEffect(() => {
    if (debugPingSent) return;
    debugPingSent = true;
    // #region agent log
    debugSessionLog('ChatMarkdown.tsx:ping', 'first ChatMarkdown mount — confirms IPC logging', {
      hypothesisId: 'ping',
      hasElectronDebug: Boolean(typeof window !== 'undefined' && window.electronAPI?.debugSessionLog),
    });
    // #endregion
  }, []);

  const md = useMemo(() => {
    try {
      if (streaming) {
        return normalizeForStreamingChunk(safeContent);
      }
      return normalizeMarkdownForChat(safeContent);
    } catch (e) {
      // #region agent log
      debugSessionLog('ChatMarkdown.tsx:useMemo', 'normalize threw', {
        hypothesisId: 'B',
        errorMessage: e instanceof Error ? e.message : String(e),
        stack: e instanceof Error ? e.stack?.slice(0, 800) : undefined,
        contentLen: safeContent.length,
        streaming,
      });
      // #endregion
      return safeContent;
    }
  }, [safeContent, streaming]);

  return (
    <div
      className="chat-markdown min-h-[1.5em] min-w-0 max-w-full break-words text-left text-[15px] leading-[1.65] text-gray-800 antialiased dark:text-gray-100"
      style={{ contain: 'layout style' }}
    >
      <MarkdownRenderErrorBoundary rawFallback={safeContent}>
        {/*
          While streaming: omit remark-gfm — GFM table/strikethrough/task parsers often choke on partial input.
          After stream: full GFM + normalizeMarkdownForChat (when streaming is false).
        */}
        <ReactMarkdown
          key={streaming ? 'md-stream' : 'md-final'}
          remarkPlugins={streaming ? [] : [remarkGfm]}
          components={markdownComponents}
        >
          {md}
        </ReactMarkdown>
      </MarkdownRenderErrorBoundary>
    </div>
  );
}
