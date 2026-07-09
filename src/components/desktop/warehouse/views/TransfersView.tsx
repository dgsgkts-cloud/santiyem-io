// Sprint M1.5 — Transfers: pipeline card list with adaptive stages.
import { ArrowLeftRight, CheckCircle2 } from "lucide-react";
import { SectionCard } from "@/components/ui/responsive";
import { fmtNum, type Transfer } from "../warehouseConstants";
import type { WarehouseData } from "../useWarehouseData";

interface Props {
  data: WarehouseData;
  onOpen?: (t: Transfer) => void;
}

const STAGES = [
  { id: "requested", label: "Talep" },
  { id: "approved", label: "Onaylı" },
  { id: "transit", label: "Yolda" },
  { id: "done", label: "Tamamlandı" },
] as const;

export const TransfersView = ({ data, onOpen }: Props) => (
  <div className="space-y-3">
    {data.transfers.map(t => {
      const stageIdx = STAGES.findIndex(s => s.id === t.status);
      return (
        <SectionCard key={t.id}>
          <button
            type="button"
            onClick={onOpen ? () => onOpen(t) : undefined}
            className="w-full text-left min-h-[44px]"
          >
            <div className="flex items-start sm:items-center justify-between mb-3 gap-3 flex-col sm:flex-row">
              <div className="flex items-center gap-2 min-w-0">
                <ArrowLeftRight className="w-4 h-4 text-blue-400 shrink-0" />
                <div className="min-w-0">
                  <div className="text-foreground text-fs-sm font-semibold truncate">{t.material}</div>
                  <div className="text-fs-xs text-muted-foreground truncate">
                    {fmtNum(t.qty)} {t.unit} · {t.from} → {t.to}
                  </div>
                </div>
              </div>
              <span className="text-fs-xs px-2 py-0.5 rounded-full border bg-blue-500/10 text-blue-400 border-blue-500/20 shrink-0">
                {STAGES[stageIdx].label}
              </span>
            </div>
            <div className="flex items-center gap-1">
              {STAGES.map((s, i) => (
                <div key={s.id} className="flex-1 flex items-center gap-1 min-w-0">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center border shrink-0 ${
                    i < stageIdx ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                      : i === stageIdx ? "bg-[#FF6B2B]/20 border-[#FF6B2B]/40 text-[#FF6B2B] animate-pulse"
                                       : "bg-muted border-border text-muted-foreground"
                  }`}>
                    {i < stageIdx ? <CheckCircle2 className="w-3 h-3" /> : <span className="text-fs-xs">{i + 1}</span>}
                  </div>
                  {i < STAGES.length - 1 && (
                    <div className={`flex-1 h-px ${i < stageIdx ? "bg-emerald-500/40" : "bg-border"}`} />
                  )}
                </div>
              ))}
            </div>
          </button>
        </SectionCard>
      );
    })}
  </div>
);

export default TransfersView;
