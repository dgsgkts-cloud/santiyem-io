import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ChevronRight, Loader2, Minus } from "lucide-react";
import { formatCurrencyFull, formatCurrencyShort } from "@/lib/formatCurrency";
import { usePortfolioFinancials, type PortfolioProjectRow, type PortfolioRiskRow } from "@/hooks/usePortfolioFinancials";
import ProfitInfoLabel from "./ProfitInfoLabel";
import PortfolioInsightsCard from "./PortfolioInsightsCard";
import ProjectSetupWizard from "./setup/ProjectSetupWizard";
import { PROFIT_LABELS, PROFIT_TOOLTIPS, SEVERITY_META, riskTitle, severityOf, sortRisks } from "./profitLabels";

/**
 * Portföy Kârlılığı — şirket sahibinin karar ekranı.
 * Tüm rakamlar tek bir backend fonksiyonundan (portfolio_financials) gelir;
 * frontend hiçbir finansal hesap yapmaz, sadece sıralar ve gösterir.
 */

type StatusKey = "critical" | "attention" | "normal" | "above";

const STATUS_META: Record<StatusKey, { label: string; color: string; bg: string }> = {
  critical: { label: "Kritik", color: "#EF4444", bg: "rgba(239,68,68,0.10)" },
  attention: { label: "Dikkat Gerekiyor", color: "#F59E0B", bg: "rgba(245,158,11,0.10)" },
  normal: { label: "Normal", color: "#64748B", bg: "rgba(100,116,139,0.10)" },
  above: { label: "Hedefin Üzerinde", color: "#22C55E", bg: "rgba(34,197,94,0.10)" },
};

/** Deterministik durum etiketi — mevcut finans/risk verilerinden türetilir. */
const statusOf = (p: PortfolioProjectRow): StatusKey => {
  if (p.critical_risks > 0 || p.forecast_final_profit < 0) return "critical";
  if (p.profit_erosion > 0 || p.open_risks > 0) return "attention";
  if (p.profit_erosion < 0) return "above";
  return "normal";
};

const RANK: Record<StatusKey, number> = { critical: 0, attention: 1, normal: 2, above: 3 };

function DeltaText({ value }: { value: number }) {
  const flat = value === 0;
  const good = value < 0;
  const Icon = flat ? Minus : good ? ArrowUp : ArrowDown;
  const color = flat ? "#64748B" : good ? "#22C55E" : "#EF4444";
  return (
    <span className="inline-flex items-center gap-1 font-semibold" style={{ color }}>
      <Icon className="w-3.5 h-3.5 shrink-0" />
      {flat ? "Değişim yok" : formatCurrencyFull(Math.abs(value))}
    </span>
  );
}

