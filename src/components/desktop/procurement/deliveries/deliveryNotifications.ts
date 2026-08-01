// Satın Alma → Teslimatlar: in-app notifications for delivery events.
// Every notification carries a deep link to the real record and is
// de-duplicated with a stable key so page refreshes never duplicate it.
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

export type DeliveryNotificationEvent =
  | "planned"
  | "dispatched"
  | "eta_changed"
  | "delayed"
  | "arrived"
  | "receipt_pending"
  | "partial_accepted"
  | "damaged"
  | "stock_entry"
  | "payment_due"
  | "invoice_mismatch";

export interface DeliveryNotificationInput {
  event: DeliveryNotificationEvent;
  deliveryId: string | null;
  orderId: string;
  title: string;
  detail?: string;
  /** Deep link, e.g. /satin-alma/teslimatlar/<id> */
  link: string;
  /** Optional assignee (finance / warehouse manager). */
  assignedTo?: string | null;
  date?: string;
}

const keyOf = (i: DeliveryNotificationInput) =>
  `[dv:${i.deliveryId ?? i.orderId}:${i.event}]`;

export const notifyDelivery = async (input: DeliveryNotificationInput) => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;

    const key = keyOf(input);
    const { data: existing } = await db
      .from("reminders")
      .select("id")
      .eq("user_id", user.id)
      .ilike("note", `%${key}%`)
      .limit(1);
    if (existing?.length) return false;

    const note = [input.detail, input.link, key].filter(Boolean).join(" · ");
    const { error } = await db.from("reminders").insert({
      user_id: user.id,
      title: input.title,
      reminder_date: input.date ?? new Date().toISOString().slice(0, 10),
      note,
      done: false,
      assigned_to: input.assignedTo ?? null,
    });
    if (error) throw error;
    return true;
  } catch (e) {
    console.error("[deliveries] notification failed", e);
    return false;
  }
};

export const deliveryLink = (deliveryId: string) =>
  `/satin-alma/teslimatlar/${deliveryId}`;
