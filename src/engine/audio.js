let audioCtx = null;
let isMuted = false;

function getContext() {
  if (isMuted) return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) audioCtx = new AudioContextClass();
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function toggleMute() {
  isMuted = !isMuted;
  return isMuted;
}

export function isAudioMuted() {
  return isMuted;
}

export function playWhistle(long = false) {
  const ctx = getContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const duration = long ? 0.65 : 0.28;

  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gain = ctx.createGain();

  osc1.type = "triangle";
  osc2.type = "sine";
  osc1.frequency.setValueAtTime(2850, now);
  osc2.frequency.setValueAtTime(2920, now);

  // Efecto trino de silbato
  for (let t = 0; t < duration; t += 0.04) {
    osc1.frequency.setValueAtTime(t % 0.08 < 0.04 ? 2850 : 2720, now + t);
  }

  gain.gain.setValueAtTime(0.001, now);
  gain.gain.exponentialRampToValueAtTime(0.09, now + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

  osc1.connect(gain);
  osc2.connect(gain);
  gain.connect(ctx.destination);

  osc1.start(now);
  osc2.start(now);
  osc1.stop(now + duration);
  osc2.stop(now + duration);
}

export function playKick() {
  const ctx = getContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "sine";
  osc.frequency.setValueAtTime(140, now);
  osc.frequency.exponentialRampToValueAtTime(42, now + 0.11);

  gain.gain.setValueAtTime(0.14, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.12);
}

export function playGoalCheer() {
  const ctx = getContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  // Acorde triunfal + rugido de grada
  const freqs = [261.63, 329.63, 392.00, 523.25];
  freqs.forEach((f, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(f, now + idx * 0.05);

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(950, now);

    gain.gain.setValueAtTime(0.001, now + idx * 0.05);
    gain.gain.exponentialRampToValueAtTime(0.04, now + idx * 0.05 + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.1);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now + idx * 0.05);
    osc.stop(now + 1.15);
  });
}