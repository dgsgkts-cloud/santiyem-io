import { useEffect, useState } from "react";
import { WifiOff, Wifi } from "lucide-react";

/**
 * Uygulama genelinde bağlantı bandı.
 * Çevrimdışına düşünce koyu turuncu bant belirir; bağlantı geri geldiğinde
 * kısaca yeşil onay bantı gösterir ve otomatik kaybolur.
 */
export const OfflineBanner = () => {
  const [online, setOnline] = useState(
    typeof navigator === "undefined" ? true : navigator.onLine
  );
  const [showRecovered, setShowRecovered] = useState(false);

  useEffect(() => {
    const goOnline = () => {
      setOnline(true);
      setShowRecovered(true);
      const t = window.setTimeout(() => setShowRecovered(false), 2500);
      return () => window.clearTimeout(t);
    };
    const goOffline = () => {
      setOnline(false);
      setShowRecovered(false);
    };
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  if (online && !showRecovered) return null;

  const isOffline = !online;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-0 inset-x-0 z-[60] pointer-events-none flex justify-center"
    >
      <div
        className="mt-2 pointer-events-auto inline-flex items-center gap-2 px-4 py-2 rounded-full text-[12.5px] font-medium shadow-lg"
        style={{
          background: isOffline ? "#7c2d12" : "#166534",
          color: "#ffffff",
          border: `1px solid ${isOffline ? "#ea580c" : "#22c55e"}`,
        }}
      >
        {isOffline ? (
          <>
            <WifiOff className="w-3.5 h-3.5" />
            <span>Bağlantı kesildi. Yeniden bağlanmaya çalışılıyor…</span>
          </>
        ) : (
          <>
            <Wifi className="w-3.5 h-3.5" />
            <span>Bağlantı yeniden kuruldu.</span>
          </>
        )}
      </div>
    </div>
  );
};

export default OfflineBanner;
