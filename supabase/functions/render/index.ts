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

    const hasReference = Boolean(image_base64 && file_type !== "dwg");

    const systemPrompt = `You are an expert architectural renderer specializing in faithful visualization of real building projects.

CORE MODE:
- If a reference file is provided, you are performing CONTROLLED RENDERING, not redesign.
- Treat the uploaded source as the single source of truth for geometry.

NON-NEGOTIABLE RULES WHEN A SOURCE EXISTS:
- Preserve the EXACT floor count.
- Preserve the EXACT building massing, outline, width, height, and facade proportions.
- Preserve the EXACT locations, sizes, counts, and spacing of balconies, windows, doors, roof edges, parapets, columns, and recesses.
- Do NOT add new balconies, remove balconies, shift balconies, merge floors, invent terraces, or change facade rhythm.
- Do NOT change the camera viewpoint if the source is a facade photo.
- Only improve render quality: materials, color palette, glazing finish, shadows, realistic lighting, landscape, sky, pavement, and atmosphere.
- If any user instruction conflicts with the source geometry, follow the source geometry and ignore the conflicting part.

WHEN THE SOURCE IS A PLAN / ELEVATION / PDF:
- Infer the 3D form from the drawing conservatively.
- Do not invent extra floors or facade elements not supported by the drawing.
- Keep opening rhythm, balcony lines, and overall dimensions consistent with the drawing.

If no source is provided, generate from text only.`;

    const lockedPrompt = hasReference
      ? `KAYNAK DOSYAYA BİREBİR SADIK KAL.
Kat sayısını, cephe uzunluklarını, balkon yerlerini, pencere akslarını, kütle oranlarını ve tüm mimari elemanların konumunu ASLA değiştirme.
Sadece malzeme, ışık, çevre, peyzaj ve render kalitesini iyileştir.

Kullanıcı isteği: ${prompt}`
      : prompt;

    const userContent: any[] = [{ type: "text", text: lockedPrompt }];

    if (hasReference) {
      const mimeType = file_type === "pdf" ? "application/pdf" : "image/png";
      userContent.push({
        type: "image_url",
        image_url: { url: `data:${mimeType};base64,${image_base64}` },
      });
    }

    if (file_type === "dwg") {
      userContent[0].text = `Bu bir DWG/DXF CAD projesidir. DWG içeriğini doğrudan okuyamadığın için yalnızca kullanıcının açıklamasına göre konsept üret. Geometri uydurma.\n\nKullanıcı isteği: ${prompt}`;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: hasReference ? "google/gemini-3.1-flash-image-preview" : "google/gemini-3-pro-image-preview",
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
