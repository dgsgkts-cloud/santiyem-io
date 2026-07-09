// Sprint M1.4 — RFQ: offers table via ResponsiveTable (cards on mobile).
import { useMemo } from "react";
import { Award, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ResponsiveTable,
  SectionCard,
  type ResponsiveColumn,
} from "@/components/ui/responsive";
import { daysFromNow, fmtTRY, seed, type Request, type Supplier } from "./procurementConstants";
import type { ProcurementData } from "./useProcurementDemoData";
import { ScoreRing } from "./procurementUi";

interface Offer {
  supplier: Supplier;
  price: number;
  delivery: number;
  payment: string;
  warranty: string;
  isBest: boolean;
}

interface Props {
  data: ProcurementData;
  activeRequest: Request | null;
  onSelect: (o: Offer) => void;
}

export const ProcurementRFQView = ({ data, activeRequest, onSelect }: Props) => {
  const req = activeRequest || data.requests[1];

  const offers = useMemo<Offer[]>(() => {
    const base = data.suppliers.slice(0, 5).map((s, i) => ({
      supplier: s,
      price: Math.round((req.budget * (0.85 + seed(i + 30) * 0.35)) / 500) * 500,
      delivery: 3 + Math.round(seed(i + 31) * 12),
      payment: ["Peşin", "30 gün", "60 gün", "45 gün", "Vadeli"][i],
      warranty: `${12 + i * 6} ay`,
      isBest: false,
    }));
    const bestId = base.reduce(
      (a, b) => (b.price < a.price && b.supplier.score > 75 ? b : a),
      base[0]
    ).supplier.id;
    return base.map((o) => ({ ...o, isBest: o.supplier.id === bestId }));
  }, [data, req]);

  const columns: ResponsiveColumn<Offer>[] = [
    {
      key: "supplier",
      header: "Tedarikçi",
      primary: true,
      cell: (o) => (
        <span className="flex items-center gap-2 text-foreground font-medium">
          {o.isBest && <Award className="w-3.5 h-3.5 text-emerald-400" />}
          {o.supplier.name}
        </span>
      ),
    },
    {
      key: "price",
      header: "Fiyat",
      align: "right",
      cell: (o) => (
        <span
          className={cn(
            "font-semibold",
            o.isBest ? "text-emerald-400" : "text-foreground"
          )}
        >
          {fmtTRY(o.price)}
        </span>
      ),
    },
    {
      key: "delivery",
      header: "Teslim",
      align: "center",
      cell: (o) => <span className="text-muted-foreground">{o.delivery} gün</span>,
    },
    {
      key: "payment",
      header: "Ödeme",
      align: "center",
      cell: (o) => <span className="text-muted-foreground">{o.payment}</span>,
    },
    {
      key: "warranty",
      header: "Garanti",
      align: "center",
      cell: (o) => <span className="text-muted-foreground">{o.warranty}</span>,
    },
    {
      key: "score",
      header: "Puan",
      align: "center",
      cell: (o) => <ScoreRing score={o.supplier.score} />,
    },
    {
      key: "action",
      header: "Eylem",
      align: "right",
      cell: (o) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSelect(o);
          }}
          className={cn(
            "min-h-[32px] px-2.5 py-1 text-fs-xs rounded-md border",
            o.isBest
              ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
              : "bg-muted/50 text-foreground/80 border-border hover:bg-muted"
          )}
        >
          {o.isBest ? "Sipariş Ver" : "Seç"}
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <SectionCard
        title={`${req.category} · ${req.project}`}
        subtitle={`${req.no} · Bütçe ${fmtTRY(req.budget)} · İhtiyaç ${daysFromNow(req.needBy)}`}
        action={
          <button className="min-h-[36px] px-3 py-1.5 text-fs-xs rounded-lg bg-[#FF6B2B]/15 text-[#FF6B2B] border border-[#FF6B2B]/30 hover:bg-[#FF6B2B]/25 flex items-center gap-1.5">
            <Plus className="w-3 h-3" /> Tedarikçi Ekle
          </button>
        }
      >
        <ResponsiveTable<Offer>
          columns={columns}
          rows={offers}
          rowKey={(o) => o.supplier.id}
          onRowClick={onSelect}
        />
      </SectionCard>
    </div>
  );
};

export default ProcurementRFQView;
export type { Offer };
