// ============================================================
// src/lib/voice/micPermission.ts
// Browser permission state is the ONLY source of truth for the
// microphone. Nothing here caches "granted" in localStorage, and
// nothing here calls getUserMedia — that happens exclusively when
// the user starts a voice session.
// ============================================================

export type MicPermission = "granted" | "prompt" | "denied" | "unsupported";

/** Constraints applied to every voice-session microphone capture. */
export const MIC_AUDIO_CONSTRAINTS: MediaTrackConstraints = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
};

/**
 * Reads the live microphone permission from the Permissions API.
 * Returns "unsupported" where the descriptor is unavailable (Firefox,
 * older Safari) — callers must then treat it like "prompt".
 */
export async function queryMicPermission(): Promise<MicPermission> {
  if (typeof navigator === "undefined" || !navigator.permissions?.query) return "unsupported";
  try {
    const status = await navigator.permissions.query({ name: "microphone" as PermissionName });
    if (status.state === "granted" || status.state === "denied" || status.state === "prompt") {
      return status.state;
    }
    return "unsupported";
  } catch {
    return "unsupported";
  }
}

/** Subscribes to permission changes (revoked / granted from browser UI). */
export function onMicPermissionChange(cb: (p: MicPermission) => void): () => void {
  if (typeof navigator === "undefined" || !navigator.permissions?.query) return () => {};
  let status: PermissionStatus | null = null;
  let cancelled = false;
  const handler = () => {
    if (status) cb(status.state as MicPermission);
  };
  navigator.permissions
    .query({ name: "microphone" as PermissionName })
    .then((s) => {
      if (cancelled) return;
      status = s;
      s.addEventListener("change", handler);
    })
    .catch(() => { /* descriptor unsupported */ });
  return () => {
    cancelled = true;
    status?.removeEventListener("change", handler);
  };
}
