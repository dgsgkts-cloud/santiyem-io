import { z } from "zod";

/**
 * iyzico → /payment-callback (web bridge) ve santiyem://payment-callback
 * (native deep link) için ortak parametre doğrulama şeması.
 *
 * - status: success | failed | canceled (failure→failed, cancel→canceled mapping).
 * - message: opsiyonel, maks. 500 karakter, kontrol karakterleri temizlenir.
 * - native: "1" veya yok.
 */
export const PaymentCallbackParamsSchema = z.object({
  status: z
    .enum(["success", "failure", "failed", "cancel", "canceled", "cancelled"])
    .catch("failed")
    .transform((s) => {
      if (s === "failure") return "failed" as const;
      if (s === "cancel" || s === "cancelled") return "canceled" as const;
      return s as "success" | "failed" | "canceled";
    }),
  message: z
    .string()
    .max(500)
    .optional()
    .transform((m) => (m ? sanitizeMessage(m) : undefined)),
  native: z.enum(["1"]).optional(),
});

export type PaymentCallbackParams = z.infer<typeof PaymentCallbackParamsSchema>;

function sanitizeMessage(raw: string): string {
  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    // bozuk URI encoding — ham haliyle devam et
  }
  // Kontrol karakterlerini ve HTML tag'lerini at, uzunluğu sınırla
  return decoded
    .replace(/[\x00-\x1F\x7F]/g, "")
    .replace(/<[^>]*>/g, "")
    .trim()
    .slice(0, 300);
}

export type PaymentCallbackStatus = "success" | "failed" | "canceled";

export interface ParsedPaymentCallback {
  status: PaymentCallbackStatus;
  message?: string;
  native: boolean;
  /** Şema doğrulamadan geçti mi (false ise bozuk/eksik parametre vardı). */
  valid: boolean;
}

/**
 * URLSearchParams veya plain object → güvenli parametre objesi.
 * Hatalı durumlarda valid=false ve status="failed" döner.
 */
export function parsePaymentCallback(
  input: URLSearchParams | Record<string, string | null | undefined>
): ParsedPaymentCallback {
  const obj: Record<string, string> = {};
  if (input instanceof URLSearchParams) {
    input.forEach((v, k) => {
      if (typeof v === "string") obj[k] = v;
    });
  } else {
    for (const [k, v] of Object.entries(input)) {
      if (typeof v === "string") obj[k] = v;
    }
  }

  const result = PaymentCallbackParamsSchema.safeParse(obj);
  if (!result.success) {
    return { status: "failed", native: obj.native === "1", valid: false };
  }
  const { status, message, native } = result.data;
  return {
    status,
    message,
    native: native === "1",
    valid: Boolean(obj.status),
  };
}
