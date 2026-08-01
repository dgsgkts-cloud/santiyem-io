// ============================================================
// src/lib/voice/haptics.ts
// Sprint 32.3 — mobile-only, deliberately sparse haptic feedback.
// Moments: wake detected, conversation started/ended, mic toggled.
// ============================================================

import { Capacitor } from "@capacitor/core";

type HapticMoment = "wake" | "start" | "end" | "mute" | "unmute";

const PATTERN: Record<HapticMoment, number | number[]> = {
  wake: 14,
  start: 10,
  end: [8, 40, 8],
  mute: 12,
  unmute: 8,
};

function isMobile(): boolean {
  if (typeof window === "undefined") return false;
  if (Capacitor.isNativePlatform?.()) return true;
  return window.matchMedia?.("(pointer: coarse)").matches === true;
}

/** Soft vibration. No-ops on desktop and where vibration is unsupported. */
export function voiceHaptic(moment: HapticMoment): void {
  if (!isMobile()) return;
  try {
    navigator.vibrate?.(PATTERN[moment]);
  } catch { /* haptics are best-effort */ }
}
