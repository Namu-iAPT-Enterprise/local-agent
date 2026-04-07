import { authHeaders } from './auth';

const BASE = 'http://192.168.0.10:8080';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SendMessageRequest {
  sessionId: string | null;
  message: string;
  thinking?: boolean;
  model?: string;
  platform?: string;
  apiKey?: string;
  baseUrl?: string;
}

export interface SendMessageResponse {
  sessionId: string;
  status: string;
}

export interface HistoryMessage {
  role: 'user' | 'assistant';
  content: string;
  thinking: string | null;
  timestamp: string;
}

export type StreamEventType = 'thinking' | 'message' | 'done' | 'error';

export interface StreamEvent {
  type: StreamEventType;
  data: string;
}

// ── API functions ─────────────────────────────────────────────────────────────

/**
 * POST /api/chat/message
 * Start a new message or continue an existing session.
 */
export async function postChatMessage(
  req: SendMessageRequest,
  signal?: AbortSignal,
): Promise<SendMessageResponse> {
  const res = await fetch(`${BASE}/api/chat/message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(req),
    signal,
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    const suffix = detail ? `: ${detail.slice(0, 300)}` : '';
    throw new Error(`Server returned ${res.status}${suffix}`);
  }
  return res.json();
}

/**
 * GET /api/chat/stream?session_id={sessionId}
 * Async generator that yields SSE events until done or error.
 */
export async function* streamChatSession(
  sessionId: string,
  signal?: AbortSignal,
): AsyncGenerator<StreamEvent> {
  const url = `${BASE}/api/chat/stream?session_id=${encodeURIComponent(sessionId)}`;
  const res = await fetch(url, {
    headers: { Accept: 'text/event-stream', ...authHeaders() },
    signal,
  });
  if (!res.ok || !res.body) throw new Error(`Server returned ${res.status}`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let eventType: StreamEventType = 'message';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (line.startsWith(':')) {
          // SSE comment / keep-alive heartbeat — ignore
        } else if (line.startsWith('event:')) {
          eventType = line.slice(6).trim() as StreamEventType;
        } else if (line.startsWith('data:')) {
          // Preserve leading space — space-prefixed tokens are intentional
          const data = line.slice(5);
          yield { type: eventType, data };
          if (eventType === 'done' || eventType === 'error') return;
        } else if (line === '') {
          // End of SSE event block — reset type for next event
          eventType = 'message';
        }
      }
    }
  } finally {
    reader.cancel();
  }
}

/**
 * GET /api/chat/history/{sessionId}
 * Returns the full message history for a session.
 */
export async function getChatHistory(sessionId: string): Promise<HistoryMessage[]> {
  const res = await fetch(`${BASE}/api/chat/history/${encodeURIComponent(sessionId)}`, {
    headers: { ...authHeaders() },
  });
  if (!res.ok) throw new Error(`Server returned ${res.status}`);
  return res.json();
}

/**
 * DELETE /api/chat/history/{sessionId}
 * Clears the session history. Returns 204 No Content.
 */
export async function deleteChatHistory(sessionId: string): Promise<void> {
  const res = await fetch(`${BASE}/api/chat/history/${encodeURIComponent(sessionId)}`, {
    method: 'DELETE',
    headers: { ...authHeaders() },
  });
  if (!res.ok) throw new Error(`Server returned ${res.status}`);
}
