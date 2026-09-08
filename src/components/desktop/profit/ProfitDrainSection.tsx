import { useMemo, useState } from "react";
import { ChevronRight, Tags } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatCurrencyFull } from "@/lib/formatCurrency";
import type { CostCodeFinancials } from "@/lib/finance/profitEngine";
import CostItemDetailSheet from "./CostItemDetailSheet";

/** Bütçesinin üzerine çıkan kalemleri finansal etkisine göre listeler. */
const overrun = (c: CostCodeFinancials) => Math.max(0, c.budget_variance);

function Row({ item, onOpen }: { item: CostCodeFinancials; onOpen: () => void }) {
  const diff = overrun(item);
  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full flex items-center justify-between gap-3 px-3 py-3 rounded-lg hover:bg-muted/50 transition-colors text-left"
    >
      <div className="min-w-0">
        <p className="text-[14px] font-medium text-foreground truncate">{item.name || item.code}</p>
        <p className="text-[11px] text-muted-foreground">
          {diff > 0 ? "Bütçenin üzerinde" : "Bütçesi dahilinde"}
          {item.has_progress ? ` · İlerleme %${Math.round(item.progress_percent)}` : ""}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span
          className="text-[15px] font-semibold"
          style={{ color: diff > 0 ? "#EF4444" : "#22C55E" }}
        >
          {diff > 0 ? `+${formatCurrencyFull(diff)}` : formatCurrencyFull(item.budget_variance)}
        </span>
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
      </div>
    </button>
  );
}

export default function ProfitDrainSection({ items }: { items: CostCodeFinancials[] }) {
  const [selected, setSelected] = useState<CostCodeFinancials | null>(null);
  const [allOpen, setAllOpen] = useState(false);

  const coded = useMemo(() => items.filter((c) => !c.is_uncoded), [items]);
  const uncoded = useMemo(() => items.find((c) => c.is_uncoded && c.actual_cost !== 0) ?? null, [items]);

  const ranked = useMemo(
    () => [...coded].sort((a, b) => overrun(b) - overrun(a) || b.eac - a.eac),
    [coded],
  );
  const top = ranked.slice(0, 5);

  return (
    <section className="rounded-card border border-border/80 bg-card shadow-card p-5">
      <h3 className="ds-title text-foreground mb-1">Kârı Ne Eritiyor?</h3>
      <p className="ds-caption text-muted-foreground mb-4">
        Bütçesine göre en fazla sapan iş kalemleri
      </p>

      {top.length === 0 ? (
        <p className="text-[13px] text-muted-foreground py-4">
          Henüz karşılaştırılabilir iş kalemi verisi bulunmuyor.
        </p>
      ) : (
        <div className="space-y-1">
          {top.map((c) => (
            <Row key={c.cost_code_id} item={c} onOpen={() => setSelected(c)} />
          ))}
        </div>
      )}

      {ranked.length > 5 && (
        <button
          type="button"
          onClick={() => setAllOpen(true)}
          className="mt-3 text-[13px] font-medium text-primary hover:underline"
        >
          Tüm maliyet kalemlerini gör ({ranked.length})
        </button>
      )}

      {uncoded && (
        <div className="mt-5 p-4 rounded-xl bg-muted/50 border border-border/70">
          <div className="flex items-start gap-3">
            <Tags className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[14px] font-medium text-foreground">
                  Kategorisi Belirlenmemiş Maliyetler
                </p>
                <span className="text-[15px] font-semibold text-foreground shrink-0">
                  {formatCurrencyFull(uncoded.actual_cost)}
                </span>
              </div>
              <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
                Bu giderleri bir iş kalemine bağlarsanız maliyet analiziniz daha detaylı hale gelir.
              </p>
              <button
                type="button"
                onClick={() => setSelected(uncoded)}
                className="mt-2 text-[13px] font-medium text-primary hover:underline"
              >
                Detayı Gör
              </button>
            </div>
          </div>
        </div>
      )}

      <Dialog open={allOpen} onOpenChange={setAllOpen}>
        <DialogContent className="max-w-[520px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Tüm Maliyet Kalemleri</DialogTitle>
          </DialogHeader>
          <div className="space-y-1">
            {ranked.map((c) => (
              <Row
                key={c.cost_code_id}
                item={c}
                onOpen={() => { setAllOpen(false); setSelected(c); }}
              />
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <CostItemDetailSheet item={selected} onClose={() => setSelected(null)} />
    </section>
  );
}
