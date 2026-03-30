import iyzicoFooterBand from "@/assets/iyzico-footer-band.png";
import iyzicoCheckout from "@/assets/iyzico-checkout.png";

export const PaymentLogoBand = () => (
  <div className="flex flex-col items-center gap-3 py-4">
    <img src={iyzicoFooterBand} alt="iyzico ile güvenli ödeme - Visa, MasterCard" className="h-8 object-contain" />
    <p className="text-[11px] text-center" style={{ color: "#64748B" }}>
      Tüm ödemeler iyzico altyapısı ile 256-bit SSL şifreleme ile korunmaktadır.
    </p>
  </div>
);

export const TrustBadges = () => (
  <div className="w-full rounded-xl px-4 py-3 flex flex-wrap items-center justify-center gap-4 text-xs font-medium" style={{ backgroundColor: "#161C23", border: "1px solid #1E2732" }}>
    <span style={{ color: "#22C55E" }}>🔒 SSL Güvenli Ödeme</span>
    <span style={{ color: "#64748B" }}>|</span>
    <span style={{ color: "#94A3B8" }}>🛡️ 256-bit Şifreleme</span>
    <span style={{ color: "#64748B" }}>|</span>
    <span style={{ color: "#94A3B8" }}>✅ iyzico Güvencesi</span>
    <span style={{ color: "#64748B" }}>|</span>
    <span style={{ color: "#94A3B8" }}>🔄 İstediğin Zaman İptal</span>
  </div>
);

export const IyzicoCheckoutLogo = () => (
  <img src={iyzicoCheckout} alt="iyzico ile öde" className="h-8 object-contain" />
);

export default PaymentLogoBand;
