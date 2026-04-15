import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight, oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check } from 'lucide-react';
import type { Components } from 'react-markdown';
import type { Element as HastElement, Text as HastText } from 'hast';
import { fixGfmTableGlue } from '../utils/markdownTableNormalize';

// ── Language display name ──────────────────────────────────────────────────

const LANG_LABELS: Record<string, string> = {
  js: 'JavaScript', javascript: 'JavaScript',
  ts: 'TypeScript', typescript: 'TypeScript',
  tsx: 'TypeScript', jsx: 'JavaScript',
  py: 'Python', python: 'Python',
  html: 'HTML', htm: 'HTML', css: 'CSS',
  json: 'JSON', yaml: 'YAML', yml: 'YAML',
  sh: 'Shell', bash: 'Bash', zsh: 'Shell',
  sql: 'SQL', go: 'Go', rust: 'Rust',
  java: 'Java', cpp: 'C++', c: 'C',
  rb: 'Ruby', ruby: 'Ruby', php: 'PHP',
};

/** Prism + label: map streaming / alias ids to real languages */
function normalizeFenceLanguageId(lang: string): string {
  const l = lang.toLowerCase().trim();
  if (l === 'htm') return 'html';
  return l;
}

/** HAST has the true source text; `String(children)` breaks when children is an array (commas, lost newlines). */
function hastElementToPlainText(hast: HastElement | undefined): string | null {
  if (!hast?.children?.length) return null;
  let out = '';
  const walk = (nodes: HastElement['children']) => {
    for (const n of nodes) {
      if (n.type === 'text') out += (n as HastText).value;
      else if (n.type === 'element') walk((n as HastElement).children);
    }
  };
  walk(hast.children);
  return out.length > 0 ? out : null;
}

function flattenReactCodeChildren(node: React.ReactNode): string {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(flattenReactCodeChildren).join('');
  if (React.isValidElement(node)) {
    const ch = (node.props as { children?: React.ReactNode }).children;
    if (ch !== undefined) return flattenReactCodeChildren(ch);
  }
  return '';
}

function extractFenceCodeText(children: React.ReactNode, node: HastElement | undefined): string {
  const fromHast = hastElementToPlainText(node);
  const raw = fromHast ?? flattenReactCodeChildren(children);
  return raw.replace(/\n$/, '');
}

