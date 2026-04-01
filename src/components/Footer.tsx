import { Link } from "react-router-dom";
import { PaymentLogos } from "@/components/PaymentLogos";

const Footer = () => (
  <footer className="shrink-0 mt-auto" style={{ borderTop: "1px solid #1E2732", backgroundColor: "#0A0E13" }}>
    {/* Desktop: single row 52px */}
    <div className="hidden lg:flex items-center justify-between px-6" style={{ height: 52 }}>
      <span className="text-xs" style={{ color: "#475569" }}>© 2026 MühendisAI. Tüm hakları saklıdır.</span>
      <div className="flex items-center gap-1 text-xs" style={{ color: "#475569" }}>
        <Link to="/kullanim-sartlari" className="hover:text-[#94A3B8] transition-colors">Kullanım Şartları</Link>
        <span>·</span>
        <Link to="/gizlilik-politikasi" className="hover:text-[#94A3B8] transition-colors">Gizlilik</Link>
        <span>·</span>
        <Link to="/mesafeli-satis-sozlesmesi" className="hover:text-[#94A3B8] transition-colors">Mesafeli Satış</Link>
        <span>·</span>
        <Link to="/teslimat-iade" className="hover:text-[#94A3B8] transition-colors">İade</Link>
        <span>·</span>
        <Link to="/hakkimizda" className="hover:text-[#94A3B8] transition-colors">Hakkımızda</Link>
        <span>·</span>
        <Link to="/iletisim" className="hover:text-[#94A3B8] transition-colors">İletişim</Link>
      </div>
    </div>

    {/* Tablet: stacked center */}
    <div className="hidden md:flex lg:hidden flex-col items-center gap-2 px-5 py-4" style={{ color: "#475569" }}>
      <div className="flex items-center gap-1 text-xs flex-wrap justify-center">
        <Link to="/kullanim-sartlari" className="hover:text-[#94A3B8] transition-colors">Kullanım Şartları</Link>
        <span>·</span>
        <Link to="/gizlilik-politikasi" className="hover:text-[#94A3B8] transition-colors">Gizlilik</Link>
        <span>·</span>
        <Link to="/mesafeli-satis-sozlesmesi" className="hover:text-[#94A3B8] transition-colors">Mesafeli Satış</Link>
        <span>·</span>
        <Link to="/teslimat-iade" className="hover:text-[#94A3B8] transition-colors">İade</Link>
        <span>·</span>
        <Link to="/hakkimizda" className="hover:text-[#94A3B8] transition-colors">Hakkımızda</Link>
        <span>·</span>
        <Link to="/iletisim" className="hover:text-[#94A3B8] transition-colors">İletişim</Link>
      </div>
      <span className="text-xs">© 2026 MühendisAI. Tüm hakları saklıdır.</span>
    </div>

    {/* Mobile: stacked center, smaller */}
    <div className="flex md:hidden flex-col items-center gap-1.5 px-4 py-4" style={{ color: "#475569" }}>
      <div className="flex items-center gap-1 text-[11px] flex-wrap justify-center">
        <Link to="/kullanim-sartlari" className="hover:text-[#94A3B8] transition-colors">Kullanım Şartları</Link>
        <span>·</span>
        <Link to="/gizlilik-politikasi" className="hover:text-[#94A3B8] transition-colors">Gizlilik</Link>
        <span>·</span>
        <Link to="/mesafeli-satis-sozlesmesi" className="hover:text-[#94A3B8] transition-colors">Mesafeli Satış</Link>
      </div>
      <div className="flex items-center gap-1 text-[11px] flex-wrap justify-center">
        <Link to="/teslimat-iade" className="hover:text-[#94A3B8] transition-colors">İade</Link>
        <span>·</span>
        <Link to="/hakkimizda" className="hover:text-[#94A3B8] transition-colors">Hakkımızda</Link>
        <span>·</span>
        <Link to="/iletisim" className="hover:text-[#94A3B8] transition-colors">İletişim</Link>
      </div>
      <span className="text-[11px]">© 2026 MühendisAI. Tüm hakları saklıdır.</span>
    </div>

    {/* Payment logos + Company info */}
    <div className="flex flex-col items-center gap-2 px-6 py-3" style={{ borderTop: "1px solid #1E2732" }}>
      <div className="flex items-center gap-2">
        <PaymentLogos />
      </div>
      <p className="text-[10px]" style={{ color: "#475569" }}>Ödemeler iyzico güvencesiyle 256-bit SSL ile korunmaktadır.</p>
    </div>
    <div className="text-center px-6 py-2" style={{ borderTop: "1px solid #1E2732", color: "#334155", fontSize: 10 }}>
      Göktaş Global Mühendislik İnşaat İç ve Dış Tic. Lim. Şirketi | MERSİS: 0406071938000001 | Uluçınar Mah. 12 Özgürkent Sk. No:4 Arsuz / Hatay | info@goktasglobal.com
    </div>
  </footer>
);

export default Footer;
