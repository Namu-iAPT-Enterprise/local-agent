import { defineConfig } from 'vite';

// https://vitejs.dev/config
export default defineConfig({
  server: {
    host: '0.0.0.0', // listen on all interfaces so phones on LAN can connect
    port: 5173,
  },
});
