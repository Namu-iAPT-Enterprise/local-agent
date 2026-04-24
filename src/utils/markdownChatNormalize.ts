/**
 * LLM chat markdown preprocessing before react-markdown. Fixes glued headings, tables, and fences
 * so remark/GFM can parse; mirrors export rules where possible (see llmMarkdownNormalize).
 */
import { normalizeLlmMarkdownChunkLikeExport } from './llmMarkdownNormalize';

const FENCE_LANG_ALIASES = [
  'typescript', 'javascript', 'python3', 'python', 'markdown', 'plaintext', 'bash',
  'dockerfile', 'graphql', 'kotlin', 'scala', 'swift', 'csharp', 'ruby', 'rust',
  'java', 'html', 'htm', 'css', 'scss', 'sass', 'less', 'json', 'jsonc',
  'yaml', 'yml', 'toml', 'xml', 'sql', 'mysql', 'pgsql', 'sqlite', 'go', 'golang',
  'cpp', 'php', 'perl', 'dart', 'elixir', 'haskell', 'lua', 'vim', 'diff',
  'docker', 'nginx', 'ini', 'r', 'vue', 'svelte', 'mdx', 'tsx', 'jsx', 'ts', 'js',
  'py', 'rb', 'rs', 'kt', 'sh', 'zsh', 'shell', 'c', 'text', 'txt', 'http',
].sort((a, b) => b.length - a.length);

/** "...robotics.---## Heading" — period / punctuation glued to HR + heading */
function ensureNewlineBeforeThematicBreakAfterPunctuation(text: string): string {
  return text.replace(/([.!?])\s*(---)/g, '$1\n\n$2');
}

/**
 * "problem.It divides" — missing newline after sentence end before capital word.
 * `(?<![A-Z])` avoids splitting "Dr.Smith" (capital before the lowercase letter we match).
 */
function ensureNewlineAfterSentenceEndBeforeCapitalWord(text: string): string {
  return text.replace(
    /(?<![A-Z])([a-z]{2,})([.!?])([A-Z][a-z]+)\b/g,
    '$1$2\n\n$3',
  );
}

