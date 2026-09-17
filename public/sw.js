/* Service worker: guarda o jogo em cache para se poder jogar offline. */

const CACHE = 'nucleo-perdido-v1';
const ESSENCIAIS = ['./', './index.html', './manifest.webmanifest', './icon.svg', './icon-192.png', './icon-512.png'];

self.addEventListener('install', (evento) => {
  evento.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ESSENCIAIS)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((chaves) => Promise.all(chaves.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (evento) => {
  const pedido = evento.request;
  if (pedido.method !== 'GET' || new URL(pedido.url).origin !== self.location.origin) return;

  // Navegação: tenta a rede primeiro para apanhar versões novas, com a cache como rede de segurança.
  if (pedido.mode === 'navigate') {
    evento.respondWith(
      fetch(pedido)
        .then((resposta) => {
          const copia = resposta.clone();
          caches.open(CACHE).then((cache) => cache.put(pedido, copia));
          return resposta;
        })
        .catch(() => caches.match(pedido).then((r) => r ?? caches.match('./index.html'))),
    );
    return;
  }

  // Recursos com hash no nome: a cache serve primeiro.
  evento.respondWith(
    caches.match(pedido).then((emCache) => {
      if (emCache) return emCache;
      return fetch(pedido).then((resposta) => {
        if (resposta.ok) {
          const copia = resposta.clone();
          caches.open(CACHE).then((cache) => cache.put(pedido, copia));
        }
        return resposta;
      });
    }),
  );
});
