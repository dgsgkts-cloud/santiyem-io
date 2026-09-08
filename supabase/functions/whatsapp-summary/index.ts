// ============================================================
// WhatsApp Yönetici Özeti — tek edge function.
//
// action: status | list | save_recipient | delete_recipient | send_test | cron
//
// Kesin sınırlar:
//  - Finansal rakamlar yalnızca whatsapp_summary_snapshot (mevcut finans/risk
//    motoru) ve Profit/Risk Agent içgörülerinden gelir. Burada hesap yapılmaz.
//  - Credential'lar yalnızca sunucu tarafındadır, cevaba hiç konmaz.
//  - WhatsApp hatası uygulamayı veya finans motorunu etkilemez.
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.0";
import {
  buildSummaryPayload,
  isDue,
  periodKey,
  renderSummaryMessage,
  zonedNow,
  type SummaryKind,
  type SummarySnapshot,
} from "../_shared/whatsapp/summary.ts";
import {
  MANAGER_SUMMARY_TEMPLATE,
  preferTemplate,
  whatsappMessaging,
  type MessagingRecipient,
} from "../_shared/whatsapp/provider.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const APP_BASE = (Deno.env.get("APP_BASE_URL") || "https://santiyem.io").replace(/\/+$/, "");

/** Merkezî deep-link üretimi — web ve native wrapper aynı yolu kullanır. */
const deepLink = (projectId?: string | null) =>
  projectId ? `${APP_BASE}/projeler?proje=${encodeURIComponent(projectId)}` : `${APP_BASE}/dashboard`;

const service = () =>
  createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

/* --------------------------------------------------------------- payload */

async function loadPayload(sb: any, userId: string, kind: SummaryKind, projectIds: string[] | null) {
  const { data: snapRaw, error } = await sb.rpc("whatsapp_summary_snapshot", {
    _user_id: userId,
    _project_ids: projectIds && projectIds.length ? projectIds : null,
  });
  if (error) throw new Error(error.message);
  const snapshot = (snapRaw ?? {}) as SummarySnapshot;

  const { data: insights } = await sb
    .from("ai_project_insights")
    .select("project_id,title,summary,financial_impact,priority,metadata")
    .eq("user_id", userId)
    .eq("scope", "portfolio")
    .eq("status", "active")
    .order("priority", { ascending: true })
    .limit(5);

  const allowed = projectIds && projectIds.length ? new Set(projectIds.map(String)) : null;
  const filtered = (insights ?? []).filter(
    (i: any) => !allowed || !i.project_id || allowed.has(String(i.project_id)),
  );

  const firstProject = filtered[0]?.project_id ?? snapshot.top_risks?.[0]?.project_id ?? null;
  const payload = buildSummaryPayload(snapshot, filtered as any, {
    kind,
    link: deepLink(kind === "test_summary" ? null : firstProject),
  });
  return { payload, snapshot };
}

/* ----------------------------------------------------------------- send */

