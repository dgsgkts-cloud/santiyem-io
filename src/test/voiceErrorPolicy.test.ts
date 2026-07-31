import { describe, expect, it } from "vitest";
import { isVoiceErrorRetryable, PERMANENT_VOICE_ERRORS } from "@/lib/voice/voiceTypes";

describe("voice error retry policy", () => {
  it("never auto-retries permanent configuration failures", () => {
    for (const kind of ["auth", "quota", "config", "mic_permission", "session_not_started"] as const) {
      expect(isVoiceErrorRetryable(kind)).toBe(false);
      expect(PERMANENT_VOICE_ERRORS).toContain(kind);
    }
  });

  it("auto-retries only temporary transport failures", () => {
    for (const kind of ["connection", "connection_lost", "timeout", "audio_playback"] as const) {
      expect(isVoiceErrorRetryable(kind)).toBe(true);
    }
  });
});
