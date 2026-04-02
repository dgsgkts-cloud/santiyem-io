const ITEMS = [
  "MSY Yapı", "Murt İnşaat", "500+ Mühendis", "50+ Mimar Ofisi",
  "100+ Aktif Proje", "MSY Yapı", "Murt İnşaat",
  "500+ Mühendis", "50+ Mimar Ofisi", "100+ Aktif Proje",
];

const SocialProofBand = () => (
  <section id="social-proof" className="relative overflow-hidden py-6 border-y" style={{ background: "rgba(255,255,255,0.02)", borderColor: "#1E2732" }}>
    <p className="text-center text-xs mb-4" style={{ color: "#64748B" }}>
      Türkiye'nin önde gelen mühendislik firmalarının güvendiği platform
    </p>
    <div className="flex animate-[marquee_30s_linear_infinite] whitespace-nowrap">
      {ITEMS.map((item, i) => (
        <span key={i} className="mx-8 text-sm font-medium" style={{ color: "#475569" }}>{item}</span>
      ))}
    </div>
    <style>{`@keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }`}</style>
  </section>
);

export default SocialProofBand;
