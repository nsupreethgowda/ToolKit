// js/audio.js
// Worklet-based PCM capture (cross-browser) + resample to 16k mono.
// Eliminates decodeAudioData() on container blobs (which fails in Safari for webm/opus).

let ctx = null;
let source = null;
let node = null;
let pcmChunks = [];
let mediaStream = null;

export async function startPCM(stream) {
  mediaStream = stream;
  // Some browsers won't honor requested sampleRate; we'll resample later anyway.
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  // Load the recorder worklet
  await ctx.audioWorklet.addModule('js/recorder-worklet.js');

  source = ctx.createMediaStreamSource(stream);
  node = new AudioWorkletNode(ctx, 'recorder');

  // Collect Float32 frames from the worklet
  pcmChunks = [];
  node.port.onmessage = (e) => {
    if (e.data?.type === 'data' && e.data.buffer) {
      pcmChunks.push(e.data.buffer);
    }
  };

  // Connect the graph; we don't need audible output
  source.connect(node);
  // Connect to a dummy gain to keep the node active without routing to speakers
  const sink = ctx.createGain();
  sink.gain.value = 0;
  node.connect(sink).connect(ctx.destination);
}

export async function stopPCM() {
  try {
    // Stop all mic tracks
    if (mediaStream) mediaStream.getTracks().forEach(t => t.stop());
  } catch {}

  // Tear down audio graph
  try {
    if (source) source.disconnect();
    if (node) node.disconnect();
    if (ctx && ctx.state !== 'closed') await ctx.close();
  } catch {}

  // Concatenate Float32 chunks (ctx.sampleRate)
  const recorded = concatFloat32(pcmChunks);
  const inRate = (ctx && ctx.sampleRate) || 48000;
  const mono = recorded; // already mono from the first channel
  const pcm16k = resampleFloat32(mono, inRate, 16000);
  // Reset
  ctx = source = node = null;
  pcmChunks = [];
  mediaStream = null;
  return pcm16k;
}

function concatFloat32(chunks) {
  if (!chunks || !chunks.length) return new Float32Array(0);
  let total = 0; for (const c of chunks) total += c.length;
  const out = new Float32Array(total);
  let offset = 0;
  for (const c of chunks) { out.set(c, offset); offset += c.length; }
  return out;
}

// Linear resample to target sample rate
export function resampleFloat32(float32, originalRate, targetRate) {
  if (!float32 || float32.length === 0) return new Float32Array(0);
  if (originalRate === targetRate) return float32;
  const ratio = originalRate / targetRate;
  const newLen = Math.max(1, Math.round(float32.length / ratio));
  const out = new Float32Array(newLen);
  for (let i = 0; i < newLen; i++) {
    const idx = i * ratio;
    const i0 = Math.floor(idx);
    const i1 = Math.min(i0 + 1, float32.length - 1);
    const frac = idx - i0;
    out[i] = float32[i0] * (1 - frac) + float32[i1] * frac;
  }
  return out;
}
