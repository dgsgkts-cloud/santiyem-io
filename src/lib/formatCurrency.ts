/**
 * Türkçe para formatı: 7500000 → "7.500.000 ₺"
 * Geçersiz, boş veya NaN değerlerde "0 ₺" döner — asla crash vermez.
 */
export function formatCurrency(value: string | number | null | undefined): string {
  const ZERO = "0 ₺";
  try {
    if (value === null || value === undefined) return ZERO;

    let num: number;
    if (typeof value === "number") {
      num = value;
    } else {
      const trimmed = String(value).trim();
      if (trimmed === "") return ZERO;
      const cleaned = trimmed.replace(/[₺\s]/g, "").replace(/\./g, "").replace(",", ".");
      if (cleaned === "" || /[a-zA-Z]/.test(trimmed)) return ZERO;
      num = Number(cleaned);
    }

    if (!Number.isFinite(num) || Number.isNaN(num)) return ZERO;
    if (Object.is(num, -0)) num = 0;

    const abs = Math.abs(num);
    const hasFraction = Math.abs(abs - Math.trunc(abs)) > 1e-9;
    const opts: Intl.NumberFormatOptions = hasFraction
      ? { minimumFractionDigits: 2, maximumFractionDigits: 2 }
      : { maximumFractionDigits: 0 };
    const sign = num < 0 ? "-" : "";
    return `${sign}${abs.toLocaleString("tr-TR", opts)} ₺`;
  } catch {
    return ZERO;
  }
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

/**
 * PDF/Excel exportları için 2 ondalıklı sayı (₺ olmadan).
 * Örn: 1234.5 → "1.234,50"
 */
export function formatNumber2(n: number): string {
  if (!isFinite(n)) return "0,00";
  return n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** PDF/Excel için tam sayı binlik ayraçlı (₺ olmadan). */
export function formatNumber0(n: number): string {
  if (!isFinite(n)) return "0";
  return Math.round(n).toLocaleString("tr-TR");
}

/**
 * PDF/Excel exportları için 2 ondalıklı para tutarı (₺ ile).
 * Örn: 1234.5 → "₺1.234,50"
 */
export function formatCurrency2(n: number): string {
  return `₺${formatNumber2(n)}`;
}
