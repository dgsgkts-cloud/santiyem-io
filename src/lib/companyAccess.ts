// SPRINT 41C — company users / roles / permissions model.
//
// IMPORTANT: this file only describes access that the backend actually
// enforces. Two enforcement layers exist in the product:
//
//  1. Company membership (`office_members`) — a member shares every
//     team-scoped record with the company (RLS: can_access_team_resource).
//     Suspended members lose that access immediately.
//  2. Project membership (`project_members` + `project_member_permissions`)
//     — scoped access to selected projects only (RLS: can_access_project /
//     has_project_permission).
//
// There is no enforced "read-only company member", so we never offer one.
// Restricted people are invited as project members instead.

import {
  ROLE_LABELS,
  ROLE_COLORS,
  TUNABLE_KEYS,
  roleDefaultPermission,
  type PermissionKey,
  type ProjectRole,
} from "@/lib/projectPermissions";

export type AccessRoleId = "company_owner" | "company_member" | ProjectRole;

export type UserStatus = "active" | "invited" | "expired" | "suspended";

export interface AccessRoleMeta {
  id: AccessRoleId;
  label: string;
  description: string;
  /** company = sees all company data · project = only assigned projects */
  scope: "company" | "project";
  color: string;
  /** May this role be handed out from the invite / edit sheets? */
  assignable: boolean;
  requiresProjects: boolean;
}

export const ACCESS_ROLES: AccessRoleMeta[] = [
  {
    id: "company_owner",
    label: "Şirket Sahibi",
    description: "Şirket ayarlarını, kullanıcıları ve tüm modülleri yönetir.",
    scope: "company",
    color: "#FF6B2B",
    assignable: false,
    requiresProjects: false,
  },
  {
    id: "company_member",
    label: "Yönetici",
    description: "Şirketin tüm projelerini, ekiplerini ve kayıtlarını yönetebilir.",
    scope: "company",
    color: "#A855F7",
    assignable: true,
    requiresProjects: false,
  },
  {
    id: "site_engineer",
    label: ROLE_LABELS.site_engineer,
    description: "Atandığı projelerde saha verisi, günlük ve puantaj kaydı oluşturabilir.",
    scope: "project",
    color: ROLE_COLORS.site_engineer,
    assignable: true,
    requiresProjects: true,
  },
  {
    id: "manager",
    label: "Proje Yöneticisi",
    description: "Atandığı projelerde saha, personel ve ekip erişimini yönetebilir.",
    scope: "project",
    color: ROLE_COLORS.manager,
    assignable: true,
    requiresProjects: true,
  },
  {
    id: "accountant",
    label: ROLE_LABELS.accountant,
    description: "Atandığı projelerin finans kayıtlarını görüntüler ve yönetir.",
    scope: "project",
    color: ROLE_COLORS.accountant,
    assignable: true,
    requiresProjects: true,
  },
  {
    id: "subcontractor",
    label: ROLE_LABELS.subcontractor,
    description: "Yalnızca kendi ekibinin puantajını ve kendi ödemelerini görebilir.",
    scope: "project",
    color: ROLE_COLORS.subcontractor,
    assignable: true,
    requiresProjects: true,
  },
  {
    id: "worker",
    label: ROLE_LABELS.worker,
    description: "Yalnızca kendisiyle ilgili puantaj kayıtlarını görüntüleyebilir.",
    scope: "project",
    color: ROLE_COLORS.worker,
    assignable: true,
    requiresProjects: true,
  },
  {
    id: "landowner",
    label: "İzleyici / Arsa Sahibi",
    description: "Atandığı projelerin ilerlemesini görüntüler, değişiklik yapamaz.",
    scope: "project",
    color: ROLE_COLORS.landowner,
    assignable: true,
    requiresProjects: true,
  },
];

export function roleMeta(id: AccessRoleId): AccessRoleMeta {
  return ACCESS_ROLES.find(r => r.id === id) ?? ACCESS_ROLES[1];
}

