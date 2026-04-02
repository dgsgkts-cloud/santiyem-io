import { useState, useEffect, useCallback } from "react";
import { Bookmark, Share2, MessageSquare, ChevronRight, Calendar, Filter } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

// Types
interface TechnicalContent {
  kategori: string;
  baslik: string;
  icerik: string;
  kaynak: string;
  anahtar_kelimeler: string[];
}

interface InterestingContent {
  kategori: string;
  one_cikan_rakam: string;
  baslik: string;
  icerik: string;
  anahtar_kelimeler: string[];
}

interface DailyData {
  date: string;
  technical: TechnicalContent;
  interesting: InterestingContent;
}

interface SavedItem {
  type: "technical" | "interesting";
  date: string;
  content: TechnicalContent | InterestingContent;
}

// Mock data
const MOCK_TECHNICAL: TechnicalContent = {
  kategori: "TBDY 2018",
  baslik: "Deprem Yönetmeliğinde Minimum Kolon Boyutu Neden 300mm?",
  icerik: "TBDY 2018 Madde 7.3.1'e göre deprem bölgelerinde betonarme çerçeve sistemlerde minimum kolon kesit boyutu 300mm olarak belirlenmiştir. Bu değer rastgele seçilmemiştir — deprem sırasında oluşan yatay kuvvetlere karşı yeterli rijitlik ve süneklik sağlaması için hesaplanmıştır. Daha küçük kesitlerde beton örtüsü yetersiz kalır, donatı yerleşimi zorlaşır ve kanca uzunlukları sağlanamaz. Özellikle 1. ve 2. derece deprem bölgelerinde bu minimum değer kritik önem taşır. Sahada sıkça yapılan hata, mimari tasarımda ince kolon tercih edilmesi ve yapı denetiminin gözden kaçırmasıdır. ⚠️ Güncel mevzuat değişiklikleri için resmi kaynakları kontrol ediniz.",
  kaynak: "TBDY 2018 Madde 7.3.1",
  anahtar_kelimeler: ["kolon", "deprem", "TBDY"],
};

const MOCK_INTERESTING: InterestingContent = {
  kategori: "DÜNYA REKORU",
  one_cikan_rakam: "72 Saatte 15 Kat",
  baslik: "Çin'de Bir Bina Nasıl 3 Günde İnşa Edildi?",
  icerik: "2012 yılında Çin'de Broad Sustainable Building şirketi, 15 katlı bir oteli yalnızca 72 saatte tamamladı. Projenin sırrı tamamen prefabrik modüler yapım sistemiydi. Tüm kat modülleri fabrikada önceden üretildi — elektrik, sıhhi tesisat ve iç dekorasyon dahil her şey fabrikada hazırlandı. Sahada yapılan tek iş modüllerin üst üste yerleştirilmesiydi. Yapı 9 büyüklüğündeki depremi karşılayacak şekilde tasarlandı. Maliyeti geleneksel yapıma göre yüzde 20 daha düşük, enerji tüketimi ise yüzde 80 azaltıldı. Bu teknoloji Türkiye'de henüz yaygınlaşmasa da deprem sonrası hızlı yapılaşma için büyük potansiyel taşıyor. Özellikle TOKİ projeleri ve afet konutları için ciddi bir alternatif olarak değerlendirilmektedir.",
  anahtar_kelimeler: ["prefabrik", "modüler", "hızlı inşaat"],
};

