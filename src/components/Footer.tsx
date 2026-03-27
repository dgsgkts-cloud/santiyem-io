import { Link } from "react-router-dom";

const Footer = () => (
  <footer className="border-t border-border bg-card/60 backdrop-blur-sm px-4 py-3 shrink-0">
    <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
      <span>© 2026 MühendisAI — Tüm hakları saklıdır.</span>
      <div className="flex items-center gap-3">
        <Link to="/kullanim-sartlari" className="hover:text-foreground transition-colors">Kullanım Şartları</Link>
        <span>|</span>
        <Link to="/gizlilik-politikasi" className="hover:text-foreground transition-colors">Gizlilik Politikası</Link>
        <span>|</span>
        <Link to="/iptal-iade-politikasi" className="hover:text-foreground transition-colors">İptal & İade Politikası</Link>
      </div>
    </div>
  </footer>
);

export default Footer;
