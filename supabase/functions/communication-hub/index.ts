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
          message_type = "text",
          template_name, template_language, template_variables,
          media_url, media_caption,
          // Sprint 9.1 — email fields
          cc = [], bcc = [], email_account_id,
          project_id, related_action,
        } = payload;
        if (!channel || !recipient) {
          return json({ error: "channel, recipient zorunlu" }, 400);
        }
        // Body optional for template / media messages, mandatory for text
        if (message_type === "text" && !body) {
          return json({ error: "text mesaj için body zorunlu" }, 400);
        }
        if (message_type === "template" && !template_name) {
          return json({ error: "template mesaj için template_name zorunlu" }, 400);
        }
        if (channel === "email" && !subject) {
          return json({ error: "e-posta için konu (subject) zorunlu" }, 400);
        }
        const status: CommStatus = scheduled_at
          ? "scheduled"
          : auto_send ? "queued" : "pending_approval";
        const { data, error } = await sb.from("communication_messages").insert({
          user_id: userId,
          channel, recipient, recipient_name, subject, body: body || "",
          attachments, priority, scheduled_at, status,
          created_from, metadata: metadata || {},
          message_type,
          template_name: template_name || null,
          template_language: template_language || null,
          template_variables: template_variables || {},
          media_url: media_url || null,
          media_caption: media_caption || null,
          cc: Array.isArray(cc) ? cc : [],
          bcc: Array.isArray(bcc) ? bcc : [],
          email_account_id: email_account_id || null,
          project_id: project_id || null,
          related_action: related_action || null,
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

        // Sprint 11.1 — track org monthly comm messages on success.
        if (result.success) {
          try {
            const authHeader = req.headers.get("Authorization")!;
            const asUser = createClient(
              Deno.env.get("SUPABASE_URL")!,
              Deno.env.get("SUPABASE_ANON_KEY")!,
              { global: { headers: { Authorization: authHeader } } },
            );
            await asUser.rpc("increment_usage", {
              _metric: "comm_messages_month",
              _delta: 1,
              _reason: `comm:${msg.channel}`,
            });
          } catch (_) { /* ignore */ }
        }

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
        const { status, channel, limit = 50, project_id, recipient, search } = payload;
        let q = sb.from("communication_messages")
          .select("*").eq("user_id", userId)
          .order("created_at", { ascending: false }).limit(limit);
        if (status) q = q.eq("status", status);
        if (channel) q = q.eq("channel", channel);
        if (project_id) q = q.eq("project_id", project_id);
        if (recipient) q = q.ilike("recipient", `%${recipient}%`);
        if (search && typeof search === "string" && search.trim()) {
          const s = `%${search.trim()}%`;
          q = q.or(
            `subject.ilike.${s},body.ilike.${s},recipient.ilike.${s},recipient_name.ilike.${s}`,
          );
        }
        const { data, error } = await q;
        if (error) return json({ error: error.message }, 400);
        return json({ messages: data || [] });
      }

      // ============================================================
      // Sprint 9.1 — Email account management (per-tenant)
      // Credentials are stored in Supabase Secrets; only env-var *names*
      // and non-secret config live in email_accounts.config.
      // ============================================================
      case "email-accounts.list": {
        const { data, error } = await sb.from("email_accounts")
          .select("*").eq("user_id", userId)
          .order("is_default", { ascending: false })
          .order("created_at", { ascending: false });
        if (error) return json({ error: error.message }, 400);
        return json({ accounts: data || [] });
      }
      case "email-accounts.upsert": {
        const { id, display_name, from_email, reply_to, signature, provider, config, is_default } = payload;
        if (!display_name || !from_email || !provider) {
          return json({ error: "display_name, from_email, provider zorunlu" }, 400);
        }
        // Enforce single default per user
        if (is_default) {
          await sb.from("email_accounts").update({ is_default: false })
            .eq("user_id", userId).neq("id", id || "00000000-0000-0000-0000-000000000000");
        }
        const row = {
          user_id: userId,
          display_name, from_email,
          reply_to: reply_to || null,
          signature: signature || null,
          provider,
          config: config || {},
          is_default: !!is_default,
        };
        const query = id
          ? sb.from("email_accounts").update(row).eq("id", id).eq("user_id", userId).select("*").single()
          : sb.from("email_accounts").insert(row).select("*").single();
        const { data, error } = await query;
        if (error) return json({ error: error.message }, 400);
        return json({ account: data });
      }
      case "email-accounts.delete": {
        const { id } = payload;
        const { error } = await sb.from("email_accounts")
          .delete().eq("id", id).eq("user_id", userId);
        if (error) return json({ error: error.message }, 400);
        return json({ ok: true });
      }
      case "email-accounts.set-default": {
        const { id } = payload;
        await sb.from("email_accounts").update({ is_default: false }).eq("user_id", userId);
        const { data, error } = await sb.from("email_accounts")
          .update({ is_default: true }).eq("id", id).eq("user_id", userId).select("*").single();
        if (error) return json({ error: error.message }, 400);
        return json({ account: data });
      }
      case "email-accounts.verify": {
        const { id } = payload;
        const { data: acc } = await sb.from("email_accounts")
          .select("*").eq("id", id).eq("user_id", userId).maybeSingle();
        if (!acc) return json({ error: "Hesap bulunamadı" }, 404);
        const { emailDriverRegistry } = await import("../_shared/communication/email/index.ts");
        const driver = emailDriverRegistry[acc.provider as keyof typeof emailDriverRegistry];
        const result = driver.verify ? await driver.verify(acc) : { ok: true };
        await sb.from("email_accounts").update({
          status: result.ok ? "active" : "error",
          last_sync_at: new Date().toISOString(),
          last_error: result.ok ? null : (result.error || null),
        }).eq("id", id);
        return json(result);
      }

      default:
        return json({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (err) {
    console.error("[communication-hub] error:", err);
    return json({ error: (err as Error).message }, 500);
  }
});
