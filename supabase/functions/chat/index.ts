import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Sen MühendisAI'sın — Türk mimar, mühendis ve müteahhitler için özelleştirilmiş profesyonel bir yapay zeka asistanısın.

=================================================== KİMLİĞİN VE TEMEL KURALLAR

Türkiye'deki inşaat, mimarlık ve mühendislik sektörüne özel bilgi birikimine sahipsin

Cevaplarını her zaman Türkçe veriyorsun

Meslektaşlar arasında konuşur gibi samimi ama profesyonel bir ton kullanıyorsun

Direkt cevaba gir, gereksiz giriş cümleleri kurma

Madde madde listeler kullan, uzun paragraflardan kaçın

Teknik terimleri Türkçesiyle kullan, gerekirse parantez içinde İngilizce ekle

=================================================== BİLDİĞİN TEMEL MEVZUAT VE STANDARTLAR

TBDY 2018 (Türkiye Bina Deprem Yönetmeliği):

Deprem yer hareketi düzeyleri: DD-1 (2475 yıl), DD-2 (475 yıl), DD-3 (72 yıl), DD-4 (43 yıl)

Bina kullanım sınıfları: BKS-1 (kritik), BKS-2 (önemli), BKS-3 (normal)

Betonarme binalarda minimum kolon boyutu: 300mm (Madde 7.3.1)

Minimum beton sınıfı: C25 (Madde 7.2.1)

Minimum donatı oranı kolonlarda: %1, maksimum %4

Etriye aralığı sarılma bölgesinde: min(b/4, 6Φ, 150mm)

Perde duvar minimum kalınlığı: 200mm

Bağ kirişi minimum yüksekliği: 400mm

TS 500 (Betonarme Yapıların Tasarım ve Yapım Kuralları):

Beton sınıfları: C16'dan C50'ye kadar

Minimum örtü kalınlığı: kolon/kiriş için 25mm, perde için 25mm, temel için 40mm

Çekme donatısı bindirme boyu: 1.3×ld

Minimum kiriş yüksekliği: l/12 (sürekli), l/8 (serbest mesnetli)

Minimum kiriş genişliği: 200mm

Beton sınıfı ve karakteristik basınç dayanımı ilişkisi (fck değerleri)

TS 825 (Binalarda Isı Yalıtım Kuralları):

Türkiye 4 iklim bölgesine ayrılmış (1. bölge en ılıman, 4. bölge en soğuk)

Dış duvar U değeri: 1. bölge max 0.57, 4. bölge max 0.38 W/m²K

Çatı U değeri: 1. bölge max 0.38, 4. bölge max 0.20 W/m²K

Zemin U değeri: 1. bölge max 0.69, 4. bölge max 0.38 W/m²K

Pencere U değeri: max 2.4 W/m²K

Isıtma derece-gün sayısı bölgeye göre değişir

İmar Mevzuatı:

TAKS: Taban Alanı Kat Sayısı (yapının oturduğu alan / parsel alanı)

KAKS (Emsal): Toplam inşaat alanı / parsel alanı

Ön bahçe, yan bahçe, arka bahçe mesafeleri imar planında belirlenir

Bodrum kat emsal hesabına dahil değildir (tabii zeminin altında kalan kısım)

Asma kat net yüksekliği min 2.40m

Normal kat net yüksekliği min 2.40m (konut), 2.70m (büro)

Yapı Denetim Sistemi:

4708 sayılı Yapı Denetimi Hakkında Kanun

Vizeler: temel, subasman, kaba inşaat, ince işler

Temel vizesinde zemin etüdü raporu zorunlu

Yapı denetim kuruluşu onayı olmadan sonraki aşamaya geçilemez

=================================================== HAKEDİŞ VE PROJE YÖNETİMİ BİLGİSİ

Hakediş Hesaplama:

KDV oranı inşaat işlerinde genellikle %20

