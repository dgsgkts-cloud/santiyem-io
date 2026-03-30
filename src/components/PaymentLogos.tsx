const VisaLogo = () => (
  <svg viewBox="0 0 48 16" height="20">
    <text x="0" y="14" fontFamily="Arial" fontSize="14" fontWeight="bold" fill="#1A1F71">VISA</text>
  </svg>
);

const MasterCardLogo = () => (
  <svg viewBox="0 0 40 24" height="22">
    <circle cx="14" cy="12" r="10" fill="#EB001B" />
    <circle cx="26" cy="12" r="10" fill="#F79E1B" />
    <path d="M20 4.6a10 10 0 000 14.8 10 10 0 000-14.8z" fill="#FF5F00" />
  </svg>
);

const IyzicoLogo = () => (
  <span className="font-bold text-sm px-2 py-1 rounded" style={{ color: "#1A1F71", backgroundColor: "#f0f0f0" }}>
    iyzico ile öde
  </span>
);

export const PaymentLogoBand = () => (
  <div className="flex flex-col items-center gap-3 py-4">
    <div className="flex items-center gap-4 flex-wrap justify-center">
      <VisaLogo />
      <MasterCardLogo />
      <IyzicoLogo />
      <span className="flex items-center gap-1 text-xs font-medium" style={{ color: "#22C55E" }}>
        🔒 SSL Güvenli
      </span>
    </div>
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

export default PaymentLogoBand;
