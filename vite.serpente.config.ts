import { defineConfig, type Plugin } from 'vite';

/**
 * A Serpente como aplicação só dela: `serpente.html` passa a ser a página de
 * entrada e sai como `index.html`, que é o que o Capacitor carrega no arranque.
 */
function paginaDeEntrada(): Plugin {
  return {
    name: 'serpente-pagina-de-entrada',
    enforce: 'post',
    generateBundle(_opcoes, pacote) {
      const html = pacote['serpente.html'];
      if (!html) throw new Error('serpente.html não saiu do build');
      delete pacote['serpente.html'];
      html.fileName = 'index.html';
      pacote['index.html'] = html;
    },
  };
}

export default defineConfig({
  base: './',
  // Sem `public/`: aquela pasta é do Hollow Star (manifesto, service worker e
  // ícones dele) e não tem nada que fazer dentro da aplicação da Serpente.
  publicDir: false,
  build: {
    target: 'es2022',
    outDir: 'serpente-app/www',
    assetsDir: 'assets',
    emptyOutDir: true,
    rollupOptions: { input: { serpente: 'serpente.html' } },
  },
  plugins: [paginaDeEntrada()],
});
