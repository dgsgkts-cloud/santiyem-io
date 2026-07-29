// Sprint M1.5 — Stocks view.
// SPRINT 38D — Dense row list replaces the card grid: same information, more
// items per screen. One filter row, always-visible search, inline quick actions.
import { useState, useMemo } from "react";
import { Search, X, ArrowDownToLine, ArrowUpFromLine, ArrowLeftRight, History } from "lucide-react";
import EmptyState from "@/components/desktop/EmptyState";
import { cn } from "@/lib/utils";
import { CATEGORIES, STATE_META, fmtNum, fmtTRY, type Stock } from "../warehouseConstants";
import type { WarehouseData } from "../useWarehouseData";

interface Props {
  data: WarehouseData;
  onOpen: (s: Stock) => void;
}

const STATE_CHIPS: [string, string][] = [
  ["all", "Tümü"], ["healthy", "Sağlıklı"], ["low", "Düşük"], ["critical", "Kritik"], ["out", "Yok"],
];

export const StocksView = ({ data, onOpen }: Props) => {
  const [q, setQ] = useState("");
  const [state, setState] = useState<string>("all");
  const [cat, setCat] = useState<string>("all");

  const filtered = useMemo(() => data.stocks.filter(s =>
    (state === "all" || s.state === state) &&
    (cat === "all" || s.category === cat) &&
    (q === "" || s.name.toLowerCase().includes(q.toLowerCase()) || s.supplier.toLowerCase().includes(q.toLowerCase()))
  ), [data.stocks, state, cat, q]);

  const action = (label: string, Icon: typeof History, tone?: string) => (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={e => { e.stopPropagation(); window.dispatchEvent(new CustomEvent("canvas-followup", { detail: { text: `${label} — depo işlemi başlat.` } })); }}
      className={cn("w-9 h-9 rounded-control flex items-center justify-center shrink-0 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors", tone)}
    >
      <Icon className="w-4 h-4" />
    </button>
  );

  return (
    <div className="space-y-3">
      {/* Single filter row — search never scrolls away */}
      <div className="sticky top-0 z-10 -mx-1 px-1 py-2 bg-background/85 backdrop-blur-sm space-y-2">
        <div className="flex items-center gap-2">
          <div className="relative flex-1 min-w-0">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Malzeme / tedarikçi ara…"
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
            value={cat}
            onChange={e => setCat(e.target.value)}
            className="px-2.5 h-11 text-fs-sm rounded-control bg-card border border-border text-foreground/80 focus:outline-none shrink-0 max-w-[9rem]"
          >
            <option value="all">Tüm kategoriler</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {STATE_CHIPS.map(([v, l]) => (
            <button
              key={v}
              onClick={() => setState(v)}
              className={cn(
                "px-3 h-8 rounded-pill ds-caption whitespace-nowrap border transition-colors duration-200 shrink-0",
                state === v
                  ? "bg-primary/[0.08] text-foreground border-primary/40"
                  : "bg-card text-muted-foreground border-border/70 hover:text-foreground"
              )}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      <section className="rounded-card border border-border/80 bg-card shadow-soft overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState
            icon="🔍"
            title="Eşleşen stok yok"
            description="Arama, kategori ve durum filtresi birlikte hiçbir kalemle eşleşmedi."
            firstStep="Aramayı temizleyin veya durumu 'Tümü' yapın."
          />
        ) : (
          <div className="divide-y divide-border/60">
            {filtered.map(s => {
              const meta = STATE_META[s.state];
              const available = s.current - s.reserved;
              const fill = Math.max(4, Math.min(100, (s.current / Math.max(1, s.min * 2)) * 100));
              return (
                <div
                  key={s.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => onOpen(s)}
                  onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(s); } }}
                  className="group flex items-center gap-3 px-3 py-2.5 hover:bg-muted/30 transition-colors cursor-pointer min-w-0"
                  style={{ minHeight: 64 }}
                >
                  <span className={cn("w-2 h-2 rounded-full shrink-0", meta.dot)} aria-hidden />

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="ds-body font-medium text-foreground truncate">{s.name}</span>
                      <span className={cn("ds-caption px-1.5 py-0.5 rounded-full border shrink-0", meta.color)}>{meta.label}</span>
                    </div>
                    <div className="ds-caption text-muted-foreground truncate mt-0.5">
                      {s.warehouse} · {s.category} · <span className="opacity-70">{s.supplier} · Ort. {fmtTRY(s.avgCost)}/{s.unit}</span>
                    </div>
                    <div className="h-1 rounded-full bg-muted/70 overflow-hidden mt-1.5 max-w-[220px]">
                      <div className={cn("h-full rounded-full", meta.dot)} style={{ width: `${fill}%` }} />
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="ds-body ds-numeric font-semibold text-foreground">{fmtNum(s.current)}</div>
                    <div className="ds-caption text-muted-foreground">
                      {s.unit} · <span className={available <= 0 ? "text-rose-300/90" : "text-emerald-300/90"}>{fmtNum(available)} müsait</span>
                    </div>
                  </div>

                  <div className="hidden sm:flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    {action("Mal kabul", ArrowDownToLine, "hover:text-emerald-300")}
                    {action("Malzeme çıkışı", ArrowUpFromLine, "hover:text-rose-300")}
                    {action("Transfer", ArrowLeftRight)}
                  </div>
                  <button
                    type="button"
                    aria-label="Hareket geçmişi"
                    onClick={e => { e.stopPropagation(); onOpen(s); }}
                    className="w-9 h-9 rounded-control flex items-center justify-center shrink-0 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  >
                    <History className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};

export default StocksView;
