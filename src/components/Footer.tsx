import { Link } from "react-router-dom";
import iyzicoFooterBand from "@/assets/iyzico-footer-band.png";

const Footer = () => (
  <footer className="border-t border-border bg-card/60 backdrop-blur-sm px-4 py-5 shrink-0">
    <div className="max-w-5xl mx-auto">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-4">
        {/* Left - Brand */}
        <div className="flex flex-col gap-1.5">
          <span className="font-bold text-sm text-foreground">MühendisAI</span>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Türk mimar, mühendis ve müteahhitler için yapay zeka destekli iş yönetim platformu.
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">
            © 2026 GÖKTAŞ GLOBAL MÜHENDİSLİK İNŞAAT İÇ VE DIŞ TİC. LİM. ŞİRKETİ. Tüm hakları saklıdır.
          </p>
        </div>

        {/* Middle - Links */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold text-foreground mb-0.5">Yasal</span>
          <Link to="/hakkimizda" className="text-[11px] text-muted-foreground hover:text-foreground transition-colors">Hakkımızda</Link>
          <Link to="/gizlilik-politikasi" className="text-[11px] text-muted-foreground hover:text-foreground transition-colors">Gizlilik Sözleşmesi</Link>
          <Link to="/kullanim-sartlari" className="text-[11px] text-muted-foreground hover:text-foreground transition-colors">Kullanım Şartları</Link>
          <Link to="/mesafeli-satis-sozlesmesi" className="text-[11px] text-muted-foreground hover:text-foreground transition-colors">Mesafeli Satış Sözleşmesi</Link>
          <Link to="/teslimat-iade" className="text-[11px] text-muted-foreground hover:text-foreground transition-colors">Teslimat ve İade</Link>
          <Link to="/iptal-iade-politikasi" className="text-[11px] text-muted-foreground hover:text-foreground transition-colors">İptal & İade Politikası</Link>
        </div>

        {/* Right - Trust badges + iyzico */}
        <div className="flex flex-col gap-2 items-start sm:items-end">
          <span className="text-[11px] font-semibold text-foreground mb-0.5">Güvenli Ödeme</span>
          <img src={iyzicoFooterBand} alt="iyzico ile güvenli ödeme" className="h-6 object-contain" />
          <span className="flex items-center gap-1 text-[11px]" style={{ color: "#22C55E" }}>
            🔒 256-bit SSL ile korumalı
          </span>
          <p className="text-[10px] text-muted-foreground">Ödemeler iyzico güvencesiyle</p>
        </div>
      </div>
    </div>
  </footer>
);

export default Footer;
