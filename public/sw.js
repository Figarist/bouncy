// The build id and bundle asset placeholders below are filled in by the sw-manifest plugin in vite.config.js.
const CACHE_NAME = 'tyhyi-klas-__BUILD_ID__';
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon.svg',
  './icon-192.png',
  './icon-512.png',
  '__BUNDLE_ASSETS__',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(async (keys) => {
      const old = keys.filter((k) => k !== CACHE_NAME);
      await Promise.all(old.map((k) => caches.delete(k)));
      await self.clients.claim();
      // Only an update replaces an older app cache; the very first install stays silent
      if (!old.some((k) => k.startsWith('tyhyi-klas-'))) return;
      const pages = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      pages.forEach((page) => page.postMessage({ type: 'sw-updated', assets: CORE_ASSETS }));
    })
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  // Network-First for HTML navigation so deployed updates apply immediately when online
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => caches.match(event.request).then((res) => res || caches.match('./index.html')))
    );
    return;
  }

  // Cache-First with background refresh for static assets (JS, CSS, WOFF2)
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networked = fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => cached || Response.error());

      return cached || networked;
    })
  );
});
