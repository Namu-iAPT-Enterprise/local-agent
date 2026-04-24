/**
 * Builds a real .hwpx (OWPML ZIP) via POST `/convert`.
 *
 * - **Dev:** calls `http://<page-host>:8789` (Python `npm run hwpx-server`, bound to 0.0.0.0) so LAN
 *   (e.g. 192.168.x.x:5173) works without relying on the Vite `/hwpx-converter` proxy (which often 404s in Electron).
 * - **Production:** `{API_BASE}/api/hwpx` (Spring Boot).
 * - **Override:** `VITE_HWPX_CONVERTER_URL` = full base URL, no trailing slash.
 */
import { API_BASE } from '../config/apiBase';
import { normalizeLlmMarkdownForExport } from './llmMarkdownNormalize';

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

export async function markdownToHwpxBlob(markdown: string): Promise<Blob> {
  const base = hwpxConverterBase();
  if (!base) {
    throw new Error(
      'HWPX export could not resolve converter URL. In dev run `npm run hwpx-server`, ' +
        'or set VITE_HWPX_CONVERTER_URL / ensure VITE_API_BASE points at main-server with HWPX enabled.',
    );
  }
  const md = normalizeLlmMarkdownForExport(markdown);
  const url = `${base}/convert`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ markdown: md }),
  });
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
