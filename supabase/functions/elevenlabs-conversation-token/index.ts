// Issues a single-use ElevenLabs conversation token after checking premium/trial + quota
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const FREE_DAILY_LIMIT_SECONDS = 600; // 10 minutes/day for free users

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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const publishable = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const agentId = Deno.env.get("ELEVENLABS_AGENT_ID");
    const apiKey = Deno.env.get("ELEVENLABS_API_KEY");

    if (!agentId || !apiKey) {
      return new Response(JSON.stringify({ error: "voice_not_configured" }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authClient = createClient(supabaseUrl, publishable, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });
    const { data: claims, error: claimsError } = await authClient.auth.getClaims(jwt);
    if (claimsError || !claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: "invalid_token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claims.claims.sub as string;

    // Check subscription + quota using service role
    const admin = createClient(supabaseUrl, serviceKey);

    const [{ data: sub }, { data: usage }, { data: profile }] = await Promise.all([
      admin
        .from("user_subscriptions")
        .select("status, trial_end, plan_id")
        .eq("user_id", userId)
        .maybeSingle(),
      admin
        .from("voice_usage")
        .select("seconds_used")
        .eq("user_id", userId)
        .eq("usage_date", new Date().toISOString().slice(0, 10))
        .maybeSingle(),
      admin
        .from("profiles")
        .select("role")
        .eq("user_id", userId)
        .maybeSingle(),
    ]);

    const now = Date.now();
    const trialActive = sub?.trial_end && new Date(sub.trial_end as string).getTime() > now;
    const isAdmin = (profile?.role as string | undefined) === "admin";
    const isPremium = isAdmin || sub?.status === "active" || sub?.status === "trialing" || Boolean(trialActive);
    const secondsUsed = (usage?.seconds_used as number | undefined) ?? 0;
    const remaining = isPremium ? Infinity : Math.max(0, FREE_DAILY_LIMIT_SECONDS - secondsUsed);

    if (!isPremium && remaining <= 0) {
      return new Response(
        JSON.stringify({
          error: "quota_exceeded",
          message: "Günlük ses kotanız doldu (10 dk). Premium'a yükselerek sınırsız kullanın.",
          seconds_used: secondsUsed,
          daily_limit: FREE_DAILY_LIMIT_SECONDS,
        }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Request a WebRTC conversation token + WebSocket signed URL in parallel
    const [tokenRes, signedRes] = await Promise.all([
      fetch(
        `https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=${encodeURIComponent(agentId)}`,
        { headers: { "xi-api-key": apiKey } }
      ),
      fetch(
        `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${encodeURIComponent(agentId)}`,
        { headers: { "xi-api-key": apiKey } }
      ),
    ]);

    if (!tokenRes.ok && !signedRes.ok) {
      const errText = await tokenRes.text();
      await signedRes.text().catch(() => null);
      console.error("elevenlabs token error", tokenRes.status, errText);
      return new Response(
        JSON.stringify({ error: "elevenlabs_error", details: errText, status: tokenRes.status }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const tokenJson = tokenRes.ok ? await tokenRes.json().catch(() => null) : null;
    const signedJson = signedRes.ok ? await signedRes.json().catch(() => null) : null;
    if (!tokenRes.ok) await tokenRes.text().catch(() => null);
    if (!signedRes.ok) await signedRes.text().catch(() => null);

    return new Response(
      JSON.stringify({
        token: tokenJson?.token ?? null,
        signed_url: signedJson?.signed_url ?? null,
        agent_id: agentId,
        quota: {
          is_premium: isPremium,
          seconds_used: secondsUsed,
          daily_limit: isPremium ? null : FREE_DAILY_LIMIT_SECONDS,
          remaining_seconds: isPremium ? null : remaining,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("elevenlabs-conversation-token error", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
