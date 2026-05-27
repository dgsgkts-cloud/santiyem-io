import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";
import { toast } from "sonner";

export interface WorkerAttendance {
  id: string;
  project_id: string;
  user_id: string;
  qr_token: string;
  full_name: string;
  tc_no: string | null;
  phone: string | null;
  occupation: string;
  check_in: string;
  check_out: string | null;
  duration_minutes: number | null;
  created_at: string;
  entry_type: string;
  team_size: number;
  title: string | null;
  foreman_name: string | null;
}

export interface ProjectQrCode {
  id: string;
  project_id: string;
  user_id: string;
  token: string;
  expires_at: string;
  created_at: string;
}

export const useWorkerAttendance = (projectId?: string) => {
  const { user } = useUser();
  const [attendance, setAttendance] = useState<WorkerAttendance[]>([]);
  const [qrCode, setQrCode] = useState<ProjectQrCode | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchQrCode = async () => {
    if (!projectId || !user) return;
    const { data } = await supabase
      .from("project_qr_codes")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(1);
    if (data && data.length > 0) {
      const qr = data[0] as unknown as ProjectQrCode;
      if (new Date(qr.expires_at) < new Date()) {
        await createQrCode();
      } else {
        setQrCode(qr);
      }
    }
  };

  const fetchAttendance = async () => {
    if (!projectId || !user) return;
    const { data } = await supabase
      .from("worker_attendance")
      .select("*")
      .eq("project_id", projectId)
      .order("check_in", { ascending: false });
    if (data) setAttendance(data as unknown as WorkerAttendance[]);
  };

  useEffect(() => {
    if (!projectId || !user) { setLoading(false); return; }
    setLoading(true);
    Promise.all([fetchQrCode(), fetchAttendance()]).finally(() => setLoading(false));
  }, [projectId, user]);

  const createQrCode = async () => {
    if (!projectId || !user) return null;
    const { data, error } = await supabase
      .from("project_qr_codes")
      .insert({ project_id: projectId, user_id: user.id })
      .select()
      .single();
    if (error) { toast.error("QR kod oluşturulamadı"); return null; }
    const qr = data as unknown as ProjectQrCode;
    setQrCode(qr);
    toast.success("QR kod oluşturuldu");
    return qr;
  };

  const refreshAttendance = () => fetchAttendance();

  return { attendance, qrCode, loading, createQrCode, refreshAttendance };
};

// Public hook - no auth needed
export const usePublicAttendance = (token: string) => {
  const [projectInfo, setProjectInfo] = useState<{ project_id: string; user_id: string; project_name?: string } | null>(null);
  const [todayWorkers, setTodayWorkers] = useState<WorkerAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const todayStart = () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  };

  const refreshWorkers = async (_projectId: string) => {
    const { data: workers } = await (supabase as any).rpc("list_today_workers_by_qr", { _token: token });
    if (Array.isArray(workers)) setTodayWorkers(workers as unknown as WorkerAttendance[]);
  };

  useEffect(() => {
    if (!token) return;
    const validate = async () => {
      setLoading(true);
      const { data, error: err } = await (supabase as any).rpc("validate_qr_token", { _token: token });
      const row = Array.isArray(data) ? data[0] : data;
      if (err || !row) {
        setError("Geçersiz veya süresi dolmuş QR kod");
        setLoading(false);
        return;
      }
      setProjectInfo({
        project_id: row.project_id,
        user_id: row.user_id,
        project_name: row.project_name || undefined,
      });
      await refreshWorkers(row.project_id);
      setLoading(false);
    };
    validate();
  }, [token]);

  const checkInIndividual = async (data: { full_name: string; title?: string; phone?: string }) => {
    if (!projectInfo) return false;
    const { error } = await (supabase as any).rpc("worker_check_in", {
      _token: token,
      _entry_type: "individual",
      _full_name: data.full_name,
      _title: data.title || "İşçi",
      _occupation: data.title || "İşçi",
      _foreman_name: null,
      _team_size: 1,
      _phone: data.phone || null,
    });
    if (error) {
      const msg = error.message || "";
      if (msg.includes("Rate limited")) toast.error("5 dakika içinde tekrar giriş yapamazsınız.");
      else toast.error("Giriş kaydedilemedi");
      return false;
    }
    await refreshWorkers(projectInfo.project_id);
    return true;
  };

  const checkInTeam = async (data: { foreman_name: string; occupation: string; team_size: number }) => {
    if (!projectInfo) return false;
    const { error } = await (supabase as any).rpc("worker_check_in", {
      _token: token,
      _entry_type: "team",
      _full_name: data.foreman_name,
      _title: null,
      _occupation: data.occupation,
      _foreman_name: data.foreman_name,
      _team_size: data.team_size,
    });
    if (error) {
      const msg = error.message || "";
      if (msg.includes("Rate limited")) toast.error("5 dakika içinde tekrar ekip girişi yapamazsınız.");
      else toast.error("Ekip girişi kaydedilemedi");
      return false;
    }
    await refreshWorkers(projectInfo.project_id);
    return true;
  };

  const checkOut = async (attendanceId: string) => {
    const { data: ok, error } = await (supabase as any).rpc("worker_check_out", {
      _token: token,
      _attendance_id: attendanceId,
    });
    if (error || !ok) { toast.error("Çıkış kaydedilemedi"); return false; }

    const now = new Date().toISOString();
    setTodayWorkers(prev => prev.map(w => {
      if (w.id !== attendanceId) return w;
      const dur = Math.round((Date.now() - new Date(w.check_in).getTime()) / 60000);
      return { ...w, check_out: now, duration_minutes: dur };
    }));
    return true;
  };

  return { projectInfo, todayWorkers, loading, error, checkInIndividual, checkInTeam, checkOut };
};
