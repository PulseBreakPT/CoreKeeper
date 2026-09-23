import { defineConfig, loadEnv } from 'vite';

// The preview opens the game actively developed on this branch. Original game
// entrypoints and the isolated Android build remain available and unchanged.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  if (!env.APP_HOST || !env.APP_PORT || !env.APP_URL) throw new Error('Preview configuration missing');
  return {
    server: { host: env.APP_HOST, port: Number(env.APP_PORT), strictPort: true, allowedHosts: [new URL(env.APP_URL).hostname, env.APP_PREVIEW_HOST].filter(Boolean) },
    plugins: [{ name: 'nexus-word-preview', configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        if (req.url === '/' || req.url?.startsWith('/?')) req.url = '/palavras.html' + req.url.slice(1);
        next();
      });
    } }],
  };
});