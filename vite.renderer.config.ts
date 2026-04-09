import path from 'node:path';
import { defineConfig } from 'vite';

// https://vitejs.dev/config
export default defineConfig({
  // Ensure `.env` is loaded from project root (same place as `VITE_API_BASE`).
  envDir: path.resolve(__dirname),
  server: {
    host: '0.0.0.0', // listen on all interfaces so phones on LAN can connect
    port: 5173,
  },
});