async function sendSummary(
  sb: any,
  userId: string,
  recipient: any,
  kind: SummaryKind,
  pKey: string,
) {
  // Idempotency: aynı alıcı + dönem için kayıt varsa tekrar gönderme.
  if (kind !== "test_summary") {
    const { data: existing } = await sb
      .from("whatsapp_message_logs")
      .select("id,status")
      .eq("recipient_id", recipient.id)
      .eq("message_type", kind)
      .eq("period_key", pKey)
      .maybeSingle();
    if (existing && existing.status !== "failed") return { skipped: "duplicate" as const };
  }

  const projectIds: string[] =
    recipient.summary_scope === "selected_projects" ? (recipient.project_ids ?? []) : [];
  const { payload } = await loadPayload(sb, userId, kind, projectIds.length ? projectIds : null);
  const body = renderSummaryMessage(payload);

  const target: MessagingRecipient = {
    provider: recipient.provider,
    external_recipient_id: recipient.external_recipient_id,
    phone_number: recipient.phone_number,
    business_scoped_user_id: recipient.business_scoped_user_id,
    display_name: recipient.display_name,
  };

  let outcome;
  if (preferTemplate()) {
    outcome = await whatsappMessaging.sendTemplate(target, {
      name: MANAGER_SUMMARY_TEMPLATE.name,
      language: MANAGER_SUMMARY_TEMPLATE.language,
      bodyParams: [body],
    });
    // Şablon reddedilirse serbest metne düş (pencere içindeyse çalışır).
    if (!outcome.ok) outcome = await whatsappMessaging.sendMessage(target, body);
  } else {
    outcome = await whatsappMessaging.sendMessage(target, body);
  }

  const now = new Date().toISOString();
  const row = {
    user_id: userId,
    recipient_id: recipient.id,
    recipient_label: recipient.display_name,
    message_type: kind,
    period_key: pKey,
    // Audit için yeterli, finansal verinin tam kopyası değil.
    payload_snapshot: {
      active_project_count: payload.active_project_count,
      portfolio_forecast_profit: payload.portfolio_forecast_profit,
      portfolio_profit_erosion: payload.portfolio_profit_erosion,
      topics: payload.top_topics.map((t) => ({ project: t.project_name, headline: t.headline, impact: t.impact })),
      link: payload.link,
    },
    provider: outcome.provider,
    provider_message_id: outcome.provider_message_id,
    status: outcome.ok ? (outcome.status === "manual_action_required" ? "queued" : "sent") : "failed",
    sent_at: outcome.ok ? now : null,
    failed_at: outcome.ok ? null : now,
    failure_reason: outcome.error,
  };

  await sb.from("whatsapp_message_logs").upsert(row, {
    onConflict: "recipient_id,message_type,period_key",
    ignoreDuplicates: false,
  });

  return { sent: outcome.ok, error: outcome.error, preview: body, fallback_url: outcome.fallback_url ?? null };
}

/* ------------------------------------------------------------------ cron */

async function runCron(sb: any) {
  const now = new Date();
  const { data: recipients } = await sb
    .from("whatsapp_summary_recipients")
    .select("*")
    .eq("is_active", true)
    .eq("opt_in", true)
    .neq("summary_frequency", "off")
    .limit(500);

  let sent = 0, skipped = 0, failed = 0;
  for (const r of recipients ?? []) {
    const due = isDue(
      {
        summary_frequency: r.summary_frequency,
        preferred_time: r.preferred_time,
        timezone: r.timezone,
        weekday: r.weekday,
        is_active: r.is_active,
        opt_in: r.opt_in,
      },
      now,
    );
    if (!due.due) { skipped++; continue; }
    try {
      const res = await sendSummary(sb, r.user_id, r, due.kind, periodKey(due.kind, due.zoned, now));
      if ("skipped" in res) skipped++;
      else if (res.sent) sent++;
      else failed++;
    } catch (err) {
      failed++;
      console.error("[whatsapp-summary] cron gönderim hatası", (err as Error).message);
    }
  }
  return { ok: true, sent, skipped, failed };
}

