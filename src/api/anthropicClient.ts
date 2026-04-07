import type { StreamEvent } from './chat';

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/$/, '');
}

export interface AnthropicChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Native Anthropic Messages API (streaming). Base URL is usually https://api.anthropic.com/v1
 */
export async function* streamAnthropicMessages(params: {
  baseUrl: string;
  apiKey: string;
  model: string;
  messages: AnthropicChatMessage[];
  signal?: AbortSignal;
}): AsyncGenerator<StreamEvent> {
  const base = normalizeBaseUrl(params.baseUrl);
  const url = `${base}/messages`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': params.apiKey,
      'anthropic-version': '2023-06-01',
      Accept: 'text/event-stream',
    },
    body: JSON.stringify({
      model: params.model,
      max_tokens: 8192,
      messages: params.messages.map((m) => ({ role: m.role, content: m.content })),
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
            type?: string;
            error?: { type?: string; message?: string };
            delta?: { type?: string; text?: string; thinking?: string };
          };
          if (json.type === 'error' && json.error?.message) {
            yield { type: 'error', data: json.error.message };
            return;
          }
          if (json.error?.message) {
            yield { type: 'error', data: json.error.message };
            return;
          }
          if (json.type !== 'content_block_delta' || !json.delta) continue;
          const d = json.delta;
          if (d.type === 'thinking_delta' && d.thinking) {
            yield { type: 'thinking', data: d.thinking };
          }
          if (d.type === 'text_delta' && d.text) {
            yield { type: 'message', data: d.text };
          }
        } catch {
          /* ignore */
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  yield { type: 'done', data: '[DONE]' };
}
