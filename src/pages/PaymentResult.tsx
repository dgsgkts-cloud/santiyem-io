import { useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { CheckCircle, XCircle } from "lucide-react";

const PaymentResult = () => {
  const [params] = useSearchParams();
  const status = params.get("status");
  const message = params.get("message");
  const isSuccess = status === "success";

  // No auto-reload; user navigates back manually

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "#0F1419" }}>
      <div className="max-w-md w-full text-center p-8 rounded-2xl" style={{ background: "#161C23", border: "1px solid #1E2732" }}>
        {isSuccess ? (
          <>
            <CheckCircle size={64} className="mx-auto mb-4" style={{ color: "#22C55E" }} />
            <h1 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Ödeme Başarılı! 🎉
            </h1>
            <p className="mb-6" style={{ color: "#94A3B8" }}>
              Planınız başarıyla güncellendi. Tüm premium özelliklere erişebilirsiniz.
            </p>
          </>
        ) : (
          <>
            <XCircle size={64} className="mx-auto mb-4" style={{ color: "#EF4444" }} />
            <h1 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Ödeme Başarısız
            </h1>
            <p className="mb-2" style={{ color: "#94A3B8" }}>
              Ödeme işlemi tamamlanamadı.
            </p>
            {message && (
              <p className="text-sm mb-6 px-4 py-2 rounded-lg" style={{ background: "rgba(239,68,68,0.1)", color: "#FCA5A5" }}>
                {message}
              </p>
            )}
          </>
        )}
        <Link
          to="/"
          className="inline-block px-6 py-3 rounded-lg font-medium text-white transition-opacity hover:opacity-90"
          style={{ background: "#FF6B2B" }}
        >
          {isSuccess ? "Uygulamaya Dön" : "Tekrar Dene"}
        </Link>
      </div>
    </div>
  );
};

export default PaymentResult;
