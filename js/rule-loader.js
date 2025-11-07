// js/rule-loader.js
const LS_ENABLED = 'ctxRulePacksEnabled'; // array of pack IDs enabled by user

export async function getRegistry() {
  const res = await fetch('./rules/index.json', { cache: 'no-cache' });
  if (!res.ok) throw new Error('Failed to load rules index');
  return await res.json();
}

export function getEnabledPackIds() {
  try {
    const raw = localStorage.getItem(LS_ENABLED);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function setEnabledPackIds(ids) {
  localStorage.setItem(LS_ENABLED, JSON.stringify(ids || []));
}

export async function loadEnabledPacks() {
  const all = await getRegistry();
  const enabled = new Set(getEnabledPackIds());

  const chosen = all.filter(p => enabled.has(p.id));
  const packs = [];
  for (const p of chosen) {
    const res = await fetch(`./rules/${p.path}`, { cache: 'no-cache' });
    if (!res.ok) continue;
    packs.push(await res.json());
  }
  return mergePacks(packs);
}

export function mergePacks(packs) {
  const merged = { replacements: [], post: [], sectionizers: [] };
  for (const p of packs) {
    if (Array.isArray(p.replacements)) merged.replacements.push(...p.replacements);
    if (Array.isArray(p.post))         merged.post.push(...p.post);
    if (Array.isArray(p.sectionizers)) merged.sectionizers.push(...p.sectionizers);
  }
  return merged;
}
