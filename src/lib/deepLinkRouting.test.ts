import { describe, it, expect } from "vitest";
import { resolveDeepLinkAction } from "./deepLinkRouting";

describe("resolveDeepLinkAction", () => {
  it("invalid URL → invalid-url", () => {
    const r = resolveDeepLinkAction("not a url");
    expect(r.kind).toBe("invalid-url");
  });

  it("unrelated deep link → ignore", () => {
    const r = resolveDeepLinkAction("santiyem://something-else?foo=bar");
    expect(r.kind).toBe("ignore");
  });

  it("payment-callback host + status=success → navigate success", () => {
    const r = resolveDeepLinkAction("santiyem://payment-callback?status=success");
    expect(r.kind).toBe("navigate");
    if (r.kind !== "navigate") return;
    expect(r.parsed.status).toBe("success");
    expect(r.parsed.valid).toBe(true);
    expect(r.target).toBe("/odeme-sonucu?status=success");
  });

  it("status=failure → normalized to failed in target", () => {
    const r = resolveDeepLinkAction("santiyem://payment-callback?status=failure&message=Kart%20reddedildi");
    expect(r.kind).toBe("navigate");
    if (r.kind !== "navigate") return;
    expect(r.parsed.status).toBe("failed");
    expect(r.target).toContain("status=failed");
    expect(r.target).toContain("message=");
  });

  it("status=cancel → normalized to canceled", () => {
    const r = resolveDeepLinkAction("santiyem://payment-callback?status=cancel");
    expect(r.kind).toBe("navigate");
    if (r.kind !== "navigate") return;
    expect(r.parsed.status).toBe("canceled");
    expect(r.target).toBe("/odeme-sonucu?status=canceled");
  });

  it("missing status param → invalid-params with safe fallback", () => {
    const r = resolveDeepLinkAction("santiyem://payment-callback?foo=bar");
    expect(r.kind).toBe("invalid-params");
    if (r.kind !== "invalid-params") return;
    expect(r.target).toBe("/odeme-sonucu?status=failed");
  });

  it("path-based odeme-sonucu also matches", () => {
    const r = resolveDeepLinkAction("santiyem://x/odeme-sonucu?status=success");
    expect(r.kind).toBe("navigate");
  });

  it("native=1 flag is dropped from target (server flag, not UI)", () => {
    const r = resolveDeepLinkAction("santiyem://payment-callback?status=success&native=1");
    expect(r.kind).toBe("navigate");
    if (r.kind !== "navigate") return;
    expect(r.parsed.native).toBe(true);
    expect(r.target).toBe("/odeme-sonucu?status=success");
  });

  it("malicious message is sanitized in parsed payload", () => {
    const r = resolveDeepLinkAction(
      "santiyem://payment-callback?status=failed&message=" +
        encodeURIComponent("<script>alert(1)</script>Hata")
    );
    expect(r.kind).toBe("navigate");
    if (r.kind !== "navigate") return;
    expect(r.parsed.message).not.toContain("<");
    expect(r.parsed.message).not.toContain(">");
    expect(r.parsed.message).toContain("Hata");
    expect(r.target).not.toContain("<script>");
  });
});
