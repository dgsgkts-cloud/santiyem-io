// ============================================================
// communication-dispatcher (Sprint 34.1)
// Scheduled-message dispatcher + retry engine for the EXISTING
// Communication Hub. Runs every minute via pg_cron.
//
// Security: not publicly invokable. Requires either the service-role
// key or the COMMUNICATION_DISPATCHER_SECRET header.
// ============================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.0";
import {
  MAX_ATTEMPTS,
  nextRetryAt,
  safeError,
  sendThroughRegistry,
} from "../_shared/communication/dispatch.ts";
import type { CommMessage } from "../_shared/communication/types.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-dispatcher-secret",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const STALE_MINUTES = 10;
const DEFAULT_BATCH = 25;

function authorized(req: Request): boolean {
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const secret = Deno.env.get("COMMUNICATION_DISPATCHER_SECRET") || "";
  const bearer = (req.headers.get("Authorization") || "").replace("Bearer ", "").trim();
  const apikey = (req.headers.get("apikey") || "").trim();
  const provided = (req.headers.get("x-dispatcher-secret") || "").trim();
  if (serviceKey && (bearer === serviceKey || apikey === serviceKey)) return true;
  if (secret && provided === secret) return true;
  return false;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (!authorized(req)) return json({ error: "Unauthorized" }, 401);

  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let batch = DEFAULT_BATCH;
  try {
    const body = await req.json();
    if (body?.batch_size) batch = Math.max(1, Math.min(Number(body.batch_size), 50));
  } catch { /* no body — cron */ }

  const report = {
    ok: true,
    scanned: 0,
    claimed: 0,
    sent: 0,
    manual_action_required: 0,
    retrying: 0,
    failed: 0,
    skipped: 0,
    recovered_stale: 0,
  };

  // ---- 1. Recover abandoned "processing" jobs ------------------------
  const { data: recovered, error: recoverErr } = await sb.rpc(
    "recover_stale_communications",
    { _older_than_minutes: STALE_MINUTES },
  );
  if (recoverErr) console.error("[dispatcher] recover failed:", recoverErr.message);
  report.recovered_stale = Number(recovered || 0);

  // ---- 2. Count what is due (observability) --------------------------
  const nowIso = new Date().toISOString();
  const { count } = await sb
    .from("communication_messages")
    .select("id", { count: "exact", head: true })
    .in("status", ["queued", "retrying", "scheduled"])
    .or(`scheduled_at.is.null,scheduled_at.lte.${nowIso}`)
    .or(`next_retry_at.is.null,next_retry_at.lte.${nowIso}`);
  report.scanned = count || 0;

  // ---- 3. Atomically claim a bounded batch ---------------------------
  const { data: claimed, error: claimErr } = await sb.rpc("claim_due_communications", {
    _limit: batch,
  });
  if (claimErr) {
    console.error("[dispatcher] claim failed:", claimErr.message);
    return json({ ...report, ok: false, error: claimErr.message }, 500);
  }

  const messages = (claimed || []) as CommMessage[];
  report.claimed = messages.length;

  // ---- 4. Dispatch each claimed message -------------------------------
  for (const msg of messages) {
    const startedAt = new Date();
    const attemptNumber = (msg.retry_count || 0) + 1;
    const maxAttempts = Math.max(msg.max_retries || MAX_ATTEMPTS, 1);

    const result = await sendThroughRegistry(msg);
    const completedAt = new Date();

    let newStatus: string;
    let retryAt: string | null = null;

    if (result.ok && result.status === "sent") {
      newStatus = "sent";
      report.sent++;
    } else if (result.ok && result.status === "manual_action_required") {
      newStatus = "manual_action_required";
      report.manual_action_required++;
    } else if (result.retryable && attemptNumber < maxAttempts) {
      newStatus = "retrying";
      retryAt = nextRetryAt(attemptNumber, completedAt).toISOString();
      report.retrying++;
    } else {
      newStatus = "failed";
      report.failed++;
    }

    // Delivery attempt audit log (no secrets stored).
    await sb.from("communication_delivery_attempts").insert({
      message_id: msg.id,
      attempt_number: attemptNumber,
      channel: msg.channel,
      provider: result.provider,
      status: newStatus,
      started_at: startedAt.toISOString(),
      completed_at: completedAt.toISOString(),
      provider_message_id: result.provider_message_id || null,
      error_code: result.error_code,
      error: safeError(result.error_message),
      retryable: result.retryable,
      next_retry_at: retryAt,
      response: {
        ok: result.ok,
        status: result.status,
        fallback_url: result.fallback_url || null,
      },
    });

    const patch: Record<string, unknown> = {
      status: newStatus,
      provider: result.provider,
      provider_message_id: result.provider_message_id || msg.provider_message_id || null,
      retry_count: attemptNumber,
      error: safeError(result.error_message),
      error_code: result.error_code,
      next_retry_at: retryAt,
      processing_started_at: null,
      updated_at: new Date().toISOString(),
    };
    if (newStatus === "sent") patch.sent_at = completedAt.toISOString();
    if (newStatus === "failed") patch.failed_at = completedAt.toISOString();
    if (newStatus === "manual_action_required") {
      patch.metadata = {
        ...(msg.metadata || {}),
        manual_action_url: result.fallback_url,
        manual_action_reason: "whatsapp_cloud_not_configured",
      };
    }

    // Never overwrite a terminal state set elsewhere (webhook/cancel).
    const { data: updated, error: updErr } = await sb
      .from("communication_messages")
      .update(patch)
      .eq("id", msg.id)
      .eq("status", "processing")
      .select("id")
      .maybeSingle();

    if (updErr) console.error(`[dispatcher] update failed ${msg.id}:`, updErr.message);
    if (!updated) report.skipped++;

    if (!result.ok) {
      console.error(
        `[dispatcher] ${msg.id} channel=${msg.channel} status=${newStatus} code=${result.error_code}`,
      );
    }
  }

  console.log("[dispatcher] report:", JSON.stringify(report));
  return json(report);
});
