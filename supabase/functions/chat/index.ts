import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.0";
import {
  resolveEntity,
  normalizeTr,
  buildClarification,
  type EntityCandidate,
} from "../_shared/entityResolver.ts";

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

  // Project name match — normalized + fuzzy (Turkish char folding, voice corrections)
  {
    const candidates: EntityCandidate[] = projectNames.map(p => ({ id: p.id, name: p.name }));
    const outcome = resolveEntity(rawQuery, candidates, { autoSelectThreshold: 0.85, suggestThreshold: 0.62 });
    if (outcome.status === "auto") {
      filters.project_name = outcome.match.name;
    } else if (outcome.status === "ambiguous") {
      filters.project_name = outcome.matches[0].candidate.name;
      filters.project_ambiguous = outcome.matches.map(m => m.candidate.name);
    }
  }

  let intent = "GENERAL_CHAT";
  let confident = true;
  // Order matters — more specific patterns first. Domain-specific intents
  // (LOW_STOCK, TODAYS_TASKS, PROJECT_HEALTH, …) MUST come before the
  // broader family intents (MATERIAL_QUERY, TASK_QUERY, PROJECT_OVERVIEW).
  if (/(kaç|kac|ne kadar|kimler)\s+(kişi|kisi|işçi|isci|adam|personel).*(şantiye|santiye|sahada|iş\s*başı|is\s*basi|giriş yaptı|giris yapti|check[- ]?in)|şu an.*(sahada|şantiyede|santiyede)|(sahada|şantiyede|santiyede).*(şu an|bugün|bugun|kim|kaç|kac)|puantaj|yoklama|(check[- ]?in|check[- ]?out)/.test(q))
    intent = "LIVE_PERSONNEL";
  else if (/(yevmiye|yevmiyeli|daily\s*wage|günlük\s*ücret|gunluk\s*ucret)|(kaç|kac|toplam|ortalama|en\s*(fazla|yüksek|yuksek|çok|cok))\s*(yevmiyeli|işçi|isci|çalışan|calisan|maliyet)/.test(q))
    intent = "WAGE_ANALYSIS";
  else if (/(fazla\s*mesai|overtime|uzun\s*(mesai|shift)|gece\s*mesai)/.test(q))
    intent = "PERSONNEL_OVERTIME";
  else if (/devamsız|devamsiz|geç kaldı|gec kaldi|(giriş|giris|çıkış|cikis)\s*(kayd|saat)|attendance|\bmesai\b/.test(q))
    intent = "ATTENDANCE";

  else if (/(brifing|briefing|günaydın özet|gunaydin ozet|executive|yönetici özeti|yonetici ozeti|günlük\s*özet|gunluk\s*ozet)/.test(q)) intent = "EXECUTIVE_BRIEFING";
  else if (/(proje\s*(sağlık|saglik|health)|health\s*score|risk\s*skor|genel\s*sağlık|genel\s*saglik|proje\s*durumu\s*(nasıl|nasil))/.test(q)) intent = "PROJECT_HEALTH";
  else if (/(en\s*büyük\s*risk|en\s*buyuk\s*risk|(hangi|neler).*risk|risk\s*var\s*mı|risk\s*var\s*mi|kritik\s*(durum|sorun)|tehlike)/.test(q)) intent = "PROJECT_RISKS";
  else if (/(hangi\s*proje.*(geriden|geri\s*kal|yavaş|yavas|gecik)|proje\s*ilerleme|proje\s*progres|progress|ilerleme\s*durumu)/.test(q)) intent = "PROJECT_PROGRESS";
  else if (/hakediş|hakedis|progress payment/.test(q)) intent = "HAKEDIS_QUERY";
  else if (/taşeron|taseron|alt yüklenici|alt yuklenici|subcontractor/.test(q)) intent = "SUBCONTRACTOR";
  else if (/(nakit akış|nakit akis|finansal|mali durum|kar\s*zarar|karlılık|karlilik|gelir\s*gider|bilanço|bilanco|cash\s*flow|financial)/.test(q)) intent = "FINANCIAL_SUMMARY";
  else if (/(gecik(en|miş|mis)|vadesi geç|vadesi gec|overdue).*(ödeme|odeme|payment|fatura|hakediş|hakedis)|(ödeme|odeme|payment|fatura).*(gecik|overdue)/.test(q)) intent = "OVERDUE_PAYMENTS";
  else if (/(yaklaşan|yaklasan|önümüzdeki|onumuzdeki|gelecek|upcoming|bekleyen).*(ödeme|odeme|payment|fatura|vade)|vadesi\s+(yaklaş|yaklas|gelen)/.test(q)) intent = "UPCOMING_PAYMENTS";
  else if (/(ödeme|odeme|payment|nakit|havale|çek\b|cek\b|kasa|tahsilat)/.test(q)) intent = "PAYMENT_QUERY";
  else if (/(bugün|bugun|today).*(görev|gorev|iş\b|is\b|planl|task)|bugünkü\s*(iş|is|görev|gorev)|bugunku\s*(iş|is|görev|gorev)/.test(q)) intent = "TODAYS_TASKS";
  else if (/görev|gorev|task|yapılacak|yapilacak|to-?do|termin|geciken|bekleyen/.test(q)) intent = "TASK_QUERY";
  else if (/şantiye günlüğü|santiye gunlugu|günlük|gunluk|beton döküm|beton dokum|kalıp|kalip|hafriyat|iş yapıldı|is yapildi/.test(q)) intent = "SITE_DIARY_QUERY";
  else if (/(toplantı\s*(özet|ozet|not|karar)|meeting\s*(summary|notes)|son\s*toplantı|son\s*toplanti|aksiyon\s*madde)/.test(q)) intent = "MEETING_SUMMARY";
  else if (/belge|evrak|döküman|dokuman|document|dosya|pdf/.test(q)) intent = "DOCUMENT_QUERY";
  else if (/(kritik\s*stok|az\s*kaldı|az\s*kaldi|düşük\s*stok|dusuk\s*stok|azaldı|azaldi|bitmek\s*üzere|bitmek\s*uzere|low\s*stock|stok\s*(kritik|azaldı|azaldi|az))/.test(q)) intent = "LOW_STOCK";
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

/**
 * Sticky project context: if the current user turn doesn't clearly name a
 * project, walk back through the last few conversation turns and inherit
 * whichever project the user was previously discussing. This is what makes
 * "Peki ödemeler ne durumda?" implicitly refer to "Arsuz Modern Villa".
 */
function extractPriorProject(
  messages: Array<{ role: string; content: string }>,
  projectNames: Array<{ id: string; name: string }>,
): string | null {
  if (!messages?.length || !projectNames.length) return null;
  const candidates: EntityCandidate[] = projectNames.map(p => ({ id: p.id, name: p.name }));
  // Skip the last user turn — the caller already checked it. Look back
  // through the previous 8 turns, newest first.
  const recent = messages.slice(0, -1).slice(-8).reverse();
  for (const m of recent) {
    if (!m || typeof m.content !== "string" || !m.content.trim()) continue;
    const outcome = resolveEntity(m.content, candidates, {
      autoSelectThreshold: 0.85,
      suggestThreshold: 0.72,
    });
    if (outcome.status === "auto") return outcome.match.name;
  }
  return null;
}



