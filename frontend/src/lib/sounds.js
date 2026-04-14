/**
 * Chess sound effects using Web Audio API.
 * Master volume + mute persisted in localStorage.
 */

let audioCtx = null;
let masterGain = null;

// Persisted state
let _muted = localStorage.getItem("chess_muted") === "true";
let _volume = parseFloat(localStorage.getItem("chess_volume") ?? "0.7");

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = _muted ? 0 : _volume;
    masterGain.connect(audioCtx.destination);
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

function getMasterGain() {
  getAudioContext();
  return masterGain;
}

// ---- Public API for volume / mute ----

export function isMuted() {
  return _muted;
}

export function getVolume() {
  return _volume;
}

export function setMuted(muted) {
  _muted = muted;
  localStorage.setItem("chess_muted", String(muted));
  if (masterGain) {
    masterGain.gain.value = muted ? 0 : _volume;
  }
}

export function setVolume(vol) {
  _volume = Math.max(0, Math.min(1, vol));
  localStorage.setItem("chess_volume", String(_volume));
  if (_muted) return;
  if (masterGain) {
    masterGain.gain.value = _volume;
  }
}

export function toggleMute() {
  setMuted(!_muted);
  return _muted;
}

// ---- Sound generators (routed through masterGain) ----

/** Short noise burst — wooden "tap" for regular moves */
export function playMoveSound() {
  try {
    if (_muted) return;
    const ctx = getAudioContext();
    const dest = getMasterGain();
    const t = ctx.currentTime;

    const bufferSize = ctx.sampleRate * 0.06;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 8);
    }

    const src = ctx.createBufferSource();
    src.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 1800;
    filter.Q.value = 1.2;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

    src.connect(filter).connect(gain).connect(dest);
    src.start(t);
    src.stop(t + 0.08);
  } catch {
    // Silently fail
  }
}

/** Heavier thud for captures */
export function playCaptureSound() {
  try {
    if (_muted) return;
    const ctx = getAudioContext();
    const dest = getMasterGain();
    const t = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(200, t);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.12);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

    osc.connect(gain).connect(dest);
    osc.start(t);
    osc.stop(t + 0.15);

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

    src.connect(filter).connect(noiseGain).connect(dest);
    src.start(t);
    src.stop(t + 0.1);
  } catch {
    // Silently fail
  }
}

/** Two-tone alert for check */
export function playCheckSound() {
  try {
    if (_muted) return;
    const ctx = getAudioContext();
    const dest = getMasterGain();
    const t = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    osc1.type = "triangle";
    osc1.frequency.value = 660;
    const gain1 = ctx.createGain();
    gain1.gain.setValueAtTime(0.3, t);
    gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    osc1.connect(gain1).connect(dest);
    osc1.start(t);
    osc1.stop(t + 0.12);

    const osc2 = ctx.createOscillator();
    osc2.type = "triangle";
    osc2.frequency.value = 880;
    const gain2 = ctx.createGain();
    gain2.gain.setValueAtTime(0, t);
    gain2.gain.setValueAtTime(0.3, t + 0.1);
    gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    osc2.connect(gain2).connect(dest);
    osc2.start(t);
    osc2.stop(t + 0.25);
  } catch {
    // Silently fail
  }
}

/** Dramatic low tone for checkmate / game over */
export function playGameOverSound() {
  try {
    if (_muted) return;
    const ctx = getAudioContext();
    const dest = getMasterGain();
    const t = ctx.currentTime;

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

    osc.connect(filter).connect(gain).connect(dest);
    osc.start(t);
    osc.stop(t + 0.7);
  } catch {
    // Silently fail
  }
}

/** Soft ping for game start / player joined */
export function playNotifySound() {
  try {
    if (_muted) return;
    const ctx = getAudioContext();
    const dest = getMasterGain();
    const t = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = 523;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

    osc.connect(gain).connect(dest);
    osc.start(t);
    osc.stop(t + 0.2);
  } catch {
    // Silently fail
  }
}
