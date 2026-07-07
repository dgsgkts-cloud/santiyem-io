// Sprint 23.1 — Contextual AI Suggestions registry.
// Static per-page suggestions + local frequency/recency tracking.
// No backend, no schema changes.

export type AISuggestion = {
  id: string;
  label: string;
  prompt: string;
  description: string;
};

export const PAGE_SUGGESTIONS: Record<string, AISuggestion[]> = {
  dashboard: [
    { id: "focus-today", label: "Bugün neye odaklanmalıyım?", prompt: "Bugün odaklanmam gereken en önemli 5 konuyu önceliklendir.", description: "Günün en kritik işlerini önem sırasına göre listeler." },
    { id: "financial-risks", label: "Finansal riskleri göster", prompt: "Şirketimdeki güncel finansal riskleri listele.", description: "Nakit, tahsilat ve ödeme kaynaklı riskleri özetler." },
    { id: "late-projects", label: "Geciken projeleri listele", prompt: "Takvimine göre geciken projeleri ve sebeplerini listele.", description: "Planlanan bitişe göre gecikmiş projeleri gösterir." },
    { id: "ceo-brief", label: "CEO özeti oluştur", prompt: "CEO modu: gelir, gider, nakit, kâr, proje sağlığı, riskler ve önerileri tek ekranda özetle.", description: "Yönetici düzeyinde tek sayfalık bir özet üretir." },
    { id: "weekly-plan", label: "Haftalık plan hazırla", prompt: "Önümüzdeki hafta için önerilen yönetim planımı hazırla.", description: "Yaklaşan 7 gün için önerilen odak ve aksiyonları planlar." },
  ],
  projects: [
    { id: "risky-projects", label: "Riskli projeleri bul", prompt: "Aktif projelerimden riskli olanları ve nedenlerini listele.", description: "Bütçe, süre ve saha verilerine göre riski yüksek projeleri gösterir." },
    { id: "profitability", label: "Kârlılığı analiz et", prompt: "Tüm projelerin kârlılık sıralamasını ve marjlarını göster.", description: "Proje bazında hakediş vs. gider marjlarını karşılaştırır." },
    { id: "late-tasks", label: "Geciken işleri göster", prompt: "Projelerdeki geciken görev ve teslimatları listele.", description: "Kilometre taşları ve görevlerdeki sapmaları özetler." },
    { id: "project-summary", label: "Proje özeti oluştur", prompt: "Aktif projelerimin tek sayfalık özetini hazırla.", description: "Her proje için ilerleme, bütçe ve durum özeti üretir." },
    { id: "critical-tasks", label: "Kritik görevleri listele", prompt: "Bu hafta tamamlanması gereken kritik görevleri listele.", description: "Bu hafta bitmesi gereken yüksek öncelikli işleri gösterir." },
  ],
  "payments-kasa": [
    { id: "cash-forecast", label: "Nakit akışını tahmin et", prompt: "Önümüzdeki 30 gün için nakit akışı tahmini oluştur.", description: "Beklenen ödeme ve tahsilatlara göre 30 günlük bakiye projeksiyonu." },
    { id: "collection-risk", label: "Tahsilat risklerini göster", prompt: "Vadesi yaklaşan ve riskli tahsilatları listele.", description: "Geciken veya gecikmesi muhtemel tahsilatları öne çıkarır." },
    { id: "explain-expenses", label: "Giderleri açıkla", prompt: "Bu ayın en yüksek gider kalemlerini kategori bazında açıkla.", description: "Aylık giderleri kategori ve tedarikçiye göre çözümler." },
    { id: "payment-plan", label: "Ödeme planı oluştur", prompt: "Bekleyen ödemeler için önerilen ödeme takvimini hazırla.", description: "Vade ve nakit durumuna göre önerilen ödeme sırasını verir." },
    { id: "month-summary", label: "Bu ayın özetini hazırla", prompt: "Bu ayın nakit, ödeme, tahsilat ve gider özetini hazırla.", description: "Ay içindeki finansal hareketleri konsolide eder." },
  ],
  personnel: [
    { id: "missing-docs", label: "Eksik evrakları göster", prompt: "Personelde eksik olan evrak ve sertifikaları listele.", description: "Sözleşme, SGK ve sertifika eksikliklerini gösterir." },
    { id: "leave-status", label: "İzin durumunu analiz et", prompt: "Personelin izin durumunu ve devamsızlıklarını analiz et.", description: "İzin, rapor ve devamsızlık dağılımını özetler." },
    { id: "overtime-report", label: "Mesai raporu oluştur", prompt: "Bu ayın mesai ve fazla çalışma raporunu hazırla.", description: "Kişi bazında mesai saatlerini ve maliyet etkisini gösterir." },
    { id: "performance", label: "Performansı özetle", prompt: "Personel performansını puantaj ve saha kayıtlarına göre özetle.", description: "Devam ve verimlilik göstergelerini birlikte değerlendirir." },
  ],
  materials: [
    { id: "critical-stock", label: "Kritik stokları göster", prompt: "Kritik seviyeye düşen malzemeleri listele.", description: "Minimum eşiğin altındaki malzemeleri öne çıkarır." },
    { id: "over-usage", label: "Fazla harcanan malzemeleri bul", prompt: "Norma göre fazla tüketilen malzemeleri listele.", description: "BOQ normuna göre sapma gösteren kalemleri bulur." },
    { id: "purchase-suggest", label: "Satın alma önerisi hazırla", prompt: "Önümüzdeki hafta için satın alma önerileri hazırla.", description: "Stok ve iş programına göre önerilen satın alma listesini üretir." },
  ],
  "site-diary": [
    { id: "today-summary", label: "Bugünü özetle", prompt: "Bugünkü şantiye günlüğünü özetle.", description: "Gün içindeki iş, personel ve olay kayıtlarını özetler." },
    { id: "risky-entries", label: "Riskli kayıtları göster", prompt: "Şantiye günlüğündeki riskli kayıtları listele.", description: "İSG, hava ve gecikme uyarısı içeren kayıtları öne çıkarır." },
    { id: "daily-report", label: "Günlük raporu oluştur", prompt: "Bugün için resmi günlük şantiye raporunu hazırla.", description: "Paylaşıma hazır günlük şantiye raporu üretir." },
  ],
  hakedis: [
    { id: "pending-hakedis", label: "Bekleyen hakedişleri göster", prompt: "Onay bekleyen tüm hakedişleri listele.", description: "Onay sürecindeki hakedişleri ve tutarlarını gösterir." },
    { id: "hakedis-summary", label: "Hakediş özeti hazırla", prompt: "Aktif projelerdeki hakediş durumlarını özetle.", description: "Proje bazında hakediş ilerleyişini konsolide eder." },
    { id: "deductions", label: "Kesintileri analiz et", prompt: "Hakedişlerdeki kesinti ve stopajları analiz et.", description: "KDV, stopaj ve diğer kesintilerin dağılımını verir." },
  ],
  procurement: [
    { id: "proc-approvals", label: "Bekleyen onayları göster", prompt: "Onay bekleyen satın alma taleplerini listele.", description: "Yönetici/finans/direktör onayında bekleyen talepleri özetler." },
    { id: "proc-compare", label: "Teklifleri karşılaştır", prompt: "Aktif RFQ'lardaki teklifleri karşılaştır ve en iyi tedarikçiyi öner.", description: "Fiyat, teslim, ödeme ve puana göre en iyi teklifi bulur." },
    { id: "proc-delays", label: "Geciken teslimatları göster", prompt: "Teslimatı geciken siparişleri ve nedenlerini listele.", description: "ETA'sı geçmiş siparişleri tedarikçi bazında gösterir." },
    { id: "proc-supplier-score", label: "Tedarikçi puanlarını analiz et", prompt: "Tedarikçi performans puanlarını analiz et ve önerilerde bulun.", description: "Teslim, kalite, fiyat ve yanıt metriklerini yorumlar." },
    { id: "proc-budget-risk", label: "Bütçe aşımını tahmin et", prompt: "Aktif satın alma taleplerine göre bütçe aşımı riskini tahmin et.", description: "Talep ve sipariş tutarlarını proje bütçesiyle karşılaştırır." },
    { id: "proc-forecast", label: "Fiyat trendlerini göster", prompt: "Beton, demir ve ana malzemelerin son 30 gün fiyat trendini göster.", description: "Kategori bazlı fiyat değişim önerilerini üretir." },
  ],
  warehouse: [
    { id: "wh-critical", label: "Kritik stokları listele", prompt: "Kritik ve tükenmiş envanter kalemlerini önceliklendirerek listele.", description: "Minimum eşiğin altındaki malzemeleri kritiklikle sıralar." },
    { id: "wh-forecast", label: "Tükenme tahmini yap", prompt: "Aktif tüketime göre önümüzdeki 14 gün içinde tükenecek malzemeleri tahmin et.", description: "Ortalama tüketim hızı ile bitiş tarihi projeksiyonu üretir." },
    { id: "wh-transfer", label: "Transfer önerileri", prompt: "Depolar arası dengesizlikleri gider — transfer önerileri hazırla.", description: "Fazla ve eksik stokları eşleştirerek transfer listesi verir." },
    { id: "wh-dead", label: "Atıl stokları göster", prompt: "90 günden uzun süredir hareket görmemiş envanter kalemlerini listele.", description: "Nakit bağlı dead stock kalemlerini raporlar." },
    { id: "wh-variance", label: "Sayım sapmalarını analiz et", prompt: "Son sayımlardaki büyük sapmaları ve olası nedenlerini analiz et.", description: "Beklenen vs. sayılan farkı yüksek kalemleri özetler." },
    { id: "wh-consume", label: "Tüketim trendi", prompt: "Son 3 ayın tüketim trendini kategori bazında özetle.", description: "Aylık tüketim hızını ve proje bazlı dağılımı gösterir." },
  ],
    { id: "monthly-report", label: "Aylık rapor oluştur", prompt: "Bu ayın konsolide yönetim raporunu hazırla.", description: "Finans, proje ve personel verilerini tek raporda toplar." },
    { id: "compare-months", label: "Ayları karşılaştır", prompt: "Son 3 ayı finansal ve operasyonel olarak karşılaştır.", description: "Trendleri ve sapmaları grafiklerle özetler." },
    { id: "insights", label: "Öngörüleri göster", prompt: "Verilerimden çıkarılabilecek 5 önemli öngörüyü listele.", description: "Yönetime yönelik veri temelli 5 içgörü sunar." },
  ],
};

