// ============================================================
// src/lib/voice/wake/WakeWordFactory.ts
// The ONLY place that knows which concrete wake-word engine
// exists. Swapping to Porcupine / OpenWakeWord / a custom local
// model happens here — UI and hooks never change.
// ============================================================

import { WebSpeechWakeWordEngine } from "./WebSpeechWakeWordEngine";
import type { WakeWordEngine, WakeWordProviderId } from "./wakeWordTypes";

/** Providers that are wired up today. Others fall back to the default. */
const IMPLEMENTED: WakeWordProviderId[] = ["webspeech"];

export function createWakeWordEngine(
  provider: WakeWordProviderId = "webspeech",
): WakeWordEngine {
  switch (provider) {
    case "webspeech":
      return new WebSpeechWakeWordEngine();

    // Reserved for future providers. Until they ship we return the
    // on-device default so enabling them can never break the UI.
    case "openai":
    case "porcupine":
    case "picovoice":
    case "openwakeword":
    case "custom":
    default:
      return new WebSpeechWakeWordEngine();
  }
}

export function isWakeWordProviderImplemented(p: WakeWordProviderId): boolean {
  return IMPLEMENTED.includes(p);
}

/** True when this browser can run wake-word detection at all. */
export function wakeWordSupported(provider?: WakeWordProviderId): boolean {
  const engine = createWakeWordEngine(provider);
  const ok = engine.supported;
  engine.destroy();
  return ok;
}
