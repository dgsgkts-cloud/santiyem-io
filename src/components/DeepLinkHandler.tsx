import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { App as CapacitorApp } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { toast } from "sonner";

/**
 * Listens for santiyem:// deep links opened from the iyzico checkout callback
 * (system browser → app). Closes the in-app browser and routes to /odeme-sonucu.
 */
const DeepLinkHandler = () => {
  const navigate = useNavigate();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const sub = CapacitorApp.addListener("appUrlOpen", async ({ url }) => {
      try {
        console.log("[DeepLink] appUrlOpen:", url);
        // Close the system browser if still open
        try { await Browser.close(); } catch {}

        const u = new URL(url);
        // Match: santiyem://odeme-sonucu... veya santiyem://payment-callback...
        const pathWithQuery = `${u.host || ""}${u.pathname || ""}`.replace(/^\/+/, "");
        const isPaymentResult =
          pathWithQuery.includes("odeme-sonucu") ||
          pathWithQuery.includes("payment-callback") ||
          u.pathname.includes("odeme-sonucu") ||
          u.pathname.includes("payment-callback");

        if (isPaymentResult) {
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

    return () => {
      sub.then((s) => s.remove()).catch(() => {});
    };
  }, [navigate]);

  return null;
};

export default DeepLinkHandler;
