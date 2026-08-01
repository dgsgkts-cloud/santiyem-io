import { describe, expect, it } from "vitest";
import {
  DEFAULT_REALTIME_MODEL,
  resolveRealtimeModel,
} from "../../supabase/functions/_shared/realtimeModel";
import { REALTIME_MODEL_DISPLAY_FALLBACK, OPENAI_REALTIME } from "@/lib/voice/voiceConfig";

const env = (v?: string) => () => v;

describe("realtime model resolution (server-side source of truth)", () => {
  it("uses the environment variable when present", () => {
    expect(resolveRealtimeModel(env("gpt-realtime-mini"))).toEqual({
      model: "gpt-realtime-mini",
      source: "env",
    });
  });

  it("falls back to the default when the variable is missing", () => {
    expect(resolveRealtimeModel(env(undefined))).toEqual({
      model: DEFAULT_REALTIME_MODEL,
      source: "default",
    });
  });

  it("trims whitespace around a configured value", () => {
    expect(resolveRealtimeModel(env("  gpt-realtime \n"))).toEqual({
      model: "gpt-realtime",
      source: "env",
    });
  });

  it("treats a whitespace-only value as unconfigured", () => {
    expect(resolveRealtimeModel(env("   "))).toEqual({
      model: DEFAULT_REALTIME_MODEL,
      source: "default",
    });
  });

  it("default model is gpt-realtime", () => {
    expect(DEFAULT_REALTIME_MODEL).toBe("gpt-realtime");
  });
});

describe("client config", () => {
  it("exposes no authoritative model field", () => {
    expect("model" in OPENAI_REALTIME).toBe(false);
  });

  it("keeps a non-authoritative display fallback only", () => {
    expect(REALTIME_MODEL_DISPLAY_FALLBACK).toBe("gpt-realtime");
  });
});
