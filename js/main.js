import { registerSW, attachForceReload } from './pwa.js';
import { initMenu } from './menu.js';
// OK:
import {  setStatus, showSpinner, hideSpinner,  appendTranscript, getTranscriptPlainText, timer} from './ui.js';

// (If you still need a full replace somewhere, you can also import renderTranscript once.)

registerSW('./sw.js?v=15'); // bump this when you ship major changes
attachForceReload();
initMenu();

// Online/offline
const netEl = document.getElementById('net-status');
const updateNet = () => netEl.textContent = navigator.onLine ? 'online' : 'offline';
addEventListener('online', updateNet); addEventListener('offline', updateNet); updateNet();

// Voice UI
const btn = document.getElementById('voice-btn');
const btnLabel = document.getElementById('voice-btn-label');

let media = null;   // audio worklet helpers
let asr = null;     // whisper loader/transcribe
let isActive = false;
let audioStream = null;

btn.addEventListener('click', async () => {
  isActive = !isActive;
  if (isActive) {
    if (!media) media = await import('./audio.js');
    try {
      audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setStatus('Microphone permission denied');
      isActive = false;
      return;
    }
    // Start PCM capture
    try {
      await media.startPCM(audioStream);
    } catch (err) {
      console.error(err);
      setStatus('Audio capture not supported in this browser');
      isActive = false;
      return;
    }

    btn.classList.add('active');
    btn.setAttribute('aria-pressed', 'true');
    btnLabel.textContent = 'Stop Voice Recognition';
    setStatus('Voice recognition active');
    timer.start();

  } else {
    const pcm16k = await media.stopPCM();
    btn.classList.remove('active');
    btn.setAttribute('aria-pressed', 'false');
    btnLabel.textContent = 'Start Voice Recognition';
    timer.stop();

    showSpinner('Processing audio…');
    setStatus('Processing audio…');

    try {
      showSpinner('Transcribing…');
      if (!asr) asr = await import('./asr.js');
const text = await asr.transcribe(pcm16k);
appendTranscript(text); // accumulate with 10k cap

    } catch (e) {
      console.error(e);
      renderTranscript('[Transcription failed]');
    } finally {
      hideSpinner();
      setStatus('Idle');
    }
  }
});

// Copy transcript
document.getElementById('copy-btn').addEventListener('click', async () => {
  const text = getTranscriptPlainText();
  try {
    await navigator.clipboard.writeText(text);
    const c = document.getElementById('copy-btn');
    c.textContent = 'Copied';
    setTimeout(() => (c.textContent = 'Copy'), 1000);
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text; document.body.appendChild(ta);
    ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
  }
});

// Reformat button
document.getElementById('reformat-btn').addEventListener('click', async () => {
  const [{ getTranscriptPlainText }, { reformatText }, { loadEnabledPacks }] = await Promise.all([
    import('./ui.js'),
    import('./format.js'),
    import('./rule-loader.js')
  ]);

  const input = getTranscriptPlainText();
  const pack = await loadEnabledPacks();        // merged replacements/post/sectionizers
  const out   = reformatText(input, pack);      // apply base flags + packs

  const box = document.getElementById('formatted');
  box.innerHTML = '';
  out.split(/\n\n/).forEach(p => {
    const el = document.createElement('p');
    el.textContent = p;
    box.appendChild(el);
  });
});


// Copy formatted
document.getElementById('copy-formatted-btn').addEventListener('click', async () => {
  const html = document.getElementById('formatted');
  const text = Array.from(html.querySelectorAll('p')).map(p => p.textContent).join('\n\n');
  try {
    await navigator.clipboard.writeText(text);
    const b = document.getElementById('copy-formatted-btn');
    b.textContent = 'Copied';
    setTimeout(() => (b.textContent = 'Copy'), 1000);
  } catch {
    const ta = document.createElement('textarea'); ta.value = text;
    document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
  }
});


// Filter out benign Cloudflare hub.js JSON parse noise
window.addEventListener('error', (e) => {
  if (e.filename && e.filename.includes('hub.js')) {
    e.preventDefault();
    return false;
  }
});
