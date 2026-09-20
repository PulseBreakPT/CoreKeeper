import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
    outDir: 'dist',
    assetsDir: 'assets',
    // Duas páginas: o jogo principal em index.html e a Serpente em serpente.html.
    rollupOptions: { input: { principal: 'index.html', serpente: 'serpente.html' } },
  },
  server: { host: true, port: 5173 },
});
