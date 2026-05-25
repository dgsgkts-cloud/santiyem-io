import { z } from "zod";

/**
 * iyzico → /payment-callback (web bridge) ve santiyem://payment-callback
 * (native deep link) için ortak parametre doğrulama şeması.
 *
 * - status: yalnızca "success" | "failure" | "failed" kabul edilir.
 * - message: opsiyonel, maks. 500 karakter, kontrol karakterleri temizlenir.
 * - native: "1" veya yok.
 */
export const PaymentCallbackParamsSchema = z.object({
  status: z
    .enum(["success", "failure", "failed"])
    .catch("failed")
    .transform((s) => (s === "failure" ? "failed" : s)),
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

export interface ParsedPaymentCallback {
  status: "success" | "failed";
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
    status: status === "success" ? "success" : "failed",
    message,
    native: native === "1",
    valid: Boolean(obj.status), // status hiç yoksa eksik kabul et
  };
}
