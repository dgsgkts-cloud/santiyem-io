// Purchase request workflow — status model, valid transitions, permissions.
// Demo-data backed (no procurement tables exist yet): mutations run against the
// in-memory store in useRequestWorkflow.ts. Statuses reuse the existing Turkish
// STATUSES enum only — no duplicate English values are introduced.
import type { LicenseRole } from "@/lib/licenseStore";
import type { Request } from "./procurementConstants";

export type RequestStatus = Request["status"];

export type WorkflowAction =
  | "submit"
  | "edit"
  | "delete"
  | "approve"
  | "reject"
  | "rfq"
  | "send_rfq"
  | "to_order"
  | "open_order"
  | "track_delivery"
  | "detail"
  | "reopen"
  | "copy";

export const ACTION_LABELS: Record<WorkflowAction, string> = {
  submit: "Onaya Gönder",
  edit: "Düzenle",
  delete: "Sil",
  approve: "Onayla",
  reject: "Reddet",
  rfq: "RFQ Oluştur",
  send_rfq: "Tedarikçilere Gönder",
  to_order: "Siparişe Dönüştür",
  open_order: "Siparişi Aç",
  track_delivery: "Teslimatı Takip Et",
  detail: "Detay",
  reopen: "Yeniden Aç",
  copy: "Kopyala",
};

/** Valid status transitions (source of truth for guards). */
const TRANSITIONS: Record<RequestStatus, RequestStatus[]> = {
  Taslak: ["Onay Bekliyor", "İptal"],
  "Onay Bekliyor": ["Onaylandı", "İptal"],
  Onaylandı: ["Sipariş Verildi", "İptal"],
  "Sipariş Verildi": [],
  İptal: ["Taslak"],
};

export function canTransition(from: RequestStatus, to: RequestStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

/** Roles allowed to run each action. Backend parity note: no procurement
 *  tables exist yet, so this map is also enforced inside the mutation layer. */
const ACTION_ROLES: Record<WorkflowAction, LicenseRole[] | "all"> = {
  detail: "all",
  copy: "all",
  submit: ["super_admin", "company_admin", "project_manager", "procurement", "engineer", "site_chief"],
  edit: ["super_admin", "company_admin", "project_manager", "procurement", "engineer", "site_chief"],
  delete: ["super_admin", "company_admin", "project_manager", "procurement"],
  approve: ["super_admin", "company_admin", "project_manager"],
  reject: ["super_admin", "company_admin", "project_manager"],
  rfq: ["super_admin", "company_admin", "project_manager", "procurement"],
  send_rfq: ["super_admin", "company_admin", "project_manager", "procurement"],
  to_order: ["super_admin", "company_admin", "project_manager", "procurement"],
  open_order: "all",
  track_delivery: "all",
  reopen: ["super_admin", "company_admin", "project_manager", "procurement"],
};

export function canRunAction(role: LicenseRole, action: WorkflowAction): boolean {
  const allowed = ACTION_ROLES[action];
  if (allowed === "all") return true;
  return allowed.includes(role);
}

export interface ActionPlan {
  primary: WorkflowAction;
  secondary?: WorkflowAction;
  tertiary?: WorkflowAction;
  overflow: WorkflowAction[];
}

/** Status-based action model (spec §3). */
export function actionsForRequest(r: Request): ActionPlan {
  switch (r.status) {
    case "Taslak":
      return { primary: "submit", secondary: "edit", tertiary: "detail", overflow: ["delete"] };
    case "Onay Bekliyor":
      return { primary: "approve", secondary: "reject", tertiary: "detail", overflow: [] };
    case "Onaylandı":
      return r.rfq && !r.rfq.sentAt
        ? { primary: "send_rfq", secondary: "to_order", tertiary: "detail", overflow: ["copy"] }
        : { primary: "rfq", secondary: "to_order", tertiary: "detail", overflow: ["copy"] };
    case "Sipariş Verildi":
      return { primary: "open_order", secondary: "track_delivery", tertiary: "detail", overflow: ["copy"] };
    case "İptal":
      return { primary: "detail", secondary: "reopen", tertiary: undefined, overflow: ["copy"] };
    default:
      return { primary: "detail", overflow: [] };
  }
}

export const PERMISSION_MESSAGE = "Bu işlem için yetkiniz bulunmuyor.";
export const PLAN_MESSAGE = "Bu özellik mevcut paketinizde kullanılamıyor.";
export const GENERIC_ERROR = "İşlem tamamlanamadı. Lütfen tekrar deneyin.";
