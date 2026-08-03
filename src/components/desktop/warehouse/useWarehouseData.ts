// DEPO FAZ 1 — gerçek kayıt tabanlı depo verisi.
//
// Tek gerçek kaynak zinciri:
//   public.warehouses  → depo ana kaydı
//   public.stock_movements → değiştirilemez hareket defteri (tüm bakiyeler)
//   public.materials → malzeme ana kaydı (stok tipi, birim, min/sipariş noktası)
//
// Hiçbir bakiye, kapasite veya tahmin uydurulmaz. Arkasında kayıt olmayan
// modüller (transfer, zimmet, sayım) Faz 2'ye kadar boş döner.

import { useMemo } from "react";
import { useMaterials } from "@/hooks/useMaterials";
import { useInventoryLedger, type StockMovementRow, type WarehouseRow } from "@/hooks/useInventoryLedger";
import { useInventoryConsumption } from "@/hooks/useInventoryConsumption";
import {
  toConsumptionEvents, unknownMovementTypes,
  type ConsumptionEvent,
} from "@/lib/inventory/consumption";
import {
  buildInventory, auditInventory, forecastFromConsumption,
  type InventoryItem, type DataQualityIssue, type Forecast,
} from "./inventoryTruth";
import type { Movement, MovementKind, Transfer, Assignment, Count } from "./warehouseConstants";

/** Depo ana kaydı + hareket defterinden hesaplanan gerçek doluluk. */
export interface WarehouseSummary {
  id: string;
  code: string;
  name: string;
  type: string;
  manager: string | null;
  location: string | null;
  projectId: string | null;
  isActive: boolean;
  /** Bu depoda bakiyesi olan stok kalemi sayısı. */
  itemCount: number;
  /** Ağırlıklı ortalama maliyetle hesaplanabilen stok değeri. */
  stockValue: number;
  /** Değeri hesaplanamayan kalem sayısı (maliyet esası yok). */
  valueUnknownCount: number;
  movementCount: number;
  lastMovementDate: string | null;
  capacityType: string | null;
  capacityValue: number | null;
  capacityUnit: string | null;
  /** Kapasite girilmediyse null — doluluk oranı uydurulmaz. */
  occupancyRatio: number | null;
}

export interface WarehouseStockRow {
  warehouseId: string;
  materialId: string;
  onHand: number;
  avgCost: number | null;
  stockValue: number | null;
  lastMovementDate: string | null;
  movementCount: number;
}

const LEDGER_KIND: Record<string, MovementKind> = {
  goods_receipt: "in",
  manual_entry: "in",
  project_issue: "out",
  consumption: "consume",
  transfer_out: "transfer_out",
  transfer_in: "transfer_in",
  return_in: "return_in",
  supplier_return: "supplier_return",
  count_increase: "count_up",
  count_decrease: "count_down",
  scrap: "scrap",
  assignment_out: "assignment",
  assignment_return: "assignment_return",
  reversal: "reversal",
};

const REASON_LABEL: Record<string, string> = {
  goods_receipt: "Mal kabulü",
  manual_entry: "Manuel giriş",
  project_issue: "Malzeme çıkışı",
  consumption: "Tüketim",
  supplier_return: "Tedarikçiye iade",
  scrap: "Hurda / zayi",
  assignment_out: "Zimmet çıkışı",
  assignment_return: "Zimmet iadesi",
  reversal: "Ters kayıt",
};

export interface WarehouseData {
  loading: boolean;
  items: InventoryItem[];
  stockItems: InventoryItem[];
  nonStockItems: InventoryItem[];
  /** Hareket defterinden gelen gerçek kayıtlar (yeni → eski). */
  movements: Movement[];
  ledger: StockMovementRow[];
  /** Kanonik tüketim kayıtları (yalnızca gerçek malzeme kullanımı). */
  consumption: ConsumptionEvent[];
  /** Sınıflandırılamayan hareket tipleri — tahmin bunlarla üretilmez. */
  unknownMovementTypes: string[];
  totalStockValue: number;
  valueUnknownCount: number;
  monthlyConsumptionCost: number;
  monthlyConsumptionKnown: boolean;
  dataQuality: DataQualityIssue[];
  forecastFor: (item: InventoryItem) => Forecast;
  /** Gerçek depo ana kaydı. */
  warehouses: WarehouseSummary[];
  /** Depo × malzeme bakiyeleri. */
  warehouseStock: WarehouseStockRow[];
  /** Faz 2 kapsamı — kayıt yok, uydurulmuyor. */
  transfers: Transfer[];
  assignments: Assignment[];
  counts: Count[];
  lastUpdated: Date;
}

