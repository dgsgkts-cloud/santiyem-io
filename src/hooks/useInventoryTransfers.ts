// DEPO — depolar arası transferler (gerçek kayıt zinciri).
//
// Okuma: public.inventory_transfers + public.inventory_transfer_events
//        + public.inventory_transit_balances (yolda olan stok)
// Yazma: yalnızca sunucu fonksiyonları — tablo üzerinde uygulama rolünün
//        INSERT/UPDATE/DELETE yetkisi yoktur, bu yüzden birim, stok, yetki ve
//        mükerrer belge kontrolleri atlanamaz.

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";
import type { TransferStatus } from "@/lib/inventory/transferModel";

export interface TransferRow {
  id: string;
  user_id: string;
  transfer_no: string;
  material_id: string;
  unit: string;
  requested_quantity: number;
  dispatched_quantity: number;
  received_quantity: number;
  damaged_quantity: number;
  missing_quantity: number;
  rejected_quantity: number;
  in_transit_quantity: number;
  unit_cost: number | null;
  source_warehouse_id: string;
  dest_warehouse_id: string;
  project_id: string | null;
  requester_id: string | null;
  approver_id: string | null;
  dispatcher_id: string | null;
  receiver_id: string | null;
  requested_at: string | null;
  approved_at: string | null;
  dispatched_at: string | null;
  received_at: string | null;
  expected_arrival: string | null;
  expected_arrival_at: string | null;
  required_date: string | null;
  reason: string | null;
  notes: string | null;
  rejection_reason: string | null;
  revision_note: string | null;
  discrepancy_note: string | null;
  cancel_reason: string | null;
  cancelled_at: string | null;
  dispatch_reference: string | null;
  status: TransferStatus;
  created_at: string;
  updated_at: string;
}

export interface TransferEventRow {
  id: string;
  transfer_id: string;
  status: string;
  action: string;
  note: string | null;
  payload: Record<string, unknown> | null;
  actor_id: string | null;
  created_at: string;
}

export interface TransitBalanceRow {
  material_id: string;
  warehouse_id: string;
  direction: string;
  quantity: number;
}

const db = supabase as any;
const num = (v: unknown) => Number(v) || 0;

const normalize = (r: any): TransferRow => ({
  ...r,
  requested_quantity: num(r.requested_quantity),
  dispatched_quantity: num(r.dispatched_quantity),
  received_quantity: num(r.received_quantity),
  damaged_quantity: num(r.damaged_quantity),
  missing_quantity: num(r.missing_quantity),
  rejected_quantity: num(r.rejected_quantity),
  in_transit_quantity: num(r.in_transit_quantity),
  unit_cost: r.unit_cost === null ? null : Number(r.unit_cost),
});

export interface CreateTransferInput {
  sourceWarehouseId: string;
  destWarehouseId: string;
  materialId: string;
  quantity: number;
  unit: string;
  requiredAt?: string | null;
  reason?: string | null;
  notes?: string | null;
  projectId?: string | null;
  allowSafetyBreach?: boolean;
}

