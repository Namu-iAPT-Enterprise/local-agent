import { useState, useRef } from 'react';
import { postChatMessage, streamChatSession } from '../api/chat';
import { streamAnthropicMessages, type AnthropicChatMessage } from '../api/anthropicClient';
import {
  streamOpenAICompatibleChat,
  type OpenAIChatMessage,
  isOllamaOpenAICompatUrl,
} from '../api/openaiClient';

export interface ModelOption {
  id: string;
  name: string;
  platform: string;
  baseUrl?: string;
  apiKey?: string;
  isLocal: boolean;
}

export const LOCAL_MODELS: ModelOption[] = [
  { id: 'qwen3-8b',    name: 'qwen3:8b',    platform: 'Ollama', isLocal: true },
  { id: 'qwen3.5-4b',  name: 'qwen3.5:4b',  platform: 'Ollama', isLocal: true },
];

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  thinking?: string;
  /** 'connecting' = POST sent, waiting for sessionId/first token; 'streaming' = tokens arriving */
  status?: 'connecting' | 'streaming';
  error?: boolean;
}

/** Map raw server error strings to user-friendly messages. */
function friendlyError(raw: string): string {
  if (raw.includes('429')) return 'Rate limit reached. Wait a moment and try again, or switch to a different model.';
  if (raw.includes('401') || raw.includes('Unauthorized')) return 'Invalid API key. Check your key in Settings → Model.';
  if (raw.includes('403') || raw.includes('Forbidden')) return 'Access denied. Your API key may not have permission for this model.';
  if (raw.includes('404')) return 'Model not found. Check the model name in Settings → Model.';
  if (raw.includes('500') || raw.includes('502') || raw.includes('503')) return 'The AI provider is temporarily unavailable. Try again in a moment.';
  if (raw.includes('ECONNREFUSED') || raw.includes('fetch failed')) return 'Cannot reach the server. Is it running?';
  if (raw.includes('Failed to fetch') || raw.includes('Load failed') || raw.includes('NetworkError'))
    return 'Browser could not reach the API (often CORS). The provider must allow requests from this app’s origin, or use a local proxy.';
  return raw;
}

function buildOpenAIMessages(thread: Message[], newUserText: string): OpenAIChatMessage[] {
  const out: OpenAIChatMessage[] = [];
  for (const m of thread) {
    if (m.role === 'user') {
      if (m.content.trim()) out.push({ role: 'user', content: m.content });
    } else if (m.role === 'assistant' && !m.error && m.content.trim()) {
      out.push({ role: 'assistant', content: m.content });
    }
  }
  out.push({ role: 'user', content: newUserText });
  return out;
}