const PAST_DAYS_MOCK: { date: string; type: "technical" | "interesting"; kategori: string; baslik: string }[] = [
  { date: "2026-03-26", type: "technical", kategori: "İş Güvenliği", baslik: "İskele Montajında 5 Kritik Kontrol Noktası" },
  { date: "2026-03-26", type: "interesting", kategori: "TÜRKİYE'DEN", baslik: "Yavuz Sultan Selim Köprüsü'nün Mühendislik Sırları" },
  { date: "2026-03-25", type: "technical", kategori: "TS Standardı", baslik: "Beton Basınç Dayanım Testi Nasıl Yapılır?" },
  { date: "2026-03-25", type: "interesting", kategori: "YENİ TEKNOLOJİ", baslik: "Kendi Kendini Onaran Beton Gerçek mi?" },
  { date: "2026-03-24", type: "technical", kategori: "Zemin & Temel", baslik: "SPT Deneyi ve Taşıma Gücü Hesabı" },
  { date: "2026-03-24", type: "interesting", kategori: "TARİHTEN", baslik: "Roma Betonu 2000 Yıl Sonra Hâlâ Nasıl Ayakta?" },
  { date: "2026-03-23", type: "technical", kategori: "Enerji Verimliliği", baslik: "Binalarda U Değeri Hesabı ve Yalıtım Kalınlığı" },
  { date: "2026-03-23", type: "interesting", kategori: "İLGİNÇ PROJE", baslik: "Dubai'nin Dönen Kulesi: Dynamic Tower" },
  { date: "2026-03-22", type: "technical", kategori: "İmar Mevzuatı", baslik: "Emsal (KAKS) Hesabında Dahil Olmayan Alanlar" },
  { date: "2026-03-22", type: "interesting", kategori: "DÜNYA REKORU", baslik: "Dünyanın En Uzun Tüneli: Gotthard Base Tunnel" },
  { date: "2026-03-21", type: "technical", kategori: "Yapı Malzemesi", baslik: "C30/37 ile C35/45 Beton Farkı ve Kullanım Alanları" },
  { date: "2026-03-21", type: "interesting", kategori: "TÜRKİYE'DEN", baslik: "Çanakkale 1915 Köprüsü Dünya Rekoru Kırdı" },
];

const CATEGORY_EMOJIS: Record<string, string> = {
  "DÜNYA REKORU": "🏆",
  "İLGİNÇ PROJE": "🌍",
  "YENİ TEKNOLOJİ": "🔬",
  "TARİHTEN": "🏛️",
  "TÜRKİYE'DEN": "🇹🇷",
};

const formatDate = (d: Date) =>
  `${d.getDate()} ${["Ocak","Şubat","Mart","Nisan","Mayıs","Haziran","Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"][d.getMonth()]} ${d.getFullYear()}`;

const todayKey = () => new Date().toISOString().slice(0, 10);

