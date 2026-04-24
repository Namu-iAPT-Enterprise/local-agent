/**
 * Converts a markdown string to a .docx Blob using the `docx` library.
 * Follows the docx skill best practices:
 *   - US Letter page size (12240 x 15840 DXA), 1-inch margins
 *   - Arial font, 12pt body
 *   - LevelFormat.BULLET for lists (never unicode bullets)
 *   - Separate Paragraph elements (never \n in TextRun)
 */
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  LevelFormat,
  Footer,
  PageNumber,
} from 'docx';

import { normalizeLlmMarkdownForExport } from './llmMarkdownNormalize';

// ── Pre-processing: normalise AI output before line-splitting ──────────────────
// AI models often emit markdown without proper newlines. These fixups ensure
// the line-by-line parser sees cleanly separated blocks.

function preprocess(text: string): string {
  let s = text;

  // 1. Insert blank line before any ATX heading (##) that isn't already at line start
  s = s.replace(/(?<!\n)(#{1,6} )/g, '\n\n$1');

  // 2a. Heading glued to body via CamelCase: "## IntroductionThe aeroplane…"
  //     → "## Introduction\n\nThe aeroplane…"
  s = s.replace(/(#{1,6} [^\n]+?)([a-z])([A-Z][a-z])/g, (_m, pre, lo, hi) => pre + lo + '\n\n' + hi);

  // 2b. Heading followed by a sentence-starter after a space: "## Conclusion The aeroplane…"
  //     → "## Conclusion\n\nThe aeroplane…"
  s = s.replace(
    /(#{1,6} [^\n]+\w) (The |A |An |It |This |These |In |For |At |By )/g,
    '$1\n\n$2',
  );

  // 3a. Numbered list items glued after a non-digit char: "da Vinci2." or "vinci.2." → split
  //     Include '.' so "brothers.2." also splits correctly.
  s = s.replace(/([a-zA-Z*.)])(\d+\. )/g, '$1\n$2');

  // 3b. 4-digit year followed by a single-digit list number: "19033. Golden" → "1903\n3. Golden"
  s = s.replace(/(\d{4})(\d\. )/g, '$1\n$2');

  // 4. Double-space bold key-value (AI output pattern: "  **Key**: value")
  s = s.replace(/  (\*\*[^*]+\*\*[*:,])/g, '\n- $1');

  // 5. Collapse 3+ newlines into two
  s = s.replace(/\n{3,}/g, '\n\n');

  return s.trim();
}

// ── Inline parser ─────────────────────────────────────────────────────────────

interface InlineSpan {
  text: string;
  bold?: boolean;
  italics?: boolean;
  code?: boolean;
  strike?: boolean;
}

function parseInline(raw: string): InlineSpan[] {
  const spans: InlineSpan[] = [];
  // Match in priority order: **bold**, *italic*, `code`, ~~strike~~
  const re = /(\*\*|__)(.*?)\1|\*(.*?)\*|_(.*?)_|`([^`]+)`|(~~)(.*?)\6/gs;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw)) !== null) {
    if (m.index > last) spans.push({ text: raw.slice(last, m.index) });
    if (m[1])      spans.push({ text: m[2], bold: true });
    else if (m[3]) spans.push({ text: m[3], italics: true });
    else if (m[4]) spans.push({ text: m[4], italics: true });
    else if (m[5]) spans.push({ text: m[5], code: true });
    else if (m[6]) spans.push({ text: m[7], strike: true });
    last = m.index + m[0].length;
  }
  if (last < raw.length) spans.push({ text: raw.slice(last) });
  return spans.filter((s) => s.text.length > 0);
}

function spansToRuns(spans: InlineSpan[]): TextRun[] {
  return spans.map(
    (s) =>
      new TextRun({
        text: s.text,
        bold: s.bold,
        italics: s.italics,
        strike: s.strike,
        font: s.code ? 'Courier New' : 'Arial',
        size: s.code ? 18 : 24, // 9pt code / 12pt body (half-points)
      }),
  );
}

// ── Block-level parser ────────────────────────────────────────────────────────

function parseLine(line: string, inCodeBlock: boolean): Paragraph | null {
  const trimmed = line.trim();

  if (inCodeBlock) {
    return new Paragraph({
      children: [new TextRun({ text: line, font: 'Courier New', size: 18 })],
      spacing: { before: 0, after: 0, line: 240 },
      indent: { left: 720 },
    });
  }

  // ATX Heading (# … ####)
  const headingMatch = /^(#{1,4})\s+(.+)$/.exec(trimmed);
  if (headingMatch) {
    const LEVELS: HeadingLevel[] = [
      HeadingLevel.HEADING_1,
      HeadingLevel.HEADING_2,
      HeadingLevel.HEADING_3,
      HeadingLevel.HEADING_4,
    ];
    return new Paragraph({
      heading: LEVELS[headingMatch[1].length - 1] ?? HeadingLevel.HEADING_4,
      children: spansToRuns(parseInline(headingMatch[2])),
    });
  }

  // Horizontal rule
  if (/^(---+|\*\*\*+|___+)$/.test(trimmed)) {
    return new Paragraph({
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, space: 1, color: 'AAAAAA' } },
      spacing: { before: 200, after: 200 },
      children: [],
    });
  }

  // Unordered list item (-, *, +)
  const ulMatch = /^(\s*)[*\-+]\s+(.+)$/.exec(line);
  if (ulMatch) {
    const depth = Math.min(Math.floor(ulMatch[1].length / 2), 1);
    return new Paragraph({
      numbering: { reference: 'bullets', level: depth },
      children: spansToRuns(parseInline(ulMatch[2])),
    });
  }

  // Ordered list item
  const olMatch = /^(\s*)\d+[.)]\s+(.+)$/.exec(line);
  if (olMatch) {
    const depth = Math.min(Math.floor(olMatch[1].length / 2), 1);
    return new Paragraph({
      numbering: { reference: 'numbers', level: depth },
      children: spansToRuns(parseInline(olMatch[2])),
    });
  }

  // Blockquote
  const bqMatch = /^>\s?(.*)$/.exec(trimmed);
  if (bqMatch) {
    return new Paragraph({
      children: spansToRuns(parseInline(bqMatch[1])),
      indent: { left: 720 },
      border: { left: { style: BorderStyle.SINGLE, size: 12, space: 10, color: '2E74B5' } },
    });
  }

  // Blank line → spacer
  if (!trimmed) {
    return new Paragraph({ children: [], spacing: { before: 60, after: 60 } });
  }

  // Normal paragraph
  return new Paragraph({
    children: spansToRuns(parseInline(trimmed)),
    spacing: { before: 80, after: 80 },
  });
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Extract the first # heading as a document title, falling back to `fallback`.
 */
export function extractMarkdownTitle(markdown: string, fallback = 'Document'): string {
  const m = /(?:^|\n)#\s+([^\n#]+)/.exec(markdown);
  return m ? m[1].trim() : fallback;
}

export async function markdownToDocxBlob(markdown: string): Promise<Blob> {
  const normalized = preprocess(normalizeLlmMarkdownForExport(markdown));
  const lines = normalized.split('\n');
  const paragraphs: Paragraph[] = [];
  let inCodeBlock = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Toggle code block state
    if (line.trim().startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      paragraphs.push(
        new Paragraph({
          children: [],
          spacing: { before: inCodeBlock ? 120 : 0, after: inCodeBlock ? 0 : 120 },
        }),
      );
      continue;
    }

    // Setext headings (next line is === or ---)
    const nextLine = lines[i + 1]?.trim() ?? '';
    if (!inCodeBlock) {
      if (/^=+$/.test(nextLine)) {
        paragraphs.push(new Paragraph({ heading: HeadingLevel.HEADING_1, children: spansToRuns(parseInline(line.trim())) }));
        i++;
        continue;
      }
      if (/^-+$/.test(nextLine) && nextLine.length >= 3) {
        paragraphs.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: spansToRuns(parseInline(line.trim())) }));
        i++;
        continue;
      }
    }

    const p = parseLine(line, inCodeBlock);
    if (p) paragraphs.push(p);
  }

  const doc = new Document({
    styles: {
      default: {
        document: { run: { font: 'Arial', size: 24 } }, // 12pt body
      },
      paragraphStyles: [
        {
          id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run: { size: 40, bold: true, font: 'Arial', color: '2E74B5' },
          paragraph: { spacing: { before: 360, after: 120 }, outlineLevel: 0 },
        },
        {
          id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run: { size: 32, bold: true, font: 'Arial', color: '2E74B5' },
          paragraph: { spacing: { before: 280, after: 100 }, outlineLevel: 1 },
        },
        {
          id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run: { size: 28, bold: true, font: 'Arial' },
          paragraph: { spacing: { before: 240, after: 80 }, outlineLevel: 2 },
        },
        {
          id: 'Heading4', name: 'Heading 4', basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run: { size: 24, bold: true, italics: true, font: 'Arial' },
          paragraph: { spacing: { before: 200, after: 60 }, outlineLevel: 3 },
        },
      ],
    },
    numbering: {
      config: [
        {
          reference: 'bullets',
          levels: [
            {
              level: 0, format: LevelFormat.BULLET, text: '\u2022',
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 720, hanging: 360 } }, run: { font: 'Arial' } },
            },
            {
              level: 1, format: LevelFormat.BULLET, text: '\u25E6',
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 1440, hanging: 360 } }, run: { font: 'Arial' } },
            },
          ],
        },
        {
          reference: 'numbers',
          levels: [
            {
              level: 0, format: LevelFormat.DECIMAL, text: '%1.',
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 720, hanging: 360 } }, run: { font: 'Arial' } },
            },
            {
              level: 1, format: LevelFormat.LOWER_LETTER, text: '%2.',
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 1440, hanging: 360 } }, run: { font: 'Arial' } },
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 12240, height: 15840 }, // US Letter
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }, // 1-inch margins
          },
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ children: [PageNumber.CURRENT], font: 'Arial', size: 18, color: '888888' }),
                ],
              }),
            ],
          }),
        },
        children: paragraphs,
      },
    ],
  });

  return Packer.toBlob(doc);
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
