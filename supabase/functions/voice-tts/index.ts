// voice-tts — Thin ElevenLabs Text-to-Speech transport. Accepts JSON
// { text, voiceId?, modelId? } and returns audio/mpeg bytes. ElevenLabs is
// used only as speech transport; all reasoning happens in the Construction
// Brain (`chat` function).

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.0";

// Deep, calm Turkish male managerial voice by default. Override via request.
const DEFAULT_VOICE = "JBFqnCBsd6RMkjVDRZzb"; // George
const DEFAULT_MODEL = "eleven_turbo_v2_5";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Auth
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  try {
    const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data, error } = await supa.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (error || !data?.claims?.sub) throw new Error("bad_token");
  } catch {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const apiKey = Deno.env.get("ELEVENLABS_API_KEY");
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "elevenlabs_not_connected" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { text, voiceId, modelId } = await req.json();
    const clean = String(text ?? "").trim();
    if (!clean) {
      return new Response(JSON.stringify({ error: "empty_text" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    // Hard cap to protect against runaway TTS bills.
    const bounded = clean.slice(0, 4500);
    const vid = String(voiceId || DEFAULT_VOICE);
    const mid = String(modelId || DEFAULT_MODEL);

    const t0 = Date.now();
    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${vid}/stream?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text: bounded,
          model_id: mid,
          voice_settings: {
            stability: 0.55,
            similarity_boost: 0.75,
            style: 0.35,
            use_speaker_boost: true,
            speed: 1.0,
          },
        }),
      }
    );
    if (!res.ok || !res.body) {
      const errTxt = await res.text().catch(() => "");
      console.error("[voice-tts] elevenlabs error", res.status, errTxt);
      return new Response(JSON.stringify({ error: "tts_failed", status: res.status, detail: errTxt.slice(0, 500) }), {
        status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    console.log(`[voice-tts] streaming (voice=${vid}, model=${mid}, chars=${bounded.length}, headers_ms=${Date.now() - t0})`);
    return new Response(res.body, {
      headers: {
        ...corsHeaders,
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[voice-tts] error", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
