import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";
import { toast } from "sonner";

export interface Document {
  id: string;
  name: string;
  file_size: number;
  page_count: number;
  status: string;
  created_at: string;
}

export const useDocuments = () => {
  const { user } = useUser();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const fetchDocuments = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("documents")
      .select("id, name, file_size, page_count, status, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setDocuments(data);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const uploadDocument = async (file: File) => {
    if (!user) return;
    if (file.type !== "application/pdf") {
      toast.error("Sadece PDF dosyaları desteklenmektedir.");
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      toast.error("Dosya boyutu 50MB'ı aşamaz.");
      return;
    }

    setUploading(true);
    try {
      const filePath = `${user.id}/${Date.now()}_${file.name}`;
      
      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(filePath, file);

      if (uploadError) {
        throw new Error("Dosya yüklenemedi: " + uploadError.message);
      }

      // Create document record
      const { data: doc, error: docError } = await supabase
        .from("documents")
        .insert({
          user_id: user.id,
          name: file.name,
          file_size: file.size,
          file_path: filePath,
          status: "processing",
        })
        .select("id")
        .single();

      if (docError || !doc) {
        throw new Error("Belge kaydı oluşturulamadı");
      }

      toast.info("Belge işleniyor...");
      await fetchDocuments();

      // Trigger processing
      const { data: session } = await supabase.auth.getSession();
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-document`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ documentId: doc.id }),
        }
      );

      if (resp.ok) {
        toast.success("Belge hazır, AI artık bu belgeden cevap verebilir");
      } else {
        const errData = await resp.json().catch(() => ({}));
        toast.error(errData.error || "Belge işlenirken hata oluştu");
      }
      
      await fetchDocuments();
    } catch (e: any) {
      toast.error(e.message || "Yükleme hatası");
    } finally {
      setUploading(false);
    }
  };

  const deleteDocument = async (id: string) => {
    if (!user) return;
    
    // Get file path first
    const { data: doc } = await supabase
      .from("documents")
      .select("file_path")
      .eq("id", id)
      .single();

    // Delete chunks (cascade should handle this, but let's be safe)
    await supabase.from("document_chunks").delete().eq("document_id", id);
    
    // Delete document record
    await supabase.from("documents").delete().eq("id", id);
    
    // Delete from storage
    if (doc?.file_path) {
      await supabase.storage.from("documents").remove([doc.file_path]);
    }

    toast.success("Belge silindi");
    await fetchDocuments();
  };

  const activeCount = documents.filter(d => d.status === "active").length;

  return {
    documents,
    loading,
    uploading,
    uploadDocument,
    deleteDocument,
    fetchDocuments,
    activeCount,
  };
};
