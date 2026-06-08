// Push notification sender using Firebase Cloud Messaging HTTP v1 API.
// Sends to all tokens of a target user, respecting their preferences.
//
// Required secret: FCM_SERVICE_ACCOUNT_JSON  (Firebase service account JSON as a string)
//
// Modes:
//   POST { mode: "send", user_id, title, body, data?, pref_key? }
//   POST { mode: "scan" }   -> daily cron: check overdue + checks due in 3 days
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// ───────────────────────── FCM auth (service account → access token) ─────────────────────────
let cachedToken: { token: string; expiresAt: number } | null = null;

async function getFcmAccessToken(): Promise<{ token: string; projectId: string } | null> {
  const raw = Deno.env.get("FCM_SERVICE_ACCOUNT_JSON");
  if (!raw) return null;
  let sa: any;
  try { sa = JSON.parse(raw); } catch { console.error("FCM_SERVICE_ACCOUNT_JSON is not valid JSON"); return null; }

  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.expiresAt > now + 60) {
    return { token: cachedToken.token, projectId: sa.project_id };
  }

  const header = { alg: "RS256", typ: "JWT" };
  const claim = {
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };
  const b64u = (b: ArrayBuffer | Uint8Array) =>
    btoa(String.fromCharCode(...new Uint8Array(b as any))).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
  const enc = (o: any) => b64u(new TextEncoder().encode(JSON.stringify(o)));
  const unsigned = `${enc(header)}.${enc(claim)}`;

  // Import private key (PKCS#8 PEM → CryptoKey)
  const pem = sa.private_key.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s+/g, "");
  const der = Uint8Array.from(atob(pem), c => c.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    "pkcs8", der.buffer, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]
  );
  const sigBuf = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned));
  const jwt = `${unsigned}.${b64u(sigBuf)}`;

  const tokRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });
  const tok = await tokRes.json();
  if (!tok.access_token) { console.error("FCM token error", tok); return null; }
  cachedToken = { token: tok.access_token, expiresAt: now + (tok.expires_in || 3600) };
  return { token: tok.access_token, projectId: sa.project_id };
}

async function sendFcm(deviceToken: string, title: string, body: string, data: Record<string, string> = {}) {
  const auth = await getFcmAccessToken();
  if (!auth) throw new Error("FCM credentials missing");
  const res = await fetch(`https://fcm.googleapis.com/v1/projects/${auth.projectId}/messages:send`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${auth.token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      message: {
        token: deviceToken,
        notification: { title, body },
        data,
        android: { priority: "HIGH", notification: { sound: "default", channel_id: "santiyem" } },
        apns: { payload: { aps: { sound: "default" } } },
      },
    }),
  });
  if (!res.ok) {
    const txt = await res.text();
    console.warn("FCM send failed", res.status, txt);
    return { ok: false, status: res.status, body: txt };
  }
  return { ok: true };
}

// ───────────────────────── Send to a single user (respecting preferences) ─────────────────────────
async function sendToUser(
  client: ReturnType<typeof createClient>,
  userId: string,
  title: string,
  body: string,
  data: Record<string, string> = {},
  prefKey?: "push_hakedis_approval_request" | "push_check_due_soon" | "push_payment_overdue"
) {
  const { data: prefs } = await client
    .from("notification_preferences")
    .select("push_enabled, push_hakedis_approval_request, push_check_due_soon, push_payment_overdue")
    .eq("user_id", userId)
    .maybeSingle();
  if (!prefs) return { sent: 0, skipped: "no-prefs" };
  if (!(prefs as any).push_enabled) return { sent: 0, skipped: "push-disabled" };
  if (prefKey && !(prefs as any)[prefKey]) return { sent: 0, skipped: `pref-off:${prefKey}` };

  const { data: tokens } = await client
    .from("device_push_tokens")
    .select("id, token")
    .eq("user_id", userId);
  if (!tokens || tokens.length === 0) return { sent: 0, skipped: "no-tokens" };

  let sent = 0;
  for (const t of tokens) {
    try {
      const r = await sendFcm(t.token, title, body, data);
      if (r.ok) sent++;
      // Cleanup stale tokens
      if (!r.ok && (r.status === 404 || r.status === 410)) {
        await client.from("device_push_tokens").delete().eq("id", t.id);
      }
    } catch (e) { console.error("send error", e); }
  }
  return { sent };
}

