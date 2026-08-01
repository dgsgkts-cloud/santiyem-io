// Creates the in-app approval notification for the selected approver.
// Uses the existing `reminders` table, which powers the app notification
// centre: rows are inserted by the requester (RLS: user_id = auth.uid()) and
// assigned to the approver (`assigned_to`), so the whole company team can read
// it. No email / WhatsApp is sent from here, so we never claim one was.
import { supabase } from "@/integrations/supabase/client";
import type { Request } from "./procurementConstants";

export const APPROVAL_NOTIFICATION_TITLE =
  "Yeni satın alma talebi onayınızı bekliyor.";

export async function notifyApprover(opts: {
  request: Request;
  approverUserId: string | null;
  approverName: string | null;
  dueDate?: string;
  note?: string;
  /** true when the requester pulled the request back out of approval */
  withdrawn?: boolean;
}): Promise<boolean> {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth?.user?.id;
  if (!uid) return false;

  const link = `${window.location.pathname}?talep=${opts.request.id}`;
  const parts = [
    `${opts.request.no} · ${opts.request.project}`,
    `Talep eden: ${opts.request.requester}`,
    opts.approverName ? `Onaylayıcı: ${opts.approverName}` : null,
    opts.note ? `Not: ${opts.note}` : null,
    `Talep detayı: ${link}`,
  ].filter(Boolean);

  const { error } = await supabase.from("reminders").insert({
    user_id: uid,
    title: opts.withdrawn
      ? "Satın alma talebi onay sürecinden geri çekildi."
      : APPROVAL_NOTIFICATION_TITLE,
    reminder_date: opts.dueDate || new Date().toISOString().slice(0, 10),
    note: parts.join("\n"),
    assigned_to: opts.approverUserId,
  });

  if (error && import.meta.env.DEV) {
    console.error("[procurement] approval notification failed", error);
  }
  return !error;
}
