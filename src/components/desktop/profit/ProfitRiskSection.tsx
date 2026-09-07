import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatCurrencyFull } from "@/lib/formatCurrency";
import { SEVERITY_META, riskTitle, severityOf, sortRisks } from "./profitLabels";

export interface RiskRow {
  id: string;
  risk_type?: string | null;
  severity?: string | null;
  title?: string | null;
  description?: string | null;
  financial_impact?: number | null;
  cost_code_id?: string | null;
}

function RiskCard({
  risk, costCodeName, onDetail,
}: { risk: RiskRow; costCodeName?: string; onDetail: () => void }) {
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
      <p className="text-[14px] font-medium text-foreground">
        {riskTitle({ ...risk, cost_code_name: costCodeName })}
      </p>
      {risk.description && (
        <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">{risk.description}</p>
      )}
      <div className="mt-2 flex items-center justify-between gap-3">
        {costCodeName ? (
          <span className="text-[11px] text-muted-foreground">İlgili kalem: {costCodeName}</span>
        ) : <span />}
        <button
          type="button"
          onClick={onDetail}
          className="text-[12px] font-medium text-primary hover:underline shrink-0"
        >
          Detayı Gör
        </button>
      </div>
    </div>
  );
}

export default function ProfitRiskSection({
  risks, costCodeNames,
}: { risks: RiskRow[]; costCodeNames: Record<string, string> }) {
  const [allOpen, setAllOpen] = useState(false);
  const [detail, setDetail] = useState<RiskRow | null>(null);
  const sorted = useMemo(() => sortRisks(risks), [risks]);
  const nameOf = (r: RiskRow) => (r.cost_code_id ? costCodeNames[r.cost_code_id] : undefined);

  return (
    <section className="rounded-card border border-border/80 bg-card shadow-card p-5">
      <h3 className="ds-title text-foreground mb-4">Dikkat Gerektirenler</h3>

      {sorted.length === 0 ? (
        <p className="text-[13px] text-muted-foreground py-2">
          Şu anda dikkat gerektiren bir durum tespit edilmedi.
        </p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {sorted.slice(0, 5).map((r) => (
            <RiskCard key={r.id} risk={r} costCodeName={nameOf(r)} onDetail={() => setDetail(r)} />
          ))}
        </div>
      )}

      {sorted.length > 5 && (
        <button
          type="button"
          onClick={() => setAllOpen(true)}
          className="mt-3 text-[13px] font-medium text-primary hover:underline"
        >
          Tüm riskleri gör ({sorted.length})
        </button>
      )}

      <Dialog open={allOpen} onOpenChange={setAllOpen}>
        <DialogContent className="max-w-[560px] max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Dikkat Gerektirenler</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {sorted.map((r) => (
              <RiskCard key={r.id} risk={r} costCodeName={nameOf(r)} onDetail={() => { setAllOpen(false); setDetail(r); }} />
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!detail} onOpenChange={(o) => { if (!o) setDetail(null); }}>
        <DialogContent className="max-w-[440px]">
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle className="text-[16px]">
                  {riskTitle({ ...detail, cost_code_name: nameOf(detail) })}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3 text-[13px]">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Önem seviyesi</span>
                  <span className="font-medium" style={{ color: SEVERITY_META[severityOf(detail.severity)].color }}>
                    {SEVERITY_META[severityOf(detail.severity)].label}
                  </span>
                </div>
                {!!Number(detail.financial_impact) && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Tahmini etki</span>
                    <span className="font-semibold text-foreground">
                      {formatCurrencyFull(Number(detail.financial_impact))}
                    </span>
                  </div>
                )}
                {nameOf(detail) && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">İlgili kalem</span>
                    <span className="font-medium text-foreground">{nameOf(detail)}</span>
                  </div>
                )}
                {detail.description && (
                  <p className="pt-2 leading-relaxed text-muted-foreground border-t border-border/70">
                    {detail.description}
                  </p>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
