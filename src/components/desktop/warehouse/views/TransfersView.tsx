// DEPO — Transferler. Requested → Approved → Dispatched → Received is the target
// status model, but no transfer table is deployed yet, so nothing is fabricated.
import { ArrowLeftRight } from "lucide-react";
import { SectionCard } from "@/components/ui/responsive";
import type { Transfer } from "../warehouseConstants";
import type { WarehouseData } from "../useWarehouseData";
import { InsufficientData } from "../warehouseUi";
import { TRUTH_COPY } from "../inventoryTruth";

interface Props {
  data: WarehouseData;
  onOpen?: (t: Transfer) => void;
}

const STAGES = ["Talep Edildi", "Onaylandı", "Sevk Edildi", "Teslim Alındı"];

export const TransfersView = ({ data, onOpen }: Props) => {
  if (data.transfers.length === 0)
    return (
      <div className="space-y-3">
        <InsufficientData
          icon={ArrowLeftRight}
          title={TRUTH_COPY.noTransfers}
          hint="Depolar arası transfer, en az iki depo lokasyonu tanımlandıktan sonra başlatılabilir."
        />
        <SectionCard title="Transfer Akışı" subtitle="Transfer kaydı oluşturulduğunda izlenecek durumlar">
          <ol className="flex items-center gap-2 flex-wrap">
            {STAGES.map((s, i) => (
              <li key={s} className="flex items-center gap-2">
                <span className="px-2.5 h-8 inline-flex items-center rounded-pill ds-caption border border-border/70 bg-card text-muted-foreground">
                  {i + 1}. {s}
                </span>
                {i < STAGES.length - 1 && <span className="text-muted-foreground">→</span>}
              </li>
            ))}
          </ol>
        </SectionCard>
      </div>
    );

  return (
    <SectionCard title="Transferler">
      <div className="space-y-2">
        {data.transfers.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onOpen?.(t)}
            className="w-full text-left flex items-center justify-between gap-2 p-3 rounded-card border border-border/60 bg-background/40 hover:bg-muted/25 transition-colors"
            style={{ minHeight: 56 }}
          >
            <span className="ds-body text-foreground truncate">{t.material}</span>
            <span className="ds-caption text-muted-foreground shrink-0">{t.status}</span>
          </button>
        ))}
      </div>
    </SectionCard>
  );
};

export default TransfersView;
