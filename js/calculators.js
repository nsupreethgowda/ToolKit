// Auto-discovers all "parser" modules in rules/index.json that export
// getCalculatorSchema() + computeFromSelections(). Renders a button per calc.

import { getRegistry } from './rule-loader.js';

const calcList    = document.getElementById('calc-list');
const outputEl    = document.getElementById('output');
const statusEl    = document.getElementById('status');
const exportText  = document.getElementById('export-text');
const exportJSON  = document.getElementById('export-json');

let calculators = [];   // [{id,title,render,getResult}]
let activeCalc = null;

function status(t){ statusEl.textContent = t; }

document.addEventListener('DOMContentLoaded', async () => {
  status('Loading…');
  try {
    const reg = await getRegistry();
    const parserEntries = reg.filter(x => x.kind === 'parser' && x.module);

    calculators = [];
    for (const entry of parserEntries) {
      try {
        const mod = await import(`../rules/${entry.module}`);
        if (typeof mod.getCalculatorSchema === 'function' && typeof mod.computeFromSelections === 'function') {
          calculators.push(makeGenericCalculator(entry.label || entry.id, mod.getCalculatorSchema, mod.computeFromSelections));
        }
      } catch (e) {
        console.warn('Calculator module load failed:', entry, e);
      }
    }

    renderChooser();
    status('Ready');
  } catch (e) {
    console.error(e);
    calcList.textContent = 'Failed to load calculators.';
    status('Error');
  }
});

// Build UI tabs/buttons and mount first calculator
function renderChooser() {
  calcList.innerHTML = '';
  if (!calculators.length) {
    calcList.textContent = 'No calculators available.';
    return;
  }

  const tabs = document.createElement('div');
  tabs.className = 'row';
  calculators.forEach((c, idx) => {
    const b = document.createElement('button');
    b.className = 'copy-btn';
    b.textContent = c.title;             // ← NIHSS will appear here
    b.addEventListener('click', () => mountCalc(idx));
    tabs.appendChild(b);
  });
  calcList.appendChild(tabs);

  // holder for the active calculator card
  const holder = document.createElement('div');
  holder.id = 'calc-holder';
  holder.className = 'calc-card';
  calcList.appendChild(holder);

  mountCalc(0); // first by default
}

function mountCalc(index) {
  const holder = document.getElementById('calc-holder');
  holder.innerHTML = '';
  activeCalc = calculators[index];
  activeCalc.render(holder);
  outputEl.textContent = '';
}

// Factory for any calculator exposing getCalculatorSchema/computeFromSelections
function makeGenericCalculator(title, getSchema, compute) {
  const schema = getSchema();
  let state = {}; // { code: value }

  function render(container) {
    const h2 = document.createElement('h2'); h2.textContent = schema.title || title;
    container.appendChild(h2);

    const grid = document.createElement('div'); grid.className = 'grid';
    container.appendChild(grid);

    for (const item of schema.items) {
      const card = document.createElement('div');
      card.style = 'border:1px solid var(--border); border-radius:10px; padding:.75rem; background:var(--surface);';

      const h = document.createElement('h3');
      h.textContent = `${item.code} — ${item.label}`;
      h.style = 'font-size:1rem; margin-bottom:.5rem;';
      card.appendChild(h);

      const group = document.createElement('div'); group.style = 'display:flex; flex-wrap:wrap; gap:.5rem;';
      for (const opt of item.options) {
        const btn = document.createElement('button');
        btn.className = 'copy-btn';
        btn.textContent = opt.label;
        btn.addEventListener('click', () => {
          state[item.code] = opt.value;
          // mark active in this group
          Array.from(group.children).forEach(ch => ch.style.outline = '');
          btn.style.outline = '2px solid var(--brand)';
          computeAndRender();
        });
        group.appendChild(btn);
      }
      card.appendChild(group);
      grid.appendChild(card);
    }

    const row = document.createElement('div'); row.className = 'row'; row.style = 'margin-top:.75rem;';
    const clear = document.createElement('button'); clear.className = 'copy-btn'; clear.textContent = 'Clear selections';
    clear.addEventListener('click', () => { state = {}; computeAndRender(true); Array.from(container.querySelectorAll('.copy-btn')).forEach(b => (b.style.outline='')); });
    row.appendChild(clear);
    container.appendChild(row);
  }

  function computeAndRender(reset=false) {
    const res = compute(state);
    outputEl.textContent = res.text; // pretty text
    status(res.json?.total != null ? `Total = ${res.json.total}` : 'Computed');
    if (reset) status('Cleared');
  }

  function getResult() {
    const res = compute(state);
    return { text: res.text, json: res.json };
  }

  return { id: schema.id || title, title: schema.title || title, render, getResult };
}

// Exports
exportText.addEventListener('click', () => {
  if (!activeCalc) return;
  const { text } = activeCalc.getResult();
  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'calculator-output.txt'; a.click();
  URL.revokeObjectURL(url);
});
exportJSON.addEventListener('click', () => {
  if (!activeCalc) return;
  const { json } = activeCalc.getResult();
  const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'calculator-output.json'; a.click();
  URL.revokeObjectURL(url);
});
