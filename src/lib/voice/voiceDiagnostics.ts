// ============================================================
// src/lib/voice/voiceDiagnostics.ts
// Developer-only diagnostics snapshot for the voice transport.
// Contains NO secrets: no API keys, no client secrets, no project ids,
// no authorization headers. Never rendered in the customer-facing UI.
// ============================================================

export interface VoiceDiagnostics {
  /** Model resolved by the edge function (server-side authoritative). */
  model: string | null;
  /** "env" | "default" as reported by the server. */
  modelSource: string | null;
  /** Transport used for the session. */
  connectionMethod: "webrtc" | null;
  /** Last known engine state label. */
  sessionState: string | null;
  /** Last safe (non-sensitive) error code. */
  lastErrorCode: string | null;
  /** RTCDataChannel readyState. */
  dataChannelState: string | null;
}

const snapshot: VoiceDiagnostics = {
  model: null,
  modelSource: null,
  connectionMethod: null,
  sessionState: null,
  lastErrorCode: null,
  dataChannelState: null,
};

const listeners = new Set<(d: VoiceDiagnostics) => void>();

export function setVoiceDiagnostics(patch: Partial<VoiceDiagnostics>): void {
  Object.assign(snapshot, patch);
  const copy = { ...snapshot };
  listeners.forEach((fn) => fn(copy));
}

export function getVoiceDiagnostics(): VoiceDiagnostics {
  return { ...snapshot };
}

export function subscribeVoiceDiagnostics(fn: (d: VoiceDiagnostics) => void): () => void {
  listeners.add(fn);
  fn({ ...snapshot });
  return () => listeners.delete(fn);
}
