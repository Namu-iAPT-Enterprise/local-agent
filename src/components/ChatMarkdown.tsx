import React, { Component, useEffect, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { normalizeMarkdownForChat, normalizeMarkdownForChatStreaming } from '../utils/markdownChatNormalize';
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
    debugSessionLog('ChatMarkdown.tsx:MarkdownRenderErrorBoundary', 'streamdown render failed', {
      hypothesisId: 'streamdown-boundary',
      errorMessage: error.message,
      stack: error.stack?.slice(0, 1200),
      componentStack: info.componentStack?.slice(0, 1200),
    });
  }

  render() {
    const { error } = this.state;
    if (error) {
      return (
        <div className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
          <p className="font-medium">Markdown display error</p>
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
  streaming?: boolean;
}

const linkClass =
  'text-blue-600 underline underline-offset-2 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300';

const markdownComponents = {
  h1: ({ children }) => (
    <h1 className="mt-5 mb-2 text-[1.95rem] font-semibold tracking-tight text-gray-950 first:mt-0 dark:text-white">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="mt-5 mb-2 text-[1.45rem] font-semibold tracking-tight text-gray-900 first:mt-0 dark:text-gray-50">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mt-4 mb-1.5 text-[1.1rem] font-semibold text-gray-900 first:mt-0 dark:text-gray-100">
      {children}
    </h3>
  ),
  h4: ({ children }) => (
    <h4 className="mt-4 mb-1.5 text-base font-semibold text-gray-900 first:mt-0 dark:text-gray-100">
      {children}
    </h4>
  ),
  p: ({ children }) => (
    <p className="my-2.5 text-[15px] leading-[1.75] text-gray-800 first:mt-0 last:mb-0 dark:text-gray-100">
      {children}
    </p>
  ),
  ul: ({ children }) => <ul className="my-3 list-disc space-y-1.5 pl-6 marker:text-gray-500">{children}</ul>,
  ol: ({ children }) => <ol className="my-3 list-decimal space-y-1.5 pl-6 marker:text-gray-500">{children}</ol>,
  li: ({ children }) => <li className="leading-[1.7]">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="my-4 rounded-r-2xl border-l-[3px] border-blue-300 bg-blue-50/70 px-4 py-3 text-gray-700 dark:border-blue-700 dark:bg-blue-950/20 dark:text-gray-200">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-6 border-gray-200 dark:border-gray-700" />,
  a: ({ href, children }) => {
    const h = typeof href === 'string' && href.trim() ? href.trim() : undefined;
    if (!h) return <span className={linkClass}>{children}</span>;

    return (
      <a href={h} className={linkClass} target="_blank" rel="noopener noreferrer">
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
        className="my-3 max-h-96 max-w-full rounded-2xl border border-gray-200 object-contain shadow-sm dark:border-gray-700"
        loading="lazy"
      />
    );
  },
  table: ({ children }) => (
    <div className="my-4 overflow-x-auto rounded-2xl border border-gray-200/80 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950/40">
      <table className="min-w-full border-collapse text-[14px]">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-gray-50/90 dark:bg-gray-900/80">{children}</thead>,
  th: ({ children }) => (
    <th className="border-b border-gray-200 px-4 py-3 text-left text-[12px] font-semibold tracking-[0.04em] text-gray-600 uppercase dark:border-gray-800 dark:text-gray-300">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border-t border-gray-100 px-4 py-3 align-top text-gray-700 dark:border-gray-900 dark:text-gray-200">
      {children}
    </td>
  ),
  tr: ({ children }) => <tr className="align-top">{children}</tr>,
  inlineCode: ({ children, ...props }) => (
    <code
      className="rounded-md border border-gray-200 bg-gray-50 px-1.5 py-0.5 font-mono text-[0.9em] text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
      {...props}
    >
      {children}
    </code>
  ),
  code: ({ inline, className, children, ...props }: { inline?: boolean; className?: string; children?: React.ReactNode }) => {
    if (inline) {
      return markdownComponents.inlineCode({ children, ...props });
    }

    const lang = className?.match(/language-([\w#+-]+)/)?.[1] ?? '';

    return (
      <div className="my-4 overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950/40">
        {lang ? (
          <div className="border-b border-gray-200 px-4 py-2 text-[11px] font-semibold tracking-[0.08em] text-gray-500 uppercase dark:border-gray-800 dark:text-gray-400">
            {lang}
          </div>
        ) : null}
        <pre className="overflow-x-auto px-4 py-3 text-[13px] leading-6 text-gray-800 dark:text-gray-100">
          <code className={className} {...props}>
            {children}
          </code>
        </pre>
      </div>
    );
  },
} as const;

export default function ChatMarkdown({ content, streaming = false }: Props) {
  const safeContent = typeof content === 'string' ? content : String(content ?? '');

  useEffect(() => {
    if (debugPingSent) return;
    debugPingSent = true;
    debugSessionLog('ChatMarkdown.tsx:ping', 'first Streamdown ChatMarkdown mount', {
      hypothesisId: 'streamdown-ping',
      hasElectronDebug: Boolean(typeof window !== 'undefined' && window.electronAPI?.debugSessionLog),
    });
  }, []);

  const md = useMemo(() => {
    try {
      return streaming
        ? normalizeMarkdownForChatStreaming(safeContent)
        : normalizeMarkdownForChat(safeContent);
    } catch (e) {
      debugSessionLog('ChatMarkdown.tsx:useMemo', 'normalize threw', {
        hypothesisId: 'streamdown-normalize',
        errorMessage: e instanceof Error ? e.message : String(e),
        stack: e instanceof Error ? e.stack?.slice(0, 800) : undefined,
        contentLen: safeContent.length,
        streaming,
      });
      return safeContent;
    }
  }, [safeContent, streaming]);

  return (
    <div
      className="chat-markdown min-h-[1.5em] min-w-0 max-w-full break-words text-left text-[15px] leading-[1.7] text-gray-800 antialiased dark:text-gray-100"
      style={{ contain: 'layout style' }}
    >
      <MarkdownRenderErrorBoundary rawFallback={safeContent}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={markdownComponents}
        >
          {md}
        </ReactMarkdown>
      </MarkdownRenderErrorBoundary>
    </div>
  );
}
