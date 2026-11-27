
const CACHE_NAME = 'calc-osveschenie-v26';

const APP_SHELL = [
  './',
  './index.html',
  './calc-light-refresh.css',
  './manifest.json',
  './icon-512.png'
];

// Установка новой версии
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

// Удаление старых кэшей
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) =>
          key.startsWith('calc-osveschenie-') &&
          key !== CACHE_NAME
        ).map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (
    request.method !== 'GET' ||
    url.origin !== self.location.origin
  ) return;

  const isHTML =
    request.mode === 'navigate' ||
    url.pathname.endsWith('/index.html') ||
    url.pathname.endsWith('/');

  const isCSS = url.pathname.endsWith('.css');

  // HTML и CSS: сначала сеть, затем кэш
  if (isHTML || isCSS) {
    event.respondWith(
      fetch(request)
        .then(async (response) => {
          if (response && response.ok) {
            const cache = await caches.open(CACHE_NAME);
            await cache.put(request, response.clone());
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          if (isHTML) return caches.match('./index.html');
          return Response.error();
        })
    );
    return;
  }

  // Остальные ресурсы: сначала кэш
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;

      return fetch(request).then(async (response) => {
        if (response && response.ok) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(request, response.clone());
        }
        return response;
      });
    })
  );
});
