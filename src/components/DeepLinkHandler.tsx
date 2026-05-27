import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { App as CapacitorApp } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { toast } from "sonner";
import { handleNativeBrowserClosed, markPaymentResultReceived } from "@/lib/iyzicoCheckout";
import { parsePaymentCallback } from "@/lib/paymentCallbackSchema";

/**
 * Listens for santiyem:// deep links opened from the iyzico checkout callback
 * (system browser → app). Closes the in-app browser and routes to /odeme-sonucu.
 * Also detects user-cancelled checkouts (browser closed without callback).
 */
const DeepLinkHandler = () => {
  const navigate = useNavigate();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const urlSub = CapacitorApp.addListener("appUrlOpen", async ({ url }) => {
      try {
        console.log("[DeepLink] appUrlOpen:", url);
        try { await Browser.close(); } catch {}

        const action = resolveDeepLinkAction(url);

        if (action.kind === "invalid-url") {
          console.warn("[DeepLink] invalid URL", url);
          markPaymentResultReceived();
          toast.error("Geçersiz ödeme yanıtı alındı, lütfen tekrar deneyin");
          navigate("/odeme-sonucu?status=failed");
          return;
        }

        if (action.kind === "ignore") return;

        markPaymentResultReceived();

        if (action.kind === "invalid-params") {
          console.warn("[DeepLink] missing/invalid params", url);
          toast.error("Ödeme yanıtı eksik veya bozuk geldi. Aboneliğiniz değişmedi, lütfen tekrar deneyin.");
          navigate(action.target);
          return;
        }

        const { parsed, target } = action;
        if (parsed.status === "success") {
          toast.success(parsed.message || "Ödeme başarılı, aboneliğiniz aktif edildi");
        } else if (parsed.status === "canceled") {
          toast.info(parsed.message || "Ödeme iptal edildi. Aboneliğiniz değişmedi.");
        } else {
          toast.error(parsed.message || "Ödeme başarısız oldu, lütfen tekrar deneyin");
        }
        navigate(target);
      } catch (err) {
        console.error("[DeepLink] handler error", err);
        markPaymentResultReceived();
        toast.error("Ödeme yanıtı işlenemedi, lütfen tekrar deneyin");
        navigate("/odeme-sonucu?status=failed");
      }
    });

    const browserSub = Browser.addListener("browserFinished", () => {
      console.log("[DeepLink] browserFinished");
      handleNativeBrowserClosed();
    });

    return () => {
      urlSub.then((s) => s.remove()).catch(() => {});
      browserSub.then((s) => s.remove()).catch(() => {});
    };
  }, [navigate]);

  return null;
};

export default DeepLinkHandler;
