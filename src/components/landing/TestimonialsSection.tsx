import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { Star } from "lucide-react";

const TESTIMONIALS = [
  { initials: "DG", color: "#FF6B2B", name: "Doğuş G.", title: "Yüksek İnşaat Mühendisi, İskenderun", text: "Hakediş hazırlamak için harcadığım 4 saati artık 20 dakikada bitiriyorum. AI'ın poz numarası önerisi gerçekten işe yarıyor. Kaba inşaat aşamasındaki bazı binaların renderlarını yapmak istediğimde de çok işe yarıyor." },
  { initials: "SY", color: "#3B82F6", name: "Selin Y.", title: "Mimar, İstanbul", text: "İmar yönetmeliği sorularına verdiği cevaplar şaşırtıcı derecede doğru. TAKS/KAKS hesabını artık hep buradan yapıyorum." },
  { initials: "MB", color: "#10B981", name: "Murat B.", title: "Müteahhit, Hatay", text: "Şantiye fotoğrafı yükleyince segregasyon tespiti yapması beni şoke etti. Ekibim artık her gün kullanıyor." },
];

const STATS = [
  { value: "500+", label: "Aktif Kullanıcı" },
  { value: "10.000+", label: "Yanıtlanan Soru" },
  { value: "98%", label: "Memnuniyet Oranı" },
];

const TestimonialsSection = () => {
  const { ref, isVisible } = useScrollAnimation();
  return (
    <section className="py-24 px-6 border-t" style={{ background: "#0A0E13", borderColor: "#1E2732" }}>
      <div ref={ref} className={`max-w-6xl mx-auto transition-all duration-700 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
        <div className="text-center mb-16">
          <span className="text-xs font-semibold uppercase tracking-widest mb-3 block" style={{ color: "#FF6B2B" }}>YORUMLAR</span>
          <h2 className="text-3xl md:text-[40px] font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Meslektaşlarınız Ne Diyor?</h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-16">
          {TESTIMONIALS.map((t, i) => (
            <div key={i} className="rounded-xl p-6 border" style={{ background: "#161C23", borderColor: "#1E2732" }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white" style={{ background: t.color }}>
                  {t.initials}
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{t.name}</p>
                  <p className="text-xs" style={{ color: "#64748B" }}>{t.title}</p>
                </div>
              </div>
              <div className="flex gap-0.5 mb-3">
                {[...Array(5)].map((_, j) => <Star key={j} size={14} fill="#FFB347" color="#FFB347" />)}
              </div>
              <p className="text-sm leading-relaxed" style={{ color: "#94A3B8" }}>"{t.text}"</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-6">
          {STATS.map(s => (
            <div key={s.label} className="text-center">
              <p className="text-3xl md:text-4xl font-bold mb-1" style={{ color: "#FF6B2B", fontFamily: "'Space Grotesk', sans-serif" }}>{s.value}</p>
              <p className="text-sm" style={{ color: "#64748B" }}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
