// Sapling Service Worker — Mindful Offline & Shell Caching
const CACHE_NAME = 'sapling-groove-v2';

const STATIC_PRECACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_PRECACHE);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Bypass service worker for non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Strictly bypass all cross-origin requests unless they are Google Fonts
  // This guarantees OAuth (apis.google.com, accounts.google.com, *.firebaseapp.com)
  // and cloud APIs are handled natively by the browser network stack without SW interception.
  const isSameOrigin = url.origin === self.location.origin;
  const isGoogleFont = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';

  if (!isSameOrigin && !isGoogleFont) {
    return;
  }

  // Bypass local API routes
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // Navigation requests: Network-first, fallback to precached /index.html
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(CACHE_NAME);
        const cachedIndex = await cache.match('/index.html') || await cache.match('/');
        if (cachedIndex) return cachedIndex;
        return new Response('Offline — Sapling requires initial connection', {
          status: 503,
          headers: { 'Content-Type': 'text/plain' }
        });
      })
    );
    return;
  }

  // Static assets (CSS, JS, Fonts, Images): Stale-While-Revalidate
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && (networkResponse.type === 'basic' || networkResponse.type === 'cors')) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          if (cachedResponse) return cachedResponse;
          return new Response('Asset temporarily unavailable offline', {
            status: 503,
            headers: { 'Content-Type': 'text/plain' }
          });
        });

      return cachedResponse || fetchPromise;
    })
  );
});
