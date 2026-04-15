/**
 * GFM table glue fixes for model output (shared by MarkdownRenderer and markdownToXlsx).
 * Apply only outside fenced code blocks — see MarkdownRenderer.applyOutsideCodeFences.
 */
export function fixGfmTableGlue(s: string): string {
  let t = s;
  // Intro text glued to table: "…format:| # | Word |"
  t = t.replace(/:\s*\|\s*#\s*\|/g, ':\n\n| # |');
  // "| … || :--- |" or "| … || 1 | …" → row break
  t = t.replace(/\|\|\s*(?=\s*(?::\s*-|\d+\s*\|))/g, '|\n|');
  // "| cell | cell || NextRow |" — double row separator without newline
  t = t.replace(/\|\|(?=\s*[A-Za-z0-9*])/g, '|\n|');
  // Bullet + table row: "* | Item |" → "| Item |"
  t = t.replace(/^\s*[*\-+]\s+(\|[^\n]+)/gm, '$1');
  // Header row glued to separator: "| col | col | |:---" → newline before |:---
  t = t.replace(/\|\s*\|\s*(:[-\s|]*)/g, '|\n|$1');
  return t;
}
