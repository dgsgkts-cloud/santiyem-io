import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { listing } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const isLand = listing.listing_type === "arsa";

    const systemPrompt = isLand
      ? `Sen bir gayrimenkul pazarlama uzmanısın. Arsa ilanları için profesyonel, sinematik bir video senaryosu ve seslendirme metni oluşturuyorsun. Türkçe yaz. Kısa, etkileyici ve profesyonel ol. JSON formatında yanıt ver: { "narration": "seslendirme metni", "scenes": [{ "title": "sahne başlığı", "description": "sahne açıklaması", "duration": 5 }] }`
      : `Sen bir gayrimenkul pazarlama uzmanısın. Gayrimenkul ilanları için profesyonel, sinematik bir video senaryosu ve seslendirme metni oluşturuyorsun. Türkçe yaz. Kısa, etkileyici ve profesyonel ol. JSON formatında yanıt ver: { "narration": "seslendirme metni", "scenes": [{ "title": "sahne başlığı", "description": "sahne açıklaması", "duration": 5 }] }`;

    const userPrompt = isLand
      ? `Arsa İlanı: Başlık: ${listing.title}, Açıklama: ${listing.description}, Fiyat: ${listing.price} TL, Alan: ${listing.parcel_area_sqm} m², Konum: ${listing.parcel_il} ${listing.parcel_ilce}, İletişim: ${listing.contact}`
      : `Gayrimenkul İlanı: Tür: ${listing.property_type}, Başlık: ${listing.title}, Açıklama: ${listing.description}, Fiyat: ${listing.price} TL, Oda: ${listing.rooms}, Metrekare: ${listing.sqm} m², Kat: ${listing.floor_info}, Konum: ${listing.parcel_il} ${listing.parcel_ilce}, İletişim: ${listing.contact}`;

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
        tools: [{
          type: "function",
          function: {
            name: "generate_video_script",
            description: "Generate video script with narration and scenes",
            parameters: {
              type: "object",
              properties: {
                narration: { type: "string", description: "Full narration text in Turkish" },
                scenes: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      description: { type: "string" },
                      duration: { type: "number" },
                    },
                    required: ["title", "description", "duration"],
                  },
                },
              },
              required: ["narration", "scenes"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "generate_video_script" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit aşıldı, lütfen bekleyin." }), {
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
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    let script = { narration: "", scenes: [] };

    if (toolCall?.function?.arguments) {
      script = JSON.parse(toolCall.function.arguments);
    }

    return new Response(JSON.stringify({ script }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-listing-video error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
