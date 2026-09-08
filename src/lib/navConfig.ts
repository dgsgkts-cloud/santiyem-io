// SPRINT 44 — Single source of truth for the primary navigation information
// architecture. Desktop sidebar and the mobile drawer both render this tree so
// the two surfaces can never drift.
//
// New product direction: Construction Profit Intelligence. The menu shows only
// the four things a company owner needs at a glance. Every other module keeps
// working through its existing route, deep link or in-project entry point — no
// route, page, table, data, hook or permission is removed here.

import {
  LayoutDashboard, FolderKanban, AlertTriangle, Plug, type LucideIcon,
} from "lucide-react";


/** Query params applied on top of the destination tab route. */
export type NavSearch = Record<string, string>;

export interface NavLeaf {
  id: string;
  label: string;
  icon: LucideIcon;
  /** Existing app tab id (route owner). Never invented. */
  tab: string;
  /** Optional sub-view selector, read by the destination page. */
  search?: NavSearch;
}

export interface NavArea {
  id: string;
  label: string;
  icon: LucideIcon;
  /** Direct destination when the area has no children. */
  tab?: string;
  /** Optional sub-view selector for a childless area. */
  search?: NavSearch;
  children?: NavLeaf[];
  accent?: boolean;
}

export const NAV_AREAS: NavArea[] = [
  { id: "dashboard", label: "Ana Sayfa", icon: LayoutDashboard, tab: "dashboard" },
  { id: "projects", label: "Projeler", icon: FolderKanban, tab: "projects" },
  {
    id: "risks",
    label: "Riskler",
    icon: AlertTriangle,
    tab: "dashboard",
    search: { bolum: "riskler" },
  },
  { id: "integrations", label: "Entegrasyonlar", icon: Plug, tab: "integrations" },
];


/** All tabs referenced by the visible menu. */
export const NAV_MENU_TABS = new Set<string>(
  NAV_AREAS.flatMap((a) => [a.tab, ...(a.children ?? []).map((c) => c.tab)].filter(Boolean) as string[]),
);

export const searchToQuery = (search?: NavSearch) =>
  search && Object.keys(search).length ? `?${new URLSearchParams(search).toString()}` : "";

const searchMatches = (search: NavSearch | undefined, currentSearch: string) => {
  const params = new URLSearchParams(currentSearch);
  if (!search) return !params.get("bolum");
  return Object.entries(search).every(([k, v]) => params.get(k) === v);
};

/** A leaf is active when its tab matches and every declared param matches. */
export const isLeafActive = (leaf: NavLeaf, activeTab: string, currentSearch: string) => {
  if (leaf.tab !== activeTab) return false;
  if (!leaf.search) return true;
  const params = new URLSearchParams(currentSearch);
  return Object.entries(leaf.search).every(([k, v]) => params.get(k) === v);
};

/** An area is active when it (or any child) points at the active tab. */
export const isAreaActive = (area: NavArea, activeTab: string, currentSearch = "") =>
  (area.tab === activeTab && searchMatches(area.search, currentSearch)) ||
  (area.children ?? []).some((c) => c.tab === activeTab);
