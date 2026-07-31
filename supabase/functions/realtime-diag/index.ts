// TEMPORARY diagnostic for the OpenAI Realtime handshake.
// Reports HTTP statuses and safe error codes only — never secrets.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const key = Deno.env.get("OPENAI_API_KEY");
  const out: Record<string, unknown> = { hasKey: Boolean(key), keyLen: key?.length ?? 0 };
  if (!key) return json(out);

  const body = await req.json().catch(() => ({}));
  const model = String((body as { model?: string })?.model || "gpt-realtime");

  // 1. Does the key work at all / which realtime models are visible?
  try {
    const r = await fetch("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${key}` },
    });
    const d = await r.json().catch(() => ({}));
    out.models_status = r.status;
    out.realtime_models = Array.isArray(d?.data)
      ? d.data.map((m: { id: string }) => m.id).filter((id: string) => /realtime/.test(id)).sort()
      : d?.error?.code ?? null;
  } catch (e) { out.models_error = String(e); }

  // 2. Mint an ephemeral client secret exactly like the production function.
  try {
    const r = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        session: { type: "realtime", model, audio: { output: { voice: "cedar" } }, instructions: "diag" },
      }),
    });
    const d = await r.json().catch(() => ({}));
    out.client_secrets_status = r.status;
    out.client_secrets_keys = Object.keys(d ?? {});
    out.client_secrets_error = d?.error ? { code: d.error.code, type: d.error.type, message: String(d.error.message).slice(0, 300) } : null;
    out.session_model = d?.session?.model ?? d?.model ?? null;

    const secret = d?.value ?? d?.client_secret?.value ?? null;
    if (secret) {
      // 3. Probe the SDP endpoint with a deliberately empty body: a 400 with an
      // SDP-parse complaint proves auth + routing are correct.
      for (const url of [
        "https://api.openai.com/v1/realtime/calls",
        `https://api.openai.com/v1/realtime/calls?model=${encodeURIComponent(model)}`,
      ]) {
        const sr = await fetch(url, {
          method: "POST",
          headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/sdp" },
          body: "v=0\r\n",
        });
        const t = await sr.text();
        out[`sdp_probe_${url.includes("?") ? "with_model" : "plain"}`] = {
          status: sr.status,
          body: t.slice(0, 300),
        };
      }
    }
  } catch (e) { out.client_secrets_exception = String(e); }

  return json(out);
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload, null, 2), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
