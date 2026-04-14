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

/** Ollama tags from `ollama list` (chat models). Embedding models (e.g. nomic-embed-text) are omitted. */
export const LOCAL_MODELS: ModelOption[] = [
  { id: 'qwen3-vl:4b', name: 'qwen3-vl:4b', platform: 'Ollama', isLocal: true },
  { id: 'exaone3.5:2.4b', name: 'exaone3.5:2.4b', platform: 'Ollama', isLocal: true },
];

export interface AssistantVariant {
  content: string;
  thinking?: string;
}

/** Pending row in the composer before send (images hold base64 for Ollama vision). */
export interface PendingChatAttachment {
  id: string;
  kind: 'image' | 'file';
  name: string;
  /** While reading file bytes — UI shows skeleton; send is disabled. */
  status?: 'loading' | 'ready';
  /** `URL.createObjectURL` — revoke after send or remove */
  previewUrl?: string;
  /** Raw base64 (no data-URL prefix) for `images` on POST */
  base64?: string;
  /** UTF-8 text for small text files */
  text?: string;
}

/** Shown on sent user bubbles (no base64). */
export interface UserAttachmentDisplay {
  id: string;
  kind: 'image' | 'file';
  name: string;
  previewUrl?: string;
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
  /** Images / file chips for user messages */
  attachments?: UserAttachmentDisplay[];
}

const MAX_VISION_IMAGES = 6;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_TEXT_FILE_BYTES = 400 * 1024;

/** macOS / Electron often leave `file.type` empty; use extension so images aren't misread as text (400KB cap). */
const IMAGE_NAME_EXT = /\.(png|jpe?g|gif|webp|bmp|svg|ico|heic|heif|avif|tiff?)$/i;

/**
 * Electron sets {@code File.path} (absolute path) while {@code file.name} can be empty or unhelpful.
 * Always derive a display basename for extension checks and UI labels.
 */
export function getFileBasename(file: File): string {
  if (file.path && typeof file.path === 'string') {
    const seg = file.path.split(/[/\\]/).filter(Boolean);
    if (seg.length) return seg[seg.length - 1]!;
  }
  return file.name || 'file';
}

export function isProbablyImageFile(file: File): boolean {
  if (file.type.startsWith('image/')) return true;
  return IMAGE_NAME_EXT.test(getFileBasename(file));
}

export { MAX_IMAGE_BYTES, MAX_TEXT_FILE_BYTES, MAX_VISION_IMAGES };

function fileBlock(name: string, body: string): string {
  return `\n\n--- file: ${name} ---\n${body}`;
}

/** Strip appended file blocks for the edit box (full `content` is still stored for the API). */
export function stripFileBlocksForEdit(content: string): string {
  return content.replace(/\n\n--- file:[^\n]+---\n[\s\S]*?(?=\n\n--- file:|$)/g, '').trim();
}

function revokeAttachmentUrls(msgs: Message[]) {
  for (const m of msgs) {
    m.attachments?.forEach((a) => {
      if (a.previewUrl) URL.revokeObjectURL(a.previewUrl);
    });
  }
}

function buildOutgoing(
  caption: string,
  pending: PendingChatAttachment[] | undefined,
  model: ModelOption,
): { message: string; images?: string[] } {
  const cap = caption.trim();
  const parts: string[] = [];
  if (cap) parts.push(cap);
  for (const p of pending ?? []) {
    if (p.status === 'loading') continue;
    if (p.kind === 'file' && p.text) parts.push(fileBlock(p.name, p.text));
  }
  let message = parts.join('');
  const imageB64: string[] = [];
  if (model.isLocal) {
    for (const p of pending ?? []) {
      if (p.status === 'loading') continue;
      if (p.kind === 'image' && p.base64) imageB64.push(p.base64);
    }
  }
  const visionImages = model.isLocal ? imageB64.slice(0, MAX_VISION_IMAGES) : [];
  if (!model.isLocal && pending?.some((p) => p.kind === 'image' && p.status !== 'loading')) {
    const n = pending.filter((p) => p.kind === 'image' && p.status !== 'loading').length;
    message += `\n\n[${n} image(s) were attached — use a local vision model (e.g. qwen3-vl) to analyze images.]`;
  }
  if (!message.trim() && visionImages.length) message = '(see attached image(s))';
  return {
    message: message.trim(),
    images: visionImages.length ? visionImages : undefined,
  };
}

