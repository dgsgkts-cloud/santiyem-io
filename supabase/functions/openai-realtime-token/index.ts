// openai-realtime-token — mints a short-lived OpenAI Realtime client secret.
// The browser never sees OPENAI_API_KEY; it only receives an ephemeral secret
// that is valid for a single realtime session.

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.0";
import { VOICE_SYSTEM_PROMPT } from "../_shared/voicePrompt.ts";
import { resolveRealtimeModel } from "../_shared/realtimeModel.ts";
/** Structured failure envelope — no provider internals ever reach the client. */
function fail(stage: string, status: number, code: string, httpStatus = status) {
  console.error(`[openai-realtime-token] ${stage} failed: ${code} (${status})`);
  return json({ ok: false, stage, status, code }, httpStatus);
}
const DEFAULT_VOICE = "cedar";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return fail("request", 405, "method_not_allowed");
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return fail("authorize", 401, "unauthorized");
  try {
    const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data, error } = await supa.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (error || !data?.claims?.sub) throw new Error("bad_token");
  } catch {
    return fail("authorize", 401, "unauthorized");
  }

  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) return fail("session_create", 503, "openai_not_configured");

  try {
    const body = await req.json().catch(() => ({}));
    // The model is authoritative here — a browser-supplied value is ignored.
    const { model, source } = resolveRealtimeModel((k) => Deno.env.get(k));
    if (!model.trim()) return fail("session_create", 500, "realtime_model_not_configured", 500);
    console.log(`[voice:rt] resolved config ${JSON.stringify({ model, source })}`);
    const voice = String(body?.voice || DEFAULT_VOICE);
    const suffix = String(body?.instructions || "").slice(0, 6000);
    const tools = Array.isArray(body?.tools) ? body.tools : [];

    const res = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        session: {
          type: "realtime",
          model,
          audio: { output: { voice } },
          instructions: suffix ? `${VOICE_SYSTEM_PROMPT}\n\n${suffix}` : VOICE_SYSTEM_PROMPT,
          tools: tools.map((t: { name: string; description: string; parameters: unknown }) => ({
            type: "function",
            name: t.name,
            description: t.description,
            parameters: t.parameters,
          })),
        },
      }),
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      const providerCode = String(data?.error?.code ?? data?.error?.type ?? "openai_error");
      console.error("[openai-realtime-token] openai error", res.status, JSON.stringify(data).slice(0, 400));
      // Forward the real status so the client can tell permanent from temporary.
      const code = res.status === 401 || res.status === 403
        ? "openai_auth_failed"
        : /insufficient_quota|billing/i.test(providerCode)
          ? "openai_insufficient_quota"
          : res.status === 400 || res.status === 404
            ? "openai_invalid_session"
            : providerCode;
      return fail("session_create", res.status, code, res.status);
    }
    // Malformed JSON is never reported as success.
    if (!data || typeof data !== "object") {
      return fail("session_create", 502, "openai_malformed_response", 502);
    }

    const secret = data?.value ?? data?.client_secret?.value ?? null;
    if (!secret) return fail("session_create", 502, "missing_client_secret", 502);

    return json({
      ok: true,
      client_secret: secret,
      model,
      model_source: source,
      voice,
      expires_at: data?.expires_at ?? null,
      base_url: "https://api.openai.com/v1/realtime/calls",
    });
  } catch (err) {
    console.error("[openai-realtime-token] failure", err);
    return fail("session_create", 500, "session_create_exception", 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
