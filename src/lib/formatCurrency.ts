/**
 * Türkçe para formatı: 7500000 → "7.500.000 ₺"
 * Boş veya geçersiz değerlerde girdiyi olduğu gibi döner.
 */
export function formatCurrency(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  const raw = typeof value === "number" ? value : String(value).trim();

  if (typeof raw === "string") {
    const cleaned = raw.replace(/[₺\s]/g, "").replace(/\./g, "").replace(",", ".");
    const num = Number(cleaned);
    if (!isFinite(num) || cleaned === "" || /[a-zA-Z]/.test(raw)) return raw;
    return `${num.toLocaleString("tr-TR", { maximumFractionDigits: 2 })} ₺`;
  }

  return `${raw.toLocaleString("tr-TR", { maximumFractionDigits: 2 })} ₺`;
}

/**
 * Tooltip için tam tutar — finans bileşenlerinde tek ortak format.
 * Örn: 1547230 → "₺1.547.230", -1234 → "-₺1.234"
 */
export function formatCurrencyFull(n: number): string {
  if (!isFinite(n)) return "₺0";
  const sign = n < 0 ? "-" : "";
  const abs = Math.round(Math.abs(n));
  return `${sign}₺${abs.toLocaleString("tr-TR")}`;
}

/**
 * Kart içine sığan kısaltılmış tutar.
 * 1.5M / 250K formatı, negatifleri destekler.
 */
export function formatCurrencyShort(n: number): string {
  if (!isFinite(n)) return "₺0";
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${sign}₺${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}₺${Math.round(abs / 1_000)}K`;
  return `${sign}₺${Math.round(abs).toLocaleString("tr-TR")}`;
}

/** Yüzde — kısaltılmış (>%999 sınırı). */
export function formatPercent(p: number): string {
  const abs = Math.abs(Math.round(p));
  if (abs > 999) return ">%999";
  return `%${abs}`;
}

/** Yüzde — tam (tooltip için). */
export function formatPercentFull(p: number): string {
  return `%${Math.round(p)}`;
}
