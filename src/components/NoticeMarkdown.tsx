import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/**
 * 공지 본문 전용 마크다운 렌더러.
 *
 * <p>채팅용 ChatMarkdown과 분리 — 공지는 GFM(테이블/체크리스트/링크) 정도면 충분하고
 * 스트리밍·코드 하이라이팅·도구 호출 같은 채팅 특화 로직이 필요 없다.</p>
 *
 * <p>{@code react-markdown}은 기본적으로 raw HTML을 비활성화하므로 XSS 안전하다.
 * 별도의 sanitize 단계가 필요 없다.</p>
 */

interface NoticeMarkdownProps {
  source: string;
  /** 컴팩트 모드 — 알람 모달에서 사용. 폰트·여백을 줄임. */
  compact?: boolean;
  className?: string;
}

export default function NoticeMarkdown({ source, compact = false, className = '' }: NoticeMarkdownProps) {
  const baseClass = compact
    ? 'text-xs leading-relaxed text-gray-700 dark:text-gray-200'
    : 'text-sm leading-relaxed text-gray-700 dark:text-gray-200';

  return (
    <div className={`notice-md ${baseClass} ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => <h1 className={compact ? 'text-sm font-bold mt-2 mb-1' : 'text-lg font-bold mt-3 mb-2'}>{children}</h1>,
          h2: ({ children }) => <h2 className={compact ? 'text-[13px] font-bold mt-2 mb-1' : 'text-base font-bold mt-3 mb-1.5'}>{children}</h2>,
          h3: ({ children }) => <h3 className={compact ? 'text-xs font-semibold mt-1.5 mb-0.5' : 'text-sm font-semibold mt-2 mb-1'}>{children}</h3>,
          p:  ({ children }) => <p className="my-1.5 break-words">{children}</p>,
          ul: ({ children }) => <ul className="list-disc list-outside pl-5 my-1.5 space-y-0.5">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal list-outside pl-5 my-1.5 space-y-0.5">{children}</ol>,
          li: ({ children }) => <li className="break-words">{children}</li>,
          a:  ({ href, children }) => (
            <a href={href} target="_blank" rel="noreferrer noopener"
               className="text-blue-500 hover:text-blue-600 underline break-all">
              {children}
            </a>
          ),
          code: ({ children, ...props }) => {
            const inline = !(props as { className?: string }).className;
            return inline
              ? <code className="px-1 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-[0.85em] font-mono">{children}</code>
              : <code className="block p-2 rounded bg-gray-100 dark:bg-gray-800 text-[0.85em] font-mono whitespace-pre-wrap overflow-x-auto">{children}</code>;
          },
          pre: ({ children }) => <pre className="my-1.5">{children}</pre>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-gray-300 dark:border-gray-600 pl-3 my-1.5 text-gray-600 dark:text-gray-400">
              {children}
            </blockquote>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto my-2">
              <table className="border-collapse text-[0.9em]">{children}</table>
            </div>
          ),
          th: ({ children }) => <th className="border border-gray-300 dark:border-gray-600 px-2 py-1 bg-gray-50 dark:bg-gray-800 font-semibold text-left">{children}</th>,
          td: ({ children }) => <td className="border border-gray-300 dark:border-gray-600 px-2 py-1">{children}</td>,
          hr: () => <hr className="my-2 border-gray-200 dark:border-gray-700" />,
          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
        }}
      >
        {source ?? ''}
      </ReactMarkdown>
    </div>
  );
}
