import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.0";

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
  duration: number;
  image_prompt?: string;
};

type VideoScript = {
  narration: string;
  scenes: Scene[];
};

const CAMERA_PRESETS = [
  { zoom: 13.8, bearing: 0, pitch: 0 },
  { zoom: 14.8, bearing: 25, pitch: 35 },
  { zoom: 15.8, bearing: 65, pitch: 45 },
  { zoom: 16.4, bearing: 100, pitch: 55 },
  { zoom: 15.2, bearing: 145, pitch: 40 },
  { zoom: 14.2, bearing: 180, pitch: 20 },
] as const;

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const buildFallbackScript = (listing: ListingInput, isLand: boolean, locationText: string): VideoScript => {
  const title = listing.title || (isLand ? "Özel Arsa" : "Özel Gayrimenkul");
  const desc = listing.description || "Detaylar için bizimle iletişime geçin.";
  const priceText = listing.price ? `${listing.price.toLocaleString("tr-TR")} TL` : "Fiyat bilgisi için arayın";
  const areaText = listing.parcel_area_sqm
    ? `${listing.parcel_area_sqm} m²`
    : listing.sqm
      ? `${listing.sqm} m²`
      : "geniş kullanım alanı";

  return {
    narration: `${locationText} bölgesinde yer alan ${title} için hazırlanan bu tanıtımda, konumu ve yatırım potansiyelini görebilirsiniz. ${desc} Fiyat: ${priceText}. Daha fazla bilgi için hemen iletişime geçin.`,
    scenes: [
      { title: "Konum", description: `${locationText} genel görünümü`, duration: 4 },
      { title: "Parsel Görünümü", description: "İşaretlenen alanın yakından görünümü", duration: 5 },
      { title: "Çevre ve Erişim", description: "Yollar ve çevre yerleşimlere yakınlık", duration: 4 },
      { title: "Yatırım Potansiyeli", description: `${areaText} ve yüksek değer potansiyeli`, duration: 4 },
      { title: "Kapanış", description: `Fiyat: ${priceText} • İletişim: ${listing.contact || "İletişime geçin"}`, duration: 5 },
    ],
  };
};

const buildMapboxStaticUrl = (
  token: string,
  lat: number,
  lng: number,
  zoom: number,
  bearing: number,
  pitch: number,
): string => {
  const safeLat = lat.toFixed(6);
  const safeLng = lng.toFixed(6);
  const marker = `pin-s+10B981(${safeLng},${safeLat})`;

  return `https://api.mapbox.com/styles/v1/mapbox/satellite-v9/static/${marker}/${safeLng},${safeLat},${zoom},${bearing},${pitch}/1280x720?logo=false&attribution=false&access_token=${encodeURIComponent(token)}`;
};

const buildMapboxSceneImages = (
  sceneCount: number,
  lat: number,
  lng: number,
  mapboxToken: string,
): string[] => {
  if (sceneCount <= 0) return [];

  return Array.from({ length: sceneCount }, (_, index) => {
    const preset = CAMERA_PRESETS[index % CAMERA_PRESETS.length];
    const offsetRadius = index % 2 === 0 ? 0 : 0.0015;
    const angle = (preset.bearing * Math.PI) / 180;
    const offsetLat = lat + Math.sin(angle) * offsetRadius;
    const offsetLng = lng + Math.cos(angle) * offsetRadius;

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

const tryGenerateAiScript = async (
  lovableApiKey: string,
  listing: ListingInput,
  isLand: boolean,
  locationText: string,
): Promise<{ script: VideoScript | null; status: number | null; errorText?: string }> => {
  const systemPrompt = `Sen bir gayrimenkul pazarlama uzmanısın. ${isLand ? "Arsa" : "Gayrimenkul"} ilanları için profesyonel, sinematik video senaryosu oluşturuyorsun. Türkçe yaz. JSON formatında yanıt ver.`;

  const userPrompt = isLand
    ? `Arsa İlanı: Başlık: ${listing.title}, Açıklama: ${listing.description}, Fiyat: ${listing.price} TL, Alan: ${listing.parcel_area_sqm || "Belirtilmemiş"} m², Konum: ${locationText}, İletişim: ${listing.contact}`
    : `Gayrimenkul İlanı: Tür: ${listing.property_type}, Başlık: ${listing.title}, Açıklama: ${listing.description}, Fiyat: ${listing.price} TL, Oda: ${listing.rooms}, Metrekare: ${listing.sqm} m², Kat: ${listing.floor_info}, Konum: ${locationText}, İletişim: ${listing.contact}`;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovableApiKey}`,
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
                narration: { type: "string" },
                scenes: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      description: { type: "string" },
                      duration: { type: "number" },
                      image_prompt: { type: "string" },
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

  if (!response.ok) {
    const errorText = await response.text();
    return { script: null, status: response.status, errorText };
  }

  const data = await response.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall?.function?.arguments) {
    return { script: null, status: null, errorText: "Invalid tool response" };
  }

  const script = JSON.parse(toolCall.function.arguments) as VideoScript;
  return { script, status: 200 };
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

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
    const { listing } = (await req.json()) as { listing: ListingInput };
    const MAPBOX_TOKEN = Deno.env.get("MAPBOX_TOKEN");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!listing) {
      return new Response(JSON.stringify({ error: "listing payload required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const hasCoords = isFiniteNumber(listing.parcel_center_lat) && isFiniteNumber(listing.parcel_center_lng);
    const isLand = listing.listing_type === "arsa";
    const locationText = [listing.parcel_il, listing.parcel_ilce].filter(Boolean).join(", ") || "Türkiye";

    let warning: string | null = null;
    let script = buildFallbackScript(listing, isLand, locationText);

    // AI script is optional now; real map imagery continues even when credits are exhausted.
    if (LOVABLE_API_KEY) {
      try {
        const aiResult = await tryGenerateAiScript(LOVABLE_API_KEY, listing, isLand, locationText);
        if (aiResult.script && Array.isArray(aiResult.script.scenes) && aiResult.script.scenes.length > 0) {
          script = aiResult.script;
        } else if (aiResult.status === 402) {
          warning = "AI kredisi yetersiz; gerçek konum görüntüleri ile devam edildi.";
        } else if (aiResult.status === 429) {
          warning = "AI hız limiti aşıldı; gerçek konum görüntüleri ile devam edildi.";
        } else if (aiResult.errorText) {
          console.error("AI script fallback reason:", aiResult.status, aiResult.errorText);
        }
      } catch (error) {
        console.error("AI script generation failed, using fallback:", error);
      }
    }

    if (!MAPBOX_TOKEN) {
      return new Response(JSON.stringify({ error: "MAPBOX_TOKEN not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!hasCoords) {
      warning = warning || "Parsel koordinatı bulunamadı. Lütfen haritada parsel işaretleyin.";
    }

    const images = hasCoords
      ? buildMapboxSceneImages(
          script.scenes.length,
          listing.parcel_center_lat as number,
          listing.parcel_center_lng as number,
          MAPBOX_TOKEN,
        )
      : Array.from({ length: script.scenes.length }, () => null);

    const scenesWithImages = script.scenes.map((scene, index) => ({
      ...scene,
      duration: isFiniteNumber(scene.duration) && scene.duration > 0 ? scene.duration : 4,
      image_url: images[index] || null,
      image_source: images[index] ? "mapbox_satellite" : null,
    }));

    return new Response(
      JSON.stringify({
        script: {
          narration: script.narration,
          scenes: scenesWithImages,
        },
        warning,
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
