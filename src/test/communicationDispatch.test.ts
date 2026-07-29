// Sprint 34.1 — dispatcher retry/classification engine tests.
import { describe, it, expect } from "vitest";

import {
  classifyFailure,
  nextRetryAt,
  normalizeResult,
  safeError,
  MAX_ATTEMPTS,
} from "../../supabase/functions/_shared/communication/dispatchCore";

describe("retry classification", () => {
  it("treats 429 and 5xx as retryable", () => {
    expect(classifyFailure("HTTP 429 rate limited").retryable).toBe(true);
    expect(classifyFailure("HTTP 500 internal").retryable).toBe(true);
    expect(classifyFailure("HTTP 503").retryable).toBe(true);
    expect(classifyFailure("HTTP 408").retryable).toBe(true);
  });
  it("treats 4xx client errors and invalid recipients as permanent", () => {
    expect(classifyFailure("HTTP 400 bad request").retryable).toBe(false);
    expect(classifyFailure("HTTP 401 unauthorized").retryable).toBe(false);
    expect(classifyFailure("Invalid recipient 5xx").retryable).toBe(false);
    expect(classifyFailure("Geçersiz telefon").retryable).toBe(false);
  });
  it("treats network timeouts as retryable", () => {
    expect(classifyFailure("connection timeout").retryable).toBe(true);
  });
  it("defaults unknown errors to permanent", () => {
    expect(classifyFailure("weird thing").retryable).toBe(false);
  });
});

describe("backoff", () => {
  it("grows and stays bounded with jitter", () => {
    const now = new Date("2026-01-01T00:00:00Z");
    const mins = (n: number) => (nextRetryAt(n, now).getTime() - now.getTime()) / 60000;
    expect(mins(1)).toBeGreaterThan(0.7);
    expect(mins(1)).toBeLessThan(1.3);
    expect(mins(2)).toBeGreaterThan(mins(1));
    expect(mins(5)).toBeLessThanOrEqual(360 * 1.2);
    expect(MAX_ATTEMPTS).toBe(5);
  });
});

describe("result normalization", () => {
  it("marks successful provider sends as sent", () => {
    const r = normalizeResult({ success: true, provider: "smtp", provider_message_id: "x1" });
    expect(r).toMatchObject({ ok: true, status: "sent", provider_message_id: "x1" });
  });
  it("marks wa.me fallback as manual action required, never delivered", () => {
    const r = normalizeResult({ success: true, provider: "whatsapp-web", external_url: "https://wa.me/9055" });
    expect(r.status).toBe("manual_action_required");
    expect(r.fallback_url).toBe("https://wa.me/9055");
  });
  it("maps retryable failures to retrying", () => {
    const r = normalizeResult({ success: false, provider: "smtp", error: "HTTP 429", retryable: true });
    expect(r).toMatchObject({ ok: false, status: "retrying", retryable: true, error_code: "http_429" });
  });
  it("maps permanent failures to failed", () => {
    const r = normalizeResult({ success: false, provider: "smtp", error: "invalid recipient", retryable: true });
    expect(r.status).toBe("failed");
    expect(r.retryable).toBe(false);
  });
});

describe("secret redaction", () => {
  it("never leaks tokens", () => {
    const out = safeError("failed Bearer abc.def-123 api_key=supersecret");
    expect(out).not.toContain("supersecret");
    expect(out).not.toContain("abc.def-123");
  });
});
