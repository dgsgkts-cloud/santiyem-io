/**
 * Binds payment callback query parameters to the checkout that created them.
 *
 * Without this, iyzico's public callback URL accepts any caller-supplied
 * txnId/subId, so a payer could point a cheap (or 1 TL trial) payment at a
 * different pending transaction and unlock a pricier plan for free.
 *
 * The signature is an HMAC-SHA256 over the canonical, ordered parameter list
 * using a server-side key that never leaves the edge runtime.
 */

const SIGNING_KEY =
  Deno.env.get("PAYMENT_CALLBACK_SIGNING_KEY") ||
  Deno.env.get("IYZICO_SECRET_KEY") ||
  "";

function toHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function canonicalPayload(parts: (string | number | null | undefined)[]): string {
  return parts.map((p) => (p === null || p === undefined ? "" : String(p))).join("|");
}

export async function signCallbackParams(
  parts: (string | number | null | undefined)[],
): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(SIGNING_KEY),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(canonicalPayload(parts)));
  return toHex(sig);
}

/** Length-safe, timing-safe-ish comparison. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function verifyCallbackSignature(
  parts: (string | number | null | undefined)[],
  signature: string | null,
): Promise<boolean> {
  if (!signature || !SIGNING_KEY) return false;
  const expected = await signCallbackParams(parts);
  return safeEqual(expected.toLowerCase(), signature.toLowerCase());
}

/**
 * iyzico echoes back the basketId we sent at checkout initialisation.
 * It must match the transaction row we are about to mark as paid.
 */
export function basketMatchesTransaction(
  iyzicoData: { basketId?: string | null; conversationId?: string | null },
  txnId: string,
): boolean {
  const basketId = iyzicoData?.basketId ?? null;
  if (basketId) return String(basketId) === txnId;
  // Fallback: conversationId is the first 20 chars of the txnId.
  const conv = iyzicoData?.conversationId ?? null;
  if (conv) return txnId.startsWith(String(conv));
  return false;
}
