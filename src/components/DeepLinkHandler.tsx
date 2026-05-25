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

        // URL parse — bozuksa güvenli düşüş
        let u: URL;
        try {
          u = new URL(url);
        } catch (e) {
          console.warn("[DeepLink] invalid URL", url, e);
          markPaymentResultReceived();
          toast.error("Geçersiz ödeme yanıtı alındı, lütfen tekrar deneyin");
          navigate("/odeme-sonucu?status=failed");
          return;
        }

        const pathWithQuery = `${u.host || ""}${u.pathname || ""}`.replace(/^\/+/, "");
        const isPaymentResult =
          pathWithQuery.includes("odeme-sonucu") ||
          pathWithQuery.includes("payment-callback") ||
          u.pathname.includes("odeme-sonucu") ||
          u.pathname.includes("payment-callback");

        if (!isPaymentResult) return;

        markPaymentResultReceived();

        const parsed = parsePaymentCallback(u.searchParams);

        if (!parsed.valid) {
          console.warn("[DeepLink] missing/invalid params", url);
          toast.error("Ödeme yanıtı eksik veya bozuk geldi. Aboneliğiniz değişmedi, lütfen tekrar deneyin.");
          navigate("/odeme-sonucu?status=failed");
          return;
        }

        if (parsed.status === "success") {
          toast.success(parsed.message || "Ödeme başarılı, aboneliğiniz aktif edildi");
        } else {
          toast.error(parsed.message || "Ödeme başarısız oldu, lütfen tekrar deneyin");
        }

        // Sadece şemadan geçen güvenli parametreleri ilet
        const safe = new URLSearchParams({ status: parsed.status });
        if (parsed.message) safe.set("message", parsed.message);
        navigate(`/odeme-sonucu?${safe.toString()}`);
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