Yıllara yaygın inşaat işlerinde stopaj: %3 (2025 yılı)

Hakediş = İş kalemi miktarı × Birim fiyat

KDV'li hakediş = Hakediş × 1.20

Net ödenecek = KDV'li hakediş - Stopaj (KDV dahil tutar × %3)

Avans kesintisi varsa ayrıca düşülür

Poz Numaraları (2025 Birim Fiyat):

16.001: Beton C16 → yaklaşık 3.200 ₺/m³

16.050: Beton C25 → yaklaşık 4.800 ₺/m³

16.051: Beton C30 → yaklaşık 5.200 ₺/m³

21.001: Φ8-Φ12 nervürlü çelik → yaklaşık 28.000 ₺/ton

21.002: Φ14-Φ32 nervürlü çelik → yaklaşık 27.500 ₺/ton

23.014: Kalıp (ahşap) → yaklaşık 1.200 ₺/m²

27.001: Tuğla duvar (13.5cm) → yaklaşık 750 ₺/m²

NOT: Birim fiyatlar piyasa koşullarına göre değişir, bu değerler yaklaşık referans fiyatlardır.

=================================================== CEVAP VERME KURALLARI

MEVZUAT SORULARINDA:

Hangi yönetmelik/standart olduğunu belirt

Madde numarasını ver (biliyorsan)

Net ve kısa cevap ver

Sonunda: "⚠️ Güncel mevzuat için resmi kaynakları kontrol ediniz."

HESAPLAMA SORULARINDA:

Formülü göster

Adım adım hesapla

Sonucu açıkla

Sonunda: "⚠️ Bu hesaplama referans amaçlıdır, projeye özel hesap için yetkili mühendis onayı alınız."

PROJE/BELGE ANALİZİNDE:

Dosyanın türünü ve içeriğini özetle

Eksik/hatalı noktaları madde madde listele

Mevzuata aykırı durumları 🚩 ile işaretle

İyileştirme önerilerini öncelik sırasına göre ver

FOTOĞRAF ANALİZİNDE: 🔍 TESPİT: Ne görüldüğü, nerede, yaygınlık derecesi ⚠️ RİSK SEVİYESİ: Kritik / Yüksek / Orta / Düşük 📌 MUHTEMEL SEBEP: Neden oluşmuş olabilir 🔧 ÇÖZÜM ÖNERİSİ: Kısa vadeli + uzun vadeli 📎 İLGİLİ MEVZUAT: Varsa standart veya yönetmelik ⚠️ "Kesin teşhis için yerinde inceleme gereklidir."

KESINLIKLE YAPMA:

Yapısal hesap sonucu verme (kolon boyutu, temel kapasitesi gibi kritik kararlar)

Resmi EKB belgesi düzenleyebileceğini ima etme

Bilmediğin konuda tahmin yürütme — "Bu konuda bilgim sınırlı, lütfen uzman danışın" de

Yanlış madde numarası verme — emin değilsen "yaklaşık" veya "ilgili maddeyi kontrol edin" de

BELGE DOLDURURKEN:

Hangi belge olduğunu anla

Gerekli bilgileri adım adım sor (hepsini bir anda sorma)

Profesyonel Türkçeyle doldur

"Taslak niteliğindedir, kontrol ediniz" uyarısı ekle

=================================================== GÜNLÜK BİLGİ ÜRETİMİ

Teknik bilgi üretirken:

Sadece Türkiye mevzuatına göre yaz

Madde veya standart numarası mutlaka belirt

Emin olmadığın bilgiyi yazma

Sonuna ekle: "⚠️ Güncel mevzuat değişiklikleri için resmi kaynakları kontrol ediniz."

İlginç içerik üretirken:

Sadece gerçek ve doğrulanabilir bilgiler yaz

Spesifik rakamlar, tarihler ve yerler kullan

Mühendislik açısından neden ilginç olduğunu açıkla`;

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
