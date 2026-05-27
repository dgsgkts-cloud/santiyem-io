import { parsePaymentCallback, type ParsedPaymentCallback } from "./paymentCallbackSchema";

export type DeepLinkAction =
  | { kind: "ignore" }
  | { kind: "invalid-url"; target: string }
  | { kind: "invalid-params"; target: string }
  | { kind: "navigate"; target: string; parsed: ParsedPaymentCallback };

/** Güvenli fallback hedefi — her zaman /odeme-sonucu?status=failed. */
export const SAFE_FAILED_TARGET = "/odeme-sonucu?status=failed";

/**
 * Bazı Android sürümleri/launcher'lar `santiyem:/payment-callback` (tek slash)
 * veya boşluk içeren URL'ler üretebiliyor. URL constructor'a vermeden önce
 * normalize ediyoruz, böylece parse hatası yerine doğru rotaya düşüyoruz.
 */
function normalizeRawUrl(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // santiyem:/foo  →  santiyem://foo
  const singleSlashFix = trimmed.replace(
    /^([a-zA-Z][a-zA-Z0-9+.-]*):\/(?!\/)/,
    "$1://"
  );

  // URL içindeki kaçınılmamış boşlukları %20 yap (bazı OEM intent log'ları)
  return singleSlashFix.replace(/ /g, "%20");
}

/**
 * Pure routing logic for santiyem:// deep links. Returns the action the
 * DeepLinkHandler should take. No side effects — easy to unit test.
 *
 * Garanti: Payment-callback'i andıran HER eksik/bozuk URL için target her
 * zaman /odeme-sonucu?status=failed olur. Tamamen alakasız deep link'ler
 * (örn. paylaşım, oauth) ignore edilir.
 */
export function resolveDeepLinkAction(rawUrl: unknown): DeepLinkAction {
  const normalized = normalizeRawUrl(rawUrl);
  if (!normalized) {
    return { kind: "invalid-url", target: SAFE_FAILED_TARGET };
  }

  let u: URL;
  try {
    u = new URL(normalized);
  } catch {
    // Parse edilemeyen URL'de payment-callback ipucu varsa yine de güvenli sayfaya yönlendir
    if (/payment-callback|odeme-sonucu/i.test(normalized)) {
      return { kind: "invalid-url", target: SAFE_FAILED_TARGET };
    }
    return { kind: "invalid-url", target: SAFE_FAILED_TARGET };
  }

  const pathWithQuery = `${u.host || ""}${u.pathname || ""}`
    .replace(/^\/+/, "")
    .toLowerCase();
  const lowerPath = (u.pathname || "").toLowerCase();
  const isPaymentResult =
    pathWithQuery.includes("odeme-sonucu") ||
    pathWithQuery.includes("payment-callback") ||
    lowerPath.includes("odeme-sonucu") ||
    lowerPath.includes("payment-callback");

  if (!isPaymentResult) return { kind: "ignore" };

  const parsed = parsePaymentCallback(u.searchParams);

  if (!parsed.valid) {
    return { kind: "invalid-params", target: SAFE_FAILED_TARGET };
  }

  const safe = new URLSearchParams({ status: parsed.status });
  if (parsed.message) safe.set("message", parsed.message);
  return {
    kind: "navigate",
    target: `/odeme-sonucu?${safe.toString()}`,
    parsed,
  };
}
