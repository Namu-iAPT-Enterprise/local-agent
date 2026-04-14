/** Heuristic language tag for user-message code blocks when there are no markdown fences. */
export function detectCodeLanguage(text: string): string | null {
  const t = text.trim();
  if (/<!DOCTYPE\s+html/i.test(t) || /^<html[\s>]/i.test(t)) return 'html';
  if (/<\/?(?:html|head|body|div|span|p|a|ul|ol|li|h[1-6]|table|tr|td|th|form|input|button|script|style|link|meta|img|nav|section|article|header|footer|main)\b/i.test(t) && t.includes('</')) return 'html';
  if (/public\s+class\s+\w+/.test(t) || /public\s+static\s+void\s+main/.test(t)) return 'java';
  if (/^\s*(?:import\s+React|const\s+\w+\s*=|function\s+\w+\s*\(|export\s+default|export\s+(?:const|function))/m.test(t)) return 'tsx';
  if (/^\s*(?:def\s+\w+\s*\(|import\s+\w+|from\s+\w+\s+import|class\s+\w+\s*:)/m.test(t)) return 'python';
  if (/^\s*(?:SELECT|INSERT|UPDATE|DELETE|CREATE|DROP|ALTER)\s/im.test(t)) return 'sql';
  if (/^\s*(?:#include|int\s+main\s*\(|void\s+\w+\s*\()/m.test(t)) return 'cpp';
  if (/^\s*(?:func\s+\w+|package\s+\w+|import\s+")/m.test(t)) return 'go';
  if (/^\s*(?:\{|\[)[\s\S]*(?:\}|\])$/.test(t) && (() => { try { JSON.parse(t); return true; } catch { return false; } })()) return 'json';
  return null;
}
