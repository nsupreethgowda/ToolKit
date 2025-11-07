import { setThemeFromStorage, toggleThemeLabel, toggleTheme } from './ui.js';

export function initMenu() {
  const root = document.documentElement;
  setThemeFromStorage(root);

  const mount = document.getElementById('menu-root');
  mount.innerHTML = `
    <div id="menu" class="menu" role="menu" aria-labelledby="hamburger" style="
      position:fixed; left:1rem; z-index:1001; width:240px; border:1px solid var(--border);
      border-radius:12px; padding:.6rem; background: var(--glass); backdrop-filter: blur(6px);
      display:none; box-shadow:0 10px 30px rgba(0,0,0,.15);">
      <div class="item" style="display:flex;align-items:center;justify-content:space-between;gap:.5rem;padding:.5rem;">
        <span>Theme</span>
        <button id="toggle-theme" class="toggle-theme" role="menuitem" style="font-size:.9rem;padding:.35rem .6rem;border-radius:.5rem;border:1px solid var(--border);background:var(--surface);"></button>
      </div>
      <hr style="margin:.4rem 0;border-color:var(--border)"/>
      <div class="item" style="display:flex;align-items:center;justify-content:space-between;gap:.5rem;padding:.5rem;">
        <span>Cache & SW</span>
        <button id="force-reload" class="menu-btn" role="menuitem" style="font-size:.9rem;padding:.35rem .6rem;border-radius:.5rem;border:1px solid var(--border);background:var(--surface);">Force reload</button>
      </div>
    </div>
  `;

  const hamburger = document.getElementById('hamburger');
  const menu = document.getElementById('menu');

  function closeMenuOnOutside(e) {
    if (!menu.contains(e.target) && e.target !== hamburger) {
      menu.classList.remove('open'); menu.style.display = 'none';
      hamburger.setAttribute('aria-expanded', 'false');
      document.removeEventListener('click', closeMenuOnOutside);
    }
  }
  hamburger.addEventListener('click', (e) => {
    e.stopPropagation();
    const open = !menu.classList.contains('open');
    menu.classList.toggle('open', open);
    menu.style.display = open ? 'block' : 'none';
    hamburger.setAttribute('aria-expanded', String(open));
    if (open) document.addEventListener('click', closeMenuOnOutside);
  });

  const btn = document.getElementById('toggle-theme');
  toggleThemeLabel(btn, root);
  btn.addEventListener('click', () => toggleTheme(btn, root));
}
