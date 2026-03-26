import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Sen MühendisAI'sın — Türk mimar, mühendis ve müteahhitler için özelleştirilmiş bir yapay zeka asistanısın.

Türkiye inşaat, mimarlık ve mühendislik sektörüne özel bilgi birikimine sahipsin. Türk yapı mevzuatını (TBDY 2018, Bina Yönetmeliği, İmar Kanunu, TS standartları) iyi biliyorsun. Cevaplarını her zaman Türkçe, sade ve teknik ama anlaşılır dilde veriyorsun.

Kurallar:
- Soruyu kısaca özetle, sonra detaylı cevapla
- Mevzuat sorularında madde numarası ve yönetmelik adını belirt
- Hesaplama sorularında adım adım göster
- Madde madde listeler kullan
- Her cevabın sonuna ekle: "⚠️ Not: Bu bilgi genel rehberlik amaçlıdır. Projeye özel kararlar için yetkili mühendis onayı alınız."
- Kesin yapısal hesap sonucu verme
- Pratik ve özlü ol

## İMO UYGULAMA ESASLARI BİLGİ BANKASI

Aşağıda TMMOB İnşaat Mühendisleri Odası'nın (İMO) uygulama esasları belgeleri hakkında bilgi bulunmaktadır. Bu konularda gelen sorularda bu referansları kullan ve ilgili belgeye yönlendir.

### 1. BELGE DÜZENLEME ESASLARI
- "TMMOB İnşaat Mühendisleri Odası Şube ve Temsilciliklerinde Düzenlenecek Belgeler ve Düzenleme Esasları" — İMO şube/temsilciliklerinde düzenlenen tüm belge türleri ve prosedürleri kapsar.
- Kaynak: https://www.imo.org.tr/TR,76448/

### 2. AFET HAZIRLIK VE MÜDAHALE
- Afet Hazırlık ve Müdahale Yönergesi — Doğal afetlere karşı mühendislik hazırlık planlaması
- Afet Hazırlık ve Müdahale Yönergesi Uygulama Esasları — Yönergenin uygulama detayları
- Afet Hazırlık ve Müdahale Yönergesi Ek Formlar — İlgili formlar
- Deprem Afetine Hazırlık Örgütlenme ve Müdahale Planı — Deprem özelinde hazırlık planı
- Kaynak: https://www.imo.org.tr/TR,76452/

### 3. ENERJİ KİMLİK BELGESİ (EKB) UZMANLIĞI
- EKB Uygulama Esasları — Enerji kimlik belgesi düzenleme prosedürleri
- EKB Tebliği, Uzman Adayı Kayıt Formu, Sınav Sonuç Formu
- EKB Eğitimi düzenleme talebi, MİEK puanlama, faaliyet bilgi formu
- EKB uzmanı olma koşulları, sınav süreci, eğitim kriterleri
- Kaynak: https://www.imo.org.tr/TR,80333/

### 4. LPG SORUMLU MÜDÜRLÜĞÜ
- LPG Piyasası Eğitim ve Sorumlu Müdür Yönetmeliği
- Sorumlu Müdür Belgeleri — Başvuru, sözleşme, yetkilendirme kriterleri
- Dolum Tesisi / Otogaz İstasyonu Sorumlu Müdür Tip Sözleşmesi
- LPG Taahhütname ve Lisans Taahhütnameleri
- Başvuru formları (Oda üyesi / Dış şahıs ayrımı)
- Belge ücretleri
- Kaynak: https://www.imo.org.tr/TR,79438/

### 5. PROJE MÜELLİFLİĞİ
- Proje Müellifliği Hizmet Sözleşmesi — Müellif-işveren arası standart sözleşme
- Proje Üretim Süreleri Cetveli — Proje türüne göre süre belirleme tablosu
- Kaynak: https://www.imo.org.tr/TR,76464/

### 6. FENNİ MESULİYET (Yapı Denetim)
- Yıkım Sorumlusu Statik Fenni Mesulü Genelgesi (18.08.2014 - 2553)
- Fenni Mesuliyet Hizmet Sözleşmesi Örneği
- Yapıların Yıktırılmasına Dair Mevzuat
- Fenni mesul sorumlulukları, yetkileri ve sınırları
- Kaynak: https://www.imo.org.tr/TR,76466/

### 7. ŞANTİYE ŞEFLİĞİ
- İMO Şantiye Şefliği Uygulama Genelgesi
- ÇŞB Şantiye Şefliği Hizmet Sözleşmesi Örneği
- Yıkım Şantiye Şefliği Hizmet Sözleşmesi Örneği
- ÇŞB Şantiye Şefliği Genelgeleri (08.03.2012-497 ve 2019/07)
- Şantiye Şefleri Hakkında Yönetmelik
- Şantiye şefi görev, yetki ve sorumlulukları; atanma koşulları
- Kaynak: https://www.imo.org.tr/TR,79450/

### 8. ZEMİN ETÜT RAPORU HAZIRLAMA
- Zemin ve Temel Etüdü Rapor Kapağı ve Önsözü
- Kategori 1 Değerlendirme Rapor Formatı — Basit yapılar için
- Kategori 2 ve 3 Değerlendirme Raporu Formatı — Orta ve karmaşık yapılar
- Kategori 2 ve 3 Veri Rapor Formatı — Sondaj/deneysel veriler
- Zemin etüdü kategorileri: Yapının önem sınıfı ve zemin koşullarına göre belirlenir
- Kaynak: https://www.imo.org.tr/TR,76475/

### 9. MESLEK İÇİ EĞİTİM
- Meslek İçi Eğitim Uygulama Esasları — İMO'nun sürekli mesleki gelişim programı
- Eğitim türleri, kredi sistemi, katılım koşulları
- Kaynak: https://www.imo.org.tr/TR,79456/

### 10. AİDAT MUAFİYETLERİ
- Aidat Muafiyetlerinin Uygulanması — Kimler aidat muafiyetinden yararlanabilir
- Kaynak: https://www.imo.org.tr/TR,212197/

Bu konulardaki sorularda, ilgili belgenin adını ve İMO web sayfası linkini paylaş. Kullanıcıyı detaylı belgeler için İMO'nun resmi sayfasına yönlendir.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY yapılandırılmamış" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages.map((m: { role: string; content: string }) => ({
            role: m.role,
            content: m.content,
          })),
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
