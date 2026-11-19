const SHELL_CACHE = 'tankapp-shell-v2';
const ASSET_CACHE = 'tankapp-assets-v2';
const VALID_CACHES = new Set([SHELL_CACHE, ASSET_CACHE]);
const MAX_ASSET_CACHE_ENTRIES = 40;

const SHELL_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/apple-touch-icon.png',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-512-maskable.png',
  '/icon-192.svg',
];

async function putBoundedAsset(request, response) {
  const cache = await caches.open(ASSET_CACHE);
  await cache.put(request, response);
  const keys = await cache.keys();
  if (keys.length > MAX_ASSET_CACHE_ENTRIES) {
    const excess = keys.slice(0, keys.length - MAX_ASSET_CACHE_ENTRIES);
    await Promise.all(excess.map((key) => cache.delete(key)));
  }
}

function isCacheableAssetResponse(response) {
  if (!response.ok || response.type !== 'basic') return false;
  const contentType = response.headers.get('content-type') || '';
  return !contentType.toLowerCase().includes('text/html');
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => !VALID_CACHES.has(key)).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow('/');
      }
      return undefined;
    })
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;

  // Navigation requests: Network-first with safe offline fallback to cached shell
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok && response.type === 'basic') {
            const copy = response.clone();
            event.waitUntil(
              caches
                .open(SHELL_CACHE)
                .then((cache) => cache.put('/index.html', copy))
                .catch(() => undefined)
            );
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match('/index.html');
          if (cached) return cached;
          return new Response('TankApp ist aktuell offline. Bitte Verbindung prüfen.', {
            status: 503,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
          });
        })
    );
    return;
  }

  // Hashed Vite assets: Cache-first in bounded ASSET_CACHE (never cache SPA HTML fallbacks)
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (isCacheableAssetResponse(response)) {
            const copy = response.clone();
            event.waitUntil(putBoundedAsset(request, copy).catch(() => undefined));
          }
          return response;
        });
      })
    );
    return;
  }

  // Static shell icons / manifest: Cache-first with background refresh
  if (SHELL_ASSETS.includes(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const networkFetch = fetch(request)
          .then((response) => {
            if (isCacheableAssetResponse(response)) {
              const copy = response.clone();
              event.waitUntil(
                caches
                  .open(SHELL_CACHE)
                  .then((cache) => cache.put(request, copy))
                  .catch(() => undefined)
              );
            }
            return response;
          })
          .catch(() => cached);

        if (cached) {
          event.waitUntil(networkFetch.catch(() => undefined));
          return cached;
        }
        return networkFetch;
      })
    );
  }
});
