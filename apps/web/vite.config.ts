import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const apiTarget = process.env.BEHAVIOR_API_URL ?? 'http://127.0.0.1:8787';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: { '/api': apiTarget },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // Fontes são servidas como arquivos próprios (self), sem data: URI, para respeitar a CSP.
    assetsInlineLimit: 0,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['test/**/*.test.{ts,tsx}'],
  },
});
