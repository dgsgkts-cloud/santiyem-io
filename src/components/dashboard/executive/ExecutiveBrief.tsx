import { useState } from "react";
import { ChevronDown, ChevronRight, AlertTriangle, AlertCircle, Info, Activity, Wallet, TrendingUp, TrendingDown, Building2, Users, Package, ListChecks } from "lucide-react";
import { useExecutiveBrief, Finding, Severity } from "@/hooks/useExecutiveBrief";
import { HealthScoreCard } from "./HealthScoreCard";
import { KpiTile } from "./KpiTile";
import { InsightList } from "./InsightList";
import { formatCurrencyShort as fc } from "@/lib/formatCurrency";

interface ExecutiveBriefProps {
  onTabChange: (tab: string) => void;
  onProjectSelect?: (projectId: string) => void;
}

const sevIcon: Record<Severity, typeof AlertTriangle> = {
  critical: AlertTriangle,
  important: AlertCircle,
  info: Info,
};
const sevTone: Record<Severity, string> = {
  critical: "text-destructive",
  important: "text-amber-500",
  info: "text-muted-foreground",
};
const sevDot: Record<Severity, string> = {
  critical: "bg-destructive",
  important: "bg-amber-500",
  info: "bg-muted-foreground/60",
};
const sevLabel: Record<Severity, string> = {
  critical: "Kritik",
  important: "Önemli",
  info: "Bilgi",
};

