let muted = false;
let audioCtx = null;

function getAudioContext() {
  if (muted) return null;
  if (!audioCtx && typeof window !== "undefined") {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (Ctx) audioCtx = new Ctx();
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function isAudioMuted() {
  return muted;
}

export function toggleMute() {
  muted = !muted;
  return muted;
}

export function playWhistleSound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  const mainGain = ctx.createGain();

  osc.type = "sine";
  osc.frequency.setValueAtTime(2850, now);

  // Vibrato característico de silbato de árbitro
  lfo.type = "sine";
  lfo.frequency.setValueAtTime(34, now);
  lfoGain.gain.setValueAtTime(110, now);

  lfo.connect(lfoGain);
  lfoGain.connect(osc.frequency);

  mainGain.gain.setValueAtTime(0.001, now);
  mainGain.gain.linearRampToValueAtTime(0.08, now + 0.03);
  mainGain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);

  osc.connect(mainGain);
  mainGain.connect(ctx.destination);

  osc.start(now);
  lfo.start(now);
  osc.stop(now + 0.44);
  lfo.stop(now + 0.44);
}

export function playGoalSound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const notes = [523.25, 659.25, 783.99, 1046.5]; // Acorde de celebración Do-Mi-Sol-Do

  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, now + i * 0.09);

    gain.gain.setValueAtTime(0.001, now + i * 0.09);
    gain.gain.linearRampToValueAtTime(0.09, now + i * 0.09 + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.09 + 0.55);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now + i * 0.09);
    osc.stop(now + i * 0.09 + 0.58);
  });
}