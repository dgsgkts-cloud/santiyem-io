// Records seconds spent in a voice session for daily quota accounting
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const jwt = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!jwt) {
      return new Response(JSON.stringify({ error: "unauthenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { seconds } = await req.json();
    const secondsInt = Math.max(0, Math.min(3600, Math.round(Number(seconds) || 0)));
    if (secondsInt === 0) {
      return new Response(JSON.stringify({ ok: true, total: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const publishable = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!;
    const client = createClient(supabaseUrl, publishable, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });

    const { data, error } = await client.rpc("add_voice_usage_seconds", { _seconds: secondsInt });
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Sprint 11.1 — mirror voice usage to the org monthly counter.
    // Fire-and-forget: never let this break voice tracking.
    try {
      const minutes = Math.max(1, Math.round(secondsInt / 60));
      await client.rpc("increment_usage", {
        _metric: "voice_minutes_month",
        _delta: minutes,
        _reason: "voice-session",
      });
    } catch (_) { /* ignore */ }

    return new Response(JSON.stringify({ ok: true, total: data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("voice-usage-track error", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
