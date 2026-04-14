/**
 * Chess sound effects using Web Audio API.
 * No external files needed — sounds are generated programmatically.
 */

let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  // Resume if suspended (browser autoplay policy)
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

/** Short noise burst — wooden "tap" for regular moves */
export function playMoveSound() {
  try {
    const ctx = getAudioContext();
    const t = ctx.currentTime;

    // White noise burst shaped like a wood tap
    const bufferSize = ctx.sampleRate * 0.06;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 8);
    }

    const src = ctx.createBufferSource();
    src.buffer = buffer;

    // Band-pass filter to shape it
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 1800;
    filter.Q.value = 1.2;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

    src.connect(filter).connect(gain).connect(ctx.destination);
    src.start(t);
    src.stop(t + 0.08);
  } catch {
    // Silently fail if audio isn't available
  }
}

/** Heavier thud for captures */
export function playCaptureSound() {
  try {
    const ctx = getAudioContext();
    const t = ctx.currentTime;

    // Low-frequency thud
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(200, t);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.12);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.15);

    // Add noise layer
    const bufferSize = ctx.sampleRate * 0.08;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 6);
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.25, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 1200;

    src.connect(filter).connect(noiseGain).connect(ctx.destination);
    src.start(t);
    src.stop(t + 0.1);
  } catch {
    // Silently fail
  }
}

/** Two-tone alert for check */
export function playCheckSound() {
  try {
    const ctx = getAudioContext();
    const t = ctx.currentTime;

    // First tone
    const osc1 = ctx.createOscillator();
    osc1.type = "triangle";
    osc1.frequency.value = 660;
    const gain1 = ctx.createGain();
    gain1.gain.setValueAtTime(0.3, t);
    gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    osc1.connect(gain1).connect(ctx.destination);
    osc1.start(t);
    osc1.stop(t + 0.12);

    // Second tone (higher)
    const osc2 = ctx.createOscillator();
    osc2.type = "triangle";
    osc2.frequency.value = 880;
    const gain2 = ctx.createGain();
    gain2.gain.setValueAtTime(0, t);
    gain2.gain.setValueAtTime(0.3, t + 0.1);
    gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    osc2.connect(gain2).connect(ctx.destination);
    osc2.start(t);
    osc2.stop(t + 0.25);
  } catch {
    // Silently fail
  }
}

/** Dramatic low tone for checkmate / game over */
export function playGameOverSound() {
  try {
    const ctx = getAudioContext();
    const t = ctx.currentTime;

    // Descending tone
    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(440, t);
    osc.frequency.exponentialRampToValueAtTime(110, t + 0.6);

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(2000, t);
    filter.frequency.exponentialRampToValueAtTime(200, t + 0.6);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.setValueAtTime(0.2, t + 0.3);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.7);

    osc.connect(filter).connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.7);
  } catch {
    // Silently fail
  }
}

/** Soft ping for game start / player joined */
export function playNotifySound() {
  try {
    const ctx = getAudioContext();
    const t = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = 523; // C5

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.2);
  } catch {
    // Silently fail
  }
}
