/// <reference types="vite/client" />

/** Electron/Chromium may expose the real path on disk (used for basename when `name` is empty). */
interface File {
  path?: string;
}

interface ImportMetaEnv {
  /**
   * Public API base (gateway or main-server). Paths: `/api/chat/*`, `/rag/*`, etc.
   * Do not set raw RAG `…:8082` here unless you intentionally skip main-server.
   */
  readonly VITE_API_BASE?: string;
  /** Optional override for `/rag/*` when the gateway proxies `/api` but not `/rag` (defaults to `VITE_API_BASE`). */
  readonly VITE_RAG_BASE?: string;
  /**
   * Base URL for the HWPX converter (POST /convert). In dev, Vite proxies `/hwpx-converter` to :8789 when unset.
   */
  readonly VITE_HWPX_CONVERTER_URL?: string;
}

interface Window {
  electronAPI?: {
    getLocalIP: () => Promise<string>;
    openFileDialog: () => Promise<{ canceled: boolean; filePaths: string[] }>;
    readFile: (filePath: string) => Promise<{ success: boolean; content?: string; error?: string }>;
    /** NDJSON line for `.cursor/debug-acc65e.log` (main process append). */
    debugSessionLog?: (line: string) => Promise<void>;
  };
}
