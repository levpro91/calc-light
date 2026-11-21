const CACHE_NAME = 'calc-osveschenie-v14';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-512.png'
];

// Установка: заранее сохраняем оболочку приложения для работы офлайн.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

// Активация новой версии: удаляем устаревшие кэши и сразу берём страницы под контроль.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Не перехватываем POST и запросы к сторонним доменам.
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  // HTML всегда сначала проверяем в сети, чтобы пользователи получали свежую версию.
  // Если сети нет, используем сохранённую копию.
  if (request.mode === 'navigate' || url.pathname.endsWith('/index.html') || url.pathname.endsWith('/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          return cached || caches.match('./index.html');
        })
    );
    return;
  }

  // Для ресурсов приложения: кэш сначала, сеть — если файла ещё нет в кэше.
  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request).then((response) => {
      if (response && response.ok) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
      }
      return response;
    }))
  );
});
