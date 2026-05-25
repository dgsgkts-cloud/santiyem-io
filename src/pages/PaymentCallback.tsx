import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { parsePaymentCallback } from "@/lib/paymentCallbackSchema";

/**
 * iyzico → bu sayfa (Back URL bridge).
 * - Native: santiyem://payment-callback?... deep link'ine yönlendirir.
 * - Web: doğrudan /odeme-sonucu sayfasına yönlendirir.
 *
 * Parametreler doğrulanır; eksik/bozuk gelirse güvenli fallback ile
 * status=failed olarak ödeme sonucu sayfasına yönlenir.
 */
const PaymentCallback = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [bridging, setBridging] = useState(false);

  const parsed = useMemo(() => parsePaymentCallback(params), [params]);

  // Sadece doğrulanmış parametreleri yeni URL'e koy
  const safeQs = useMemo(() => {
    const s = new URLSearchParams({ status: parsed.status });
    if (parsed.message) s.set("message", parsed.message);
    if (parsed.native) s.set("native", "1");
    return s.toString();
  }, [parsed]);

  const shouldDeepLink = parsed.native || Capacitor.isNativePlatform();

  useEffect(() => {
    if (shouldDeepLink) {
      const deepLink = `santiyem://payment-callback?${safeQs}`;
      setBridging(true);
      try {
        window.location.href = deepLink;
      } catch (e) {
        console.error("[PaymentCallback] deep link failed", e);
      }
      const t = setTimeout(() => {
        navigate(`/odeme-sonucu?${safeQs}`, { replace: true });
      }, 2500);
      return () => clearTimeout(t);
    }

    navigate(`/odeme-sonucu?${safeQs}`, { replace: true });
  }, [shouldDeepLink, navigate, safeQs]);

  const success = parsed.status === "success";

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
          {bridging ? "Uygulamaya dönülüyor…" : "Yönlendiriliyorsunuz, lütfen bekleyin."}
        </p>
        {!parsed.valid && (
          <p className="text-xs text-amber-400">
            Ödeme yanıtı eksik veya bozuk geldi. Aboneliğiniz değişmedi.
          </p>
        )}
        {parsed.message && (
          <p className="text-xs text-white/50">{parsed.message}</p>
        )}
        {bridging && (
          <a
            href={`santiyem://payment-callback?${safeQs}`}
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
