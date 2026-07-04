// Communication Hub edge function
// Actions: create, preview, send, schedule, cancel, retry, status, list
// All actions are scoped to the authenticated user via RLS.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.0";
import { getProvider } from "../_shared/communication/providers.ts";
import type { CommMessage, CommStatus } from "../_shared/communication/types.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

async function getUserId(req: Request): Promise<string | null> {
  const auth = req.headers.get("Authorization");
  if (!auth) return null;
  const anon = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
  );
  const { data } = await anon.auth.getClaims(auth.replace("Bearer ", ""));
  return (data?.claims?.sub as string) || null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const userId = await getUserId(req);
    if (!userId) return json({ error: "Unauthorized" }, 401);

    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { action, ...payload } = await req.json();

    switch (action) {
      case "create": {
        const {
          channel, recipient, recipient_name, subject, body,
          attachments = [], priority = "normal", scheduled_at,
          created_from, metadata, auto_send = false,
        } = payload;
        if (!channel || !recipient || !body) {
          return json({ error: "channel, recipient, body zorunlu" }, 400);
        }
        const status: CommStatus = scheduled_at
          ? "scheduled"
          : auto_send ? "queued" : "pending_approval";
        const { data, error } = await sb.from("communication_messages").insert({
          user_id: userId,
          channel, recipient, recipient_name, subject, body,
          attachments, priority, scheduled_at, status,
          created_from, metadata: metadata || {},
        }).select("*").single();
        if (error) return json({ error: error.message }, 400);
        return json({ message: data });
      }

      case "preview": {
        const { id } = payload;
        const { data: msg } = await sb.from("communication_messages")
          .select("*").eq("id", id).eq("user_id", userId).maybeSingle();
        if (!msg) return json({ error: "Mesaj bulunamadı" }, 404);
        const provider = getProvider(msg.channel);
        if (!provider) return json({ error: "Kanal desteklenmiyor" }, 400);
        const preview = await provider.previewMessage(msg as CommMessage);
        return json({ preview });
      }

      case "send":
      case "retry": {
        const { id } = payload;
        const { data: msg } = await sb.from("communication_messages")
          .select("*").eq("id", id).eq("user_id", userId).maybeSingle();
        if (!msg) return json({ error: "Mesaj bulunamadı" }, 404);
        if (msg.status === "sent") return json({ message: msg });
        if (msg.status === "cancelled") return json({ error: "İptal edilmiş" }, 400);

        const provider = getProvider(msg.channel);
        if (!provider) return json({ error: "Kanal desteklenmiyor" }, 400);

        await sb.from("communication_messages").update({ status: "sending" }).eq("id", id);

        const result = await provider.sendMessage(msg as CommMessage);
        const newStatus: CommStatus = result.success ? "sent" : "failed";
        const retry = (msg.retry_count || 0) + (action === "retry" ? 1 : 0);

        await sb.from("communication_delivery_attempts").insert({
          message_id: id,
          status: newStatus,
          provider: result.provider,
          response: result.raw ? { raw: result.raw, external_url: result.external_url } : { external_url: result.external_url },
          error: result.error || null,
        });

        const { data: updated } = await sb.from("communication_messages").update({
          status: newStatus,
          sent_at: result.success ? new Date().toISOString() : null,
          provider: result.provider,
          provider_message_id: result.provider_message_id || null,
          error: result.error || null,
          retry_count: retry,
        }).eq("id", id).select("*").single();

        return json({ message: updated, result });
      }

      case "cancel": {
        const { id } = payload;
        const { data, error } = await sb.from("communication_messages").update({
          status: "cancelled",
        }).eq("id", id).eq("user_id", userId)
          .in("status", ["draft", "pending_approval", "scheduled", "queued", "failed"])
          .select("*").maybeSingle();
        if (error) return json({ error: error.message }, 400);
        return json({ message: data });
      }

      case "schedule": {
        const { id, scheduled_at } = payload;
        const { data, error } = await sb.from("communication_messages").update({
          status: "scheduled", scheduled_at,
        }).eq("id", id).eq("user_id", userId).select("*").single();
        if (error) return json({ error: error.message }, 400);
        return json({ message: data });
      }

      case "status": {
        const { id } = payload;
        const { data: msg } = await sb.from("communication_messages")
          .select("*").eq("id", id).eq("user_id", userId).maybeSingle();
        if (!msg) return json({ error: "Mesaj bulunamadı" }, 404);
        const { data: attempts } = await sb.from("communication_delivery_attempts")
          .select("*").eq("message_id", id).order("attempted_at", { ascending: false });
        return json({ message: msg, attempts: attempts || [] });
      }

      case "list": {
        const { status, channel, limit = 50 } = payload;
        let q = sb.from("communication_messages")
          .select("*").eq("user_id", userId)
          .order("created_at", { ascending: false }).limit(limit);
        if (status) q = q.eq("status", status);
        if (channel) q = q.eq("channel", channel);
        const { data, error } = await q;
        if (error) return json({ error: error.message }, 400);
        return json({ messages: data || [] });
      }

      default:
        return json({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (err) {
    console.error("[communication-hub] error:", err);
    return json({ error: (err as Error).message }, 500);
  }
});
