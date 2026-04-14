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

  const refreshWorkers = async (projectId: string) => {
    const { data: workers } = await supabase
      .from("worker_attendance")
      .select("*")
      .eq("project_id", projectId)
      .gte("check_in", todayStart())
      .order("check_in", { ascending: false });
    if (workers) setTodayWorkers(workers as unknown as WorkerAttendance[]);
  };

  useEffect(() => {
    if (!token) return;
    const validate = async () => {
      setLoading(true);
      const { data, error: err } = await supabase
        .from("project_qr_codes")
        .select("project_id, user_id, expires_at")
        .eq("token", token)
        .limit(1);
      if (err || !data || data.length === 0) {
        setError("Geçersiz veya süresi dolmuş QR kod");
        setLoading(false);
        return;
      }
      const qr = data[0] as unknown as { project_id: string; user_id: string; expires_at: string };
      if (new Date(qr.expires_at) < new Date()) {
        setError("Bu QR kodun süresi dolmuş. Lütfen şantiye yöneticinize başvurun.");
        setLoading(false);
        return;
      }

      // Fetch project name via security definer function
      let projectName: string | undefined;
      try {
        const { data: nameData } = await supabase.rpc("get_project_name_by_qr_token", { _token: token });
        if (nameData) projectName = nameData as string;
      } catch {}

      setProjectInfo({ project_id: qr.project_id, user_id: qr.user_id, project_name: projectName });
      await refreshWorkers(qr.project_id);
      setLoading(false);
    };
    validate();
  }, [token]);

  const checkInIndividual = async (data: { full_name: string; title: string }) => {
    if (!projectInfo) return false;
    // Rate limiting: 5 min
    const fiveMinAgo = new Date(Date.now() - 5 * 60000).toISOString();
    const { data: recent } = await supabase
      .from("worker_attendance")
      .select("id")
      .eq("project_id", projectInfo.project_id)
      .eq("full_name", data.full_name)
      .eq("entry_type", "individual")
      .is("check_out", null)
      .gte("check_in", fiveMinAgo);
    if (recent && recent.length > 0) {
      toast.error("5 dakika içinde tekrar giriş yapamazsınız.");
      return false;
    }

    const { error } = await supabase.from("worker_attendance").insert({
      project_id: projectInfo.project_id,
      user_id: projectInfo.user_id,
      qr_token: token,
      full_name: data.full_name,
      title: data.title,
      occupation: data.title,
      entry_type: "individual",
      team_size: 1,
    });
    if (error) { toast.error("Giriş kaydedilemedi"); return false; }
    await refreshWorkers(projectInfo.project_id);
    return true;
  };

  const checkInTeam = async (data: { foreman_name: string; occupation: string; team_size: number }) => {
    if (!projectInfo) return false;
    const fiveMinAgo = new Date(Date.now() - 5 * 60000).toISOString();
    const { data: recent } = await supabase
      .from("worker_attendance")
      .select("id")
      .eq("project_id", projectInfo.project_id)
      .eq("foreman_name", data.foreman_name)
      .eq("entry_type", "team")
      .is("check_out", null)
      .gte("check_in", fiveMinAgo);
    if (recent && recent.length > 0) {
      toast.error("5 dakika içinde tekrar ekip girişi yapamazsınız.");
      return false;
    }

    const { error } = await supabase.from("worker_attendance").insert({
      project_id: projectInfo.project_id,
      user_id: projectInfo.user_id,
      qr_token: token,
      full_name: data.foreman_name,
      foreman_name: data.foreman_name,
      occupation: data.occupation,
      entry_type: "team",
      team_size: data.team_size,
    });
    if (error) { toast.error("Ekip girişi kaydedilemedi"); return false; }
    await refreshWorkers(projectInfo.project_id);
    return true;
  };

  const checkOut = async (attendanceId: string) => {
    const now = new Date();
    const { data: record } = await supabase
      .from("worker_attendance")
      .select("check_in")
      .eq("id", attendanceId)
      .single();
    if (!record) { toast.error("Kayıt bulunamadı"); return false; }
    const checkInTime = new Date((record as any).check_in);
    const durationMin = Math.round((now.getTime() - checkInTime.getTime()) / 60000);

    const { error } = await supabase
      .from("worker_attendance")
      .update({ check_out: now.toISOString(), duration_minutes: durationMin })
      .eq("id", attendanceId);
    if (error) { toast.error("Çıkış kaydedilemedi"); return false; }

    setTodayWorkers(prev => prev.map(w => w.id === attendanceId
      ? { ...w, check_out: now.toISOString(), duration_minutes: durationMin } : w));
    return true;
  };

  return { projectInfo, todayWorkers, loading, error, checkInIndividual, checkInTeam, checkOut };
};
