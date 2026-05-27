import { parsePaymentCallback, type ParsedPaymentCallback } from "./paymentCallbackSchema";

export type DeepLinkAction =
  | { kind: "ignore" }
  | { kind: "invalid-url" }
  | { kind: "invalid-params"; target: string }
  | { kind: "navigate"; target: string; parsed: ParsedPaymentCallback };

/**
 * Pure routing logic for santiyem:// deep links. Returns the action the
 * DeepLinkHandler should take. No side effects — easy to unit test.
 */
export function resolveDeepLinkAction(rawUrl: string): DeepLinkAction {
  let u: URL;
  try {
    u = new URL(rawUrl);
  } catch {
    return { kind: "invalid-url" };
  }

  const pathWithQuery = `${u.host || ""}${u.pathname || ""}`.replace(/^\/+/, "");
  const isPaymentResult =
    pathWithQuery.includes("odeme-sonucu") ||
    pathWithQuery.includes("payment-callback") ||
    u.pathname.includes("odeme-sonucu") ||
    u.pathname.includes("payment-callback");

  if (!isPaymentResult) return { kind: "ignore" };

  const parsed = parsePaymentCallback(u.searchParams);

  if (!parsed.valid) {
    return { kind: "invalid-params", target: "/odeme-sonucu?status=failed" };
  }

  const safe = new URLSearchParams({ status: parsed.status });
  if (parsed.message) safe.set("message", parsed.message);
  return {
    kind: "navigate",
    target: `/odeme-sonucu?${safe.toString()}`,
    parsed,
  };
}
