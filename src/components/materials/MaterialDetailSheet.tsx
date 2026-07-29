// SPRINT 38D — Material detail sheet.
// Groups everything about one material on a single scroll-light surface:
// current stock → quick actions → recent movements → supplier & purchase history.

import { useMemo } from "react";
import { ArrowDownLeft, ArrowUpRight, Boxes, Truck } from "lucide-react";
import { ResponsiveSheet } from "@/components/ui/responsive";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { STOCK_STATUS_META, getStockStatus } from "./materialStatus";
import type { MaterialEntry, MaterialExit } from "@/hooks/useMaterials";

export interface DetailMaterial {
  id: string;
  name: string;
  unit: string;
  min_stock: number;
  currentStock: number;
  totalIn: number;
  totalOut: number;
  totalCost: number;
}

interface Props {
  material: DetailMaterial | null;
  entries: MaterialEntry[];
  exits: MaterialExit[];
  fmt: (n: number) => string;
  fmtMoney: (n: number) => string;
  onClose: () => void;
  onEntry: (id: string) => void;
  onExit: (id: string) => void;
}

export const MaterialDetailSheet = ({
  material, entries, exits, fmt, fmtMoney, onClose, onEntry, onExit,
}: Props) => {
  const mine = useMemo(() => {
    if (!material) return { entries: [], exits: [], movements: [] as any[] };
    const e = entries.filter(x => x.material_id === material.id);
    const x = exits.filter(y => y.material_id === material.id);
    const movements = [
      ...e.map(i => ({ id: i.id, kind: "in" as const, date: i.entry_date, qty: i.quantity, note: i.supplier || i.note || "" })),
      ...x.map(i => ({ id: i.id, kind: "out" as const, date: i.exit_date, qty: i.quantity, note: i.location || i.note || "" })),
    ].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 6);
    return { entries: e, exits: x, movements };
  }, [material, entries, exits]);

  const suppliers = useMemo(() => {
    const acc: Record<string, { name: string; count: number; total: number; last: string }> = {};
    mine.entries.forEach(e => {
      const key = e.supplier || "Belirtilmemiş";
      if (!acc[key]) acc[key] = { name: key, count: 0, total: 0, last: e.entry_date };
      acc[key].count += 1;
      acc[key].total += Number(e.total_amount);
      if (e.entry_date > acc[key].last) acc[key].last = e.entry_date;
    });
    return Object.values(acc).sort((a, b) => b.total - a.total).slice(0, 4);
  }, [mine.entries]);

  const status = material ? getStockStatus(material.currentStock, material.min_stock) : "healthy";
  const meta = STOCK_STATUS_META[status];
  const avgPrice = material && material.totalIn > 0 ? material.totalCost / material.totalIn : 0;

  return (
    <ResponsiveSheet
      open={!!material}
      onOpenChange={o => { if (!o) onClose(); }}
      title={material?.name}
      description={material ? `Min. stok ${fmt(material.min_stock)} ${material.unit}` : undefined}
      size="md"
    >
      {material && (
        <div className="space-y-4">
          {/* 1 — Current stock, front and centre */}
          <div className="rounded-card border border-border/80 bg-card p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="ds-label">Mevcut Stok</div>
                <div className={cn("ds-numeric font-semibold mt-0.5", meta.text)} style={{ fontSize: 28, lineHeight: "34px" }}>
                  {fmt(material.currentStock)} <span className="ds-body text-muted-foreground">{material.unit}</span>
                </div>
              </div>
              <span className={cn("ds-caption px-2 py-1 rounded-full border shrink-0", meta.pill)}>{meta.label}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-border/60">
              <div>
                <div className="ds-label">Giren</div>
                <div className="ds-body ds-numeric text-emerald-300/90">{fmt(material.totalIn)}</div>
              </div>
              <div>
                <div className="ds-label">Çıkan</div>
                <div className="ds-body ds-numeric text-rose-300/90">{fmt(material.totalOut)}</div>
              </div>
              <div>
                <div className="ds-label">Ort. Birim</div>
                <div className="ds-body ds-numeric text-foreground/80">{avgPrice > 0 ? fmtMoney(avgPrice) : "—"}</div>
              </div>
            </div>
          </div>

          {/* 2 — Quick actions, no navigation needed */}
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={() => onEntry(material.id)}>
              <ArrowDownLeft className="w-4 h-4 mr-1.5" /> Giriş Yap
            </Button>
            <Button variant="outline" onClick={() => onExit(material.id)}>
              <ArrowUpRight className="w-4 h-4 mr-1.5" /> Çıkış Yap
            </Button>
          </div>

          {/* 3 — Recent movements */}
          <section>
            <h4 className="ds-label mb-2">Son Hareketler</h4>
            {mine.movements.length === 0 ? (
              <p className="ds-caption text-muted-foreground">Bu malzeme için henüz hareket yok.</p>
            ) : (
              <div className="rounded-card border border-border/80 bg-card divide-y divide-border/60">
                {mine.movements.map(m => (
                  <div key={m.id} className="flex items-center justify-between gap-3 px-3 py-2 min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      {m.kind === "in"
                        ? <ArrowDownLeft className="w-4 h-4 shrink-0 text-emerald-300/90" />
                        : <ArrowUpRight className="w-4 h-4 shrink-0 text-rose-300/90" />}
                      <div className="min-w-0">
                        <div className="ds-caption text-foreground/90">{m.date}</div>
                        {m.note && <div className="ds-caption text-muted-foreground truncate">{m.note}</div>}
                      </div>
                    </div>
                    <span className={cn("ds-body ds-numeric font-medium shrink-0", m.kind === "in" ? "text-emerald-300/90" : "text-rose-300/90")}>
                      {m.kind === "in" ? "+" : "−"}{fmt(Number(m.qty))}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* 4 — Supplier & purchase history */}
          <section>
            <h4 className="ds-label mb-2">Tedarikçi & Alım Geçmişi</h4>
            {suppliers.length === 0 ? (
              <p className="ds-caption text-muted-foreground">Bu malzeme için tedarikçi kaydı yok.</p>
            ) : (
              <div className="rounded-card border border-border/80 bg-card divide-y divide-border/60">
                {suppliers.map(s => (
                  <div key={s.name} className="flex items-center justify-between gap-3 px-3 py-2 min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <Truck className="w-4 h-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <div className="ds-caption text-foreground/90 truncate">{s.name}</div>
                        <div className="ds-caption text-muted-foreground">{s.count} alım · son {s.last}</div>
                      </div>
                    </div>
                    <span className="ds-body ds-numeric text-foreground/80 shrink-0">{fmtMoney(s.total)}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <div className="flex items-center gap-2 ds-caption text-muted-foreground">
            <Boxes className="w-3.5 h-3.5" />
            Toplam alım maliyeti {fmtMoney(material.totalCost)}
          </div>
        </div>
      )}
    </ResponsiveSheet>
  );
};

export default MaterialDetailSheet;
