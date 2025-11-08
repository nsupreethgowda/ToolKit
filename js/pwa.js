// js/pwa.js
export function registerSW(url) {
  if (!('serviceWorker' in navigator)) return;
  try {
    navigator.serviceWorker.register(url); // pass versioned URL from main.js
  } catch (e) {
    console.warn('SW registration failed:', e);
  }
}

export function attachForceReload() {
  document.addEventListener('click', (e) => {
    if (e.target && e.target.id === 'force-reload') forceReload();
  });
}

async function forceReload() {
  const btn = document.getElementById('force-reload');
  if (btn) { btn.disabled = true; btn.textContent = 'Clearing…'; }
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(r => r.unregister()));
    }
    if ('caches' in window) {
      const names = await caches.keys();
      await Promise.all(names.map(n => caches.delete(n)));
    }
  } catch {}
  const url = new URL(window.location.href);
  url.searchParams.set('force', Date.now());
  window.location.replace(url.toString());
}
