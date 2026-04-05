import { Contract } from "@/hooks/useContracts";

export const CONTRACT_TYPES: Record<string, string> = {
  goturu: "Götürü Bedel",
  birim_fiyat: "Birim Fiyat",
  karma: "Karma",
  yapim_isleri: "Yapım İşleri",
  hizmet: "Hizmet",
  danismanlik: "Danışmanlık",
  taseron: "Taşeron",
  diger: "Diğer",
};

export const cardStyleClass = "bg-card border border-border rounded-xl";
export const inputStyleClass = "bg-background border border-border text-foreground";
export const labelStyleClass = "text-muted-foreground";

export function getDaysRemaining(endDate: string | null): number | null {
  if (!endDate) return null;
  return Math.ceil((new Date(endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

export function getStatusInfo(endDate: string | null, status?: string): { label: string; color: string; bg: string; icon: string } {
  if (status === "tamamlandi") return { label: "Tamamlandı", color: "#22C55E", bg: "rgba(34,197,94,0.1)", icon: "✓" };
  const days = getDaysRemaining(endDate);
  if (days === null) return { label: "Süresiz", color: "#94A3B8", bg: "rgba(148,163,184,0.1)", icon: "—" };
  if (days < 0) return { label: "Süresi Doldu", color: "#EF4444", bg: "rgba(239,68,68,0.1)", icon: "🔴" };
  if (days <= 30) return { label: "Bitiş Yaklaşıyor", color: "#F59E0B", bg: "rgba(245,158,11,0.1)", icon: "⚠️" };
  return { label: "Aktif", color: "#22C55E", bg: "rgba(34,197,94,0.1)", icon: "✅" };
}

export function formatCurrency(v: number) {
  return v.toLocaleString("tr-TR", { style: "currency", currency: "TRY", minimumFractionDigits: 0 });
}

export function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("tr-TR");
}

export function getTimeProgress(startDate: string | null, endDate: string | null) {
  if (!startDate || !endDate) return { elapsed: 0, remaining: 0, total: 0, pct: 0 };
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  const now = Date.now();
  const total = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
  const elapsed = Math.max(0, Math.ceil((now - start) / (1000 * 60 * 60 * 24)));
  const remaining = Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)));
  const pct = total > 0 ? Math.min(100, (elapsed / total) * 100) : 0;
  return { elapsed, remaining, total, pct };
}

export interface CriticalClause {
  madde_no: string;
  konu: string;
  icerik: string;
  onem: "kritik" | "onemli" | "bilgi";
  tarih?: string;
}

export interface ForceMajeure {
  id: string;
  start_date: string;
  end_date: string;
  type: string;
  description: string;
  affected_days: number;
  status: "onaylandi" | "bekliyor" | "reddedildi";
}

