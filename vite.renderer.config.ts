import path from 'node:path';
import { defineConfig } from 'vite';

// https://vitejs.dev/config
export default defineConfig({
  // Ensure `.env` is loaded from project root (same place as `VITE_API_BASE`).
  envDir: path.resolve(__dirname),
  server: {
    host: '0.0.0.0', // listen on all interfaces so phones on LAN can connect
    port: 5173,
    // Allow Host: <LAN-IP> (e.g. 192.168.0.34) — without this, Vite may block the dev server on non-localhost URLs.
    allowedHosts: true,
    // Fewer duplicate change events on macOS (editor atomic save → multiple fs events → Vite spam reload)
    watch: {
      awaitWriteFinish: {
        stabilityThreshold: 150,
        pollInterval: 50,
      },
    },
    // HWPX: dev calls `http://<host>:8789/convert` directly (see markdownToHwpx.ts). Optional proxy if needed:
    // proxy: { '/hwpx-converter': { target: 'http://127.0.0.1:8789', changeOrigin: true, rewrite: (p) => p.replace(/^\/hwpx-converter/, '') || '/' } },
    //
    // Ollama proxy: browser fetches /ollama-proxy/* → Vite forwards to 127.0.0.1:11434
    // This avoids CORS when the browser accesses the app from a LAN IP (e.g. 192.168.0.34:5173)
    // instead of localhost — browser-side fetch to 127.0.0.1 would hit the wrong machine.
    proxy: {
      '/ollama-proxy': {
        target: 'http://127.0.0.1:11434',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/ollama-proxy/, ''),
      },
    },
  },
});
