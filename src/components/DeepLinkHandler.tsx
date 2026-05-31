import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { App as CapacitorApp } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { toast } from "sonner";
import { handleNativeBrowserClosed, markPaymentResultReceived } from "@/lib/iyzicoCheckout";
import { resolveDeepLinkAction, SAFE_FAILED_TARGET } from "@/lib/deepLinkRouting";

/**
 * Listens for santiyem:// deep links opened from the iyzico checkout callback
 * (system browser → app). Closes the in-app browser and routes to /odeme-sonucu.
 * Also detects user-cancelled checkouts (browser closed without callback).
 */
const DeepLinkHandler = () => {
  const navigate = useNavigate();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    /** Navigate hata verirse bile /odeme-sonucu?status=failed sayfasına düşmeyi garanti eder. */
    const safeNavigate = (target: string) => {
      try {
        navigate(target);
      } catch (e) {
        console.error("[DeepLink] navigate failed, hard redirect", e);
        try {
          window.location.assign(target);
        } catch {
          window.location.href = SAFE_FAILED_TARGET;
        }
      }
    };

    const urlSub = CapacitorApp.addListener("appUrlOpen", async ({ url }) => {
      try {
        console.log("[DeepLink] appUrlOpen:", url);
        try { await Browser.close(); } catch {}

        const action = resolveDeepLinkAction(url);

        if (action.kind === "ignore") return;

        // Project invitation deep link → land on /proje-davet/<token>.
        // InviteAccept page handles auth gating and post-accept routing,
        // so the invited user ends up in the role's dedicated screen.
        if (action.kind === "invite") {
          toast.success("Proje daveti açılıyor…");
          safeNavigate(action.target);
          return;
        }

        if (action.kind === "invalid-url") {
          console.warn("[DeepLink] invalid URL", url);
          markPaymentResultReceived();
          toast.error("Geçersiz ödeme yanıtı alındı, lütfen tekrar deneyin");
          safeNavigate(action.target);
          return;
        }

        markPaymentResultReceived();

        if (action.kind === "invalid-params") {
          console.warn("[DeepLink] missing/invalid params", url);
          toast.error("Ödeme yanıtı eksik veya bozuk geldi. Aboneliğiniz değişmedi, lütfen tekrar deneyin.");
          safeNavigate(action.target);
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
        safeNavigate(target);
      } catch (err) {
        console.error("[DeepLink] handler error", err);
        markPaymentResultReceived();
        toast.error("Ödeme yanıtı işlenemedi, lütfen tekrar deneyin");
        safeNavigate(SAFE_FAILED_TARGET);
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
