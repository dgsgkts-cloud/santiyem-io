// Communication Hub — shared types & provider interface.
// Every future channel (WhatsApp, Email, SMS, Push, Teams, Slack) must
// implement CommunicationProvider so the hub can route messages uniformly.

export type CommChannel = "whatsapp" | "email" | "sms" | "push" | "teams" | "slack";
export type CommPriority = "low" | "normal" | "high" | "urgent";
export type CommStatus =
  | "draft"
  | "pending_approval"
  | "scheduled"
  | "queued"
  | "sending"
  | "sent"
  | "failed"
  | "cancelled";

export interface CommAttachment {
  name: string;
  url: string;
  mime?: string;
}

export interface CommMessage {
  id: string;
  user_id: string;
  channel: CommChannel;
  recipient: string;
  recipient_name?: string | null;
  subject?: string | null;
  body: string;
  attachments: CommAttachment[];
  priority: CommPriority;
  status: CommStatus;
  scheduled_at?: string | null;
  sent_at?: string | null;
  provider?: string | null;
  provider_message_id?: string | null;
  error?: string | null;
  retry_count: number;
  max_retries: number;
  created_from?: string | null;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ProviderSendResult {
  success: boolean;
  provider: string;
  provider_message_id?: string;
  // For channels that require the end-user to complete the send in their own
  // client (e.g. WhatsApp deep-link), return the URL to open.
  external_url?: string;
  // If the failure is temporary and the hub should retry.
  retryable?: boolean;
  error?: string;
  raw?: unknown;
}

export interface ProviderPreview {
  channel: CommChannel;
  recipient: string;
  subject?: string;
  body: string;
  attachments: CommAttachment[];
  render_notes?: string;
}

export interface CommunicationProvider {
  readonly channel: CommChannel;
  readonly name: string;

  previewMessage(msg: CommMessage): Promise<ProviderPreview>;
  sendMessage(msg: CommMessage): Promise<ProviderSendResult>;
  getDeliveryStatus?(msg: CommMessage): Promise<CommStatus>;
}
