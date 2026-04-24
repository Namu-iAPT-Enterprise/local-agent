/**
 * Converts structured markdown to a .pptx Blob using pptxgenjs.
 *
 * Slide structure parsed from markdown:
 *   # Title          → title slide (slide 1)
 *   ## Section        → new content slide (title from ## heading)
 *   - bullet / 1.    → bullet list on that slide
 *   plain paragraph  → body paragraph on that slide
 *
 * Follows pptxgenjs skill best practices:
 *   - NEVER "#" prefix on hex colors
 *   - NEVER unicode bullets (use bullet: true)
 *   - Use breakLine: true between multi-line items
 *   - Fresh option objects per call (pptxgenjs mutates in-place)
 */

import PptxGenJS from 'pptxgenjs';
import { normalizeLlmMarkdownForExport } from './llmMarkdownNormalize';

type PptxInstance = InstanceType<typeof PptxGenJS>;

// ── Design tokens ─────────────────────────────────────────────────────────────
// "Midnight Executive" palette from the skill design guide
const PALETTE = {
  primary:   '1E2761',   // navy — title/dark slides
  secondary: 'CADCFC',   // ice blue — accents
  light:     'F4F6FB',   // near-white — content slide bg
  text:      '1A1A2E',   // near-black body text
  muted:     '64748B',   // captions / secondary
  accent:    '2E74B5',   // blue accent line / highlight
  white:     'FFFFFF',
};

const FONT_TITLE  = 'Calibri';
const FONT_BODY   = 'Calibri';
const SLIDE_W     = 10;     // inches  (LAYOUT_16x9)
const SLIDE_H     = 5.625;  // inches

// ── Markdown pre-processor (same as docx, adapted) ───────────────────────────

/**
 * Models often emit one long line: `Title?- bullet one.- bullet two.- bullet three`
 * without newlines — the slide parser then treats everything as the title bar text.
 */
function splitGluedBullets(text: string): string {
  let s = text;
  // "?- " / "!- " / ".- " → newline before dash bullets (most common LLM glitch)
  s = s.replace(/([.!?])\s*-\s+/g, '$1\n- ');
  // No space after hyphen: "?-Large" → "? \n- Large"
  s = s.replace(/([.!?])-\s*(?=[A-Za-z])/g, '$1\n- ');
  // "Title:- bullet" or "Note:- item"
  s = s.replace(/:\s*-\s+/g, ':\n- ');
  s = s.replace(/:-\s*(?=[A-Za-z])/g, ':\n- ');
  // En/em dash as fake bullet separator
  s = s.replace(/([.!?])\s*[–—]\s+/g, '$1\n- ');
  return s;
}

/** `Slide 1: Topic` at line start → markdown heading so we get a real title + body split */
function normalizeSlideHeadings(text: string): string {
  return text.replace(/^(Slide\s+\d+\s*:\s*.+)$/gm, '## $1');
}

/** Shorter title in the navy bar: "What is an LLM?" instead of "Slide 1: What is an LLM?" */
function cleanSlideTitle(title: string): string {
  const t = title.replace(/^Slide\s+\d+\s*:\s*/i, '').trim();
  return t.length > 0 ? t : title;
}

