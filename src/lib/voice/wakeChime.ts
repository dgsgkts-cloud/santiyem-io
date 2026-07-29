// ============================================================
// src/lib/voice/wakeChime.ts
// Subtle synthesised confirmation tone played when the wake word
// is detected. Generated with WebAudio so no asset is shipped and
// no network request is made.
// ============================================================

let ctx: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    const Ctor = window.AudioContext ?? (window as any).webkitAudioContext;
    if (!Ctor) return null;
    if (!ctx || ctx.state === "closed") ctx = new Ctor();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

/**
 * Two-note ascending chime (E6 → B6), ~180ms, deliberately quiet so it
 * reads as an acknowledgement rather than a notification.
 */
export function playWakeChime(volume = 0.12): void {
  const audio = getContext();
  if (!audio) return;
  try {
    const now = audio.currentTime;
    const master = audio.createGain();
    master.gain.value = volume;
    master.connect(audio.destination);

    [
      { freq: 1318.51, at: 0, dur: 0.09 },
      { freq: 1975.53, at: 0.075, dur: 0.13 },
    ].forEach(({ freq, at, dur }) => {
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + at);
      gain.gain.setValueAtTime(0.0001, now + at);
      gain.gain.exponentialRampToValueAtTime(1, now + at + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + at + dur);
      osc.connect(gain);
      gain.connect(master);
      osc.start(now + at);
      osc.stop(now + at + dur + 0.02);
    });

    window.setTimeout(() => { try { master.disconnect(); } catch { /* noop */ } }, 500);
  } catch { /* audio is best-effort */ }
}

/** Softer descending tone when a conversation returns to idle listening. */
export function playSleepChime(volume = 0.07): void {
  const audio = getContext();
  if (!audio) return;
  try {
    const now = audio.currentTime;
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(587.33, now + 0.16);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
    osc.connect(gain);
    gain.connect(audio.destination);
    osc.start(now);
    osc.stop(now + 0.24);
  } catch { /* noop */ }
}
