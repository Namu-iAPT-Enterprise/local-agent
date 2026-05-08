/**
 * Builds a real .hwpx (OWPML ZIP) via POST `/convert`.
 *
 * - **Dev:** calls `http://<page-host>:8789` (Python `npm run hwpx-server`, bound to 0.0.0.0) so LAN
 *   (e.g. 192.168.x.x:5173) works without relying on the Vite `/hwpx-converter` proxy (which often 404s in Electron).
 * - **Production:** `{API_BASE}/api/hwpx` (Spring Boot).
 * - **Override:** `VITE_HWPX_CONVERTER_URL` = full base URL, no trailing slash.
 */
import { API_BASE } from '../config/apiBase';
import { normalizeLlmMarkdownForHwpx } from './llmMarkdownNormalize';

interface HwpxStructuredPayload {
  title: string;
  recipient: string;
  reference: string;
  sender: string;
  date: string;
  bodyParagraphs: string[];
  attachments: string[];
  signature: string;
}

function hwpxConverterBase(): string {
  const v = (import.meta.env.VITE_HWPX_CONVERTER_URL as string | undefined)?.trim();
  if (v) return v.replace(/\/$/, '');
  if (import.meta.env.DEV) {
    if (typeof window !== 'undefined' && window.location.protocol.startsWith('http')) {
      const host = window.location.hostname || '127.0.0.1';
      return `http://${host}:8789`;
    }
    return 'http://127.0.0.1:8789';
  }
  return `${API_BASE}/api/hwpx`;
}

function extractLabelValue(text: string, label: string): string {
  const m = text.match(new RegExp(`(?:^|\\n)\\s*${label}\\s*:\\s*(.+)`));
  return (m?.[1] ?? '').trim();
}

function toStructuredPayload(md: string): HwpxStructuredPayload | null {
  const title = extractLabelValue(md, '제목');
  const recipient = extractLabelValue(md, '수신');
  const reference = extractLabelValue(md, '참조');
  const sender = extractLabelValue(md, '발신');
  const date = extractLabelValue(md, '시행일');

  // Body: strip known metadata lines and attachment/signature headers.
  const lines = md.split('\n').map((l) => l.trim());
  const bodyLines = lines.filter((ln) => {
    if (!ln) return false;
    if (/^(제목|수신|참조|발신|시행일)\s*:/.test(ln)) return false;
    if (/^붙임\s*:?$/.test(ln)) return false;
    if (/^서명\s*:?$/.test(ln)) return false;
    if (/^\[?(문서\s*메타|문서메타|본문|붙임|서명)\]?$/.test(ln)) return false;
    return true;
  });

  const attachments: string[] = [];
  const bodyParagraphs: string[] = [];
  for (const ln of bodyLines) {
    const att = ln.match(/^\d+\.\s*(.+)$/);
    if (att) {
      attachments.push(att[1].trim());
      continue;
    }
    bodyParagraphs.push(ln);
  }

  // Require at least title + body for structured mode.
  if (!title || bodyParagraphs.length === 0) return null;
  return {
    title,
    recipient,
    reference,
    sender,
    date,
    bodyParagraphs,
    attachments,
    signature: '',
  };
}

async function postHwpxConvert(url: string, body: unknown): Promise<Response> {
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export async function markdownToHwpxBlob(markdown: string): Promise<Blob> {
  const base = hwpxConverterBase();
  if (!base) {
    throw new Error(
      'HWPX export could not resolve converter URL. In dev run `npm run hwpx-server`, ' +
        'or set VITE_HWPX_CONVERTER_URL / ensure VITE_API_BASE points at main-server with HWPX enabled.',
    );
  }
  const md = normalizeLlmMarkdownForHwpx(markdown);
  const structured = toStructuredPayload(md);
  const fallbackUrl = `${base}/convert`;
  const structuredUrl = `${base}/convert-structured`;
  let res: Response;
  if (structured) {
    res = await postHwpxConvert(structuredUrl, structured);
    // graceful fallback for old backend or parse mismatch.
    if (res.status === 404 || res.status === 400 || res.status === 415) {
      res = await postHwpxConvert(fallbackUrl, { markdown: md });
    }
  } else {
    res = await postHwpxConvert(fallbackUrl, { markdown: md });
  }
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    let detail = t.slice(0, 1200);
    try {
      const j = JSON.parse(t) as { message?: string; detail?: string };
      if (typeof j.message === 'string' && j.message.length > 0) {
        detail = j.message;
      } else if (typeof j.detail === 'string' && j.detail.length > 0) {
        detail = j.detail;
      }
    } catch {
      /* plain text body */
    }
    throw new Error(`HWPX converter failed (${res.status}): ${detail}`);
  }
  return res.blob();
}
