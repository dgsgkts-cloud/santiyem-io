// WhatsApp Business Cloud API webhook.
// Meta calls this endpoint to (a) verify subscription (GET) and
// (b) deliver status callbacks and inbound messages (POST).
// Deployed with verify_jwt = false so Meta can reach it without a JWT.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-hub-signature-256",
};

async function verifyMetaSignature(rawBody: string, signature: string | null, appSecret: string): Promise<boolean> {
  if (!signature || !signature.startsWith("sha256=")) return false;
  const expected = signature.slice("sha256=".length);
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(appSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
  const hex = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  // Constant-time-ish compare
  if (hex.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < hex.length; i++) diff |= hex.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);

  // ---- Meta webhook verification handshake (GET) ----
  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");
    const expected = Deno.env.get("WHATSAPP_VERIFY_TOKEN");
    if (mode === "subscribe" && expected && token === expected) {
      return new Response(challenge || "ok", { status: 200, headers: corsHeaders });
    }
    return new Response("forbidden", { status: 403, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("method not allowed", { status: 405, headers: corsHeaders });
  }

  const rawBody = await req.text();

  // Optional payload signature verification (only if WHATSAPP_APP_SECRET is set)
  const appSecret = Deno.env.get("WHATSAPP_APP_SECRET");
  if (appSecret) {
    const sig = req.headers.get("x-hub-signature-256");
    const ok = await verifyMetaSignature(rawBody, sig, appSecret);
    if (!ok) {
      console.warn("[whatsapp-webhook] invalid signature");
      return new Response("invalid signature", { status: 401, headers: corsHeaders });
    }
  }

  let payload: any;
  try { payload = JSON.parse(rawBody); }
  catch { return new Response("bad json", { status: 400, headers: corsHeaders }); }

  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const entries = payload?.entry || [];
    for (const entry of entries) {
      for (const change of entry?.changes || []) {
        const value = change?.value || {};

        // ---- Status callbacks ----
        for (const s of value.statuses || []) {
          const providerId: string | undefined = s.id;
          const statusRaw: string | undefined = s.status; // sent | delivered | read | failed
          const timestamp = s.timestamp ? new Date(Number(s.timestamp) * 1000).toISOString() : new Date().toISOString();
          if (!providerId || !statusRaw) continue;

          const patch: Record<string, unknown> = {};
          if (statusRaw === "sent") { patch.status = "sent"; patch.sent_at = timestamp; }
          else if (statusRaw === "delivered") { patch.delivered_at = timestamp; }
          else if (statusRaw === "read") { patch.read_at = timestamp; }
          else if (statusRaw === "failed") {
            patch.status = "failed";
            patch.failed_at = timestamp;
            const err = s.errors?.[0];
            if (err) patch.error = `[${err.code}] ${err.title || err.message || "Unknown"}`;
          }

          const { data: msg } = await sb
            .from("communication_messages")
            .update(patch)
            .eq("provider_message_id", providerId)
            .select("id")
            .maybeSingle();

          if (msg?.id) {
            await sb.from("communication_delivery_attempts").insert({
              message_id: msg.id,
              status: statusRaw,
              provider: "whatsapp-cloud",
              response: s,
              error: s.errors ? JSON.stringify(s.errors) : null,
            });
          }
        }

        // ---- Inbound messages: log only (future feature) ----
        for (const m of value.messages || []) {
          console.log("[whatsapp-webhook] inbound", { from: m.from, type: m.type });
        }
      }
    }
  } catch (err) {
    console.error("[whatsapp-webhook] processing error", err);
  }

  // Always 200 to Meta so it doesn't retry endlessly.
  return new Response("ok", { status: 200, headers: corsHeaders });
});
