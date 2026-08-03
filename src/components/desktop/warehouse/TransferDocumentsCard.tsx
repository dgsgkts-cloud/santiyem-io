// DEPO — transfer belgeleri kartı: yükleme, listeleme, indirme, silme.
//
// Dosyalar özel kovada tutulur; görüntüleme kısa ömürlü imzalı bağlantı ile
// yapılır. Kayıt işlemleri sunucu fonksiyonları üzerinden yürür.

import { useRef, useState } from "react";
import { Download, FileText, Image as ImageIcon, Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { SectionCard } from "@/components/ui/responsive";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  useTransferDocuments, TRANSFER_DOC_TYPE_LABEL, fmtFileSize,
  type TransferDocType, type TransferDocumentRow,
} from "@/hooks/useTransferDocuments";

interface Props {
  transferId: string;
  ownerId: string | null;
  /** Transfer kaydına girilmiş belge numaraları (irsaliye/teslim referansları). */
  references: { label: string; value: string }[];
  canManage: boolean;
}

export const TransferDocumentsCard = ({ transferId, ownerId, references, canManage }: Props) => {
  const { documents, isLoading, upload, remove, open } = useTransferDocuments(transferId, ownerId);
  const inputRef = useRef<HTMLInputElement>(null);
  const [docType, setDocType] = useState<TransferDocType>("dispatch_note");
  const [pending, setPending] = useState<TransferDocumentRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const onPick = async (file?: File | null) => {
    if (!file) return;
    try {
      await upload.mutateAsync({ file, docType });
      toast.success("Belge yüklendi.");
    } catch (e: any) {
      toast.error(e?.message ?? "Belge yüklenemedi.");
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const confirmDelete = async () => {
    if (!pending) return;
    setDeleting(true);
    // Silme işlemleri kasıtlı olarak yavaşlatılır: yanlış tıklama geri alınamaz.
    await new Promise((r) => setTimeout(r, 2000));
    try {
      await remove.mutateAsync({ doc: pending });
      toast.success("Belge silindi.");
      setPending(null);
    } catch (e: any) {
      toast.error(e?.message ?? "Belge silinemedi.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <SectionCard title="Belgeler" subtitle="Sevk irsaliyesi, teslim tutanağı ve fotoğraflar">
      {canManage && (
        <div className="flex flex-wrap items-center gap-2 pb-3">
          <Select value={docType} onValueChange={(v) => setDocType(v as TransferDocType)}>
            <SelectTrigger className="min-h-[44px] w-auto min-w-[170px]">
              <SelectValue placeholder="Belge türü" />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(TRANSFER_DOC_TYPE_LABEL) as TransferDocType[]).map((t) => (
                <SelectItem key={t} value={t}>{TRANSFER_DOC_TYPE_LABEL[t]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => onPick(e.target.files?.[0])}
          />
          <Button
            className="min-h-[44px]"
            disabled={upload.isPending}
            onClick={() => inputRef.current?.click()}
          >
            {upload.isPending
              ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Yükleniyor…</>
              : <><Upload className="w-4 h-4 mr-1.5" /> Belge Yükle</>}
          </Button>
          <p className="ds-caption text-muted-foreground">PDF, JPG, PNG, WEBP · en fazla 20 MB</p>
        </div>
      )}

      {isLoading ? (
        <p className="ds-caption text-muted-foreground">Belgeler yükleniyor…</p>
      ) : documents.length === 0 ? (
        <p className="ds-caption text-muted-foreground">
          Bu transfere yüklenmiş belge bulunmuyor.
        </p>
      ) : (
        <ul className="space-y-2">
          {documents.map((d) => (
            <li
              key={d.id}
              className="group flex items-center gap-2 rounded-card border border-border/60 bg-background/40 p-2.5 min-w-0"
            >
              {d.mime_type.startsWith("image/")
                ? <ImageIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                : <FileText className="w-4 h-4 text-muted-foreground shrink-0" />}
              <button
                type="button"
                onClick={() => open(d).then((ok) => { if (!ok) toast.error("Belge bağlantısı oluşturulamadı."); })}
                className="min-w-0 flex-1 text-left"
              >
                <p className="ds-body text-foreground truncate">{d.file_name}</p>
                <p className="ds-caption text-muted-foreground">
                  {TRANSFER_DOC_TYPE_LABEL[d.doc_type] ?? d.doc_type} · {fmtFileSize(d.file_size)}
                </p>
              </button>
              <div className="flex items-center gap-1 shrink-0">
                {/* Mobilde hover yok: indirme ve silme her zaman erişilebilir. */}
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Belgeyi indir"
                  className="min-h-[44px] min-w-[44px]"
                  onClick={() => open(d).then((ok) => { if (!ok) toast.error("Belge bağlantısı oluşturulamadı."); })}
                >
                  <Download className="w-4 h-4 text-muted-foreground" />
                </Button>
                {canManage && (
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Belgeyi sil"
                    className="min-h-[44px] min-w-[44px] opacity-100 lg:opacity-0 lg:group-hover:opacity-100 lg:focus-visible:opacity-100 transition-opacity"
                    onClick={() => setPending(d)}
                  >
                    <Trash2 className="w-4 h-4 text-rose-400" />
                  </Button>
                )}
              </div>

            </li>
          ))}
        </ul>
      )}

      {references.length > 0 && (
        <div className="pt-3 mt-3 border-t border-border/40 space-y-1.5">
          <p className="ds-caption text-muted-foreground">Belge numaraları</p>
          {references.map((r, i) => (
            <div key={`${r.label}-${i}`} className="flex items-center gap-2 min-w-0">
              <span className="ds-caption text-muted-foreground shrink-0">{r.label}:</span>
              <span className="ds-body text-foreground truncate">{r.value}</span>
            </div>
          ))}
        </div>
      )}

      <AlertDialog open={!!pending} onOpenChange={(o) => { if (!o && !deleting) setPending(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Belge silinsin mi?</AlertDialogTitle>
            <AlertDialogDescription>
              “{pending?.file_name}” transfer belgelerinden kaldırılacak. Silme işlemi
              transfer geçmişine denetim kaydı olarak yazılır.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting} className="min-h-[44px]">Vazgeç</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={(e) => { e.preventDefault(); confirmDelete(); }}
              className="min-h-[44px]"
            >
              {deleting ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Siliniyor…</> : "Sil"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SectionCard>
  );
};

export default TransferDocumentsCard;