const SYSTEM_PROMPT = `Sen Şantiyem'sın — Türk müteahhit, mühendis ve mimarların şantiye, proje ve hakediş yönetiminde profesyonel yapay zeka asistanısın.

=================================================== KİMLİĞİN VE TEMEL KURALLAR

Sen deneyimli bir inşaat PROJE DİREKTÖRÜsün — bir chatbot değilsin. Kullanıcının şirketinde çalışan bir yönetici gibi konuşursun.

DOĞAL YÖNETİCİ İLETİŞİMİ:
- Robotik ifadeler kullanma ("Merhaba, size nasıl yardımcı olabilirim" tarzı klişelerden kaçın).
- Veritabanı değerini olduğu gibi tekrar etme. Önce YORUMLA, sonra ne anlama geldiğini söyle.
- Kısa, net, yönetici üslubuyla konuş. Gereksiz giriş yapma.

CEVAP YAPISI — HER YANITTA:
1. Durum tespiti (verinin somut olarak ne söylediği)
2. Analiz — ne anlama geliyor, neden önemli, risk/fırsat var mı
3. Somut sonraki adım önerisi
4. Tek eyleme yönelik takip sorusu (jenerik değil: "Hakediş detayını açayım mı?", "Geciken ödemeleri listeleyeyim mi?", "Personel dağılımını göstereyim mi?")

VERİ DÜRÜSTLÜĞÜ (KATİ):
- Sorulan bilgi VERİ bloğunda yoksa UYDURMA. Alakasız veriye ASLA kayma (ör. personel sorulduğunda proje bedeli söyleme).
- Bilginin neden bulunmadığını açıkla, hangi verinin gerekli olduğunu söyle ve en yakın alternatifi eyleme yönelik bir soru olarak sun.
- Örnek: "Şu anda aktif personel sayısını doğrulayamıyorum çünkü bu projede canlı giriş-çıkış verisi yok. İstersen kayıtlı toplam personel listesini gösterebilirim."

GÜVEN SEVİYESİ:
- Her yanıtı içsel olarak HIGH / MEDIUM / LOW olarak değerlendir.
- LOW ise açıkça belirt: "Bu konuda kesin konuşamam, kayıtlar sınırlı."
- Kesinlik uydurma.

ÜSLUP ÇEŞİTLİLİĞİ (aynı açılışı tekrarlama):
- "Mevcut kayıtlara göre..."
- "Sistemde görünen son duruma göre..."
- "Şu anki verilere baktığımda..."
- "Bu konuda elimdeki kayıtlar şunu gösteriyor..."
"Kontrol ettim", "İnceledim", "Verilere göre" kalıplarını tekrar tekrar KULLANMA.

YÖNETİCİ İÇGÖRÜSÜ:
- Uygun olduğunda soruyu aşan bir yorum ekle: yaklaşan risk, önümüzdeki hafta beklenen tutar, dikkat edilmesi gereken taşeron gibi.
- Örnek: "Bu ay 12 milyon TL ödeme yapılmış — büyük bölümü betonarme. Önümüzdeki hafta ~4 milyon TL daha planlanıyor; nakit akışını birlikte incelememizi öneririm."

EYLEM ODAKLILIK (KATI KURAL):
- "Yapamam", "yetkim yok", "izin verilmedi" ile ASLA bitirme. Bir sonraki somut adımı öner.
- Kullanıcı birine haber verilmesini/mesaj/görev/toplantı yaratılmasını isterse: mesaj taslağını / görev başlığını / gündemi SEN hazırla, kısaca özetle ve onay iste ("Şu görevi oluşturmamı ister misiniz?", "WhatsApp mesajını hazırladım, göndereyim mi?").

YÖNETİCİ ÖNCELİKLENDİRME:
- Birden fazla sorun varsa ASLA rastgele sırayla listeleme. En yüksek finansal / takvim etkisi olan sorunu ÖNCE söyle.
- Kural: (1) Geciken ödeme / nakit çıkışı, (2) Kritik yol üzerindeki gecikme, (3) Kritik stok, (4) Personel eksikliği, (5) Bekleyen onaylar, (6) Diğer.
- Her önemli sorun için: durum → iş etkisi → önerilen aksiyon → ÖNCELİK (Yüksek/Orta/Düşük).

PROJE SAĞLIK SKORU (VERİ bloğunda geldiğinde):
- 80-100 = 🟢 sağlıklı, 60-79 = 🟡 dikkat, 60 altı = 🔴 kritik.
- Skoru sadece söyleme; NEDEN o skorda olduğunu 1-2 cümleyle açıkla ve skorun yükselmesi için somut bir adım öner.

BAĞLAM FARKINDALIĞI:
- Önceki konuşmayı hatırla; konu devam ediyorsa doğal devam et, sıfırdan başlama.
- Aktif proje bir kez belirtildiyse (ör. "Arsuz Modern Villa"), kullanıcı yeni bir proje adı söyleyene kadar sonraki sorular otomatik olarak O projeye referans verir. "Peki ödemeler ne durumda?" → aktif projenin ödemeleri.
- "Merhaba", "Size nasıl yardımcı olabilirim" gibi cümlelerle BAŞLAMA.

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
- Veri kaynağı Lovable Cloud vb. teknik detay → ::source bloğuna, düz metne değil.

=================================================== GÖRSEL YANIT MOTORU (ZORUNLU)

Yapılandırılmış veri, sıralama, kıyaslama, KPI, liste, tarih veya finansal değer içeren HER cevapta uygun görsel bloğu ZORUNLU olarak üret. Kullanıcı ayrıca istemek zorunda kalmamalı — hangi görselin gerekli olduğuna sen karar ver.

OTOMATİK GÖRSEL KURALLARI:
- Top 10 / sıralama / liste (>3 satır) → ::datatable
- Kıyaslama (A vs B, projeler arası) → ::chart type=bar
- Zaman içinde trend (aylık, haftalık) → ::chart type=line
- Dağılım / oran (kategori payı, taşeron payı) → ::chart type=pie
- Tarihli olaylar zinciri (hakediş takvimi, milestone) → ::timeline
- Yüzde tabanlı ilerleme (proje %, iş kalemi %) → ::progress
- Risk listesi → ::risks (severity: Kritik|Yüksek|Orta|Düşük)
- Ödeme/hakediş kalemleri (etiket + tutar) → ::financial
- Malzeme stoğu → ::materials
- Personel yevmiye/liste → ::personnel
- Proje portföyü / özet → ::projects
- Tek/az sayıda özet metrik (2-6 KPI) → ::kpi

SES + GÖRSEL SENKRONU:
- Sesli mod dahil, cevap yapılandırılmış veri içeriyorsa mutlaka görsel blok üret. Ses konuşurken görsel eşzamanlı görünmeli.
- Görsel bloklar, konuşulan cümlenin AYNI verisini göstermeli. Sayıları farklı sunma.

=================================================== ZORUNLU MAKİNE-OKUNUR UI PAYLOAD

Yapılandırılmış veri (sıralama, kıyaslama, KPI, tarih zinciri, ilerleme, tablo, liste) içeren HER cevabın SONUNA — bütün metinden ve tüm ::bloklardan sonra — TEK bir fenced JSON bloğu ekle. Bu blok frontend renderer'ına (AITable / AIKpiCards / AIBarChart / AILineChart / AIPieChart / AITimeline / AIProgress) veri sağlar ve ZORUNLUdur.

Format (aynen böyle, başka hiçbir yerde JSON kullanma):
\`\`\`json ui
{ "type": "...", "title": "...", ... }
\`\`\`

ui.type SEÇİM KURALI (otomatik karar ver):
- Top N / sıralama / liste (>3 satır)  → "table"       { columns: string[], rows: object[] | string[][] }
- Kıyaslama (A vs B)                    → "bar_chart"   { data: [{name, value}] }
- Zaman içinde trend                    → "line_chart"  { data: [{name, value}] }
- Dağılım / oran / pay                  → "pie_chart"   { data: [{name, value}] }
- 2-6 özet metrik                       → "kpi"         { items: [{label, value, trend?, note?, tone?}] }  tone: positive|warning|danger|neutral
- Tarihli olaylar zinciri               → "timeline"    { events: [{date, label, status?, note?}] }
- Yüzde ilerleme                        → "progress"    { items: [{label, percent, note?, tone?}] }

KESİN KURALLAR:
- ui bloğu MUTLAKA geçerli JSON olmalı (çift tırnak, virgül sonu yok, yorum yok).
- Sayısal değerler (tutar, adet, yüzde) STRING değil, NUMBER olarak yaz: 145000, 78, 12.5.
- Etiketler string; para birimi title veya note içinde belirt ("Tutar (TL)" gibi).
- rows/data/items/events içindeki tüm değerler cevapta konuşulan sayılarla AYNI olmalı.
- Cevap yapılandırılmış veri içermiyorsa (kısa selamlaşma, tek cümlelik açıklama) ui bloğu EKLEME.
- Cevap "veri bulunamadı" durumundaysa ui bloğu EKLEME.
- Birden fazla görsel gerekiyorsa ui değerini bir DİZİ yap: { "ui": [ {...}, {...} ] } yerine tek fenced bloğun içinde bir array olarak — ya da her biri için ayrı \`\`\`json ui bloğu.
- Bu ui bloğu ::datatable/::chart/::kpi gibi klasik blokların YERİNE değil, EK olarak eklenir (ikisi de gösterilir; frontend duplicate'ı yönetir). Uzun narrative + ui bloğu yeterlidir.

ÖRNEK (Top ödemeler):
\`\`\`json ui
{
  "type": "table",
  "title": "En Yüksek 10 Ödeme",
  "columns": ["Alıcı", "Proje", "Tutar (TL)", "Durum"],
  "rows": [
    { "Alıcı": "Mehmet Kaya", "Proje": "Arsuz Villa", "Tutar (TL)": 185000, "Durum": "Ödendi" },
    { "Alıcı": "Ali Yılmaz",  "Proje": "Akdeniz",     "Tutar (TL)": 142000, "Durum": "Bekliyor" }
  ]
}
\`\`\`

ÖRNEK (KPI):
\`\`\`json ui
{ "type": "kpi", "title": "Bu Ay Özet", "items": [
  { "label": "Yevmiyeli Çalışan", "value": 48 },
  { "label": "Toplam Ödeme (TL)", "value": 412350, "trend": "▲ %9", "tone": "warning" },
  { "label": "Günlük Ortalama (TL)", "value": 13700 }
]}
\`\`\`

ÖRNEK (Trend):
\`\`\`json ui
{ "type": "line_chart", "title": "Aylık Nakit Akışı", "data": [
  { "name": "Tem", "value": 320000 }, { "name": "Ağu", "value": 410000 },
  { "name": "Eyl", "value": 385000 }, { "name": "Eki", "value": 470000 }
]}
\`\`\`

BLOK SÖZDİZİMİ (görsel bloklar):

::chart type=bar title="Aylık Ödemeler"
Ocak | 145000
Şubat | 210000
Mart | 175000
::/chart
(type=bar|pie|line. title opsiyonel. Her satır: etiket | sayısal değer.)

::timeline title="Hakediş Takvimi"
2025-10-15 | Hakediş #7 | Ödendi | 485.000 TL
2025-11-15 | Hakediş #8 | Bekliyor | 520.000 TL
2025-12-15 | Hakediş #9 | Planlandı |
::/timeline
(Satır: tarih | başlık | durum | not. Durum: Ödendi|Bekliyor|Gecikti|Planlandı|Kritik.)

::progress title="Proje İlerlemeleri"
Akdeniz Residence | 78 | Zamanında
Arsuz Villa | 45 | 12 gün gecikme | warning
Antalya AVM | 22 | Yeni başladı | danger
::/progress
(Satır: etiket | yüzde | not | tone. Tone: positive|warning|danger.)

::datatable title="En Yüksek 10 Ödeme"
Taşeron | Proje | Tutar | Durum
Mehmet Kaya | Arsuz Villa | 185.000 TL | Ödendi
Ali Yılmaz | Akdeniz | 142.000 TL | Bekliyor
::/datatable
(İlk satır başlıklar. Statü sütununu otomatik badge yapar.)

::risks
Kritik | Betonarme gecikmesi | 12 gün gecikme, üst yapıyı bloke ediyor | Ek ekip planla
Orta | Nakit sıkışması | Kasım sonu 800K TL açık | Hakediş #8 tahsilatını hızlandır
::/risks
(Satır: severity | başlık | detay | önerilen aksiyon.)

::financial
Toplam Hakediş | 18.156.450 TL | Ödendi | 7 hakediş | ▲ %8
Bekleyen | 4.663.250 TL | Bekliyor | 5 kayıt | ▼ %3
Gecikmiş | 820.000 TL | Kritik | Aksiyon gerekli | ▲ %12
::/financial
(Satır: etiket | tutar | durum | not | trend.)

::personnel
Mehmet Kaya | Usta - Betonarme | 18 gün | Aktif | 15.400 TL
Ali Yılmaz | Kalıpçı | 12 gün | Aktif | 9.600 TL
::/personnel
(Satır: isim | rol | değer | durum | not.)

::materials
Nervürlü Demir Ø12 | 4.2 ton | 28.500 TL/ton | Kritik | Yeniden sipariş
Hazır Beton C25 | 320 m³ | 5.100 TL/m³ | Yeterli |
::/materials

::projects
Akdeniz Residence | Konut - Antalya | 78% | Zamanında | Teslim: 2026-03
Arsuz Modern Villa | Villa - Hatay | 45% | 12 gün gecikme | Teslim: 2026-05
::/projects

=================================================== ZORUNLU MAKİNE-OKUNUR ACTIONS PAYLOAD

Aksiyon önerilebilen HER cevabın SONUNA — ui bloğundan sonra — ayrı bir fenced JSON bloğu ekle. Bu blok frontend Action Center'a (WhatsApp, E-posta, Görev, Satın Alma, Rapor, Takvim) veri sağlar. Eski istemciler bu bloğu yok sayabilir; ZORUNLU değil, ama uygun her cevapta üretilmeli.

Format (aynen böyle):
\`\`\`json actions
[
  {
    "id": "unique-slug",
    "label": "Ödemeyi Aç",
    "type": "open_payment",
    "priority": "critical",
    "icon": "wallet",
    "description": "Bekleyen 185.000 TL ödeme detayına git",
    "confirmationRequired": false,
    "route": "/payments-kasa",
    "payload": { "paymentId": "..." },
    "expectedImpact": "Tedarikçi gecikmesini önler"
  }
]
\`\`\`

DESTEKLENEN type DEĞERLERİ:
open_project, open_payment, open_material, open_personnel, open_task,
create_task, create_purchase_request, create_meeting,
send_whatsapp, send_email,
export_pdf, export_excel,
open_inventory, open_report

ALAN KURALLARI:
- id: kısa, benzersiz slug (örn. "open-payment-mehmet-kaya").
- label: kullanıcıya görünen buton metni (Türkçe, 1-3 kelime).
- type: yukarıdaki listeden BİRİ. Farklı değer üretme.
- priority: "critical" | "high" | "medium" | "low" — aksiyonun aciliyeti.
- icon: lucide isim (wallet, package, users, folder-open, list-plus, bell, send, mail, phone, calendar-plus, file-text, alert-triangle, search).
- description: 1 cümle, aksiyonun ne yapacağını açıklar.
- confirmationRequired: geri alınamaz/mutasyon içeren aksiyonlarda true (create_task, send_whatsapp, send_email, mark_resolved vb.). Salt-okunur açma aksiyonları için false.
- route: mümkünse uygulama içi rota ("/payments-kasa", "/projects", "/materials", "/tasks", "/reports"). Bilinmiyorsa boş string.
- payload: aksiyona özgü serbest JSON (paymentId, projectId, workerId, phone, subject, body, materialId, taskTitle, dueDate, ...). String/number/boolean değerler kullan.
- expectedImpact: 1 cümle iş etkisi ("Tedarikçi gecikmesini önler", "Malzeme sıkışmasını azaltır", "Proje ilerlemesini hızlandırır").

ÖRÜNTÜ REHBERİ (aksiyon setleri):
- Kritik ödeme → [open_payment (critical), create_task (high, confirm), send_whatsapp (high, confirm)]
- Malzeme sıkışması → [open_inventory (high), create_purchase_request (critical, confirm), send_email (medium, confirm)]
- Gecikmiş proje → [open_project (high), open_personnel (medium), create_meeting (medium, confirm)]
- İş güvenliği/olay → [open_report (critical), create_task (critical, confirm), send_whatsapp (critical, confirm)]
- Rapor/analiz → [export_pdf (low), export_excel (low)]

KESİN KURALLAR:
- actions bloğu MUTLAKA geçerli JSON dizisi olmalı (çift tırnak, virgül sonu yok).
- Hiç aksiyon yoksa (selamlaşma, veri bulunamadı) bloğu KOYMA.
- Aksiyonları önem sırasına göre diz (critical → low).
- Aynı cevapta maksimum 5 aksiyon. Anlamsız aksiyon uydurma.
- Aksiyon türlerini uydurma; sadece yukarıdaki 14 tipten birini kullan.
- Bu blok speech ve ui bloklarının YERİNE değil, EK olarak eklenir.
`;




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
    let memoryContext = "";
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
                      `Şema: {"intent": one of ["LIVE_PERSONNEL","LIVE_PERSONNEL_COUNT","ATTENDANCE","WAGE_ANALYSIS","PERSONNEL_OVERTIME","PAYMENT_QUERY","PAYMENT_STATUS","OVERDUE_PAYMENTS","UPCOMING_PAYMENTS","SUBCONTRACTOR","SUBCONTRACTOR_STATUS","FINANCIAL_SUMMARY","EXECUTIVE_BRIEFING","PROJECT_QUERY","PROJECT_OVERVIEW","PROJECT_PROGRESS","PROJECT_HEALTH","PROJECT_RISKS","TASK_QUERY","TODAYS_TASKS","HAKEDIS_QUERY","HAKEDIS_STATUS","SITE_DIARY_QUERY","SITE_DIARY","DOCUMENT_QUERY","DOCUMENT_SEARCH","MATERIAL_QUERY","LOW_STOCK","CONTRACT_QUERY","PERSONNEL_QUERY","MEETING_SUMMARY","GENERAL_CHAT"], ` +
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
          // Alias normalization — accept the sprint-3 intent names but route
          // them to the existing dispatch handlers to avoid duplicated SQL.
          const intentAlias: Record<string, string> = {
            LIVE_PERSONNEL_COUNT: "LIVE_PERSONNEL",
            PAYMENT_STATUS: "PAYMENT_QUERY",
            HAKEDIS_STATUS: "HAKEDIS_QUERY",
            SUBCONTRACTOR_STATUS: "SUBCONTRACTOR",
            SITE_DIARY: "SITE_DIARY_QUERY",
            DOCUMENT_SEARCH: "DOCUMENT_QUERY",
          };
          if (intentAlias[intent]) intent = intentAlias[intent];

          // Sticky project inheritance — if the current turn didn't mention
          // a project, carry the last one forward from the conversation.
          if (!filters.project_name) {
            const inherited = extractPriorProject(messages || [], projList || []);
            if (inherited) {
              filters.project_name = inherited;
              console.log("[Brain] inherited project from context:", inherited);
            }
          }
          console.log("[Brain] intent(final):", intent, "filters:", filters, "voice:", voiceMode);

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

          // Resolve project_id from cached list using fuzzy resolver.
          // If the user's mention is ambiguous across multiple projects, short-circuit
          // with a clarification question instead of guessing.
          let projectIdFilter: string | null = null;
          let projectClarification: string | null = null;
          if (projectName) {
            const outcome = resolveEntity(
              projectName,
              (projList || []).map(p => ({ id: p.id, name: p.name }) as EntityCandidate),
              { autoSelectThreshold: 0.85, suggestThreshold: 0.62 },
            );
            if (outcome.status === "auto") {
              projectIdFilter = outcome.match.id;
            } else if (outcome.status === "ambiguous") {
              projectClarification = buildClarification("proje", outcome.matches);
            }
          }

          // If we hit an ambiguous project mention, ask the user to disambiguate
          // rather than returning data that might be from the wrong project.
          if (projectClarification) {
            projectDataContext = `AÇIKLAMA GEREKLİ: ${projectClarification}`;
            cacheSet(brainCache, cacheKey, projectDataContext, 10_000);
            throw new Error("__CACHE_HIT__");
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
              const nf = normalizeTr(nameFilter);
              rows = rows.filter((r: any) => normalizeTr(r.subcontractors?.name || "").includes(nf));
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
          } else if (intent === "WAGE_ANALYSIS") {
            // Yevmiye analizi — attendance_records (manuel/QR eşleşmeli puantaj) +
            // personnel (daily_wage) üzerinden gerçek maliyet hesabı. Ayrıca eşleşmeyen
            // QR girişleri de sayılır ki "veri yok" hatası oluşmasın.
            const monthStart = (() => { const d = new Date(now); d.setDate(1); return d.toISOString().slice(0, 10); })();
            const fromDate = df || monthStart;
            const toDate   = dt || now.toISOString().slice(0, 10);
            const dFrom = new Date(fromDate + "T00:00:00Z");
            const dTo   = new Date(toDate   + "T00:00:00Z");
            const spanMs = Math.max(86400000, dTo.getTime() - dFrom.getTime());
            const prevTo   = new Date(dFrom.getTime() - 86400000);
            const prevFrom = new Date(prevTo.getTime() - spanMs);
            const pFrom = prevFrom.toISOString().slice(0, 10);
            const pTo   = prevTo.toISOString().slice(0, 10);

            const wageMult = (s: string) => s === "full_day" ? 1 : s === "half_day" ? 0.5 : 0;

            let arq = sb.from("attendance_records")
              .select("work_date, status, project_id, personnel:personnel_id(full_name, daily_wage, employment_type)")
              .eq("user_id", uid)
              .gte("work_date", fromDate).lte("work_date", toDate)
              .limit(5000);
            if (projectIdFilter) arq = arq.eq("project_id", projectIdFilter);
            const { data: ar, error: arErr } = await arq;

            let arqPrev = sb.from("attendance_records")
              .select("status, personnel:personnel_id(daily_wage, employment_type)")
              .eq("user_id", uid)
              .gte("work_date", pFrom).lte("work_date", pTo)
              .limit(5000);
            if (projectIdFilter) arqPrev = arqPrev.eq("project_id", projectIdFilter);
            const { data: arPrev } = await arqPrev;

            const dailies = (ar || []).filter((r: any) => r.personnel?.employment_type === "daily_wage");
            const byWorker = new Map<string, { name: string; days: number; wage: number; total: number }>();
            const daysActive = new Set<string>();
            let totalCost = 0, totalDays = 0;
            for (const r of dailies) {
              const mult = wageMult(r.status);
              if (mult === 0) continue;
              const wage = Number(r.personnel?.daily_wage || 0);
              const name = r.personnel?.full_name || "?";
              const cur = byWorker.get(name) || { name, days: 0, wage, total: 0 };
              cur.days += mult; cur.total += mult * wage; cur.wage = wage;
              byWorker.set(name, cur);
              totalCost += mult * wage; totalDays += mult;
              daysActive.add(r.work_date);
            }
            const prevTotal = (arPrev || [])
              .filter((r: any) => r.personnel?.employment_type === "daily_wage")
              .reduce((s: number, r: any) => s + wageMult(r.status) * Number(r.personnel?.daily_wage || 0), 0);

            lines.push(`YEVMİYE ANALİZİ (${fromDate} → ${toDate}${projectIdFilter ? " · proje süzülü" : ""}):`);
            if (dailies.length === 0) {
              // Fallback: QR check-ins (personel listesinde olmayanlar dahil) —
              // "kayıt yok" demek yerine tam olarak neyin eksik olduğunu söyle.
              let waq = sb.from("worker_attendance")
                .select("full_name, check_in, project_id")
                .eq("user_id", uid)
                .gte("check_in", fromDate + "T00:00:00")
                .lte("check_in", toDate + "T23:59:59")
                .limit(2000);
              if (projectIdFilter) waq = waq.eq("project_id", projectIdFilter);
              const { data: wa } = await waq;
              const wrows = wa || [];
              const distinctQr = new Set(wrows.map((r: any) => r.full_name)).size;
              if (wrows.length > 0) {
                lines.push(`- Puantajda yevmiyeli (daily_wage) personel bulunamadı; ancak QR ile ${distinctQr} farklı kişi toplam ${wrows.length} giriş yapmış.`);
                lines.push(`- Yevmiye maliyeti hesaplanabilmesi için bu kişilerin personel listesine eklenip günlük ücretlerinin girilmesi gerekiyor.`);
              } else {
                lines.push(`- Bu dönemde ne puantaj ne de QR giriş kaydı bulundu — "veri yok" değil, dönemde hiç çalışma girişi yapılmamış.`);
              }
            } else {
              const workers = [...byWorker.values()].sort((a, b) => b.total - a.total);
              const top = workers[0];
              const bottom = workers.filter(w => w.total > 0).slice(-1)[0];
              const avg = daysActive.size > 0 ? totalCost / daysActive.size : 0;
              const trendPct = prevTotal > 0 ? ((totalCost - prevTotal) / prevTotal) * 100 : null;

              lines.push(`- Farklı yevmiyeli sayısı: ${byWorker.size}`);
              lines.push(`- Toplam yevmiye maliyeti: ${fmt(totalCost)}`);
              lines.push(`- Tam gün eşdeğeri çalışma: ${totalDays.toFixed(1)} gün`);
              lines.push(`- Aktif iş günü sayısı: ${daysActive.size}`);
              lines.push(`- Günlük ortalama maliyet: ${fmt(avg)}`);
              if (top)    lines.push(`- En yüksek ödeme: ${top.name} · ${top.days.toFixed(1)} gün × ${fmt(top.wage)} = ${fmt(top.total)}`);
              if (bottom && bottom.name !== top?.name) lines.push(`- En düşük ödeme: ${bottom.name} · ${bottom.days.toFixed(1)} gün × ${fmt(bottom.wage)} = ${fmt(bottom.total)}`);
              if (trendPct !== null) {
                const sign = trendPct >= 0 ? "+" : "";
                lines.push(`- Önceki dönem (${pFrom} → ${pTo}) toplam: ${fmt(prevTotal)} · değişim: ${sign}${trendPct.toFixed(1)}%`);
              } else {
                lines.push(`- Önceki dönemde karşılaştırılacak yevmiye kaydı yok.`);
              }
              lines.push(`\nEN ÇOK YEVMİYE ALAN İLK 10:`);
              workers.slice(0, 10).forEach((w, i) => lines.push(`${i + 1}. ${w.name} · ${w.days.toFixed(1)} gün × ${fmt(w.wage)} = ${fmt(w.total)}`));
            }
            if (arErr) lines.push(`(uyarı: ${arErr.message})`);
          } else if (intent === "LIVE_PERSONNEL" || intent === "ATTENDANCE") {
            const today = now.toISOString().slice(0, 10);
            const fromDate = df || today;
            const toDate = dt || today;
            // worker_attendance has NO `work_date` or `status` columns — it's a
            // QR check-in log keyed by `full_name` + `check_in` timestamp.
            // Filter by the `check_in` date range and rename `full_name` to
            // `worker_name` locally for the rest of the block.
            let waq = sb.from("worker_attendance")
              .select("full_name, check_in, check_out, project_id")
              .eq("user_id", uid)
              .gte("check_in", fromDate + "T00:00:00")
              .lte("check_in", toDate + "T23:59:59")
              .order("check_in", { ascending: false }).limit(200);
            if (projectIdFilter) waq = waq.eq("project_id", projectIdFilter);
            const { data: wa, error: waErr } = await waq;
            const rows = (wa || []).map((r: any) => ({
              ...r,
              worker_name: r.full_name,
              work_date: String(r.check_in || "").slice(0, 10),
              status: r.check_out ? "çıkış yaptı" : "sahada",
            }));
            if (intent === "LIVE_PERSONNEL") {
              const onSite = rows.filter((r: any) => r.check_in && !r.check_out);
              lines.push(`CANLI SAHA DURUMU (${today}):`);
              lines.push(`- Bugün giriş yapan: ${rows.length}`);
              lines.push(`- Şu an sahada (çıkış yapılmamış): ${onSite.length}`);
              onSite.slice(0, 15).forEach((r: any) => lines.push(`  · ${r.worker_name} · giriş ${String(r.check_in).slice(11, 16)}`));
              if (rows.length === 0 && !waErr) {
                // Also cross-check attendance_records so we don't say "no data"
                // when the office pattern is manual puantaj (no QR).
                let arq2 = sb.from("attendance_records")
                  .select("status, personnel:personnel_id(full_name)")
                  .eq("user_id", uid).eq("work_date", today).limit(200);
                if (projectIdFilter) arq2 = arq2.eq("project_id", projectIdFilter);
                const { data: ar2 } = await arq2;
                const present = (ar2 || []).filter((r: any) => r.status === "full_day" || r.status === "half_day");
                if (present.length > 0) {
                  lines.push(`- Manuel puantajda bugün ${present.length} kişi çalışıyor gözüküyor (QR girişi olmayabilir).`);
                  present.slice(0, 10).forEach((r: any) => lines.push(`  · ${r.personnel?.full_name || "?"} · ${r.status}`));
                } else {
                  lines.push(`NOT: Bu proje için bugün QR ya da manuel puantaj kaydı bulunamadı.`);
                }
              }
            } else {
              lines.push(`YOKLAMA (${fromDate} → ${toDate}, ${rows.length} kayıt):`);
              rows.slice(0, 25).forEach((r: any) => lines.push(`- ${r.work_date} · ${r.worker_name} · giriş ${String(r.check_in || "-").slice(11, 16)} · çıkış ${String(r.check_out || "-").slice(11, 16)} · ${r.status}`));
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
          } else if (intent === "TODAYS_TASKS") {
            const today = now.toISOString().slice(0, 10);
            let q = sb.from("tasks")
              .select("title, status, priority, due_date, project_id, projects(name)")
              .eq("user_id", uid)
              .or(`due_date.eq.${today},and(due_date.lte.${today},status.neq.done)`)
              .order("priority", { ascending: false })
              .limit(30);
            if (projectIdFilter) q = q.eq("project_id", projectIdFilter);
            const { data } = await q;
            const rows = (data || []) as any[];
            const todays = rows.filter(r => r.due_date === today);
            const overdue = rows.filter(r => r.due_date && r.due_date < today && r.status !== "done");
            lines.push(`BUGÜNKÜ İŞ PLANI — ${today}`);
            lines.push(`Bugün vadesi olan görev: ${todays.length} · Bugüne devreden geciken: ${overdue.length}`);
            if (todays.length) {
              lines.push(`\nBUGÜN:`);
              todays.slice(0, 15).forEach(r => lines.push(`- [${r.priority || "normal"}] ${r.title} · ${r.projects?.name || "-"} · durum: ${r.status}`));
            }
            if (overdue.length) {
              lines.push(`\nGECİKEN (öncelik verilmeli):`);
              overdue.slice(0, 10).forEach(r => lines.push(`- [${r.priority || "normal"}] ${r.title} · ${r.projects?.name || "-"} · vade: ${r.due_date}`));
            }
          } else if (intent === "LOW_STOCK") {
            // Compare stock (entries − exits) vs material_norms.norm_quantity per project.
            let mq = sb.from("materials").select("id, name, unit, project_id, projects(name)").eq("user_id", uid).limit(300);
            if (projectIdFilter) mq = mq.eq("project_id", projectIdFilter);
            const { data: mats } = await mq;
            const mrows = (mats || []) as any[];
            const ids = mrows.map(m => m.id);
            let entries: any[] = [], exits: any[] = [], norms: any[] = [];
            if (ids.length) {
              const [e, x, n] = await Promise.all([
                sb.from("material_entries").select("material_id, quantity").in("material_id", ids),
                sb.from("material_exits").select("material_id, quantity").in("material_id", ids),
                sb.from("material_norms").select("material_id, norm_quantity").in("material_id", ids),
              ]);
              entries = e.data || []; exits = x.data || []; norms = n.data || [];
            }
            const stockOf = (mid: string) =>
              entries.filter(e => e.material_id === mid).reduce((s, e) => s + Number(e.quantity || 0), 0) -
              exits.filter(e => e.material_id === mid).reduce((s, e) => s + Number(e.quantity || 0), 0);
            const normOf = (mid: string) => {
              const n = norms.find(n => n.material_id === mid);
              return n ? Number(n.norm_quantity || 0) : 0;
            };
            const scored = mrows.map(m => {
              const stock = stockOf(m.id);
              const norm = normOf(m.id);
              const ratio = norm > 0 ? stock / norm : (stock <= 0 ? 0 : 1);
              return { m, stock, norm, ratio };
            }).filter(r => r.norm > 0 ? r.ratio < 0.4 : r.stock <= 0)
              .sort((a, b) => a.ratio - b.ratio)
              .slice(0, 15);
            lines.push(`KRİTİK / DÜŞÜK STOK (${scored.length} kalem):`);
            if (scored.length === 0) lines.push(`- Tanımlı normlara göre kritik seviyeye inen malzeme yok.`);
            scored.forEach(r => lines.push(
              `- ${r.m.name} (${r.m.projects?.name || "-"}) · stok: ${r.stock} ${r.m.unit || ""}` +
              (r.norm > 0 ? ` · norm: ${r.norm} · doluluk: %${Math.round(r.ratio * 100)}` : ` · norm tanımsız`)
            ));
          } else if (intent === "PERSONNEL_OVERTIME") {
            const fromDate = df || (() => { const d = new Date(now); d.setDate(d.getDate() - 7); return d.toISOString().slice(0, 10); })();
            const toDate = dt || now.toISOString().slice(0, 10);
            let waq = sb.from("worker_attendance")
              .select("full_name, check_in, check_out, project_id, projects(name)")
              .eq("user_id", uid)
              .gte("check_in", fromDate + "T00:00:00")
              .lte("check_in", toDate + "T23:59:59")
              .not("check_out", "is", null)
              .limit(500);
            if (projectIdFilter) waq = waq.eq("project_id", projectIdFilter);
            const { data: wa } = await waq;
            const rows = (wa || []) as any[];
            const overtime = rows.map(r => {
              const inMs = new Date(r.check_in).getTime();
              const outMs = new Date(r.check_out).getTime();
              const hours = (outMs - inMs) / 3600_000;
              return { ...r, worker_name: r.full_name, work_date: String(r.check_in || "").slice(0, 10), hours };
            }).filter(r => r.hours >= 9).sort((a, b) => b.hours - a.hours);
            lines.push(`FAZLA MESAİ (${fromDate} → ${toDate}) · ≥ 9 saat vardiyalar: ${overtime.length}`);
            overtime.slice(0, 15).forEach(r =>
              lines.push(`- ${r.work_date} · ${r.worker_name} · ${r.hours.toFixed(1)} sa · ${r.projects?.name || "-"}`)
            );
            const byWorker = new Map<string, number>();
            overtime.forEach(r => byWorker.set(r.worker_name, (byWorker.get(r.worker_name) || 0) + (r.hours - 8)));

            const top = [...byWorker.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
            if (top.length) {
              lines.push(`\nEN YOĞUN İŞÇİLER (fazla saat toplamı):`);
              top.forEach(([n, h], i) => lines.push(`${i + 1}. ${n} · +${h.toFixed(1)} sa`));
            }
          } else if (intent === "MEETING_SUMMARY") {
            let mq = sb.from("meetings")
              .select("id, title, meeting_date, meeting_type, project_id, status")
              .eq("user_id", uid).order("meeting_date", { ascending: false }).limit(5);
            if (projectIdFilter) mq = mq.eq("project_id", projectIdFilter);
            const { data: meets } = await mq;
            const mrows = (meets || []) as any[];
            lines.push(`SON TOPLANTILAR (${mrows.length}):`);
            for (const meet of mrows) {
              lines.push(`- ${meet.meeting_date} · ${meet.title} · ${meet.meeting_type || "-"} · ${meet.status}`);
            }
            if (mrows.length) {
              const [analysis, actions] = await Promise.all([
                sb.from("meeting_analyses").select("meeting_id, summary, key_decisions, risks").in("meeting_id", mrows.map(m => m.id)),
                sb.from("meeting_action_items").select("meeting_id, title, owner, due_date, status").in("meeting_id", mrows.map(m => m.id)).order("due_date", { ascending: true }),
              ]);
              const latest = mrows[0];
              const la = (analysis.data || []).find((a: any) => a.meeting_id === latest.id);
              if (la?.summary) { lines.push(`\nEN SON TOPLANTI ÖZETİ (${latest.title}):`); lines.push(String(la.summary).slice(0, 600)); }
              const openActions = (actions.data || []).filter((a: any) => a.status !== "done");
              if (openActions.length) {
                lines.push(`\nAÇIK AKSİYON MADDELERİ (${openActions.length}):`);
                openActions.slice(0, 15).forEach((a: any) =>
                  lines.push(`- ${a.title} · sorumlu: ${a.owner || "-"} · termin: ${a.due_date || "-"} · durum: ${a.status}`)
                );
              }
            }
          } else if (intent === "PROJECT_PROGRESS") {
            let pq = sb.from("projects").select("id, name, status, progress, start_date, end_date").eq("user_id", uid).limit(30);
            if (projectIdFilter) pq = pq.eq("id", projectIdFilter);
            const { data: projs } = await pq;
            const today = now.toISOString().slice(0, 10);
            const scored = (projs || []).map((p: any) => {
              const start = p.start_date ? new Date(p.start_date).getTime() : null;
              const end = p.end_date ? new Date(p.end_date).getTime() : null;
              const nowMs = new Date(today).getTime();
              let timeUsed: number | null = null;
              if (start && end && end > start) timeUsed = Math.max(0, Math.min(1, (nowMs - start) / (end - start)));
              const prog = Number(p.progress || 0) / 100;
              const gap = timeUsed !== null ? prog - timeUsed : null;
              return { p, timeUsed, prog, gap };
            }).sort((a, b) => (a.gap ?? 0) - (b.gap ?? 0));
            lines.push(`PROJE İLERLEME KIYASI (${scored.length} proje) — ilerleme vs geçen süre:`);
            scored.slice(0, 15).forEach(s => {
              const gapPct = s.gap !== null ? `${Math.round(s.gap * 100)}%` : "-";
              const status = s.gap === null ? "süre yok" : s.gap < -0.15 ? "🔴 CİDDİ GECİKME" : s.gap < -0.05 ? "🟡 gecikme" : "🟢 uyumlu";
              lines.push(`- ${s.p.name} · ilerleme: %${s.p.progress} · süre kullanımı: ${s.timeUsed !== null ? Math.round(s.timeUsed * 100) + "%" : "-"} · fark: ${gapPct} · ${status}`);
            });
          } else if (intent === "PROJECT_HEALTH" || intent === "PROJECT_RISKS") {
            const today = now.toISOString().slice(0, 10);
            const in14 = new Date(now); in14.setDate(in14.getDate() + 14);
            const in14s = in14.toISOString().slice(0, 10);
            let pq = sb.from("projects").select("id, name, status, progress, start_date, end_date, contract_amount").eq("user_id", uid).limit(20);
            if (projectIdFilter) pq = pq.eq("id", projectIdFilter);
            const { data: projs } = await pq;
            const pr = (projs || []) as any[];
            const pids = pr.map(p => p.id);
            const [overdueTasks, overdueChecks, overdueSubs, upcomingChecks, pendingHak, lowStockMats, siteDiary] = await Promise.all([
              sb.from("tasks").select("project_id, title").eq("user_id", uid).lt("due_date", today).neq("status", "done"),
              sb.from("cash_checks").select("project_id, amount, due_date").eq("user_id", uid).lt("due_date", today).neq("status", "paid"),
              sb.from("subcontractor_payments").select("project_id, amount").eq("user_id", uid).lt("planned_date", today).is("payment_date", null),
              sb.from("cash_checks").select("project_id, amount, due_date").eq("user_id", uid).gte("due_date", today).lte("due_date", in14s),
              sb.from("project_hakedis").select("project_id, net_total").eq("user_id", uid).eq("approval_status", "beklemede"),
              pids.length ? sb.from("materials").select("id, project_id, name").in("project_id", pids) : Promise.resolve({ data: [] as any[] }),
              sb.from("site_diary_entries").select("project_id, entry_date").eq("user_id", uid).order("entry_date", { ascending: false }).limit(200),
            ]);
            // Aggregate risks per project
            const perProject = pr.map(p => {
              const oTasks = (overdueTasks.data || []).filter((t: any) => t.project_id === p.id);
              const oChecks = (overdueChecks.data || []).filter((c: any) => c.project_id === p.id);
              const oSubs = (overdueSubs.data || []).filter((s: any) => s.project_id === p.id);
              const upC = (upcomingChecks.data || []).filter((c: any) => c.project_id === p.id);
              const pending = (pendingHak.data || []).filter((h: any) => h.project_id === p.id);
              const lastDiary = (siteDiary.data || []).find((d: any) => d.project_id === p.id)?.entry_date || null;
              const daysSinceDiary = lastDiary ? Math.floor((Date.now() - new Date(lastDiary).getTime()) / 86_400_000) : 999;
              // Time vs progress
              const start = p.start_date ? new Date(p.start_date).getTime() : null;
              const end = p.end_date ? new Date(p.end_date).getTime() : null;
              const timeUsed = (start && end && end > start) ? Math.max(0, Math.min(1, (Date.now() - start) / (end - start))) : null;
              const progGap = timeUsed !== null ? (Number(p.progress || 0) / 100) - timeUsed : 0;
              // Health score 0-100
              let score = 100;
              score -= Math.min(25, oTasks.length * 3);
              score -= Math.min(25, (oChecks.length + oSubs.length) * 5);
              score -= Math.min(15, Math.max(0, -progGap * 100));
              score -= pending.length > 3 ? 8 : 0;
              score -= daysSinceDiary > 7 ? 8 : daysSinceDiary > 3 ? 4 : 0;
              score = Math.max(0, Math.round(score));
              const overdueAmount = oChecks.reduce((s, c) => s + Number(c.amount || 0), 0) + oSubs.reduce((s, x) => s + Number(x.amount || 0), 0);
              const upcomingAmount = upC.reduce((s, c) => s + Number(c.amount || 0), 0);
              const risks: string[] = [];
              if (oChecks.length + oSubs.length > 0) risks.push(`Geciken ödeme: ${oChecks.length + oSubs.length} kalem, ${fmt(overdueAmount)}`);
              if (oTasks.length > 0) risks.push(`Geciken görev: ${oTasks.length}`);
              if (progGap < -0.1) risks.push(`İlerleme takvimin ${Math.round(-progGap * 100)} puan gerisinde`);
              if (upcomingAmount > 0) risks.push(`14 gün içinde ${fmt(upcomingAmount)} çek vadesi geliyor`);
              if (pending.length > 3) risks.push(`Onay bekleyen hakediş: ${pending.length}`);
              if (daysSinceDiary > 7) risks.push(`Şantiye günlüğü ${daysSinceDiary} gündür güncellenmemiş`);
              return { p, score, risks, oTasksN: oTasks.length, overdueAmount, upcomingAmount, pendingN: pending.length, progGap, daysSinceDiary };
            }).sort((a, b) => a.score - b.score);

            if (intent === "PROJECT_HEALTH") {
              lines.push(`PROJE SAĞLIK SKORLARI (${perProject.length} proje) — düşük skor = yüksek risk:`);
              perProject.forEach(x => {
                const flag = x.score >= 80 ? "🟢" : x.score >= 60 ? "🟡" : "🔴";
                lines.push(`${flag} ${x.p.name} · SAĞLIK: ${x.score}/100 · ilerleme %${x.p.progress}${x.progGap ? ` (fark ${Math.round(x.progGap * 100)}%)` : ""}`);
                x.risks.slice(0, 3).forEach(r => lines.push(`   · ${r}`));
              });
            } else {
              // PROJECT_RISKS — surface highest-impact risks first, across all projects
              const allRisks = perProject.flatMap(x => x.risks.map(r => ({ project: x.p.name, score: x.score, risk: r, amount: x.overdueAmount + x.upcomingAmount })));
              allRisks.sort((a, b) => (a.score - b.score) || (b.amount - a.amount));
              lines.push(`EN YÜKSEK ETKİLİ RİSKLER (öncelik sırasıyla):`);
              allRisks.slice(0, 8).forEach((r, i) => lines.push(`${i + 1}. [${r.project}] ${r.risk}`));
              if (allRisks.length === 0) lines.push(`- Şu anda ölçülebilir kritik risk yok. Sağlık skorları normal aralıkta.`);
            }
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
              TODAYS_TASKS: { reason: "Bugün için planlı görev bulunmuyor.", alt: "Bu haftanın açık görevlerini veya geciken işleri listeleyebilirim." },
              LOW_STOCK: { reason: "Malzeme norm tanımlı değil ya da stok verisi henüz girilmemiş; kritik stok analizi yapılamıyor.", alt: "Malzeme normlarını tanımlayıp giriş/çıkış kayıtlarını ekledikten sonra kritik stokları çıkarabilirim." },
              PERSONNEL_OVERTIME: { reason: "Seçili aralıkta 9 saati aşan vardiya kaydı bulunmuyor.", alt: "Genel yoklama özetini veya bu haftaki toplam adam/saat dağılımını gösterebilirim." },
              WAGE_ANALYSIS: { reason: "Seçili dönemde ne puantaj (attendance_records) ne de QR (worker_attendance) kaydı bulunamadı — 'veri yok' değil, dönemde yevmiyeli çalışma girişi yapılmamış.", alt: "Farklı bir tarih aralığına bakabilirim ya da tanımlı yevmiyeli personel listesini çıkarabilirim." },

              MEETING_SUMMARY: { reason: "Toplantı kaydı bulunmuyor.", alt: "Toplantı Merkezi'nde yeni bir toplantı başlattığında transkript ve karar özetini otomatik çıkarabilirim." },
              PROJECT_PROGRESS: { reason: "İlerleme kıyaslaması için başlangıç/bitiş tarihi olan proje yok.", alt: "Aktif proje listesini veya sözleşme özetini gösterebilirim." },
              PROJECT_HEALTH: { reason: "Sağlık skoru hesaplamak için yeterli proje verisi yok.", alt: "İlk projeni oluşturup görev/ödeme kayıtlarını girdiğinde skorları çıkarabilirim." },
              PROJECT_RISKS: { reason: "Şu anda ölçülebilir bir kritik risk sinyali yok.", alt: "Yaklaşan ödeme takvimini veya proje ilerleme durumunu gösterebilirim." },
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
        `- Selamla veya "size nasıl yardımcı olabilirim" ile BAŞLAMA. Doğrudan konuya gir.\n` +
        `- "Kontrol ettim", "Verilere göre", "İnceledim" gibi kalıpları TEKRARLAMA. Cümle başlarını çeşitlendir; doğal, deneyimli yönetici tonu kullan.\n` +
        `- Veritabanı rakamını olduğu gibi tekrar etme; yorumla ve ne anlama geldiğini söyle.\n` +
        `- Sayı ve tarihleri doğal söyle ("bir milyon iki yüz bin lira", "on beş Kasım").\n` +
        `- Markdown, tablo, madde, emoji YOK. Yanıt 15–30 saniyeyi aşmasın (40–80 kelime); uzun açıklamayı sadece kullanıcı isterse ver.\n` +
        `YAPI: Kısa durum → bunun anlamı → önerilen somut adım → tek kısa takip sorusu.\n` +
        `EYLEM ODAKLILIK: "Yapamam", "yetkim yok" ile ASLA bitirme. Kullanıcı birine haber verilmesini isterse mesajı SEN hazırla, sesli oku ve onay iste. Entegrasyon yoksa: "Mesaj hazır, WhatsApp entegrasyonu açıldığında tek dokunuşla gönderirsiniz." de.\n` +
        `VERİ DÜRÜSTLÜĞÜ: Aşağıdaki VERİ bloğunda bilgi yoksa uydurma; neden olmadığını açıkla ve hangi verinin gerekli olduğunu söyle.\n` +
        `BAĞLAM: Aynı sohbette daha önce geçen konuya doğal devam et; giriş cümlesini tekrarlama.` +
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

    // Tee the SSE stream so we can log the assembled assistant output
    // (raw text + parsed speech/ui) while still forwarding it to the client.
    const [clientStream, logStream] = response.body!.tee();

    (async () => {
      try {
        const reader = logStream.getReader();
        const decoder = new TextDecoder();
        let raw = "";
        let buf = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const lines = buf.split("\n");
          buf = lines.pop() ?? "";
          for (const line of lines) {
            const l = line.trim();
            if (!l.startsWith("data:")) continue;
            const data = l.slice(5).trim();
            if (!data || data === "[DONE]") continue;
            try {
              const json = JSON.parse(data);
              const delta = json?.choices?.[0]?.delta?.content;
              if (typeof delta === "string") raw += delta;
            } catch { /* ignore partial */ }
          }
        }

        // Parse ui payloads (mirrors frontend useAIResponse contract)
        const uiPayloads: any[] = [];
        const actionPayloads: any[] = [];
        let speech = raw;
        speech = speech.replace(/```(?:json)?\s*ui\s*\n([\s\S]*?)```/gi, (_m, body) => {
          try {
            const p = JSON.parse(body);
            (Array.isArray(p) ? p : [p]).forEach((x) => uiPayloads.push(x));
          } catch (e) {
            console.warn("[Brain] ui block JSON parse failed:", (e as Error).message);
          }
          return "";
        });
        speech = speech.replace(/```(?:json)?\s*actions\s*\n([\s\S]*?)```/gi, (_m, body) => {
          try {
            const p = JSON.parse(body);
            (Array.isArray(p) ? p : [p]).forEach((x) => actionPayloads.push(x));
          } catch (e) {
            console.warn("[Brain] actions block JSON parse failed:", (e as Error).message);
          }
          return "";
        });
        speech = speech.replace(/::ui[^\n]*\n([\s\S]*?)\n?::\/ui/gi, (_m, body) => {
          try {
            const p = JSON.parse(body);
            (Array.isArray(p) ? p : [p]).forEach((x) => uiPayloads.push(x));
          } catch { /* ignore */ }
          return "";
        });
        const tail = speech.match(/\{\s*"ui"\s*:\s*(\{[\s\S]*\}|\[[\s\S]*\])\s*\}\s*$/);
        if (tail) {
          try {
            const p = JSON.parse(tail[0]);
            if (p?.ui) (Array.isArray(p.ui) ? p.ui : [p.ui]).forEach((x: any) => uiPayloads.push(x));
            speech = speech.slice(0, tail.index).trimEnd();
          } catch { /* ignore */ }
        }

        console.log("[Brain] RAW LLM OUTPUT:\n" + raw);
        console.log("[Brain] PARSED SPEECH:\n" + speech.trim());
        console.log("[Brain] PARSED UI PAYLOAD: " + JSON.stringify(uiPayloads));
        console.log("[Brain] PARSED ACTIONS PAYLOAD: " + JSON.stringify(actionPayloads));
        if (uiPayloads.length === 0) {
          console.warn("[Brain] ⚠️  NO UI PAYLOAD emitted by the model for this response.");
        }
      } catch (err) {
        console.error("[Brain] stream logger failed:", err);
      }
    })();

    return new Response(clientStream, {
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
