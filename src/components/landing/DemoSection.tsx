import { useState } from "react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

const TABS = [
  { id: "hakedis", label: "Hakediş" },
  { id: "projects", label: "Proje Yönetimi" },
  { id: "ai", label: "AI Asistan" },
  { id: "santiye", label: "Şantiye Günlüğü" },
];

const DemoSection = () => {
  const [active, setActive] = useState("hakedis");
  const { ref, isVisible } = useScrollAnimation();

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
            <span className="ml-3 text-xs" style={{ color: "#475569" }}>Şantiyem — {TABS.find(t => t.id === active)?.label}</span>
          </div>
          <div className="p-6 md:p-8 min-h-[280px] transition-all duration-300">
            {active === "hakedis" && <HakedisDemo />}
            {active === "projects" && <ProjectsDemo />}
            {active === "ai" && <AIDemo />}
            {active === "santiye" && <SantiyeDemo />}
            {active === "calc" && <CalcDemo />}
          </div>
        </div>
      </div>
    </section>
  );
};

const HakedisDemo = () => (
  <div className="space-y-4">
    <p className="text-sm font-semibold" style={{ color: "#F1F5F9" }}>Hakediş #3 — Akdeniz Residence</p>
    <div className="space-y-2.5">
      {[
        { label: "Bu Hakediş Toplamı", value: "₺485.000", color: "#F1F5F9" },
        { label: "KDV (%20)", value: "₺97.000", color: "#94A3B8" },
        { label: "Stopaj (%3)", value: "-₺17.460", color: "#94A3B8" },
        { label: "Net Ödenecek", value: "₺564.540", color: "#22C55E", bold: true },
      ].map((r, i) => (
        <div key={i} className="flex items-center justify-between">
          <span className="text-xs" style={{ color: "#64748B" }}>{r.label}</span>
          <span className={`text-sm font-mono ${r.bold ? "font-bold" : "font-medium"}`} style={{ color: r.color }}>{r.value}</span>
        </div>
      ))}
    </div>
    <div className="rounded-lg px-3 py-2 mt-3" style={{ backgroundColor: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
      <p className="text-xs" style={{ color: "#EF4444" }}>⚠️ Bu hakediş 32 gündür ödenmedi — Yasal faiz: ₺8.234</p>
    </div>
    <div className="flex items-center gap-2 mt-2">
      <span className="text-xs font-medium px-3 py-1.5 rounded-lg" style={{ backgroundColor: "#FF6B2B", color: "#fff" }}>PDF İndir</span>
      <span className="text-xs font-medium px-3 py-1.5 rounded-lg" style={{ backgroundColor: "#1E2732", color: "#F1F5F9" }}>İhtarname Oluştur</span>
    </div>
  </div>
);

const ProjectsDemo = () => (
  <div className="space-y-3">
    {[
      { name: "Villa Projesi — Çeşme", pct: 75, status: "Devam Ediyor", statusColor: "#22C55E", barColor: "#FF6B2B" },
      { name: "AVM İnşaatı — Ankara", pct: 42, status: "Gecikmiş", statusColor: "#EF4444", barColor: "#EF4444" },
      { name: "Konut Projesi — İstanbul", pct: 91, status: "Tamamlanıyor", statusColor: "#F59E0B", barColor: "#22C55E" },
    ].map((p, i) => (
      <div key={i} className="rounded-lg p-3" style={{ backgroundColor: "#0F1419", border: "1px solid #1E2732" }}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium" style={{ color: "#F1F5F9" }}>{p.name}</span>
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-md" style={{ backgroundColor: `${p.statusColor}15`, color: p.statusColor }}>{p.status}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 rounded-full" style={{ backgroundColor: "#1E2732" }}>
            <div className="h-full rounded-full" style={{ backgroundColor: p.barColor, width: `${p.pct}%` }} />
          </div>
          <span className="text-[11px] font-mono font-semibold" style={{ color: "#94A3B8" }}>%{p.pct}</span>
        </div>
      </div>
    ))}
  </div>
);

const AIDemo = () => (
  <div className="space-y-4">
    <div className="flex items-start gap-3">
      <span className="text-xs font-mono px-2 py-0.5 rounded shrink-0" style={{ background: "rgba(255,255,255,0.05)", color: "#64748B" }}>Soru</span>
      <span className="text-sm" style={{ color: "#FF6B2B" }}>Akdeniz Residence projesinde bu ay en çok harcama hangi kalemde?</span>
    </div>
    <div className="flex items-start gap-3">
      <span className="text-xs font-mono px-2 py-0.5 rounded shrink-0" style={{ background: "rgba(255,255,255,0.05)", color: "#64748B" }}>Yanıt</span>
      <span className="text-sm" style={{ color: "#10B981" }}>Akdeniz Residence projesinde Eylül ayı verilerine göre en yüksek gider İşçilik kalemi olup toplam giderin %43'ünü oluşturmaktadır (₺186.000). Bunu Malzeme (%31, ₺134.000) ve Taşeron (%18, ₺78.000) izlemektedir.</span>
    </div>
    <div className="flex items-start gap-3">
      <span className="text-xs font-mono px-2 py-0.5 rounded shrink-0" style={{ background: "rgba(255,255,255,0.05)", color: "#64748B" }}>Kaynak</span>
      <span className="text-sm" style={{ color: "#3B82F6" }}>Proje Gider Analizi — Eylül 2025</span>
    </div>
  </div>
);

const SantiyeDemo = () => (
  <div className="space-y-4">
    <div className="flex items-center justify-between">
      <p className="text-sm font-semibold" style={{ color: "#F1F5F9" }}>Villa Projesi — 2 Nisan 2025</p>
      <div className="flex items-center gap-2 text-xs" style={{ color: "#94A3B8" }}>
        <span>☀️ Güneşli</span>
        <span>•</span>
        <span>24 işçi</span>
        <span>•</span>
        <span style={{ color: "#22C55E" }}>Normal çalışma</span>
      </div>
    </div>
    <div className="space-y-3">
      <div className="rounded-lg p-3" style={{ backgroundColor: "#0F1419", border: "1px solid #1E2732" }}>
        <p className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: "#64748B" }}>Yapılan İşler</p>
        <p className="text-sm" style={{ color: "#F1F5F9" }}>Zemin kat güney cephe kalıpları tamamlandı.</p>
      </div>
      <div className="rounded-lg p-3" style={{ backgroundColor: "#0F1419", border: "1px solid #1E2732" }}>
        <p className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: "#64748B" }}>Malzeme</p>
        <div className="flex items-center gap-4">
          <span className="text-sm" style={{ color: "#F1F5F9" }}>Çimento <span style={{ color: "#FF6B2B" }}>12 çuval</span></span>
          <span className="text-sm" style={{ color: "#F1F5F9" }}>Demir <span style={{ color: "#FF6B2B" }}>2 ton</span></span>
        </div>
      </div>
      <div className="rounded-lg p-3" style={{ backgroundColor: "#0F1419", border: "1px solid #1E2732" }}>
        <p className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: "#64748B" }}>Fotoğraf</p>
        <div className="flex items-center gap-2">
          {[1,2,3,4].map(i => (
            <div key={i} className="w-10 h-10 rounded-md flex items-center justify-center text-[10px]" style={{ backgroundColor: "#1E2732", color: "#64748B" }}>📷</div>
          ))}
          <span className="text-[11px]" style={{ color: "#64748B" }}>4 fotoğraf eklendi</span>
        </div>
      </div>
    </div>
  </div>
);

const CalcDemo = () => (
  <div className="space-y-4">
    {[
      { label: "TAKS", value: "0.40 — Uygun", color: "#10B981" },
      { label: "KAKS", value: "2.07 — Sınır aşımı!", color: "#EF4444" },
      { label: "Maks İnşaat", value: "1.240 m² — 3 kat", color: "#3B82F6" },
    ].map((line, i) => (
      <div key={i} className="flex items-start gap-3">
        <span className="text-xs font-mono px-2 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.05)", color: "#64748B" }}>{line.label}</span>
        <span className="text-sm" style={{ color: line.color }}>{line.value}</span>
      </div>
    ))}
  </div>
);

export default DemoSection;