const DailyKnowledgePanel = () => {
  const [tab, setTab] = useState<"today" | "saved">("today");
  const [loading, setLoading] = useState(true);
  const [technical, setTechnical] = useState<TechnicalContent>(MOCK_TECHNICAL);
  const [interesting, setInteresting] = useState<InterestingContent>(MOCK_INTERESTING);
  const [savedItems, setSavedItems] = useState<SavedItem[]>([]);
  const [pastFilter, setPastFilter] = useState<"all" | "technical" | "interesting">("all");

  // Load saved items from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("santiyem_saved_knowledge");
      if (saved) setSavedItems(JSON.parse(saved));
    } catch {}
  }, []);

  const fetchContent = useCallback(async () => {
    const key = `santiyem_daily_${todayKey()}`;
    const cached = localStorage.getItem(key);
    if (cached) {
      try {
        const data: DailyData = JSON.parse(cached);
        setTechnical(data.technical);
        setInteresting(data.interesting);
        setLoading(false);
        return;
      } catch {}
    }

    setLoading(true);
    const date = formatDate(new Date());

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const [techRes, interestRes] = await Promise.all([
        fetch(`${supabaseUrl}/functions/v1/daily-knowledge`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${supabaseKey}` },
          body: JSON.stringify({ type: "technical", date }),
        }),
        fetch(`${supabaseUrl}/functions/v1/daily-knowledge`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${supabaseKey}` },
          body: JSON.stringify({ type: "interesting", date }),
        }),
      ]);

      let techData = MOCK_TECHNICAL;
      let interestData = MOCK_INTERESTING;

      if (techRes.ok) {
        const r = await techRes.json();
        if (r.result) techData = r.result;
      }
      if (interestRes.ok) {
        const r = await interestRes.json();
        if (r.result) interestData = r.result;
      }

      setTechnical(techData);
      setInteresting(interestData);

      localStorage.setItem(key, JSON.stringify({ date: todayKey(), technical: techData, interesting: interestData }));
    } catch (e) {
      console.error("Daily knowledge fetch error:", e);
      // Keep mock data
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchContent(); }, [fetchContent]);

  const handleSave = (type: "technical" | "interesting") => {
    const content = type === "technical" ? technical : interesting;
    const newItem: SavedItem = { type, date: todayKey(), content };
    const exists = savedItems.some(
      (s) => s.date === newItem.date && s.type === newItem.type
    );
    if (exists) {
      toast.info("Bu içerik zaten kaydedilmiş.");
      return;
    }
    const updated = [newItem, ...savedItems];
    setSavedItems(updated);
    localStorage.setItem("santiyem_saved_knowledge", JSON.stringify(updated));
    toast.success("İçerik kaydedildi!");
  };

  const handleShare = (title: string) => {
    if (navigator.share) {
      navigator.share({ title, text: `Şantiyem - ${title}`, url: window.location.href });
    } else {
      navigator.clipboard.writeText(`Şantiyem - ${title}`);
      toast.success("Panoya kopyalandı!");
    }
  };

  const handleRemoveSaved = (index: number) => {
    const updated = savedItems.filter((_, i) => i !== index);
    setSavedItems(updated);
    localStorage.setItem("santiyem_saved_knowledge", JSON.stringify(updated));
    toast.success("Kayıt kaldırıldı.");
  };

  const filteredPast = PAST_DAYS_MOCK.filter((p) => {
    if (pastFilter === "all") return true;
    return p.type === pastFilter;
  });

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">💡 Günlük Bilgi</h1>
          <p className="text-sm text-muted-foreground mt-1">Her gün 2 yeni içerik — biri teknik, biri ilham verici</p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-secondary/50 px-3 py-1.5 rounded-lg">
          <Calendar className="w-3.5 h-3.5" />
          {formatDate(new Date())}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setTab("today")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === "today" ? "bg-[#FF6B2B] text-white" : "bg-secondary text-muted-foreground hover:text-foreground"
          }`}
        >
          📅 Bugün
        </button>
        <button
          onClick={() => setTab("saved")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === "saved" ? "bg-[#FF6B2B] text-white" : "bg-secondary text-muted-foreground hover:text-foreground"
          }`}
        >
          🔖 Kaydettiklerim {savedItems.length > 0 && `(${savedItems.length})`}
        </button>
      </div>

      {tab === "today" ? (
        <>
          {/* Card 1 — Technical */}
          {loading ? (
            <div className="rounded-xl border border-border bg-card p-5 space-y-3">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="flex">
                <div className="w-1.5 bg-[#FF6B2B] shrink-0" />
                <div className="flex-1 p-4 sm:p-5 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-muted-foreground tracking-wide">🔧 GÜNÜN TEKNİK BİLGİSİ</span>
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#FF6B2B]/15 text-[#FF6B2B]">
                      {technical.kategori}
                    </span>
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold text-foreground leading-tight">{technical.baslik}</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{technical.icerik}</p>
                  {technical.kaynak && (
                    <p className="text-xs text-muted-foreground">📖 Kaynak: {technical.kaynak}</p>
                  )}
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
                    <button onClick={() => handleSave("technical")} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg hover:bg-secondary">
                      <Bookmark className="w-3.5 h-3.5" /> Kaydet
                    </button>
                    <button onClick={() => handleShare(technical.baslik)} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg hover:bg-secondary">
                      <Share2 className="w-3.5 h-3.5" /> Paylaş
                    </button>
                    <button className="flex items-center gap-1.5 text-xs font-medium text-white bg-[#FF6B2B] hover:bg-[#FF6B2B]/90 transition-colors px-3 py-1.5 rounded-lg ml-auto">
                      <MessageSquare className="w-3.5 h-3.5" /> Bu konuda AI'ya sor
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Card 2 — Interesting */}
          {loading ? (
            <div className="rounded-xl border border-border bg-card p-5 space-y-3">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-10 w-1/2" />
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="flex">
                <div className="w-1.5 bg-blue-500 shrink-0" />
                <div className="flex-1 p-4 sm:p-5 space-y-3">
                  <span className="text-xs font-semibold text-muted-foreground tracking-wide">
                    {CATEGORY_EMOJIS[interesting.kategori] || "🌍"} {interesting.kategori}
                  </span>
                  {interesting.one_cikan_rakam && (
                    <p className="text-2xl sm:text-3xl font-black text-[#FF6B2B]">{interesting.one_cikan_rakam}</p>
                  )}
                  <h2 className="text-lg sm:text-xl font-bold text-foreground leading-tight">{interesting.baslik}</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{interesting.icerik}</p>
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
                    <button onClick={() => handleSave("interesting")} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg hover:bg-secondary">
                      <Bookmark className="w-3.5 h-3.5" /> Kaydet
                    </button>
                    <button onClick={() => handleShare(interesting.baslik)} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg hover:bg-secondary">
                      <Share2 className="w-3.5 h-3.5" /> Paylaş
                    </button>
                    <button className="flex items-center gap-1.5 text-xs font-medium text-white bg-blue-500 hover:bg-blue-500/90 transition-colors px-3 py-1.5 rounded-lg ml-auto">
                      <MessageSquare className="w-3.5 h-3.5" /> Bu konuda AI'ya sor
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Previous Days */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-foreground">Önceki Günler</h3>
              <div className="flex gap-1">
                {(["all", "technical", "interesting"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setPastFilter(f)}
                    className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
                      pastFilter === f ? "bg-[#FF6B2B] text-white" : "bg-secondary text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {f === "all" ? "Tümü" : f === "technical" ? "Teknik" : "İlginç & İlham"}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredPast.map((item, i) => (
                <div key={i} className="rounded-lg border border-border bg-card p-3 hover:bg-secondary/30 transition-colors cursor-pointer group">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                      item.type === "technical" ? "bg-[#FF6B2B]/15 text-[#FF6B2B]" : "bg-blue-500/15 text-blue-400"
                    }`}>
                      {item.kategori}
                    </span>
                    <span className="text-[10px] text-muted-foreground ml-auto">{item.date}</span>
                  </div>
                  <p className="text-sm font-medium text-foreground leading-snug">{item.baslik}</p>
                  <div className="flex items-center gap-1 mt-2 text-xs text-[#FF6B2B] font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    Oku <ChevronRight className="w-3 h-3" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        /* Saved Tab */
        <div className="space-y-3">
          {savedItems.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Bookmark className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Henüz içerik kaydetmediniz.</p>
              <p className="text-xs mt-1">Beğendiğiniz içerikleri kaydedin, burada görünsün.</p>
            </div>
          ) : (
            savedItems.map((item, i) => {
              const isTech = item.type === "technical";
              const content = item.content;
              const title = "baslik" in content ? content.baslik : "";
              return (
                <div key={i} className="rounded-xl border border-border bg-card overflow-hidden">
                  <div className="flex">
                    <div className={`w-1.5 shrink-0 ${isTech ? "bg-[#FF6B2B]" : "bg-blue-500"}`} />
                    <div className="flex-1 p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                          isTech ? "bg-[#FF6B2B]/15 text-[#FF6B2B]" : "bg-blue-500/15 text-blue-400"
                        }`}>
                          {"kategori" in content ? content.kategori : ""}
                        </span>
                        <span className="text-[10px] text-muted-foreground">{item.date}</span>
                      </div>
                      <h3 className="text-sm font-bold text-foreground">{title}</h3>
                      <p className="text-xs text-muted-foreground line-clamp-3">{"icerik" in content ? content.icerik : ""}</p>
                      <button
                        onClick={() => handleRemoveSaved(i)}
                        className="text-xs text-red-400 hover:text-red-300 transition-colors"
                      >
                        Kaydı Kaldır
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default DailyKnowledgePanel;
