// SPRINT 42 — Single source of truth for the primary navigation information
// architecture. Desktop sidebar and the mobile drawer both render this tree so
// the two surfaces can never drift.
//
// Only six top-level areas are exposed. Everything else stays reachable through
// its existing route, deep link, or in-context entry point — no route, page,
// data or feature is removed here.

import {
  LayoutDashboard, MessageSquare, FolderKanban, HardHat, Wallet,
  ShoppingCart, BookOpen, CalendarClock, Warehouse, Truck, Users,
  ClipboardList, CheckCircle2, Package, Send, Receipt, FileSpreadsheet,
  BarChart3, ArrowUpRight, ArrowDownLeft, Building2, type LucideIcon,
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
  children?: NavLeaf[];
  accent?: boolean;
}

export const NAV_AREAS: NavArea[] = [
  { id: "dashboard", label: "Ana Sayfa", icon: LayoutDashboard, tab: "dashboard" },
  { id: "chat", label: "AI Asistan", icon: MessageSquare, tab: "chat", accent: true },
  { id: "projects", label: "Projeler", icon: FolderKanban, tab: "projects" },
  {
    id: "operations",
    label: "Operasyon",
    icon: HardHat,
    children: [
      { id: "ops-diary", label: "Şantiye Günlükleri", icon: BookOpen, tab: "site-diary" },
      { id: "ops-reminders", label: "Takvim & Hatırlatmalar", icon: CalendarClock, tab: "reminders" },
      { id: "ops-personnel", label: "Ekip & Puantaj", icon: HardHat, tab: "personnel" },
      { id: "ops-warehouse", label: "Depo & Envanter", icon: Warehouse, tab: "warehouse" },
      { id: "ops-fleet", label: "Makine, Ekipman & Zimmet", icon: Truck, tab: "fleet" },
      { id: "ops-meetings", label: "Toplantılar", icon: Users, tab: "meetings" },
    ],
  },
  {
    id: "procurement",
    label: "Satın Alma",
    icon: ShoppingCart,
    children: [
      { id: "pr-requests", label: "Talepler", icon: ClipboardList, tab: "procurement", search: { sekme: "talepler" } },
      { id: "pr-approvals", label: "Onaylar", icon: CheckCircle2, tab: "procurement", search: { sekme: "talepler", durum: "Onay Bekliyor" } },
      { id: "pr-orders", label: "Siparişler", icon: ShoppingCart, tab: "procurement", search: { sekme: "siparisler" } },
      { id: "pr-deliveries", label: "Teslimatlar", icon: Truck, tab: "procurement", search: { sekme: "teslimatlar" } },
      { id: "pr-suppliers", label: "Tedarikçiler & Taşeronlar", icon: Building2, tab: "procurement", search: { sekme: "tedarikciler" } },
      { id: "pr-rfq", label: "Teklifler (RFQ)", icon: Send, tab: "procurement", search: { sekme: "teklifler" } },
      { id: "pr-materials", label: "Malzeme Kartları", icon: Package, tab: "materials" },
    ],
  },
  {
    id: "finance",
    label: "Finans",
    icon: Wallet,
    children: [
      { id: "fi-overview", label: "Genel Bakış", icon: BarChart3, tab: "payments-kasa", search: { sekme: "ozet" } },
      { id: "fi-payments", label: "Ödemeler", icon: ArrowUpRight, tab: "payments-kasa", search: { sekme: "hareketler", tur: "expense" } },
      { id: "fi-collections", label: "Tahsilatlar", icon: ArrowDownLeft, tab: "payments-kasa", search: { sekme: "hareketler", tur: "income" } },
      { id: "fi-accounts", label: "Hesaplar", icon: Wallet, tab: "payments-kasa", search: { sekme: "hesaplar" } },
      { id: "fi-hakedis", label: "Hakedişler", icon: Receipt, tab: "hakedis" },
      { id: "fi-invoices", label: "Faturalar & Çekler", icon: FileSpreadsheet, tab: "e-invoices" },
      { id: "fi-reports", label: "Raporlar", icon: BarChart3, tab: "payments-kasa", search: { sekme: "raporlar" } },
    ],
  },
];

/** All tabs referenced by the visible menu. */
export const NAV_MENU_TABS = new Set<string>(
  NAV_AREAS.flatMap((a) => [a.tab, ...(a.children ?? []).map((c) => c.tab)].filter(Boolean) as string[]),
);

export const searchToQuery = (search?: NavSearch) =>
  search && Object.keys(search).length ? `?${new URLSearchParams(search).toString()}` : "";

/** A leaf is active when its tab matches and every declared param matches. */
export const isLeafActive = (leaf: NavLeaf, activeTab: string, currentSearch: string) => {
  if (leaf.tab !== activeTab) return false;
  if (!leaf.search) return true;
  const params = new URLSearchParams(currentSearch);
  return Object.entries(leaf.search).every(([k, v]) => params.get(k) === v);
};

/** An area is active when it (or any child) points at the active tab. */
export const isAreaActive = (area: NavArea, activeTab: string) =>
  area.tab === activeTab || (area.children ?? []).some((c) => c.tab === activeTab);
