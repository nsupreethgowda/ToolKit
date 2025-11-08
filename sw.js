// sw.js
// Navigation-aware SW so /rules.html and /calculators.html load correctly.
// Also pre-caches key same-origin assets. Skips cross-origin (Whisper/CDNs).

const CACHE = 'app-cache-v21';

const OFFLINE_URLS = [
  '/', '/index.html',
  '/rules.html',
  '/calculators.html',

  // CSS
  '/css/themes.css',

  // JS (same-origin only)
  '/js/main.js',
  '/js/pwa.js',
  '/js/menu.js',
  '/js/ui.js',
  '/js/audio.js',
  '/js/asr.js',
  '/js/recorder-worklet.js',
  '/js/format.js',
  '/js/format-flags.js',
  '/js/rule-loader.js',
  '/js/rules.js',
  '/js/calculators.js',

  // Rules registry and packs (same-origin)
  '/rules/index.json',
  '/rules/general-soap.json',
  '/rules/neurology-stroke.json',
  '/rules/parsers/nihss.js'
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

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // ✅ Do not intercept cross-origin (CDNs/HuggingFace/etc.)
  if (url.origin !== location.origin) return;

  // ✅ Treat real navigations as page requests (rules.html, calculators.html, etc.)
  if (e.request.mode === 'navigate') {
    e.respondWith((async () => {
      // 1) Cache first (fast offline)
      const cached = await caches.match(e.request);
      if (cached) return cached;

      // 2) Network, then cache
      try {
        const resp = await fetch(e.request);
        const copy = resp.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
        return resp;
      } catch {
        // 3) App shell fallback
        return caches.match('/index.html');
      }
    })());
    return;
  }

  // ✅ Static assets: cache-first with background fill
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
