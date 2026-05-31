// Project RBAC — role templates + permission helpers
// Mirrors the server-side `role_default_permission` / `has_project_permission`
// logic for client-side UI guards. Server RLS is the source of truth.

export type ProjectRole =
  | "owner"
  | "manager"
  | "site_engineer"
  | "accountant"
  | "subcontractor"
  | "worker"
  | "landowner";

export const ROLE_LABELS: Record<ProjectRole, string> = {
  owner: "Sahip",
  manager: "Yönetici",
  site_engineer: "Saha Mühendisi / Şef",
  accountant: "Muhasebeci",
  subcontractor: "Taşeron",
  worker: "İşçi / Usta",
  landowner: "Arsa Sahibi",
};

export const ROLE_COLORS: Record<ProjectRole, string> = {
  owner: "#FF6B2B",
  manager: "#A855F7",
  site_engineer: "#22C55E",
  accountant: "#3B82F6",
  subcontractor: "#F59E0B",
  worker: "#64748B",
  landowner: "#EC4899",
};

export type PermissionKey =
  | "view_financials"
  | "view_costs"
  | "view_payments"
  | "view_payments_own"
  | "view_diary"
  | "view_photos"
  | "view_progress"
  | "view_attendance_all"
  | "view_attendance_own_team"
  | "view_attendance_own"
  | "edit_diary"
  | "edit_attendance"
  | "manage_members"
  | "manage_finance";

// Financial keys can only be toggled by the owner.
export const FINANCIAL_KEYS: PermissionKey[] = [
  "view_financials",
  "manage_finance",
  "view_costs",
  "view_payments",
];

const TEMPLATE: Record<ProjectRole, Partial<Record<PermissionKey, boolean>>> = {
  owner: {}, // owner gets everything via short-circuit
  manager: {
    view_costs: true,
    view_payments: true,
    view_diary: true,
    view_photos: true,
    view_attendance_all: true,
    view_progress: true,
    manage_members: true,
  },
  site_engineer: {
    view_diary: true,
    view_photos: true,
    view_attendance_all: true,
    view_progress: true,
    edit_diary: true,
    edit_attendance: true,
  },
  accountant: {
    view_financials: true,
    view_costs: true,
    view_payments: true,
    manage_finance: true,
  },
  subcontractor: {
    view_attendance_own_team: true,
    view_payments_own: true,
  },
  worker: {
    view_attendance_own: true,
  },
  landowner: {
    view_progress: true,
    view_photos: true,
  },
};

export function roleDefaultPermission(role: ProjectRole, key: PermissionKey): boolean {
  if (role === "owner") return true;
  return TEMPLATE[role]?.[key] === true;
}

export function hasPermission(
  role: ProjectRole | null | undefined,
  key: PermissionKey,
  overrides?: Partial<Record<PermissionKey, boolean>>,
): boolean {
  if (!role) return false;
  if (role === "owner") return true;
  if (overrides && key in overrides) return overrides[key] === true;
  return roleDefaultPermission(role, key);
}

// UI helper: which permission keys are exposed in the per-member fine-tune
// panel. Other keys come from role template only.
export const TUNABLE_KEYS: { key: PermissionKey; label: string; financial: boolean }[] = [
  { key: "view_financials", label: "Kâr / zarar görünürlüğü", financial: true },
  { key: "view_costs", label: "Maliyet görünürlüğü", financial: true },
  { key: "view_payments", label: "Ödeme görünürlüğü", financial: true },
  { key: "manage_finance", label: "Finans yönetimi", financial: true },
  { key: "view_diary", label: "Şantiye günlüğü görünürlüğü", financial: false },
  { key: "view_photos", label: "Fotoğraf görünürlüğü", financial: false },
  { key: "view_progress", label: "İlerleme görünürlüğü", financial: false },
  { key: "view_attendance_all", label: "Tüm puantajı görme", financial: false },
];
