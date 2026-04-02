import { Link } from "react-router-dom";
import { useSEO } from "@/hooks/useSEO";
import logo from "@/assets/muhendis-logo.png";

const NotFound = () => {
  useSEO({ title: "Sayfa Bulunamadı | Şantiyem" });

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4" style={{ background: "#0F1419" }}>
      <img src={logo} alt="Şantiyem Logo" width={64} height={64} className="mb-6" />
      <h1 className="text-5xl font-bold text-white mb-3" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>404</h1>
      <p className="text-lg text-white/80 mb-2">Sayfa Bulunamadı</p>
      <p className="text-sm mb-8 text-center max-w-md" style={{ color: "#94A3B8" }}>
        Aradığınız sayfa mevcut değil veya taşınmış olabilir.
      </p>
      <div className="flex items-center gap-4">
        <Link to="/" className="px-6 py-2.5 rounded-lg text-white font-semibold text-sm transition-all hover:opacity-90"
          style={{ background: "#FF6B2B" }}>
          Ana Sayfaya Dön
        </Link>
        <Link to="/login" className="px-6 py-2.5 rounded-lg text-sm font-medium border transition-all hover:bg-white hover:text-[#0F1419]"
          style={{ borderColor: "rgba(255,255,255,0.2)", color: "#fff" }}>
          Giriş Yap
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
