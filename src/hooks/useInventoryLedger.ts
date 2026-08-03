// DEPO FAZ 1 — depo ana kaydı + değiştirilemez stok hareket defteri erişimi.
//
// Tek gerçek kaynak: public.warehouses + public.stock_movements.
// Yazma işlemleri yalnızca sunucu tarafı fonksiyonlarla yapılır
// (post_goods_receipt / post_stock_issue / reverse_stock_movement), böylece
// birim uyumu, negatif stok ve mükerrer mal kabulü kontrolleri atlanamaz.

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";

export interface WarehouseRow {
  id: string;
  user_id: string;
  code: string;
  name: string;
  warehouse_type: string;
  manager_name: string | null;
  location: string | null;
  project_id: string | null;
  capacity_type: string | null;
  capacity_value: number | null;
  capacity_unit: string | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
}

export type LedgerMovementType =
  | "goods_receipt" | "manual_entry" | "project_issue" | "consumption"
  | "transfer_out" | "transfer_in" | "return_in" | "supplier_return"
  | "count_increase" | "count_decrease" | "scrap"
  | "assignment_out" | "assignment_return" | "reversal";

export interface StockMovementRow {
  id: string;
  user_id: string;
  movement_no: string;
  movement_type: LedgerMovementType;
  reason: string | null;
  direction: number;
  material_id: string;
  warehouse_id: string;
  counter_warehouse_id: string | null;
  quantity: number;
  unit: string;
  unit_cost: number | null;
  total_cost: number | null;
  project_id: string | null;
  supplier: string | null;
  person: string | null;
  cost_code: string | null;
  source_type: string | null;
  source_id: string | null;
  source_document: string | null;
  notes: string | null;
  reversal_of: string | null;
  reversed_by: string | null;
  actor_id: string;
  posted_at: string;
  transaction_date: string;
}

export interface GoodsReceiptInput {
  materialId: string;
  warehouseId: string;
  quantity: number;
  unit: string;
  unitCost?: number | null;
  supplier?: string | null;
  projectId?: string | null;
  sourceType?: string;
  sourceId?: string | null;
  sourceDocument?: string | null;
  notes?: string | null;
  transactionDate?: string;
  /** true = yetkili manuel giriş (satın alma belgesi olmadan). */
  manual?: boolean;
  reason?: string | null;
}

export interface StockIssueInput {
  materialId: string;
  warehouseId: string;
  quantity: number;
  unit: string;
  movementType?: "project_issue" | "consumption" | "supplier_return" | "scrap" | "assignment_out";
  reason?: string | null;
  projectId?: string | null;
  costCode?: string | null;
  person?: string | null;
  sourceType?: string | null;
  sourceId?: string | null;
  sourceDocument?: string | null;
  notes?: string | null;
  transactionDate?: string;
}

const db = supabase as any;

export const useInventoryLedger = (projectId?: string) => {
  const { user } = useUser();
  const qc = useQueryClient();

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["warehouses"] });
    qc.invalidateQueries({ queryKey: ["stock_movements"] });
    qc.invalidateQueries({ queryKey: ["inventory_consumption"] });
    qc.invalidateQueries({ queryKey: ["materials"] });
  };

  const { data: warehouses = [], isLoading: whLoading } = useQuery({
    queryKey: ["warehouses"],
    queryFn: async (): Promise<WarehouseRow[]> => {
      const { data, error } = await db
        .from("warehouses")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as WarehouseRow[];
    },
    enabled: !!user,
  });

  const { data: movements = [], isLoading: mvLoading } = useQuery({
    queryKey: ["stock_movements", projectId ?? null],
    queryFn: async (): Promise<StockMovementRow[]> => {
      let q = db
        .from("stock_movements")
        .select("*")
        .order("transaction_date", { ascending: false })
        .order("posted_at", { ascending: false })
        .limit(4000);
      if (projectId) q = q.eq("project_id", projectId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as StockMovementRow[];
    },
    enabled: !!user,
  });

  const ensureDefaultWarehouse = useMutation({
    mutationFn: async (): Promise<string> => {
      const { data, error } = await db.rpc("ensure_default_warehouse");
      if (error) throw error;
      return data as string;
    },
    onSuccess: invalidate,
  });

  const createWarehouse = useMutation({
    mutationFn: async (input: {
      code: string; name: string; warehouseType?: string;
      managerName?: string | null; location?: string | null; projectId?: string | null;
      capacityType?: string | null; capacityValue?: number | null; capacityUnit?: string | null;
      notes?: string | null;
    }) => {
      if (!user) throw new Error("Oturum bulunamadı.");
      const { data, error } = await db.from("warehouses").insert({
        user_id: user.id,
        code: input.code.trim().toUpperCase(),
        name: input.name.trim(),
        warehouse_type: input.warehouseType ?? "site",
        manager_name: input.managerName ?? null,
        location: input.location ?? null,
        project_id: input.projectId ?? null,
        capacity_type: input.capacityType ?? null,
        capacity_value: input.capacityValue ?? null,
        capacity_unit: input.capacityUnit ?? null,
        notes: input.notes ?? null,
      }).select("*").single();
      if (error) throw error;
      return data as WarehouseRow;
    },
    onSuccess: invalidate,
  });

  const postGoodsReceipt = useMutation({
    mutationFn: async (input: GoodsReceiptInput): Promise<string> => {
      const { data, error } = await db.rpc("post_goods_receipt", {
        _material_id: input.materialId,
        _warehouse_id: input.warehouseId,
        _quantity: input.quantity,
        _unit: input.unit,
        _unit_cost: input.unitCost ?? null,
        _supplier: input.supplier ?? null,
        _project_id: input.projectId ?? null,
        _source_type: input.sourceType ?? (input.manual ? "manual" : "goods_receipt"),
        _source_id: input.sourceId ?? null,
        _source_document: input.sourceDocument ?? null,
        _notes: input.notes ?? null,
        _transaction_date: input.transactionDate ?? new Date().toISOString().slice(0, 10),
        _manual: input.manual ?? false,
        _reason: input.reason ?? null,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: invalidate,
  });

  const postStockIssue = useMutation({
    mutationFn: async (input: StockIssueInput): Promise<string> => {
      const { data, error } = await db.rpc("post_stock_issue", {
        _material_id: input.materialId,
        _warehouse_id: input.warehouseId,
        _quantity: input.quantity,
        _unit: input.unit,
        _movement_type: input.movementType ?? "project_issue",
        _reason: input.reason ?? null,
        _project_id: input.projectId ?? null,
        _cost_code: input.costCode ?? null,
        _person: input.person ?? null,
        _source_type: input.sourceType ?? null,
        _source_id: input.sourceId ?? null,
        _source_document: input.sourceDocument ?? null,
        _notes: input.notes ?? null,
        _transaction_date: input.transactionDate ?? new Date().toISOString().slice(0, 10),
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: invalidate,
  });

  const reverseMovement = useMutation({
    mutationFn: async ({ movementId, reason }: { movementId: string; reason: string }) => {
      const { data, error } = await db.rpc("reverse_stock_movement", {
        _movement_id: movementId,
        _reason: reason,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: invalidate,
  });

  return {
    warehouses,
    movements,
    isLoading: whLoading || mvLoading,
    ensureDefaultWarehouse,
    createWarehouse,
    postGoodsReceipt,
    postStockIssue,
    reverseMovement,
  };
};
