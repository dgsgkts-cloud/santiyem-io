import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";
import { toast } from "sonner";

export type EmploymentType = "daily_wage" | "monthly_salary" | "subcontractor_crew";

export const EMPLOYMENT_TYPE_LABELS: Record<EmploymentType, string> = {
  daily_wage: "Yevmiyeli İşçi",
  monthly_salary: "Maktu Aylık Ücretli",
  subcontractor_crew: "Taşeron Ekibi",
};

export interface Personnel {
  id: string;
  user_id: string;
  full_name: string;
  phone: string | null;
  phone_normalized: string | null;
  occupation: string | null;
  title: string | null;
  is_active: boolean;
  employment_type: EmploymentType;
  daily_wage: number | null;
  monthly_salary: number | null;
  subcontractor_id: string | null;
  note: string | null;
  created_at: string;
}

export interface PersonnelAssignment {
  id: string;
  personnel_id: string;
  project_id: string;
  salary_share_percent: number | null;
  salary_share_amount: number | null;
  is_active: boolean;
}

export function usePersonnel() {
  const { user } = useUser();
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [assignments, setAssignments] = useState<PersonnelAssignment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    const [{ data: p }, { data: a }] = await Promise.all([
      supabase.from("personnel" as any).select("*").order("full_name"),
      supabase.from("personnel_project_assignments" as any).select("*"),
    ]);
    setPersonnel((p as any) ?? []);
    setAssignments((a as any) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const upsertPerson = async (
    input: Partial<Personnel> & { full_name: string; employment_type: EmploymentType },
    projectIds: string[] = [],
    salaryShares?: Record<string, number>, // projectId -> percent
  ) => {
    if (!user) return null;
    const payload: any = {
      user_id: user.id,
      full_name: input.full_name.trim(),
      phone: input.phone?.trim() || null,
      occupation: input.occupation?.trim() || null,
      title: input.title?.trim() || null,
      employment_type: input.employment_type,
      daily_wage: input.employment_type === "daily_wage" ? Number(input.daily_wage ?? 0) : 0,
      monthly_salary: input.employment_type === "monthly_salary" ? Number(input.monthly_salary ?? 0) : 0,
      subcontractor_id: input.employment_type === "subcontractor_crew" ? input.subcontractor_id ?? null : null,
      is_active: input.is_active ?? true,
      note: input.note ?? null,
    };
    let id = input.id;
    if (id) {
      const { error } = await supabase.from("personnel" as any).update(payload).eq("id", id);
      if (error) { toast.error("Kişi güncellenemedi"); return null; }
    } else {
      const { data, error } = await supabase.from("personnel" as any).insert(payload).select("id").single();
      if (error) { toast.error("Kişi eklenemedi: " + error.message); return null; }
      id = (data as any).id;
    }
    // Sync assignments
    if (id) {
      await supabase.from("personnel_project_assignments" as any).delete().eq("personnel_id", id);
      if (projectIds.length > 0) {
        const rows = projectIds.map((pid) => ({
          user_id: user.id,
          personnel_id: id,
          project_id: pid,
          salary_share_percent: salaryShares?.[pid] ?? (projectIds.length === 1 ? 100 : Math.round(100 / projectIds.length)),
        }));
        await supabase.from("personnel_project_assignments" as any).insert(rows);
      }
    }
    toast.success("Kaydedildi");
    await fetchAll();
    return id;
  };

  const deletePerson = async (id: string) => {
    const { error } = await supabase.from("personnel" as any).delete().eq("id", id);
    if (error) { toast.error("Silinemedi"); return false; }
    toast.success("Silindi");
    await fetchAll();
    return true;
  };

  return { personnel, assignments, loading, refetch: fetchAll, upsertPerson, deletePerson };
}