export default function PortfolioProfitSection({
  onProjectSelect,
}: { onProjectSelect?: (projectId: string) => void }) {
  const { data, isLoading, error } = usePortfolioFinancials();
  const [filter, setFilter] = useState<"all" | "active" | "risky">("active");
  const [showAllProjects, setShowAllProjects] = useState(false);
  const [setupTarget, setSetupTarget] = useState<{ id: string; name: string } | null>(null);
  const openProject = (p: PortfolioProjectRow) =>
    p.is_ready ? onProjectSelect?.(p.id) : setSetupTarget({ id: p.id, name: p.name });
  const wizard = setupTarget ? (
    <ProjectSetupWizard
      open
      projectId={setupTarget.id}
      projectName={setupTarget.name}
      onClose={() => setSetupTarget(null)}
      onFinished={() => onProjectSelect?.(setupTarget.id)}
    />
  ) : null;

  const projects = data?.projects ?? [];
  const totals = data?.totals;

  const filtered = useMemo(() => {
    const base = projects.filter((p) => {
      if (filter === "active") return (p.status ?? "") !== "Tamamlandı";
      if (filter === "risky") return p.open_risks > 0 || p.profit_erosion > 0;
      return true;
    });
    return [...base].sort((a, b) => {
      const ra = RANK[statusOf(a)] - RANK[statusOf(b)];
      if (ra !== 0) return ra;
      if (b.risk_amount !== a.risk_amount) return b.risk_amount - a.risk_amount;
      if (b.profit_erosion !== a.profit_erosion) return b.profit_erosion - a.profit_erosion;
      return b.critical_risks - a.critical_risks;
    });
  }, [projects, filter]);

  const drains = useMemo(() => {
    const losing = projects
      .filter((p) => p.is_ready && p.profit_erosion > 0)
      .sort((a, b) => b.profit_erosion - a.profit_erosion);
    const top = losing.slice(0, 4);
    const restTotal = losing.slice(4).reduce((s, p) => s + p.profit_erosion, 0);
    const rows = top.map((p) => ({ id: p.id, name: p.name, value: p.profit_erosion }));
    if (restTotal > 0) rows.push({ id: "__other", name: "Diğer projeler", value: restTotal });
    const max = rows.length ? Math.max(...rows.map((r) => r.value)) : 0;
    return { rows, max };
  }, [projects]);

  const risks = useMemo(() => sortRisks(data?.risks ?? []).slice(0, 5), [data?.risks]);

  const projectNames = useMemo(() => {
    const map: Record<string, string> = {};
    projects.forEach((p) => { map[p.id] = p.name; });
    return map;
  }, [projects]);

  if (isLoading) {
    return (
      <section className="rounded-card border border-border/80 bg-card shadow-card p-5 flex items-center justify-center gap-2 text-[13px] text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" /> Portföy kârlılığı hazırlanıyor…
      </section>
    );
  }

  if (error || !totals) return null;

  // İlk giriş deneyimi — hiçbir proje analize hazır değil
  if (totals.ready_count === 0) {
    return (
      <>
      {wizard}
      <section className="rounded-card border border-border/80 bg-card shadow-card p-5 lg:p-6">
        <h2 className="text-[17px] font-semibold text-foreground">
          Projelerinizin kâr durumunu tek ekrandan takip edin.
        </h2>
        <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground max-w-[62ch]">
          İlk projenizin bütçesini ekleyerek başlayın. Giderleriniz mevcut Şantiyem kayıtlarından
          otomatik olarak kullanılacak.
        </p>
        <button
          type="button"
          onClick={() => projects[0] && setSetupTarget({ id: projects[0].id, name: projects[0].name })}
          className="mt-4 h-11 px-4 rounded-lg bg-primary text-primary-foreground text-[14px] font-medium hover:opacity-90 transition-opacity"
        >
          İlk Projeyi Hazırla
        </button>

        {projects.length > 0 && (
          <ul className="mt-4 divide-y divide-border/60 border-t border-border/60">
            {projects.slice(0, 5).map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => setSetupTarget({ id: p.id, name: p.name })}
                  className="w-full text-left py-3 flex items-center gap-3 transition-opacity hover:opacity-80"
                  style={{ minHeight: 56 }}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] font-medium text-foreground truncate">{p.name}</span>
                    <span className="block text-[12px] text-muted-foreground">
                      Kârlılık analizi henüz hazır değil —{" "}
                      <span className="text-primary font-medium">Projeyi Hazırla</span>
                    </span>
                  </span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
      </>
    );
  }


  const erosion = totals.profit_erosion;
  const activeReady = totals.ready_count;
  const statusSentence =
    erosion > 0
      ? `${activeReady} projenin mevcut gidişatına göre toplam final kârınız başlangıç tahmininin ${formatCurrencyFull(erosion)} altında.`
      : erosion < 0
        ? `${activeReady} projenin mevcut gidişatına göre toplam final kârınız başlangıç tahmininin ${formatCurrencyFull(Math.abs(erosion))} üzerinde.`
        : `${activeReady} proje şu anda başlangıç kâr hedefiyle uyumlu ilerliyor.`;

  const visibleProjects = showAllProjects ? filtered : filtered.slice(0, 6);

  return (
    <div className="flex flex-col gap-4 md:gap-5">
      {wizard}
      {/* 1 — Portföy durumu */}
      <section className="rounded-card border border-border/80 bg-card shadow-card p-5 lg:p-7">
        <p className="ds-caption uppercase tracking-wide text-muted-foreground mb-4 md:mb-5">
          Portföy Kârlılığı
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 md:gap-6">
          <div className="sm:col-span-2 min-w-0">
            <ProfitInfoLabel
              label="Tahmini Toplam Final Kâr"
              hint={PROFIT_TOOLTIPS.forecastProfit}
              className="text-[13px] text-muted-foreground"
            />
            <p
              className="mt-1 text-[30px] sm:text-[34px] lg:text-[44px] leading-[1.05] font-bold tracking-tight truncate"
              style={{ color: totals.forecast_final_profit < 0 ? "#EF4444" : undefined }}
            >
              {formatCurrencyFull(totals.forecast_final_profit)}
            </p>
          </div>

          <div className="min-w-0 space-y-4 sm:border-l sm:border-border/70 sm:pl-6">
            <div>
              <ProfitInfoLabel
                label="Başlangıçta Beklenen"
                hint={PROFIT_TOOLTIPS.originalProfit}
                className="text-[12px] text-muted-foreground"
              />
              <p className="text-[17px] font-semibold text-foreground truncate">
                {formatCurrencyFull(totals.original_expected_profit)}
              </p>
            </div>
            <div>
              <p className="text-[12px] text-muted-foreground">Başlangıca Göre</p>
              <p className="text-[17px] truncate"><DeltaText value={erosion} /></p>
            </div>
          </div>
        </div>

        <p className="mt-4 md:mt-5 text-[13px] leading-relaxed text-muted-foreground max-w-[70ch]">
          {statusSentence}
        </p>
        {totals.ready_count < totals.project_count && (
          <p className="mt-1.5 text-[12px] text-muted-foreground">
            Toplam {totals.project_count} projenin {totals.ready_count}'i kârlılık analizine dahil.
          </p>
        )}
      </section>

      {/* 2 — Özet kartlar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        {[
          { key: "count", label: "Aktif Proje", text: String(totals.ready_count) },
          { key: "revenue", label: "Toplam Tahmini Gelir", text: formatCurrencyFull(totals.forecast_revenue), hint: PROFIT_TOOLTIPS.revenue },
          { key: "spent", label: PROFIT_LABELS.spent, text: formatCurrencyFull(totals.actual_cost), hint: PROFIT_TOOLTIPS.spent },
          { key: "eac", label: PROFIT_LABELS.eac, text: formatCurrencyFull(totals.eac), hint: PROFIT_TOOLTIPS.eac },
        ].map((c) => (
          <div key={c.key} className="rounded-card border border-border/80 bg-card p-4 min-w-0">
            {c.hint ? (
              <ProfitInfoLabel label={c.label} hint={c.hint} className="text-[12px] text-muted-foreground" />
            ) : (
              <p className="text-[12px] text-muted-foreground">{c.label}</p>
            )}
            <p className="mt-1.5 text-[17px] lg:text-[19px] font-semibold text-foreground truncate">{c.text}</p>
          </div>
        ))}
      </div>

      {/* Şantiyem AI — Bugün (proaktif özet) */}
      <PortfolioInsightsCard projectNames={projectNames} onProjectSelect={onProjectSelect} />

      {/* 5 — Bugün dikkat gerektirenler (mobilde proje listesinden önce) */}
      <section className="rounded-card border border-border/80 bg-card shadow-card p-5">
        <h3 className="ds-title text-foreground mb-4">Bugün Dikkat Gerektirenler</h3>
        {risks.length === 0 ? (
          <p className="text-[13px] text-muted-foreground py-1">
            Şu anda dikkat gerektiren bir durum tespit edilmedi.
          </p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {risks.map((r) => (
              <PortfolioRiskCard key={r.id} risk={r} onOpen={() => onProjectSelect?.(r.project_id)} />
            ))}
          </div>
        )}
      </section>

      {/* 3 — Proje kârlılık listesi */}
      <section className="rounded-card border border-border/80 bg-card shadow-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h3 className="ds-title text-foreground">Projeleriniz</h3>
          <div className="flex items-center gap-1 rounded-lg border border-border/70 p-0.5">
            {([
              ["active", "Aktif"],
              ["all", "Tümü"],
              ["risky", "Riskli"],
            ] as const).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={`h-8 px-3 rounded-md text-[12px] font-medium transition-colors ${
                  filter === key ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <p className="text-[13px] text-muted-foreground py-1">Bu filtreye uygun proje yok.</p>
        ) : (
          <ul className="divide-y divide-border/60">
            {visibleProjects.map((p) => {
              const meta = STATUS_META[statusOf(p)];
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => openProject(p)}
                    className="w-full text-left py-3 flex items-center gap-3 transition-opacity hover:opacity-80 active:scale-[0.997]"
                    style={{ minHeight: 60 }}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2 min-w-0">
                        <span className="text-[14px] font-medium text-foreground truncate">{p.name}</span>
                        <span
                          className="shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                          style={{ color: meta.color, backgroundColor: meta.bg }}
                        >
                          {meta.label}
                        </span>
                      </span>
                      {p.is_ready ? (
                        <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12px] text-muted-foreground">
                          <span>
                            Tahmini Kâr:{" "}
                            <span className="font-semibold text-foreground">
                              {formatCurrencyShort(p.forecast_final_profit)}
                            </span>
                          </span>
                          <span className="inline-flex items-center gap-1">
                            Başlangıca Göre: <DeltaText value={p.profit_erosion} />
                          </span>
                          <span>{p.open_risks > 0 ? `${p.open_risks} açık risk` : "Risk yok"}</span>
                        </span>
                      ) : (
                        <span className="mt-1 block text-[12px] text-muted-foreground">
                          Kârlılık analizi henüz hazır değil — <span className="text-primary font-medium">Projeyi Hazırla</span>
                        </span>
                      )}
                    </span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {filtered.length > 6 && (
          <button
            type="button"
            onClick={() => setShowAllProjects((v) => !v)}
            className="mt-3 text-[13px] font-medium text-primary hover:underline"
          >
            {showAllProjects ? "Daha az göster" : `Tüm projeleri gör (${filtered.length})`}
          </button>
        )}
      </section>

      {/* 6 — Kâr kaybının kaynağı */}
      {drains.rows.length > 0 && (
        <section className="rounded-card border border-border/80 bg-card shadow-card p-5">
          <h3 className="ds-title text-foreground mb-4">Kâr Kaybının Kaynağı</h3>
          <ul className="space-y-3">
            {drains.rows.map((r) => (
              <li key={r.id}>
                <div className="flex items-center justify-between gap-3 mb-1">
                  <span className="text-[13px] text-foreground truncate">{r.name}</span>
                  <span className="text-[13px] font-semibold text-foreground shrink-0">
                    {formatCurrencyShort(r.value)}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${drains.max > 0 ? Math.max(6, (r.value / drains.max) * 100) : 0}%`,
                      backgroundColor: "#EF4444",
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function PortfolioRiskCard({ risk, onOpen }: { risk: PortfolioRiskRow; onOpen: () => void }) {
  const meta = SEVERITY_META[severityOf(risk.severity)];
  return (
    <div className="p-4 rounded-xl border border-border/70" style={{ backgroundColor: meta.bg }}>
      <div className="flex items-center justify-between gap-3 mb-1.5">
        <span
          className="text-[10px] font-semibold tracking-wide px-2 py-0.5 rounded-full"
          style={{ color: meta.color, backgroundColor: "hsl(var(--card))" }}
        >
          {meta.label}
        </span>
        {!!Number(risk.financial_impact) && (
          <span className="text-[13px] font-semibold" style={{ color: meta.color }}>
            {formatCurrencyFull(Number(risk.financial_impact))}
          </span>
        )}
      </div>
      {risk.project_name && (
        <p className="text-[12px] text-muted-foreground truncate">{risk.project_name}</p>
      )}
      <p className="text-[14px] font-medium text-foreground">{riskTitle(risk)}</p>
      {risk.description && (
        <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">{risk.description}</p>
      )}
      <button
        type="button"
        onClick={onOpen}
        className="mt-2 text-[12px] font-medium text-primary hover:underline"
      >
        Detayı Gör
      </button>
    </div>
  );
}
