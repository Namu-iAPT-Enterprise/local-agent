import { useState, useRef } from 'react';
import { postChatMessage, streamChatSession, getChatHistory } from '../api/chat';
import { isOllamaOpenAICompatUrl } from '../api/openaiClient';

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
  { id: 'exaone3.5-2.4b', name: 'exaone3.5:2.4b', platform: 'Ollama', isLocal: true },
];

export interface AssistantVariant {
  content: string;
  thinking?: string;
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  thinking?: string;
  /** 'connecting' = POST sent, waiting for sessionId/first token; 'streaming' = tokens arriving */
  status?: 'connecting' | 'streaming';
  error?: boolean;
  /** Populated when the user regenerates a response — all variants including the original. */
  variants?: AssistantVariant[];
  /** Index into variants[] that is currently displayed. */
  activeVariantIdx?: number;
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

// ── Session→model persistence ─────────────────────────────────────────────────

const SESSION_MODEL_KEY = 'namu_session_models';

function saveSessionModel(sessionId: string, model: ModelOption) {
  try {
    const map: Record<string, ModelOption> = JSON.parse(localStorage.getItem(SESSION_MODEL_KEY) ?? '{}');
    map[sessionId] = model;
    // Keep last 200 sessions to avoid unbounded growth
    const keys = Object.keys(map);
    if (keys.length > 200) delete map[keys[0]];
    localStorage.setItem(SESSION_MODEL_KEY, JSON.stringify(map));
  } catch { /* ignore */ }
}

function getSessionModel(sessionId: string): ModelOption | null {
  try {
    const map: Record<string, ModelOption> = JSON.parse(localStorage.getItem(SESSION_MODEL_KEY) ?? '{}');
    return map[sessionId] ?? null;
  } catch {
    return null;
  }
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

  const send = async (text: string, thinking = false, model: ModelOption = LOCAL_MODELS[0], ragMode = true) => {
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
        // Ollama model name must be sent; otherwise main-server → llmServer uses its default (e.g. exaone3.5:2.4b).
        const payload = { sessionId: effectiveSessionId, message: text, thinking, model: model.name, useRag: ragMode };
        const { sessionId: newSessionId } = await postChatMessage(payload, controller.signal);
        setSessionId(newSessionId);
        saveSessionModel(newSessionId, model);

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

        // Route through main-server to enable RAG support for API models
        const payload = {
          sessionId: effectiveSessionId,
          message: text,
          thinking,
          model: model.name,
          platform: model.platform,
          baseUrl,
          apiKey,
          useRag: ragMode,
        };
        const { sessionId: newSessionId } = await postChatMessage(payload, controller.signal);
        setSessionId(newSessionId);
        saveSessionModel(newSessionId, model);

        for await (const event of streamChatSession(newSessionId, controller.signal)) {
          consumeEvent(event);
          if (event.type === 'done' || event.type === 'error') break;
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === 'assistant' && last.content) return prev;
        const raw = err instanceof Error ? err.message : String(err);
        const errMsg =
          (raw.includes('Failed to fetch') || raw.includes('Load failed'))
            ? 'Cannot reach the API gateway (check VITE_API_BASE in .env and that the gateway is running).'
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

  /** Load a past session's history from the DB and restore it as the active session.
   *  Returns the ModelOption that was used for this session.
   *  Priority: localStorage map → backend hint (modelName/platform) → null. */
  const loadSession = async (
    sid: string,
    backendHint?: { modelName?: string; platform?: string },
  ): Promise<ModelOption | null> => {
    if (isStreaming) return null;
    try {
      const history = await getChatHistory(sid);
      const msgs: Message[] = history.map((m) => ({
        role: m.role,
        content: m.content,
        thinking: m.thinking ?? undefined,
      }));
      abortRef.current = null;
      rawRef.current = '';
      prevRoutingRef.current = 'local';
      setMessages(msgs);
      setSessionId(sid);

      const stored = getSessionModel(sid);
      if (stored) return stored;

      // Fall back to fields returned by the backend
      if (backendHint?.modelName) {
        const local = LOCAL_MODELS.find((m) => m.name === backendHint.modelName);
        if (local) return local;
        // API model — reconstruct a minimal ModelOption so routing works
        return {
          id: sid,
          name: backendHint.modelName,
          platform: backendHint.platform ?? 'Custom',
          isLocal: false,
        };
      }

      return null;
    } catch (err) {
      console.error('[useChat] Failed to load session:', err);
      return null;
    }
  };

  /**
   * Re-generate the assistant message at targetIdx.
   * The old response is saved as variant[0]; new response streams in as variant[1+].
   * Everything after targetIdx is discarded (same branch behaviour as ChatGPT).
   */
  const regenerate = async (
    targetIdx: number,
    thinking = false,
    model: ModelOption = LOCAL_MODELS[0],
    ragMode = true,
  ) => {
    if (isStreaming) return;
    const userMsg = messages[targetIdx - 1];
    if (!userMsg || userMsg.role !== 'user') return;

    const existingMsg = messages[targetIdx];
    // Collect all prior variants + current content as the 0th variant
    const prevVariants: AssistantVariant[] = existingMsg.variants?.length
      ? [...existingMsg.variants]
      : [{ content: existingMsg.content, thinking: existingMsg.thinking }];
    const newVariantIdx = prevVariants.length;

    rawRef.current = '';
    setMessages((prev) => [
      ...prev.slice(0, targetIdx),
      { role: 'assistant', content: '', status: 'connecting', variants: prevVariants, activeVariantIdx: newVariantIdx },
    ]);
    setIsStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      let firstToken = true;
      const consumeEvent = (event: { type: string; data: string }) => {
        if (firstToken && (event.type === 'thinking' || event.type === 'message')) {
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last?.role === 'assistant') return [...prev.slice(0, -1), { ...last, status: 'streaming' }];
            return prev;
          });
          firstToken = false;
        }
        switch (event.type) {
          case 'thinking': appendThinkingToken(event.data); break;
          case 'message':  appendToken(event.data); break;
          case 'error':    setLastAssistantError(friendlyError(event.data)); break;
        }
      };

