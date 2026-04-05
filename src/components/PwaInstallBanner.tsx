import { useState, useEffect } from "react";
import { X } from "lucide-react";

const STORAGE_KEY = "pwa_install_banner_dismissed";

const isIOS = () => {
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
};

const isAndroid = () => /Android/.test(navigator.userAgent);

const isMobile = () => isIOS() || isAndroid();

const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  (navigator as any).standalone === true;

const PwaInstallBanner = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isMobile() || isStandalone()) return;
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (!dismissed) setVisible(true);
  }, []);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  };

  if (!visible) return null;

  const ios = isIOS();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9999] p-2 pointer-events-none">
      <div
        className="pointer-events-auto mx-auto max-w-lg rounded-xl p-4 shadow-lg border flex items-start gap-3"
        style={{
          background: "hsl(var(--card))",
          borderColor: "hsl(var(--border))",
        }}
      >
        <span className="text-2xl mt-0.5">📱</span>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm" style={{ color: "hsl(var(--foreground))" }}>
            Uygulamayı Ana Ekrana Ekle
          </p>
          <p className="text-xs mt-1" style={{ color: "hsl(var(--muted-foreground))" }}>
            {ios
              ? 'Alttaki paylaş butonuna (⬆️) dokunun → "Ana Ekrana Ekle" seçin'
              : 'Tarayıcı menüsüne (⋮) dokunun → "Ana Ekrana Ekle" seçin'}
          </p>
        </div>
        <button
          onClick={dismiss}
          className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold text-white"
          style={{ background: "#FF6B2B" }}
        >
          Tamam
        </button>
        <button
          onClick={dismiss}
          className="shrink-0 p-1 rounded-md"
          style={{ color: "hsl(var(--muted-foreground))" }}
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};

export default PwaInstallBanner;