export const ASSIGNABLE_ROLES = ACCESS_ROLES.filter(r => r.assignable);

export function isProjectRole(id: AccessRoleId): id is ProjectRole {
  return id !== "company_owner" && id !== "company_member";
}

// ── status ────────────────────────────────────────────────────────────────
export const STATUS_META: Record<UserStatus, { label: string; dot: string; text: string }> = {
  active: { label: "Aktif", dot: "bg-emerald-500", text: "text-emerald-400" },
  invited: { label: "Davet Bekliyor", dot: "bg-primary", text: "text-primary" },
  expired: { label: "Davet süresi doldu", dot: "bg-rose-500", text: "text-rose-400" },
  suspended: { label: "Askıda", dot: "bg-muted-foreground", text: "text-muted-foreground" },
};

// ── permission summary (plain language, grouped by module) ───────────────
export interface PermissionGroup {
  module: string;
  lines: { label: string; allowed: boolean }[];
}

const GROUPS: { module: string; keys: { key: PermissionKey; label: string }[] }[] = [
  {
    module: "Saha",
    keys: [
      { key: "view_diary", label: "Şantiye günlüğü görüntüleme" },
      { key: "edit_diary", label: "Günlük kaydı oluşturma" },
      { key: "view_photos", label: "Fotoğraf görüntüleme" },
      { key: "view_progress", label: "İlerleme görüntüleme" },
    ],
  },
  {
    module: "Personel",
    keys: [
      { key: "view_attendance_all", label: "Tüm puantaj görüntüleme" },
      { key: "edit_attendance", label: "Puantaj yönetimi" },
      { key: "view_attendance_own_team", label: "Kendi ekibinin puantajı" },
    ],
  },
  {
    module: "Finans",
    keys: [
      { key: "view_costs", label: "Maliyet görüntüleme" },
      { key: "view_payments", label: "Ödeme görüntüleme" },
      { key: "view_financials", label: "Kâr / zarar görüntüleme" },
      { key: "manage_finance", label: "Finans yönetimi" },
    ],
  },
  {
    module: "Ekip",
    keys: [{ key: "manage_members", label: "Proje ekibini yönetme" }],
  },
];

/** Company-wide roles are not permission-scoped — describe them in words. */
export function companyPermissionGroups(isOwner: boolean): PermissionGroup[] {
  return [
    {
      module: "Şirket",
      lines: [
        { label: "Tüm projeler ve kayıtlar", allowed: true },
        { label: "Saha, personel, malzeme ve finans modülleri", allowed: true },
        { label: "Kullanıcı ve rol yönetimi", allowed: isOwner },
        { label: "Abonelik ve şirket ayarları", allowed: isOwner },
      ],
    },
  ];
}

export function projectPermissionGroups(
  role: ProjectRole,
  overrides?: Partial<Record<PermissionKey, boolean>>,
): PermissionGroup[] {
  return GROUPS.map(g => ({
    module: g.module,
    lines: g.keys.map(k => ({
      label: k.label,
      allowed:
        overrides && k.key in overrides
          ? overrides[k.key] === true
          : roleDefaultPermission(role, k.key),
    })),
  })).filter(g => g.lines.some(l => l.allowed));
}

export function hasCustomPermissions(
  role: ProjectRole,
  overrides: Partial<Record<PermissionKey, boolean>>,
): boolean {
  return TUNABLE_KEYS.some(
    t => t.key in overrides && overrides[t.key] !== roleDefaultPermission(role, t.key),
  );
}

export function initials(name: string | null | undefined, email?: string | null): string {
  const source = (name || email || "?").trim();
  const parts = source.split(/[\s@._-]+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toLocaleUpperCase("tr");
  return (parts[0][0] + parts[1][0]).toLocaleUpperCase("tr");
}

export function isValidEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());
}

export function formatDate(v?: string | null): string {
  if (!v) return "—";
  return new Date(v).toLocaleDateString("tr-TR", { day: "2-digit", month: "short", year: "numeric" });
}
