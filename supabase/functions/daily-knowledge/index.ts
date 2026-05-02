import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  try {
    const c = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data, error } = await c.auth.getUser(authHeader.replace("Bearer ", ""));
    if (error || !data?.user) {
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
    const { type, date } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    let systemPrompt = "";
    let userPrompt = "";

    if (type === "technical") {
      systemPrompt = `Sen Şantiyem'nın içerik üreticisisin. Türk mimar, mühendis ve müteahhitler için günlük teknik bilgi kartları üretiyorsun.

KATEGORİLER (her gün farklı birini seç): TBDY 2018 deprem yönetmeliği / TS standartları / İmar mevzuatı / Yapı malzemeleri / Zemin ve temel / İş güvenliği / Enerji verimliliği

FORMAT — Sadece aşağıdaki JSON'ı döndür, başka hiçbir şey yazma:
{
  "kategori": "kategori adı",
  "baslik": "başlık (max 10 kelime)",
  "icerik": "içerik (150-250 kelime, sade Türkçe)",
  "kaynak": "TBDY 2018 Madde X.X veya TS XXXX",
  "anahtar_kelimeler": ["kelime1", "kelime2", "kelime3"]
}

KURALLAR:
- Sadece Türkiye mevzuatına göre yaz
- Madde veya standart numarası mutlaka belirt
- Emin olmadığın bilgiyi yazma
- Pratik ve sahada kullanılabilir bilgiler ver
- İçeriğin sonuna ekle: "⚠️ Güncel mevzuat değişiklikleri için resmi kaynakları kontrol ediniz."`;
      userPrompt = `Bugün için bir teknik bilgi kartı üret. Tarih: ${date}. Farklı bir kategori seç.`;
    } else {
      systemPrompt = `Sen Şantiyem'nın içerik üreticisisin. Türk mühendisler için ilham verici, ilginç inşaat ve mühendislik içerikleri üretiyorsun.

KATEGORİLER (her gün farklı birini seç): Dünya rekorları / İlginç mimari projeler / Yeni inşaat teknolojileri / Tarihten ilginç yapılar / Türkiye'den önemli projeler

FORMAT — Sadece aşağıdaki JSON'ı döndür, başka hiçbir şey yazma:
{
  "kategori": "DÜNYA REKORU veya İLGİNÇ PROJE veya YENİ TEKNOLOJİ veya TARİHTEN veya TÜRKİYE'DEN",
  "one_cikan_rakam": "öne çıkan istatistik (örn: 828 metre, 55 günde, 1.5 milyar dolar)",
  "baslik": "merak uyandırıcı başlık (max 12 kelime)",
  "icerik": "ilgi çekici içerik (150-250 kelime, akıcı Türkçe, spesifik rakamlar içersin)",
  "anahtar_kelimeler": ["kelime1", "kelime2", "kelime3"]
}

KURALLAR:
- Sadece gerçek ve doğrulanabilir bilgiler yaz
- Spesifik rakamlar, tarihler ve yerler kullan
- Mühendislik açısından neden ilginç olduğunu açıkla
- Okuyucunun vay be diyeceği bir bilgi mutlaka olsun
- Emin olmadığın bilgiyi yazma`;
      userPrompt = `Bugün için ilginç bir inşaat veya mühendislik içeriği üret. Tarih: ${date}. Farklı bir kategori seç.`;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit aşıldı, lütfen daha sonra tekrar deneyin." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Kredi yetersiz." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI servisi hatası" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    // Try to parse JSON from the response
    let parsed;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    } catch {
      parsed = null;
    }

    return new Response(JSON.stringify({ result: parsed, raw: content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("daily-knowledge error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Bilinmeyen hata" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