const FALLBACK: AISuggestion[] = [
  { id: "fallback-brief", label: "Günlük özet", prompt: "Bugün odaklanmam gereken en önemli 5 konu nedir?", description: "Bugün için önerilen 5 odak alanını verir." },
  { id: "fallback-risk", label: "Risk raporu", prompt: "Şirketimdeki finansal ve operasyonel riskleri listele.", description: "Aktif riskleri kategorilere göre özetler." },
  { id: "fallback-cash", label: "Nakit tahmini", prompt: "Önümüzdeki 30 gün için nakit akışı tahmini oluştur.", description: "30 günlük beklenen bakiye projeksiyonu üretir." },
  { id: "fallback-ceo", label: "CEO özeti", prompt: "CEO modu: gelir, gider, nakit, kâr, proje sağlığı, riskler ve önerileri tek ekranda özetle.", description: "Tek sayfalık üst düzey yönetim özeti." },
];

export const getSuggestionsForTab = (tab: string): AISuggestion[] =>
  PAGE_SUGGESTIONS[tab] ?? FALLBACK;

// ---------- Local frequency + recency ----------
const FREQ_KEY = "santiyem_ai_suggestion_freq";
const RECENT_KEY = "santiyem_ai_suggestion_recent";

const readJSON = <T,>(k: string, fb: T): T => {
  try { const v = localStorage.getItem(k); return v ? JSON.parse(v) as T : fb; } catch { return fb; }
};
const writeJSON = (k: string, v: unknown) => {
  try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ }
};

export const recordSuggestionUse = (s: AISuggestion) => {
  const freq = readJSON<Record<string, number>>(FREQ_KEY, {});
  freq[s.id] = (freq[s.id] ?? 0) + 1;
  writeJSON(FREQ_KEY, freq);

  const recent = readJSON<AISuggestion[]>(RECENT_KEY, []);
  const next = [s, ...recent.filter((r) => r.id !== s.id)].slice(0, 3);
  writeJSON(RECENT_KEY, next);
};

export const getRecentSuggestions = (): AISuggestion[] =>
  readJSON<AISuggestion[]>(RECENT_KEY, []);

export const sortByFrequency = (items: AISuggestion[]): AISuggestion[] => {
  const freq = readJSON<Record<string, number>>(FREQ_KEY, {});
  return [...items].sort((a, b) => (freq[b.id] ?? 0) - (freq[a.id] ?? 0));
};
