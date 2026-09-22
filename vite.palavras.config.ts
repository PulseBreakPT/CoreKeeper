import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  base: './',
  publicDir: false,
  build: {
    outDir: 'palavras-app/www',
    emptyOutDir: true,
    rollupOptions: { input: resolve(__dirname, 'palavras.html') },
  },
});
