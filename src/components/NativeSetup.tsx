import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Capacitor } from "@capacitor/core";

/**
 * Native-only setup: status bar, splash screen, Android back button, keyboard scroll-into-view.
 * No-op on web.
 */
const NativeSetup = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let backSub: { remove: () => void } | null = null;
    let kbShowSub: { remove: () => void } | null = null;

    (async () => {
      // Status bar
      try {
        const { StatusBar, Style } = await import("@capacitor/status-bar");
        await StatusBar.setStyle({ style: Style.Dark });
        if (Capacitor.getPlatform() === "android") {
          await StatusBar.setBackgroundColor({ color: "#0F1419" });
        }
        await StatusBar.setOverlaysWebView({ overlay: false });
      } catch (e) {
        console.warn("[native] StatusBar setup failed", e);
      }

      // Splash screen
      try {
        const { SplashScreen } = await import("@capacitor/splash-screen");
        await SplashScreen.hide();
      } catch (e) {
        console.warn("[native] SplashScreen.hide failed", e);
      }

      // Android hardware back button
      try {
        const { App: CapacitorApp } = await import("@capacitor/app");
        const sub = await CapacitorApp.addListener("backButton", ({ canGoBack }) => {
          if (canGoBack && window.history.length > 1) {
            navigate(-1);
          } else {
            const ok = window.confirm("Uygulamadan çıkmak istiyor musunuz?");
            if (ok) CapacitorApp.exitApp();
          }
        });
        backSub = sub;
      } catch (e) {
        console.warn("[native] back button setup failed", e);
      }

      // Keyboard — ensure focused input stays visible
      try {
        const { Keyboard } = await import("@capacitor/keyboard");
        const sub = await Keyboard.addListener("keyboardDidShow", () => {
          const el = document.activeElement as HTMLElement | null;
          if (el && typeof el.scrollIntoView === "function") {
            setTimeout(() => {
              try {
                el.scrollIntoView({ behavior: "smooth", block: "center" });
              } catch {}
            }, 100);
          }
        });
        kbShowSub = sub;
      } catch (e) {
        console.warn("[native] Keyboard setup failed", e);
      }
    })();

    return () => {
      try { backSub?.remove(); } catch {}
      try { kbShowSub?.remove(); } catch {}
    };
  }, [navigate]);

  // Re-evaluate on route changes (no-op, but keeps listener fresh if needed)
  useEffect(() => {}, [location.pathname]);

  return null;
};

export default NativeSetup;