// ───────────────────────── Daily scan: check due in 3 days + overdue payments ─────────────────────────
async function dailyScan(client: ReturnType<typeof createClient>) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const in3 = new Date(today); in3.setDate(in3.getDate() + 3);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  let sentChecks = 0, sentOverdue = 0;

  // 1) Checks due exactly 3 days from now, status not paid, not yet reminded
  const { data: checks } = await client
    .from("cash_payments")
    .select("id, user_id, recipient, amount, check_due_date, check_no")
    .eq("payment_type", "cek")
    .eq("check_due_date", fmt(in3))
    .neq("status", "odendi")
    .is("check_reminder_sent_at", null);

  for (const c of checks || []) {
    const amt = new Intl.NumberFormat("tr-TR").format(Number(c.amount || 0));
    const r = await sendToUser(
      client,
      (c as any).user_id,
      "Yaklaşan Çek Vadesi",
      `${(c as any).recipient} — ${amt} ₺ tutarlı çekin vadesine 3 gün kaldı.`,
      { route: "payments", payment_id: (c as any).id, check_no: (c as any).check_no || "" },
      "push_check_due_soon"
    );
    if (r.sent > 0) {
      sentChecks += r.sent;
      await client.from("cash_payments").update({ check_reminder_sent_at: new Date().toISOString() }).eq("id", (c as any).id);
    }
  }

  // 2) Overdue payments: due date passed, not paid, not yet reminded
  const { data: overdue } = await client
    .from("cash_payments")
    .select("id, user_id, recipient, amount, check_due_date, payment_date, payment_type")
    .neq("status", "odendi")
    .is("overdue_reminder_sent_at", null);

  for (const p of overdue || []) {
    const due = (p as any).check_due_date || (p as any).payment_date;
    if (!due) continue;
    const dueDate = new Date(due); dueDate.setHours(0, 0, 0, 0);
    if (dueDate >= today) continue;
    const amt = new Intl.NumberFormat("tr-TR").format(Number((p as any).amount || 0));
    const days = Math.floor((today.getTime() - dueDate.getTime()) / 86400000);
    const r = await sendToUser(
      client,
      (p as any).user_id,
      "Gecikmiş Ödeme",
      `${(p as any).recipient} — ${amt} ₺ tutarlı ödeme ${days} gün gecikti.`,
      { route: "payments", payment_id: (p as any).id },
      "push_payment_overdue"
    );
    if (r.sent > 0) {
      sentOverdue += r.sent;
      await client.from("cash_payments").update({ overdue_reminder_sent_at: new Date().toISOString() }).eq("id", (p as any).id);
    }
  }

  return { sentChecks, sentOverdue, scannedChecks: checks?.length || 0, scannedOverdue: overdue?.length || 0 };
}

// ───────────────────────── Handler ─────────────────────────
Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // Parse JWT claims from Authorization header (no anon allowed)
  const authHeader = req.headers.get("Authorization") || "";
  if (!authHeader.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  let callerRole: string | null = null;
  let callerSub: string | null = null;
  try {
    const part = authHeader.slice(7).split(".")[1];
    const claims = JSON.parse(atob(part.replace(/-/g, "+").replace(/_/g, "/")));
    callerRole = claims?.role ?? null;
    callerSub = claims?.sub ?? null;
  } catch {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (callerRole !== "authenticated" && callerRole !== "service_role") {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const client = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    const payload = await req.json().catch(() => ({}));
    const mode = payload.mode || "send";

    if (mode === "scan") {
      // Scan mode is a system-wide job — restrict to service-role callers (cron).
      if (callerRole !== "service_role") {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const result = await dailyScan(client);
      return new Response(JSON.stringify({ ok: true, ...result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (mode === "send") {
      const { user_id, title, body, data, pref_key } = payload;
      if (!user_id || !title || !body) {
        return new Response(JSON.stringify({ error: "user_id, title, body required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Authenticated users may only send pushes to themselves; service-role can target anyone.
      if (callerRole === "authenticated" && user_id !== callerSub) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const r = await sendToUser(client, user_id, title, body, data || {}, pref_key);
      return new Response(JSON.stringify({ ok: true, ...r }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "unknown mode" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String((e as Error)?.message || e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
