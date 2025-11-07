// Basic offline cache + background sync hook
const CACHE = 'app-cache-v3';
const OFFLINE_URLS = ['/', '/index.html', '/manifest.webmanifest', 'https://unpkg.com/@picocss/pico@2/css/pico.min.css'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(OFFLINE_URLS)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(self.clients.claim());
});

// Network-first for API, cache-first for static
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (url.pathname.startsWith('/api/')) {
    // Network with fallback to cache
    e.respondWith(
      fetch(e.request).catch(() => caches.match(e.request))
    );
  } else {
    // Static assets: cache-first, then network
    e.respondWith(
      caches.match(e.request).then(resp => resp || fetch(e.request).then(net => {
        const copy = net.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
        return net;
      }))
    );
  }
});

// Optional Background Sync (queue logic would live here)
self.addEventListener('sync', async (event) => {
  if (event.tag === 'sync-notes') {
    event.waitUntil((async () => {
      // Example: read pending from IndexedDB via IDB in SW is awkward; usually use a lightweight queue or Background Sync library.
      // Simplicity note: consider PouchDB for seamless local <-> remote sync.
    })());
  }
});
