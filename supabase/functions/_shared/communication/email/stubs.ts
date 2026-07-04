// ============================================================
// _shared/communication/email/stubs.ts
// Future-ready driver stubs. Each returns a clear, non-retryable "not
// implemented" result so the Communication Center surfaces a sensible error
// instead of silently failing. Wiring these later is drop-in: implement the
// send() body, keep the same signature.
// ============================================================

import type { EmailAccount, EmailDriver, EmailProviderName, EmailSendInput, EmailSendResult } from "./types.ts";

function stub(provider: EmailProviderName, label: string): EmailDriver {
  return {
    provider,
    async send(_a: EmailAccount, _i: EmailSendInput): Promise<EmailSendResult> {
      return {
        success: false,
        provider,
        error: `${label} sağlayıcısı henüz aktif değil. Şimdilik SMTP veya yerleşik sağlayıcıyı kullanın.`,
        retryable: false,
      };
    },
    async verify() {
      return { ok: false, error: `${label} entegrasyonu yakında.` };
    },
  };
}

export const microsoftGraphDriver = stub("microsoft_graph", "Microsoft Graph");
export const gmailDriver = stub("gmail", "Gmail API");
export const sendgridDriver = stub("sendgrid", "SendGrid");
export const sesDriver = stub("ses", "Amazon SES");
export const mailgunDriver = stub("mailgun", "Mailgun");
