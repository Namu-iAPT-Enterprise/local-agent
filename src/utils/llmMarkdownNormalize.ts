/**
 * LLM markdown normalization for exports (docx / pptx / xlsx / hwpx) and skill download titles.
 * Chat UI uses react-markdown after `normalizeMarkdownForChat` in markdownChatNormalize.ts.
 *
 * - Exports: markdownTo{Docx,Pptx,Xlsx,Hwpx}Blob call normalizeLlmMarkdownForExport first.
 * - Filenames: SkillDownloadCard derives titles from normalizeLlmMarkdownForExport(content).
 * - Backend HWPX: hwpx-server/markdown_to_hwpx.py also normalizes (keep in sync when changing rules).
 */
import { fixGfmTableGlue } from './markdownTableNormalize';

/** Use in SKILL_PROMPTS or system instructions so models stop gluing sections. */
export const LLM_MARKDOWN_STRUCTURE_HINT = [
  'Markdown formatting rules (required):',
  '- Put every heading on its own line. Leave a blank line between sections.',
  '- Use ATX headings: "# Title", "## Section", "### Subsection".',
  '- Never concatenate a heading onto the previous sentence (e.g. wrong: "보고서## 1." — use a newline before "##").',
  '- For lists, put each bullet on its own line starting with "- " or "* " (space after the marker).',
  '- For tables, use a newline before the header row; include a |---|---| separator line.',
  '- Do not output the entire document as one line.',
].join('\n');

/**
 * Structural newlines only (after GFM table glue). Use inside fenced blocks via
 * applyOutsideCodeFences(chunk, (c) => normalizeLlmMarkdownStructure(fixGfmTableGlue(c))).
 */
export function normalizeLlmMarkdownStructure(text: string): string {
  let t = text;
  if (!t.trim()) {
    return t;
  }

  const lines = t.split('\n');
  const nonEmpty = lines.filter((ln) => ln.trim());
  const longest = nonEmpty.length ? Math.max(...nonEmpty.map((ln) => ln.length)) : 0;
  const looksStructured = nonEmpty.length >= 4 && lines.length >= 4 && longest < 900;

  // Split glued headings: "text## Heading", "## A### B"
  t = t.replace(/(?<=[^\n#])(?=#+(?:\s|\d))/g, '\n');
  t = t.replace(/(#{1,6}[^\n#]+)(?=#{1,6}\s)/g, '$1\n');
  t = t.replace(/^\n+/, '');

  // Common glue from token streaming: "Title:- item", ".- item", "word- item"
  t = t.replace(/:\s*-\s+/g, ':\n- ');
  t = t.replace(/([.!?])-\s+/g, '$1\n- ');
  t = t.replace(/([^\n])-\s([A-Z가-힣])/g, '$1\n- $2');

  t = t.replace(/(?<=[가-힣.!?])(?=\*\s{2,})/gu, '\n');
  t = t.replace(/(?<=[)\]])\s*(?=\*\s{2,})/g, '\n');
  t = t.replace(/(?<=[가-힣a-zA-Z])(?=\d+\.\s{2,})/gi, '\n');

  t = t.replace(/(?<=[^\n])(?=\s*---\s*\*)/g, '\n');
  t = t.replace(/(?<=[.!?])\s*(---)\s*/g, '\n$1\n');

  if (looksStructured) {
    return t;
  }
  // Do not split ":---" / "|---" (GFM table alignment / row edges) — only real thematic breaks.
  t = t.replace(
    /(?<!\n)(?<![:|])(?<=[^\s])(?=\s{0,3}(?:---|\*\*\*|___)(?:\s|$))/g,
    '\n',
  );
  t = t.replace(/(?<=[.!?])\s+-\s+/g, '\n- ');
  t = t.replace(/(?<=[.!?])\s+(\d+\.\s+)/g, '\n$1');
  // Keep output readable even when chunks arrive densely.
  t = t.replace(/\n{3,}/g, '\n\n');
  return t;
}

/**
 * One chunk’s worth of the same logic as normalizeLlmMarkdownForExport (for use inside
 * applyOutsideCodeFences when mirroring export behavior).
 */
export function normalizeLlmMarkdownChunkLikeExport(chunk: string): string {
  if (!chunk.trim()) {
    return chunk;
  }
  return normalizeLlmMarkdownStructure(fixGfmTableGlue(chunk));
}

/** GFM table glue + structural rules (full string — use for exports / API). */
export function normalizeLlmMarkdownForExport(raw: string): string {
  let text = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  if (!text.trim()) {
    return text;
  }
  text = fixGfmTableGlue(text);
  return normalizeLlmMarkdownStructure(text);
}

/**
 * HWPX converter orchestration normalizer:
 * - removes instruction-like section labels leaked from LLM
 * - stabilizes metadata lines (제목/수신/참조/발신/시행일)
 * - normalizes attachment block cues
 */
export function normalizeLlmMarkdownForHwpx(raw: string): string {
  let text = normalizeLlmMarkdownForExport(raw);
  if (!text.trim()) return text;

  // Remove bracketed orchestration markers but keep content lines.
  text = text.replace(/^\s*\[(문서\s*메타|문서메타|본문|붙임|서명)\]\s*$/gim, '');
  // Remove plain leaked labels without values.
  text = text.replace(/^\s*(문서\s*메타|문서메타|본문|붙임|서명)\s*$/gim, '');
  // Collapse repeated artifacts.
  text = text.replace(/본문본문/g, '본문');
  text = text.replace(/\s#{2,6}\s*/g, ' ');
  text = text.replace(/^\s*---+\s*$/gim, '');

  // Keep metadata labels line-oriented.
  const labels = ['제목:', '수신:', '참조:', '발신:', '시행일:'];
  for (const label of labels) {
    const escaped = label.replace(':', '\\:');
    text = text.replace(new RegExp(`\\s*${escaped}\\s*`, 'g'), `\n${label} `);
  }

  // Normalize numbered list spacing for attachments/body.
  text = text.replace(/(?<!\n)(\d+\.)\s+/g, '\n$1 ');
  text = text.replace(/\n{3,}/g, '\n\n');
  return text.trim();
}
