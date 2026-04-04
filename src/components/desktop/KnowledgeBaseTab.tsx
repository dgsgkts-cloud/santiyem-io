import { useState, useRef } from "react";
import { Upload, FileText, Trash2, CheckCircle, Loader2, AlertCircle, BookOpen } from "lucide-react";
import { useDocuments, Document } from "@/hooks/useDocuments";
import DeleteConfirmModal from "@/components/DeleteConfirmModal";

const SUGGESTED_DOCS = [
  { name: "TBDY 2018", desc: "Türkiye Bina Deprem Yönetmeliği" },
  { name: "TS 500", desc: "Betonarme Yapıların Tasarım Kuralları" },
  { name: "TS 825", desc: "Binalarda Isı Yalıtım Kuralları" },
  { name: "İmar Yönetmeliği", desc: "Planlı Alanlar İmar Yönetmeliği" },
  { name: "Birim Fiyat Listesi 2025", desc: "Çevre ve Şehircilik Bakanlığı Birim Fiyatları" },
  { name: "EKB/BEP-TR Kılavuzu", desc: "Enerji Kimlik Belgesi Kılavuzu" },
];

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
};

const statusConfig: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  active: { label: "Aktif", color: "#22C55E", icon: CheckCircle },
  processing: { label: "İşleniyor", color: "#F59E0B", icon: Loader2 },
  error: { label: "Hata", color: "#EF4444", icon: AlertCircle },
};

const KnowledgeBaseTab = () => {
  const { documents, loading, uploading, uploadDocument, deleteDocument } = useDocuments();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadDocument(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadDocument(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const uploadedNames = documents.map(d => d.name.replace(".pdf", "").toLowerCase());

  return (
    <div className="space-y-6">
      <DeleteConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (deleteTarget) await deleteDocument(deleteTarget.id);
        }}
        title="Belgeyi Sil"
        itemName={deleteTarget?.name}
      />
      <div>
        <h3 className="text-[15px] lg:text-[16px] font-semibold mb-1 text-foreground">
          📚 AI Bilgi Bankası
        </h3>
        <p className="text-[11px] lg:text-[12px]" style={{ color: "#64748B" }}>
          Yüklediğiniz belgeler AI'ın cevaplarına kaynaklık eder. AI, soru sorulduğunda önce bu belgelerde arama yapar.
        </p>
      </div>

      {/* Upload area */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className="rounded-xl p-6 flex flex-col items-center gap-3 cursor-pointer transition-all duration-200"
        style={{
          border: `2px dashed ${dragOver ? "#FF6B2B" : "#1E2732"}`,
          backgroundColor: dragOver ? "rgba(255,107,43,0.05)" : "#0F1419",
        }}
      >
        {uploading ? (
          <>
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#FF6B2B" }} />
            <p className="text-[13px] font-medium text-foreground">Belge yükleniyor ve işleniyor...</p>
          </>
        ) : (
          <>
            <Upload className="w-8 h-8" style={{ color: "#64748B" }} />
            <p className="text-[13px] font-medium text-foreground">PDF belgesi sürükleyin veya tıklayın</p>
            <p className="text-[11px]" style={{ color: "#64748B" }}>Sadece PDF, maksimum 50MB</p>
          </>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Uploaded documents */}
      {documents.length > 0 && (
        <div>
          <p className="text-[12px] font-semibold uppercase mb-3" style={{ color: "#94A3B8" }}>
            Yüklü Belgeler ({documents.length})
          </p>
          <div className="space-y-2">
            {documents.map((doc) => {
              const status = statusConfig[doc.status] || statusConfig.error;
              const StatusIcon = status.icon;
              return (
                <div
                  key={doc.id}
                  className="rounded-lg p-3 flex items-center gap-3 bg-background border border-border"
                >
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: "rgba(255,107,43,0.1)" }}>
                    <FileText className="w-5 h-5" style={{ color: "#FF6B2B" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium truncate text-foreground">
                      {doc.name}
                      {(doc as any).is_global && (
                        <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: "rgba(59,130,246,0.1)", color: "#60A5FA" }}>Sistem</span>
                      )}
                    </p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-[11px]" style={{ color: "#64748B" }}>{formatFileSize(doc.file_size)}</span>
                      {doc.page_count > 0 && (
                        <span className="text-[11px]" style={{ color: "#64748B" }}>{doc.page_count} sayfa</span>
                      )}
                      <span className="text-[11px]" style={{ color: "#64748B" }}>
                        {new Date(doc.created_at).toLocaleDateString("tr-TR")}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className="flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md"
                      style={{ backgroundColor: `${status.color}15`, color: status.color }}
                    >
                      <StatusIcon className={`w-3 h-3 ${doc.status === "processing" ? "animate-spin" : ""}`} />
                      {status.label}
                    </span>
                    {!(doc as any).is_global && (
                      <button
                        onClick={() => setDeleteTarget({ id: doc.id, name: doc.name })}
                        className="p-1.5 rounded-lg transition-colors"
                        style={{ color: "#64748B" }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = "#EF4444"; e.currentTarget.style.backgroundColor = "rgba(239,68,68,0.1)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = "#64748B"; e.currentTarget.style.backgroundColor = "transparent"; }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Suggested documents */}
      <div>
        <p className="text-[12px] font-semibold uppercase mb-3" style={{ color: "#94A3B8" }}>
          Önerilen Belgeler
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {SUGGESTED_DOCS.map((doc) => {
            const isUploaded = uploadedNames.some(n => doc.name.toLowerCase().includes(n) || n.includes(doc.name.toLowerCase()));
            return (
              <div
                key={doc.name}
                className="rounded-lg p-3 flex items-center gap-3"
                style={{
                  backgroundColor: isUploaded ? "rgba(34,197,94,0.05)" : "#0F1419",
                  border: `1px solid ${isUploaded ? "rgba(34,197,94,0.2)" : "#1E2732"}`,
                  opacity: isUploaded ? 1 : 0.6,
                }}
              >
                <BookOpen className="w-4 h-4 shrink-0" style={{ color: isUploaded ? "#22C55E" : "#64748B" }} />
                <div className="min-w-0">
                  <p className="text-[12px] font-medium truncate" style={{ color: isUploaded ? "#F1F5F9" : "#94A3B8" }}>
                    {isUploaded ? "✅" : "⬜"} {doc.name}
                  </p>
                  <p className="text-[10px]" style={{ color: "#64748B" }}>{doc.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default KnowledgeBaseTab;
