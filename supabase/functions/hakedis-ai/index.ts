import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Sen bir inşaat hakediş asistanısın. Kullanıcının anlattığı yapılan işleri, verilen sözleşme kalemleriyle eşleştir.

KURALLAR:
- Her kalem için yapılan miktarı tespit et
- Emin olmadığın kalemleri düşük güven skoru ile işaretle
- Kullanıcının bahsetmediği kalemleri dahil etme
- Birimlere dikkat et (m³, m², ton, kg, adet, m, ls)
- Miktarları mantıklı sınırlar içinde tut
- Sözleşme miktarını aşan tahminlerde uyar

Yanıtını SADECE aşağıdaki JSON formatında ver, başka hiçbir metin ekleme:
{
  "kalemler": [
    {
      "sozlesme_kalemi_id": "uuid",
      "poz_no": "string",
      "tarif": "string",
      "tespit_edilen_miktar": number,
      "guven_skoru": "yuksek" | "orta" | "dusuk",
      "aciklama": "string"
    }
  ],
  "notlar": "string"
}`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { description, contractItems } = await req.json();

    if (!description || !contractItems || !Array.isArray(contractItems)) {
      return new Response(
        JSON.stringify({ error: "Açıklama ve sözleşme kalemleri zorunludur" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "AI yapılandırması eksik" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build contract items context
    const itemsContext = contractItems.map((item: any) =>
      `ID: ${item.id} | Poz: ${item.poz_no} | Tarif: ${item.description} | Birim: ${item.unit} | Sözleşme Miktarı: ${item.quantity} | Birim Fiyat: ${item.unit_price}₺`
    ).join("\n");

    const userPrompt = `SÖZLEŞME KALEMLERİ:\n${itemsContext}\n\nKULLANICININ AÇIKLAMASI:\n${description}`;

    // Use tool calling for structured output
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
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "hakedis_olustur",
              description: "Kullanıcının anlattığı işleri sözleşme kalemleriyle eşleştir ve hakediş taslağı oluştur",
              parameters: {
                type: "object",
                properties: {
                  kalemler: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        sozlesme_kalemi_id: { type: "string", description: "Sözleşme kaleminin UUID'si" },
                        poz_no: { type: "string" },
                        tarif: { type: "string" },
                        tespit_edilen_miktar: { type: "number", description: "Bu dönem yapılan miktar" },
                        guven_skoru: { type: "string", enum: ["yuksek", "orta", "dusuk"] },
                        aciklama: { type: "string", description: "AI'ın bu kalemi neden/nasıl eşleştirdiğine dair açıklama" },
                      },
                      required: ["sozlesme_kalemi_id", "poz_no", "tarif", "tespit_edilen_miktar", "guven_skoru", "aciklama"],
                      additionalProperties: false,
                    },
                  },
                  notlar: { type: "string", description: "Genel notlar ve uyarılar" },
                },
                required: ["kalemler", "notlar"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "hakedis_olustur" } },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "AI servisi meşgul, lütfen biraz bekleyip tekrar deneyin." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI kredisi yetersiz." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "AI servisi yanıt veremedi, lütfen tekrar deneyin." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    
    // Extract tool call result
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      // Fallback: try to parse content as JSON
      const content = data.choices?.[0]?.message?.content || "";
      try {
        const parsed = JSON.parse(content);
        return new Response(JSON.stringify(parsed), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch {
        return new Response(
          JSON.stringify({ error: "AI yanıtı işlenemedi, lütfen tekrar deneyin." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const result = JSON.parse(toolCall.function.arguments);
    
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("hakedis-ai error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Bilinmeyen hata" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
