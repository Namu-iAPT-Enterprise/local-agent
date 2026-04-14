/// <reference types="vite/client" />

import { getDefaultApiBase, getDefaultRagBase } from './serverProfile';

/**
 * Single public API base for the browser (no trailing slash).
 *
 * Expected flow: **frontend → gateway or main-server → main-server → RAG** (`ragserver.base-url`, e.g. `http://192.168.0.34:8082`).
 *
 * - Use **`VITE_API_BASE`** = your gateway (e.g. `:8080`) or main-server HTTP API (e.g. `:8081`) for `/api/chat/*`, `/api/auth/*`, etc.
 * - If the gateway does **not** forward **`/rag/*`** to main-server, set **`VITE_RAG_BASE`** to the main-server URL so Knowledge ingest and `/rag` calls from the browser work.
 * - **Do not** point the frontend at raw RAG **`…:8082`** unless you intentionally bypass main-server; upstream RAG is configured in main-server (`ragserver.base-url`), not here.
 * - **`192.168.0.6:8082` is not a valid substitute** for the gateway (`:8080`); different host/port roles.
 *
 * Defaults come from **`src/config/serverProfile.ts`** (`ACTIVE_SERVER_PROFILE`). Set `VITE_API_BASE` / `VITE_RAG_BASE` in `.env` to override. Restart dev server after changes.
 */
const raw =
  (import.meta.env.VITE_API_BASE as string | undefined)?.trim() ||
  getDefaultApiBase();

export const API_BASE = raw.replace(/\/$/, '');

const rawRag =
  (import.meta.env.VITE_RAG_BASE as string | undefined)?.trim() ||
  (import.meta.env.VITE_API_BASE as string | undefined)?.trim() ||
  getDefaultRagBase();

/** Base for browser-facing `/rag/*` (ingest, query). Defaults to `API_BASE` when `VITE_RAG_BASE` is unset. */
export const RAG_BASE = rawRag.replace(/\/$/, '');

export const RAG_INGEST_URL = `${RAG_BASE}/rag/ingest`;
export const RAG_INGEST_BATCH_URL = `${RAG_BASE}/rag/ingest/batch`;
/** Chunked plain-text upload; metadata JSON in the X-Ingest-Metadata header. */
export const RAG_INGEST_STREAM_URL = `${RAG_BASE}/rag/ingest/stream`;

export function ragQueryUrl(q: string): string {
  return `${RAG_BASE}/rag/query?q=${encodeURIComponent(q)}`;
}
