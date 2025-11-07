// js/ui.js

// ---------------- Theme helpers ----------------
export function setThemeFromStorage(root) {
  const saved = localStorage.getItem('theme');
  root.setAttribute('data-theme', (saved === 'dark' || saved === 'light') ? saved : 'light');
  updateThemeColorMeta(root);
}
export function toggleThemeLabel(btn, root) {
  const isDark = root.getAttribute('data-theme') === 'dark';
  btn.textContent = isDark ? 'Switch to Light' : 'Switch to Dark';
}
export function toggleTheme(btn, root) {
  const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  root.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
  updateThemeColorMeta(root);
  toggleThemeLabel(btn, root);
}
function updateThemeColorMeta(root) {
  const isDark = root.getAttribute('data-theme') === 'dark';
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', isDark ? '#0b1220' : '#0f766e');
}

// ---------------- Spinner + status ----------------
export function setStatus(text) {
  const el = document.getElementById('voice-status');
  if (el) el.textContent = text;
}
export function showSpinner(text='') {
  const sp = document.getElementById('spinner');
  const st = document.getElementById('spinner-text');
  if (!sp || !st) return;
  sp.classList.add('show'); sp.setAttribute('aria-hidden', 'false');
  st.textContent = text;
}
export function hideSpinner() {
  const sp = document.getElementById('spinner');
  const st = document.getElementById('spinner-text');
  if (!sp || !st) return;
  sp.classList.remove('show'); sp.setAttribute('aria-hidden', 'true');
  st.textContent = '';
}

// ---------------- Transcript buffer (10k cap) ----------------
const MAX_CHARS = 10000;
let transcriptBuffer = ''; // paragraphs separated by \n\n

export function appendTranscript(newText) {
  if (!newText) return;

  // Normalize → sentences → paragraphs (3 sentences per paragraph)
  const sentences = newText
    .replace(/\s+/g, ' ')
    .trim()
    .split(/(?<=[.!?])\s+/)
    .filter(Boolean);

  const groupSize = 3;
  const paras = [];
  for (let i = 0; i < sentences.length; i += groupSize) {
    paras.push(sentences.slice(i, i + groupSize).join(' '));
  }

  const added = paras.join('\n\n');
  transcriptBuffer = transcriptBuffer ? `${transcriptBuffer}\n\n${added}` : added;

  // Enforce 10k cap (trim from the start)
  if (transcriptBuffer.length > MAX_CHARS) {
    transcriptBuffer = transcriptBuffer.slice(transcriptBuffer.length - MAX_CHARS);
    const cut = transcriptBuffer.indexOf('\n\n');
    if (cut > 0) transcriptBuffer = transcriptBuffer.slice(cut + 2);
  }

  // Reflect to DOM
  const target = document.getElementById('transcript');
  if (!target) return;
  target.innerHTML = '';
  transcriptBuffer.split(/\n\n/).forEach(pText => {
    const p = document.createElement('p');
    p.textContent = pText;
    target.appendChild(p);
  });
}

// Single definition of renderTranscript: reset + append
export function renderTranscript(text) {
  transcriptBuffer = '';
  appendTranscript(text);
}

// Give Copy button a clean getter
export function getTranscriptPlainText() {
  return transcriptBuffer;
}

// ---------------- Recording timer ----------------
const timerTextEl = () => document.getElementById('timer-text');
const timerRow = () => document.getElementById('rec-row');
let timerId = null; let startMs = 0;

export const timer = {
  start() {
    startMs = Date.now();
    const row = timerRow(); if (row) row.classList.add('recording');
    updateTimer();
    timerId = setInterval(updateTimer, 1000);
  },
  stop() {
    if (timerId) clearInterval(timerId);
    timerId = null;
    const t = timerTextEl(); if (t) t.textContent = '00:00';
    const row = timerRow(); if (row) row.classList.remove('recording');
  }
};

function updateTimer() {
  const t = timerTextEl();
  if (!t) return;
  const elapsed = Math.max(0, Date.now() - startMs);
  const s = Math.floor(elapsed / 1000);
  const mm = String(Math.floor(s / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  t.textContent = `${mm}:${ss}`;
}
