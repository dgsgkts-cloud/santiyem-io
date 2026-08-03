import { RefObject } from "react";
import { Upload, FileText, FileDown, Trash2 } from "lucide-react";
import { SectionCard } from "@/components/ui/responsive";
import { SmartDocumentsFolders } from "../ProjectCockpit";
import { openSignedStorageUrl } from "@/lib/storage/signedUrls";
import { toast } from "sonner";

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / 1048576).toFixed(1) + " MB";
};

interface FileRow {
  id: string;
  file_name: string;
  file_size: number;
  file_url: string;
  created_at: string;
}

interface Props {
  canEdit: boolean;
  loading: boolean;
  uploading: boolean;
  files: FileRow[];
  fileInputRef: RefObject<HTMLInputElement>;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRequestDelete: (id: string, name: string, url: string) => void;
}

async function openFile(url: string) {
  const ok = await openSignedStorageUrl("project-files", url);
  if (!ok) toast.error("Dosya açılamadı");
}

export default function ProjectFilesSection(p: Props) {
  return (
    <SectionCard
      title="Dosya Ekleri"
      action={
        p.canEdit && (
          <>
            <input ref={p.fileInputRef} type="file" className="hidden" onChange={p.onFileChange} />
            <button
              onClick={() => p.fileInputRef.current?.click()}
              disabled={p.uploading}
              className="flex items-center gap-1.5 px-3 min-h-[36px] rounded-lg text-fs-xs font-semibold text-white disabled:opacity-50"
              style={{ backgroundColor: "#FF6B2B" }}
            >
              <Upload className="w-3.5 h-3.5" /> {p.uploading ? "Yükleniyor..." : "Dosya Yükle"}
            </button>
          </>
        )
      }
    >
      <div className="mb-4">
        <SmartDocumentsFolders files={p.files as any} onOpen={(f) => openFile(f.file_url)} />
      </div>

      {p.loading ? (
        <p className="text-fs-xs text-muted-foreground">Yükleniyor...</p>
      ) : p.files.length === 0 ? (
        <div className="text-center py-8">
          <FileText className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-fs-sm text-muted-foreground">Henüz dosya eklenmemiş</p>
        </div>
      ) : (
        <div className="space-y-2">
          {p.files.map(f => (
            <div key={f.id} className="flex items-center gap-3 p-3 rounded-lg bg-background border border-border">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                style={{ backgroundColor: "rgba(255,107,43,0.1)" }}
              >
                <FileText className="w-4 h-4" style={{ color: "#FF6B2B" }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-fs-sm font-medium truncate text-foreground">{f.file_name}</p>
                <p className="text-fs-xs text-muted-foreground">
                  {formatBytes(f.file_size)} · {new Date(f.created_at).toLocaleDateString("tr-TR")}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => openFile(f.file_url)}
                  aria-label="İndir"
                  className="w-9 h-9 rounded flex items-center justify-center text-muted-foreground hover:text-foreground"
                >
                  <FileDown className="w-3.5 h-3.5" />
                </button>
                {p.canEdit && (
                  <button
                    onClick={() => p.onRequestDelete(f.id, f.file_name, f.file_url)}
                    className="w-9 h-9 rounded flex items-center justify-center text-muted-foreground hover:text-destructive"
                    aria-label="Sil"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}
