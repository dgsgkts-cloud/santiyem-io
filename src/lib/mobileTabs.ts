import {
  Home, FolderOpen, FileText, BookOpen, Users, CreditCard,
  CheckSquare, Settings, type LucideIcon,
} from "lucide-react";
import type { ProjectRole } from "@/lib/projectPermissions";

export type MobileTabId =
  | "dashboard" | "projects" | "hakedis" | "site-diary"
  | "payments-kasa" | "settings" | "more";

export interface MobileTab {
  id: MobileTabId;
  label: string;
  icon: LucideIcon;
}

const FULL_TABS: MobileTab[] = [
  { id: "dashboard", label: "Ana Sayfa", icon: Home },
  { id: "projects", label: "Projeler", icon: FolderOpen },
  { id: "hakedis", label: "Hakediş", icon: FileText },
  { id: "site-diary", label: "Günlük", icon: BookOpen },
  { id: "more", label: "Daha Fazla", icon: Settings },
];

/**
 * Bottom tab bar definitions per role. Owner/manager get the full menu.
 * Restricted roles see only the tabs that match their permissions, and
 * unauthorized tabs are hidden entirely (not locked) per RBAC spec.
 */
const ROLE_TABS: Record<ProjectRole, MobileTab[]> = {
  owner: FULL_TABS,
  manager: FULL_TABS,
  site_engineer: [
    { id: "projects", label: "Şantiye", icon: FolderOpen },
    { id: "site-diary", label: "Günlük", icon: BookOpen },
    { id: "settings", label: "Profil", icon: Settings },
  ],
  accountant: [
    { id: "hakedis", label: "Hakediş", icon: FileText },
    { id: "payments-kasa", label: "Kasa", icon: CreditCard },
    { id: "settings", label: "Profil", icon: Settings },
  ],
  subcontractor: [
    { id: "projects", label: "Ekibim", icon: Users },
    { id: "payments-kasa", label: "Ödemelerim", icon: CreditCard },
    { id: "settings", label: "Profil", icon: Settings },
  ],
  worker: [
    { id: "site-diary", label: "Yoklama", icon: CheckSquare },
    { id: "settings", label: "Profil", icon: Settings },
  ],
  landowner: [
    { id: "projects", label: "Proje", icon: FolderOpen },
    { id: "site-diary", label: "Günlük", icon: BookOpen },
    { id: "settings", label: "Profil", icon: Settings },
  ],
};

/** Bottom tabs for the given primary role. Defaults to full menu when unknown. */
export function getMobileTabsForRole(role: ProjectRole | null): MobileTab[] {
  if (!role) return FULL_TABS;
  return ROLE_TABS[role] ?? FULL_TABS;
}

/** Drawer items allowed for the given role (string ids). null = allow all. */
export function getAllowedDrawerIdsForRole(role: ProjectRole | null): Set<string> | null {
  if (!role || role === "owner" || role === "manager") return null;
  const base = new Set<string>(["settings", "reminders", "daily"]);
  ROLE_TABS[role].forEach((t) => base.add(t.id));
  // Always allow chat for restricted roles too (read-only AI)
  base.add("chat");
  return base;
}
