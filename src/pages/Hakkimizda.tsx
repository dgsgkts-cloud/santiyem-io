import { useNavigate } from "react-router-dom";
import { ArrowLeft, Building2, Bot, Flag, Mail } from "lucide-react";
import { useSEO } from "@/hooks/useSEO";
import { Capacitor } from "@capacitor/core";
import Footer from "@/components/Footer";

const reasons = [
  { icon: "🏗️", title: "Sektörden Geliyor", desc: "İnşaat mühendisleri tarafından, inşaat sektörü için tasarlandı" },
  { icon: "🤖", title: "AI Destekli", desc: "TBDY, İmar, hakediş — yapay zeka ile saniyeler içinde cevap" },
  { icon: "🇹🇷", title: "Türkiye'ye Özel", desc: "Türk mevzuatı, Türk standartları, Türkçe destek" },
];

const Hakkimizda = () => {
  const navigate = useNavigate();
  useSEO({ title: "Hakkımızda | Şantiyem", description: "Şantiyem hakkında bilgi edinin. Türk mühendis, mimar ve müteahhitler için AI destekli şantiye yönetim platformu." });

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card/60 backdrop-blur-sm px-4 py-3 shrink-0">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-base font-bold">Şantiyem Hakkında</h1>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-8 space-y-10">

          {/* Biz Kimiz */}
          <section>
            <h2 className="text-lg font-bold mb-3 text-foreground">Biz Kimiz?</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Şantiyem, Türk mühendis, mimar ve müteahhitlerin şantiye, proje ve hakediş süreçlerini dijitalleştirmek için kurulmuş bir yapay zeka platformudur. Göktaş Global Mühendislik bünyesinde geliştirilen platform, sahadaki gerçek ihtiyaçlardan yola çıkarak tasarlanmıştır.
            </p>
          </section>

          {/* Misyon & Vizyon */}
          <div className="grid sm:grid-cols-2 gap-6">
            <section className="rounded-xl border border-border bg-card p-5">
              <h2 className="text-sm font-bold mb-2 text-foreground">Misyonumuz</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Türk inşaat sektöründe kağıt, Excel ve WhatsApp ile yürütülen süreçleri tek bir akıllı platforma taşımak.
              </p>
            </section>
            <section className="rounded-xl border border-border bg-card p-5">
              <h2 className="text-sm font-bold mb-2 text-foreground">Vizyonumuz</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Türkiye'nin her şantiyesinde kullanılan standart yönetim platformu olmak.
              </p>
            </section>
          </div>

          {/* Neden Şantiyem */}
          <section>
            <h2 className="text-lg font-bold mb-4 text-foreground">Neden Şantiyem?</h2>
            <div className="grid sm:grid-cols-3 gap-4">
              {reasons.map((r) => (
                <div key={r.title} className="rounded-xl border border-border bg-card p-5 text-center space-y-2">
                  <span className="text-3xl">{r.icon}</span>
                  <h3 className="text-sm font-bold text-foreground">{r.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{r.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Şirket Bilgileri */}
          <section className="rounded-xl border border-border bg-card p-5">
            <h2 className="text-sm font-bold mb-3 text-foreground">Şirket Bilgileri</h2>
            <div className="text-sm text-muted-foreground space-y-1.5">
              <p><strong className="text-foreground">Unvan:</strong> Göktaş Global Mühendislik İnşaat İç ve Dış Tic. Lim. Şirketi</p>
              <p><strong className="text-foreground">MERSİS:</strong> 0406071938000001</p>
              <p><strong className="text-foreground">Vergi Dairesi / No:</strong> Akdeniz / 4060719380</p>
              <p><strong className="text-foreground">Adres:</strong> Uluçınar Mah. 12 Özgürkent Sk. No:4 Arsuz / Hatay</p>
              <p><strong className="text-foreground">E-posta:</strong> info@santiyem.io</p>
              <p><strong className="text-foreground">Telefon:</strong> +90 (533) 377 11 56</p>
            </div>
          </section>

          {/* CTA */}
          <div className="text-center pb-4">
            <button
              onClick={() => navigate("/iletisim")}
              className="inline-flex items-center gap-2 px-6 h-11 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity"
            >
              <Mail className="w-4 h-4" />
              Bize Ulaşın
            </button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Hakkimizda;
