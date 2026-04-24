import type { StreamEvent } from './chat';

export function normalizeOpenAIBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/$/, '');
}

/**
 * If the URL points to a local Ollama instance (127.0.0.1:11434 or localhost:11434),
 * rewrite it to use the Vite dev-server proxy path (/ollama-proxy).
 *
 * This is needed when the browser accesses the app from a LAN IP (e.g. 192.168.0.34:5173):
 * a browser-side fetch to http://127.0.0.1:11434 would hit the *browser device's* localhost,
 * not the Mac running Ollama — and would be blocked by CORS anyway.
 * The Vite proxy forwards /ollama-proxy/* → http://127.0.0.1:11434 server-side (no CORS).
 */
export function resolveOllamaProxyUrl(baseUrl: string): string {
  const normalized = normalizeOpenAIBaseUrl(baseUrl);
  try {
    const u = new URL(normalized);
    if (
      (u.hostname === '127.0.0.1' || u.hostname === 'localhost') &&
      (u.port === '11434' || u.pathname.includes('11434'))
    ) {
      // Replace origin with proxy path; keep any sub-path (e.g. /v1)
      return `/ollama-proxy${u.pathname}`;
    }
  } catch {
    if (/127\.0\.0\.1:11434|localhost:11434/.test(normalized)) {
      return normalized.replace(/https?:\/\/(127\.0\.0\.1|localhost):11434/, '/ollama-proxy');
    }
  }
  return normalized;
}

/** Local Ollama OpenAI-compat endpoint — no API key required. */
export function isOllamaOpenAICompatUrl(baseUrl: string): boolean {
  const s = baseUrl.trim().toLowerCase();
  if (!s) return false;
  try {
    const u = new URL(s);
    return (
      u.hostname === 'localhost' ||
      u.hostname === '127.0.0.1' ||
      u.port === '11434'
    );
  } catch {
    return /localhost|127\.0\.0\.1|:11434/.test(s);
  }
}

/**
 * GET {base}/models — same check as Settings; runs in the browser so the request
 * hits the provider directly (subject to CORS).
 */
export async function testOpenAICompatibleConnection(
  baseUrl: string,
  apiKey: string,
  _modelName: string,
): Promise<{ ok: boolean; error?: string }> {
  const base = resolveOllamaProxyUrl(baseUrl);
  if (!base) return { ok: false, error: 'Base URL is required' };
  try {
    const headers: Record<string, string> = {};
    if (apiKey.trim()) headers.Authorization = `Bearer ${apiKey}`;
    const res = await fetch(`${base}/models`, {
      headers,
      signal: AbortSignal.timeout(10000),
    });
    if (res.ok) return { ok: true };
    const text = await res.text().catch(() => res.statusText);
    return { ok: false, error: `${res.status}: ${text.slice(0, 120)}` };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Request failed' };
  }
}

export interface OpenAIChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

/**
 * POST /chat/completions with stream: true; parses SSE from the provider in-page.
 */
export async function* streamOpenAICompatibleChat(params: {
  baseUrl: string;
  apiKey: string;
  model: string;
  messages: OpenAIChatMessage[];
  signal?: AbortSignal;
}): AsyncGenerator<StreamEvent> {
  const url = `${resolveOllamaProxyUrl(params.baseUrl)}/chat/completions`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'text/event-stream',
  };
  if (params.apiKey.trim()) headers.Authorization = `Bearer ${params.apiKey}`;

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: params.model,
      messages: params.messages,
      stream: true,
    }),
    signal: params.signal,
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => res.statusText);
    yield { type: 'error', data: `${res.status}: ${errText}` };
    return;
  }
  if (!res.body) {
    yield { type: 'error', data: 'No response body' };
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (!line.startsWith('data:')) continue;
        const payload = line.slice(5).trimStart();
        if (payload === '[DONE]') {
          yield { type: 'done', data: '[DONE]' };
          return;
        }
        try {
          const json = JSON.parse(payload) as {
            choices?: Array<{
              delta?: {
                content?: string | null;
                reasoning_content?: string | null;
                /** OpenRouter / some providers */
                reasoning?: string | null;
              };
            }>;
          };
          const delta = json.choices?.[0]?.delta;
          if (!delta) continue;
          const reasoning =
            delta.reasoning_content ?? delta.reasoning ?? undefined;
          const content = delta.content;
          if (reasoning) yield { type: 'thinking', data: reasoning };
          if (content) yield { type: 'message', data: content };
        } catch {
          /* ignore malformed chunk */
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  yield { type: 'done', data: '[DONE]' };
}
