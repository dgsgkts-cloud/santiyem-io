import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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
    const locationText = [listing.parcel_il, listing.parcel_ilce].filter(Boolean).join(", ") || "Türkiye";

    // Step 1: Generate script with scenes
    const systemPrompt = `Sen bir gayrimenkul pazarlama uzmanısın. ${isLand ? "Arsa" : "Gayrimenkul"} ilanları için profesyonel, sinematik bir video senaryosu oluşturuyorsun. Her sahne için drone/sinematik kamera açısından detaylı görsel açıklama yaz. Türkçe yaz. JSON formatında yanıt ver.`;

    const userPrompt = isLand
      ? `Arsa İlanı: Başlık: ${listing.title}, Açıklama: ${listing.description}, Fiyat: ${listing.price} TL, Alan: ${listing.parcel_area_sqm || "Belirtilmemiş"} m², Konum: ${locationText}, İletişim: ${listing.contact}`
      : `Gayrimenkul İlanı: Tür: ${listing.property_type}, Başlık: ${listing.title}, Açıklama: ${listing.description}, Fiyat: ${listing.price} TL, Oda: ${listing.rooms}, Metrekare: ${listing.sqm} m², Kat: ${listing.floor_info}, Konum: ${locationText}, İletişim: ${listing.contact}`;

    const scriptResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
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
                      image_prompt: { type: "string", description: "Detailed English prompt for AI image generation of this scene - describe drone/cinematic camera angle, landscape, architecture, lighting" },
                      duration: { type: "number" },
                    },
                    required: ["title", "description", "image_prompt", "duration"],
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

    if (!scriptResponse.ok) {
      if (scriptResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit aşıldı, lütfen bekleyin." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await scriptResponse.text();
      console.error("AI gateway error:", scriptResponse.status, t);
      throw new Error("AI gateway error");
    }

    const scriptData = await scriptResponse.json();
    const toolCall = scriptData.choices?.[0]?.message?.tool_calls?.[0];
    let script = { narration: "", scenes: [] as any[] };

    if (toolCall?.function?.arguments) {
      script = JSON.parse(toolCall.function.arguments);
    }

    // Step 2: Generate images for each scene
    const sceneImages: string[] = [];
    for (const scene of script.scenes) {
      try {
        const imgPrompt = scene.image_prompt || 
          `Cinematic drone aerial photography of ${locationText} Turkey, ${scene.description}, golden hour, professional real estate photography, 4K quality`;
        
        const imgResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3.1-flash-image-preview",
            messages: [
              { 
                role: "user", 
                content: `Generate a photorealistic cinematic image: ${imgPrompt}. Style: drone aerial photography, golden hour lighting, professional real estate promotional material, ultra high quality, 16:9 aspect ratio.`
              },
            ],
            modalities: ["text", "image"],
          }),
        });

        if (imgResponse.ok) {
          const imgData = await imgResponse.json();
          const parts = imgData.choices?.[0]?.message?.content;
          if (Array.isArray(parts)) {
            for (const part of parts) {
              if (part.type === "image_url" && part.image_url?.url) {
                sceneImages.push(part.image_url.url);
                break;
              }
            }
          } else {
            sceneImages.push("");
          }
        } else {
          console.error("Image generation failed for scene:", scene.title, imgResponse.status);
          sceneImages.push("");
        }
      } catch (imgErr) {
        console.error("Image generation error:", imgErr);
        sceneImages.push("");
      }
    }

    // Attach images to scenes
    const scenesWithImages = script.scenes.map((scene: any, i: number) => ({
      ...scene,
      image_url: sceneImages[i] || null,
    }));

    return new Response(JSON.stringify({ 
      script: { 
        narration: script.narration, 
        scenes: scenesWithImages 
      } 
    }), {
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