export function ExecutiveBrief({ onTabChange, onProjectSelect }: ExecutiveBriefProps) {
  const { loading, findings, insights, kpis } = useExecutiveBrief();
  const [expanded, setExpanded] = useState(false);

  const criticalCount = findings.filter((f) => f.severity === "critical").length;
  const importantCount = findings.filter((f) => f.severity === "important").length;
  const infoCount = findings.filter((f) => f.severity === "info").length;

  const topThree = findings.slice(0, 3);

  const handleAction = (f: Finding) => {
    if (!f.action) return;
    if (f.action.projectId && onProjectSelect) {
      onProjectSelect(f.action.projectId);
    } else {
      onTabChange(f.action.tab);
    }
  };

  return (
    <section className="space-y-4">
      {/* Executive Brief card */}
      <div className="rounded-2xl border border-border/70 bg-card overflow-hidden">
        <button
          onClick={() => setExpanded((v) => !v)}
          className="w-full flex items-start justify-between gap-4 p-4 sm:p-5 text-left hover:bg-muted/30 transition-colors"
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-3.5 h-3.5 text-primary" />
              <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Bugünün Yönetici Brifingi
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              {criticalCount > 0 && (
                <SeverityChip severity="critical" count={criticalCount} />
              )}
              {importantCount > 0 && (
                <SeverityChip severity="important" count={importantCount} />
              )}
              {infoCount > 0 && (
                <SeverityChip severity="info" count={infoCount} />
              )}
              {!loading && findings.length === 0 && (
                <span className="text-[12.5px] text-emerald-500">Aktif uyarı yok</span>
              )}
              {loading && (
                <span className="text-[12.5px] text-muted-foreground">Analiz ediliyor…</span>
              )}
            </div>
            {topThree.length > 0 && (
              <ul className="space-y-1.5">
                {topThree.map((f) => {
                  const Icon = sevIcon[f.severity];
                  return (
                    <li key={f.id} className="flex items-start gap-2 text-[13px] text-foreground/90">
                      <Icon className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${sevTone[f.severity]}`} />
                      <span>{f.title}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          <div className="flex items-center gap-1 text-muted-foreground text-[12.5px] shrink-0 mt-1">
            {expanded ? "Kapat" : "Detayları Gör"}
            {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </div>
        </button>

        {expanded && (
          <div className="border-t border-border/60 p-4 sm:p-5 space-y-5 bg-background/30">
            {(["critical", "important", "info"] as Severity[]).map((sev) => {
              const list = findings.filter((f) => f.severity === sev);
              if (!list.length) return null;
              return (
                <div key={sev}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`w-1.5 h-1.5 rounded-full ${sevDot[sev]}`} />
                    <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      {sevLabel[sev]}
                    </span>
                  </div>
                  <ul className="space-y-1.5">
                    {list.map((f) => (
                      <li
                        key={f.id}
                        className="flex items-start justify-between gap-3 rounded-xl border border-border/50 bg-card px-3 py-2.5"
                      >
                        <div className="min-w-0">
                          <div className="text-[13.5px] text-foreground">{f.title}</div>
                          {f.detail && (
                            <div className="text-[12px] text-muted-foreground mt-0.5">{f.detail}</div>
                          )}
                        </div>
                        {f.action && (
                          <button
                            onClick={() => handleAction(f)}
                            className="text-[12px] text-primary hover:underline shrink-0"
                          >
                            {f.action.label || "Aç"}
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
            {findings.length === 0 && !loading && (
              <div className="text-[13px] text-muted-foreground text-center py-6">
                Şu an için gösterilecek uyarı yok.
              </div>
            )}
          </div>
        )}
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
        <HealthScoreCard score={kpis.healthScore} />
        <KpiTile
          icon={AlertTriangle}
          label="Kritik Risk"
          value={kpis.criticalRisks}
          severity={kpis.criticalRisks > 0 ? "critical" : "good"}
          onClick={() => setExpanded(true)}
        />
        <KpiTile
          icon={Wallet}
          label="Bekleyen Ödeme"
          value={kpis.pendingPayments}
          severity={kpis.pendingPayments > 0 ? "important" : "neutral"}
          onClick={() => onTabChange("payments-kasa")}
        />
        <KpiTile
          icon={ListChecks}
          label="Bugün Görev"
          value={kpis.tasksDueToday}
          severity={kpis.tasksDueToday > 0 ? "important" : "neutral"}
          onClick={() => onTabChange("tasks")}
        />
        <KpiTile
          icon={Package}
          label="Kritik Stok"
          value={kpis.criticalStockItems}
          severity={kpis.criticalStockItems > 0 ? "important" : "neutral"}
          onClick={() => onTabChange("materials")}
        />
        <KpiTile
          icon={Building2}
          label="Aktif Proje"
          value={kpis.activeProjects}
          severity="neutral"
          onClick={() => onTabChange("projects")}
        />
        <KpiTile
          icon={Users}
          label="Bugün Saha"
          value={kpis.activeWorkersToday}
          severity="neutral"
        />
        <KpiTile
          icon={TrendingUp}
          label="Aylık Ciro"
          value={fc(kpis.monthRevenue)}
          severity="good"
        />
        <KpiTile
          icon={TrendingDown}
          label="Aylık Gider"
          value={fc(kpis.monthExpenses)}
          severity={kpis.laborDeltaPct != null && kpis.laborDeltaPct >= 10 ? "important" : "neutral"}
          delta={kpis.laborDeltaPct != null ? `${kpis.laborDeltaPct >= 0 ? "+" : ""}${kpis.laborDeltaPct.toFixed(0)}% aylık` : undefined}
        />
        <KpiTile
          icon={Wallet}
          label="Kasa"
          value={fc(kpis.cashOnHand)}
          severity="neutral"
          onClick={() => onTabChange("payments-kasa")}
        />
      </div>

      <InsightList insights={insights} />
    </section>
  );
}

function SeverityChip({ severity, count }: { severity: Severity; count: number }) {
  const cls =
    severity === "critical"
      ? "bg-destructive/10 text-destructive border-destructive/30"
      : severity === "important"
      ? "bg-amber-500/10 text-amber-500 border-amber-500/30"
      : "bg-muted text-muted-foreground border-border";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11.5px] ${cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${sevDot[severity]}`} />
      {count} {sevLabel[severity]}
    </span>
  );
}
