import { useState } from "react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

const TABS = [
  { id: "ai", label: "AI Asistan" },
  { id: "projects", label: "Proje Yönetimi" },
  { id: "hakedis", label: "Hakediş" },
  { id: "photo", label: "Fotoğraf Analizi" },
  { id: "calc", label: "Hesap Araçları" },
];

const MOCK_CONTENT: Record<string, { lines: { label: string; value: string; color: string }[] }> = {
  ai: { lines: [
    { label: "Soru", value: "TBDY 2018'e göre DD-2 deprem düzeyi nedir?", color: "#FF6B2B" },
    { label: "Yanıt", value: "DD-2, 475 yıl tekrarlanma periyoduna sahip standart tasarım depremi...", color: "#10B981" },
    { label: "Kaynak", value: "TBDY 2018 Madde 2.2", color: "#3B82F6" },
  ]},
  projects: { lines: [
    { label: "Proje", value: "Arsuz Villa — İlerleme: %67", color: "#FF6B2B" },
    { label: "Durum", value: "Kaba inşaat tamamlandı, ince işler devam ediyor", color: "#10B981" },
    { label: "Uyarı", value: "2 görev gecikmiş — Elektrik tesisatı, Sıva", color: "#EF4444" },
  ]},
  hakedis: { lines: [
    { label: "Dönem", value: "Mart 2026 — 3. Hakediş", color: "#FF6B2B" },
    { label: "Tutar", value: "₺1.245.000 + KDV ₺249.000", color: "#10B981" },
    { label: "Durum", value: "Onay bekliyor — PDF hazır", color: "#3B82F6" },
  ]},
  photo: { lines: [
    { label: "Tespit", value: "Segregasyon — Orta risk", color: "#EF4444" },
    { label: "Konum", value: "B blok, 3. kat kolon", color: "#FF6B2B" },
    { label: "Öneri", value: "Vibratör süresini artırın, karışım oranını kontrol edin", color: "#10B981" },
  ]},
  calc: { lines: [
    { label: "TAKS", value: "0.40 — Uygun", color: "#10B981" },
    { label: "KAKS", value: "2.07 — Sınır aşımı!", color: "#EF4444" },
    { label: "Maks İnşaat", value: "1.240 m² — 3 kat", color: "#3B82F6" },
  ]},
};

const DemoSection = () => {
  const [active, setActive] = useState("ai");
  const { ref, isVisible } = useScrollAnimation();
  const content = MOCK_CONTENT[active];

  return (
    <section id="demo" className="py-24 px-6" style={{ background: "#0F1419" }}>
      <div ref={ref} className={`max-w-5xl mx-auto transition-all duration-700 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
        <div className="text-center mb-12">
          <span className="text-xs font-semibold uppercase tracking-widest mb-3 block" style={{ color: "#FF6B2B" }}>DEMO</span>
          <h2 className="text-3xl md:text-[40px] font-bold text-white mb-3" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Platformu Keşfedin</h2>
          <p style={{ color: "#94A3B8" }}>Gerçek kullanıcıların gördüğü arayüz</p>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setActive(t.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${active === t.id ? "text-white" : ""}`}
              style={{
                background: active === t.id ? "rgba(255,107,43,0.15)" : "transparent",
                color: active === t.id ? "#FF6B2B" : "#64748B",
                border: `1px solid ${active === t.id ? "rgba(255,107,43,0.3)" : "#1E2732"}`
              }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Mock screen */}
        <div className="rounded-xl border overflow-hidden" style={{ background: "#161C23", borderColor: "#1E2732", boxShadow: "0 20px 60px rgba(0,0,0,0.4)" }}>
          <div className="flex items-center gap-1.5 px-4 py-2.5 border-b" style={{ borderColor: "#1E2732" }}>
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#FF5F57" }} />
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#FEBC2E" }} />
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#28C840" }} />
            <span className="ml-3 text-xs" style={{ color: "#475569" }}>MühendisAI — {TABS.find(t => t.id === active)?.label}</span>
          </div>
          <div className="p-8 min-h-[240px] transition-all duration-300">
            <div className="space-y-4">
              {content.lines.map((line, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="text-xs font-mono px-2 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.05)", color: "#64748B" }}>{line.label}</span>
                  <span className="text-sm" style={{ color: line.color }}>{line.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default DemoSection;