/** Models sometimes split `html` so the first "line" is just `l` before `<!DOCTYPE`. */
function stripHtmlFenceLeadingArtifact(code: string): string {
  let s = code.replace(/^l\s*\r?\n(?=<!DOCTYPE\b)/i, '');
  s = s.replace(/^l(?=<!DOCTYPE\b)/i, '');
  return s;
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
  const [copied, setCopied] = useState(false);
  const isDark = document.documentElement.classList.contains('dark');

  const langKey = normalizeFenceLanguageId(language || 'text');
  const label =
    filename || LANG_LABELS[langKey] || (language ? language.charAt(0).toUpperCase() + language.slice(1) : 'Code');

  const displayCode = stripHtmlFenceLeadingArtifact(code);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(displayCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="box-border w-full max-w-full min-w-0 rounded-xl border border-gray-200 dark:border-gray-700 my-4 text-sm bg-white dark:bg-gray-900 shadow-sm [contain:inline-size]">
      {/* Header: flex + shrink-0 copy — wide <pre> must not expand the chat column (see min-w-0 on parents) */}
      <div className="flex min-w-0 items-center justify-between gap-3 border-b border-gray-200 bg-gray-50 px-3 py-2.5 dark:border-gray-700 dark:bg-gray-800 sm:px-4">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <svg
            className="h-4 w-4 flex-shrink-0 text-gray-500 dark:text-gray-400"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <polyline points="16 18 22 12 16 6" />
            <polyline points="8 6 2 12 8 18" />
          </svg>
          <span className="min-w-0 truncate text-xs font-medium text-gray-600 dark:text-gray-300">{label}</span>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          title={copied ? 'Copied!' : 'Copy code'}
          aria-label={copied ? 'Copied' : 'Copy code'}
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-500 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600"
        >
          {copied ? <Check size={16} strokeWidth={2.5} /> : <Copy size={16} strokeWidth={2.5} />}
        </button>
      </div>

      {/* Scroll wide lines inside the bubble only — does not widen the flex column */}
      <div className="max-w-full min-w-0 overflow-x-auto">
        <SyntaxHighlighter
          language={langKey || 'text'}
          style={isDark ? oneDark : oneLight}
          PreTag="div"
          customStyle={{
            margin: 0,
            borderRadius: 0,
            fontSize: '0.82rem',
            background: 'transparent',
            padding: '1.1rem 1.25rem',
            minWidth: 0,
            maxWidth: '100%',
            width: '100%',
            boxSizing: 'border-box',
            whiteSpace: 'pre-wrap',
            overflowWrap: 'anywhere',
            wordBreak: 'break-word',
          }}
          showLineNumbers={false}
          wrapLongLines
        >
          {displayCode}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}

// ── Normalize inline markdown ───────────────────────────────────────────────
// Models sometimes stream headings/lists without leading newlines.
// ReactMarkdown requires block elements to start on their own line.

/**
 * Common model bug: opening fence glued to code — ```pythonprint("hi") instead of
 * ```python\nprint("hi"). Without a newline, parsers treat the block as inline code.
 * Longest language id first so "python" does not steal from "python3".
 */
const FENCE_LANG_ALIASES = [
  'typescript', 'javascript', 'python3', 'python', 'markdown', 'plaintext', 'bash',
  'dockerfile', 'graphql', 'kotlin', 'scala', 'swift', 'csharp', 'ruby', 'rust',
  'java', 'html', 'htm', 'css', 'scss', 'sass', 'less', 'json', 'jsonc',
  'yaml', 'yml', 'toml', 'xml', 'sql', 'mysql', 'pgsql', 'sqlite', 'go', 'golang',
  'cpp', 'php', 'perl', 'dart', 'elixir', 'haskell', 'lua', 'vim', 'diff',
  'docker', 'nginx', 'ini', 'r', 'vue', 'svelte', 'mdx', 'tsx', 'jsx', 'ts', 'js',
  'py', 'rb', 'rs', 'kt', 'sh', 'zsh', 'shell', 'c', 'text', 'txt', 'http',
].sort((a, b) => b.length - a.length);

/**
 * GFM fenced blocks only parse when the opening ``` starts a line. Models often emit
 * "...browser.```html" — without a line break the fence is treated as paragraph junk.
 * Line-based so we never break "…\\n   ```html" (indented fence) and we still fix when
 * "```html" is followed by "\\n<!DOCTYPE" (lookahead \\S alone would miss that).
 */
function ensureNewlineBeforeFenceOpener(text: string): string {
  return text
    .split(/\r?\n/)
    .map((line) => {
      const m = /```[a-zA-Z0-9#+]+/.exec(line);
      if (!m || m.index === 0) return line;
      const before = line.slice(0, m.index);
      if (!/\S/.test(before)) return line;
      const after = line.slice(m.index);
      return `${before.trimEnd()}\n\n${after}`;
    })
    .join('\n');
}

/** ATX headings (### Title) must start a line; fix "...text.### Heading" */
function ensureNewlineBeforeAtxHeading(text: string): string {
  return text
    .split(/\r?\n/)
    .map((line) => {
      const hm = /#{1,6}\s+\S/.exec(line);
      if (!hm || hm.index === 0) return line;
      const before = line.slice(0, hm.index);
      if (!/\S/.test(before)) return line;
      return `${before.trimEnd()}\n\n${line.slice(hm.index)}`;
    })
    .join('\n');
}

/** "How to use this:1.  First step" — numbered list glued to label after colon */
function ensureNewlineBeforeNumberedListAfterColon(text: string): string {
  return text.replace(/(\w+):(\d+\.\s+)/g, '$1:\n\n$2');
}

/**
 * Models often emit bullet items with no newlines between them:
 *   "Market trends- Competitor analysis- Set goals"
 * Each "- " that is NOT at the start of a line needs a newline before it.
 */
function ensureNewlineBeforeBullets(text: string): string {
  // Insert \n before "- " or "* " that follows non-newline text
  let s = text.replace(/([^\n])(- )/g, '$1\n$2');
  s = s.replace(/([^\n])(\* )/g, '$1\n$2');
  // Also split inline numbered list items after a letter/period: "da Vinci.2. Next"
  s = s.replace(/([a-zA-Z*.)])(\d+\.\s)/g, '$1\n$2');
  return s;
}

/**
 * Models sometimes strip the newline after a heading, gluing the body text:
 *   "## IntroductionThis is the body" → "## Introduction\n\nThis is the body"
 * Handles CamelCase joins (no space) and sentence-starter joins (space before The/A/An…).
 */
function ensureNewlineAfterHeadingText(text: string): string {
  // CamelCase: "## SectionTitle" where Title is glued to Section body
  let s = text.replace(/(#{1,6} [^\n]+?)([a-z])([A-Z][a-z])/g, (_m, pre, lo, hi) => pre + lo + '\n\n' + hi);
  // Sentence starters after a space: "## Conclusion The aeroplane…"
  s = s.replace(/(#{1,6} [^\n]+\w) (The |A |An |It |This |These |In |For |At |By )/g, '$1\n\n$2');
  return s;
}

/**
 * Any ATX heading (## …) that is NOT already at the start of a line gets
 * a blank line inserted before it. Handles cases where the line-by-line pass
 * above misses headings that follow bullet content on the same line.
 *
 * IMPORTANT: lookbehind must exclude '#' as well as '\n', otherwise the
 * second '#' in '## ' matches (its predecessor is '#', not '\n').
 */
function ensureNewlineBeforeAllHeadings(text: string): string {
  return text.replace(/(?<![#\n])(#{1,6} )/g, '\n\n$1');
}

/** Run first: structural newlines models omit (stable base for fence + heading fixes). */
function fixModelBlockSeparators(text: string): string {
  let s = ensureNewlineBeforeFenceOpener(text);
  s = ensureNewlineBeforeAtxHeading(s);
  s = ensureNewlineAfterHeadingText(s);
  s = ensureNewlineBeforeBullets(s);
  s = ensureNewlineBeforeAllHeadings(s);   // catch any remaining glued headings
  s = ensureNewlineBeforeNumberedListAfterColon(s);
  return s;
}

/**
 * Streamed tokens often split a fence language id mid-word (e.g. ```htm + l → ```htm l).
 * Collapse internal spaces when the result is a known language id.
 */
function fixFenceLanguageSpacesOnLine(text: string): string {
  return text.replace(
    /^(\s*```)([a-zA-Z0-9#+]+(?:\s+[a-zA-Z0-9#+]+)+)\s*$/gm,
    (full, indent: string, broken: string) => {
      const compact = broken.replace(/\s+/g, '').toLowerCase();
      if (FENCE_LANG_ALIASES.includes(compact)) {
        return `${indent}\`\`\`${compact}`;
      }
      return full;
    },
  );
}

/**
 * Same issue across lines: ```htm then newline then l before the code body.
 * Merge only when the two parts form a known lang and the second fragment is short (avoids java/script).
 */
function fixFenceLanguageSplitAcrossLines(text: string): string {
  return text.replace(
    /^(\s*)(```)([a-zA-Z0-9#+]+)\s*\r?\n([a-zA-Z0-9#+]+)\s*\r?\n/gm,
    (full, indent, ticks, a, b) => {
      const merged = `${a}${b}`.toLowerCase();
      if (!FENCE_LANG_ALIASES.includes(merged)) return full;
      const aLow = a.toLowerCase();
      if (aLow === merged) return full;
      if (!merged.startsWith(aLow) || aLow.length >= merged.length) return full;
      if (b.length > 4) return full;
      return `${indent}${ticks}${merged}\n`;
    },
  );
}

function fixGluedFenceOpen(text: string): string {
  let s = text;
  for (const lang of FENCE_LANG_ALIASES) {
    const esc = lang.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp('```' + esc + '(?=\\S)', 'gi');
    s = s.replace(re, () => '```' + lang.toLowerCase() + '\n');
  }
  return s;
}

/** If triple-backtick count is odd, append a closing fence so the last block parses. */
function ensureClosedFence(text: string): string {
  const ticks = text.match(/```/g);
  const n = ticks?.length ?? 0;
  if (n % 2 === 1) {
    return text.endsWith('\n') ? `${text}\`\`\`` : `${text}\n\`\`\``;
  }
  return text;
}

function fixFencedCodeGlitches(text: string): string {
  let s = fixFenceLanguageSpacesOnLine(text);
  s = fixFenceLanguageSplitAcrossLines(s);
  s = fixGluedFenceOpen(s);
  s = ensureClosedFence(s);
  return s;
}

// ── Fix unfenced code that models output without backticks ──────────────────
// e.g. model writes: "...here's the code: html<!DOCTYPE html>..."
// instead of:        "...here's the code:\n```html\n<!DOCTYPE html>..."

function fixUnfencedCode(text: string): string {
  // Language name immediately before recognizable code start (model forgot the fences)
  const rules: [RegExp, string][] = [
    [/\b(html)\s*(?=<!DOCTYPE\b|<html\b)/gi,            'html'],
    [/\b(css)\s*(?=[a-zA-Z*#.[\s][^{]*\{)/g,            'css'],
    [/\b(javascript|js)\s*(?=(?:const|let|var|function|import|export|class)\s)/gi, 'javascript'],
    [/\b(typescript|ts)\s*(?=(?:const|let|var|function|import|export|interface|type)\s)/gi, 'typescript'],
    [/\b(python|py)\s*(?=(?:import|from|def|class|#!)\s)/gi, 'python'],
    [/\b(java)\s*(?=(?:public|import|package)\s)/g,     'java'],
    [/\b(bash|shell|sh)\s*(?=#!\/)/gi,                  'bash'],
    [/\b(sql)\s*(?=(?:SELECT|INSERT|UPDATE|DELETE|CREATE|DROP)\s)/gi, 'sql'],
    [/\b(json)\s*(?=(?:\[|{))/gi,                       'json'],
    [/\b(go)\s*(?=package\s)/g,                         'go'],
    [/\b(rust)\s*(?=fn\s)/g,                            'rust'],
    [/\b(cpp|c\+\+)\s*(?=#include\b)/gi,                'cpp'],
    [/\b(php)\s*(?=<\?php\b)/gi,                        'php'],
  ];

  let result = text;
  for (const [pattern, lang] of rules) {
    result = result.replace(pattern, `\n\`\`\`${lang}\n`);
  }

  // Close any unclosed fences at end of string
  const opens = (result.match(/^```\w/gm) || []).length;
  const closes = (result.match(/^```\s*$/gm) || []).length;
  if (opens > closes) result += '\n```';

  return result;
}

/** Apply a string transform only outside ``` fenced code blocks. */
function applyOutsideCodeFences(text: string, fn: (chunk: string) => string): string {
  const fence = /```[\s\S]*?```/g;
  let last = 0;
  let out = '';
  let m: RegExpExecArray | null;
  while ((m = fence.exec(text)) !== null) {
    out += fn(text.slice(last, m.index));
    out += m[0];
    last = m.index + m[0].length;
  }
  out += fn(text.slice(last));
  return out;
}

/**
 * GFM tables need each row on its own line. Models often emit "||" between rows with no newline,
 * or glue "intro text:| # | header..." without a line break before the table.
 */
function fixMarkdownTables(text: string): string {
  return applyOutsideCodeFences(text, fixGfmTableGlue);
}

/**
 * Fixes common model outputs that break GFM parsing: missing newlines before lists,
 * numbered vocabulary rows glued to intro text, Definition/Example bullets on one line.
 */
function fixChatMarkdownLayout(text: string): string {
  let s = text;

  // Intro text ending with ":" immediately followed by "1. **..."  →  add blank line
  s = s.replace(/:\s*(\d+\.\s+\*\*)/g, ':\n\n$1');

  // Same if a closing paren/bracket before ":1." (rare)
  s = s.replace(/\)\s*:\s*(\d+\.\s+\*\*)/g, '):\n\n$1');

  // "1. **Word**    *   **Definition:**" or "1. **Word** * **Definition:**"
  s = s.replace(/(\d+\.\s+\*\*[^*]+\*\*)\s+\*\s+/g, '$1\n   * ');

  // Second bullet *Example* still on same line as Definition paragraph
  s = s.replace(
    /(\*\*Definition:\*\*[^\n]*?)\s+\*\s+\*Example:/g,
    '$1\n   * *Example:',
  );

  // Fallback: "*   *Example:*" after content on same line (sentence end or inline)
  s = s.replace(/([^\n])\s+\*\s+\*Example:/g, '$1\n   * *Example:');
  // After ". ! ?" before "* *Example:*" (vocabulary template)
  s = s.replace(/([.!?])\s+\*\s+\*Example:/g, '$1\n   * *Example:');

  // Next numbered entry stuck after previous block: "**...price." 2. **Discount**"
  s = s.replace(/(\*\*[^*]+\*\*)\s+(\d+\.\s+\*\*)/g, '$1\n\n$2');

  return s;
}

function normalizeMarkdown(raw: string): string {
  let result = fixModelBlockSeparators(raw);
  result = fixFencedCodeGlitches(result);
  result = fixUnfencedCode(result);
  result = fixMarkdownTables(result);
  result = fixChatMarkdownLayout(result);
  result = ensureClosedFence(result);
  return result;
}

// ── Main renderer ──────────────────────────────────────────────────────────

interface Props {
  content: string;
}

export default function MarkdownRenderer({ content }: Props) {
  const components: Components = {
    // ── Headings ──
    h1: ({ children }) => (
      <h1 className="text-[1.35rem] font-bold tracking-tight text-gray-900 dark:text-white mt-6 mb-3 pb-2 border-b border-gray-200 dark:border-gray-700 first:mt-0">
        {children}
      </h1>
    ),
    h2: ({ children }) => (
      <h2 className="text-[1.2rem] font-semibold tracking-tight text-gray-900 dark:text-white mt-6 mb-2.5 pb-1.5 border-b border-gray-100 dark:border-gray-800 first:mt-0">
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 className="text-[1.05rem] font-semibold text-gray-900 dark:text-gray-100 mt-5 mb-2 first:mt-0">
        {children}
      </h3>
    ),
    h4: ({ children }) => (
      <h4 className="text-[0.95rem] font-semibold text-gray-800 dark:text-gray-200 mt-4 mb-1.5 first:mt-0">
        {children}
      </h4>
    ),
    h5: ({ children }) => (
      <h5 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mt-3 mb-1 first:mt-0">
        {children}
      </h5>
    ),
    h6: ({ children }) => (
      <h6 className="text-sm font-medium text-gray-600 dark:text-gray-400 mt-3 mb-1 first:mt-0 uppercase tracking-wide">
        {children}
      </h6>
    ),

    // ── Paragraph ──
    p: ({ children }) => (
      <p className="text-gray-800 dark:text-gray-100 leading-[1.65] mb-3.5 last:mb-0 text-left">
        {children}
      </p>
    ),

    // ── Lists (remark-gfm: task lists add .contains-task-list / .task-list-item) ──
    ul: ({ children, className, ...props }) => (
      <ul
        className={`mb-4 text-gray-800 dark:text-gray-100 last:mb-0 ${
          typeof className === 'string' && className.includes('contains-task-list')
            ? 'list-none pl-0 ml-0 space-y-2'
            : 'list-disc list-outside pl-6 marker:text-gray-400 dark:marker:text-gray-500 space-y-1'
        } ${className || ''}`}
        {...props}
      >
        {children}
      </ul>
    ),
    ol: ({ children, className, ...props }) => (
      <ol
        className={`list-decimal list-outside pl-6 mb-4 last:mb-0 space-y-1 text-gray-800 dark:text-gray-100 marker:text-gray-500 dark:marker:text-gray-400 ${className || ''}`}
        {...props}
      >
        {children}
      </ol>
    ),
    li: ({ children, className, ...props }) => (
      <li
        className={`leading-[1.65] pl-0.5 ${
          typeof className === 'string' && className.includes('task-list-item')
            ? 'flex flex-row gap-2.5 items-start list-none [&>p]:inline [&>p]:m-0 [&>p]:leading-[1.65]'
            : ''
        } ${className || ''}`}
        {...props}
      >
        {children}
      </li>
    ),

    // ── Blockquote ──
    blockquote: ({ children }) => (
      <blockquote className="border-l-[3px] border-blue-500/70 dark:border-blue-400/60 pl-4 pr-2 py-2 my-4 bg-blue-50/60 dark:bg-blue-950/25 rounded-r-md text-gray-700 dark:text-gray-300 italic [&_p]:mb-2 [&_p:last-child]:mb-0">
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
        className="text-blue-600 dark:text-blue-400 underline underline-offset-[3px] decoration-blue-600/40 dark:decoration-blue-400/40 hover:decoration-blue-600 dark:hover:decoration-blue-400 break-words [overflow-wrap:anywhere]"
      >
        {children}
      </a>
    ),

    del: ({ children }) => (
      <del className="line-through text-gray-500 dark:text-gray-500 opacity-90">{children}</del>
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
      <div className="overflow-x-auto my-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950/40 shadow-sm">
        <table className="w-full min-w-[16rem] text-sm border-collapse">{children}</table>
      </div>
    ),
    thead: ({ children }) => (
      <thead className="bg-gray-50 dark:bg-gray-900/80 border-b border-gray-200 dark:border-gray-700">{children}</thead>
    ),
    tbody: ({ children }) => (
      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">{children}</tbody>
    ),
    tr: ({ children }) => <tr className="hover:bg-gray-50/80 dark:hover:bg-gray-800/40 transition-colors">{children}</tr>,
    th: ({ children }) => (
      <th className="px-3 sm:px-4 py-2.5 text-left font-semibold text-gray-800 dark:text-gray-200 border-r border-gray-200 dark:border-gray-700 last:border-r-0 align-top whitespace-nowrap">
        {typeof children === 'string' && children.includes('<br') 
          ? children.split(/<br\s*\/?>/gi).map((part, idx, arr) => (
              <React.Fragment key={idx}>
                {part}{idx < arr.length - 1 && <br />}
              </React.Fragment>
            ))
          : children
        }
      </th>
    ),
    td: ({ children }) => (
      <td className="px-3 sm:px-4 py-2.5 text-gray-700 dark:text-gray-300 align-top border-r border-gray-100 dark:border-gray-800 last:border-r-0">
        {typeof children === 'string' && children.includes('<br') 
          ? children.split(/<br\s*\/?>/gi).map((part, idx, arr) => (
              <React.Fragment key={idx}>
                {part}{idx < arr.length - 1 && <br />}
              </React.Fragment>
            ))
          : children
        }
      </td>
    ),

    // ── Code: inline vs block ──
    code: ({ className, children, node, ...props }) => {
      const match = /language-(\S+)/.exec(className || '');
      const hastCode = node as HastElement | undefined;

      // Inline code (no language class, no newlines)
      if (!match) {
        const inlineText = hastElementToPlainText(hastCode) ?? flattenReactCodeChildren(children);
        return (
          <code
            className="px-1.5 py-px rounded-md bg-gray-100 dark:bg-gray-800/90 text-rose-700 dark:text-rose-300 font-mono text-[0.88em] align-baseline border border-gray-200/80 dark:border-gray-600/50"
            {...props}
          >
            {inlineText}
          </code>
        );
      }

      const raw = extractFenceCodeText(children, hastCode);
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
    <div className="markdown-body min-w-0 max-w-full text-[15px] leading-[1.65] text-gray-800 dark:text-gray-100 text-left antialiased [&_p]:text-pretty [&_li]:text-pretty">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {normalizeMarkdown(content)}
      </ReactMarkdown>
    </div>
  );
}
