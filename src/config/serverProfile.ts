/**
 * Single place to switch between local and remote stacks (host + ports).
 *
 * The app talks to the API gateway / main-server over HTTP only. Postgres and Chroma
 * ports are listed here as the usual backend defaults so you can align docker-compose
 * or server config without hunting through the repo.
 *
 * `VITE_API_BASE` / `VITE_RAG_BASE` in `.env` still override these when set (see apiBase.ts).
 */

export type ServerProfileId = 'local' | 'remote';

/** Flip this to switch every derived URL below. */
export const ACTIVE_SERVER_PROFILE: ServerProfileId = 'local';

type Stack = {
  /** Host for gateway + RAG HTTP bases (browser-facing). */
  host: string;
  /**
   * Host for Ollama OpenAI-compat API. Often `127.0.0.1` even when `host` is a
   * remote gateway (local GPU vs remote API).
   */
  ollamaHost: string;
  /** Gateway or unified API (e.g. VITE_API_BASE default). */
  gatewayPort: number;
  /**
   * HTTP port for `/rag/*` when it is not served on the same port as the gateway
   * (set equal to `gatewayPort` if one process handles both).
   */
  ragPort: number;
  /** Typical Postgres port (reference; backend connects, not the SPA). */
  databasePort: number;
  /** Typical Chroma server port (reference; backend/RAG connects, not the SPA). */
  chromaPort: number;
  /** Ollama OpenAI-compatible API (`/v1`). */
  ollamaPort: number;
  /** Settings → Remote: LAN WebUI host shown in the UI. */
  webUiLanHost: string;
  /** Settings → Remote: WebUI port. */
  webUiPort: number;
};

const profiles: Record<ServerProfileId, Stack> = {
  local: {
    host: '127.0.0.1',
    ollamaHost: '127.0.0.1',
    gatewayPort: 8080,
    ragPort: 8080,
    databasePort: 5432,
    chromaPort: 8000,
    ollamaPort: 11434,
    webUiLanHost: '127.0.0.1',
    webUiPort: 25808,
  },
  remote: {
    host: '192.168.0.10',
    ollamaHost: '127.0.0.1',
    gatewayPort: 8080,
    ragPort: 8081,
    databasePort: 5432,
    chromaPort: 8000,
    ollamaPort: 11434,
    webUiLanHost: '192.168.0.3',
    webUiPort: 25808,
  },
};

export function getActiveServerStack(): Readonly<Stack> {
  return profiles[ACTIVE_SERVER_PROFILE];
}

function httpBase(host: string, port: number): string {
  return `http://${host}:${port}`.replace(/\/$/, '');
}

/** Default `VITE_API_BASE` when env is unset. */
export function getDefaultApiBase(): string {
  const p = getActiveServerStack();
  return httpBase(p.host, p.gatewayPort);
}

/** Default base for `/rag/*` when `VITE_RAG_BASE` is unset. */
export function getDefaultRagBase(): string {
  const p = getActiveServerStack();
  if (p.ragPort === p.gatewayPort) {
    return getDefaultApiBase();
  }
  return httpBase(p.host, p.ragPort);
}

/** Ollama default in Settings → Model (OpenAI-compatible path). */
export function getOllamaOpenAiBaseUrl(): string {
  const p = getActiveServerStack();
  return `${httpBase(p.ollamaHost, p.ollamaPort)}/v1`;
}
