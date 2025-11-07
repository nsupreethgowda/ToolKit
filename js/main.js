- let media = null;  // audio helpers
+ let media = null;  // audio helpers (worklet)

- let recordedChunks = [];
- let audioStream = null;
+ let audioStream = null;

 // on Start (inside the click handler)
- if (!media) media = await import('./audio.js');
- recordedChunks = [];
+ if (!media) media = await import('./audio.js');

try {
  await media.startPCM(audioStream);
} catch (err) {
  setStatus('Audio capture not supported in this browser');
  isActive = false;
  btn.classList.remove('active');
  btn.setAttribute('aria-pressed', 'false');
  btnLabel.textContent = 'Start Voice Recognition';
  return;
}


   try {
     audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
   } catch {
     setStatus('Microphone permission denied');
     isActive = false;
     return;
   }

- const rec = media.startRecorder(audioStream, recordedChunks);
+ await media.startPCM(audioStream);

 // on Stop (inside the click handler)
- await media?.stopRecorder();
- audioStream?.getTracks().forEach(t => t.stop());
+ const pcm16k = await media.stopPCM();

   btn.classList.remove('active');
   btn.setAttribute('aria-pressed', 'false');
   btnLabel.textContent = 'Start Voice Recognition';
   timer.stop();

   showSpinner('Processing audio…');
   setStatus('Processing audio…');

   try {
-    // Decode + resample to 16k mono
-    const blob = new Blob(recordedChunks, { type: 'audio/webm' });
-    const audioData = await blob.arrayBuffer();
-    const decoded = await media.decodeAudio(audioData);
-    const mono = media.toMono(decoded);
-    const pcm16k = media.resampleFloat32(mono, decoded.sampleRate, 16000);

     showSpinner('Transcribing…');
     if (!asr) asr = await import('./asr.js');
     const text = await asr.transcribe(pcm16k);  // returns string
     renderTranscript(text);
