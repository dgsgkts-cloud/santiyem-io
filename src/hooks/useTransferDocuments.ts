// DEPO — transfer belgeleri (özel depolama + sunucu kontrollü metadata).
//
// Dosya "transfer-documents" özel kovasına yüklenir; kayıt yalnızca
// register_transfer_document / delete_transfer_document sunucu fonksiyonları ile
// oluşturulur veya arşivlenir. İstemcinin tablo üzerinde INSERT/UPDATE/DELETE
// yetkisi yoktur, bu yüzden tür/boyut/yetki kontrolleri atlanamaz.

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";
import { openSignedStorageUrl } from "@/lib/storage/signedUrls";

const db = supabase as any;

export const TRANSFER_DOC_BUCKET = "transfer-documents" as const;
export const MAX_TRANSFER_DOC_BYTES = 20 * 1024 * 1024;
export const ALLOWED_TRANSFER_DOC_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type TransferDocType = "dispatch_note" | "receipt_note" | "photo" | "other";

export const TRANSFER_DOC_TYPE_LABEL: Record<TransferDocType, string> = {
  dispatch_note: "Sevk irsaliyesi",
  receipt_note: "Teslim tutanağı",
  photo: "Fotoğraf",
  other: "Diğer belge",
};

export interface TransferDocumentRow {
  id: string;
  user_id: string;
  transfer_id: string;
  doc_type: TransferDocType;
  file_name: string;
  file_path: string;
  mime_type: string;
  file_size: number;
  uploaded_by: string | null;
  created_at: string;
}

/** Türkçe karakterleri ve boşlukları temizler; depolama yolları güvenli kalır. */
export const sanitizeFileName = (name: string): string => {
  const tr: Record<string, string> = {
    ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u",
    Ç: "c", Ğ: "g", İ: "i", Ö: "o", Ş: "s", Ü: "u",
  };
  const safe = name
    .replace(/[çğıöşüÇĞİÖŞÜ]/g, (c) => tr[c] || c)
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9.\-_]/g, "")
    .replace(/-{2,}/g, "-");
  return safe.length > 0 ? safe.slice(0, 120) : "belge";
};

export const fmtFileSize = (bytes: number): string => {
  if (!Number.isFinite(bytes) || bytes <= 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

/** Uzantı ↔ MIME eşlemesi — sunucudaki kontrolün aynısı. */
export const MIME_EXTENSIONS: Record<string, string[]> = {
  "application/pdf": ["pdf"],
  "image/jpeg": ["jpg", "jpeg"],
  "image/png": ["png"],
  "image/webp": ["webp"],
};

export const fileExtension = (name: string): string => {
  const m = /\.([A-Za-z0-9]+)$/.exec(name.trim());
  return m ? m[1].toLowerCase() : "";
};

/** İstemci tarafı ön kontrol; asıl doğrulama sunucudadır. */
export const validateTransferFile = (file: File): string | null => {
  if (!(ALLOWED_TRANSFER_DOC_TYPES as readonly string[]).includes(file.type)) {
    return "Yalnızca PDF, JPG, PNG ve WEBP dosyaları yüklenebilir.";
  }
  if (file.size <= 0) return "Dosya boş görünüyor.";
  if (file.size > MAX_TRANSFER_DOC_BYTES) return "Dosya boyutu 20 MB'ı aşamaz.";
  const ext = fileExtension(file.name);
  if (!ext) return "Dosya adında uzantı bulunmuyor.";
  if (!MIME_EXTENSIONS[file.type].includes(ext)) {
    return "Dosya uzantısı dosya türü ile uyuşmuyor.";
  }
  if (/[\u0000-\u001f/\\]/.test(file.name)) return "Dosya adı geçersiz karakter içeriyor.";
  return null;
};

/** Aynı ad, tür ve boyuttaki aktif belge ikinci kez kaydedilemez. */
export const isDuplicateDocument = (
  documents: { file_name: string; file_size: number; doc_type: string }[],
  file: { name: string; size: number },
  docType: string,
): boolean =>
  documents.some(
    (d) =>
      d.doc_type === docType &&
      d.file_size === file.size &&
      d.file_name.toLocaleLowerCase("tr") === file.name.trim().toLocaleLowerCase("tr"),
  );


export const useTransferDocuments = (transferId: string | undefined, ownerId?: string | null) => {
  const { user } = useUser();
  const qc = useQueryClient();

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["transfer_documents", transferId] });
    qc.invalidateQueries({ queryKey: ["inventory_transfer_events"] });
  };

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["transfer_documents", transferId],
    queryFn: async (): Promise<TransferDocumentRow[]> => {
      const { data, error } = await db
        .from("inventory_transfer_documents")
        .select("*")
        .eq("transfer_id", transferId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r: any) => ({ ...r, file_size: Number(r.file_size) }));
    },
    enabled: !!user && !!transferId,
  });

  const upload = useMutation({
    mutationFn: async ({ file, docType }: { file: File; docType: TransferDocType }) => {
      if (!transferId) throw new Error("Transfer kaydı bulunamadı.");
      const owner = ownerId ?? user?.id;
      if (!owner) throw new Error("Oturum bulunamadı.");

      const clientError = validateTransferFile(file);
      if (clientError) throw new Error(clientError);

      const path = `${owner}/${transferId}/${Date.now()}_${sanitizeFileName(file.name)}`;
      const { error: upErr } = await supabase.storage
        .from(TRANSFER_DOC_BUCKET)
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) throw new Error("Dosya yüklenemedi: " + upErr.message);

      const { error: rpcErr } = await db.rpc("register_transfer_document", {
        _transfer_id: transferId,
        _file_path: path,
        _file_name: file.name,
        _mime_type: file.type,
        _file_size: file.size,
        _doc_type: docType,
      });
      if (rpcErr) {
        // Metadata reddedildiyse yüklenen dosyayı bırakmayız.
        await supabase.storage.from(TRANSFER_DOC_BUCKET).remove([path]);
        throw new Error(rpcErr.message);
      }
      return path;
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async ({ doc, reason }: { doc: TransferDocumentRow; reason?: string }) => {
      const { error } = await db.rpc("delete_transfer_document", {
        _document_id: doc.id,
        _reason: reason ?? null,
      });
      if (error) throw new Error(error.message);
      await supabase.storage.from(TRANSFER_DOC_BUCKET).remove([doc.file_path]);
      return true;
    },
    onSuccess: invalidate,
  });

  const open = (doc: TransferDocumentRow) => openSignedStorageUrl(TRANSFER_DOC_BUCKET, doc.file_path);

  return { documents, isLoading, upload, remove, open };
};
