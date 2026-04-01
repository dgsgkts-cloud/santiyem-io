const VisaLogo = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="60" height="38" viewBox="0 0 60 38" role="img" aria-label="Visa">
    <rect width="60" height="38" rx="4" fill="#1A1F71"/>
    <text x="50%" y="56%" dominantBaseline="middle" textAnchor="middle" fill="white" fontFamily="Arial" fontSize="16" fontWeight="bold" fontStyle="italic">VISA</text>
  </svg>
);

const MastercardLogo = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="60" height="38" viewBox="0 0 60 38" role="img" aria-label="Mastercard">
    <rect width="60" height="38" rx="4" fill="#252525"/>
    <circle cx="23" cy="19" r="11" fill="#EB001B"/>
    <circle cx="37" cy="19" r="11" fill="#F79E1B"/>
    <path d="M30 10.5 a11 11 0 0 1 0 17 a11 11 0 0 1 0-17z" fill="#FF5F00"/>
  </svg>
);

const IyzicoLogo = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="100" height="38" viewBox="0 0 100 38" role="img" aria-label="iyzico ile öde">
    <rect width="100" height="38" rx="4" fill="#FFFFFF"/>
    <text x="50%" y="56%" dominantBaseline="middle" textAnchor="middle" fill="#1A1F71" fontFamily="Arial" fontSize="13" fontWeight="bold">iyzico ile öde</text>
  </svg>
);

export const PaymentLogos = () => (
  <div className="flex items-center gap-2">
    <VisaLogo />
    <MastercardLogo />
    <IyzicoLogo />
  </div>
);

export const PaymentLogoBand = () => (
  <div className="flex flex-col items-center gap-3 py-4">
    <PaymentLogos />
    <p className="text-[11px] text-center" style={{ color: "#475569" }}>
      Tüm ödemeler iyzico Ödeme Hizmetleri A.Ş. güvencesiyle 256-bit SSL şifreleme ile korunmaktadır.
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
      Tüm ödemeler iyzico Ödeme Hizmetleri A.Ş. güvencesiyle işlenmektedir.
    </p>
  </div>
);

export default PaymentLogoBand;
