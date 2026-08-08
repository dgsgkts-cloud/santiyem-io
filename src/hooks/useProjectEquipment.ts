// Proje bağlamında makine & ekipman. Mevcut envanter tablolarını (inventory_assets
// + inventory_assignments) yeniden kullanır; paralel veri modeli yoktur.
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";
import { toast } from "sonner";

const db = supabase as any;

export type EquipmentStatus = "active" | "idle" | "maintenance" | "returned";

export interface ProjectEquipment {
  assetId: string;
  assignmentId: string | null;
  name: string;
  category: string | null;
  unit: string;
  code: string;
  serialNumber: string | null;
  personName: string | null;
  issuedAt: string | null;
  expectedReturnAt: string | null;
  returnedAt: string | null;
  notes: string | null;
  assetStatus: string;
  status: EquipmentStatus;
}

export interface EquipmentInput {
  name: string;
  category?: string;
  quantityUnit?: string;
  code?: string;
  serialNumber?: string;
  personName?: string;
  issuedAt?: string;
  expectedReturnAt?: string;
  notes?: string;
  maintenance?: boolean;
}

const deriveStatus = (assetStatus: string, returnedAt: string | null): EquipmentStatus => {
  if (returnedAt) return "returned";
  if (assetStatus === "maintenance") return "maintenance";
  if (assetStatus === "assigned") return "active";
  return "idle";
};

export const EQUIPMENT_STATUS_LABELS: Record<EquipmentStatus, string> = {
  active: "Aktif",
  idle: "Boşta",
  maintenance: "Bakımda",
  returned: "İade Edildi",
};

export const useProjectEquipment = (projectId?: string) => {
  const { user } = useUser();
  const [items, setItems] = useState<ProjectEquipment[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!projectId || !user) { setItems([]); return; }
    setLoading(true);
    const { data, error } = await db
      .from("inventory_assignments")
      .select(
        "id, person_name, issued_at, expected_return_at, returned_at, notes, status, " +
          "asset:inventory_assets(id, name, category, unit, asset_code, serial_number, status, notes, is_active)",
      )
      .eq("project_id", projectId)
      .order("issued_at", { ascending: false });
    if (error) {
      setLoading(false);
      return;
    }
    const rows: ProjectEquipment[] = (data ?? [])
      .filter((r: any) => r.asset && r.asset.is_active !== false)
      .map((r: any) => ({
        assetId: r.asset.id,
        assignmentId: r.id,
        name: r.asset.name,
        category: r.asset.category,
        unit: r.asset.unit,
        code: r.asset.asset_code,
        serialNumber: r.asset.serial_number,
        personName: r.person_name,
        issuedAt: r.issued_at,
        expectedReturnAt: r.expected_return_at,
        returnedAt: r.returned_at,
        notes: r.notes ?? r.asset.notes,
        assetStatus: r.asset.status,
        status: deriveStatus(r.asset.status, r.returned_at),
      }));
    setItems(rows);
    setLoading(false);
  }, [projectId, user]);

  useEffect(() => { void load(); }, [load]);

  const addEquipment = useCallback(
    async (input: EquipmentInput) => {
      if (!projectId || !user) return false;
      const stamp = Date.now().toString(36).toUpperCase();
      const { data: asset, error: assetErr } = await db
        .from("inventory_assets")
        .insert({
          user_id: user.id,
          name: input.name.trim(),
          category: input.category?.trim() || null,
          unit: input.quantityUnit?.trim() || "adet",
          asset_code: input.code?.trim() || `EKP-${stamp}`,
          serial_number: input.serialNumber?.trim() || null,
          status: input.maintenance ? "maintenance" : input.personName?.trim() ? "assigned" : "available",
          notes: input.notes?.trim() || null,
        })
        .select("id")
        .single();
      if (assetErr || !asset) {
        toast.error("Ekipman eklenemedi.");
        return false;
      }
      const { error: asgErr } = await db.from("inventory_assignments").insert({
        user_id: user.id,
        issued_by: user.id,
        assignment_no: `ZMT-${stamp}`,
        asset_id: asset.id,
        project_id: projectId,
        person_name: input.personName?.trim() || "Proje deposu",
        issued_at: input.issuedAt ? new Date(input.issuedAt).toISOString() : new Date().toISOString(),
        expected_return_at:
          input.expectedReturnAt ||
          new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10),
        notes: input.notes?.trim() || null,
        status: "assigned",
      });
      if (asgErr) {
        toast.error("Ekipman projeye bağlanamadı.");
        return false;
      }
      toast.success("Ekipman projeye eklendi.");
      await load();
      return true;
    },
    [projectId, user, load],
  );

  const updateEquipment = useCallback(
    async (row: ProjectEquipment, patch: Partial<EquipmentInput>) => {
      if (!user) return false;
      const assetPatch: Record<string, unknown> = {};
      if (patch.name !== undefined) assetPatch.name = patch.name.trim();
      if (patch.category !== undefined) assetPatch.category = patch.category?.trim() || null;
      if (patch.serialNumber !== undefined) assetPatch.serial_number = patch.serialNumber?.trim() || null;
      if (patch.quantityUnit !== undefined) assetPatch.unit = patch.quantityUnit?.trim() || row.unit;
      if (patch.maintenance !== undefined)
        assetPatch.status = patch.maintenance ? "maintenance" : patch.personName?.trim() ? "assigned" : "available";
      if (Object.keys(assetPatch).length) {
        const { error } = await db.from("inventory_assets").update(assetPatch).eq("id", row.assetId);
        if (error) { toast.error("Güncellenemedi."); return false; }
      }
      if (row.assignmentId) {
        const asgPatch: Record<string, unknown> = {};
        if (patch.personName !== undefined) asgPatch.person_name = patch.personName?.trim() || "Proje deposu";
        if (patch.expectedReturnAt !== undefined) asgPatch.expected_return_at = patch.expectedReturnAt;
        if (patch.notes !== undefined) asgPatch.notes = patch.notes?.trim() || null;
        if (Object.keys(asgPatch).length) {
          const { error } = await db.from("inventory_assignments").update(asgPatch).eq("id", row.assignmentId);
          if (error) { toast.error("Güncellenemedi."); return false; }
        }
      }
      toast.success("Ekipman güncellendi.");
      await load();
      return true;
    },
    [user, load],
  );

  const returnEquipment = useCallback(
    async (row: ProjectEquipment) => {
      if (!row.assignmentId) return false;
      const { error } = await db
        .from("inventory_assignments")
        .update({ status: "returned", returned_at: new Date().toISOString() })
        .eq("id", row.assignmentId);
      if (error) { toast.error("İade kaydedilemedi."); return false; }
      await db.from("inventory_assets").update({ status: "available" }).eq("id", row.assetId);
      toast.success("Ekipman iade alındı.");
      await load();
      return true;
    },
    [load],
  );

  const deactivateEquipment = useCallback(
    async (row: ProjectEquipment) => {
      const { error } = await db.from("inventory_assets").update({ is_active: false }).eq("id", row.assetId);
      if (error) { toast.error("Pasife alınamadı."); return false; }
      toast.success("Ekipman pasife alındı.");
      await load();
      return true;
    },
    [load],
  );

  return { items, loading, reload: load, addEquipment, updateEquipment, returnEquipment, deactivateEquipment };
};
