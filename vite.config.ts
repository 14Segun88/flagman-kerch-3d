import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    proxy: {
      '/editor-app': {
        target: 'http://127.0.0.1:3002',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/editor-app/, ''),
        ws: true
      },
      '/_next': {
        target: 'http://127.0.0.1:3002',
        changeOrigin: true
      },
      '/api': {
        target: 'http://127.0.0.1:3002',
        changeOrigin: true
      },
      '/icons': {
        target: 'http://127.0.0.1:3002',
        changeOrigin: true
      }
    }
  }
});