      if (model.isLocal) {
        const payload = { sessionId, message: userMsg.content, thinking, model: model.name, useRag: ragMode };
        const { sessionId: newSid } = await postChatMessage(payload, controller.signal);
        setSessionId(newSid);
        for await (const event of streamChatSession(newSid, controller.signal)) {
          consumeEvent(event);
          if (event.type === 'done' || event.type === 'error') break;
        }
      } else {
        const baseUrl = model.baseUrl?.trim() ?? '';
        const apiKey  = model.apiKey?.trim() ?? '';
        const keyOptional = model.platform === 'Ollama' || isOllamaOpenAICompatUrl(baseUrl);
        if (!baseUrl) { setLastAssistantError('This model is missing a base URL. Add it in Settings → Model.'); return; }
        if (!apiKey && !keyOptional) { setLastAssistantError('This model is missing an API key. Add it in Settings → Model.'); return; }

        // Route through main-server to enable RAG support for API models
        const payload = {
          sessionId,
          message: userMsg.content,
          thinking,
          model: model.name,
          platform: model.platform,
          baseUrl,
          apiKey,
          useRag: ragMode,
        };
        const { sessionId: newSid } = await postChatMessage(payload, controller.signal);
        setSessionId(newSid);
        for await (const event of streamChatSession(newSid, controller.signal)) {
          consumeEvent(event);
          if (event.type === 'done' || event.type === 'error') break;
        }
      }

      // Finalize: append the freshly-streamed content as a new variant
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role !== 'assistant') return prev;
        const newVariants = [...prevVariants, { content: last.content, thinking: last.thinking }];
        return [...prev.slice(0, -1), { ...last, variants: newVariants, activeVariantIdx: newVariantIdx, status: undefined }];
      });
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setLastAssistantError(friendlyError(err instanceof Error ? err.message : String(err)));
    } finally {
      abortRef.current = null;
      setIsStreaming(false);
    }
  };

  /** Switch which variant is displayed for an assistant message. */
  const setVariant = (msgIdx: number, variantIdx: number) => {
    setMessages((prev) => {
      const msg = prev[msgIdx];
      if (!msg?.variants || variantIdx < 0 || variantIdx >= msg.variants.length) return prev;
      const v = msg.variants[variantIdx];
      return [
        ...prev.slice(0, msgIdx),
        { ...msg, content: v.content, thinking: v.thinking, activeVariantIdx: variantIdx },
        ...prev.slice(msgIdx + 1),
      ];
    });
  };

  /**
   * Prepare to edit a user message:
   * truncates the messages array up to (not including) targetIdx and returns the message text.
   * The caller should put the returned text into the input box.
   */
  const prepareEdit = (targetIdx: number): string => {
    if (isStreaming) return '';
    const text = messages[targetIdx]?.content ?? '';
    setMessages((prev) => prev.slice(0, targetIdx));
    setSessionId(null);
    prevRoutingRef.current = null;
    return text;
  };

  return { messages, isStreaming, send, regenerate, setVariant, prepareEdit, clear, stop, loadSession, sessionId };
}
