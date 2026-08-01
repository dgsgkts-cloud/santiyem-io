// Derives the readable approval flow for a purchase request.
//
// The stage list is DERIVED from the request's own data (creation, resolved
// approver, order) — it is never a hardcoded five-step department chain, so a
// company using a single approver sees a 3-stage flow and nothing is truncated.
import type { Request } from "./procurementConstants";

export type StageState = "done" | "current" | "pending" | "rejected" | "cancelled";

export interface ApprovalStage {
  key: string;
  /** full, never-truncated stage name */
  label: string;
  state: StageState;
  /** person who acted (or must act) */
  actor?: string | null;
  role?: string | null;
  at?: string | null;
  note?: string | null;
  /** shown when nobody has acted yet */
  statusLabel: string;
}

export interface ApprovalFlow {
  stages: ApprovalStage[];
  /** completed stage count */
  completed: number;
  total: number;
  /** true for reddedildi / iptal — progress count is not shown */
  terminated: boolean;
  rejected: boolean;
  cancelled: boolean;
  /** one-line current state copy for the card */
  currentLabel: string;
  /** percent 0-100 for the thin progress line */
  percent: number;
  /** screen-reader sentence */
  ariaLabel: string;
}

export const fmtStageDate = (iso?: string | null) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.toLocaleDateString("tr-TR", { day: "numeric", month: "long" })}, ${d.toLocaleTimeString(
    "tr-TR",
    { hour: "2-digit", minute: "2-digit" }
  )}`;
};

const approverLabel = (r: Request) =>
  r.approverName?.trim() || r.approverRole?.trim() || null;

export function buildApprovalFlow(r: Request): ApprovalFlow {
  const approver = approverLabel(r);
  const rejected = r.status === "İptal" && !!(r.rejectionReason || r.rejectedAt);
  const cancelled = r.status === "İptal" && !rejected;

  const approvalStageName = approver ? `${approver} onayı` : "Yönetici onayı";

  const created: ApprovalStage = {
    key: "created",
    label: "Talep oluşturuldu",
    state: "done",
    actor: r.requester,
    at: r.submittedForApprovalAt ?? null,
    statusLabel: "Tamamlandı",
  };

  const approval: ApprovalStage = {
    key: "approval",
    label: approvalStageName,
    state: "pending",
    actor: r.approvedBy ?? r.rejectedBy ?? r.approverName ?? null,
    role: r.approverRole ?? null,
    at: r.approvedAt ?? r.rejectedAt ?? null,
    note: r.rejectionReason
      ? [r.rejectionReason, r.rejectionNote].filter(Boolean).join(" · ")
      : r.approvalNote ?? null,
    statusLabel: "Bekleniyor",
  };

  const order: ApprovalStage = {
    key: "order",
    label: "Sipariş oluşturuldu",
    state: "pending",
    at: null,
    statusLabel: "Bekleniyor",
  };

  let completed = 1;
  let currentLabel = "Onaya gönderilmedi";

  switch (r.status) {
    case "Taslak":
      created.at = null;
      created.statusLabel = "Hazırlandı";
      currentLabel = "Onaya gönderilmedi";
      completed = 1;
      break;
    case "Onay Bekliyor":
      approval.state = "current";
      approval.statusLabel = "Bekleniyor";
      currentLabel = approver
        ? `${approver} onayı bekleniyor`
        : "Onaylayıcı atanmadı";
      completed = 1;
      break;
    case "Onaylandı":
      approval.state = "done";
      approval.statusLabel = "Onaylandı";
      order.state = "current";
      currentLabel = "Tüm onaylar tamamlandı";
      completed = 2;
      break;
    case "Sipariş Verildi":
      approval.state = "done";
      approval.statusLabel = "Onaylandı";
      order.state = "done";
      order.actor = r.orderNo ?? null;
      order.statusLabel = r.orderNo ? `${r.orderNo} oluşturuldu` : "Tamamlandı";
      currentLabel = "Onay tamamlandı · Sipariş oluşturuldu";
      completed = 3;
      break;
    case "İptal":
      if (rejected) {
        approval.state = "rejected";
        approval.statusLabel = "Reddedildi";
        currentLabel = r.rejectedBy
          ? `${r.rejectedBy} tarafından reddedildi`
          : "Reddedildi";
      } else {
        approval.state = "cancelled";
        approval.statusLabel = "İptal edildi";
        currentLabel = "Onay akışı iptal edildi";
      }
      order.state = "cancelled";
      order.statusLabel = "İptal edildi";
      completed = 1;
      break;
    default:
      break;
  }

  const stages = [created, approval, order];
  const total = stages.length;
  const percent = rejected || cancelled ? 100 : Math.round((completed / total) * 100);

  const ariaLabel = rejected
    ? `Onay akışı: talep reddedildi. ${currentLabel}. Onay geçmişini aç.`
    : cancelled
    ? `Onay akışı iptal edildi. Onay geçmişini aç.`
    : `Onay akışı: ${total} aşamadan ${completed}'i tamamlandı. ${currentLabel}. Onay geçmişini aç.`;

  return {
    stages,
    completed,
    total,
    terminated: rejected || cancelled,
    rejected,
    cancelled,
    currentLabel,
    percent,
    ariaLabel,
  };
}
