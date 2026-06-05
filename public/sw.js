// Overlook PWA Service Worker
// Simple cache-first / stale-while-revalidate for app shell (index, css, js, svg, sample csv)
// Enables offline viewing of last data (localStorage + cached static shell + sample)
// Works for GitHub Pages static deploy (relative paths + runtime caching for hashed assets)

const CACHE_NAME = 'overlook-pwa-v1';
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './favicon.svg',
  './sample-data.csv',
  './icons.svg'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        // Non-fatal in some envs (dev server etc)
        console.warn('[SW] Precaching skipped some assets:', err);
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Only handle GET
  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);
  const isSameOrigin = url.origin === self.location.origin;

  // Determine if this is a key app shell asset (cache-first + runtime populate)
  const dest = request.destination;
  const isShellAsset =
    dest === 'document' ||
    dest === 'script' ||
    dest === 'style' ||
    dest === 'image' ||
    request.url.endsWith('.csv') ||
    request.url.includes('/assets/') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.json') ||
    url.pathname.endsWith('.csv');

  if (!isSameOrigin || !isShellAsset) {
    // For cross-origin or non-shell: network-first with cache fallback (e.g. fonts, etc.)
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Optionally cache opaque or basic responses
          if (response && response.status === 200 && (response.type === 'basic' || response.type === 'opaque')) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Cache-first for app shell, with network fallback + populate cache (stale-while-revalidate-ish)
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        // Return cached immediately; optionally revalidate in background
        fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, networkResponse.clone());
              });
            }
          })
          .catch(() => {});
        return cached;
      }

      // No cache: fetch, cache, return
      return fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Offline fallback for documents -> cached index.html (app shell)
          if (dest === 'document' || request.url.endsWith('.html') || url.pathname === '/' || url.pathname === '') {
            return caches.match('./index.html')
              .then((fallback) => fallback || caches.match('/index.html') || caches.match('index.html'))
              .then((fb) => fb || new Response('<!doctype html><title>Offline</title><h1>Overlook 离线</h1><p>请连接网络后重试或使用已缓存数据。</p>', { headers: { 'Content-Type': 'text/html' } }));
          }
          return new Response('Offline', { status: 503, statusText: 'Offline' });
        });
    })
  );
});

// Optional: message handler for future skipWaiting etc from client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