export const useInventoryTransfers = () => {
  const { user } = useUser();
  const qc = useQueryClient();

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["inventory_transfers"] });
    qc.invalidateQueries({ queryKey: ["inventory_transfer_events"] });
    qc.invalidateQueries({ queryKey: ["inventory_transit_balances"] });
    qc.invalidateQueries({ queryKey: ["stock_movements"] });
    qc.invalidateQueries({ queryKey: ["notifications"] });
  };

  const { data: transfers = [], isLoading } = useQuery({
    queryKey: ["inventory_transfers"],
    queryFn: async (): Promise<TransferRow[]> => {
      const { data, error } = await db
        .from("inventory_transfers")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return (data ?? []).map(normalize);
    },
    enabled: !!user,
  });

  const { data: events = [] } = useQuery({
    queryKey: ["inventory_transfer_events"],
    queryFn: async (): Promise<TransferEventRow[]> => {
      const { data, error } = await db
        .from("inventory_transfer_events")
        .select("*")
        .order("created_at", { ascending: true })
        .limit(4000);
      if (error) throw error;
      return (data ?? []) as TransferEventRow[];
    },
    enabled: !!user,
  });

  const { data: transit = [] } = useQuery({
    queryKey: ["inventory_transit_balances"],
    queryFn: async (): Promise<TransitBalanceRow[]> => {
      const { data, error } = await db.from("inventory_transit_balances").select("*");
      if (error) throw error;
      return (data ?? []).map((r: any) => ({ ...r, quantity: num(r.quantity) }));
    },
    enabled: !!user,
  });

  const rpc = async (fn: string, args: Record<string, unknown>) => {
    const { data, error } = await db.rpc(fn, args);
    if (error) throw error;
    return data;
  };

  const createTransfer = useMutation({
    mutationFn: (i: CreateTransferInput) =>
      rpc("create_stock_transfer", {
        _source_warehouse_id: i.sourceWarehouseId,
        _dest_warehouse_id: i.destWarehouseId,
        _material_id: i.materialId,
        _requested_quantity: i.quantity,
        _unit: i.unit,
        _required_at: i.requiredAt ?? null,
        _reason: i.reason ?? null,
        _notes: i.notes ?? null,
        _project_id: i.projectId ?? null,
        _allow_safety_breach: i.allowSafetyBreach ?? false,
      }),
    onSuccess: invalidate,
  });

  const decideTransfer = useMutation({
    mutationFn: (i: { transferId: string; decision: "approve" | "reject" | "revise"; reason?: string | null }) =>
      rpc("approve_stock_transfer", {
        _transfer_id: i.transferId,
        _decision: i.decision,
        _reason: i.reason ?? null,
      }),
    onSuccess: invalidate,
  });

  const dispatchTransfer = useMutation({
    mutationFn: (i: {
      transferId: string; quantity: number; unit?: string | null;
      dispatchedAt?: string | null; expectedArrivalAt?: string | null;
      reference?: string | null; notes?: string | null;
    }) =>
      rpc("dispatch_stock_transfer", {
        _transfer_id: i.transferId,
        _dispatched_quantity: i.quantity,
        _unit: i.unit ?? null,
        _dispatched_at: i.dispatchedAt ?? null,
        _expected_arrival_at: i.expectedArrivalAt ?? null,
        _reference: i.reference ?? null,
        _notes: i.notes ?? null,
      }),
    onSuccess: invalidate,
  });

  const receiveTransfer = useMutation({
    mutationFn: (i: {
      transferId: string; accepted: number; damaged?: number; missing?: number;
      rejected?: number; unit?: string | null; receivedAt?: string | null;
      reference?: string | null; notes?: string | null;
    }) =>
      rpc("receive_stock_transfer", {
        _transfer_id: i.transferId,
        _accepted_quantity: i.accepted,
        _damaged_quantity: i.damaged ?? 0,
        _missing_quantity: i.missing ?? 0,
        _rejected_quantity: i.rejected ?? 0,
        _unit: i.unit ?? null,
        _received_at: i.receivedAt ?? null,
        _reference: i.reference ?? null,
        _notes: i.notes ?? null,
      }),
    onSuccess: invalidate,
  });

  const cancelTransfer = useMutation({
    mutationFn: (i: { transferId: string; reason: string }) =>
      rpc("cancel_stock_transfer", { _transfer_id: i.transferId, _reason: i.reason }),
    onSuccess: invalidate,
  });

  const returnTransfer = useMutation({
    mutationFn: (i: { transferId: string; quantity: number; unit?: string | null; reason: string }) =>
      rpc("return_stock_transfer", {
        _transfer_id: i.transferId,
        _quantity: i.quantity,
        _unit: i.unit ?? null,
        _reason: i.reason,
      }),
    onSuccess: invalidate,
  });

  const busy =
    createTransfer.isPending || decideTransfer.isPending || dispatchTransfer.isPending ||
    receiveTransfer.isPending || cancelTransfer.isPending || returnTransfer.isPending;

  return {
    transfers,
    events,
    transit,
    isLoading,
    busy,
    eventsFor: (transferId: string) => events.filter((e) => e.transfer_id === transferId),
    createTransfer,
    decideTransfer,
    dispatchTransfer,
    receiveTransfer,
    cancelTransfer,
    returnTransfer,
  };
};
