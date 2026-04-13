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
      // Check if expired
      if (new Date(qr.expires_at) < new Date()) {
        // Auto-renew
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
  const [projectInfo, setProjectInfo] = useState<{ project_id: string; user_id: string } | null>(null);
  const [todayWorkers, setTodayWorkers] = useState<WorkerAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      setProjectInfo({ project_id: qr.project_id, user_id: qr.user_id });

      // fetch today's workers
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const { data: workers } = await supabase
        .from("worker_attendance")
        .select("*")
        .eq("project_id", qr.project_id)
        .gte("check_in", todayStart.toISOString())
        .order("check_in", { ascending: false });
      if (workers) setTodayWorkers(workers as unknown as WorkerAttendance[]);
      setLoading(false);
    };
    validate();
  }, [token]);

  const checkIn = async (data: { full_name: string; tc_no?: string; phone?: string; occupation: string }) => {
    if (!projectInfo) return false;

    // Rate limiting: check if same person checked in within last minute
    const oneMinAgo = new Date(Date.now() - 60000).toISOString();
    const { data: recent } = await supabase
      .from("worker_attendance")
      .select("id")
      .eq("project_id", projectInfo.project_id)
      .eq("full_name", data.full_name)
      .gte("check_in", oneMinAgo);
    if (recent && recent.length > 0) {
      toast.error("Çok kısa sürede tekrar giriş yapamazsınız. 1 dakika bekleyin.");
      return false;
    }

    const { error } = await supabase.from("worker_attendance").insert({
      project_id: projectInfo.project_id,
      user_id: projectInfo.user_id,
      qr_token: token,
      full_name: data.full_name,
      tc_no: data.tc_no || null,
      phone: data.phone || null,
      occupation: data.occupation,
    });
    if (error) { toast.error("Giriş kaydedilemedi"); return false; }
    toast.success("Giriş başarıyla kaydedildi ✅");
    // Refresh
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const { data: workers } = await supabase
      .from("worker_attendance").select("*")
      .eq("project_id", projectInfo.project_id)
      .gte("check_in", todayStart.toISOString())
      .order("check_in", { ascending: false });
    if (workers) setTodayWorkers(workers as unknown as WorkerAttendance[]);
    return true;
  };

  const checkOut = async (attendanceId: string) => {
    const now = new Date();
    // Get check_in to compute duration
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
    toast.success("Çıkış başarıyla kaydedildi 👋");

    setTodayWorkers(prev => prev.map(w => w.id === attendanceId
      ? { ...w, check_out: now.toISOString(), duration_minutes: durationMin } : w));
    return true;
  };

  return { projectInfo, todayWorkers, loading, error, checkIn, checkOut };
};
