import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";
import { toast } from "sonner";

export interface CrewRow { team: string; count: number; hours: number; note: string; }
export interface MaterialRow { name: string; quantity: number; unit: string; direction: string; }
export interface MachineRow { name: string; hours: number; note: string; }

export interface DiaryEntry {
  id: string;
  user_id: string;
  project_id: string;
  entry_date: string;
  weather_icon: string;
  weather_temp: number | null;
  work_status: string;
  work_stopped_reason: string | null;
  crews: CrewRow[];
  work_done: string;
  materials: MaterialRow[];
  machines: MachineRow[];
  special_events: string[];
  general_note: string;
  status: string;
  created_at: string;
  updated_at: string;
  photos?: DiaryPhoto[];
}

export interface DiaryPhoto {
  id: string;
  diary_entry_id: string;
  photo_url: string;
  description: string;
  sort_order: number;
  created_at: string;
}

export function useSiteDiary(projectId?: string) {
  const { user } = useUser();
  const qc = useQueryClient();

  const entriesQuery = useQuery({
    queryKey: ["site-diary", projectId],
    enabled: !!user && !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_diary_entries")
        .select("*")
        .eq("project_id", projectId!)
        .order("entry_date", { ascending: false });
      if (error) throw error;
      return (data || []).map((d: any) => ({
        ...d,
        crews: Array.isArray(d.crews) ? d.crews : JSON.parse(d.crews || "[]"),
        materials: Array.isArray(d.materials) ? d.materials : JSON.parse(d.materials || "[]"),
        machines: Array.isArray(d.machines) ? d.machines : JSON.parse(d.machines || "[]"),
        special_events: Array.isArray(d.special_events) ? d.special_events : JSON.parse(d.special_events || "[]"),
      })) as DiaryEntry[];
    },
  });

  const photosQuery = useQuery({
    queryKey: ["site-diary-photos", projectId],
    enabled: !!user && !!projectId,
    queryFn: async () => {
      // Get all entry IDs first, then photos
      const { data: entries } = await supabase
        .from("site_diary_entries")
        .select("id")
        .eq("project_id", projectId!);
      if (!entries || entries.length === 0) return [] as DiaryPhoto[];
      const ids = entries.map((e: any) => e.id);
      const { data, error } = await supabase
        .from("site_diary_photos")
        .select("*")
        .in("diary_entry_id", ids)
        .order("sort_order");
      if (error) throw error;
      return (data || []) as DiaryPhoto[];
    },
  });

  const createEntry = useMutation({
    mutationFn: async (entry: Omit<DiaryEntry, "id" | "user_id" | "created_at" | "updated_at" | "photos">) => {
      const { data, error } = await supabase
        .from("site_diary_entries")
        .insert({ ...entry, user_id: user!.id } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["site-diary"] }); toast.success("Günlük kaydı oluşturuldu"); },
    onError: (e: any) => toast.error(e.message || "Kayıt oluşturulamadı"),
  });

  const updateEntry = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<DiaryEntry> & { id: string }) => {
      const { error } = await supabase
        .from("site_diary_entries")
        .update(updates as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["site-diary"] }); toast.success("Kayıt güncellendi"); },
    onError: (e: any) => toast.error(e.message || "Güncelleme hatası"),
  });

  const deleteEntry = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("site_diary_entries").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["site-diary"] }); toast.success("Kayıt silindi"); },
    onError: (e: any) => toast.error(e.message || "Silme hatası"),
  });

  const uploadPhoto = async (file: File, entryId: string, description: string = "") => {
    const ext = file.name.split(".").pop();
    const path = `${user!.id}/${entryId}/${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("site-diary-photos").upload(path, file);
    if (uploadError) throw uploadError;
    const { data: urlData } = supabase.storage.from("site-diary-photos").getPublicUrl(path);
    const { error: dbError } = await supabase.from("site_diary_photos").insert({
      user_id: user!.id,
      diary_entry_id: entryId,
      photo_url: urlData.publicUrl,
      description,
    } as any);
    if (dbError) throw dbError;
    qc.invalidateQueries({ queryKey: ["site-diary-photos"] });
    return urlData.publicUrl;
  };

  const deletePhoto = async (id: string) => {
    const { error } = await supabase.from("site_diary_photos").delete().eq("id", id);
    if (error) throw error;
    qc.invalidateQueries({ queryKey: ["site-diary-photos"] });
  };

  return {
    entries: entriesQuery.data || [],
    photos: photosQuery.data || [],
    isLoading: entriesQuery.isLoading,
    createEntry,
    updateEntry,
    deleteEntry,
    uploadPhoto,
    deletePhoto,
  };
}
