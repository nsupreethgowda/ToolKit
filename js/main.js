import { registerSW, attachForceReload } from './pwa.js';
import { initMenu } from './menu.js';
import { setStatus, showSpinner, hideSpinner, appendTranscript, getTranscriptPlainText, timer } from './ui.js';

registerSW('./sw.js?v=13'); // bump this when you ship major changes
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
      appendTranscript(text);
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
  const area = document.getElementById('transcript');
  const text = Array.from(area.querySelectorAll('p')).map(p => p.textContent).join('\n\n');
  try {
    await navigator.clipboard.writeText(text);
    const c = document.getElementById('copy-btn');
    c.textContent = 'Copied';
    setTimeout(() => (c.textContent = 'Copy'), 1000);
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
