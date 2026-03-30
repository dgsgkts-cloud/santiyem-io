import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";
import { toast } from "sonner";

export interface ProjectFile {
  id: string;
  project_id: string;
  file_name: string;
  file_url: string;
  file_size: number;
  file_type: string;
  created_at: string;
}

export function useProjectFiles(projectId: string) {
  const { user } = useUser();
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const fetchFiles = async () => {
    if (!user) { setLoading(false); return; }
    const { data, error } = await supabase
      .from("project_files")
      .select("*")
      .eq("project_id", projectId)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (!error && data) setFiles(data as ProjectFile[]);
    setLoading(false);
  };

  useEffect(() => { fetchFiles(); }, [user, projectId]);

  const uploadFile = async (file: File) => {
    if (!user) return;
    setUploading(true);
    const filePath = `${user.id}/${projectId}/${Date.now()}_${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from("project-files")
      .upload(filePath, file);
    if (uploadError) { toast.error("Dosya yüklenemedi"); setUploading(false); return; }

    const { data: urlData } = supabase.storage.from("project-files").getPublicUrl(filePath);

    const { error: dbError } = await supabase.from("project_files").insert({
      user_id: user.id,
      project_id: projectId,
      file_name: file.name,
      file_url: urlData.publicUrl,
      file_size: file.size,
      file_type: file.type || "application/octet-stream",
    });
    if (dbError) { toast.error("Dosya kaydedilemedi"); setUploading(false); return; }
    toast.success("Dosya yüklendi");
    setUploading(false);
    fetchFiles();
  };

  const deleteFile = async (fileId: string, fileUrl: string) => {
    // Extract path from URL
    const urlParts = fileUrl.split("/project-files/");
    if (urlParts[1]) {
      await supabase.storage.from("project-files").remove([decodeURIComponent(urlParts[1])]);
    }
    const { error } = await supabase.from("project_files").delete().eq("id", fileId);
    if (error) { toast.error("Dosya silinemedi"); return; }
    setFiles(prev => prev.filter(f => f.id !== fileId));
  };

  return { files, loading, uploading, uploadFile, deleteFile, refetch: fetchFiles };
}
