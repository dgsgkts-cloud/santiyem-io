// openai-realtime-token — mints a short-lived OpenAI Realtime client secret.
// The browser never sees OPENAI_API_KEY; it only receives an ephemeral secret
// that is valid for a single realtime session.

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.0";
import { VOICE_SYSTEM_PROMPT } from "../_shared/voicePrompt.ts";

const DEFAULT_MODEL = "gpt-realtime";
const DEFAULT_VOICE = "cedar";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return json({ error: "method_not_allowed" }, 405);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);
  try {
    const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data, error } = await supa.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (error || !data?.claims?.sub) throw new Error("bad_token");
  } catch {
    return json({ error: "unauthorized" }, 401);
  }

  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) return json({ error: "openai_not_configured" }, 503);

  try {
    const body = await req.json().catch(() => ({}));
    const model = String(body?.model || DEFAULT_MODEL);
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

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error("[openai-realtime-token] error", res.status, JSON.stringify(data).slice(0, 400));
      return json({ error: "openai_error", status: res.status, detail: data }, 502);
    }

    const secret = data?.value ?? data?.client_secret?.value ?? null;
    if (!secret) return json({ error: "missing_client_secret" }, 502);

    return json({
      client_secret: secret,
      model,
      voice,
      expires_at: data?.expires_at ?? null,
      base_url: "https://api.openai.com/v1/realtime/calls",
    });
  } catch (err) {
    console.error("[openai-realtime-token] failure", err);
    return json({ error: String(err) }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
