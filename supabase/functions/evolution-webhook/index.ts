// ============================================================
// Evolution API webhook — connection update, QR update, message status,
// incoming message eventlerini alır.
//
// Bu fazda gelen mesajlar HİÇBİR finansal/operasyonel kayda dönüştürülmez ve
// içerikleri saklanmaz; yalnızca bağlantı ve gönderim durumu güncellenir.
//
// Multi-tenancy: her event instance adı üzerinden tek bir bağlantıya, o da tek
// bir kullanıcıya/firmaya eşlenir. Eşleşme yoksa event yok sayılır.
// verify_jwt = false; erişim yalnızca ?token= gizli anahtarıyla doğrulanır.
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.0";
import { mapMessageStatus, mapState } from "../_shared/whatsapp/evolution.ts";

const ok = () => new Response("ok", { status: 200 });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204 });
  if (req.method !== "POST") return new Response("method not allowed", { status: 405 });

  const url = new URL(req.url);
  const expected = Deno.env.get("EVOLUTION_WEBHOOK_TOKEN");
  const provided = url.searchParams.get("token") ?? req.headers.get("x-webhook-token");
  if (!expected || provided !== expected) return new Response("forbidden", { status: 403 });

  let payload: any = null;
  try { payload = await req.json(); } catch { return new Response("bad json", { status: 400 }); }

  const event = String(payload?.event ?? "").toLowerCase().replace(/\./g, "_");
  const instanceName = String(payload?.instance ?? payload?.instanceName ?? "");
  if (!instanceName) return ok();

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  try {
    const { data: connection } = await sb
      .from("whatsapp_connections")
      .select("id,user_id,company_id,connection_status,connected_at,connected_number")
      .eq("instance_name", instanceName)
      .maybeSingle();
    if (!connection) return ok(); // başka bir sisteme ait instance — dokunma

    const now = new Date().toISOString();
    const data = payload?.data ?? {};

    /* ------------------------------------------------- connection update */
    if (event === "connection_update") {
      const status = mapState(data?.state ?? data?.connection);
      const patch: Record<string, unknown> = { connection_status: status, last_health_check: now };
      if (status === "connected") {
        patch.connected_at = connection.connected_at ?? now;
        patch.last_connected_at = now;
        const jid = String(data?.wuid ?? payload?.sender ?? "");
        const digits = jid.replace(/\D/g, "");
        if (digits.length >= 10) patch.connected_number = digits;
      }
      if (status === "disconnected") patch.last_disconnected_at = now;
      await sb.from("whatsapp_connections").update(patch).eq("id", connection.id);
      return ok();
    }

    /* -------------------------------------------------------- QR update */
    if (event === "qrcode_updated") {
      // QR görüntüsü saklanmaz; yalnızca yeni doğrulama gerektiği işaretlenir.
      await sb
        .from("whatsapp_connections")
        .update({ connection_status: "qr_required", last_health_check: now })
        .eq("id", connection.id);
      return ok();
    }

    /* -------------------------------------------- message status update */
    if (event === "messages_update" || event === "send_message") {
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        const providerId = item?.keyId ?? item?.key?.id ?? item?.messageId ?? null;
        const mapped = mapMessageStatus(item?.status ?? item?.update?.status);
        if (!providerId || !mapped) continue;
        const patch: Record<string, unknown> = { status: mapped };
        if (mapped === "sent") patch.sent_at = now;
        if (mapped === "delivered") patch.delivered_at = now;
        if (mapped === "read") patch.read_at = now;
        if (mapped === "failed") { patch.failed_at = now; patch.failure_reason = "Gönderim başarısız"; }
        await sb
          .from("whatsapp_message_logs")
          .update(patch)
          .eq("provider_message_id", String(providerId))
          .eq("user_id", connection.user_id);
      }
      return ok();
    }

    /* --------------------------------------------------- incoming message */
    if (event === "messages_upsert") {
      // BU FAZDA: içerik saklanmaz, hiçbir kayıt oluşturulmaz. Sadece iz bırakılır.
      console.log("[evolution-webhook] inbound event alındı (işlenmedi)", {
        connection_id: connection.id,
        from_self: !!(Array.isArray(data) ? data[0]?.key?.fromMe : data?.key?.fromMe),
      });
      return ok();
    }

    return ok();
  } catch (err) {
    console.error("[evolution-webhook] işleme hatası", (err as Error).message);
    return ok(); // Evolution'ı sürekli retry'a zorlamayalım
  }
});