/** Read one file into a pending attachment (caller supplies stable `id` for loading placeholders). */
export async function readSingleFileAsAttachment(
  file: File,
  id: string,
): Promise<{ attachment: PendingChatAttachment } | { error: string }> {
  if (isProbablyImageFile(file)) {
    if (file.size > MAX_IMAGE_BYTES) {
      return { error: `${getFileBasename(file)}: image too large (max ${MAX_IMAGE_BYTES / 1024 / 1024}MB)` };
    }
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = () => reject(r.error);
      r.readAsDataURL(file);
    });
    const comma = dataUrl.indexOf(',');
    const base64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
    const displayName = getFileBasename(file);
    return {
      attachment: {
        id,
        kind: 'image',
        name: displayName,
        status: 'ready',
        previewUrl: URL.createObjectURL(file),
        base64,
      },
    };
  }
  const displayName = getFileBasename(file);
  if (file.size > MAX_TEXT_FILE_BYTES) {
    return { error: `${displayName}: file too large (max ${MAX_TEXT_FILE_BYTES / 1024}KB)` };
  }
  try {
    const text = await file.text();
    return { attachment: { id, kind: 'file', name: displayName, status: 'ready', text } };
  } catch {
    return { error: `${displayName}: could not read as text` };
  }
}

/** Read browser File list into pending attachments (images → base64 + preview URL; text files → UTF-8). */
export async function readFilesAsAttachments(files: File[]): Promise<{ attachments: PendingChatAttachment[]; errors: string[] }> {
  const attachments: PendingChatAttachment[] = [];
  const errors: string[] = [];
  for (const file of Array.from(files)) {
    const id = crypto.randomUUID();
    const r = await readSingleFileAsAttachment(file, id);
    if ('error' in r) errors.push(r.error);
    else attachments.push(r.attachment);
  }
  return { attachments, errors };
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

  const send = async (
    text: string,
    thinking = false,
    model: ModelOption = LOCAL_MODELS[0],
    ragMode = true,
    pending?: PendingChatAttachment[],
  ) => {
    if (isStreaming) return;
    const built = buildOutgoing(text, pending, model);
    if (!built.message && !built.images?.length) return;

    const uiAttachments: UserAttachmentDisplay[] | undefined =
      pending && pending.length > 0
        ? pending
            .filter((p) => p.status !== 'loading')
            .map((p) => ({
              id: p.id,
              kind: p.kind,
              name: p.name,
              previewUrl: p.kind === 'image' ? p.previewUrl : undefined,
            }))
        : undefined;

    rawRef.current = '';
    setMessages((prev) => [
      ...prev,
      { role: 'user', content: built.message, attachments: uiAttachments },
    ]);
    setMessages((prev) => [...prev, { role: 'assistant', content: '', status: 'connecting' }]);
    setIsStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      let effectiveSessionId = sessionId;
      if (model.isLocal) {
        if (prevRoutingRef.current === 'api' && sessionId) {
          effectiveSessionId = null;
          setSessionId(null);
        }
        prevRoutingRef.current = 'local';
      } else {
        if (prevRoutingRef.current === 'local' && sessionId) setSessionId(null);
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
        const payload: Parameters<typeof postChatMessage>[0] = {
          sessionId: effectiveSessionId,
          message: built.message,
          thinking,
          model: model.name,
          useRag: ragMode,
        };
        if (built.images?.length) payload.images = built.images;
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

        const payload = {
          sessionId: effectiveSessionId,
          message: built.message,
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
            ? 'Cannot reach the API gateway (check src/config/serverProfile.ts or VITE_API_BASE in .env and that the gateway is running).'
            : friendlyError(raw);
        if (last?.role === 'assistant') {
          return [...prev.slice(0, -1), { ...last, content: errMsg, error: true }];
        }
        return [...prev, { role: 'assistant', content: errMsg, error: true }];
      });
    } finally {
      pending?.forEach((p) => {
        if (p.previewUrl) URL.revokeObjectURL(p.previewUrl);
      });
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
    setMessages((prev) => {
      revokeAttachmentUrls(prev);
      return [];
    });
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
    let caption = '';
    setMessages((prev) => {
      const removed = prev.slice(targetIdx);
      revokeAttachmentUrls(removed);
      caption = stripFileBlocksForEdit(prev[targetIdx]?.content ?? '');
      return prev.slice(0, targetIdx);
    });
    prevRoutingRef.current = null;
    return caption;
  };

  return { messages, isStreaming, send, regenerate, setVariant, prepareEdit, clear, stop, loadSession, sessionId };
}
