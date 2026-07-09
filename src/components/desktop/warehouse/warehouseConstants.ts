// Sprint M1.5 — Warehouse & Inventory constants, formatters, types.
// Frontend-only. No backend, schema, or business logic changes.

export const seed = (i: number) => ((i * 9301 + 49297) % 233280) / 233280;
export const fmtTRY = (n: number) => `₺${Math.round(n).toLocaleString("tr-TR")}`;
export const fmtNum = (n: number) => n.toLocaleString("tr-TR");
export const daysFromNow = (d: number) => {
  const t = new Date();
  t.setDate(t.getDate() + d);
  return t.toLocaleDateString("tr-TR", { day: "2-digit", month: "short" });
};

export const CATEGORIES = ["Beton", "Demir", "Kereste", "Elektrik", "Mekanik", "Yalıtım", "Boya", "Seramik"];
export const UNITS = ["ton", "adet", "m³", "m²", "kg", "paket"];
export const MATERIALS = [
  "C30 Hazır Beton", "Ø12 Nervürlü Demir", "Ø16 Nervürlü Demir", "OSB Panel",
  "XPS Yalıtım Levhası", "Alçıpan 12.5mm", "PVC Boru Ø110", "Kablo NYY 3x2.5",
  "Filli Su Bazlı Boya", "Ege Duvar Seramiği", "Çimento Torbası", "Tuğla 19x19",
  "Kalıp Kerestesi", "Yapı Çeliği Örgü", "İzolasyon Membranı", "Silikon Kartuş",
];

export type StockState = "healthy" | "low" | "critical" | "out";
export const STATE_META: Record<StockState, { label: string; color: string; dot: string }> = {
  healthy: { label: "Sağlıklı", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", dot: "bg-emerald-400" },
  low: { label: "Düşük", color: "bg-amber-500/10 text-amber-400 border-amber-500/20", dot: "bg-amber-400" },
  critical: { label: "Kritik", color: "bg-red-500/10 text-red-400 border-red-500/20", dot: "bg-red-400" },
  out: { label: "Stok Yok", color: "bg-muted text-muted-foreground border-border", dot: "bg-muted-foreground" },
};

export type Warehouse_ = {
  id: string; name: string; type: string; manager: string; location: string;
  capacity: number; occupied: number; items: number; value: number;
};
export type Stock = {
  id: string; name: string; category: string; unit: string; warehouse: string;
  current: number; reserved: number; min: number; avgCost: number; supplier: string;
  lastPurchase: number; state: StockState;
};
export type Movement = {
  id: string; kind: "in" | "out" | "transfer" | "adjust" | "consume" | "return";
  material: string; qty: number; unit: string; warehouse: string; project: string;
  actor: string; whenDays: number; reason: string;
};
export type Transfer = {
  id: string; from: string; to: string; material: string; qty: number; unit: string;
  status: "requested" | "approved" | "transit" | "done";
};
export type Assignment = {
  id: string; item: string; employee: string; project: string; department: string;
  assignedDays: number; returnDays: number; returned: boolean;
};
export type Count = {
  id: string; material: string; expected: number; counted: number; unit: string;
  warehouse: string;
};

export type SubTab =
  | "overview" | "stocks" | "warehouses" | "movements"
  | "transfers" | "assignments" | "counts" | "analytics";
