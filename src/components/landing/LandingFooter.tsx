import { Link } from "react-router-dom";
import logo from "@/assets/muhendis-logo.png";

const LandingFooter = () => (
  <footer style={{ background: "#0A0E13", borderTop: "1px solid #1E2732" }}>
    <div className="max-w-6xl mx-auto px-6 py-16 grid grid-cols-1 md:grid-cols-4 gap-10">
      {/* Brand */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <img src={logo} alt="MühendisAI" className="h-7 w-7" />
          <span className="font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>MühendisAI</span>
        </div>
        <p className="text-xs leading-relaxed" style={{ color: "#64748B" }}>
          Türk mühendis, mimar ve müteahhitler için tasarlanmış yapay zeka destekli mesleki platform.
        </p>
      </div>

      {/* Ürün */}
      <div>
        <h4 className="text-sm font-semibold text-white mb-4">Ürün</h4>
        <div className="flex flex-col gap-2">
          {[
            { label: "Özellikler", href: "#features" },
            { label: "Fiyatlar", href: "#pricing" },
            { label: "Demo", href: "#demo" },
          ].map(l => (
            <a key={l.href} href={l.href} className="text-xs transition-colors hover:text-white" style={{ color: "#64748B" }}>
              {l.label}
            </a>
          ))}
        </div>
      </div>

      {/* Şirket */}
      <div>
        <h4 className="text-sm font-semibold text-white mb-4">Şirket</h4>
        <div className="flex flex-col gap-2">
          <Link to="/hakkimizda" className="text-xs transition-colors hover:text-white" style={{ color: "#64748B" }}>Hakkımızda</Link>
          <Link to="/iletisim" className="text-xs transition-colors hover:text-white" style={{ color: "#64748B" }}>İletişim</Link>
        </div>
      </div>

      {/* Yasal */}
      <div>
        <h4 className="text-sm font-semibold text-white mb-4">Yasal</h4>
        <div className="flex flex-col gap-2">
          <Link to="/kullanim-sartlari" className="text-xs transition-colors hover:text-white" style={{ color: "#64748B" }}>Kullanım Şartları</Link>
          <Link to="/gizlilik-politikasi" className="text-xs transition-colors hover:text-white" style={{ color: "#64748B" }}>Gizlilik</Link>
          <Link to="/mesafeli-satis-sozlesmesi" className="text-xs transition-colors hover:text-white" style={{ color: "#64748B" }}>Mesafeli Satış</Link>
          <Link to="/teslimat-iade" className="text-xs transition-colors hover:text-white" style={{ color: "#64748B" }}>İade</Link>
        </div>
      </div>
    </div>

    <div className="text-center px-6 py-3 border-t" style={{ borderColor: "#1E2732", color: "#334155", fontSize: 10 }}>
      © 2025 Göktaş Global Mühendislik İnşaat İç ve Dış Tic. Lim. Şirketi | MERSİS: 0406071938000001
    </div>
  </footer>
);

export default LandingFooter;
