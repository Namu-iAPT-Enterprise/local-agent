import { applyOutsideCodeFences } from './markdownChatNormalize';

/** Count GFM table columns from a pipe row (leading/trailing | optional). */
function countTableColumns(row: string): number {
  const t = row.trim();
  const inner = t.replace(/^\|/, '').replace(/\|\s*$/, '');
  if (!inner.trim()) return 0;
  return inner.split('|').length;
}

/**
 * While tokens stream in, GFM may not recognize a table until the separator row exists
 * and each pipe-row is closed. Pad optimistically so `react-markdown` + `remark-gfm`
 * render a grid instead of a raw pipe wall.
 */
function padIncompleteStreamingMarkdownInner(text: string): string {
  const lines = text.split('\n');
  if (lines.length === 0) return text;

  const lastIdx = lines.length - 1;
  const last = lines[lastIdx];
  if (!last) return text;

  // Close a pipe row that started with | but has no trailing |
  if (/^\s*\|/.test(last) && last.includes('|') && !last.trimEnd().endsWith('|')) {
    lines[lastIdx] = `${last.trimEnd()} |`;
  }

  let s = lines.join('\n');

  // Single-line header: add separator so GFM parses a table immediately
  const L = s.split('\n');
  if (L.length === 1) {
    const row = L[0].trim();
    if (/^\|[^|\n]+\|[^|\n]+\|/.test(row) && !/^\s*\|[\s\-:]+\|/.test(row)) {
      const cols = countTableColumns(L[0]);
      if (cols >= 2) {
        const sep = `|${Array(cols).fill(' --- ').join('|')}|`;
        s = `${s}\n${sep}`;
      }
    }
  }

  return s;
}

/** Apply ghost-table padding only outside fenced code blocks. */
export function padIncompleteStreamingMarkdown(text: string): string {
  return applyOutsideCodeFences(text, padIncompleteStreamingMarkdownInner);
}