function preprocess(text: string): string {
  let s = text;
  s = splitGluedBullets(s);
  s = normalizeSlideHeadings(s);
  s = s.replace(/^[•▪▸]\s*/gm, '- ');
  s = s.replace(/(?<!\n)(#{1,4} )/g, '\n\n$1');
  s = s.replace(/(#{1,4} [^\n]+?)([a-z])([A-Z][a-z])/g, (_m, pre, lo, hi) => pre + lo + '\n\n' + hi);
  s = s.replace(/(#{1,4} [^\n]+\w) (The |A |An |It |This |These |In |For |At |By )/g, '$1\n\n$2');
  s = s.replace(/([a-zA-Z*.)])(\d+\. )/g, '$1\n$2');
  s = s.replace(/(\d{4})(\d\. )/g, '$1\n$2');
  s = s.replace(/ {2}(\*\*[^*]+\*\*[*:,])/g, '\n- $1');
  s = s.replace(/\n{3,}/g, '\n\n');
  return s.trim();
}

/** Plain text from markdown (strip all markers) */
function stripInline(raw: string): string {
  return raw
    .replace(/(\*\*|__)(.*?)\1/gs, '$2')
    .replace(/(\*|_)(.*?)\1/gs, '$2')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/~~(.*?)~~/gs, '$1')
    .trim();
}

// ── Slide model ───────────────────────────────────────────────────────────────

interface SlideModel {
  title: string;
  isTitle: boolean;       // true = decorative title/cover slide
  bullets: string[];      // plain bullet text
  paragraphs: string[];   // non-bullet body paragraphs
}

function parseSlides(markdown: string): SlideModel[] {
  const normalized = preprocess(markdown);
  const lines = normalized.split('\n');
  const slides: SlideModel[] = [];
  let current: SlideModel | null = null;

  const flush = () => {
    if (current) slides.push(current);
    current = null;
  };

  for (const line of lines) {
    const trimmed = line.trim();

    // H1 → title / cover slide
    const h1 = /^#\s+(.+)$/.exec(trimmed);
    if (h1) {
      flush();
      current = { title: stripInline(h1[1]), isTitle: true, bullets: [], paragraphs: [] };
      continue;
    }

    // H2–H4 → content slide (models often use ### for slide titles)
    const h2 = /^#{2,4}\s+(.+)$/.exec(trimmed);
    if (h2) {
      flush();
      current = {
        title: cleanSlideTitle(stripInline(h2[1])),
        isTitle: false,
        bullets: [],
        paragraphs: [],
      };
      continue;
    }

    // Plain "Slide N: …" line without ## (after glued-bullet split)
    const slidePlain = /^(Slide\s+\d+\s*:\s*.+)$/.exec(trimmed);
    if (slidePlain) {
      flush();
      current = {
        title: cleanSlideTitle(stripInline(slidePlain[1])),
        isTitle: false,
        bullets: [],
        paragraphs: [],
      };
      continue;
    }

    if (!current) {
      // Content before any heading → create a default slide
      current = { title: '', isTitle: false, bullets: [], paragraphs: [] };
    }

    // Bullet item
    const ul = /^[*\-+]\s+(.+)$/.exec(trimmed);
    if (ul) { current.bullets.push(stripInline(ul[1])); continue; }

    const ol = /^\d+[.)]\s+(.+)$/.exec(trimmed);
    if (ol) { current.bullets.push(stripInline(ol[1])); continue; }

    // Non-empty paragraph
    if (trimmed && trimmed !== '---') {
      current.paragraphs.push(stripInline(trimmed));
    }
  }
  flush();

  return slides.filter((s) => s.title || s.bullets.length > 0 || s.paragraphs.length > 0);
}

// ── Slide renderers ───────────────────────────────────────────────────────────

/** Cover / Title slide — dark background, centred title */
function renderTitleSlide(pres: PptxInstance, slide: SlideModel) {
  const s = pres.addSlide();
  s.background = { color: PALETTE.primary };

  // Accent bar (left edge)
  s.addShape(pres.ShapeType.rect, {
    x: 0, y: 0, w: 0.12, h: SLIDE_H,
    fill: { color: PALETTE.secondary },
    line: { type: 'none' },
  });

  // Title
  s.addText(slide.title || 'Presentation', {
    x: 0.5, y: 1.8, w: 9, h: 1.4,
    fontFace: FONT_TITLE,
    fontSize: 40,
    bold: true,
    color: PALETTE.white,
    align: 'center',
    valign: 'middle',
  });

  // Subtitle (first paragraph if any)
  if (slide.paragraphs.length > 0) {
    s.addText(slide.paragraphs[0], {
      x: 0.5, y: 3.4, w: 9, h: 0.6,
      fontFace: FONT_BODY,
      fontSize: 18,
      color: PALETTE.secondary,
      align: 'center',
    });
  }
}

/** Content slide — white background, navy title banner, dark body text */
function renderContentSlide(pres: PptxInstance, slide: SlideModel) {
  const s = pres.addSlide();
  // White background for maximum readability
  s.background = { color: 'FFFFFF' };

  // ── Title banner ──────────────────────────────────────────────────────────
  s.addShape(pres.ShapeType.rect, {
    x: 0, y: 0, w: SLIDE_W, h: 1.15,
    fill: { color: PALETTE.primary },
    line: { type: 'none' },
  });

  // Left accent stripe on title bar
  s.addShape(pres.ShapeType.rect, {
    x: 0, y: 0, w: 0.08, h: 1.15,
    fill: { color: PALETTE.secondary },
    line: { type: 'none' },
  });

  s.addText(slide.title, {
    x: 0.25, y: 0.05, w: 9.5, h: 1.05,
    fontFace: FONT_TITLE,
    fontSize: 26,
    bold: true,
    color: PALETTE.white,   // white on navy — clearly visible
    valign: 'middle',
    margin: 0,
  });

  // ── Body area ─────────────────────────────────────────────────────────────
  const BODY_X = 0.5;
  const BODY_Y = 1.35;
  const BODY_W = 9.0;
  const BODY_H = SLIDE_H - BODY_Y - 0.25;

  if (slide.bullets.length > 0) {
    // Intro paragraph above bullets (if any)
    let bulletY = BODY_Y;
    if (slide.paragraphs.length > 0) {
      s.addText(slide.paragraphs[0], {
        x: BODY_X, y: BODY_Y, w: BODY_W, h: 0.45,
        fontFace: FONT_BODY,
        fontSize: 13,
        color: PALETTE.muted,   // explicit color — REQUIRED
        valign: 'top',
      });
      bulletY = BODY_Y + 0.5;
    }

    // Build bullet items — color/fontSize/fontFace MUST be on the container,
    // not just in item options, for pptxgenjs to render correctly.
    const bulletItems = slide.bullets.map((b, i) => ({
      text: b,
      options: {
        bullet: { type: 'bullet' as const },
        paraSpaceAfter: 6,
        breakLine: i < slide.bullets.length - 1,
      },
    }));

    s.addText(bulletItems, {
      x: BODY_X,
      y: bulletY,
      w: BODY_W,
      h: BODY_H - (bulletY - BODY_Y),
      fontFace: FONT_BODY,
      fontSize: 16,           // ← container-level font size (required)
      color: '1A1A2E',        // ← container-level color (required for visibility)
      valign: 'top',
      wrap: true,
    });

  } else if (slide.paragraphs.length > 0) {
    // Plain text slides — stack up to 4 paragraphs
    const paras = slide.paragraphs.slice(0, 4);
    const perH = BODY_H / paras.length;
    paras.forEach((p, i) => {
      s.addText(p, {
        x: BODY_X,
        y: BODY_Y + i * perH,
        w: BODY_W,
        h: perH - 0.05,
        fontFace: FONT_BODY,
        fontSize: paras.length === 1 ? 18 : 15,
        color: '1A1A2E',      // ← explicit color
        valign: 'top',
        wrap: true,
      });
    });
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export function extractPresentationTitle(markdown: string, fallback = 'Presentation'): string {
  const h1 = /(?:^|\n)#\s+([^\n#]+)/.exec(markdown);
  if (h1) return h1[1].trim();
  const h2 = /(?:^|\n)#{2,4}\s+([^\n]+)/.exec(markdown);
  if (h2) return cleanSlideTitle(h2[1].trim());
  const slide = /(?:^|\n)(Slide\s+\d+\s*:\s*.+)/.exec(markdown);
  return slide ? cleanSlideTitle(slide[1].trim()) : fallback;
}

export async function markdownToPptxBlob(markdown: string): Promise<Blob> {
  const md = normalizeLlmMarkdownForExport(markdown);
  const pres = new PptxGenJS();
  pres.layout = 'LAYOUT_16x9';
  pres.author  = 'Namu AI';
  pres.title   = extractPresentationTitle(md);

  const slides = parseSlides(md);

  // If there's only content slides and no title slide, prepend one
  const hasTitleSlide = slides.some((s) => s.isTitle);
  if (!hasTitleSlide && slides.length > 0) {
    slides.unshift({ title: pres.title as string, isTitle: true, bullets: [], paragraphs: [] });
  }

  for (const slide of slides) {
    if (slide.isTitle) {
      renderTitleSlide(pres, slide);
    } else {
      renderContentSlide(pres, slide);
    }
  }

  // pptxgenjs write() returns a base64 string in browser environments
  const b64: string = await pres.write({ outputType: 'base64' });
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' });
}
