import { registerSW, attachForceReload } from './pwa.js';
import { initMenu } from './menu.js';
import { setStatus, showSpinner, hideSpinner, renderTranscript, timer } from './ui.js';

registerSW('./sw.js?v=9');

// Online/offline badge
const netEl = document.getElementById('net-status');
const updateNet = () => netEl.textContent = navigator.onLine ? 'online' : 'offline';
addEventListener('online', updateNet); addEventListener('offline', updateNet); updateNet();

// Menu (theme + force reload)
initMenu();
attachForceReload();

// Voice UI
const btn = document.getElementById('voice-btn');
const btnLabel = document.getElementById('voice-btn-label');

let media = null;  // audio helpers
let asr = null;    // whisper loader/transcribe
let isActive = false;
let recordedChunks = [];
let audioStream = null;

btn.addEventListener('click', async () => {
  isActive = !isActive;
  if (isActive) {
    if (!media) media = await import('./audio.js');
    recordedChunks = [];
    try {
      audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setStatus('Microphone permission denied');
      isActive = false;
      return;
    }

    const rec = media.startRecorder(audioStream, recordedChunks);
    btn.classList.add('active');
    btn.setAttribute('aria-pressed', 'true');
    btnLabel.textContent = 'Stop Voice Recognition';
    setStatus('Voice recognition active');
    timer.start();

  } else {
    await media?.stopRecorder();
    audioStream?.getTracks().forEach(t => t.stop());

    btn.classList.remove('active');
    btn.setAttribute('aria-pressed', 'false');
    btnLabel.textContent = 'Start Voice Recognition';
    timer.stop();

    showSpinner('Processing audio…');
    setStatus('Processing audio…');

    try {
      // Decode + resample to 16k mono
      const blob = new Blob(recordedChunks, { type: 'audio/webm' });
      const audioData = await blob.arrayBuffer();
      const decoded = await media.decodeAudio(audioData);
      const mono = media.toMono(decoded);
      const pcm16k = media.resampleFloat32(mono, decoded.sampleRate, 16000);

      showSpinner('Transcribing…');
      if (!asr) asr = await import('./asr.js');
      const text = await asr.transcribe(pcm16k);  // returns string
      renderTranscript(text);

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
    const btn = document.getElementById('copy-btn');
    btn.textContent = 'Copied';
    setTimeout(() => (btn.textContent = 'Copy'), 1000);
  } catch {
    const ta = document.createElement('textarea'); ta.value = text;
    document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
  }
});
