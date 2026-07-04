// voice-stt — Speech-to-text passthrough to Lovable AI transcription gateway.
// Accepts multipart/form-data with a `file` field (any browser-decodable audio,
// prefer WAV) and returns { text: string }. Non-streaming for simplicity.

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.0";

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

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    return new Response(JSON.stringify({ error: "server_missing_key" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const inForm = await req.formData();
    const file = inForm.get("file");
    if (!(file instanceof File) && !(file instanceof Blob)) {
      return new Response(JSON.stringify({ error: "missing_file" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const modelId = (inForm.get("model") as string) || "openai/gpt-4o-mini-transcribe";
    const language = (inForm.get("language") as string) || "";

    const upstream = new FormData();
    upstream.append("model", modelId);
    upstream.append("file", file, (file as File).name || "recording.wav");
    if (language) upstream.append("language", language);

    const t0 = Date.now();
    const res = await fetch("https://ai.gateway.lovable.dev/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}` },
      body: upstream,
    });
    const ms = Date.now() - t0;
    if (!res.ok) {
      const errTxt = await res.text().catch(() => "");
      console.error("[voice-stt] gateway error", res.status, errTxt);
      return new Response(JSON.stringify({ error: "stt_failed", status: res.status, detail: errTxt.slice(0, 500) }), {
        status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const json = await res.json();
    const text = String(json?.text ?? "").trim();
    console.log(`[voice-stt] ok ${ms}ms → "${text.slice(0, 120)}"`);
    return new Response(JSON.stringify({ text }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[voice-stt] error", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
