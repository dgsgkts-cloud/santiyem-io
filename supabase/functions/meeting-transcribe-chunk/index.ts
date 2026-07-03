// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization") || "";
    const jwt = auth.replace(/^Bearer\s+/i, "");
    if (!jwt) return json({ error: "unauthorized" }, 401);

    const supaAnon = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });
    const { data: userRes } = await supaAnon.auth.getUser(jwt);
    const user = userRes?.user;
    if (!user) return json({ error: "unauthorized" }, 401);

    const form = await req.formData();
    const audio = form.get("file") as File | null;
    const meetingId = String(form.get("meeting_id") || "");
    const seq = Number(form.get("seq") || 0);
    const startedAtMs = Number(form.get("started_at_ms") || 0);
    const language = String(form.get("language") || "tr");
    if (!audio || !meetingId) return json({ error: "missing_fields" }, 400);
    if (audio.size < 2048) return json({ text: "", skipped: "too_small" });

    // Forward to Lovable AI Gateway transcription
    const upstream = new FormData();
    upstream.append("model", "openai/gpt-4o-mini-transcribe");
    const ext = (audio.type.includes("wav") ? "wav" : audio.type.includes("mp4") ? "mp4" : "webm");
    upstream.append("file", audio, `chunk.${ext}`);
    if (language && language !== "auto") upstream.append("language", language);

    const gwRes = await fetch("https://ai.gateway.lovable.dev/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}` },
      body: upstream,
    });
    if (!gwRes.ok) {
      const errTxt = await gwRes.text().catch(() => "");
      return json({ error: "transcription_failed", detail: errTxt, status: gwRes.status }, gwRes.status);
    }
    const gwJson = await gwRes.json().catch(() => ({} as any));
    const text: string = (gwJson?.text || "").trim();
    if (!text) return json({ text: "" });

    // Persist as final segment
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    await admin.from("meeting_transcripts").insert({
      meeting_id: meetingId,
      user_id: user.id,
      seq,
      text,
      started_at_ms: startedAtMs,
      ended_at_ms: startedAtMs + Math.round((audio.size / 32000) * 1000),
      is_final: true,
    });

    return json({ text, seq });
  } catch (e) {
    console.error("meeting-transcribe-chunk error", e);
    return json({ error: "internal", detail: String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
