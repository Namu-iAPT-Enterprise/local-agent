import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check, FileCode, File } from 'lucide-react';
import type { Components } from 'react-markdown';

// ── Copy button ────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handle = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handle}
      title="Copy"
      className="flex items-center gap-1 px-2 py-1 rounded text-xs text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
    >
      {copied ? <Check size={13} /> : <Copy size={13} />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

// ── Fenced code block ──────────────────────────────────────────────────────

function CodeBlock({
  language,
  filename,
  code,
}: {
  language: string;
  filename?: string;
  code: string;
}) {
  const label = filename || (language ? language : 'code');
  const isFile = !!filename;

  return (
    <div className="rounded-xl overflow-hidden border border-gray-700 my-3 text-sm">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#1e1e2e] border-b border-gray-700">
        <div className="flex items-center gap-2">
          {isFile ? (
            <File size={13} className="text-blue-400 flex-shrink-0" />
          ) : (
            <FileCode size={13} className="text-gray-400 flex-shrink-0" />
          )}
          <span className="text-xs font-mono text-gray-300 truncate">{label}</span>
        </div>
        <CopyButton text={code} />
      </div>

      {/* Syntax-highlighted body */}
      <SyntaxHighlighter
        language={language || 'text'}
        style={oneDark}
        customStyle={{
          margin: 0,
          borderRadius: 0,
          fontSize: '0.8rem',
          background: '#1a1b26',
          padding: '1rem',
        }}
        showLineNumbers={code.split('\n').length > 5}
        wrapLongLines={false}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}

// ── Normalize inline markdown ───────────────────────────────────────────────
// Models sometimes stream headings/lists without leading newlines.
// ReactMarkdown requires block elements to start on their own line.

function normalizeMarkdown(raw: string): string {
  return raw
    // Ensure headings start on a new line
    .replace(/([^\n])(#{1,6} )/g, '$1\n\n$2')
    // Ensure unordered list items start on a new line
    .replace(/([^\n])([-*+] )/g, '$1\n$2')
    // Ensure ordered list items start on a new line
    .replace(/([^\n])(\d+\. )/g, '$1\n$2')
    // Collapse 3+ blank lines to 2
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ── Main renderer ──────────────────────────────────────────────────────────

interface Props {
  content: string;
}

export default function MarkdownRenderer({ content }: Props) {
  const components: Components = {
    // ── Headings ──
    h1: ({ children }) => (
      <h1 className="text-xl font-bold text-gray-900 dark:text-white mt-6 mb-3 pb-2 border-b border-gray-200 dark:border-gray-700">
        {children}
      </h1>
    ),
    h2: ({ children }) => (
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mt-5 mb-2.5 pb-1 border-b border-gray-100 dark:border-gray-800">
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100 mt-4 mb-2">
        {children}
      </h3>
    ),
    h4: ({ children }) => (
      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mt-3 mb-1.5">
        {children}
      </h4>
    ),

    // ── Paragraph ──
    p: ({ children }) => (
      <p className="text-gray-800 dark:text-gray-100 leading-7 mb-4 last:mb-0">{children}</p>
    ),

    // ── Lists ──
    ul: ({ children }) => (
      <ul className="list-disc list-outside ml-6 mb-4 space-y-1.5 text-gray-800 dark:text-gray-100">
        {children}
      </ul>
    ),
    ol: ({ children }) => (
      <ol className="list-decimal list-outside ml-6 mb-4 space-y-1.5 text-gray-800 dark:text-gray-100">
        {children}
      </ol>
    ),
    li: ({ children }) => <li className="leading-7 pl-1">{children}</li>,

    // ── Blockquote ──
    blockquote: ({ children }) => (
      <blockquote className="border-l-4 border-blue-400 pl-4 py-0.5 my-4 bg-blue-50 dark:bg-blue-950/20 rounded-r-lg text-gray-700 dark:text-gray-300 italic">
        {children}
      </blockquote>
    ),

    // ── Horizontal rule ──
    hr: () => <hr className="border-gray-200 dark:border-gray-700 my-5" />,

    // ── Strong / Em ──
    strong: ({ children }) => (
      <strong className="font-semibold text-gray-900 dark:text-white">{children}</strong>
    ),
    em: ({ children }) => (
      <em className="italic text-gray-600 dark:text-gray-300">{children}</em>
    ),

    // ── Links ──
    a: ({ href, children }) => (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-500 underline underline-offset-2 hover:text-blue-600 dark:hover:text-blue-400"
      >
        {children}
      </a>
    ),

    // ── Images ──
    img: ({ src, alt }) => (
      <span className="block my-3">
        <img
          src={src}
          alt={alt || ''}
          className="max-w-full rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
        {alt && (
          <span className="block text-xs text-center text-gray-400 mt-1 italic">{alt}</span>
        )}
      </span>
    ),

    // ── Table ──
    table: ({ children }) => (
      <div className="overflow-x-auto my-3 rounded-xl border border-gray-200 dark:border-gray-700">
        <table className="w-full text-sm border-collapse">{children}</table>
      </div>
    ),
    thead: ({ children }) => (
      <thead className="bg-gray-100 dark:bg-gray-800">{children}</thead>
    ),
    tbody: ({ children }) => (
      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">{children}</tbody>
    ),
    tr: ({ children }) => <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/50">{children}</tr>,
    th: ({ children }) => (
      <th className="px-4 py-2.5 text-left font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td className="px-4 py-2.5 text-gray-700 dark:text-gray-300">{children}</td>
    ),

    // ── Code: inline vs block ──
    code: ({ className, children, ...props }) => {
      const match = /language-(\S+)/.exec(className || '');

      // Inline code (no language class, no newlines)
      if (!match) {
        return (
          <code
            className="px-1.5 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-pink-600 dark:text-pink-400 font-mono text-[0.8em]"
            {...props}
          >
            {children}
          </code>
        );
      }

      const raw = String(children).trimEnd();
      const langMeta = match[1]; // e.g. "python" or "python:filename.py"
      const [language, filename] = langMeta.includes(':')
        ? langMeta.split(':')
        : [langMeta, undefined];

      return (
        <CodeBlock language={language} filename={filename} code={raw} />
      );
    },

    // Suppress the wrapping <pre> — CodeBlock handles its own container
    pre: ({ children }) => <>{children}</>,
  };

  return (
    <div className="markdown-body text-[0.9rem] leading-7 text-gray-800 dark:text-gray-100">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {normalizeMarkdown(content)}
      </ReactMarkdown>
    </div>
  );
}
