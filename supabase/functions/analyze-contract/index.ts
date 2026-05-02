import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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
    const { contractText } = await req.json();
    if (!contractText || contractText.trim().length < 50) {
      return new Response(JSON.stringify({ error: "Sözleşme metni çok kısa veya boş." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `Sen bir inşaat hukuku asistanısın. Yüklenen sözleşmeyi analiz et ve şunları çıkar:

TEMEL BİLGİLER:
- Sözleşme tutarı (rakam olarak)
- Başlangıç tarihi (YYYY-MM-DD)
- Bitiş tarihi (YYYY-MM-DD)
- Karşı taraf adı
- Sözleşme türü (yapim_isleri / hizmet / danismanlik / taseron / diger)

KRİTİK MADDELER:
- Ödeme süresi ve koşulları
- Gecikme cezası (günlük tutar veya oran)
- Avans koşulları (varsa)
- Fesih koşulları ve ihbar süresi
- Garanti süresi
- Mücbir sebep tanımı

RİSKLİ MADDELER:
Taraf aleyhine olabilecek, dikkat edilmesi gereken maddeleri işaretle.

ÖDEME TAKVİMİ:
Sözleşmede belirtilmişse tablo halinde çıkar.

Yanıtını JSON formatında ver:
{
  "tutar": number veya null,
  "baslangic": "YYYY-MM-DD" veya null,
  "bitis": "YYYY-MM-DD" veya null,
  "karsi_taraf": string veya null,
  "tur": "yapim_isleri" | "hizmet" | "danismanlik" | "taseron" | "diger",
  "kritik_maddeler": [{"madde": string, "aciklama": string, "onem": "bilgi" | "uyari" | "kritik"}],
  "riskli_maddeler": [{"madde": string, "aciklama": string}],
  "odeme_takvimi": [{"odeme": string, "tarih": string veya null, "tutar": number veya null}],
  "ozet": string
}

Emin olmadığın alanlara null yaz. Her kritik madde için madde numarasını belirt.
Yanıtın yalnızca JSON olsun, başka metin ekleme.`;

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
          { role: "user", content: `Aşağıdaki sözleşmeyi analiz et:\n\n${contractText.slice(0, 30000)}` },
        ],
        tools: [{
          type: "function",
          function: {
            name: "extract_contract_data",
            description: "Sözleşmeden çıkarılan bilgileri yapılandırılmış şekilde döndür",
            parameters: {
              type: "object",
              properties: {
                tutar: { type: "number", description: "Sözleşme tutarı" },
                baslangic: { type: "string", description: "Başlangıç tarihi YYYY-MM-DD" },
                bitis: { type: "string", description: "Bitiş tarihi YYYY-MM-DD" },
                karsi_taraf: { type: "string", description: "Karşı taraf adı" },
                tur: { type: "string", enum: ["yapim_isleri", "hizmet", "danismanlik", "taseron", "diger"] },
                kritik_maddeler: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      madde: { type: "string" },
                      aciklama: { type: "string" },
                      onem: { type: "string", enum: ["bilgi", "uyari", "kritik"] }
                    },
                    required: ["madde", "aciklama", "onem"]
                  }
                },
                riskli_maddeler: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      madde: { type: "string" },
                      aciklama: { type: "string" }
                    },
                    required: ["madde", "aciklama"]
                  }
                },
                odeme_takvimi: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      odeme: { type: "string" },
                      tarih: { type: "string" },
                      tutar: { type: "number" }
                    },
                    required: ["odeme"]
                  }
                },
                ozet: { type: "string", description: "Sözleşmenin kısa özeti" }
              },
              required: ["tur", "kritik_maddeler", "ozet"]
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "extract_contract_data" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Çok fazla istek gönderildi. Lütfen biraz bekleyin." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI kullanım kredisi yetersiz." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI analiz hatası oluştu." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await response.json();
    let analysis = null;

    // Extract from tool call
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      try {
        analysis = JSON.parse(toolCall.function.arguments);
      } catch {
        // Try from content
        const content = result.choices?.[0]?.message?.content;
        if (content) {
          try { analysis = JSON.parse(content); } catch { /* skip */ }
        }
      }
    }

    if (!analysis) {
      // Fallback: try content directly
      const content = result.choices?.[0]?.message?.content;
      if (content) {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try { analysis = JSON.parse(jsonMatch[0]); } catch { /* skip */ }
        }
      }
    }

    return new Response(JSON.stringify({ analysis }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-contract error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Bilinmeyen hata" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