/* ------------------------------------------------------------------ main */

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  let payload: any = {};
  try { payload = await req.json(); } catch { /* boş gövde */ }
  const action = String(payload?.action ?? "status");

  // ---- cron (service-role, kullanıcı oturumu yok) ----
  if (action === "cron") {
    const secret = Deno.env.get("WHATSAPP_SUMMARY_CRON_SECRET");
    if (!secret || req.headers.get("x-cron-secret") !== secret) return json({ error: "forbidden" }, 403);
    try {
      return json(await runCron(service()));
    } catch (err) {
      console.error("[whatsapp-summary] cron failed", (err as Error).message);
      return json({ ok: false, reason: "cron_failed" });
    }
  }

  // ---- kullanıcı işlemleri ----
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

  const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: auth } = await userClient.auth.getUser(authHeader.replace("Bearer ", ""));
  const user = auth?.user;
  if (!user) return json({ error: "Unauthorized" }, 401);

  try {
    if (action === "status") {
      const { data: recipients } = await userClient
        .from("whatsapp_summary_recipients")
        .select("*")
        .order("created_at", { ascending: true });
      const { data: logs } = await userClient
        .from("whatsapp_message_logs")
        .select("id,message_type,status,sent_at,failed_at,failure_reason,recipient_label,created_at")
        .order("created_at", { ascending: false })
        .limit(5);
      const configured = whatsappMessaging.isConfigured();
      const anyFailure = (logs ?? []).some((l: any) => l.status === "failed");
      return json({
        // credential DEĞİL, yalnızca durum
        connection: configured ? (anyFailure ? "error" : "connected") : "not_connected",
        template_mode: preferTemplate(),
        recipients: recipients ?? [],
        logs: logs ?? [],
      });
    }

    if (action === "save_recipient") {
      const r = payload?.recipient ?? {};
      const phone = String(r.phone_number ?? "").replace(/[^\d+]/g, "");
      if (!String(r.display_name ?? "").trim()) return json({ error: "İsim gerekli" }, 400);
      if (!r.id && phone.replace(/\D/g, "").length < 10) return json({ error: "Geçerli bir telefon numarası girin" }, 400);
      const freq = ["daily", "weekly", "off"].includes(r.summary_frequency) ? r.summary_frequency : "daily";
      const scope = r.summary_scope === "selected_projects" ? "selected_projects" : "all_projects";
      const optIn = r.opt_in === true;
      const row: Record<string, unknown> = {
        user_id: user.id,
        display_name: String(r.display_name).trim().slice(0, 80),
        phone_number: phone || null,
        external_recipient_id: phone || null,
        is_active: r.is_active !== false,
        opt_in: optIn,
        opt_in_at: optIn ? new Date().toISOString() : null,
        summary_frequency: freq,
        preferred_time: /^\d{2}:\d{2}(:\d{2})?$/.test(String(r.preferred_time)) ? r.preferred_time : "08:00",
        timezone: String(r.timezone || "Europe/Istanbul").slice(0, 60),
        weekday: Number.isInteger(r.weekday) && r.weekday >= 0 && r.weekday <= 6 ? r.weekday : 1,
        summary_scope: scope,
        project_ids: scope === "selected_projects" && Array.isArray(r.project_ids) ? r.project_ids.map(String) : [],
      };
      const q = r.id
        ? userClient.from("whatsapp_summary_recipients").update(row).eq("id", r.id).eq("user_id", user.id).select("*").maybeSingle()
        : userClient.from("whatsapp_summary_recipients").insert(row).select("*").maybeSingle();
      const { data, error } = await q;
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true, recipient: data });
    }

    if (action === "delete_recipient") {
      const id = String(payload?.id ?? "");
      if (!id) return json({ error: "id gerekli" }, 400);
      const { error } = await userClient.from("whatsapp_summary_recipients").delete().eq("id", id).eq("user_id", user.id);
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    if (action === "send_test") {
      const id = String(payload?.recipient_id ?? "");
      const { data: recipient } = await userClient
        .from("whatsapp_summary_recipients")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (!recipient) return json({ error: "Alıcı bulunamadı" }, 404);
      if (!recipient.opt_in) return json({ error: "Bu alıcı henüz WhatsApp özeti almayı onaylamadı." }, 400);
      const sb = service();
      const z = zonedNow(new Date(), recipient.timezone || "Europe/Istanbul");
      const res = await sendSummary(sb, user.id, recipient, "test_summary", periodKey("test_summary", z));
      return json({ ok: !!(res as any).sent, ...(res as any) });
    }

    if (action === "preview") {
      const { payload: p } = await loadPayload(userClient, user.id, "test_summary", null);
      return json({ ok: true, preview: renderSummaryMessage(p) });
    }

    return json({ error: "Bilinmeyen işlem" }, 400);
  } catch (err) {
    console.error("[whatsapp-summary] failed", (err as Error).message);
    return json({ ok: false, reason: "whatsapp_failed" });
  }
});
