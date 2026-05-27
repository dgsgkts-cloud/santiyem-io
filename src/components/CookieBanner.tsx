import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Capacitor } from "@capacitor/core";

const CookieBanner = () => {
  const [visible, setVisible] = useState(false);
  const [hiding, setHiding] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("cookieConsent");
    if (!consent) setVisible(true);
  }, []);

  const accept = () => {
    setHiding(true);
    setTimeout(() => {
      localStorage.setItem("cookieConsent", "true");
      setVisible(false);
    }, 300);
  };

  if (!visible) return null;

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-[9999] transition-transform duration-300 ${hiding ? "translate-y-full" : "translate-y-0"}`}
      style={{
        backgroundColor: "#161C23",
        borderTop: "1px solid #1E2732",
        boxShadow: "0 -4px 20px rgba(0,0,0,0.4)",
      }}
    >
      {/* Desktop / Tablet */}
      <div className="hidden sm:flex items-center justify-between gap-4 px-6 py-4">
        <p className="text-[13px] max-w-[600px]" style={{ color: "#94A3B8" }}>
          🍪 Bu site, hizmet kalitesini artırmak amacıyla yalnızca zorunlu çerezler kullanmaktadır. Sitemizi kullanmaya devam ederek çerez politikamızı kabul etmiş sayılırsınız.
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
      <div className="flex sm:hidden flex-col gap-3 px-4 py-4">
        <p className="text-[13px]" style={{ color: "#94A3B8" }}>
          🍪 Bu site, hizmet kalitesini artırmak amacıyla yalnızca zorunlu çerezler kullanmaktadır. Sitemizi kullanmaya devam ederek çerez politikamızı kabul etmiş sayılırsınız.
        </p>
        <div className="flex items-center gap-3">
          <Link
            to="/gizlilik-politikasi"
            className="flex-1 text-center text-[13px] px-3 py-2 rounded-lg transition-colors"
            style={{ border: "1px solid #1E2732", color: "#64748B" }}
          >
            Gizlilik Politikası
          </Link>
          <button
            onClick={accept}
            className="flex-1 text-[13px] font-semibold px-4 py-2 rounded-lg text-white transition-opacity hover:opacity-90"
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
