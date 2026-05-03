/**
 * Türkçe para formatı: 7500000 → "7.500.000 ₺"
 * Boş veya geçersiz değerlerde girdiyi olduğu gibi döner.
 */
export function formatCurrency(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  const raw = typeof value === "number" ? value : String(value).trim();

  // Eğer string ise: sadece rakam + virgül/nokta/boşluk içeriyorsa parse et,
  // değilse kullanıcı zaten formatlamış (örn: "₺2.8M") — olduğu gibi göster.
  if (typeof raw === "string") {
    const cleaned = raw.replace(/[₺\s]/g, "").replace(/\./g, "").replace(",", ".");
    const num = Number(cleaned);
    if (!isFinite(num) || cleaned === "" || /[a-zA-Z]/.test(raw)) return raw;
    return `${num.toLocaleString("tr-TR", { maximumFractionDigits: 2 })} ₺`;
  }

  return `${raw.toLocaleString("tr-TR", { maximumFractionDigits: 2 })} ₺`;
}
