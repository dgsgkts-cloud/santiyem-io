// DEPO FOUNDATION — Phase 0: real-record warehouse data hook.
//
// Replaces the previous seeded demo generator. Every value returned here comes
// from public.materials / material_entries / material_exits via useMaterials,
// routed through the single canonical calculation in ./inventoryTruth.
//
// Collections without a backing table (warehouses, transfers, assignments,
// count sessions) are returned EMPTY rather than fabricated. The UI shows the
// truthful empty state for those until the foundation migration lands.

import { useMemo } from "react";
import { useMaterials } from "@/hooks/useMaterials";
import {
  buildInventory, auditInventory, forecastDepletion,
  type InventoryItem, type DataQualityIssue, type Forecast,
} from "./inventoryTruth";
import type { Movement, Transfer, Assignment, Count, Warehouse_ } from "./warehouseConstants";

export interface WarehouseData {
  loading: boolean;
  /** Canonical inventory — the only stock source for every depot view. */
  items: InventoryItem[];
  /** Stockable items only (ready-mix concrete and other non-stock excluded). */
  stockItems: InventoryItem[];
  nonStockItems: InventoryItem[];
  /** Real posted movements derived from entry/exit records. */
  movements: Movement[];
  /** Sum of stock value where a real weighted-average cost exists. */
  totalStockValue: number;
  /** Number of stockable items whose value could not be computed. */
  valueUnknownCount: number;
  monthlyConsumptionCost: number;
  monthlyConsumptionKnown: boolean;
  dataQuality: DataQualityIssue[];
  forecastFor: (item: InventoryItem) => Forecast;
  /** No backing tables yet — intentionally empty, never seeded. */
  warehouses: Warehouse_[];
  transfers: Transfer[];
  assignments: Assignment[];
  counts: Count[];
  lastUpdated: Date;
}

export const useWarehouseData = (projectId?: string): WarehouseData => {
  const { materials, entries, exits, isLoading } = useMaterials(projectId) as any;

  return useMemo(() => {
    const mats: any[] = materials ?? [];
    const ins: any[] = entries ?? [];
    const outs: any[] = exits ?? [];

    const items = buildInventory(mats, ins, outs);
    const stockItems = items.filter((i) => i.stockable);
    const nonStockItems = items.filter((i) => !i.stockable);

    const nameById = new Map<string, any>(mats.map((m: any) => [m.id, m]));

    // Posted movements ledger: real receipts and issues, newest first.
    const movements: Movement[] = [
      ...ins.map((e: any) => {
        const m = nameById.get(e.material_id);
        return {
          id: `entry-${e.id}`,
          kind: "in" as const,
          material: m?.name ?? "—",
          qty: Number(e.quantity) || 0,
          unit: m?.unit ?? "",
          warehouse: "",
          project: m?.project_id ?? "",
          actor: "",
          date: e.entry_date,
          reason: e.supplier ? `Mal kabulü · ${e.supplier}` : "Mal kabulü",
          unitCost: Number(e.unit_price) || null,
          document: e.waybill_no || null,
        };
      }),
      ...outs.map((x: any) => {
        const m = nameById.get(x.material_id);
        return {
          id: `exit-${x.id}`,
          kind: "out" as const,
          material: m?.name ?? "—",
          qty: Number(x.quantity) || 0,
          unit: m?.unit ?? "",
          warehouse: "",
          project: m?.project_id ?? "",
          actor: "",
          date: x.exit_date,
          reason: x.location ? `Malzeme çıkışı · ${x.location}` : "Malzeme çıkışı",
          unitCost: null,
          document: null,
        };
      }),
    ].sort((a, b) => (b.date || "").localeCompare(a.date || ""));

    const totalStockValue = stockItems.reduce((s, i) => s + (i.stockValue ?? 0), 0);
    const valueUnknownCount = stockItems.filter((i) => i.stockValue === null && i.onHand > 0).length;

    // Monthly consumption COST: issued qty × weighted-average cost, last 30 days.
    const since = new Date();
    since.setDate(since.getDate() - 30);
    const sinceIso = since.toISOString().slice(0, 10);
    const costById = new Map(items.map((i) => [i.id, i.avgCost]));
    let monthlyConsumptionCost = 0;
    let costedAny = false;
    for (const x of outs) {
      if ((x.exit_date ?? "") < sinceIso) continue;
      const c = costById.get(x.material_id);
      if (c === null || c === undefined) continue;
      monthlyConsumptionCost += (Number(x.quantity) || 0) * c;
      costedAny = true;
    }

    return {
      loading: !!isLoading,
      items,
      stockItems,
      nonStockItems,
      movements,
      totalStockValue,
      valueUnknownCount,
      monthlyConsumptionCost,
      monthlyConsumptionKnown: costedAny,
      dataQuality: auditInventory(items, mats, ins, outs),
      forecastFor: (item: InventoryItem) => forecastDepletion(item, outs),
      warehouses: [],
      transfers: [],
      assignments: [],
      counts: [],
      lastUpdated: new Date(),
    };
  }, [materials, entries, exits, isLoading]);
};