/** Parse <think>...</think> from a raw accumulated string. */
function parseRaw(raw: string): { thinking: string; content: string } {
  if (!raw.startsWith('<think>')) return { thinking: '', content: raw };
  const closeIdx = raw.indexOf('</think>');
  if (closeIdx === -1) return { thinking: raw.slice(6), content: '' };
  return {
    thinking: raw.slice(6, closeIdx).trim(),
    content: raw.slice(closeIdx + 8).trimStart(),
  };
}

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  /** Avoid mixing backend session history with client-only API turns (and vice versa). */
  const prevRoutingRef = useRef<'local' | 'api' | null>(null);
  // Accumulates the full raw response for the current assistant message.
  // Needed to correctly parse <think>...</think> across multiple tokens.
  const rawRef = useRef('');

  const appendThinkingToken = (token: string) => {
    setMessages((prev) => {
      const last = prev[prev.length - 1];
      if (last?.role === 'assistant') {
        return [...prev.slice(0, -1), { ...last, thinking: (last.thinking ?? '') + token }];
      }
      return [...prev, { role: 'assistant', content: '', thinking: token }];
    });
  };

  const appendToken = (token: string) => {
    rawRef.current += token;
    const { thinking, content } = parseRaw(rawRef.current);
    setMessages((prev) => {
      const last = prev[prev.length - 1];
      if (last?.role === 'assistant') {
        return [...prev.slice(0, -1), { ...last, thinking: thinking || last.thinking, content }];
      }
      return [...prev, { role: 'assistant', content }];
    });
  };

  const setLastAssistantError = (msg: string) => {
    setMessages((prev) => {
      const last = prev[prev.length - 1];
      if (last?.role === 'assistant') {
        return [...prev.slice(0, -1), { ...last, content: msg, error: true }];
      }
      return [...prev, { role: 'assistant', content: msg, error: true }];
    });
  };

  const send = async (text: string, thinking = false, model: ModelOption = LOCAL_MODELS[0]) => {
    if (isStreaming || !text.trim()) return;

    rawRef.current = '';
    setMessages((prev) => [...prev, { role: 'user', content: text }]);
    // Placeholder — shows "connecting" spinner while POST is in-flight and during TTFB
    setMessages((prev) => [...prev, { role: 'assistant', content: '', status: 'connecting' }]);
    setIsStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      let effectiveSessionId = sessionId;
      if (model.isLocal) {
        if (prevRoutingRef.current === 'api') {
          effectiveSessionId = null;
          setSessionId(null);
        }
        prevRoutingRef.current = 'local';
      } else {
        if (prevRoutingRef.current === 'local') setSessionId(null);
        prevRoutingRef.current = 'api';
      }

      let firstToken = true;

      const consumeEvent = (event: { type: string; data: string }) => {
        if (firstToken && (event.type === 'thinking' || event.type === 'message')) {
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last?.role === 'assistant') {
              return [...prev.slice(0, -1), { ...last, status: 'streaming' }];
            }
            return prev;
          });
          firstToken = false;
        }
        switch (event.type) {
          case 'thinking':
            appendThinkingToken(event.data);
            break;
          case 'message':
            appendToken(event.data);
            break;
          case 'done':
            break;
          case 'error':
            setLastAssistantError(friendlyError(event.data));
            break;
        }
      };

      if (model.isLocal) {
        // Ollama model name must be sent; otherwise main-server → llmServer uses its default (e.g. qwen3.5:4b).
        const payload = { sessionId: effectiveSessionId, message: text, thinking, model: model.name };
        const { sessionId: newSessionId } = await postChatMessage(payload, controller.signal);
        setSessionId(newSessionId);

        for await (const event of streamChatSession(newSessionId, controller.signal)) {
          consumeEvent(event);
          if (event.type === 'done' || event.type === 'error') break;
        }
      } else {
        const baseUrl = model.baseUrl?.trim() ?? '';
        const apiKey = model.apiKey?.trim() ?? '';
        const keyOptional =
          model.platform === 'Ollama' || isOllamaOpenAICompatUrl(baseUrl);
        if (!baseUrl) {
          setLastAssistantError('This model is missing a base URL. Add it in Settings → Model.');
          return;
        }
        if (!apiKey && !keyOptional) {
          setLastAssistantError('This model is missing an API key. Add it in Settings → Model.');
          return;
        }

        const apiMessages = buildOpenAIMessages(messages, text);

        if (model.platform === 'Anthropic') {
          if (!apiKey) {
            setLastAssistantError('Anthropic requires an API key.');
            return;
          }
          for await (const event of streamAnthropicMessages({
            baseUrl,
            apiKey,
            model: model.name,
            messages: apiMessages as AnthropicChatMessage[],
            signal: controller.signal,
          })) {
            consumeEvent(event);
            if (event.type === 'done' || event.type === 'error') break;
          }
        } else {
          for await (const event of streamOpenAICompatibleChat({
            baseUrl,
            apiKey,
            model: model.name,
            messages: apiMessages,
            signal: controller.signal,
          })) {
            consumeEvent(event);
            if (event.type === 'done' || event.type === 'error') break;
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === 'assistant' && last.content) return prev;
        const raw = err instanceof Error ? err.message : String(err);
        const errMsg =
          model.isLocal && (raw.includes('Failed to fetch') || raw.includes('Load failed'))
            ? 'Cannot reach the local server (port 8081). Is it running?'
            : friendlyError(raw);
        if (last?.role === 'assistant') {
          return [...prev.slice(0, -1), { ...last, content: errMsg, error: true }];
        }
        return [...prev, { role: 'assistant', content: errMsg, error: true }];
      });
    } finally {
      abortRef.current = null;
      setIsStreaming(false);
    }
  };

  const stop = () => {
    abortRef.current?.abort();
  };

  const clear = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    rawRef.current = '';
    prevRoutingRef.current = null;
    setMessages([]);
    setSessionId(null);
    setIsStreaming(false);
  };

  return { messages, isStreaming, send, clear, stop, sessionId };
}
