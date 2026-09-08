import { useState } from "react";
import { ChevronRight, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { formatCurrencyFull } from "@/lib/formatCurrency";
import { relativeTime, useProfitInsights, type ProfitInsight } from "@/hooks/useProfitInsights";
import { InsightDetailSheet } from "./ProfitInsightsSection";

/**
 * "Şantiyem AI — Bugün": portföy seviyesinde en fazla 5 madde.
 * Rakamlar deterministik finans motorundan; AI yalnızca önceliklendirir.
 */
export default function PortfolioInsightsCard({
  projectNames, onProjectSelect,
}: {
  projectNames: Record<string, string>;
  onProjectSelect?: (projectId: string) => void;
}) {
  const { insights, isLoading, isRunning, failed, generatedAt, refresh } =
    useProfitInsights("portfolio");
  const [detail, setDetail] = useState<ProfitInsight | null>(null);

  const nothing = !isLoading && !isRunning && insights.length === 0;

  return (
    <section className="rounded-card border border-border/80 bg-card shadow-card p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <span className="w-9 h-9 rounded-lg bg-primary/10 text-primary grid place-items-center shrink-0">
          <Sparkles className="w-4.5 h-4.5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[12px] uppercase tracking-wide text-muted-foreground">Şantiyem AI — Bugün</p>
          <p className="text-[15px] font-semibold text-foreground leading-snug">
            {isLoading || isRunning
              ? "Projeleriniz inceleniyor…"
              : nothing
                ? "Bugün kritik yeni bir değişiklik görünmüyor"
                : `${insights.length} konu dikkatinizi gerektiriyor`}
          </p>
          {generatedAt && (
            <p className="mt-0.5 text-[11px] text-muted-foreground">Son analiz: {relativeTime(generatedAt)}</p>
          )}
        </div>
        <button
          type="button"
          onClick={refresh}
          disabled={isRunning}
          aria-label="Analizi yenile"
          className="w-11 h-11 -mr-2 -mt-2 grid place-items-center rounded-lg text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
        >
          {isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
        </button>
      </div>

      {failed && insights.length === 0 && !isRunning && (
        <p className="mt-3 text-[12px] text-muted-foreground">AI analizi şu anda güncellenemedi.</p>
      )}

      {insights.length > 0 && (
        <ul className="mt-3 flex flex-col gap-2">
          {insights.map((i) => (
            <li key={i.id}>
              <button
                type="button"
                onClick={() => setDetail(i)}
                className="w-full text-left rounded-lg border border-border/70 bg-background/40 px-3 py-3 flex items-center gap-3 transition-colors hover:bg-accent/40"
                style={{ minHeight: 60 }}
              >
                <span className="min-w-0 flex-1">
                  {i.project_id && projectNames[i.project_id] && (
                    <span className="block text-[11px] text-muted-foreground truncate">
                      {projectNames[i.project_id]}
                    </span>
                  )}
                  <span className="block text-[14px] font-medium text-foreground truncate">{i.title}</span>
                  {i.financial_impact !== null && (
                    <span className="block text-[12px] text-muted-foreground">
                      Tahmini etki: {formatCurrencyFull(i.financial_impact)}
                    </span>
                  )}
                </span>
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <InsightDetailSheet
        insight={detail}
        onClose={() => setDetail(null)}
        extra={
          detail?.project_id && onProjectSelect ? (
            <button
              type="button"
              onClick={() => {
                const id = detail.project_id as string;
                setDetail(null);
                onProjectSelect(id);
              }}
              className="w-full h-11 rounded-lg bg-primary text-primary-foreground text-[14px] font-medium hover:opacity-90 transition-opacity"
            >
              Projeye Git
            </button>
          ) : null
        }
      />
    </section>
  );
}