/** "Here is a comparison... TableHere is" — TitleCase words glued in body lines (not headings/tables). */
function splitGluedTitleCaseInPlainParagraphLines(text: string): string {
  return text
    .split('\n')
    .map((line) => {
      const t = line.trim();
      if (!t) return line;
      if (/^#{1,6}\s/.test(t)) return line;
      if (/^\|/.test(t)) return line;
      if (/^```/.test(t)) return line;
      if (/^(\s*[-*+]|\s*\d+\.)\s/.test(line)) return line;
      if (/^---+(\s|$)/.test(t)) return line;
      return line.replace(/([a-z])([A-Z][a-z]{3,})\b/g, '$1 $2');
    })
    .join('\n');
}

function ensureNewlineBeforeFenceOpener(text: string): string {
  return text
    .split(/\r?\n/)
    .map((line) => {
      const m = /```[a-zA-Z0-9#+]+/.exec(line);
      if (!m || m.index === 0) return line;
      const before = line.slice(0, m.index);
      if (!/\S/.test(before)) return line;
      return `${before.trimEnd()}\n\n${line.slice(m.index)}`;
    })
    .join('\n');
}

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

/** "features:1. **" or "features: 1." — allow optional space after colon */
function ensureNewlineBeforeNumberedListAfterColon(text: string): string {
  return text.replace(/(\w+):\s*(\d+\.\s+)/g, '$1:\n\n$2');
}

/** "(You Only Look Once)YOLO" — closing paren glued to next word */
function ensureNewlineAfterClosingParenBeforeCapital(text: string): string {
  return text.replace(/\)([A-Z][a-z])/g, ')\n\n$1');
}

/**
 * "### … TableBelow" / "… ComparisonTable" — model omits space before a TitleCase word
 * on the same line as an ATX heading (GFM still parses as one heading; we add a space).
 */
function splitGluedTitleCaseInHeadingLines(text: string): string {
  return text
    .split('\n')
    .map((line) => {
      if (!/^#{1,6}\s+\S/.test(line)) return line;
      return line.replace(/([a-z])([A-Z][a-z]{3,})/g, '$1 $2');
    })
    .join('\n');
}

function ensureNewlineBeforeBullets(text: string): string {
  // Do not match the last "- " of ":--- " (GFM table alignment) — prev char must not be "-".
  let s = text.replace(/([^\n-])(- )/g, '$1\n$2');
  // Do not split closing "**" of bold (e.g. "**text** |") — prev char must not be "*".
  s = s.replace(/([^\n*])(\* )/g, '$1\n$2');
  s = s.replace(/([a-zA-Z*.)])(\d+\.\s)/g, '$1\n$2');
  s = s.replace(/(?<=\S)(\s+)((?:[2-9]|\d{2,})\.\s+(?:\*|\*\*))/g, '\n$2');
  return s;
}

function ensureNewlineAfterHeadingText(text: string): string {
  let s = text.replace(/(#{1,6} [^\n]+?)([a-z])([A-Z][a-z])/g, (_m, pre, lo, hi) => pre + lo + '\n\n' + hi);
  s = s.replace(/(#{1,6} [^\n]+\w) (The |A |An |It |This |These |In |For |At |By )/g, '$1\n\n$2');
  return s;
}

/** "### Title?**Bold**" on one line */
function ensureNewlineHeadingLineBeforeBold(text: string): string {
  return text.replace(/^(#{1,6}\s+\S[^\n]*?)([.!?])(\*\*)/gm, '$1$2\n\n$3');
}

/**
 * "# YOLO: … Once**YOLO (...)**" — heading text glued to **bold** with no space/punctuation before **.
 * (ensureNewlineHeadingLineBeforeBold only handles .!? before **.)
 */
function ensureNewlineBeforeGluedBoldAfterHeadingLine(text: string): string {
  return text
    .split('\n')
    .map((line) => {
      if (!/^#{1,6}\s/.test(line.trim())) return line;
      return line.replace(/([a-zA-Z0-9:.,!?)])(\*\*)([A-Z])/g, '$1\n\n$2$3');
    })
    .join('\n');
}

/**
 * "**Section Title**Next paragraph" — closing `**` glued to a capitalized word (YOLO / Model / Implementing).
 * Requires at least one lowercase after the leading capital so single-letter `**I` is skipped.
 */
function ensureNewlineAfterClosedBoldBeforeCapital(text: string): string {
  return text.replace(
    /([a-z0-9.!?])\*\*([A-Z][a-z]{1,})\b/g,
    '$1**\n\n$2',
  );
}

function ensureNewlineBeforeAllHeadings(text: string): string {
  return text.replace(/(?<![#\n])(#{1,6} )/g, '\n\n$1');
}

function fixModelBlockSeparators(text: string): string {
  let s = ensureNewlineBeforeThematicBreakAfterPunctuation(text);
  s = ensureNewlineBeforeFenceOpener(s);
  s = ensureNewlineBeforeAtxHeading(s);
  s = ensureNewlineAfterClosingParenBeforeCapital(s);
  s = ensureNewlineAfterSentenceEndBeforeCapitalWord(s);
  s = ensureNewlineAfterHeadingText(s);
  s = splitGluedTitleCaseInHeadingLines(s);
  s = ensureNewlineBeforeGluedBoldAfterHeadingLine(s);
  s = splitGluedTitleCaseInPlainParagraphLines(s);
  s = ensureNewlineAfterClosedBoldBeforeCapital(s);
  s = ensureNewlineHeadingLineBeforeBold(s);
  s = ensureNewlineBeforeBullets(s);
  s = ensureNewlineBeforeAllHeadings(s);
  s = ensureNewlineBeforeNumberedListAfterColon(s);
  return s;
}

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

function fixFenceLanguageSplitAcrossLines(text: string): string {
  return text.replace(
    /^(\s*)(```)([a-zA-Z0-9#+]+)\s*\r?\n([a-zA-Z0-9#+]+)\s*\r?\n/gm,
    (full, indent, ticks, a, b) => {
      const merged = `${a}${b}`.toLowerCase();
      if (!FENCE_LANG_ALIASES.includes(merged)) return full;
      const aLow = a.toLowerCase();
      if (aLow === merged) return full;
      if (!merged.startsWith(aLow) || aLow.length >= merged.length) return full;
      if (b.length > 5) return full;
      return `${indent}${ticks}${merged}\n`;
    },
  );
}

function fixGluedFenceOpen(text: string): string {
  const langPattern = FENCE_LANG_ALIASES.join('|');
  const re = new RegExp('```(' + langPattern + ')(?=\\S)', 'gi');
  return text.replace(re, (_match, lang: string) => '```' + lang.toLowerCase() + '\n');
}

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

function fixUnfencedCode(text: string): string {
  const rules: [RegExp, string][] = [
    [/\b(html)\s*(?=<!DOCTYPE\b|<html\b)/gi, 'html'],
    [/\b(css)\s*(?=[a-zA-Z*#.[\s][^{]*\{)/g, 'css'],
    [/\b(javascript|js)\s*(?=(?:const|let|var|function|import|export|class)\s)/gi, 'javascript'],
    [/\b(typescript|ts)\s*(?=(?:const|let|var|function|import|export|interface|type)\s)/gi, 'typescript'],
    [/\b(python|py)\s*(?=(?:import|from|def|class|#!)\s)/gi, 'python'],
    [/\b(java)\s*(?=(?:public|import|package)\s)/g, 'java'],
    [/\b(bash|shell|sh)\s*(?=#!\/)/gi, 'bash'],
    [/\b(sql)\s*(?=(?:SELECT|INSERT|UPDATE|DELETE|CREATE|DROP)\s)/gi, 'sql'],
    [/\b(json)\s*(?=(?:\[|{))/gi, 'json'],
    [/\b(go)\s*(?=package\s)/g, 'go'],
    [/\b(rust)\s*(?=fn\s)/g, 'rust'],
    [/\b(cpp|c\+\+)\s*(?=#include\b)/gi, 'cpp'],
    [/\b(php)\s*(?=<\?php\b)/gi, 'php'],
  ];
  let result = text;
  for (const [pattern, lang] of rules) {
    result = result.replace(pattern, `\n\`\`\`${lang}\n`);
  }
  const opens = (result.match(/^```\w/gm) || []).length;
  const closes = (result.match(/^```\s*$/gm) || []).length;
  if (opens > closes) result += '\n```';
  return result;
}

export function applyOutsideCodeFences(text: string, fn: (chunk: string) => string): string {
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

function fixLlmMarkdownTablesAndStructure(text: string): string {
  return applyOutsideCodeFences(text, normalizeLlmMarkdownChunkLikeExport);
}

function ensureNewlineAfterBoldBeforeBulletBoldLine(text: string): string {
  return text.replace(/(\*\*[^*]+\*\*)(\s*)(\*\s+\*\*[^\n]+)/g, '$1\n\n$3');
}

function fixChatMarkdownLayout(text: string): string {
  let s = ensureNewlineAfterBoldBeforeBulletBoldLine(text);
  s = s.replace(/:\s*(\d+\.\s+\*\*)/g, ':\n\n$1');
  s = s.replace(/\)\s*:\s*(\d+\.\s+\*\*)/g, '):\n\n$1');
  s = s.replace(/(\d+\.\s+\*\*[^*]+\*\*)\s+\*\s+/g, '$1\n   * ');
  s = s.replace(
    /(\*\*Definition:\*\*[^\n]*?)\s+\*\s+\*Example:/g,
    '$1\n   * *Example:',
  );
  s = s.replace(/([^\n])\s+\*\s+\*Example:/g, '$1\n   * *Example:');
  s = s.replace(/([.!?])\s+\*\s+\*Example:/g, '$1\n   * *Example:');
  s = s.replace(/(\*\*[^*]+\*\*)\s+(\d+\.\s+\*\*)/g, '$1\n\n$2');
  return s;
}

/** Preprocess raw assistant markdown so GFM can parse tables, headings, and fences. */
export function normalizeMarkdownForChat(raw: string): string {
  let result = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  if (!result.trim()) return result;
  result = applyOutsideCodeFences(result, fixModelBlockSeparators);
  result = fixFencedCodeGlitches(result);
  result = fixUnfencedCode(result);
  result = fixLlmMarkdownTablesAndStructure(result);
  result = fixChatMarkdownLayout(result);
  result = ensureClosedFence(result);
  return result;
}
