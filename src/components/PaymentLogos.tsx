import iyzicoLogoBand from "@/assets/iyzico-logo-band.svg";

export const PaymentLogos = () => (
  <div className="inline-flex items-center justify-center rounded-lg px-4 py-2" style={{ backgroundColor: "rgba(255,255,255,0.95)" }}>
    <img src={iyzicoLogoBand} alt="iyzico ile öde — Visa, Mastercard, American Express, Troy" className="h-6 md:h-7" />
  </div>
);

export const PaymentLogoBand = () => (
  <div className="flex flex-col items-center gap-3 py-4">
    <PaymentLogos />
    <p className="text-[11px] text-center" style={{ color: "#475569" }}>
      🔒 Tüm ödemeler iyzico güvencesiyle 256-bit SSL ile korunmaktadır.
    </p>
  </div>
);

export const TrustBadges = () => (
  <div className="w-full rounded-xl px-4 py-3 flex flex-wrap items-center justify-center gap-4 text-xs font-medium" style={{ backgroundColor: "#161C23", border: "1px solid #1E2732" }}>
    <span style={{ color: "#22C55E" }}>🔒 SSL Güvenli Ödeme</span>
    <span style={{ color: "#475569" }}>|</span>
    <span style={{ color: "#94A3B8" }}>🛡️ 256-bit Şifreleme</span>
    <span style={{ color: "#475569" }}>|</span>
    <span style={{ color: "#94A3B8" }}>✅ iyzico Güvencesi</span>
    <span style={{ color: "#475569" }}>|</span>
    <span style={{ color: "#94A3B8" }}>🔄 İstediğin Zaman İptal</span>
  </div>
);

export const PricingTrustBand = () => (
  <div className="w-full rounded-xl px-6 py-4 flex flex-col items-center gap-3" style={{ backgroundColor: "#161C23", borderTop: "1px solid #1E2732", borderBottom: "1px solid #1E2732" }}>
    <div className="flex items-center gap-3">
      <span className="text-sm font-medium" style={{ color: "#22C55E" }}>🔒 SSL Güvenli</span>
      <PaymentLogos />
    </div>
    <p className="text-[11px] text-center" style={{ color: "#475569" }}>
      Tüm ödemeler iyzico güvencesiyle 256-bit SSL ile korunmaktadır.
    </p>
  </div>
);

export default PaymentLogoBand;
