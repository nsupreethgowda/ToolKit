// Robust SW with explicit version to invalidate old caches
const CACHE = 'app-cache-v12';
const OFFLINE_URLS = [
  '/', '/index.html', '/manifest.webmanifest',
  '/css/themes.css', '/js/main.js', '/js/ui.js', '/js/pwa.js', '/js/menu.js',
  // CDN CSS is fine to cache opportunistically
  'https://unpkg.com/@picocss/pico@2/css/pico.min.css'
];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    try { await c.addAll(OFFLINE_URLS); } catch {}
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => (k !== CACHE ? caches.delete(k) : null)));
    await self.clients.claim();
  })());
});

// Network-first for API (if you add Pages Functions like /api/notes), cache-first for static
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (url.pathname.startsWith('/api/')) {
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
    return;
  }
  e.respondWith(
    caches.match(e.request).then(resp => {
      if (resp) return resp;
      return fetch(e.request).then(net => {
        const copy = net.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
        return net;
      }).catch(() => caches.match('/index.html'));
    })
  );
});
