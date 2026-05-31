import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";
import { toast } from "sonner";

export type AttendanceStatus = "full_day" | "half_day" | "absent" | "leave";

export const STATUS_LABELS: Record<AttendanceStatus, string> = {
  full_day: "Tam Gün",
  half_day: "Yarım Gün",
  absent: "Gelmedi",
  leave: "İzinli",
};

export const STATUS_SHORT: Record<AttendanceStatus, string> = {
  full_day: "T",
  half_day: "Y",
  absent: "—",
  leave: "İ",
};

export const STATUS_COLORS: Record<AttendanceStatus, string> = {
  full_day: "bg-green-500/20 text-green-400 border-green-500/40",
  half_day: "bg-yellow-500/20 text-yellow-400 border-yellow-500/40",
  absent: "bg-red-500/15 text-red-400 border-red-500/30",
  leave: "bg-blue-500/15 text-blue-400 border-blue-500/30",
};

export interface AttendanceRecord {
  id: string;
  personnel_id: string;
  project_id: string;
  work_date: string;
  status: AttendanceStatus;
  source: "manual" | "qr";
}

export interface UnmatchedQR {
  worker_attendance_id: string;
  user_id: string;
  project_id: string;
  full_name: string;
  phone: string | null;
  occupation: string | null;
  title: string | null;
  check_in: string;
  entry_type: string;
}

export const STATUS_CYCLE: AttendanceStatus[] = ["full_day", "half_day", "absent", "leave"];

export function nextStatus(s: AttendanceStatus | undefined): AttendanceStatus {
  if (!s) return "full_day";
  const i = STATUS_CYCLE.indexOf(s);
  return STATUS_CYCLE[(i + 1) % STATUS_CYCLE.length];
}

export function useAttendanceGrid(projectId: string | null, month: Date) {
  const { user } = useUser();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [unmatched, setUnmatched] = useState<UnmatchedQR[]>([]);
  const [loading, setLoading] = useState(false);

  const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
  const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  const daysInMonth = monthEnd.getDate();
  const isoStart = monthStart.toISOString().slice(0, 10);
  const isoEnd = monthEnd.toISOString().slice(0, 10);

  const fetchGrid = useCallback(async () => {
    if (!projectId || !user) return;
    setLoading(true);
    const [{ data: ar }, { data: um }] = await Promise.all([
      supabase.from("attendance_records" as any)
        .select("*")
        .eq("project_id", projectId)
        .gte("work_date", isoStart)
        .lte("work_date", isoEnd),
      supabase.from("unmatched_qr_checkins" as any)
        .select("*")
        .eq("project_id", projectId)
        .gte("check_in", isoStart)
        .order("check_in", { ascending: false }),
    ]);
    setRecords((ar as any) ?? []);
    setUnmatched((um as any) ?? []);
    setLoading(false);
  }, [projectId, isoStart, isoEnd, user]);

  useEffect(() => { fetchGrid(); }, [fetchGrid]);

  const setCell = async (personnelId: string, date: string, status: AttendanceStatus) => {
    if (!projectId) return;
    const { error } = await supabase.rpc("bulk_upsert_attendance" as any, {
      _records: [{ personnel_id: personnelId, project_id: projectId, work_date: date, status }],
    } as any);
    if (error) { toast.error("Kaydedilemedi"); return; }
    await fetchGrid();
  };

  return { records, unmatched, loading, refetch: fetchGrid, setCell, daysInMonth, monthStart };
}

export interface LaborCostSummary {
  month: string;
  daily_wage_cost: number;
  monthly_salary_cost: number;
  total_cost: number;
  daily_wage_count: number;
  monthly_salary_count: number;
  subcontractor_crew_count: number;
  subcontractor_crew_days: number;
}

export function useLaborCost(projectId: string | null, month: Date) {
  const [data, setData] = useState<LaborCostSummary | null>(null);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    const monthIso = new Date(month.getFullYear(), month.getMonth(), 1).toISOString().slice(0, 10);
    const { data: res, error } = await supabase.rpc("compute_project_labor_cost" as any, {
      _project: projectId, _month: monthIso,
    } as any);
    if (!error) setData(res as any);
    setLoading(false);
  }, [projectId, month]);

  useEffect(() => { fetch(); }, [fetch]);
  return { data, loading, refetch: fetch };
}
