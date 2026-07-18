const CACHE_VERSION = 'dx-v1.1.2';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const DATA_CACHE = `${CACHE_VERSION}-data`;

const APP_SHELL = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/api.js',
  '/store.js',
  '/render.js',
  '/charts.js',
  '/icons.js',
  '/config.js',
  '/dialog.js',
  '/manifest.json',
  '/official-cache.json',
  '/assets/logo.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable.png',
  '/fonts.css'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(STATIC_CACHE).then(cache => cache.addAll(APP_SHELL))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.map(key => {
        if (key !== STATIC_CACHE && key !== DATA_CACHE) {
          return caches.delete(key);
        }
      })
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // 1. API -> Network First with 8s timeout, then Cache
  if (url.hostname === 'api.frankfurter.dev') {
    event.respondWith(
      new Promise((resolve) => {
        let isResolved = false;
        const timeoutId = setTimeout(() => {
          if (!isResolved) {
            isResolved = true;
            resolve(caches.match(event.request)); // Fallback after 8s
          }
        }, 8000);

        fetch(event.request).then(response => {
          if (!isResolved) {
            isResolved = true;
            clearTimeout(timeoutId);
            const resClone = response.clone();
            caches.open(DATA_CACHE).then(cache => cache.put(event.request, resClone));
            resolve(response);
          }
        }).catch(() => {
          if (!isResolved) {
            isResolved = true;
            clearTimeout(timeoutId);
            resolve(caches.match(event.request)); // Network error fallback
          }
        });
      })
    );
    return;
  }

  // 2. parallel.json -> Stale-while-revalidate
  if (url.pathname.endsWith('parallel.json')) {
    event.respondWith(
      caches.match(event.request).then(cachedResponse => {
        const fetchPromise = fetch(event.request).then(networkResponse => {
          caches.open(DATA_CACHE).then(cache => cache.put(event.request, networkResponse.clone()));
          return networkResponse;
        }).catch(() => cachedResponse);
        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // 3. App Shell (js, css, html, fonts, icons) -> Cache First
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request).then(netRes => {
        // Cache new assets dynamically
        if (netRes && netRes.ok && (url.protocol === 'http:' || url.protocol === 'https:')) {
          const clone = netRes.clone();
          caches.open(STATIC_CACHE).then(cache => cache.put(event.request, clone));
        }
        return netRes;
      });
    })
  );
});
