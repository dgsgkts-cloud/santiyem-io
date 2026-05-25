import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { App as CapacitorApp } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { toast } from "sonner";
import { handleNativeBrowserClosed, markPaymentResultReceived } from "@/lib/iyzicoCheckout";

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

        const u = new URL(url);
        const pathWithQuery = `${u.host || ""}${u.pathname || ""}`.replace(/^\/+/, "");
        const isPaymentResult =
          pathWithQuery.includes("odeme-sonucu") ||
          pathWithQuery.includes("payment-callback") ||
          u.pathname.includes("odeme-sonucu") ||
          u.pathname.includes("payment-callback");

        if (isPaymentResult) {
          markPaymentResultReceived();
          const status = u.searchParams.get("status");
          const message = u.searchParams.get("message");
          if (status === "success") {
            toast.success(message ? decodeURIComponent(message) : "Ödeme başarılı, aboneliğiniz aktif edildi");
          } else {
            toast.error(message ? decodeURIComponent(message) : "Ödeme başarısız oldu, lütfen tekrar deneyin");
          }
          const qs = u.search || "";
          navigate(`/odeme-sonucu${qs}`);
        }
      } catch (err) {
        console.error("[DeepLink] handler error", err);
      }
    });

    // Detect user-cancelled checkout: system browser closed without a deep link.
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
