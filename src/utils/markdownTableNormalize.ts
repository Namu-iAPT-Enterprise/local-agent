/**
 * GFM table glue fixes for model output (shared by llmMarkdownNormalize and markdownToXlsx).
 */
export function fixGfmTableGlue(s: string): string {
  let t = s;
  // Intro text glued to table: "…format:| # | Word |"
  t = t.replace(/:\s*\|\s*#\s*\|/g, ':\n\n| # |');
  // Row starts with accidental "||" (models glue cells) — GFM rows begin with a single "|"
  t = t.replace(/^\|\|(?=\s*[^\n|]+\|)/gm, '|');
  // "| cell ||----------------|" — double pipe before dash-only separator row (lookahead is '-', not alnum)
  t = t.replace(/\|\|(?=\s*-+)/g, '|\n|');
  // "| … || :--- |" or "| … || 1 | …" → row break
  t = t.replace(/\|\|\s*(?=\s*(?::\s*-|\d+\s*\|))/g, '|\n|');
  // "| cell | cell || NextRow |" — double row separator without newline
  t = t.replace(/\|\|(?=\s*[A-Za-z0-9*])/g, '|\n|');
  // Bullet + table row: "* | Item |" → "| Item |"
  t = t.replace(/^\s*[*\-+]\s+(\|[^\n]+)/gm, '$1');
  // Header row glued to separator: "| col | col | |:---" → newline before |:---
  // Use [ \t]* only — \s* would match newlines and break "| cell |\n| :--- |" separator rows.
  t = t.replace(/\|[ \t]*\|[ \t]*(:[-\s|]*)/g, '|\n|$1');
  // "| :--- :|" — models emit an extra ":" before the closing pipe (breaks GFM alignment row)
  t = t.replace(/\|\s*:\s*---\s*:\s*\|/g, '| :--- |');
  // "| :--- :--- |" — two alignment specs merged in one cell (missing | between :--- blocks)
  t = t.replace(/\|\s*:\s*---\s*:\s*---\s*\|/g, '| :--- | :--- |');
  return t;
}