export const useWarehouseData = (projectId?: string): WarehouseData => {
  const { materials, isLoading } = useMaterials(projectId) as any;
  const { warehouses: whRows, movements: ledger, isLoading: ledgerLoading } = useInventoryLedger(projectId);
  const { consumption: serverConsumption, isLoading: consumptionLoading } =
    useInventoryConsumption(projectId);

  return useMemo(() => {
    const mats: any[] = materials ?? [];
    const rows: WarehouseRow[] = whRows ?? [];
    // Terslenmiş hareketler ve ters kayıtlar bakiye dışında tutulur.
    const posted = (ledger ?? []).filter((m) => !m.reversed_by && m.movement_type !== "reversal");

    // Hareket defterini kanonik hesaplayıcının beklediği giriş/çıkış şekline
    // uyarlıyoruz — böylece tek bir stok hesabı korunur.
    const pseudoEntries = posted
      .filter((m) => m.direction === 1)
      .map((m) => ({
        id: m.id,
        user_id: m.user_id,
        material_id: m.material_id,
        entry_date: m.transaction_date,
        quantity: Number(m.quantity) || 0,
        unit_price: Number(m.unit_cost) || 0,
        total_amount: Number(m.total_cost) || 0,
        supplier: m.supplier ?? "",
        waybill_no: m.source_document,
        waybill_photo_url: null,
        note: m.notes,
        created_at: m.posted_at,
        source_type: m.source_type,
        source_id: m.source_id,
      }));

    const pseudoExits = posted
      .filter((m) => m.direction === -1)
      .map((m) => ({
        id: m.id,
        user_id: m.user_id,
        material_id: m.material_id,
        exit_date: m.transaction_date,
        quantity: Number(m.quantity) || 0,
        contract_item_id: null,
        location: m.reason,
        note: m.notes,
        created_at: m.posted_at,
        source_type: m.source_type,
        source_id: m.source_id,
      }));

    const dbNonStock = new Set(
      mats.filter((m: any) => m.stock_type && m.stock_type !== "stockable").map((m: any) => m.id),
    );

    // Kanonik hesap: veritabanındaki stok tipi sınıflandırmayı ezer.
    const items = buildInventory(mats as any, pseudoEntries as any, pseudoExits as any).map((i) =>
      dbNonStock.has(i.id) && i.stockable
        ? { ...i, stockable: false, onHand: 0, available: 0, stockValue: null, status: "non_stock" as const }
        : i,
    );
    const stockItems = items.filter((i) => i.stockable);
    const nonStockItems = items.filter((i) => !i.stockable);

    const matById = new Map<string, any>(mats.map((m: any) => [m.id, m]));
    const whById = new Map<string, WarehouseRow>(rows.map((w) => [w.id, w]));

    const movements: Movement[] = (ledger ?? []).map((m) => {
      const mat = matById.get(m.material_id);
      const wh = whById.get(m.warehouse_id);
      const label = REASON_LABEL[m.movement_type] ?? "Hareket";
      return {
        id: m.id,
        kind: LEDGER_KIND[m.movement_type] ?? "adjust",
        material: mat?.name ?? "—",
        qty: Number(m.quantity) || 0,
        unit: m.unit || mat?.unit || "",
        warehouse: wh?.name ?? "",
        project: m.project_id ?? mat?.project_id ?? "",
        actor: m.person ?? "",
        date: m.transaction_date,
        reason: m.reason ? `${label} · ${m.reason}` : label,
        unitCost: m.unit_cost === null ? null : Number(m.unit_cost),
        document: m.source_document ?? m.movement_no,
      };
    });

    // Depo × malzeme bakiyeleri — hareket defterinden.
    const key = (w: string, mt: string) => `${w}::${mt}`;
    const acc = new Map<string, {
      onHand: number; costQty: number; costSum: number;
      last: string | null; count: number;
    }>();
    for (const m of posted) {
      if (dbNonStock.has(m.material_id)) continue;
      const k = key(m.warehouse_id, m.material_id);
      const cur = acc.get(k) ?? { onHand: 0, costQty: 0, costSum: 0, last: null, count: 0 };
      const qty = Number(m.quantity) || 0;
      cur.onHand += m.direction * qty;
      if (m.direction === 1 && m.unit_cost !== null && Number(m.unit_cost) > 0) {
        cur.costQty += qty;
        cur.costSum += qty * Number(m.unit_cost);
      }
      cur.count += 1;
      if (!cur.last || m.transaction_date > cur.last) cur.last = m.transaction_date;
      acc.set(k, cur);
    }

    const warehouseStock: WarehouseStockRow[] = Array.from(acc.entries()).map(([k, v]) => {
      const [warehouseId, materialId] = k.split("::");
      const avgCost = v.costQty > 0 ? v.costSum / v.costQty : null;
      return {
        warehouseId,
        materialId,
        onHand: v.onHand,
        avgCost,
        stockValue: avgCost === null ? null : avgCost * v.onHand,
        lastMovementDate: v.last,
        movementCount: v.count,
      };
    });

    const warehouses: WarehouseSummary[] = rows.map((w) => {
      const mine = warehouseStock.filter((s) => s.warehouseId === w.id && s.onHand > 0);
      const stockValue = mine.reduce((s, r) => s + (r.stockValue ?? 0), 0);
      const dates = mine.map((r) => r.lastMovementDate).filter(Boolean).sort() as string[];
      return {
        id: w.id,
        code: w.code,
        name: w.name,
        type: w.warehouse_type,
        manager: w.manager_name,
        location: w.location,
        projectId: w.project_id,
        isActive: w.is_active,
        itemCount: mine.length,
        stockValue,
        valueUnknownCount: mine.filter((r) => r.stockValue === null).length,
        movementCount: mine.reduce((s, r) => s + r.movementCount, 0),
        lastMovementDate: dates.length ? dates[dates.length - 1] : null,
        capacityType: w.capacity_type,
        capacityValue: w.capacity_value === null ? null : Number(w.capacity_value),
        capacityUnit: w.capacity_unit,
        occupancyRatio: null, // kapasite ölçüm modeli tanımlanmadıkça oran gösterilmez
      };
    });

    const totalStockValue = stockItems.reduce((s, i) => s + (i.stockValue ?? 0), 0);
    const valueUnknownCount = stockItems.filter((i) => i.stockValue === null && i.onHand > 0).length;

    // KANONİK TÜKETİM — yalnızca project_issue / consumption hareketleri.
    // Transfer, sayım düzeltmesi, zimmet, iade, hurda ve ters kayıtlar hariç.
    // Sunucu görünümü (inventory_consumption) varsa o kullanılır; yoksa aynı
    // sınıflandırma defter satırlarına uygulanır — ikinci bir hesap yoktur.
    const consumptionEvents: ConsumptionEvent[] =
      (serverConsumption?.length ?? 0) > 0 ? serverConsumption : toConsumptionEvents(ledger ?? []);
    const unknownTypes = unknownMovementTypes(ledger ?? []);

    // Son 30 gün tüketim maliyeti: tüketim miktarı × ağırlıklı ortalama maliyet.
    const since = new Date();
    since.setDate(since.getDate() - 30);
    const sinceIso = since.toISOString().slice(0, 10);
    const costById = new Map(items.map((i) => [i.id, i.avgCost]));
    let monthlyConsumptionCost = 0;
    let costedAny = false;
    for (const c of consumptionEvents) {
      if ((c.movement_date ?? "") < sinceIso) continue;
      const cost = costById.get(c.material_id);
      if (cost === null || cost === undefined) continue;
      monthlyConsumptionCost += c.consumption_quantity * cost;
      costedAny = true;
    }

    return {
      loading: !!isLoading || ledgerLoading || consumptionLoading,
      items,
      stockItems,
      nonStockItems,
      movements,
      ledger: ledger ?? [],
      consumption: consumptionEvents,
      unknownMovementTypes: unknownTypes,
      totalStockValue,
      valueUnknownCount,
      monthlyConsumptionCost,
      monthlyConsumptionKnown: costedAny,
      dataQuality: auditInventory(items, mats as any, pseudoEntries as any, pseudoExits as any),
      forecastFor: (item: InventoryItem) =>
        forecastFromConsumption(item, consumptionEvents, {
          hasUnknownMovementTypes: unknownTypes.length > 0,
        }),
      warehouses,
      warehouseStock,
      transfers: [],
      assignments: [],
      counts: [],
      lastUpdated: new Date(),
    };
  }, [materials, whRows, ledger, serverConsumption, isLoading, ledgerLoading, consumptionLoading]);
};
