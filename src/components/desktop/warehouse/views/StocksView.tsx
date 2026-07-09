// Sprint M1.5 — Stocks view: filterable card grid, responsive.
import { useState } from "react";
import { Search, Boxes } from "lucide-react";
import { ResponsiveGrid } from "@/components/ui/responsive";
import { CATEGORIES, STATE_META, fmtNum, fmtTRY, type Stock } from "../warehouseConstants";
import type { WarehouseData } from "../useWarehouseData";
import { StatePill } from "../warehouseUi";

interface Props {
  data: WarehouseData;
  onOpen: (s: Stock) => void;
}

export const StocksView = ({ data, onOpen }: Props) => {
  const [q, setQ] = useState("");
  const [state, setState] = useState<string>("all");
  const [cat, setCat] = useState<string>("all");
  const filtered = data.stocks.filter(s =>
    (state === "all" || s.state === state) &&
    (cat === "all" || s.category === cat) &&
    (q === "" || s.name.toLowerCase().includes(q.toLowerCase()) || s.supplier.toLowerCase().includes(q.toLowerCase()))
  );

  return (
    <div className="space-y-4">
      <div className="sticky top-0 z-10 -mx-1 px-1 py-2 bg-background/80 backdrop-blur-sm">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Malzeme / tedarikçi ara…"
              className="w-full pl-9 pr-3 h-11 min-h-[44px] text-fs-sm rounded-lg bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#FF6B2B]/50"
            />
          </div>
          <select
            value={cat}
            onChange={e => setCat(e.target.value)}
            className="px-2.5 h-11 min-h-[44px] text-fs-sm rounded-lg bg-card border border-border text-foreground/80 focus:outline-none"
          >
            <option value="all">Tüm kategoriler</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <div className="flex items-center gap-1 rounded-lg bg-card border border-border p-0.5 overflow-x-auto">
            {[["all", "Tümü"], ["healthy", "Sağlıklı"], ["low", "Düşük"], ["critical", "Kritik"], ["out", "Yok"]].map(([v, l]) => (
              <button
                key={v}
                onClick={() => setState(v)}
                className={`px-3 h-9 min-h-[44px] sm:min-h-0 text-fs-xs rounded-md whitespace-nowrap transition-colors duration-[220ms] ${
                  state === v ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground/80"
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
      </div>

      <ResponsiveGrid variant="auto" minItemWidth={280} className="gap-3">
        {filtered.map(s => {
          const available = s.current - s.reserved;
          const meta = STATE_META[s.state];
          return (
            <button
              key={s.id}
              onClick={() => onOpen(s)}
              className="text-left rounded-xl border border-border bg-card p-4 hover:border-[#FF6B2B]/30 hover:bg-muted/40 transition-all duration-[220ms] min-h-[44px]"
            >
              <div className="flex items-start gap-3 mb-3">
                <div className="w-11 h-11 rounded-lg bg-muted border border-border flex items-center justify-center shrink-0">
                  <Boxes className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-foreground font-semibold text-fs-sm truncate">{s.name}</div>
                  <div className="text-fs-xs text-muted-foreground flex items-center gap-1.5 mt-0.5 truncate">
                    <span>{s.category}</span> · <span className="truncate">{s.warehouse}</span>
                  </div>
                </div>
                <StatePill state={s.state} />
              </div>
              <div className="grid grid-cols-3 gap-2 py-2 border-y border-border/60">
                <div>
                  <div className="text-fs-xs text-muted-foreground uppercase">Mevcut</div>
                  <div className="text-fs-sm text-foreground font-medium tabular-nums">
                    {fmtNum(s.current)} <span className="text-fs-xs text-muted-foreground">{s.unit}</span>
                  </div>
                </div>
                <div>
                  <div className="text-fs-xs text-muted-foreground uppercase">Rezerve</div>
                  <div className="text-fs-sm text-foreground/70 font-medium tabular-nums">{fmtNum(s.reserved)}</div>
                </div>
                <div>
                  <div className="text-fs-xs text-muted-foreground uppercase">Kullanılabilir</div>
                  <div className={`text-fs-sm font-medium tabular-nums ${available <= 0 ? "text-red-400" : "text-emerald-400"}`}>
                    {fmtNum(available)}
                  </div>
                </div>
              </div>
              <div className="mt-2">
                <div className="h-1 rounded-full bg-muted overflow-hidden">
                  <div className={`h-full ${meta.dot}`} style={{ width: `${Math.min(100, (s.current / (s.min * 2)) * 100)}%` }} />
                </div>
              </div>
              <div className="flex items-center justify-between mt-2 text-fs-xs text-muted-foreground gap-2">
                <span className="truncate">Ort. {fmtTRY(s.avgCost)}/{s.unit}</span>
                <span className="truncate">{s.supplier}</span>
              </div>
            </button>
          );
        })}
      </ResponsiveGrid>
    </div>
  );
};

export default StocksView;
