import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";
import logo from "@/assets/muhendis-logo.png";

const NAV_LINKS = [
  { label: "Özellikler", href: "#features" },
  { label: "Nasıl Çalışır", href: "#how-it-works" },
  { label: "Fiyatlar", href: "#pricing" },
  { label: "SSS", href: "#faq" },
];

const LandingNavbar = () => {
  const [open, setOpen] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement.scrollHeight - window.innerHeight;
      setScrollProgress(h > 0 ? (window.scrollY / h) * 100 : 0);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollTo = (id: string) => {
    setOpen(false);
    document.querySelector(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      {/* Progress bar */}
      <div className="fixed top-0 left-0 w-full z-[1001] h-[2px]" style={{ marginTop: "env(safe-area-inset-top, 0px)" }}>
        <div className="h-full bg-[#FF6B2B] transition-all duration-150" style={{ width: `${scrollProgress}%` }} />
      </div>

      <nav
        className="fixed top-[2px] left-0 w-full z-[1000] border-b"
        style={{
          background: "rgba(15,20,25,0.85)",
          backdropFilter: "blur(12px)",
          borderColor: "rgba(255,255,255,0.06)",
          paddingTop: "env(safe-area-inset-top, 0px)",
        }}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 lg:px-12" style={{ height: 64 }}>
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <img src={logo} alt="Şantiyem" className="h-8 w-8" />
            <span className="font-bold text-white text-lg" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Şantiyem</span>
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map(l => (
              <button key={l.href} onClick={() => scrollTo(l.href)} className="text-sm transition-colors hover:text-white" style={{ color: "#94A3B8" }}>
                {l.label}
              </button>
            ))}
          </div>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-3">
            <Link to="/login" className="text-sm px-4 py-2 rounded-lg transition-colors hover:text-white" style={{ color: "#94A3B8" }}>
              Giriş Yap
            </Link>
            <Link to="/register" className="text-sm px-5 py-2 rounded-lg font-medium text-white transition-all hover:opacity-90" style={{ background: "#FF6B2B", borderRadius: 8 }}>
              14 Gün Ücretsiz Dene
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden text-white flex items-center justify-center relative z-[1002]"
            style={{ minWidth: 44, minHeight: 44 }}
            onClick={() => setOpen(!open)}
          >
            {open ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile dropdown */}
        {open && (
          <div className="md:hidden border-t px-6 py-4 flex flex-col gap-4" style={{ background: "rgba(15,20,25,0.95)", borderColor: "rgba(255,255,255,0.06)" }}>
            {NAV_LINKS.map(l => (
              <button key={l.href} onClick={() => scrollTo(l.href)} className="text-left text-sm" style={{ color: "#94A3B8" }}>
                {l.label}
              </button>
            ))}
            <div className="flex flex-col gap-2 pt-2 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              <Link to="/login" className="text-sm text-center py-2 rounded-lg" style={{ color: "#94A3B8" }}>Giriş Yap</Link>
              <Link to="/register" className="text-sm text-center py-2 rounded-lg font-medium text-white" style={{ background: "#FF6B2B" }}>14 Gün Ücretsiz Dene</Link>
            </div>
          </div>
        )}
      </nav>
    </>
  );
};

export default LandingNavbar;
