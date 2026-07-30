import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Cookie } from "lucide-react";

import { Capacitor } from "@capacitor/core";
import { useUser } from "@/contexts/UserContext";

const CookieBanner = () => {
  const { user, loading } = useUser();
  const [visible, setVisible] = useState(false);
  const [hiding, setHiding] = useState(false);

  useEffect(() => {
    if (Capacitor.isNativePlatform() || loading || user) return;
    const consent = localStorage.getItem("cookieConsent");
    if (!consent) setVisible(true);
  }, [loading, user]);

  const accept = () => {
    setHiding(true);
    setTimeout(() => {
      localStorage.setItem("cookieConsent", "true");
      setVisible(false);
    }, 300);
  };

  if (Capacitor.isNativePlatform() || loading || user || !visible) return null;

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-[9999] transition-transform duration-300 pointer-events-none ${hiding ? "translate-y-full" : "translate-y-0"}`}
    >
      {/* Desktop / Tablet */}
      <div
        className="hidden sm:flex items-center justify-between gap-4 px-6 py-4 pointer-events-auto"
        style={{
          backgroundColor: "#161C23",
          borderTop: "1px solid #1E2732",
          boxShadow: "0 -4px 20px rgba(0,0,0,0.4)",
        }}
      >
        <p className="flex items-center gap-2.5 text-[13px] max-w-[620px]" style={{ color: "#94A3B8" }}>
          <Cookie className="w-4 h-4 shrink-0" style={{ color: "#FF6B2B" }} aria-hidden="true" />
          <span>
            Yalnızca zorunlu çerezler kullanıyoruz. Siteyi kullanmaya devam ederek çerez politikamızı
            kabul etmiş olursunuz.
          </span>
        </p>
        <div className="flex items-center gap-3 shrink-0">
          <Link
            to="/gizlilik-politikasi"
            className="text-[13px] px-3 py-1.5 rounded-lg border border-border hover-muted-text"
          >
            Gizlilik Politikası
          </Link>
          <button
            onClick={accept}
            className="text-[13px] font-semibold px-4 py-1.5 rounded-lg text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: "#FF6B2B" }}
          >
            Kabul Et
          </button>
        </div>
      </div>

      {/* Mobile */}
      <div
        className="flex sm:hidden flex-col gap-3 px-5 pt-4 pointer-events-auto"
        style={{
          backgroundColor: "#161C23",
          borderTop: "1px solid #1E2732",
          boxShadow: "0 -4px 20px rgba(0,0,0,0.4)",
          paddingBottom: "max(env(safe-area-inset-bottom, 0px), 16px)",
        }}
      >
        <p className="flex items-start gap-2.5 text-[13px] leading-relaxed" style={{ color: "#94A3B8" }}>
          <Cookie className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "#FF6B2B" }} aria-hidden="true" />
          <span>Yalnızca zorunlu çerezler kullanıyoruz. Devam ederek kabul etmiş olursunuz.</span>
        </p>
        <div className="flex items-center gap-3">
          <Link
            to="/gizlilik-politikasi"
            className="flex-1 flex items-center justify-center min-h-[44px] text-center text-[13px] px-3 rounded-lg transition-colors"
            style={{ border: "1px solid #1E2732", color: "#94A3B8" }}
          >
            Gizlilik Politikası
          </Link>
          <button
            onClick={accept}
            className="flex-1 min-h-[44px] text-[13px] font-semibold px-4 rounded-lg text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: "#FF6B2B" }}
          >
            Kabul Et
          </button>
        </div>
      </div>

    </div>
  );
};

export default CookieBanner;
