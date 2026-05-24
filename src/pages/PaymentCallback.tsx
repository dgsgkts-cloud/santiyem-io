import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Capacitor } from "@capacitor/core";

/**
 * iyzico → bu sayfa (Back URL bridge).
 * - Native: santiyem://payment-callback?... deep link'ine yönlendirir.
 * - Web: doğrudan /odeme-sonucu sayfasına yönlendirir.
 */
const PaymentCallback = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [bridging, setBridging] = useState(false);

  const status = params.get("status") || "failed";
  const message = params.get("message") || "";
  const isNativeFlag = params.get("native") === "1";

  // Native uygulamadan açıldıysa (system browser içinde) deep link'i tetikle
  const shouldDeepLink = isNativeFlag || Capacitor.isNativePlatform();

  useEffect(() => {
    const qs = params.toString();

    if (shouldDeepLink) {
      const deepLink = `santiyem://payment-callback?${qs}`;
      setBridging(true);
      // Hemen deep link'i tetikle
      window.location.href = deepLink;
      // Fallback: 2 sn sonra hâlâ buradaysak web rotasına geç
      const t = setTimeout(() => {
        navigate(`/odeme-sonucu?${qs}`, { replace: true });
      }, 2500);
      return () => clearTimeout(t);
    }

    // Web: doğrudan ödeme sonucu sayfasına
    navigate(`/odeme-sonucu?${qs}`, { replace: true });
  }, [shouldDeepLink, navigate, params]);

  const success = status === "success";

  return (
    <div
      className="min-h-screen flex items-center justify-center px-6"
      style={{ background: "#0F1419", color: "#fff" }}
    >
      <div className="max-w-md w-full text-center space-y-4">
        <div className="mx-auto w-12 h-12 border-2 border-t-[#FF6B2B] border-[#1E2732] rounded-full animate-spin" />
        <h1 className="text-xl font-semibold">
          {success ? "Ödeme alındı" : "Ödeme tamamlanamadı"}
        </h1>
        <p className="text-sm text-white/70">
          {bridging
            ? "Uygulamaya dönülüyor…"
            : "Yönlendiriliyorsunuz, lütfen bekleyin."}
        </p>
        {message && (
          <p className="text-xs text-white/50">{decodeURIComponent(message)}</p>
        )}
        {bridging && (
          <a
            href={`santiyem://payment-callback?${params.toString()}`}
            className="inline-block text-sm text-[#FF6B2B] underline"
          >
            Uygulama açılmadıysa buraya tıklayın
          </a>
        )}
      </div>
    </div>
  );
};

export default PaymentCallback;
