// ============================================================
// src/lib/voice/micOwnership.ts
// Explicit microphone ownership. Only ONE consumer may hold the
// microphone at a time, so wake-word detection can never call
// getUserMedia while a live voice session owns the input.
// ============================================================

export type MicOwner = "idle" | "wake_word" | "voice_session";

type Listener = (owner: MicOwner) => void;

let owner: MicOwner = "idle";
const listeners = new Set<Listener>();

function notify() {
  listeners.forEach((l) => {
    try { l(owner); } catch { /* noop */ }
  });
}

export function getMicOwner(): MicOwner {
  return owner;
}

/**
 * Claims the microphone. `voice_session` always wins and evicts an
 * active wake-word listener; `wake_word` is refused while a session runs.
 */
export function claimMic(next: Exclude<MicOwner, "idle">): boolean {
  if (next === "voice_session") {
    if (owner !== "voice_session") {
      owner = "voice_session";
      notify();
    }
    return true;
  }
  if (owner === "voice_session") return false;
  if (owner !== "wake_word") {
    owner = "wake_word";
    notify();
  }
  return true;
}

/** Releases the microphone only if the caller still owns it. */
export function releaseMic(from: Exclude<MicOwner, "idle">): void {
  if (owner !== from) return;
  owner = "idle";
  notify();
}

export function onMicOwnerChange(cb: Listener): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
