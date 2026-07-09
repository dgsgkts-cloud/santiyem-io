// Sprint M1.4 — Procurement shared constants & helpers.
// No business logic changes; extracted from ProcurementPage.tsx.

export const CATS = [
  "Beton",
  "Demir",
  "Kereste",
  "Elektrik",
  "Mekanik",
  "Yalıtım",
  "Boya",
  "Seramik",
] as const;

export const PRIORITIES = ["Yüksek", "Orta", "Düşük"] as const;
export const STATUSES = [
  "Taslak",
  "Onay Bekliyor",
  "Onaylandı",
  "Sipariş Verildi",
  "İptal",
] as const;
export const DELIV_STAGES = [
  "Sipariş",
  "Hazırlanıyor",
  "Yolda",
  "Şantiyede",
  "Teslim Edildi",
] as const;

export const seed = (i: number) => ((i * 9301 + 49297) % 233280) / 233280;
export const fmtTRY = (n: number) =>
  `₺${Math.round(n).toLocaleString("tr-TR")}`;
export const daysFromNow = (d: number) => {
  const t = new Date();
  t.setDate(t.getDate() + d);
  return t.toLocaleDateString("tr-TR", { day: "2-digit", month: "short" });
};

export type Supplier = {
  id: string;
  name: string;
  category: string;
  score: number;
  delivery: number;
  quality: number;
  price: number;
  response: number;
  payment: number;
  orders: number;
  totalSpend: number;
};

export type Request = {
  id: string;
  no: string;
  project: string;
  projectId?: string;
  category: string;
  requester: string;
  priority: (typeof PRIORITIES)[number];
  budget: number;
  needBy: number;
  status: (typeof STATUSES)[number];
  approvalStage: number;
};

export type Order = {
  id: string;
  no: string;
  supplier: string;
  project: string;
  amount: number;
  eta: number;
  paid: boolean;
  delivery: (typeof DELIV_STAGES)[number];
  category: string;
};
