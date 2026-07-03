// TEMPORARY diagnostic: reports ElevenLabs agent override/security config.
// Returns only booleans/metadata — no secrets. Delete after the audit.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    // TEMP: confirm the dedicated audit test user so it can sign in.
    const url = new URL(req.url);
    const op = url.searchParams.get("op");
    if (op === "confirm_test_user" || op === "delete_test_user") {
      const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2.100.0");
      const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
      const u = list?.users?.find((x: any) => x.email === "voice-audit-test@santiyem.io");
      if (!u) return new Response(JSON.stringify({ error: "not_found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (op === "delete_test_user") {
        const { error } = await admin.auth.admin.deleteUser(u.id);
        return new Response(JSON.stringify({ deleted: !error, error: error?.message ?? null }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const { error } = await admin.auth.admin.updateUserById(u.id, { email_confirm: true });
      return new Response(JSON.stringify({ confirmed: !error, error: error?.message ?? null }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const agentId = Deno.env.get("ELEVENLABS_AGENT_ID");
    const apiKey = Deno.env.get("ELEVENLABS_API_KEY");
    if (!agentId || !apiKey) {
      return new Response(JSON.stringify({ error: "missing_env", has_agent: !!agentId, has_key: !!apiKey }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const agentRes = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${agentId}`, {
      headers: { "xi-api-key": apiKey },
    });
    const agentText = await agentRes.text();
    let agent: any = null;
    try { agent = JSON.parse(agentText); } catch { /* noop */ }

    // Also verify the token endpoints work right now
    const [tokenRes, signedRes] = await Promise.all([
      fetch(`https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=${agentId}`, { headers: { "xi-api-key": apiKey } }),
      fetch(`https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${agentId}`, { headers: { "xi-api-key": apiKey } }),
    ]);
    const tokenBody = await tokenRes.text();
    const signedBody = await signedRes.text();

    const overrides = agent?.platform_settings?.overrides ?? null;
    const auth = agent?.platform_settings?.auth ?? null;

    return new Response(JSON.stringify({
      agent_fetch_status: agentRes.status,
      agent_name: agent?.name ?? null,
      language: agent?.conversation_config?.agent?.language ?? null,
      first_message_set: Boolean(agent?.conversation_config?.agent?.first_message),
      prompt_len: (agent?.conversation_config?.agent?.prompt?.prompt ?? "").length,
      overrides_config: overrides,
      auth_config: auth,
      turn_config: agent?.conversation_config?.turn ?? null,
      asr_config: agent?.conversation_config?.asr ?? null,
      token_status: tokenRes.status,
      token_ok: tokenRes.ok && tokenBody.includes("token"),
      signed_status: signedRes.status,
      signed_ok: signedRes.ok && signedBody.includes("signed_url"),
      token_err: tokenRes.ok ? null : tokenBody.slice(0, 300),
      signed_err: signedRes.ok ? null : signedBody.slice(0, 300),
      agent_err: agentRes.ok ? null : agentText.slice(0, 300),
    }, null, 2), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
