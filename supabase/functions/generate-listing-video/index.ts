import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type ListingInput = {
  listing_type?: string;
  property_type?: string | null;
  title?: string;
  description?: string;
  price?: number;
  contact?: string;
  rooms?: string | null;
  sqm?: number | null;
  floor_info?: string | null;
  parcel_il?: string | null;
  parcel_ilce?: string | null;
  parcel_area_sqm?: number | null;
  parcel_center_lat?: number | null;
  parcel_center_lng?: number | null;
};

type Scene = {
  title: string;
  description: string;
  image_prompt?: string;
  duration: number;
};

const SCENE_CAMERA_PRESETS = [
  { zoom: 13.8, bearing: 0, pitch: 0 },
  { zoom: 14.8, bearing: 25, pitch: 35 },
  { zoom: 15.8, bearing: 60, pitch: 45 },
  { zoom: 16.4, bearing: 95, pitch: 55 },
  { zoom: 15.2, bearing: 140, pitch: 40 },
  { zoom: 14.2, bearing: 180, pitch: 20 },
] as const;

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const buildMapboxStaticUrl = (
  token: string,
  lat: number,
  lng: number,
  zoom: number,
  bearing: number,
  pitch: number,
) => {
  const safeLat = lat.toFixed(6);
  const safeLng = lng.toFixed(6);
  const markerOverlay = `pin-s+10B981(${safeLng},${safeLat})`;
  return `https://api.mapbox.com/styles/v1/mapbox/satellite-v9/static/${markerOverlay}/${safeLng},${safeLat},${zoom},${bearing},${pitch}/1280x720?logo=false&attribution=false&access_token=${encodeURIComponent(token)}`;
};

const buildMapboxSceneImages = (
  sceneCount: number,
  lat: number,
  lng: number,
  mapboxToken: string,
): string[] => {
  if (sceneCount <= 0) return [];

  return Array.from({ length: sceneCount }, (_, index) => {
    const preset = SCENE_CAMERA_PRESETS[index % SCENE_CAMERA_PRESETS.length];
    const offsetRadius = index % 2 === 0 ? 0 : 0.0015;
    const rad = (preset.bearing * Math.PI) / 180;
    const offsetLat = lat + Math.sin(rad) * offsetRadius;
    const offsetLng = lng + Math.cos(rad) * offsetRadius;

    return buildMapboxStaticUrl(
      mapboxToken,
      offsetLat,
      offsetLng,
      preset.zoom,
      preset.bearing,
      preset.pitch,
    );
  });
};

const fetchAiSceneImage = async (
  lovableApiKey: string,
  locationText: string,
  scene: Scene,
): Promise<string | null> => {
  const imgPrompt =
    scene.image_prompt ||
    `Cinematic drone aerial photography of ${locationText}, ${scene.description}, golden hour, professional real estate photography, 4K quality`;

  const imgResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovableApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3.1-flash-image-preview",
      messages: [
        {
          role: "user",
          content: `Generate a photorealistic cinematic image: ${imgPrompt}. Style: drone aerial photography, ultra high quality, 16:9 aspect ratio.`,
        },
      ],
      modalities: ["image", "text"],
    }),
  });

  if (!imgResponse.ok) {
    const errText = await imgResponse.text();
    console.error("Image generation failed:", imgResponse.status, errText);
    return null;
  }

  const imgData = await imgResponse.json();
  return imgData.choices?.[0]?.message?.images?.[0]?.image_url?.url ?? null;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { listing } = (await req.json()) as { listing: ListingInput };
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const MAPBOX_TOKEN = Deno.env.get("MAPBOX_TOKEN");

    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const isLand = listing.listing_type === "arsa";
    const locationText = [listing.parcel_il, listing.parcel_ilce].filter(Boolean).join(", ") || "Türkiye";

    const hasParcelCenter =
      isFiniteNumber(listing.parcel_center_lat) &&
      isFiniteNumber(listing.parcel_center_lng);

    const systemPrompt = `Sen bir gayrimenkul pazarlama uzmanısın. ${isLand ? "Arsa" : "Gayrimenkul"} ilanları için profesyonel, sinematik video senaryosu oluşturuyorsun. Türkçe yaz. JSON formatında yanıt ver.`;

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
        tools: [
          {
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
                        image_prompt: {
                          type: "string",
                          description: "Detailed English prompt for fallback AI image generation",
                        },
                        duration: { type: "number" },
                      },
                      required: ["title", "description", "duration"],
                    },
                  },
                },
                required: ["narration", "scenes"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "generate_video_script" } },
      }),
    });

    if (!scriptResponse.ok) {
      if (scriptResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit aşıldı, lütfen bekleyin." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (scriptResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Kredi yetersiz." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const errorText = await scriptResponse.text();
      console.error("AI gateway error:", scriptResponse.status, errorText);
      throw new Error("AI gateway error");
    }

    const scriptData = await scriptResponse.json();
    const toolCall = scriptData.choices?.[0]?.message?.tool_calls?.[0];

    let script: { narration: string; scenes: Scene[] } = { narration: "", scenes: [] };
    if (toolCall?.function?.arguments) {
      script = JSON.parse(toolCall.function.arguments);
    }

    const scenes = Array.isArray(script.scenes) ? script.scenes : [];

    // 1) Use real satellite images from marked parcel when coordinates are available
    const mapboxImages =
      MAPBOX_TOKEN && hasParcelCenter
        ? buildMapboxSceneImages(
            scenes.length,
            listing.parcel_center_lat as number,
            listing.parcel_center_lng as number,
            MAPBOX_TOKEN,
          )
        : [];

    // 2) Fallback to AI-generated images only if real coordinate imagery is unavailable
    const aiImages: (string | null)[] = [];
    for (let i = 0; i < scenes.length; i++) {
      if (mapboxImages[i]) {
        aiImages.push(null);
        continue;
      }
      try {
        const aiImage = await fetchAiSceneImage(LOVABLE_API_KEY, locationText, scenes[i]);
        aiImages.push(aiImage);
      } catch (error) {
        console.error("Fallback image generation error:", error);
        aiImages.push(null);
      }
    }

    const scenesWithImages = scenes.map((scene, index) => {
      const realImage = mapboxImages[index] ?? null;
      const fallbackImage = aiImages[index] ?? null;
      return {
        ...scene,
        image_url: realImage || fallbackImage,
        image_source: realImage ? "mapbox_satellite" : fallbackImage ? "ai_fallback" : null,
      };
    });

    return new Response(
      JSON.stringify({
        script: {
          narration: script.narration,
          scenes: scenesWithImages,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (e) {
    console.error("generate-listing-video error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
