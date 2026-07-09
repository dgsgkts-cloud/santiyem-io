// Sprint 30.0 — "Bugünün Operasyon Özeti"
// Premium KPI ribbon shown above the executive briefing so a CEO can
// answer "Bugün şirketimde neler oluyor?" in under 10 seconds.
//
// Frontend only. Reuses useExecutiveBrief; no new business logic.
import { Users, Building2, Wallet, CreditCard, FileCheck2, AlertTriangle, HardHat, Activity } from "lucide-react";
import { KpiCard } from "@/components/ui/responsive/KpiCard";
import { useExecutiveBrief } from "@/hooks/useExecutiveBrief";
import { formatCurrencyShort as fc } from "@/lib/formatCurrency";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  onTabChange: (tab: string) => void;
}

export function TodayOperationsRibbon({ onTabChange }: Props) {
  const { kpis, loading } = useExecutiveBrief();

  const tiles = [
    {
      label: "Aktif Personel",
      value: kpis.activeWorkersToday,
      hint: "Bugün sahada",
      icon: HardHat,
      accent: "#22c55e",
      onClick: () => onTabChange("attendance"),
    },
    {
      label: "Aktif Proje",
      value: kpis.activeProjects,
      hint: "Devam eden",
      icon: Building2,
      accent: "#3b82f6",
      onClick: () => onTabChange("projects"),
    },
    {
      label: "Bekleyen Tahsilat",
      value: kpis.expectedCollectionsAmount > 0 ? fc(kpis.expectedCollectionsAmount) : "—",
      hint: kpis.expectedCollectionsCount
        ? `${kpis.expectedCollectionsCount} hakediş bugün`
        : "Bugün beklenen yok",
      icon: Wallet,
      accent: "#10b981",
      onClick: () => onTabChange("hakedis"),
    },
    {
      label: "Bekleyen Ödeme",
      value: kpis.paymentsDueTodayAmount > 0 ? fc(kpis.paymentsDueTodayAmount) : "—",
      hint: kpis.paymentsDueTodayCount
        ? `${kpis.paymentsDueTodayCount} kalem bugün`
        : "Bugün planlı yok",
      icon: CreditCard,
      accent: "#f59e0b",
      onClick: () => onTabChange("payments-kasa"),
    },
    {
      label: "Bekleyen Hakediş",
      value: kpis.pendingHakedisCount,
      hint: "Onay / ödeme bekliyor",
      icon: FileCheck2,
      accent: "#8b5cf6",
      onClick: () => onTabChange("hakedis"),
    },
    {
      label: "Bugün Görev",
      value: kpis.tasksDueToday,
      hint: "Teslim tarihi bugün",
      icon: Activity,
      accent: "#06b6d4",
      onClick: () => onTabChange("tasks"),
    },
    {
      label: "Kritik Konular",
      value: kpis.criticalRisks,
      hint: kpis.criticalRisks > 0 ? "Aksiyon gerekiyor" : "Şantiye sakin",
      icon: kpis.criticalRisks > 0 ? AlertTriangle : Users,
      accent: kpis.criticalRisks > 0 ? "#ef4444" : "#64748b",
    },
  ];

  return (
    <section aria-label="Bugünün operasyon özeti" className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <h2 className="text-fs-lg font-semibold tracking-tight text-foreground">
            Bugünün Operasyon Özeti
          </h2>
          <p className="text-fs-xs text-muted-foreground">
            Şirketinizde bugün olup bitenlerin özet görünümü.
          </p>
        </div>
      </div>

      <div
        className="grid gap-3"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}
      >
        {tiles.map((t) =>
          loading ? (
            <Skeleton key={t.label} className="h-[96px] rounded-2xl" />
          ) : (
            <KpiCard
              key={t.label}
              label={t.label}
              value={t.value}
              hint={t.hint}
              icon={t.icon}
              accent={t.accent}
              onClick={t.onClick}
            />
          )
        )}
      </div>
    </section>
  );
}

export default TodayOperationsRibbon;
