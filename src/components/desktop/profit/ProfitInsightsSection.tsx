import { useState } from "react";
import { ChevronRight, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { formatCurrencyFull } from "@/lib/formatCurrency";
import { relativeTime, useProfitInsights, type ProfitInsight } from "@/hooks/useProfitInsights";

/**
 * "Şantiyem AI Ne Görüyor?" — proaktif kâr/risk özeti.
 * Tüm tutarlar deterministik finans motorundan gelir; AI sadece sıralar ve açıklar.
 * AI hatası finans ekranını etkilemez; bu bölüm sade bir mesaj gösterir.
 */
export default function ProfitInsightsSection({
  projectId, onOpenCostCode,
}: { projectId: string; onOpenCostCode?: (costCodeId: string) => void }) {
  const { insights, isLoading, isRunning, failed, generatedAt, refresh } =
    useProfitInsights("project", projectId);
  const [detail, setDetail] = useState<ProfitInsight | null>(null);

  const headline =
    insights.length > 0
      ? `${insights.length} konu dikkatinizi gerektiriyor`
      : "Bugün kritik yeni bir değişiklik görünmüyor";

  return (
    <section className="rounded-card border border-border/80 bg-card shadow-card p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <span className="w-9 h-9 rounded-lg bg-primary/10 text-primary grid place-items-center shrink-0">
          <Sparkles className="w-4.5 h-4.5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[12px] uppercase tracking-wide text-muted-foreground">Şantiyem AI</p>
          <p className="text-[15px] font-semibold text-foreground leading-snug">
            {isLoading || isRunning ? "Veriler inceleniyor…" : headline}
          </p>
          {generatedAt && (
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Son analiz: {relativeTime(generatedAt)}
            </p>
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
        onOpenCostCode={onOpenCostCode}
      />
    </section>
  );
}

export function InsightDetailSheet({
  insight, onClose, onOpenCostCode, extra,
}: {
  insight: ProfitInsight | null;
  onClose: () => void;
  onOpenCostCode?: (costCodeId: string) => void;
  extra?: React.ReactNode;
}) {
  return (
    <Sheet open={!!insight} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="bottom"
        className="rounded-t-2xl max-h-[85vh] overflow-y-auto pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:max-w-lg sm:mx-auto"
      >
        <SheetHeader className="text-left">
          <SheetTitle className="text-[16px] leading-snug pr-6">{insight?.title}</SheetTitle>
        </SheetHeader>
        {insight && (
          <div className="mt-2 space-y-4">
            {insight.financial_impact !== null && (
              <div>
                <p className="text-[12px] text-muted-foreground">Tahmini etki</p>
                <p className="text-[22px] font-bold text-foreground">
                  {formatCurrencyFull(insight.financial_impact)}
                </p>
              </div>
            )}
            {insight.summary && (
              <p className="text-[13px] leading-relaxed text-muted-foreground">{insight.summary}</p>
            )}
            {insight.recommended_action && (
              <div className="rounded-lg border border-border/70 bg-background/40 p-3">
                <p className="text-[12px] text-muted-foreground">Öneri</p>
                <p className="mt-0.5 text-[13px] font-medium text-foreground">
                  {insight.recommended_action}
                </p>
              </div>
            )}
            {extra}
            {insight.cost_code_id && onOpenCostCode && (
              <button
                type="button"
                onClick={() => {
                  const id = insight.cost_code_id as string;
                  onClose();
                  onOpenCostCode(id);
                }}
                className="w-full h-11 rounded-lg bg-primary text-primary-foreground text-[14px] font-medium hover:opacity-90 transition-opacity"
              >
                İş Kalemi Detayını Aç
              </button>
            )}
            <p className="text-[11px] text-muted-foreground">
              {relativeTime(insight.generated_at)} üretildi. Tutarlar kayıtlı finans verilerinizden gelir.
            </p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
