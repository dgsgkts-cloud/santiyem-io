/**
 * Teknik hataları kullanıcıya gösterilebilir Türkçe mesaja çevirir.
 * Stack trace, Supabase kodu, `Failed to fetch` gibi ham çıktıları asla
 * kullanıcıya sızdırmaz.
 *
 * Kullanım:
 *   toast.error(friendlyError(err));
 *   toast.error(friendlyError(err, "Proje kaydedilemedi"));
 */

const NETWORK_PATTERNS = [
  "failed to fetch",
  "networkerror",
  "network request failed",
  "load failed",
  "econnrefused",
  "err_network",
  "err_internet_disconnected",
];

const TIMEOUT_PATTERNS = ["timeout", "timed out", "aborted"];

const AUTH_PATTERNS = [
  "invalid login credentials",
  "email not confirmed",
  "invalid refresh token",
  "jwt expired",
  "not authenticated",
];

const PERMISSION_PATTERNS = [
  "row-level security",
  "permission denied",
  "not authorized",
  "insufficient_privilege",
];

const RATE_LIMIT_PATTERNS = ["rate limit", "too many requests", "429"];

const NOT_FOUND_PATTERNS = ["not found", "404", "no rows"];

const CONFLICT_PATTERNS = [
  "duplicate key",
  "unique constraint",
  "23505",
  "conflict",
];

type ErrorLike =
  | Error
  | { message?: string; code?: string; status?: number }
  | string
  | null
  | undefined;

export function friendlyError(err: ErrorLike, fallback = "Bir şeyler ters gitti. Lütfen tekrar deneyin."): string {
  if (!err) return fallback;

  const rawMessage =
    typeof err === "string"
      ? err
      : typeof err === "object" && err && "message" in err
        ? String((err as { message?: unknown }).message ?? "")
        : "";

  const status =
    typeof err === "object" && err && "status" in err
      ? Number((err as { status?: number }).status)
      : undefined;

  const code =
    typeof err === "object" && err && "code" in err
      ? String((err as { code?: string }).code ?? "")
      : "";

  const haystack = `${rawMessage} ${code} ${status ?? ""}`.toLowerCase();

  if (NETWORK_PATTERNS.some((p) => haystack.includes(p)) || (typeof navigator !== "undefined" && !navigator.onLine)) {
    return "Bağlantı sorunu. İnternetinizi kontrol edip tekrar deneyin.";
  }

  if (TIMEOUT_PATTERNS.some((p) => haystack.includes(p))) {
    return "İşlem beklenenden uzun sürdü. Lütfen tekrar deneyin.";
  }

  if (AUTH_PATTERNS.some((p) => haystack.includes(p)) || status === 401) {
    return "Oturumunuz sonlanmış. Lütfen yeniden giriş yapın.";
  }

  if (PERMISSION_PATTERNS.some((p) => haystack.includes(p)) || status === 403) {
    return "Bu işlem için yetkiniz yok.";
  }

  if (RATE_LIMIT_PATTERNS.some((p) => haystack.includes(p)) || status === 429) {
    return "Çok fazla istek gönderildi. Birkaç saniye bekleyip tekrar deneyin.";
  }

  if (CONFLICT_PATTERNS.some((p) => haystack.includes(p)) || status === 409) {
    return "Bu kayıt zaten mevcut.";
  }

  if (NOT_FOUND_PATTERNS.some((p) => haystack.includes(p)) || status === 404) {
    return "İstenen kayıt bulunamadı.";
  }

  if (status && status >= 500) {
    return "Sunucu şu an yanıt vermiyor. Kısa süre sonra tekrar deneyin.";
  }

  return fallback;
}

/**
 * Tarayıcı izin hataları için özel yönlendirme metinleri.
 */
export function permissionErrorMessage(
  kind: "camera" | "microphone" | "notifications" | "storage" | "location"
): string {
  switch (kind) {
    case "camera":
      return "Kamera izni verilmedi. Tarayıcı ayarlarından bu siteye kamera erişimi verin.";
    case "microphone":
      return "Mikrofon izni verilmedi. Tarayıcı ayarlarından bu siteye mikrofon erişimi verin.";
    case "notifications":
      return "Bildirim izni verilmedi. Tarayıcı ayarlarından bu siteye bildirim izni verebilirsiniz.";
    case "storage":
      return "Cihaz depolama izni verilmedi. Ayarlardan izin verip tekrar deneyin.";
    case "location":
      return "Konum izni verilmedi. Tarayıcı ayarlarından bu siteye konum erişimi verin.";
  }
}
