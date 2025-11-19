import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/v2/atlas': {
        target: 'http://127.0.0.1:8686',
        changeOrigin: true,
      },
    },
  },
  define: {
    global: 'globalThis',
  },
});
