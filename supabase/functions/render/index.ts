import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { prompt, image_base64, file_type } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    if (!prompt) throw new Error("Prompt is required");

    const systemPrompt = `You are an expert architectural renderer and visualization artist. 
When given a building photo or architectural plan, create a photorealistic or stylized architectural render based on the user's instructions.
If no image is provided, generate an architectural visualization from the text description alone.
Focus on: realistic lighting, materials, landscaping, sky, and atmosphere.`;

    const userContent: any[] = [{ type: "text", text: prompt }];

    if (image_base64 && file_type !== "dwg") {
      const mimeType = file_type === "pdf" ? "application/pdf" : "image/png";
      userContent.push({
        type: "image_url",
        image_url: { url: `data:${mimeType};base64,${image_base64}` },
      });
    }
    
    if (file_type === "dwg") {
      // DWG is binary and can't be sent to AI directly — enhance prompt instead
      userContent[0].text = `${prompt}\n\n[Bu bir DWG/DXF CAD projesidir. Dosya adından ve kullanıcının açıklamasından yola çıkarak mimari render oluştur. Vaziyet planı, kat planı veya cephe görseli olarak yorumla.]`;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-pro-image-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Çok fazla istek gönderildi, lütfen biraz bekleyin." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Kredi yetersiz, lütfen bakiyenizi kontrol edin." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Render oluşturulamadı" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const message = data.choices?.[0]?.message;
    const imageUrl = message?.images?.[0]?.image_url?.url;
    const text = message?.content || "";

    return new Response(JSON.stringify({ image: imageUrl, text }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("render error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Bilinmeyen hata" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
