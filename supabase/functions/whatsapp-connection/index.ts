// ============================================================
// WhatsApp bağlantı yaşam döngüsü (Evolution API / Baileys).
//
// action: status | connect | refresh_qr | health | disconnect
//
// Kesin sınırlar:
//  - Evolution base URL / API key yalnızca sunucudadır, cevapta hiç yer almaz.
//  - Instance adı kullanıcıya gösterilmez, tahmin edilemez üretilir.
//  - Kullanıcı yalnızca kendi bağlantısını görebilir/yönetebilir.
//  - Evolution erişilemezse finans/risk motorları etkilenmez; yalnızca
//    bağlantı durumu "failed" olarak bildirilir.
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.0";
import {
  buildInstanceName,
  evolution,
  evolutionConfigured,
  type ConnectionStatus,
} from "../_shared/whatsapp/evolution.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const service = () =>
  createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

const webhookUrl = () => {
  const token = Deno.env.get("EVOLUTION_WEBHOOK_TOKEN");
  const baseUrl = Deno.env.get("SUPABASE_URL");
  if (!token || !baseUrl) return null;
  return `${baseUrl}/functions/v1/evolution-webhook?token=${encodeURIComponent(token)}`;
};

/** İstemciye dönen bağlantı görünümü — hassas alan yok. */
const publicView = (c: any | null) =>
  c
    ? {
        id: c.id,
        status: c.connection_status as ConnectionStatus,
        mode: c.connection_mode,
        connected_number: c.connected_number,
        display_name: c.display_name,
        connected_at: c.connected_at,
        last_connected_at: c.last_connected_at,
        last_disconnected_at: c.last_disconnected_at,
        last_health_check: c.last_health_check,
      }
    : null;

async function currentConnection(sb: any, userId: string) {
  const { data } = await sb
    .from("whatsapp_connections")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ?? null;
}

/** Evolution'dan gerçek durumu okur ve kaydı günceller (health check). */
async function syncState(sb: any, connection: any) {
  if (!connection || !evolutionConfigured()) return connection;
  const res = await evolution.getConnectionState(connection.instance_name);
  const now = new Date().toISOString();
  const patch: Record<string, unknown> = { last_health_check: now };

  if (!res.ok) {
    // Evolution erişilemiyorsa mevcut durumu koru, yalnızca kontrol zamanı yaz.
    if (res.status === 404) patch.connection_status = "qr_required";
  } else {
    const next = res.state;
    patch.connection_status = next;
    if (next === "connected" && connection.connection_status !== "connected") {
      patch.connected_at = connection.connected_at ?? now;
      patch.last_connected_at = now;
    }
    if (next === "disconnected" && connection.connection_status === "connected") {
      patch.last_disconnected_at = now;
    }
  }

  const { data } = await sb
    .from("whatsapp_connections")
    .update(patch)
    .eq("id", connection.id)
    .select("*")
    .maybeSingle();
  return data ?? { ...connection, ...patch };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  let body: any = {};
  try { body = await req.json(); } catch { /* boş gövde */ }
  const action = String(body?.action ?? "status");

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

  const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: auth } = await userClient.auth.getUser(authHeader.replace("Bearer ", ""));
  const user = auth?.user;
  if (!user) return json({ error: "Unauthorized" }, 401);

  const sb = service();

  try {
    /* ------------------------------------------------------- status/health */
    if (action === "status" || action === "health") {
      let connection = await currentConnection(sb, user.id);
      if (connection && action !== "status") connection = await syncState(sb, connection);
      if (connection && action === "status") {
        // Kullanıcı ekranı açtığında durum bir kez tazelenir, dashboard yavaşlamaz.
        connection = await syncState(sb, connection);
      }
      return json({
        ok: true,
        available: evolutionConfigured(),
        connection: publicView(connection),
      });
    }

    if (!evolutionConfigured()) {
      return json({ ok: false, available: false, error: "WhatsApp bağlantı servisi henüz yapılandırılmadı." }, 400);
    }

    /* ------------------------------------------------------------ connect */
    if (action === "connect" || action === "refresh_qr") {
      const mode = body?.mode === "pairing" ? "pairing" : "qr";
      const phone = mode === "pairing" ? String(body?.phone_number ?? "").replace(/\D/g, "") : null;
      if (mode === "pairing" && phone!.length < 10) {
        return json({ ok: false, error: "Ülke koduyla telefon numarası girin." }, 400);
      }

      let connection = await currentConnection(sb, user.id);
      const hook = webhookUrl();

      if (!connection) {
        const instanceName = buildInstanceName(user.id);
        const created = await evolution.createInstance(instanceName, hook, phone);
        if (!created.ok) return json({ ok: false, error: "WhatsApp bağlantısı başlatılamadı. Lütfen tekrar deneyin." }, 502);
        const { data } = await sb
          .from("whatsapp_connections")
          .insert({
            user_id: user.id,
            provider: "evolution",
            instance_name: instanceName,
            external_instance_id: (created.data as any)?.instance?.instanceId ?? null,
            connection_status: "qr_required",
            connection_mode: mode,
            connected_number: phone || null,
          })
          .select("*")
          .maybeSingle();
        connection = data;
        return json({
          ok: true,
          connection: publicView({ ...connection, connection_status: "qr_required" }),
          qr_base64: created.qr.qr_base64,
          pairing_code: created.qr.pairing_code,
        });
      }

      // Mevcut instance: yeni QR / pairing kodu al.
      if (hook) await evolution.setWebhook(connection.instance_name, hook);
      const res = await evolution.connect(connection.instance_name, phone);
      if (!res.ok) {
        await sb.from("whatsapp_connections")
          .update({ connection_status: "failed", last_health_check: new Date().toISOString() })
          .eq("id", connection.id);
        return json({ ok: false, error: "WhatsApp bağlantı kodu alınamadı. Lütfen tekrar deneyin." }, 502);
      }
      const state = res.data?.instance?.state ?? null;
      const nextStatus: ConnectionStatus = state === "open" ? "connected" : "qr_required";
      const { data: updated } = await sb
        .from("whatsapp_connections")
        .update({
          connection_status: nextStatus,
          connection_mode: mode,
          connected_number: phone || connection.connected_number,
          last_health_check: new Date().toISOString(),
        })
        .eq("id", connection.id)
        .select("*")
        .maybeSingle();

      return json({
        ok: true,
        connection: publicView(updated ?? connection),
        qr_base64: res.qr.qr_base64,
        pairing_code: res.qr.pairing_code,
      });
    }

    /* --------------------------------------------------------- disconnect */
    if (action === "disconnect") {
      const connection = await currentConnection(sb, user.id);
      if (!connection) return json({ ok: true, connection: null });

      // 1) planlı gönderimler dursun
      await sb.from("whatsapp_summary_recipients").update({ is_active: false }).eq("user_id", user.id);
      // 2) Evolution oturumu güvenli şekilde kapatılsın
      await evolution.logout(connection.instance_name);
      await evolution.deleteInstance(connection.instance_name);
      // 3) kayıt pasif olsun (audit için minimum metadata kalır)
      await sb
        .from("whatsapp_connections")
        .update({
          connection_status: "disconnected",
          last_disconnected_at: new Date().toISOString(),
          connected_number: null,
          metadata: {},
        })
        .eq("id", connection.id);

      return json({ ok: true, connection: null });
    }

    return json({ error: "Bilinmeyen işlem" }, 400);
  } catch (err) {
    console.error("[whatsapp-connection] failed", (err as Error).message);
    return json({ ok: false, error: "WhatsApp bağlantı işlemi tamamlanamadı." }, 200);
  }
});
