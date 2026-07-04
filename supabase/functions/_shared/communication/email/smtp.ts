// ============================================================
// _shared/communication/email/smtp.ts
// SMTP driver — uses denomailer. Reads password from Supabase Secrets by
// the env-var name stored in account.config.password_secret. Never expects
// plaintext passwords in the DB.
// ============================================================

import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
import type { EmailAccount, EmailDriver, EmailSendInput, EmailSendResult } from "./types.ts";

async function fetchAttachment(a: { url?: string; content?: string; filename: string; mime?: string }) {
  if (a.content) {
    return {
      filename: a.filename,
      content: a.content,
      encoding: "base64" as const,
      contentType: a.mime || "application/octet-stream",
    };
  }
  if (!a.url) return null;
  const resp = await fetch(a.url);
  if (!resp.ok) throw new Error(`Ek indirilemedi: ${a.filename} (${resp.status})`);
  const buf = new Uint8Array(await resp.arrayBuffer());
  return {
    filename: a.filename,
    content: buf,
    encoding: "binary" as const,
    contentType: a.mime || resp.headers.get("Content-Type") || "application/octet-stream",
  };
}

export const smtpDriver: EmailDriver = {
  provider: "smtp",
  async send(account: EmailAccount, input: EmailSendInput): Promise<EmailSendResult> {
    const cfg = account.config as {
      host?: string; port?: number; secure?: boolean;
      username?: string; password_secret?: string;
    };
    if (!cfg.host || !cfg.port || !cfg.username || !cfg.password_secret) {
      return {
        success: false,
        provider: "smtp",
        error: "SMTP yapılandırması eksik (host, port, username, password_secret)",
        retryable: false,
      };
    }
    const password = Deno.env.get(cfg.password_secret);
    if (!password) {
      return {
        success: false,
        provider: "smtp",
        error: `SMTP şifresi bulunamadı: secret '${cfg.password_secret}' tanımlı değil`,
        retryable: false,
      };
    }

    let client: SMTPClient | null = null;
    try {
      client = new SMTPClient({
        connection: {
          hostname: cfg.host,
          port: cfg.port,
          tls: cfg.secure ?? cfg.port === 465,
          auth: { username: cfg.username, password },
        },
      });

      const attachments = [];
      for (const a of input.attachments || []) {
        const parsed = await fetchAttachment(a);
        if (parsed) attachments.push(parsed);
      }

      await client.send({
        from: input.from.name
          ? `${input.from.name} <${input.from.email}>`
          : input.from.email,
        to: input.to,
        cc: input.cc?.length ? input.cc : undefined,
        bcc: input.bcc?.length ? input.bcc : undefined,
        replyTo: input.reply_to,
        subject: input.subject,
        content: input.text || " ",
        html: input.html,
        attachments: attachments.length ? attachments : undefined,
      });

      return { success: true, provider: "smtp" };
    } catch (err) {
      const msg = (err as Error).message || String(err);
      // Auth / permanent errors are non-retryable; network / 4xx SMTP codes are.
      const retryable = !/auth|530|535|550|551|553|554/i.test(msg);
      return { success: false, provider: "smtp", error: msg, retryable };
    } finally {
      try { await client?.close(); } catch { /* ignore */ }
    }
  },
  async verify(account) {
    const cfg = account.config as { password_secret?: string; host?: string; port?: number; username?: string };
    if (!cfg.host || !cfg.port || !cfg.username || !cfg.password_secret) {
      return { ok: false, error: "SMTP yapılandırması eksik" };
    }
    if (!Deno.env.get(cfg.password_secret)) {
      return { ok: false, error: `Secret bulunamadı: ${cfg.password_secret}` };
    }
    return { ok: true };
  },
};
