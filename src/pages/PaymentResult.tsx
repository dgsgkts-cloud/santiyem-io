import { useEffect, useMemo, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { CheckCircle, XCircle, Loader2, AlertTriangle } from "lucide-react";
import { cleanupIyzicoOverlay } from "@/lib/iyzicoCleanup";
import { parsePaymentCallback } from "@/lib/paymentCallbackSchema";
import {
  verifySubscriptionActivation,
  isActivePlan,
  type SubscriptionVerification,
} from "@/lib/verifySubscription";

type View = "success" | "failed" | "pending" | "mismatch";

const PaymentResult = () => {
  const [params] = useSearchParams();
  const parsed = useMemo(() => parsePaymentCallback(params), [params]);
  const callbackSuccess = parsed.status === "success";

  const [verification, setVerification] = useState<SubscriptionVerification>({ state: "verifying" });

  useEffect(() => {
    cleanupIyzicoOverlay();
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const result = await verifySubscriptionActivation({ timeoutMs: callbackSuccess ? 15000 : 4000 });
      if (!cancelled) setVerification(result);
    })();
    return () => {
      cancelled = true;
    };
  }, [callbackSuccess]);

  // Görünüm kararı: gerçek abonelik durumu birincil otoritedir.
  const view: View = useMemo(() => {
    if (verification.state === "verifying") return "pending";
    if (verification.state === "active") return "success";
    if (callbackSuccess) return "mismatch"; // iyzico OK dedi ama DB henüz aktif değil
    return "failed";
  }, [verification, callbackSuccess]);

  const message = parsed.valid
    ? parsed.message
    : "Ödeme yanıtı eksik veya bozuk geldi. Aboneliğiniz değişmedi.";

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "#0F1419" }}>
      <div
        className="max-w-md w-full text-center p-8 rounded-2xl"
        style={{ background: "#161C23", border: "1px solid #1E2732" }}
      >
        {view === "pending" && <PendingView />}
        {view === "success" && (
          <SuccessView
            plan={verification.state === "active" ? verification.plan : undefined}
          />
        )}
        {view === "mismatch" && <MismatchView />}
        {view === "failed" && <FailedView message={message} />}

        <Link
          to="/"
          className="inline-block px-6 py-3 rounded-lg font-medium text-white transition-opacity hover:opacity-90"
          style={{ background: "#FF6B2B" }}
        >
          {view === "success" ? "Uygulamaya Dön" : view === "pending" ? "Bekleyin…" : "Tekrar Dene"}
        </Link>

        {view === "mismatch" && (
          <p className="mt-4 text-xs" style={{ color: "#94A3B8" }}>
            Sorun devam ederse{" "}
            <a href="https://wa.me/905333771156" className="underline" style={{ color: "#FF6B2B" }}>
              destek ekibimizle iletişime geçin
            </a>
            .
          </p>
        )}
      </div>
    </div>
  );
};

const PendingView = () => (
  <>
    <Loader2 size={56} className="mx-auto mb-4 animate-spin" style={{ color: "#FF6B2B" }} />
    <h1 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
      Aboneliğiniz doğrulanıyor…
    </h1>
    <p className="mb-6" style={{ color: "#94A3B8" }}>
      Ödemeniz alındı, abonelik aktivasyonunu kontrol ediyoruz. Bu işlem birkaç saniye sürebilir.
    </p>
  </>
);

const SuccessView = ({ plan }: { plan?: string }) => (
  <>
    <CheckCircle size={64} className="mx-auto mb-4" style={{ color: "#22C55E" }} />
    <h1 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
      Ödeme Başarılı! 🎉
    </h1>
    <p className="mb-6" style={{ color: "#94A3B8" }}>
      {plan && isActivePlan(plan)
        ? `${planLabel(plan)} planınız aktif edildi. Tüm premium özelliklere erişebilirsiniz.`
        : "Planınız başarıyla güncellendi. Tüm premium özelliklere erişebilirsiniz."}
    </p>
  </>
);

const MismatchView = () => (
  <>
    <AlertTriangle size={64} className="mx-auto mb-4" style={{ color: "#F59E0B" }} />
    <h1 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
      Ödeme alındı, aktivasyon bekleniyor
    </h1>
    <p className="mb-2" style={{ color: "#94A3B8" }}>
      Ödemeniz başarıyla alındı ancak aboneliğiniz henüz aktif görünmüyor.
    </p>
    <p
      className="text-sm mb-6 px-4 py-2 rounded-lg"
      style={{ background: "rgba(245,158,11,0.1)", color: "#FCD34D" }}
    >
      Sistem birkaç dakika içinde otomatik güncellenir. Lütfen sayfayı yenileyin veya tekrar giriş yapın.
    </p>
  </>
);

const FailedView = ({ message }: { message?: string }) => (
  <>
    <XCircle size={64} className="mx-auto mb-4" style={{ color: "#EF4444" }} />
    <h1 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
      Ödeme Başarısız
    </h1>
    <p className="mb-2" style={{ color: "#94A3B8" }}>
      Ödeme işlemi tamamlanamadı, aboneliğiniz değişmedi.
    </p>
    {message && (
      <p
        className="text-sm mb-6 px-4 py-2 rounded-lg"
        style={{ background: "rgba(239,68,68,0.1)", color: "#FCA5A5" }}
      >
        {message}
      </p>
    )}
  </>
);

function planLabel(plan: string): string {
  switch (plan) {
    case "pro":
      return "Profesyonel";
    case "team":
      return "Ekip";
    case "enterprise":
      return "Kurumsal";
    case "plus":
      return "Plus";
    case "office_pro":
      return "Ofis Pro";
    case "office_custom":
      return "Ofis Özel";
    default:
      return plan;
  }
}

export default PaymentResult;
