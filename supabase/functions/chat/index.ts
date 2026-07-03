import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ============================================================
// Voice-mode fast path: module-scope caches (per warm isolate)
// ============================================================
type CacheEntry<T> = { value: T; expiresAt: number };
const projectListCache = new Map<string, CacheEntry<Array<{ id: string; name: string }>>>();
const brainCache = new Map<string, CacheEntry<string>>();
const CACHE_MAX = 200;

function cacheGet<T>(m: Map<string, CacheEntry<T>>, k: string): T | null {
  const e = m.get(k);
  if (!e) return null;
  if (e.expiresAt < Date.now()) { m.delete(k); return null; }
  return e.value;
}
function cacheSet<T>(m: Map<string, CacheEntry<T>>, k: string, v: T, ttlMs: number) {
  if (m.size >= CACHE_MAX) {
    const firstKey = m.keys().next().value;
    if (firstKey !== undefined) m.delete(firstKey);
  }
  m.set(k, { value: v, expiresAt: Date.now() + ttlMs });
}

function normalizeQuery(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

function extractDateWindow(q: string): { df: string | null; dt: string | null } {
  const now = new Date();
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  if (/\bbugün\b|\bbugun\b/.test(q)) return { df: iso(now), dt: iso(now) };
  if (/\bdün\b|\bdun\b/.test(q)) {
    const d = new Date(now); d.setDate(d.getDate() - 1); return { df: iso(d), dt: iso(d) };
  }
  if (/\bbu ay\b/.test(q)) {
    const s = new Date(now.getFullYear(), now.getMonth(), 1);
    const e = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { df: iso(s), dt: iso(e) };
  }
  if (/\bgeçen ay\b|\bgecen ay\b/.test(q)) {
    const s = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const e = new Date(now.getFullYear(), now.getMonth(), 0);
    return { df: iso(s), dt: iso(e) };
  }
  if (/\bbu hafta\b/.test(q)) {
    const d = new Date(now);
    const day = (d.getDay() + 6) % 7; // Monday=0
    const s = new Date(d); s.setDate(d.getDate() - day);
    const e = new Date(s); e.setDate(s.getDate() + 6);
    return { df: iso(s), dt: iso(e) };
  }
  return { df: null, dt: null };
}

function classifyIntentHeuristic(
  rawQuery: string,
  projectNames: Array<{ id: string; name: string }>,
): { intent: string; filters: any; confident: boolean } {
  const q = rawQuery.toLowerCase();
  const filters: any = {};
  const dw = extractDateWindow(q);
  filters.date_from = dw.df;
  filters.date_to = dw.dt;

  if (/\btoplam\b|\bne kadar\b|\bkaç ton\b|\bkac ton\b|\bkaç m3\b|\bkac m3\b/.test(q)) filters.aggregate = "sum";
  else if (/\ben\s+(çok|cok)\b/.test(q)) filters.aggregate = "top_by_recipient";
  else if (/\ben son\b|\bson\s+(yüklenen|yuklenen|eklenen)\b/.test(q)) { filters.aggregate = "latest"; filters.limit = 1; }

  // Project name match against cached list
  for (const p of projectNames) {
    const pn = (p.name || "").toLowerCase().trim();
    if (pn && pn.length >= 3 && q.includes(pn)) { filters.project_name = p.name; break; }
  }

  let intent = "GENERAL_CHAT";
  let confident = true;
  // Order matters — more specific patterns first.
  if (/(kaç|kac|ne kadar|kimler)\s+(kişi|kisi|işçi|isci|adam|personel).*(şantiye|santiye|sahada|iş\s*başı|is\s*basi|giriş yaptı|giris yapti|check[- ]?in)|şu an.*(sahada|şantiyede|santiyede)|(sahada|şantiyede|santiyede).*(şu an|bugün|bugun|kim|kaç|kac)|puantaj|yoklama|(check[- ]?in|check[- ]?out)/.test(q))
    intent = "LIVE_PERSONNEL";
  else if (/devamsız|devamsiz|geç kaldı|gec kaldi|(giriş|giris|çıkış|cikis)\s*(kayd|saat)|attendance|mesai/.test(q))
    intent = "ATTENDANCE";
  else if (/(brifing|briefing|günaydın özet|gunaydin ozet|executive|yönetici özeti|yonetici ozeti)/.test(q)) intent = "EXECUTIVE_BRIEFING";
  else if (/hakediş|hakedis|progress payment/.test(q)) intent = "HAKEDIS_QUERY";
  else if (/taşeron|taseron|alt yüklenici|alt yuklenici|subcontractor/.test(q)) intent = "SUBCONTRACTOR";
  else if (/(nakit akış|nakit akis|finansal|mali durum|kar\s*zarar|karlılık|karlilik|gelir\s*gider|bilanço|bilanco|cash\s*flow|financial)/.test(q)) intent = "FINANCIAL_SUMMARY";
  else if (/(gecik(en|miş|mis)|vadesi geç|vadesi gec|overdue).*(ödeme|odeme|payment|fatura|hakediş|hakedis)|(ödeme|odeme|payment|fatura).*(gecik|overdue)/.test(q)) intent = "OVERDUE_PAYMENTS";
  else if (/(yaklaşan|yaklasan|önümüzdeki|onumuzdeki|gelecek|upcoming|bekleyen).*(ödeme|odeme|payment|fatura|vade)|vadesi\s+(yaklaş|yaklas|gelen)/.test(q)) intent = "UPCOMING_PAYMENTS";
  else if (/(ödeme|odeme|payment|nakit|havale|çek\b|cek\b|kasa|tahsilat)/.test(q)) intent = "PAYMENT_QUERY";
  else if (/görev|gorev|task|yapılacak|yapilacak|to-?do|termin|geciken|bekleyen/.test(q)) intent = "TASK_QUERY";
  else if (/şantiye günlüğü|santiye gunlugu|günlük|gunluk|beton döküm|beton dokum|kalıp|kalip|hafriyat|iş yapıldı|is yapildi/.test(q)) intent = "SITE_DIARY_QUERY";
  else if (/belge|evrak|döküman|dokuman|document|dosya|pdf/.test(q)) intent = "DOCUMENT_QUERY";
  else if (/malzeme|stok|çimento|cimento|beton|demir\b|kum|çakıl|cakil|material/.test(q)) intent = "MATERIAL_QUERY";
  else if (/sözleşme|sozlesme|kontrat|contract/.test(q)) intent = "CONTRACT_QUERY";
  else if (/personel|işçi|isci|çalışan|calisan|usta|kalfa|maaş|maas|yevmiye|foreman|worker/.test(q)) intent = "PERSONNEL_QUERY";
  else if (/(genel durum|özet|ozet|overview|proje durumu|nasıl gidiyor|nasil gidiyor)/.test(q)) intent = "PROJECT_OVERVIEW";
  else if (/proje|inşaat|insaat|şantiye|santiye|villa|bina|site/.test(q)) intent = "PROJECT_QUERY";
  else { intent = "GENERAL_CHAT"; confident = false; }

  if (/\bbekle/.test(q)) filters.name = "bekliyor";
  else if (/\bgecik/.test(q)) filters.name = "gecikti";

  return { intent, filters, confident };
}


const SYSTEM_PROMPT = `Sen Şantiyem'sın — Türk müteahhit, mühendis ve mimarların şantiye, proje ve hakediş yönetiminde profesyonel yapay zeka asistanısın.

=================================================== KİMLİĞİN VE TEMEL KURALLAR

Sen deneyimli bir inşaat PROJE DİREKTÖRÜsün — bir chatbot değilsin. Kullanıcının şirketinde çalışan bir yönetici gibi konuşursun.

DOĞAL YÖNETİCİ İLETİŞİMİ:
- Robotik ifadeler kullanma ("Merhaba, size nasıl yardımcı olabilirim" tarzı klişelerden kaçın).
- Veritabanı değerini olduğu gibi tekrar etme. Önce YORUMLA, sonra ne anlama geldiğini söyle.
- Kısa, net, yönetici üslubuyla konuş. Gereksiz giriş yapma.

CEVAP YAPISI — HER YANITTA:
1. Durum tespiti (verinin ne söylediği)
2. Bu ne anlama geliyor (yorum, risk, fırsat)
3. Önerilen sonraki adım (somut)
4. Tek bir kısa takip sorusu

VERİ DÜRÜSTLÜĞÜ (KATİ):
- Sorulan bilgi VERİ bloğunda yoksa UYDURMA, alakasız veriye kayma.
- Neden bilginin bulunmadığını açıkla ve hangi verinin gerekli olduğunu söyle.
- Örnek: "Bu proje için canlı puantaj kaydı yok, bu yüzden sahadaki personel sayısını söyleyemem. QR ile giriş yapıldığında bu bilgi anlık gelir."
- Emin değilsen "güven düşük" olduğunu açıkça belirt. Kesinlik uydurma.

BAĞLAM FARKINDALIĞI:
- Önceki konuşmayı hatırla. Konu ödemelerse aynı girişleri tekrar etme, doğal devam et.
- "Merhaba" veya "Size nasıl yardımcı olabilirim" gibi cümlelerle BAŞLAMA.

Türkçe cevap ver. Rakamlarla konuş. Bilmediğin hukuki konuda "avukat görüşü alınız" de.


=================================================== HAKEDİŞ HESAPLAMA VE KDV/STOPAJ

TEMEL FORMÜLLER:

Hakediş Net Tutarı = İş Kalemleri Toplamı
KDV = Hakediş Net × %20
Brüt Hakediş = Hakediş Net + KDV
Stopaj = Brüt Hakediş × %3 (4/10 oranında, yani %3 fiilen)
Net Ödenecek = Brüt Hakediş - Stopaj

ÖRNEK HESAP:
İş kalemleri toplamı: ₺485.000
KDV (%20): ₺97.000
Brüt: ₺582.000
Stopaj (%3): ₺17.460
Net ödenecek: ₺564.540

STOPAJ HAKKINDA:
Yıllara yaygın inşaat ve onarma işlerinde stopaj uygulanır (GVK Madde 94/3)
Stopaj oranı: %3 (Bakanlar Kurulu kararıyla belirlenmiş)
Stopaj, KDV dahil tutar üzerinden hesaplanır
Aynı yıl biten işlerde stopaj uygulanmaz

AVANS KESİNTİSİ:
Net ödenecek = Brüt Hakediş - Stopaj - (Avans × Hakediş oranı)

HAKEDIŞ SORULARINDA CEVAP FORMATI:
Formülü göster
Adım adım hesapla
Sonucu büyük ve net yaz
Varsa uyarı ekle
⚠️ "Bu hesaplama referans amaçlıdır. Sözleşme şartlarınızı ve güncel mevzuatı kontrol ediniz."

=================================================== PROJE GECİKME VE RİSK ANALİZİ

KULLANICI PROJE VERİSİ SORARSA:
Kullanıcının mevcut projelerini, iş kalemlerini ve ilerleme yüzdelerini analiz et.

GECİKME RİSKİ DEĞERLENDİRMESİ:
İlerleme % / Geçen süre % oranını hesapla
Oran < 0.8 ise: "Gecikme riski var"
Oran < 0.6 ise: "Ciddi gecikme riski, önlem alınmalı"
Örnek: Proje %45 ilerledi, sürenin %60'ı geçti → oran 0.75 → gecikme riski var

CEZAI ŞART HESABI:
Sözleşmede günlük gecikme cezası varsa hesapla
Örnek: "Günlük ₺5.000 ceza, 15 gün gecikme = ₺75.000 cezai şart riski"

KRİTİK YOL ANALİZİ:
Hangi iş kalemi gecikirse diğerlerini etkiler?
Örnek: "Temel betonu gecikmesi, üst yapı başlangıcını doğrudan etkiler"

PROJE RİSK SORULARINDA FORMAT:
🔴 Kritik Risk | 🟡 Orta Risk | 🟢 Düşük Risk
Her risk için: Açıklama → Olası etki → Önerilen önlem

=================================================== ŞANTİYE GÜNLÜĞÜ YORUMLAMA

KULLANICI GÜNLÜK VERİSİ PAYLAŞIRSA:
Şunları analiz et:
Üretim hızı: Bu haftaki adam/saat vs geçen hafta
Hava etkisi: Kaç gün çalışma durdu, ne kadar kayıp
İşçilik verimliliği: Kalem başına harcanan adam/saat makul mü?
Malzeme tüketimi: Bütçeyle uyumlu mu?
Tahmini tamamlanma: Mevcut hızla ne zaman biter?

HAFTALIK ÖZET FORMATI:
"📊 [Tarih Aralığı] Haftalık Özet
Çalışma: X gün (Y gün hava/tatil kaybı)
İşgücü: Ortalama X işçi/gün · Toplam X adam/saat
Üretim hızı: Geçen haftaya göre %X [artış/azalış]
🎯 Tahmin: Mevcut hızla [iş kalemi] X günde tamamlanır
⚠️ Dikkat: [varsa risk]"

=================================================== SÖZLEŞME VE HUKUKİ KONULAR

BİLGİ VEREBİLECEĞİN KONULAR:

Yapım İşleri Genel Şartnamesi:
Madde 16: Süre uzatımı halleri (mücbir sebepler)
Madde 22: Fiyat farkı hesabı
Madde 29: Hakediş düzenlenmesi ve ödeme süreleri (30 gün)
Madde 40: Sözleşmenin feshi

Gecikmiş Ödeme:
4735 sayılı Kanun Madde 12: Ödeme süresi 30 gün
30 günü aşan ödemelerde yasal faiz işler
Yasal faiz: 3095 sayılı Kanun kapsamında TCMB oranı
2025 yasal faiz oranı: %48/yıl → günlük: 0.1315%

Faiz Hesabı Formülü:
Faiz = Tutar × (Günlük Oran / 100) × Gecikme Günü
Örnek: ₺485.000 × 0.001315 × 45 gün = ₺28.704

Mücbir Sebep:
Deprem, sel, yangın: belgeli süre uzatımı hakkı
Resmi tatiller ve hava koşulları: sözleşmeye göre değişir
Başvuru süresi: genellikle 20 iş günü içinde

ASLA YAPMA:
Kesin hukuki tavsiye verme
"Dava açabilirsiniz" veya "kazanırsınız" deme
Her hukuki konunun sonunda: "Kesin karar için avukat görüşü alınız."

=================================================== MALZEME VE MALİYET HESAPLARI

2025 REFERANS BİRİM FİYATLAR:
Nervürlü demir: 28.000-30.000 ₺/ton
Hazır beton C25/30: 4.800-5.200 ₺/m³
Çimento (50kg): 280-320 ₺/çuval
Kalıp (ahşap): 1.200-1.400 ₺/m²
Tuğla (13.5cm duvar): 750-900 ₺/m²
Mantolama (8cm): 1.100-1.300 ₺/m²
İç sıva: 320-380 ₺/m²
İç boya: 180-220 ₺/m²
Seramik zemin: 650-900 ₺/m²
İşçilik (ortalama): 1.200-1.500 ₺/adam/gün

NOT: Piyasa koşullarına göre ±%15-20 sapma olabilir.

METRAJ HESAPLARI:
Beton hacmi = Uzunluk × Genişlik × Yükseklik
Demir kg/m³ = Beton hacmi × 80-120 kg (yapı tipine göre)
Kalıp alanı = Kolon + Kiriş + Döşeme yüzeyleri

MALIYET SORULARINDA FORMAT:
Formülü göster
Hesapla
Toplam ver
"±%15-20 sapma olabilir, güncel piyasa fiyatlarını kontrol ediniz."

=================================================== EKİP YÖNETİMİ VE GÖREV TAKİBİ

KULLANICI EKİP SORARSA:

Görev atama önerileri:
Kritik yol üzerindeki işler deneyimli ustaya atansın
Paralel yapılabilecek işleri listele
Bağımlılık analizi: "X bitmeden Y başlayamaz"

Verimlilik değerlendirmesi:
Adam/saat başına üretim miktarı hesapla
Sektör ortalamasıyla karşılaştır
Düşük verimlilik nedenlerini listele

Haftalık plan önerisi:
"Bu haftaki öncelikli işler:
1. [İş] — [Kişi] — [Süre]
2. [İş] — [Kişi] — [Süre]
Kritik: [İş] bu hafta tamamlanmalı, aksi halde [etki]"

=================================================== GENEL CEVAP KURALLARI

KULLANICI VERİSİ VARSA:
Kullanıcının proje, hakediş veya şantiye verisi sisteme iletilmişse, genel bilgi yerine o veriye özel cevap ver.
"Akdeniz Residence projenizde..." gibi kişiselleştirilmiş yanıt ver.

HESAPLAMA SORULARINDA: Her zaman adım adım göster, sonucu büyük yaz.
KARŞILAŞTIRMA SORULARINDA: Tablo formatında göster.
RİSK SORULARINDA: 🔴🟡🟢 renk kodlu liste kullan.
YASAL KONULARDA: Her zaman "Kesin karar için [avukat/yetkili mühendis] görüşü alınız." ekle.

DISCLAIMER KURALI (ÇOK ÖNEMLİ):
- Normal proje veri sorularında (ödeme listesi, hakediş, görev, ilerleme, malzeme, evrak, maliyet vb.) HİÇBİR uyarı/disclaimer EKLEME. Cevap temiz ve profesyonel olsun.
- SADECE mühendislik, yapısal güvenlik, hukuki, sözleşmesel veya iş güvenliği DEĞERLENDİRMESİ yaptığında cevabın sonuna TAM olarak şu satırı ekle (uyarı emojisi kullanma):
  "Bilgi: Bu değerlendirme mevcut proje verileri ve yapay zekâ analizine dayanmaktadır. Nihai mühendislik, hukuki ve iş güvenliği kararları yetkili uzman tarafından verilmelidir."

=================================================== KESINLIKLE YAPMA

Yanlış rakam verme — emin değilsen "yaklaşık" veya "güncel fiyatı kontrol edin" de
Kesin hukuki karar verme
Yapısal hesap sonucu verme (kolon boyutu, temel kapasitesi)
Resmi EKB belgesi düzenleyebileceğini ima etme
Tahmin yürütme — bilmiyorsan söyle

=================================================== KAYIT YOKSA (ZORUNLU)

- Veritabanı sonucu boşsa ASLA kaydın var olduğunu varsayma. "Bulundu", "ödendi", "yapıldı" gibi ifadeler kullanma.
- Var olmayan bir ödeme/hakediş/personel/taşeron için işlem başlatma veya "ödeme oluşturayım mı?" gibi aksiyon önerme YASAK.
- Bunun yerine ZORUNLU olarak ::notfound bloğu döndür. İçinde:
  * query: kullanıcının aradığı isim/kriter (aynen)
  * reasons: 2–4 madde, olası nedenler (yazım farkı, henüz kaydedilmemiş, farklı proje, silinmiş vb.)
  * similar: veri bağlamında benzer isimler varsa virgüllü liste (yoksa satırı yazma). SADECE gerçekten context'te geçen isimleri koy, uydurma.
  * suggestions: 2–4 arama önerisi (kullanıcının bir sonraki adımda tıklayabileceği kısa sorgu cümleleri)
- ::notfound döndürdüğünde ::recommendation veya "ödeme ekle/oluştur" içeren ::actions EKLEME. Sadece detail/report gibi zararsız aksiyonlar olabilir, o da opsiyonel.



=================================================== CEVAP FORMATI (ZORUNLU — PREMIUM DASHBOARD)

TEMEL KURALLAR:
- Cevabın İLK CÜMLESİ direkt sonucu söylesin. Kısa, net, bold markdown ile.
- ASLA "Sistemdeki verilere göre", "Verilere baktığımda", "Analiz ettim" gibi giriş cümleleri kurma.
- İlk ekranda 6-8 satırı aşma. Uzun içerik varsa ::details bloğuna koy.
- "Kaynak: ..." satırlarını normal metinde yazma. Kaynak bilgisini SADECE ::source bloğunun içine koy.
- Sayısal veriyi ::kpi kartlarında ver, düz metinde tekrar yazma.
- Personel/liste sorularında önce ::kpi ile özet ver, uzun liste ::details bloğuna gitsin.

BLOK SÖZDİZİMİ (uygun olduğunda kullan, gereksiz yere zorlama):

::summary
red: <kritik nokta — yoksa satırı yazma>
yellow: <dikkat edilecek — yoksa satırı yazma>
green: <iyi durum — yoksa satırı yazma>
::/summary

::kpi
Etiket | Değer | Trend | Açıklama | Icon | Tone
Toplam Hakediş | 18.156.450 TL | ▲ %8 | Geçen aya göre | money | positive
Bekleyen | 4.663.250 TL | ▼ %3 | 5 kayıt | clock | warning
Gecikmiş | 820.000 TL | ▲ %12 | Aksiyon gerekli | alert | danger
Aktif Personel | 42 | | Bugün | users | neutral
::/kpi
(Icon seçenekleri: money, clock, alert, users, task, doc, chart, calendar, building, truck. Tone: positive|warning|danger|neutral|info. Icon/Tone opsiyonel — bilinmiyorsa boş bırak.)

::recommendation
title: <öneri başlığı — 1 satır>
impact: 4              # 1-5 arası tam sayı (5 en yüksek etki)
priority: Yüksek|Orta|Düşük
savings: <tahmini kazanç metni, örn. 250.000 TL/ay>
risk: Düşük|Orta|Yüksek
duration: <süre, örn. 2 hafta>
confidence: 85         # 0-100 arası % güven skoru
detail: <1-2 cümle gerekçe>
::/recommendation

::actions
task, pdf, email, call, related, whatsapp, report
::/actions
(Aksiyon anahtarları: task=Görev Oluştur, pdf=PDF Oluştur, email=Mail Gönder, call=Taşeronu Ara, related=İlgili Kayıtları Aç, whatsapp=WhatsApp, report=Rapor. Sadece anlamlı olanları koy.)

::warning
problem: <sorunun net tanımı>
impact: <iş etkisi — para/zaman/risk cinsinden>
action: <önerilen aksiyon — 1 cümle>
::/warning

::confidence
percent: 87
sources: 4             # kullanılan veri kaynağı sayısı
updated: <insan-okur zaman, örn. "2 dakika önce" veya "12:45">
::/confidence

::reasoning
tables: subcontractor_payments, contracts, personnel
records: 18            # eşleşen kayıt sayısı
path: <karar yolu — kısa cümlelerle nasıl vardığın>
sources: <referans metinler — dosya adı / kayıt id / tablo>
::/reasoning

::source
<serbest metin — kullanıcı isterse açar>
::/source

::details
<uzun açıklama, tam liste, tablo — kullanıcı "Detayları Göster" ile açar>
::/details

::notfound
query: <aranan isim/kriter>
reasons: <neden 1> | <neden 2> | <neden 3>
similar: <benzer isim 1>, <benzer isim 2>
suggestions: <öneri sorgu 1> | <öneri sorgu 2> | <öneri sorgu 3>
::/notfound

FORMAT KARARI:
- Finansal/rakamsal cevap → ::kpi ZORUNLU (icon + tone doldur).
- Risk/durum kritik → ::warning ZORUNLU (::summary yerine tercih et).
- Aksiyon önerilebilen her cevap → ::recommendation + ::actions ekle.
- Her veri-tabanlı cevabın sonuna ::confidence + ::reasoning ekle. Uydurma değer YAZMA — gerçekten sorguladığın tablolar ve kayıt sayısını yaz.
- 5'ten fazla kayıt listesi → özet ::kpi + tam liste ::details içinde.
- Sorgulanan kayıt bulunamadıysa → ::notfound ZORUNLU. ::kpi/::recommendation/::warning/::confidence/::reasoning KOYMA (var olmayan veri için istatistik/öneri üretme).
- Veri kaynağı Lovable Cloud vb. teknik detay → ::source bloğuna, düz metne değil.`;




serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Require authenticated user
  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  try {
    const _authClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: _ad, error: _ae } = await _authClient.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (_ae || !_ad?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { messages, voice_mode: voiceMode = false } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY yapılandırılmamış" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- RAG: Search user's documents for context ---
    let ragContext = "";
    const authHeader = req.headers.get("Authorization");
    if (authHeader && !voiceMode) {

      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
        
        const anonClient = createClient(supabaseUrl, anonKey);
        const token = authHeader.replace("Bearer ", "");
        const { data: claimsData } = await anonClient.auth.getClaims(token);
        const user = claimsData?.claims?.sub ? { id: claimsData.claims.sub as string } : null;
        
        if (user) {
          const supabase = createClient(supabaseUrl, serviceKey);
          
          // Get the last user message for search
          const lastUserMsg = [...messages].reverse().find((m: any) => m.role === "user");
          const query = lastUserMsg?.content || "";
          
          if (query && query.length >= 3) {
            // Extract keywords
            const keywords = query.toLowerCase().split(/\s+/).filter((w: string) => w.length >= 3).slice(0, 8);
            
            if (keywords.length > 0) {
              let chunks: any[] = [];
              const tsQuery = keywords.join(" | ");
              
              // Search both user's own docs AND global docs
              const { data: ftsChunks, error: ftsError } = await supabase
                .from("document_chunks")
                .select("content, page_number, document_id")
                .or(`user_id.eq.${user.id},is_global.eq.true`)
                .textSearch("content", tsQuery, { config: "turkish" })
                .limit(5);
              
              if (!ftsError && ftsChunks && ftsChunks.length > 0) {
                chunks = ftsChunks;
              } else {
                // Fallback to ILIKE
                const { data: likeChunks } = await supabase
                  .from("document_chunks")
                  .select("content, page_number, document_id")
                  .or(`user_id.eq.${user.id},is_global.eq.true`)
                  .ilike("content", `%${keywords[0]}%`)
                  .limit(5);
                chunks = likeChunks || [];
              }
              
              if (chunks.length > 0) {
                // Get document names
                const docIds = [...new Set(chunks.map((c: any) => c.document_id))];
                const { data: docs } = await supabase
                  .from("documents")
                  .select("id, name")
                  .in("id", docIds);
                const docMap = new Map((docs || []).map((d: any) => [d.id, d.name]));
                
                ragContext = "\n\n=== YÜKLÜ BELGELERDEN BULUNAN İLGİLİ BÖLÜMLER ===\n";
                ragContext += "Aşağıdaki bilgiler kullanıcının yüklediği belgelerden alınmıştır. Bu bilgilere dayanarak cevap ver ve cevabın sonunda kaynakları göster.\n\n";
                
                for (const chunk of chunks) {
                  const docName = docMap.get(chunk.document_id) || "Bilinmeyen Belge";
                  ragContext += `📖 Kaynak: ${docName}, Sayfa ${chunk.page_number}\n`;
                  ragContext += chunk.content.substring(0, 500) + "\n\n";
                }
                
                ragContext += "=== BELGELERDEN ALINAN BİLGİLER SONU ===\n";
                ragContext += "Eğer belgede bilgi varsa mutlaka kaynak göster: '📖 Kaynak: [Belge Adı], Sayfa [X]' formatında.\n";
                ragContext += "Belgede bilgi yoksa: 'Bu konuda yüklü belgelerimde bilgi bulamadım. Genel bilgim doğrultusunda:' diyerek cevapla.\n";
              }
            }
          }
        }
      } catch (ragErr) {
        console.error("RAG search error (non-fatal):", ragErr);
      }
    }

    // --- CONSTRUCTION BRAIN: Intent detection + database-first data retrieval ---
    let projectDataContext = "";
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
      const anonClient = createClient(supabaseUrl, anonKey);
      const token = authHeader!.replace("Bearer ", "");
      const { data: claimsData2 } = await anonClient.auth.getClaims(token);
      const user = claimsData2?.claims?.sub ? { id: claimsData2.claims.sub as string } : null;

      if (user) {
        const sb = createClient(supabaseUrl, serviceKey);
        const lastUserMsg = [...messages].reverse().find((m: any) => m.role === "user");
        const userQuery = (lastUserMsg?.content || "").trim();

        if (userQuery && userQuery.length >= 3) {
          const uid = user.id;
          const normQ = normalizeQuery(userQuery);

          // 0) Cache: exact query dedupe (per user + mode)
          const cacheKey = `${uid}|${voiceMode ? "v" : "w"}|${normQ}`;
          const cached = cacheGet(brainCache, cacheKey);
          if (cached !== null) {
            projectDataContext = cached;
            console.log("[Brain] cache hit");
            throw new Error("__CACHE_HIT__");
          }

          const now = new Date();
          const brainStart = Date.now();

          // 1) Cached project list for name resolution + heuristic matching
          let projList = cacheGet(projectListCache, uid);
          if (!projList) {
            const { data: pl } = await sb.from("projects")
              .select("id, name").eq("user_id", uid).limit(50);
            projList = (pl || []) as any;
            cacheSet(projectListCache, uid, projList!, 60_000);
          }

          // 2) Heuristic intent classifier (fast, no LLM)
          const heur = classifyIntentHeuristic(userQuery, projList!);
          let intent = heur.intent;
          let filters: any = heur.filters;

          // 3) Only fall back to LLM classifier in WEB mode when heuristic is uncertain
          if (!voiceMode && !heur.confident) {
            const intentResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
              method: "POST",
              headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
              body: JSON.stringify({
                model: "google/gemini-2.5-flash-lite",
                response_format: { type: "json_object" },
                messages: [
                  {
                    role: "system",
                    content:
                      `Sen bir intent sınıflandırıcısın. Türkçe kullanıcı sorusundan JSON çıkar. ` +
                      `Bugün: ${now.toISOString().slice(0, 10)}. ` +
                      `Şema: {"intent": one of ["LIVE_PERSONNEL","ATTENDANCE","PAYMENT_QUERY","SUBCONTRACTOR","FINANCIAL_SUMMARY","PROJECT_QUERY","PROJECT_OVERVIEW","TASK_QUERY","HAKEDIS_QUERY","SITE_DIARY_QUERY","DOCUMENT_QUERY","MATERIAL_QUERY","CONTRACT_QUERY","PERSONNEL_QUERY","GENERAL_CHAT"], ` +
                      `"filters": {"date_from": "YYYY-MM-DD" | null, "date_to": "YYYY-MM-DD" | null, "name": string | null, "project_name": string | null, "keyword": string | null, "limit": number | null, "aggregate": "sum" | "top_by_recipient" | "latest" | null}}. Sadece JSON döndür.`,
                  },
                  { role: "user", content: userQuery },
                ],
              }),
            });
            if (intentResp.ok) {
              const j = await intentResp.json();
              try {
                const parsed = JSON.parse(j.choices?.[0]?.message?.content || "{}");
                intent = parsed.intent || intent;
                filters = { ...filters, ...(parsed.filters || {}) };
              } catch { /* ignore */ }
            }
          }
          console.log("[Brain] intent:", intent, "filters:", filters, "voice:", voiceMode);

          // 4) Query database based on intent
          const df = filters.date_from as string | null;
          const dt = filters.date_to as string | null;
          const nameFilter = (filters.name as string | null)?.toLowerCase() || null;
          const projectName = (filters.project_name as string | null) || null;
          const keyword = (filters.keyword as string | null) || null;
          const aggregate = (filters.aggregate as string | null) || null;
          // Voice mode: keep result set tiny for fast spoken summary
          const baseLimit = voiceMode ? 5 : 10;
          const maxLimit = voiceMode ? 5 : 25;
          const limit = Math.min(Number(filters.limit) || baseLimit, maxLimit);

          // Resolve project_id from cached list first (no extra query)
          let projectIdFilter: string | null = null;
          if (projectName) {
            const pn = projectName.toLowerCase();
            const hit = projList!.find(p => (p.name || "").toLowerCase().includes(pn));
            if (hit) projectIdFilter = hit.id;
          }


          const fmt = (n: any) =>
            typeof n === "number" ? new Intl.NumberFormat("tr-TR").format(n) + " ₺" : String(n ?? "");
          const lines: string[] = [];

          if (intent === "PAYMENT_QUERY") {
            // Detect whether the user is explicitly asking about SUBCONTRACTOR payments.
            // We only classify a payment as "subcontractor" when there's a hard signal:
            //   - subcontractor_payments row (has FK subcontractor_id) — authoritative
            //   - cash_payments row with category='Taşeron Ödemesi' OR source_type='subcontractor_payment'
            // Everything else (fuel, excavation, office, materials) is NEVER returned as subcontractor.
            const qText = (userQuery || "").toLowerCase();
            const nameHint = (nameFilter || "");
            const subcontractorScope =
              /taşeron|taseron|taşoron|subcontractor|alt ?yüklenici|alt ?yuklenici/.test(qText) ||
              /taşeron|taseron|subcontractor/.test(nameHint);

            // 1) Authoritative subcontractor payments (has subcontractor_id FK)
            let q = sb.from("subcontractor_payments")
              .select("amount, payment_date, description, payment_method, project_id, subcontractor_id, subcontractors(name)")
              .eq("user_id", uid).order("payment_date", { ascending: false }).limit(limit);
            if (df) q = q.gte("payment_date", df);
            if (dt) q = q.lte("payment_date", dt);
            if (projectIdFilter) q = q.eq("project_id", projectIdFilter);
            const { data } = await q;
            let rows = (data || []).filter((r: any) => r.subcontractor_id); // ignore anything not confidently classified
            if (nameFilter && !subcontractorScope) {
              rows = rows.filter((r: any) => (r.subcontractors?.name || "").toLowerCase().includes(nameFilter));
            }
            const total = rows.reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
            lines.push(`TAŞERON ÖDEMELERİ (${rows.length} kayıt, toplam ${fmt(total)}):`);
            rows.forEach((r: any) => lines.push(`- ${r.payment_date} · ${r.subcontractors?.name || "?"} · ${fmt(Number(r.amount))} · ${r.payment_method}${r.description ? " · " + r.description : ""}`));

            // Top-by-recipient aggregation: "en çok ödeme yaptığımız taşeron"
            if (aggregate === "top_by_recipient" || /en\s+(cok|çok)/.test(qText)) {
              const agg = new Map<string, number>();
              rows.forEach((r: any) => {
                const k = r.subcontractors?.name || "?";
                agg.set(k, (agg.get(k) || 0) + Number(r.amount || 0));
              });
              const top = [...agg.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
              if (top.length) {
                lines.push(`\nTAŞERON BAZINDA SIRALAMA:`);
                top.forEach(([n, v], i) => lines.push(`${i + 1}. ${n} · ${fmt(v)}`));
              }
            }

            if (subcontractorScope) {
              // Also pull cash_payments explicitly categorized as Taşeron Ödemesi that AREN'T mirrors
              // of a subcontractor_payments row (source_type is null / not subcontractor_payment).
              let cq = sb.from("cash_payments")
                .select("amount, payment_date, description, category, recipient, project_id, source_type")
                .eq("user_id", uid)
                .eq("category", "Taşeron Ödemesi")
                .is("source_type", null)
                .order("payment_date", { ascending: false }).limit(limit);
              if (df) cq = cq.gte("payment_date", df);
              if (dt) cq = cq.lte("payment_date", dt);
              if (projectIdFilter) cq = cq.eq("project_id", projectIdFilter);
              const { data: cash } = await cq;
              if (cash && cash.length) {
                const ct = cash.reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
                lines.push(`\nEK TAŞERON KASA ÖDEMELERİ (${cash.length} kayıt, toplam ${fmt(ct)}):`);
                cash.forEach((r: any) => lines.push(`- ${r.payment_date} · ${r.recipient || "?"} · ${fmt(Number(r.amount))}${r.description ? " · " + r.description : ""}`));
              }
              const grand = total + (cash || []).reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
              lines.push(`\nGENEL TAŞERON TOPLAMI: ${fmt(grand)}`);
              lines.push(`\nNOT: Bu listede yalnızca kesin olarak taşeron olarak sınıflandırılmış ödemeler var. Yakıt, kazı, malzeme veya ofis giderleri gibi sınıflandırılamayan kayıtlar dahil edilmemiştir.`);
            } else {
              // Generic "ödeme" query — show classified extras but keep them clearly labeled.
              let eq = sb.from("project_expenses")
                .select("amount, expense_date, description, category, project_id")
                .eq("user_id", uid).order("expense_date", { ascending: false }).limit(limit);
              if (df) eq = eq.gte("expense_date", df);
              if (dt) eq = eq.lte("expense_date", dt);
              if (projectIdFilter) eq = eq.eq("project_id", projectIdFilter);
              const { data: exp } = await eq;
              if (exp && exp.length) {
                const et = exp.reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
                lines.push(`\nDİĞER PROJE GİDERLERİ (${exp.length} kayıt, toplam ${fmt(et)}) — TAŞERON DEĞİLDİR:`);
                exp.slice(0, limit).forEach((r: any) => lines.push(`- ${r.expense_date} · ${r.category} · ${fmt(Number(r.amount))}${r.description ? " · " + r.description : ""}`));
              }
            }
          } else if (intent === "HAKEDIS_QUERY") {

            let q = sb.from("project_hakedis")
              .select("period, amount, net_total, status, approval_status, created_at, payment_date, project_id")
              .eq("user_id", uid).order("created_at", { ascending: false }).limit(limit);
            if (df) q = q.gte("created_at", df);
            if (dt) q = q.lte("created_at", dt);
            if (projectIdFilter) q = q.eq("project_id", projectIdFilter);
            if (nameFilter && (nameFilter.includes("bekle") || nameFilter.includes("onay"))) q = q.eq("approval_status", "beklemede");
            const { data } = await q;
            lines.push(`HAKEDİŞLER (${(data || []).length} kayıt):`);
            (data || []).forEach((r: any) => lines.push(`- ${r.period} · ${fmt(Number(r.net_total || r.amount))} · durum: ${r.status}/${r.approval_status} · ${r.created_at.slice(0, 10)}`));
          } else if (intent === "PROJECT_QUERY") {
            let q = sb.from("projects").select("id, name, client, status, progress, start_date, end_date, contract_amount").eq("user_id", uid).limit(limit);
            if (projectName) q = q.ilike("name", `%${projectName}%`);
            const { data } = await q;
            const projRows = data || [];
            lines.push(`PROJELER (${projRows.length} kayıt):`);
            projRows.forEach((r: any) => lines.push(`- ${r.name} · müşteri: ${r.client || "-"} · durum: ${r.status} · ilerleme: %${r.progress} · sözleşme: ${fmt(Number(r.contract_amount || 0))}`));
            // Aggregate: toplam proje maliyeti / sözleşme
            if (aggregate === "sum" || /toplam|maliyet/.test((userQuery || "").toLowerCase())) {
              const pids = projRows.map((p: any) => p.id);
              let expTotal = 0;
              if (pids.length) {
                const { data: exps } = await sb.from("project_expenses").select("amount").in("project_id", pids);
                expTotal = (exps || []).reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
              }
              const contractTotal = projRows.reduce((s: number, r: any) => s + Number(r.contract_amount || 0), 0);
              lines.push(`\nTOPLAM SÖZLEŞME BEDELİ: ${fmt(contractTotal)}`);
              lines.push(`TOPLAM PROJE GİDERİ: ${fmt(expTotal)}`);
            }
          } else if (intent === "TASK_QUERY") {
            const today = now.toISOString().slice(0, 10);
            let q = sb.from("tasks").select("title, status, priority, due_date, project_id, assigned_to").order("due_date", { ascending: true }).limit(limit);
            if (projectIdFilter) q = q.eq("project_id", projectIdFilter);
            if (nameFilter && (nameFilter.includes("gecik") || nameFilter.includes("geç"))) q = q.lt("due_date", today).neq("status", "done");
            if (df) q = q.gte("due_date", df);
            if (dt) q = q.lte("due_date", dt);
            const { data } = await q;
            lines.push(`GÖREVLER (${(data || []).length} kayıt):`);
            (data || []).forEach((r: any) => lines.push(`- ${r.title} · durum: ${r.status} · öncelik: ${r.priority} · termin: ${r.due_date || "-"}`));
          } else if (intent === "SITE_DIARY_QUERY") {
            let q = sb.from("site_diary_entries")
              .select("entry_date, work_status, work_done, weather_icon, project_id")
              .eq("user_id", uid).order("entry_date", { ascending: false }).limit(limit);
            if (df) q = q.gte("entry_date", df);
            if (dt) q = q.lte("entry_date", dt);
            if (projectIdFilter) q = q.eq("project_id", projectIdFilter);
            if (keyword) q = q.ilike("work_done", `%${keyword}%`);
            const { data } = await q;
            lines.push(`ŞANTİYE GÜNLÜĞÜ${keyword ? ` (anahtar: "${keyword}")` : ""} (${(data || []).length} kayıt):`);
            (data || []).forEach((r: any) => lines.push(`- ${r.entry_date} ${r.weather_icon || ""} · ${r.work_status} · ${(r.work_done || "").slice(0, 200)}`));
          } else if (intent === "DOCUMENT_QUERY") {
            const effectiveLimit = aggregate === "latest" ? 1 : limit;
            const { data } = await sb.from("documents")
              .select("name, page_count, status, created_at").eq("user_id", uid)
              .order("created_at", { ascending: false }).limit(effectiveLimit);
            lines.push(`YÜKLÜ EVRAKLAR (${(data || []).length} kayıt):`);
            (data || []).forEach((r: any) => lines.push(`- ${r.name} · ${r.page_count} sayfa · ${r.status} · ${r.created_at.slice(0, 10)}`));
          } else if (intent === "MATERIAL_QUERY") {
            let mq = sb.from("materials").select("id, name, unit, project_id").eq("user_id", uid).limit(50);
            if (projectIdFilter) mq = mq.eq("project_id", projectIdFilter);
            if (nameFilter) mq = mq.ilike("name", `%${nameFilter}%`);
            const { data: mats } = await mq;
            const ids = (mats || []).map((m: any) => m.id);
            let entries: any[] = [];
            if (ids.length) {
              let eq2 = sb.from("material_entries").select("material_id, quantity, entry_date, unit_price, total_amount").in("material_id", ids).order("entry_date", { ascending: false }).limit(200);
              if (df) eq2 = eq2.gte("entry_date", df);
              if (dt) eq2 = eq2.lte("entry_date", dt);
              const { data: ed } = await eq2;
              entries = ed || [];
            }
            const totals = new Map<string, number>();
            entries.forEach((e: any) => totals.set(e.material_id, (totals.get(e.material_id) || 0) + Number(e.quantity || 0)));
            lines.push(`MALZEMELER (${(mats || []).length} kayıt):`);
            (mats || []).forEach((m: any) => lines.push(`- ${m.name} · toplam giriş: ${totals.get(m.id) || 0} ${m.unit}`));
          } else if (intent === "CONTRACT_QUERY") {
            let q = sb.from("contracts").select("name, counterparty, amount, status, start_date, end_date, contract_type").eq("user_id", uid).order("created_at", { ascending: false }).limit(limit);
            if (projectIdFilter) q = q.eq("project_id", projectIdFilter);
            if (nameFilter) q = q.or(`name.ilike.%${nameFilter}%,counterparty.ilike.%${nameFilter}%`);
            const { data } = await q;
            lines.push(`SÖZLEŞMELER (${(data || []).length} kayıt):`);
            (data || []).forEach((r: any) => lines.push(`- ${r.name} · ${r.counterparty} · ${fmt(Number(r.amount))} · ${r.status} · ${r.start_date || "-"} → ${r.end_date || "-"}`));
          } else if (intent === "PERSONNEL_QUERY") {
            let q = sb.from("personnel").select("full_name, occupation, employment_type, daily_wage, monthly_salary, is_active").eq("user_id", uid).limit(limit);
            if (nameFilter) q = q.ilike("full_name", `%${nameFilter}%`);
            const { data } = await q;
            lines.push(`PERSONEL (${(data || []).length} kayıt):`);
            (data || []).forEach((r: any) => lines.push(`- ${r.full_name} · ${r.occupation || "-"} · ${r.employment_type} · yevmiye ${fmt(Number(r.daily_wage || 0))} · maaş ${fmt(Number(r.monthly_salary || 0))} · aktif: ${r.is_active}`));
          } else if (intent === "LIVE_PERSONNEL" || intent === "ATTENDANCE") {
            const today = now.toISOString().slice(0, 10);
            const fromDate = df || today;
            const toDate = dt || today;
            let waq = sb.from("worker_attendance")
              .select("worker_name, check_in, check_out, work_date, project_id, status")
              .eq("user_id", uid)
              .gte("work_date", fromDate)
              .lte("work_date", toDate)
              .order("check_in", { ascending: false }).limit(200);
            if (projectIdFilter) waq = waq.eq("project_id", projectIdFilter);
            const { data: wa, error: waErr } = await waq;
            const rows = wa || [];
            if (intent === "LIVE_PERSONNEL") {
              const onSite = rows.filter((r: any) => r.check_in && !r.check_out);
              lines.push(`CANLI SAHA DURUMU (${today}):`);
              lines.push(`- Bugün giriş yapan: ${rows.length}`);
              lines.push(`- Şu an sahada (çıkış yapılmamış): ${onSite.length}`);
              onSite.slice(0, 15).forEach((r: any) => lines.push(`  · ${r.worker_name} · giriş ${String(r.check_in).slice(11, 16)}`));
              if (rows.length === 0 && !waErr) {
                lines.push(`NOT: Bu proje için bugün QR/puantaj kaydı yok — canlı personel sayısı belirlenemez.`);
              }
            } else {
              lines.push(`YOKLAMA (${fromDate} → ${toDate}, ${rows.length} kayıt):`);
              rows.slice(0, 25).forEach((r: any) => lines.push(`- ${r.work_date} · ${r.worker_name} · giriş ${String(r.check_in || "-").slice(11, 16)} · çıkış ${String(r.check_out || "-").slice(11, 16)} · ${r.status || "-"}`));
            }
          } else if (intent === "SUBCONTRACTOR") {
            let sq = sb.from("subcontractors").select("id, name, trade, contact_person, phone, is_active").eq("user_id", uid).limit(limit);
            if (nameFilter) sq = sq.ilike("name", `%${nameFilter}%`);
            const { data: subs } = await sq;
            const subRows = subs || [];
            lines.push(`TAŞERONLAR (${subRows.length} kayıt):`);
            const ids = subRows.map((s: any) => s.id);
            let payMap = new Map<string, { paid: number; count: number }>();
            if (ids.length) {
              const { data: pays } = await sb.from("subcontractor_payments")
                .select("subcontractor_id, amount, payment_date")
                .in("subcontractor_id", ids);
              (pays || []).forEach((p: any) => {
                const cur = payMap.get(p.subcontractor_id) || { paid: 0, count: 0 };
                cur.paid += Number(p.amount || 0); cur.count += 1;
                payMap.set(p.subcontractor_id, cur);
              });
            }
            subRows.forEach((s: any) => {
              const st = payMap.get(s.id) || { paid: 0, count: 0 };
              lines.push(`- ${s.name} · ${s.trade || "-"} · ödeme adedi: ${st.count} · toplam ödenen: ${fmt(st.paid)} · aktif: ${s.is_active}`);
            });
          } else if (intent === "FINANCIAL_SUMMARY" || intent === "PROJECT_OVERVIEW") {
            let pq = sb.from("projects").select("id, name, status, progress, contract_amount, start_date, end_date").eq("user_id", uid).limit(20);
            if (projectIdFilter) pq = pq.eq("id", projectIdFilter);
            const { data: projs } = await pq;
            const projRows = projs || [];
            const pids = projRows.map((p: any) => p.id);
            let hakedis = 0, expenses = 0, subPaid = 0, cashPaid = 0, cashCollected = 0;
            if (pids.length) {
              const [h, e, sp, cp, cc] = await Promise.all([
                sb.from("project_hakedis").select("net_total, amount, project_id").in("project_id", pids),
                sb.from("project_expenses").select("amount, project_id").in("project_id", pids),
                sb.from("subcontractor_payments").select("amount, project_id").in("project_id", pids),
                sb.from("cash_payments").select("amount, project_id").in("project_id", pids),
                sb.from("cash_collections").select("amount, project_id").in("project_id", pids),
              ]);
              hakedis = (h.data || []).reduce((s: number, r: any) => s + Number(r.net_total || r.amount || 0), 0);
              expenses = (e.data || []).reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
              subPaid = (sp.data || []).reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
              cashPaid = (cp.data || []).reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
              cashCollected = (cc.data || []).reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
            }
            const contractTotal = projRows.reduce((s: number, r: any) => s + Number(r.contract_amount || 0), 0);
            lines.push(`${intent === "FINANCIAL_SUMMARY" ? "FİNANSAL ÖZET" : "PROJE GENEL DURUMU"} (${projRows.length} proje):`);
            projRows.forEach((p: any) => lines.push(`- ${p.name} · durum: ${p.status} · ilerleme: %${p.progress} · sözleşme: ${fmt(Number(p.contract_amount || 0))}`));
            lines.push(``);
            lines.push(`TOPLAM SÖZLEŞME: ${fmt(contractTotal)}`);
            lines.push(`TOPLAM HAKEDİŞ (net): ${fmt(hakedis)}`);
            lines.push(`TOPLAM GİDER: ${fmt(expenses)}`);
            lines.push(`TAŞERON ÖDEMESİ: ${fmt(subPaid)}`);
            lines.push(`KASA TAHSİLAT: ${fmt(cashCollected)} · KASA ÖDEME: ${fmt(cashPaid)}`);
            lines.push(`NET NAKİT (tahsilat - ödeme): ${fmt(cashCollected - cashPaid)}`);
          } else if (intent === "OVERDUE_PAYMENTS" || intent === "UPCOMING_PAYMENTS") {
            const today = now.toISOString().slice(0, 10);
            const in14 = new Date(now); in14.setDate(in14.getDate() + 14);
            const in14s = in14.toISOString().slice(0, 10);
            const isOverdue = intent === "OVERDUE_PAYMENTS";
            // Cash checks with due_date
            let ck = sb.from("cash_checks").select("counterparty, amount, due_date, status, project_id").eq("user_id", uid).order("due_date", { ascending: true }).limit(50);
            if (projectIdFilter) ck = ck.eq("project_id", projectIdFilter);
            if (isOverdue) ck = ck.lt("due_date", today).neq("status", "paid");
            else ck = ck.gte("due_date", today).lte("due_date", in14s);
            const { data: checks } = await ck;
            // Subcontractor planned payments
            let spq = sb.from("subcontractor_payments").select("amount, planned_date, payment_date, status, project_id, description").eq("user_id", uid).order("planned_date", { ascending: true }).limit(50);
            if (projectIdFilter) spq = spq.eq("project_id", projectIdFilter);
            if (isOverdue) spq = spq.lt("planned_date", today).is("payment_date", null);
            else spq = spq.gte("planned_date", today).lte("planned_date", in14s);
            const { data: subPlans } = await spq;
            // E-invoices (incoming/outgoing)
            let inv = sb.from("e_invoices").select("counterparty_name, grand_total, due_date, status, direction, project_id").eq("user_id", uid).order("due_date", { ascending: true }).limit(50);
            if (projectIdFilter) inv = inv.eq("project_id", projectIdFilter);
            if (isOverdue) inv = inv.lt("due_date", today).neq("status", "paid");
            else inv = inv.gte("due_date", today).lte("due_date", in14s);
            const { data: invoices } = await inv;

            const chk = checks || [], sps = subPlans || [], invs = invoices || [];
            const totalCheck = chk.reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
            const totalSub = sps.reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
            const totalInv = invs.reduce((s: number, r: any) => s + Number(r.grand_total || 0), 0);
            lines.push(`${isOverdue ? "GECİKMİŞ ÖDEMELER" : "YAKLAŞAN ÖDEMELER (14 gün)"} — bugün: ${today}`);
            lines.push(`ÇEKLER (${chk.length}): toplam ${fmt(totalCheck)}`);
            chk.slice(0, 15).forEach((r: any) => lines.push(`- ${r.counterparty || "-"} · ${fmt(Number(r.amount))} · vade ${r.due_date} · ${r.status}`));
            lines.push(`TAŞERON PLANI (${sps.length}): toplam ${fmt(totalSub)}`);
            sps.slice(0, 15).forEach((r: any) => lines.push(`- ${(r.description || "").slice(0, 40)} · ${fmt(Number(r.amount))} · plan ${r.planned_date} · ${r.status}`));
            lines.push(`E-FATURA (${invs.length}): toplam ${fmt(totalInv)}`);
            invs.slice(0, 15).forEach((r: any) => lines.push(`- ${r.counterparty_name} · ${r.direction} · ${fmt(Number(r.grand_total))} · vade ${r.due_date} · ${r.status}`));
            lines.push(``);
            lines.push(`GENEL TOPLAM: ${fmt(totalCheck + totalSub + totalInv)}`);
          } else if (intent === "EXECUTIVE_BRIEFING") {
            const today = now.toISOString().slice(0, 10);
            const [projs, tasksOverdue, tasksToday, checksSoon, hakedisPending] = await Promise.all([
              sb.from("projects").select("name, status, progress, contract_amount").eq("user_id", uid).limit(20),
              sb.from("tasks").select("title, due_date").eq("user_id", uid).lt("due_date", today).neq("status", "done").limit(20),
              sb.from("tasks").select("title").eq("user_id", uid).eq("due_date", today).limit(20),
              sb.from("cash_checks").select("counterparty, amount, due_date").eq("user_id", uid).gte("due_date", today).order("due_date", { ascending: true }).limit(10),
              sb.from("project_hakedis").select("period, net_total, approval_status").eq("user_id", uid).eq("approval_status", "beklemede").limit(10),
            ]);
            const pr = projs.data || [];
            const activePr = pr.filter((p: any) => p.status !== "done" && p.status !== "completed");
            lines.push(`YÖNETİCİ BRİFİNGİ — ${today}`);
            lines.push(`AKTİF PROJE: ${activePr.length} / Toplam ${pr.length}`);
            lines.push(`Sözleşme toplamı: ${fmt(pr.reduce((s: number, p: any) => s + Number(p.contract_amount || 0), 0))}`);
            lines.push(`GECİKEN GÖREV: ${(tasksOverdue.data || []).length} · BUGÜN VADESİ: ${(tasksToday.data || []).length}`);
            lines.push(`YAKLAŞAN ÇEK (10): toplam ${fmt((checksSoon.data || []).reduce((s: number, r: any) => s + Number(r.amount || 0), 0))}`);
            lines.push(`ONAY BEKLEYEN HAKEDİŞ: ${(hakedisPending.data || []).length}`);
            pr.slice(0, 5).forEach((p: any) => lines.push(`- ${p.name} · durum ${p.status} · %${p.progress}`));
          }

          if (lines.length > 0) {
            projectDataContext =
              "\n\n=== KULLANICI PROJE VERİSİ (Lovable Cloud veritabanından çekildi) ===\n" +
              `Intent: ${intent}\n` +
              lines.join("\n") +
              "\n=== VERİ SONU ===\n" +
              "GÜVEN: " + (heur.confident ? "YÜKSEK (kural tabanlı intent eşleşti)" : "ORTA (LLM sınıflandırıcı kullanıldı)") + "\n" +
              "KURAL: SADECE yukarıdaki gerçek veriye dayanarak konuş. Rakam uydurma. " +
              "Cevap yapısı: (1) Durum tespiti, (2) Analiz — ne anlama geliyor, neden önemli, (3) Somut sonraki adım önerisi, (4) Tek eyleme yönelik takip sorusu (\"Detayını açayım mı?\", \"Geciken kalemleri listeleyeyim mi?\"). " +
              "Değerleri sadece tekrar etme; yorumla. Uygunsa forward-looking bir içgörü ekle (ör. yaklaşan risk, sonraki hafta beklenen tutar). " +
              "Değişik açılışlar kullan: \"Mevcut kayıtlara göre...\", \"Sistemde görünen son duruma göre...\", \"Şu anki verilere baktığımda...\". " +
              "GÜVEN düşükse bunu açıkça belirt (\"Bu konuda kesin konuşamam, kayıtlar sınırlı\"). " +
              "Aynı sohbette daha önce geçen konuya doğal devam et; giriş cümlesi tekrarlama.\n";
          } else if (intent !== "GENERAL_CHAT") {
            const missingMap: Record<string, { reason: string; alt: string }> = {
              LIVE_PERSONNEL: { reason: "Bu proje için bugün QR/puantaj girişi bulunmuyor; sahadaki canlı personel sayısı belirlenemez.", alt: "İstersen kayıtlı toplam personel listesini veya son puantaj gününün özetini gösterebilirim." },
              ATTENDANCE: { reason: "Seçili tarih aralığı için yoklama kaydı yok.", alt: "Farklı bir tarih aralığına bakabilirim ya da personel listesini çıkarabilirim." },
              SUBCONTRACTOR: { reason: "Bu proje için taşeron kaydı yok.", alt: "Diğer projelerdeki taşeron listesini veya taşeron ödeme özetini paylaşabilirim." },
              HAKEDIS_QUERY: { reason: "Bu sorguya uyan hakediş kaydı yok.", alt: "Onay bekleyen tüm hakedişleri veya son onaylanan hakedişi gösterebilirim." },
              PAYMENT_QUERY: { reason: "Bu sorguya uyan ödeme/kasa kaydı yok.", alt: "Bu ay yapılan toplam ödemeleri veya yaklaşan çekleri listeleyebilirim." },
              OVERDUE_PAYMENTS: { reason: "Şu anda geciken ödeme kaydı yok.", alt: "Yaklaşan 14 günün ödeme planını gösterebilirim." },
              UPCOMING_PAYMENTS: { reason: "Önümüzdeki 14 gün için planlı ödeme yok.", alt: "Geciken ödemeleri veya bu ayki ödeme geçmişini çıkarabilirim." },
              TASK_QUERY: { reason: "Bu sorguya uyan görev yok.", alt: "Tüm açık görevleri veya bu haftaki termini gelen işleri listeleyebilirim." },
              SITE_DIARY_QUERY: { reason: "Seçili aralık için şantiye günlüğü kaydı yok.", alt: "Son eklenen günlük kaydını veya bu ayın özetini gösterebilirim." },
              MATERIAL_QUERY: { reason: "Bu proje için malzeme kaydı yok.", alt: "Diğer projelerdeki stok durumunu veya malzeme normlarını paylaşabilirim." },
              CONTRACT_QUERY: { reason: "Bu sorguya uyan sözleşme yok.", alt: "Aktif sözleşmelerin listesini çıkarabilirim." },
              PERSONNEL_QUERY: { reason: "Bu sorguya uyan personel kaydı yok.", alt: "Aktif personel listesini gösterebilirim." },
              FINANCIAL_SUMMARY: { reason: "Finansal özet için yeterli veri yok.", alt: "Var olan hakediş, kasa veya gider modüllerinden birine odaklanabilirim." },
              PROJECT_OVERVIEW: { reason: "Henüz proje kaydı yok.", alt: "İlk projeni oluşturduktan sonra özet çıkarabilirim." },
              EXECUTIVE_BRIEFING: { reason: "Brifing için yeterli veri yok.", alt: "Var olan modüllerden biri (görev, ödeme, hakediş) için ayrı özet hazırlayabilirim." },
              DOCUMENT_QUERY: { reason: "Yüklü evrak yok.", alt: "Belge Merkezi'nden PDF yüklediğinde içeriği analiz edebilirim." },
              PROJECT_QUERY: { reason: "Bu sorguya uyan proje yok.", alt: "Tüm projelerin özetini gösterebilirim." },
            };
            const m = missingMap[intent] || { reason: "İstenen bilgi sistemde bulunamadı.", alt: "Farklı bir konuda yardımcı olabilirim." };
            projectDataContext =
              "\n\n=== KULLANICI PROJE VERİSİ ===\nIntent: " + intent + "\nSonuç: kayıt bulunamadı.\n" +
              `AÇIKLAMA: ${m.reason}\n` +
              `ALTERNATİF: ${m.alt}\n` +
              "KURAL: Kullanıcıya (1) bilginin neden mevcut olmadığını açıkla, (2) hangi verinin gerektiğini kısaca söyle, (3) yukarıdaki ALTERNATİFİ eyleme yönelik bir soru olarak sun (\"...göstermemi ister misiniz?\"). Rakam uydurma, alakasız veriye geçme, dead-end bırakma.\n";
          }
          if (projectDataContext) {
            cacheSet(brainCache, cacheKey, projectDataContext, 30_000);
          }
          console.log(`[Brain] built in ${Date.now() - brainStart}ms`);
        }
      }

    } catch (brainErr) {
      if (!(brainErr instanceof Error && brainErr.message === "__CACHE_HIT__")) {
        console.error("Construction Brain error (non-fatal):", brainErr);
      }
    }


    // Build messages with multimodal support
    const formattedMessages = messages.map((m: { role: string; content: string; attachments?: { base64: string; type: string }[] }) => {
      if (m.attachments && m.attachments.length > 0) {
        const contentParts: any[] = [{ type: "text", text: m.content }];
        for (const att of m.attachments) {
          const mimeType = att.type === "pdf" ? "application/pdf" : "image/png";
          contentParts.push({
            type: "image_url",
            image_url: { url: `data:${mimeType};base64,${att.base64}` },
          });
        }
        return { role: m.role, content: contentParts };
      }
      return { role: m.role, content: m.content };
    });

    const systemPrompt = SYSTEM_PROMPT + ragContext + projectDataContext;

    // ============================================================
    // ACTION ASSISTANT — tool-calling with confirmation gating
    // ============================================================
    // Detect action intent from last user message. If action, run a
    // non-streaming tool loop and return the final text as an SSE stream.
    try {
      const lastUserMsg = [...messages].reverse().find((m: any) => m.role === "user");
      const rawText = (lastUserMsg?.content || "").toString().toLowerCase();
      const ACTION_RE =
        /\b(kaydet|ekle|oluştur|olustur|aç(?:al[ıi]m)?|yap(?:ay[ıi]m|al[ıi]m)?|öde|ode|ödeme yap|odeme yap|gir(?:iş|is)?|ata(?:y[ıi]m|n[ıi]r)?|görev\s+ver|başlat|baslat|düzenle|duzenle|not düş|not dus|sözleşme|sozlesme|hakediş(?:\s+oluştur|\s+olustur)?|hakedis|beton döküm|beton dokum|malzeme (girişi|girisi|ekle)|personel (ekle|kaydet)|yeni\s+(görev|gorev|hakedi[şs]|ödeme|odeme|kay[ıi]t|malzeme|not|personel|sözleşme|sozlesme))\b/;
      const CONFIRM_RE = /\b(evet|onayl[ıi]yorum|onayla|onay|tamam|kaydet|geç|gec|ilerle|olur|hadi)\b/;
      const isAction = !voiceMode && (ACTION_RE.test(rawText) || (CONFIRM_RE.test(rawText) && messages.length >= 3));

      if (isAction && Deno.env.get("SUPABASE_URL")) {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
        const anon = createClient(supabaseUrl, anonKey);
        const token = authHeader!.replace("Bearer ", "");
        const { data: claimsData3 } = await anon.auth.getClaims(token);
        const user = claimsData3?.claims?.sub ? { id: claimsData3.claims.sub as string } : null;

        if (user) {
          const sb = createClient(supabaseUrl, serviceKey);
          const uid = user.id;
          const today = new Date().toISOString().slice(0, 10);

          // --- Tool schemas (OpenAI compatible) ---
          const tools = [
            {
              type: "function",
              function: {
                name: "resolve_lookups",
                description: "Resolve human-readable names into database IDs. Call before mutation tools. Returns matches or ambiguity list.",
                parameters: {
                  type: "object",
                  properties: {
                    project_name: { type: "string" },
                    subcontractor_name: { type: "string" },
                    personnel_name: { type: "string" },
                  },
                },
              },
            },
            {
              type: "function",
              function: {
                name: "save_subcontractor_payment",
                description: "Save a subcontractor payment. Set confirmed=false first to preview the summary. Only set confirmed=true after the user explicitly approves (evet/onaylıyorum/tamam).",
                parameters: {
                  type: "object",
                  required: ["subcontractor_id", "amount", "payment_method", "confirmed"],
                  properties: {
                    subcontractor_id: { type: "string", description: "UUID from resolve_lookups" },
                    amount: { type: "number" },
                    payment_method: { type: "string", enum: ["nakit", "havale", "cek", "kredi_karti"] },
                    payment_date: { type: "string", description: "YYYY-MM-DD, defaults today" },
                    project_id: { type: "string" },
                    description: { type: "string" },
                    confirmed: { type: "boolean" },
                  },
                },
              },
            },
            {
              type: "function",
              function: {
                name: "save_task",
                description: "Create a new task. Preview first with confirmed=false.",
                parameters: {
                  type: "object",
                  required: ["project_id", "title", "confirmed"],
                  properties: {
                    project_id: { type: "string" },
                    title: { type: "string" },
                    priority: { type: "string", enum: ["low", "normal", "high", "urgent"] },
                    due_date: { type: "string" },
                    description: { type: "string" },
                    confirmed: { type: "boolean" },
                  },
                },
              },
            },
            {
              type: "function",
              function: {
                name: "save_hakedis_draft",
                description: "Create a draft hakediş (progress payment). Preview first with confirmed=false.",
                parameters: {
                  type: "object",
                  required: ["project_id", "period", "amount", "confirmed"],
                  properties: {
                    project_id: { type: "string" },
                    period: { type: "string", description: "e.g. '2026-06' or 'Haziran 2026'" },
                    amount: { type: "number", description: "Gross iş kalemleri toplamı (KDV hariç)" },
                    confirmed: { type: "boolean" },
                  },
                },
              },
            },
            {
              type: "function",
              function: {
                name: "save_site_diary",
                description: "Add a site diary entry for a project on a date. Preview first.",
                parameters: {
                  type: "object",
                  required: ["project_id", "entry_date", "confirmed"],
                  properties: {
                    project_id: { type: "string" },
                    entry_date: { type: "string" },
                    work_status: { type: "string", enum: ["normal", "durdu"] },
                    work_done: { type: "string" },
                    general_note: { type: "string" },
                    confirmed: { type: "boolean" },
                  },
                },
              },
            },
            {
              type: "function",
              function: {
                name: "save_material_entry",
                description: "Add a material stock entry (giriş) to a project. Preview first.",
                parameters: {
                  type: "object",
                  required: ["project_id", "material_name", "quantity", "confirmed"],
                  properties: {
                    project_id: { type: "string" },
                    material_name: { type: "string" },
                    unit: { type: "string" },
                    quantity: { type: "number" },
                    unit_price: { type: "number" },
                    supplier: { type: "string" },
                    entry_date: { type: "string" },
                    confirmed: { type: "boolean" },
                  },
                },
              },
            },
            {
              type: "function",
              function: {
                name: "save_personnel",
                description: "Create a new personnel (worker/foreman) record. Preview first with confirmed=false.",
                parameters: {
                  type: "object",
                  required: ["full_name", "confirmed"],
                  properties: {
                    full_name: { type: "string" },
                    occupation: { type: "string" },
                    phone: { type: "string" },
                    employment_type: { type: "string", enum: ["daily_wage", "monthly_salary", "subcontractor"] },
                    daily_wage: { type: "number" },
                    monthly_salary: { type: "number" },
                    confirmed: { type: "boolean" },
                  },
                },
              },
            },
            {
              type: "function",
              function: {
                name: "save_contract",
                description: "Create a new contract (sözleşme). Preview first with confirmed=false.",
                parameters: {
                  type: "object",
                  required: ["name", "counterparty", "amount", "confirmed"],
                  properties: {
                    name: { type: "string" },
                    counterparty: { type: "string", description: "Karşı taraf (taşeron/müşteri)" },
                    amount: { type: "number" },
                    contract_type: { type: "string", description: "yapim_isleri, taseronluk, hizmet, vb." },
                    project_id: { type: "string" },
                    start_date: { type: "string" },
                    end_date: { type: "string" },
                    notes: { type: "string" },
                    confirmed: { type: "boolean" },
                  },
                },
              },
            },
          ];

          const fmtTRY = (n: number) => new Intl.NumberFormat("tr-TR").format(n) + " ₺";

          // --- Tool executor ---
          async function runTool(name: string, args: any): Promise<any> {
            try {
              if (name === "resolve_lookups") {
                const out: any = {};
                if (args.project_name) {
                  const { data } = await sb.from("projects").select("id, name, client").eq("user_id", uid).ilike("name", `%${args.project_name}%`).limit(5);
                  out.projects = data || [];
                }
                if (args.subcontractor_name) {
                  const { data } = await sb.from("subcontractors").select("id, name, specialty").eq("user_id", uid).ilike("name", `%${args.subcontractor_name}%`).limit(5);
                  out.subcontractors = data || [];
                }
                if (args.personnel_name) {
                  const { data } = await sb.from("personnel").select("id, full_name, occupation").eq("user_id", uid).ilike("full_name", `%${args.personnel_name}%`).limit(5);
                  out.personnel = data || [];
                }
                return out;
              }

              if (name === "save_subcontractor_payment") {
                const missing: string[] = [];
                if (!args.subcontractor_id) missing.push("taşeron");
                if (!(args.amount > 0)) missing.push("tutar");
                if (!args.payment_method) missing.push("ödeme yöntemi");
                if (missing.length) return { status: "MISSING_FIELDS", missing };
                const { data: sub } = await sb.from("subcontractors").select("name, user_id").eq("id", args.subcontractor_id).maybeSingle();
                if (!sub || sub.user_id !== uid) return { status: "ERROR", error: "Taşeron bulunamadı" };
                const summary = {
                  action: "Taşeron Ödemesi",
                  taşeron: sub.name,
                  tutar: fmtTRY(Number(args.amount)),
                  ödeme_yöntemi: args.payment_method,
                  tarih: args.payment_date || today,
                  proje_id: args.project_id || null,
                  açıklama: args.description || "",
                };
                if (!args.confirmed) return { status: "CONFIRM_REQUIRED", summary };
                const { data, error } = await sb.from("subcontractor_payments").insert({
                  user_id: uid,
                  subcontractor_id: args.subcontractor_id,
                  amount: args.amount,
                  payment_date: args.payment_date || today,
                  payment_method: args.payment_method,
                  project_id: args.project_id || null,
                  description: args.description || null,
                  status: "odendi",
                }).select("id").maybeSingle();
                if (error) return { status: "ERROR", error: error.message };
                return { status: "OK", id: data?.id, summary };
              }

              if (name === "save_task") {
                const missing: string[] = [];
                if (!args.project_id) missing.push("proje");
                if (!args.title) missing.push("başlık");
                if (missing.length) return { status: "MISSING_FIELDS", missing };
                const summary = {
                  action: "Görev",
                  proje_id: args.project_id,
                  başlık: args.title,
                  öncelik: args.priority || "normal",
                  termin: args.due_date || null,
                  açıklama: args.description || "",
                };
                if (!args.confirmed) return { status: "CONFIRM_REQUIRED", summary };
                const { data, error } = await sb.from("tasks").insert({
                  project_id: args.project_id,
                  title: args.title,
                  description: args.description || "",
                  priority: args.priority || "normal",
                  due_date: args.due_date || null,
                  status: "todo",
                  created_by: uid,
                }).select("id").maybeSingle();
                if (error) return { status: "ERROR", error: error.message };
                return { status: "OK", id: data?.id, summary };
              }

              if (name === "save_hakedis_draft") {
                const missing: string[] = [];
                if (!args.project_id) missing.push("proje");
                if (!args.period) missing.push("dönem");
                if (!(args.amount > 0)) missing.push("tutar");
                if (missing.length) return { status: "MISSING_FIELDS", missing };
                const kdv = Number(args.amount) * 0.20;
                const gross = Number(args.amount) + kdv;
                const stopaj = gross * 0.03;
                const net = gross - stopaj;
                const summary = {
                  action: "Hakediş Taslağı",
                  proje_id: args.project_id,
                  dönem: args.period,
                  iş_kalemleri: fmtTRY(Number(args.amount)),
                  kdv: fmtTRY(kdv),
                  brüt: fmtTRY(gross),
                  stopaj: fmtTRY(stopaj),
                  net_ödenecek: fmtTRY(net),
                };
                if (!args.confirmed) return { status: "CONFIRM_REQUIRED", summary };
                const { data, error } = await sb.from("project_hakedis").insert({
                  user_id: uid,
                  project_id: args.project_id,
                  period: args.period,
                  amount: args.amount,
                  kdv,
                  net,
                  gross_total: gross,
                  deductions_total: stopaj,
                  net_total: net,
                  status: "Bekliyor",
                  approval_status: "taslak",
                }).select("id").maybeSingle();
                if (error) return { status: "ERROR", error: error.message };
                return { status: "OK", id: data?.id, summary };
              }

              if (name === "save_site_diary") {
                const missing: string[] = [];
                if (!args.project_id) missing.push("proje");
                if (!args.entry_date) missing.push("tarih");
                if (missing.length) return { status: "MISSING_FIELDS", missing };
                const summary = {
                  action: "Şantiye Günlüğü",
                  proje_id: args.project_id,
                  tarih: args.entry_date,
                  durum: args.work_status || "normal",
                  yapılan_iş: args.work_done || "",
                  not: args.general_note || "",
                };
                if (!args.confirmed) return { status: "CONFIRM_REQUIRED", summary };
                const { data, error } = await sb.from("site_diary_entries").upsert({
                  user_id: uid,
                  project_id: args.project_id,
                  entry_date: args.entry_date,
                  work_status: args.work_status || "normal",
                  work_done: args.work_done || "",
                  general_note: args.general_note || "",
                  status: "published",
                }, { onConflict: "project_id,entry_date" }).select("id").maybeSingle();
                if (error) return { status: "ERROR", error: error.message };
                return { status: "OK", id: data?.id, summary };
              }

              if (name === "save_material_entry") {
                const missing: string[] = [];
                if (!args.project_id) missing.push("proje");
                if (!args.material_name) missing.push("malzeme adı");
                if (!(args.quantity > 0)) missing.push("miktar");
                if (missing.length) return { status: "MISSING_FIELDS", missing };

                const unit = args.unit || "adet";
                const qty = Number(args.quantity);
                const price = Number(args.unit_price || 0);
                const summary = {
                  action: "Malzeme Girişi",
                  proje_id: args.project_id,
                  malzeme: args.material_name,
                  miktar: `${qty} ${unit}`,
                  birim_fiyat: price ? fmtTRY(price) : "-",
                  toplam: price ? fmtTRY(qty * price) : "-",
                  tedarikçi: args.supplier || "-",
                  tarih: args.entry_date || today,
                };
                if (!args.confirmed) return { status: "CONFIRM_REQUIRED", summary };

                // Find or create material
                let matId: string | null = null;
                const { data: existing } = await sb.from("materials").select("id")
                  .eq("user_id", uid).eq("project_id", args.project_id)
                  .ilike("name", args.material_name).limit(1).maybeSingle();
                if (existing) matId = existing.id;
                else {
                  const { data: created, error: cErr } = await sb.from("materials").insert({
                    user_id: uid, project_id: args.project_id, name: args.material_name, unit,
                  }).select("id").maybeSingle();
                  if (cErr) return { status: "ERROR", error: cErr.message };
                  matId = created!.id;
                }
                const { data, error } = await sb.from("material_entries").insert({
                  user_id: uid,
                  material_id: matId,
                  entry_date: args.entry_date || today,
                  quantity: qty,
                  unit_price: price,
                  total_amount: qty * price,
                  supplier: args.supplier || null,
                }).select("id").maybeSingle();
                if (error) return { status: "ERROR", error: error.message };
                return { status: "OK", id: data?.id, summary };
              }

              if (name === "save_personnel") {
                const missing: string[] = [];
                if (!args.full_name) missing.push("ad soyad");
                if (missing.length) return { status: "MISSING_FIELDS", missing };
                const empType = args.employment_type || "daily_wage";
                const summary = {
                  action: "Yeni Personel",
                  ad_soyad: args.full_name,
                  meslek: args.occupation || "-",
                  telefon: args.phone || "-",
                  çalışma_türü: empType,
                  yevmiye: args.daily_wage ? fmtTRY(Number(args.daily_wage)) : "-",
                  maaş: args.monthly_salary ? fmtTRY(Number(args.monthly_salary)) : "-",
                };
                if (!args.confirmed) return { status: "CONFIRM_REQUIRED", summary };
                const { data, error } = await sb.from("personnel").insert({
                  user_id: uid,
                  full_name: args.full_name,
                  occupation: args.occupation || null,
                  phone: args.phone || null,
                  employment_type: empType,
                  daily_wage: args.daily_wage || 0,
                  monthly_salary: args.monthly_salary || 0,
                  is_active: true,
                }).select("id").maybeSingle();
                if (error) return { status: "ERROR", error: error.message };
                return { status: "OK", id: data?.id, summary };
              }

              if (name === "save_contract") {
                const missing: string[] = [];
                if (!args.name) missing.push("sözleşme adı");
                if (!args.counterparty) missing.push("karşı taraf");
                if (!(args.amount > 0)) missing.push("tutar");
                if (missing.length) return { status: "MISSING_FIELDS", missing };
                const summary = {
                  action: "Sözleşme",
                  ad: args.name,
                  karşı_taraf: args.counterparty,
                  tutar: fmtTRY(Number(args.amount)),
                  tür: args.contract_type || "yapim_isleri",
                  başlangıç: args.start_date || "-",
                  bitiş: args.end_date || "-",
                  proje_id: args.project_id || "-",
                };
                if (!args.confirmed) return { status: "CONFIRM_REQUIRED", summary };
                const { data, error } = await sb.from("contracts").insert({
                  user_id: uid,
                  name: args.name,
                  counterparty: args.counterparty,
                  amount: args.amount,
                  contract_type: args.contract_type || "yapim_isleri",
                  project_id: args.project_id || null,
                  start_date: args.start_date || null,
                  end_date: args.end_date || null,
                  notes: args.notes || "",
                  status: "aktif",
                }).select("id").maybeSingle();
                if (error) return { status: "ERROR", error: error.message };
                return { status: "OK", id: data?.id, summary };
              }

              return { status: "ERROR", error: "Unknown tool" };
            } catch (e) {
              return { status: "ERROR", error: e instanceof Error ? e.message : "tool failed" };
            }
          }

          const ACTION_SYSTEM = `${SYSTEM_PROMPT}${ragContext}${projectDataContext}

=================================================== EYLEM MODU (ACTION ASSISTANT)
Şu anda EYLEM MODUNDASIN. Kullanıcı bir işlem yapmak istiyor (ödeme, görev, hakediş, şantiye günlüğü, malzeme, personel, sözleşme).

Rolün: Deneyimli inşaat şirketi operasyon müdürüsün. Kısa, net, operasyonel konuşursun. Chatbot havası verme, gereksiz nezaket cümleleri kurma.

KURALLAR:
1. Bir mutasyon aracı çağırmadan önce ZORUNLU alanların hepsinin dolu olduğundan emin ol. Eksikse tek tek kısa sorularla iste: "Hangi proje?", "Tutar?", "Hangi tarih?", "Hangi ödeme yöntemi?".
2. Kullanıcı bir isim (proje, taşeron, personel) verdiyse ÖNCE 'resolve_lookups' aracını çağır ve UUID'ye çevir. Birden fazla eşleşme dönerse kullanıcıya seçenekleri sun; sıfır eşleşme dönerse "Kayıtlı [şey] bulunamadı" de.
3. Tüm bilgiler tamamlanınca save_* aracını **confirmed=false** ile çağır. Araç sana özet döndürecek.
4. Özeti kullanıcıya AYNEN bu formatta göster:

   **Onay Bekliyor**

   | Alan | Değer |
   | --- | --- |
   | Taşeron | Mehmet Usta |
   | Tutar | 150.000 ₺ |
   | Yöntem | Nakit |
   | Tarih | 03.07.2026 |
   | Proje | Villa 24 |

   Onaylıyor musunuz?

5. Kullanıcı 'evet/onaylıyorum/tamam/onayla' derse AYNI aracı **confirmed=true** ile tekrar çağır. Kullanıcı onaylamadan ASLA confirmed=true kullanma. Bu kural mutlaktır.
6. Kullanıcı iptal ederse ("hayır", "vazgeç") aracı çağırma; "Tamam, iptal edildi." de.
7. MISSING_FIELDS dönerse eksik alanları kısa cümleyle sor. ERROR dönerse hatayı sade Türkçe ile açıkla, tekrar denemeyi öner.
8. Kayıt başarılı olunca sadece "Kaydedildi." + tek satır özet (ör. "Mehmet Usta'ya 150.000 ₺ ödeme eklendi.") ver. Hiç emoji, hiç uyarı, hiç disclaimer ekleme.
9. Bir konuşma içinde önceki cevapları hatırla — "bugün olsun" dediyse bugünün tarihini kullan, "aynı projeye" dediyse önceki project_id'yi kullan.
10. Rakam veya tarih uydurma. Bilinmeyeni her zaman sor.`;

          // --- Tool-calling loop ---
          const convo: any[] = [
            { role: "system", content: ACTION_SYSTEM },
            ...formattedMessages,
          ];

          let finalText = "";
          for (let step = 0; step < 6; step++) {
            const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
              method: "POST",
              headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
              body: JSON.stringify({
                model: "google/gemini-2.5-flash",
                messages: convo,
                tools,
                tool_choice: "auto",
              }),
            });
            if (!r.ok) {
              const errTxt = await r.text();
              console.error("[Action] gateway error:", r.status, errTxt);
              if (r.status === 429) return new Response(JSON.stringify({ error: "Rate limit aşıldı." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
              if (r.status === 402) return new Response(JSON.stringify({ error: "AI kredisi yetersiz." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
              return new Response(JSON.stringify({ error: "AI servisi hatası" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
            }
            const j = await r.json();
            const msg = j.choices?.[0]?.message;
            if (!msg) break;
            convo.push(msg);
            const toolCalls = msg.tool_calls || [];
            if (!toolCalls.length) {
              finalText = msg.content || "";
              break;
            }
            for (const tc of toolCalls) {
              let parsedArgs: any = {};
              try { parsedArgs = JSON.parse(tc.function?.arguments || "{}"); } catch { /* keep {} */ }
              console.log("[Action] tool:", tc.function?.name, parsedArgs);
              const result = await runTool(tc.function?.name, parsedArgs);
              convo.push({
                role: "tool",
                tool_call_id: tc.id,
                content: JSON.stringify(result),
              });
            }
          }

          if (!finalText) finalText = "İşleme devam edemedim. Lütfen tekrar deneyin.";

          // Emit as a single SSE chunk so the frontend's streaming reader consumes it.
          const encoder = new TextEncoder();
          const stream = new ReadableStream({
            start(controller) {
              const chunk = { choices: [{ delta: { content: finalText } }] };
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
              controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
              controller.close();
            },
          });
          return new Response(stream, {
            headers: { ...corsHeaders, "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
          });
        }
      }
    } catch (actionErr) {
      console.error("Action Assistant error (falling back to chat):", actionErr);
    }

    // ============================================================
    // Voice mode: non-streaming, natural spoken JSON reply
    // ============================================================
    if (voiceMode) {
      // Voice: use a lean system prompt (skip the heavy SYSTEM_PROMPT with dashboard rules)
      // and pass only text messages — no attachments, no markdown scaffolding.
      const voiceSystem =
        `Sen Şantiyem AI'sın — deneyimli bir inşaat PROJE DİREKTÖRÜ. Türkçe sesli asistan modundasın. Chatbot gibi konuşma; şirket içi bir yönetici gibi konuş.\n` +
        `ÜSLUP:\n` +
        `- "Merhaba", "size nasıl yardımcı olabilirim" ile BAŞLAMA. Doğrudan konuya gir.\n` +
        `- Veritabanı rakamını olduğu gibi tekrar etme; yorumla ve ne anlama geldiğini söyle.\n` +
        `- Sayı ve tarihleri doğal söyle (ör. "bir milyon iki yüz bin lira", "on beş Kasım").\n` +
        `- Markdown, tablo, madde, emoji YOK. En fazla 2 kısa paragraf.\n` +
        `YAPI: Kısa durum → bunun anlamı → önerilen adım → tek kısa takip sorusu.\n` +
        `VERİ DÜRÜSTLÜĞÜ: Aşağıdaki VERİ bloğunda bilgi yoksa uydurma; neden olmadığını açıkla ve hangi verinin gerekli olduğunu söyle. Alakasız veriye geçme.\n` +
        `BAĞLAM: Aynı sohbette daha önce geçen konuya doğal devam et, giriş cümlesi tekrarlama.` +
        projectDataContext;


      // Keep only last 6 turns for voice to reduce token cost & latency
      const voiceMessages = messages
        .filter((m: any) => m.role === "user" || m.role === "assistant")
        .slice(-6)
        .map((m: any) => ({ role: m.role, content: String(m.content ?? "") }));

      const vResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-lite",
          messages: [
            { role: "system", content: voiceSystem },
            ...voiceMessages,
          ],
          stream: false,
          max_tokens: 220,
          temperature: 0.4,
        }),
      });


      if (!vResp.ok) {
        const errTxt = await vResp.text();
        console.error("Voice AI gateway error:", vResp.status, errTxt);
        const status = vResp.status === 429 ? 429 : vResp.status === 402 ? 402 : 500;
        const msg = status === 429 ? "Rate limit aşıldı."
                  : status === 402 ? "AI kredisi yetersiz."
                  : "AI servisi hatası";
        return new Response(JSON.stringify({ error: msg }), {
          status, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const vJson = await vResp.json();
      const text: string = vJson?.choices?.[0]?.message?.content ?? "";
      // Strip any residual markdown to keep TTS clean
      const spoken = text
        .replace(/```[\s\S]*?```/g, "")
        .replace(/[*_`#>]+/g, "")
        .replace(/^\s*[-•]\s+/gm, "")
        .replace(/\|/g, " ")
        .replace(/\n{3,}/g, "\n\n")
        .trim();

      return new Response(JSON.stringify({ text: spoken, voice_mode: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ============================================================
    // Default: streaming Q&A
    // ============================================================
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...formattedMessages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit aşıldı, lütfen biraz bekleyip tekrar deneyin." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI kredisi yetersiz, lütfen kredi ekleyin." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "AI servisi hatası" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
      },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Bilinmeyen hata" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
