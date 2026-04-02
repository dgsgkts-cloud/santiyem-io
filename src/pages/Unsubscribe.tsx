import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

type Status = "loading" | "valid" | "already" | "invalid" | "success" | "error";

export default function Unsubscribe() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    if (!token) { setStatus("invalid"); return; }
    (async () => {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${token}`,
          { headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY } }
        );
        const data = await res.json();
        if (!res.ok) { setStatus("invalid"); return; }
        if (data.valid === false && data.reason === "already_unsubscribed") { setStatus("already"); return; }
        setStatus("valid");
      } catch { setStatus("invalid"); }
    })();
  }, [token]);

  const handleUnsubscribe = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("handle-email-unsubscribe", {
        body: { token },
      });
      if (error) { setStatus("error"); return; }
      if (data?.success) setStatus("success");
      else if (data?.reason === "already_unsubscribed") setStatus("already");
      else setStatus("error");
    } catch { setStatus("error"); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: "#0A0E13" }}>
      <div className="max-w-md w-full rounded-xl p-8 text-center" style={{ backgroundColor: "#111820", border: "1px solid #1E2732" }}>
        <h1 className="text-xl font-bold mb-2" style={{ color: "#F1F5F9" }}>
          <span style={{ color: "#FF6B2B" }}>Şantiyem</span>
        </h1>

        {status === "loading" && (
          <p className="text-sm mt-6" style={{ color: "#94A3B8" }}>Doğrulanıyor...</p>
        )}

        {status === "valid" && (
          <div className="mt-6 space-y-4">
            <p className="text-sm" style={{ color: "#94A3B8" }}>
              E-posta bildirimlerinden çıkmak istediğinizden emin misiniz?
            </p>
            <button
              onClick={handleUnsubscribe}
              className="w-full py-2.5 rounded-lg text-sm font-semibold text-white"
              style={{ backgroundColor: "#EF4444" }}
            >
              Abonelikten Çık
            </button>
          </div>
        )}

        {status === "success" && (
          <div className="mt-6 space-y-3">
            <p className="text-lg font-semibold" style={{ color: "#22C55E" }}>✓ Abonelikten çıkıldı</p>
            <p className="text-sm" style={{ color: "#94A3B8" }}>
              Artık bildirim e-postaları almayacaksınız.
            </p>
          </div>
        )}

        {status === "already" && (
          <div className="mt-6">
            <p className="text-sm" style={{ color: "#94A3B8" }}>
              Zaten abonelikten çıkmışsınız.
            </p>
          </div>
        )}

        {status === "invalid" && (
          <div className="mt-6">
            <p className="text-sm" style={{ color: "#EF4444" }}>
              Geçersiz veya süresi dolmuş bağlantı.
            </p>
          </div>
        )}

        {status === "error" && (
          <div className="mt-6">
            <p className="text-sm" style={{ color: "#EF4444" }}>
              Bir hata oluştu. Lütfen tekrar deneyin.
            </p>
          </div>
        )}

        <Link to="/" className="block mt-8 text-xs underline" style={{ color: "#64748B" }}>
          Ana sayfaya dön
        </Link>
      </div>
    </div>
  );
}
