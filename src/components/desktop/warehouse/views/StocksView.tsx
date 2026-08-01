// DEPO — Stoklar: production inventory list on canonical balances.
import { useState, useMemo } from "react";
import { Search, X, ArrowRight } from "lucide-react";
import EmptyState from "@/components/desktop/EmptyState";
import { cn } from "@/lib/utils";
import type { WarehouseData } from "../useWarehouseData";
import { StatePill, InsufficientData } from "../warehouseUi";
import {
  TRUTH_COPY, fmtQty, fmtMoney, fmtDate, type InventoryItem, type StockStatus,
} from "../inventoryTruth";

interface Props {
  data: WarehouseData;
  onOpen: (s: InventoryItem) => void;
}

const STATUS_CHIPS: [string, string][] = [
  ["all", "Tümü"],
  ["healthy", "Sağlıklı"],
  ["low", "Düşük"],
  ["critical", "Kritik"],
  ["out", "Stok Yok"],
  ["data_missing", "Veri Eksik"],
  ["non_stock", "Stok Tutulmaz"],
];

type SortKey = "available_asc" | "value_desc" | "movement_asc" | "alpha";

const SORTS: [SortKey, string][] = [
  ["available_asc", "En az kullanılabilir"],
  ["value_desc", "En yüksek stok değeri"],
  ["movement_asc", "En eski hareket"],
  ["alpha", "Alfabetik"],
];

export const StocksView = ({ data, onOpen }: Props) => {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [sort, setSort] = useState<SortKey>("available_asc");

  const rows = useMemo(() => {
    const needle = q.trim().toLocaleLowerCase("tr");
    const filtered = data.items.filter((s) => {
      if (status !== "all" && s.status !== status) return false;
      if (!needle) return true;
      return (
        s.name.toLocaleLowerCase("tr").includes(needle) ||
        s.suppliers.some((sup) => sup.toLocaleLowerCase("tr").includes(needle)) ||
        s.projectId.toLocaleLowerCase("tr").includes(needle)
      );
    });
    const sorted = [...filtered];
    if (sort === "available_asc") sorted.sort((a, b) => a.available - b.available);
    if (sort === "value_desc") sorted.sort((a, b) => (b.stockValue ?? -1) - (a.stockValue ?? -1));
    if (sort === "movement_asc")
      sorted.sort((a, b) => (a.lastMovementAt ?? "").localeCompare(b.lastMovementAt ?? ""));
    if (sort === "alpha") sorted.sort((a, b) => a.name.localeCompare(b.name, "tr"));
    return sorted;
  }, [data.items, q, status, sort]);

  if (!data.loading && data.items.length === 0)
    return <InsufficientData title={TRUTH_COPY.noStock} hint="Malzeme kartı oluşturulduğunda stok burada görünür." />;

  return (
    <div className="space-y-3">
      {/* Module-scoped search only (the global command control stays global) */}
      <div className="sticky top-0 z-10 -mx-1 px-1 py-2 bg-background/85 backdrop-blur-sm space-y-2">
        <div className="flex items-center gap-2">
          <div className="relative flex-1 min-w-0">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Malzeme, tedarikçi veya proje ara…"
              aria-label="Stok ara"
              className="w-full pl-9 pr-9 h-11 text-fs-sm rounded-control bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
            />
            {q && (
              <button
                onClick={() => setQ("")}
                aria-label="Aramayı temizle"
                className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            aria-label="Sıralama"
            className="px-2.5 h-11 text-fs-sm rounded-control bg-card border border-border text-foreground/80 focus:outline-none shrink-0 max-w-[12rem]"
          >
            {SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {STATUS_CHIPS.map(([v, l]) => (
            <button
              key={v}
              onClick={() => setStatus(v)}
              className={cn(
                "px-3 h-9 rounded-pill ds-caption whitespace-nowrap border transition-colors duration-200 shrink-0",
                status === v
                  ? "bg-primary/[0.08] text-foreground border-primary/40"
                  : "bg-card text-muted-foreground border-border/70 hover:text-foreground",
              )}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      <section className="rounded-card border border-border/80 bg-card shadow-soft overflow-hidden">
        {rows.length === 0 ? (
          <EmptyState
            icon="🔍"
            title="Eşleşen stok yok"
            description="Arama ve durum filtresi birlikte hiçbir kalemle eşleşmedi."
          />
        ) : (
          <div className="divide-y divide-border/60">
            {rows.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => onOpen(s)}
                className="w-full text-left flex items-center gap-3 px-3 py-3 hover:bg-muted/25 transition-colors min-w-0"
                style={{ minHeight: 60 }}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 min-w-0 flex-wrap">
                    <span className="ds-body font-medium text-foreground truncate">{s.name}</span>
                    <StatePill status={s.status} />
                  </div>
                  <div className="ds-caption text-muted-foreground truncate mt-0.5">
                    {s.stockable
                      ? <>Min. {s.minStock > 0 ? `${fmtQty(s.minStock)} ${s.rawUnit}` : "tanımsız"} · Ort. maliyet {s.avgCost === null ? "—" : `${fmtMoney(s.avgCost)}/${s.rawUnit}`} · Son hareket {fmtDate(s.lastMovementAt)}</>
                      : <>Doğrudan teslim malzemesi · depo bakiyesi tutulmaz</>}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  {s.stockable ? (
                    <>
                      <div className="ds-body ds-numeric font-semibold text-foreground">
                        {fmtQty(s.onHand)} <span className="ds-caption text-muted-foreground">{s.rawUnit}</span>
                      </div>
                      <div className="ds-caption text-muted-foreground">
                        <span className={s.available <= 0 ? "text-rose-300/90" : "text-emerald-300/90"}>
                          {fmtQty(s.available)} kullanılabilir
                        </span>
                        {s.stockValue !== null && <> · {fmtMoney(s.stockValue)}</>}
                      </div>
                    </>
                  ) : (
                    <div className="ds-caption text-muted-foreground max-w-[9rem]">
                      Döküm programı ve teslimat üzerinden takip edilir
                    </div>
                  )}
                </div>

                <ArrowRight className="w-4 h-4 shrink-0 text-muted-foreground" />
              </button>
            ))}
          </div>
        )}
      </section>

      <p className="ds-caption text-muted-foreground px-1">
        {rows.length} kalem · Stok değeri ağırlıklı ortalama maliyet yöntemiyle hesaplanır.
      </p>
    </div>
  );
};

export default StocksView;
