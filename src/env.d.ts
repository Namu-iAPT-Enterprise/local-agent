/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Public API base (gateway or main-server). Paths: `/api/chat/*`, `/rag/*`, etc.
   * Do not set raw RAG `…:8082` here unless you intentionally skip main-server.
   */
  readonly VITE_API_BASE?: string;
  /** Optional override for `/rag/*` when the gateway proxies `/api` but not `/rag` (defaults to `VITE_API_BASE`). */
  readonly VITE_RAG_BASE?: string;
}

interface Window {
  electronAPI: {
    getLocalIP: () => Promise<string>;
    openFileDialog: () => Promise<{ canceled: boolean; filePaths: string[] }>;
    readFile: (filePath: string) => Promise<{ success: boolean; content?: string; error?: string }>;
  };
}
