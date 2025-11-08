// js/menu.js
import { setThemeFromStorage, toggleThemeLabel, toggleTheme } from './ui.js';

export function initMenu() {
  const root = document.documentElement;
  setThemeFromStorage(root);

  const mount = document.getElementById('menu-root');
  mount.innerHTML = `
    <div id="menu" class="menu" role="menu" aria-labelledby="hamburger" style="
      position:fixed; left:1rem; z-index:1001; width:260px; border:1px solid var(--border);
      border-radius:12px; padding:.6rem; background: var(--glass); backdrop-filter: blur(6px);
      display:none; box-shadow:0 10px 30px rgba(0,0,0,.15); top:1rem;
    ">
      <div class="item" style="display:flex;align-items:center;justify-content:space-between;gap:.5rem;padding:.5rem;">
        <span>Theme</span>
        <button id="toggle-theme" class="toggle-theme" role="menuitem" style="font-size:.9rem;padding:.35rem .6rem;border-radius:.5rem;border:1px solid var(--border);background:var(--surface);"></button>
      </div>

      <div class="item" style="display:flex;align-items:center;justify-content:space-between;gap:.5rem;padding:.5rem;">
        <span>Context Rules</span>
        <a href="./rules.html" class="menu-btn" role="menuitem" style="text-decoration:none;display:inline-block;text-align:center;">Open</a>
      </div>

      <div class="item" style="display:flex;align-items:center;justify-content:space-between;gap:.5rem;padding:.5rem;">
        <span>Manual Calculators</span>
        <a href="./calculators.html" class="menu-btn" role="menuitem" style="text-decoration:none;display:inline-block;text-align:center;">Open</a>
      </div>

      <hr style="margin:.4rem 0;border-color:var(--border)"/>

      <div class="item" style="display:flex;align-items:center;justify-content:space-between;gap:.5rem;padding:.5rem;">
        <span>Cache & SW</span>
        <button id="force-reload" class="menu-btn" role="menuitem" style="font-size:.9rem;padding:.35rem .6rem;border-radius:.5rem;border:1px solid var(--border);background:var(--surface);">Force reload</button>
      </div>
    </div>
  `;

  const trigger = document.getElementById('hamburger'); // your "Menu" pill uses this id
  const menu = document.getElementById('menu');

  function closeOnOutside(e) {
    if (!menu.contains(e.target) && e.target !== trigger) {
      menu.classList.remove('open'); menu.style.display = 'none';
      trigger.setAttribute('aria-expanded', 'false');
      document.removeEventListener('click', closeOnOutside);
    }
  }
  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    const open = !menu.classList.contains('open');
    menu.classList.toggle('open', open);
    menu.style.display = open ? 'block' : 'none';
    trigger.setAttribute('aria-expanded', String(open));
    if (open) document.addEventListener('click', closeOnOutside);
  });

  const btn = document.getElementById('toggle-theme');
  toggleThemeLabel(btn, root);
  btn.addEventListener('click', () => toggleTheme(btn, root));
}
