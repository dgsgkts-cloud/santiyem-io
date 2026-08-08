// SPRINT 43 — Single source of truth for the primary navigation information
// architecture. Desktop sidebar and the mobile drawer both render this tree so
// the two surfaces can never drift.
//
// Only the areas below are exposed. Everything else (Hatırlatmalar, Makine &
// Ekipman, Zimmet, Onaylar, Malzeme Kartları, RFQ, Finans Raporları, Çekler)
// stays fully functional through its existing route, deep link or in-context
// entry point — no route, page, data, hook or permission is removed here.

import {
  LayoutDashboard, MessageSquare, FolderKanban, HardHat, Wallet,
  ShoppingCart, BookOpen, Warehouse, Truck, ClipboardList,
  Receipt, FileSpreadsheet, BarChart3, ArrowLeftRight, Building2,
  CheckSquare, Plug, type LucideIcon,
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
      // Görevler proje bağlamında yaşıyor: proje listesinden ilgili projenin
      // Görev Panosu'na girilir (çalışan tek entry point).
      { id: "ops-tasks", label: "Görevler / İşler", icon: CheckSquare, tab: "projects" },
      { id: "ops-field", label: "Saha", icon: BookOpen, tab: "site-diary" },
      { id: "ops-personnel", label: "Ekip & Puantaj", icon: HardHat, tab: "personnel" },
      { id: "ops-warehouse", label: "Depo & Envanter", icon: Warehouse, tab: "warehouse" },
    ],
  },
  {
    id: "procurement",
    label: "Satın Alma",
    icon: ShoppingCart,
    children: [
      { id: "pr-requests", label: "Talepler", icon: ClipboardList, tab: "procurement", search: { sekme: "talepler" } },
      { id: "pr-orders", label: "Siparişler", icon: ShoppingCart, tab: "procurement", search: { sekme: "siparisler" } },
      { id: "pr-deliveries", label: "Teslimatlar", icon: Truck, tab: "procurement", search: { sekme: "teslimatlar" } },
      { id: "pr-suppliers", label: "Tedarikçiler", icon: Building2, tab: "procurement", search: { sekme: "tedarikciler" } },
    ],
  },
  {
    id: "finance",
    label: "Finans",
    icon: Wallet,
    children: [
      { id: "fi-overview", label: "Genel Bakış", icon: BarChart3, tab: "payments-kasa", search: { sekme: "ozet" } },
      { id: "fi-transactions", label: "Ödeme & Tahsilat", icon: ArrowLeftRight, tab: "payments-kasa", search: { sekme: "hareketler" } },
      { id: "fi-hakedis", label: "Hakediş", icon: Receipt, tab: "hakedis" },
      { id: "fi-accounts", label: "Hesaplar", icon: Wallet, tab: "payments-kasa", search: { sekme: "hesaplar" } },
      { id: "fi-invoices", label: "Faturalar", icon: FileSpreadsheet, tab: "e-invoices" },
    ],
  },
  { id: "integrations", label: "Entegrasyonlar", icon: Plug, tab: "integrations" },
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
