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

    name: "Akdeniz Residence İnşaat Sözleşmesi",
    counterparty: "ABC Yapı A.Ş.", amount: 4500000,
    start_date: "2024-03-01", end_date: "2025-12-01",
    contract_type: "goturu", notes: "", status: "aktif",
    ai_analysis: {
      ozet: "Akdeniz Residence yapım işleri sözleşmesi — götürü bedel",
      kritik_maddeler: [
        { madde_no: "12", konu: "Ödeme Süresi", icerik: "Hakediş ödemesi 30 gün içinde yapılacaktır", onem: "bilgi" },
        { madde_no: "18", konu: "Gecikme Cezası", icerik: "Günlük ₺5.000 gecikme cezası uygulanacaktır", onem: "kritik" },
        { madde_no: "24", konu: "Fesih Bildirimi", icerik: "15 gün önceden yazılı bildirim gereklidir", onem: "onemli" },
        { madde_no: "7", konu: "Avans", icerik: "%20 avans ödenecektir", onem: "bilgi" },
      ],
      riskli_maddeler: [
        { madde: "Madde 18", aciklama: "Günlük ₺5.000 gecikme cezası yüksek" },
      ],
      gecikme_cezasi: { gunluk: 5000, limit_yuzde: 10 },
      odeme_takvimi: [
        { hakedis_no: 1, tarih: "2024-06-01", tutar: 900000, not: "1. Hakediş" },
        { hakedis_no: 2, tarih: "2024-09-01", tutar: 900000, not: "2. Hakediş" },
        { hakedis_no: 3, tarih: "2025-01-01", tutar: 900000, not: "3. Hakediş" },
        { hakedis_no: 4, tarih: "2025-06-01", tutar: 900000, not: "4. Hakediş" },
        { hakedis_no: 5, tarih: "2025-12-01", tutar: 900000, not: "Son Hakediş" },
      ],
    },
    payment_schedule: [], file_url: null, file_name: null,
    created_at: "2024-03-01T00:00:00Z", updated_at: "2024-03-01T00:00:00Z",
  },
  {
    id: "mock-2", user_id: "", project_id: null,
    name: "Villa Projesi — Çeşme",
    counterparty: "Mehmet Bey", amount: 1200000,
    start_date: "2024-06-15", end_date: "2025-06-15",
    contract_type: "birim_fiyat", notes: "", status: "aktif",
    ai_analysis: null, payment_schedule: [], file_url: null, file_name: null,
    created_at: "2024-06-15T00:00:00Z", updated_at: "2024-06-15T00:00:00Z",
  },
];
