// ============================================================
// Communication Hub — dispatch bridge (Sprint 34.1)
// Binds the pure dispatch core to the EXISTING provider registry.
// ============================================================

import { getProvider } from "./providers.ts";
import { classifyFailure, normalizeResult, safeError } from "./dispatchCore.ts";
import type { CommMessage } from "./types.ts";
import type { NormalizedResult } from "./dispatchCore.ts";

export * from "./dispatchCore.ts";

/** Send one message through the existing provider registry. */
export async function sendThroughRegistry(msg: CommMessage): Promise<NormalizedResult> {
  const provider = getProvider(msg.channel);
  if (!provider) {
    return {
      ok: false,
      provider: msg.channel,
      status: "failed",
      retryable: false,
      error_code: "unsupported_channel",
      error_message: `Desteklenmeyen kanal: ${msg.channel}`,
    };
  }
  try {
    const res = await provider.sendMessage(msg);
    return normalizeResult(res);
  } catch (err) {
    const message = safeError((err as Error).message) || "Sağlayıcı hatası";
    const { retryable, code } = classifyFailure(message, true);
    return {
      ok: false,
      provider: provider.name,
      status: retryable ? "retrying" : "failed",
      retryable,
      error_code: code,
      error_message: message,
    };
  }
}
