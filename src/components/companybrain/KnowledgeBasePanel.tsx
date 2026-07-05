import { useState, useRef, useMemo, useEffect } from "react";
import {
  Upload, FileText, Trash2, CheckCircle, Loader2, AlertCircle,
  BookOpen, Search, Pin, PinOff, Clock, Tag as TagIcon, Filter,
} from "lucide-react";
import { useDocuments } from "@/hooks/useDocuments";
import { supabase } from "@/integrations/supabase/client";
import DeleteConfirmModal from "@/components/DeleteConfirmModal";
import { toast } from "sonner";

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

type ExtDoc = {
  id: string;
  name: string;
  file_size: number;
  page_count: number;
  status: string;
  created_at: string;
  pinned?: boolean;
  tags?: string[];
  doc_type?: string | null;
  supplier?: string | null;
  project_id?: string | null;
  last_used_at?: string | null;
  is_global?: boolean;
};

type SearchHit = {
  content: string;
  page_number: number;
  document_name: string;
};

type FilterMode = "all" | "pinned" | "recent";

export default function KnowledgeBasePanel() {
  const { documents, uploading, uploadDocument, deleteDocument, fetchDocuments } = useDocuments();
  const [meta, setMeta] = useState<Record<string, Partial<ExtDoc>>>({});
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<FilterMode>("all");
  const [tagFilter, setTagFilter] = useState<string>("");
  const [searching, setSearching] = useState(false);
  const [hits, setHits] = useState<SearchHit[] | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load extra metadata columns for the visible docs
  useEffect(() => {
    if (!documents.length) return;
    const ids = documents.map((d) => d.id);
    supabase
      .from("documents")
      .select("id, pinned, tags, doc_type, supplier, project_id, last_used_at")
      .in("id", ids)
      .then(({ data }) => {
        if (!data) return;
        const map: Record<string, Partial<ExtDoc>> = {};
        for (const row of data as any[]) map[row.id] = row;
        setMeta(map);
      });
  }, [documents]);

  const enriched: ExtDoc[] = useMemo(
    () => documents.map((d) => ({ ...(d as any), ...(meta[d.id] || {}) })),
    [documents, meta]
  );

  const allTags = useMemo(() => {
    const s = new Set<string>();
    for (const d of enriched) (d.tags || []).forEach((t) => s.add(t));
    return Array.from(s).sort();
  }, [enriched]);

  const filtered = useMemo(() => {
    let list = enriched;
    if (mode === "pinned") list = list.filter((d) => d.pinned);
    if (mode === "recent")
      list = [...list].sort(
        (a, b) =>
          new Date(b.last_used_at || b.created_at).getTime() -
          new Date(a.last_used_at || a.created_at).getTime()
      );
    if (tagFilter) list = list.filter((d) => (d.tags || []).includes(tagFilter));
    return list;
  }, [enriched, mode, tagFilter]);

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

  const togglePin = async (doc: ExtDoc) => {
    const next = !doc.pinned;
    setMeta((m) => ({ ...m, [doc.id]: { ...(m[doc.id] || {}), pinned: next } }));
    const { error } = await supabase.from("documents").update({ pinned: next }).eq("id", doc.id);
    if (error) {
      toast.error("Sabitleme güncellenemedi");
      setMeta((m) => ({ ...m, [doc.id]: { ...(m[doc.id] || {}), pinned: !next } }));
    } else {
      toast.success(next ? "Belge sabitlendi" : "Sabitleme kaldırıldı");
    }
  };

  const runSearch = async () => {
    if (!query.trim()) {
      setHits(null);
      return;
    }
    setSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke("search-documents", {
        body: { query },
      });
      if (error) throw error;
      setHits(data?.results || []);
    } catch (e: any) {
      toast.error("Arama başarısız: " + (e?.message || "bilinmeyen hata"));
      setHits([]);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-4 lg:p-6 space-y-5">
      <DeleteConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (deleteTarget) {
            await deleteDocument(deleteTarget.id);
            await fetchDocuments();
          }
        }}
        title="Belgeyi Sil"
        itemName={deleteTarget?.name}
      />

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            <h1 className="text-lg font-semibold text-foreground">Bilgi Tabanı</h1>
          </div>
          <p className="text-[12px] text-muted-foreground mt-1">
            Yüklediğin belgeler Şantiyem AI'ın cevaplarına kaynaklık eder. Kısa gerçekler
            Şirket Hafızasında, uzun belgeler ise Bilgi Tabanında saklanır.
          </p>
        </div>
        <div className="text-[11px] text-muted-foreground bg-muted/40 border border-border rounded-lg px-3 py-2">
          {enriched.length} belge · {enriched.filter((d) => d.pinned).length} sabitli
        </div>
      </div>

      {/* Upload */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className="rounded-xl p-6 flex flex-col items-center gap-2 cursor-pointer transition-all"
        style={{
          border: `2px dashed ${dragOver ? "hsl(var(--primary))" : "hsl(var(--border))"}`,
          backgroundColor: dragOver ? "hsl(var(--primary) / 0.05)" : "hsl(var(--card) / 0.4)",
        }}
      >
        {uploading ? (
          <>
            <Loader2 className="w-7 h-7 animate-spin text-primary" />
            <p className="text-[13px] font-medium">Belge işleniyor…</p>
          </>
        ) : (
          <>
            <Upload className="w-7 h-7 text-muted-foreground" />
            <p className="text-[13px] font-medium">PDF sürükleyin veya tıklayın</p>
            <p className="text-[11px] text-muted-foreground">
              PDF, maks 50MB · DOCX, XLSX, CSV, TXT, OCR desteği yakında
            </p>
          </>
        )}
        <input ref={fileInputRef} type="file" accept=".pdf" onChange={handleFileSelect} className="hidden" />
      </div>

      {/* Search + filters */}
      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && runSearch()}
              placeholder="Belgelerde semantik arama…"
              className="w-full pl-9 pr-3 py-2 text-[13px] rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <button
            onClick={runSearch}
            disabled={searching || !query.trim()}
            className="px-4 py-2 text-[13px] font-medium rounded-lg bg-primary text-primary-foreground disabled:opacity-50 flex items-center gap-2"
          >
            {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Ara
          </button>
          {hits !== null && (
            <button
              onClick={() => { setHits(null); setQuery(""); }}
              className="px-3 py-2 text-[12px] rounded-lg border border-border text-muted-foreground"
            >
              Temizle
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {(["all", "pinned", "recent"] as FilterMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className="px-3 py-1.5 text-[12px] rounded-full border transition-colors flex items-center gap-1.5"
              style={{
                borderColor: mode === m ? "hsl(var(--primary))" : "hsl(var(--border))",
                color: mode === m ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
                backgroundColor: mode === m ? "hsl(var(--primary) / 0.08)" : "transparent",
              }}
            >
              {m === "pinned" && <Pin className="w-3 h-3" />}
              {m === "recent" && <Clock className="w-3 h-3" />}
              {m === "all" && <Filter className="w-3 h-3" />}
              {m === "all" ? "Tümü" : m === "pinned" ? "Sabitli" : "Son Kullanılan"}
            </button>
          ))}
          {allTags.length > 0 && (
            <select
              value={tagFilter}
              onChange={(e) => setTagFilter(e.target.value)}
              className="px-2 py-1.5 text-[12px] rounded-full border border-border bg-background text-muted-foreground"
            >
              <option value="">Tüm etiketler</option>
              {allTags.map((t) => (
                <option key={t} value={t}>#{t}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Search results */}
      {hits !== null && (
        <div className="rounded-xl border border-border bg-card/40 p-4 space-y-3">
          <div className="text-[12px] font-semibold uppercase text-muted-foreground">
            Arama Sonuçları — {hits.length}
          </div>
          {hits.length === 0 ? (
            <p className="text-[13px] text-muted-foreground">Eşleşme bulunamadı.</p>
          ) : (
            hits.map((h, i) => (
              <div key={i} className="rounded-lg border border-border p-3 bg-background">
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground mb-1">
                  <FileText className="w-3.5 h-3.5" />
                  <span className="font-medium text-foreground">{h.document_name}</span>
                  <span>· sayfa {h.page_number}</span>
                </div>
                <p className="text-[12px] leading-relaxed text-foreground/80 line-clamp-4">
                  {h.content}
                </p>
              </div>
            ))
          )}
        </div>
      )}

      {/* Document list */}
      <div>
        <p className="text-[12px] font-semibold uppercase mb-3 text-muted-foreground">
          Belgeler ({filtered.length})
        </p>
        {filtered.length === 0 ? (
          <div className="border border-dashed border-border rounded-lg p-8 text-center text-[13px] text-muted-foreground">
            Bu filtreye uyan belge yok.
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((doc) => {
              const status = statusConfig[doc.status] || statusConfig.error;
              const StatusIcon = status.icon;
              return (
                <div
                  key={doc.id}
                  className="rounded-lg p-3 flex items-center gap-3 bg-background border border-border"
                >
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-primary/10">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium truncate text-foreground flex items-center gap-2">
                      {doc.pinned && <Pin className="w-3 h-3 text-primary" />}
                      {doc.name}
                      {doc.is_global && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400">
                          Sistem
                        </span>
                      )}
                    </p>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      <span className="text-[11px] text-muted-foreground">{formatFileSize(doc.file_size)}</span>
                      {doc.page_count > 0 && (
                        <span className="text-[11px] text-muted-foreground">{doc.page_count} sayfa</span>
                      )}
                      <span className="text-[11px] text-muted-foreground">
                        {new Date(doc.created_at).toLocaleDateString("tr-TR")}
                      </span>
                      {(doc.tags || []).map((t) => (
                        <span
                          key={t}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground flex items-center gap-1"
                        >
                          <TagIcon className="w-2.5 h-2.5" /> {t}
                        </span>
                      ))}
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
                    {!doc.is_global && (
                      <>
                        <button
                          onClick={() => togglePin(doc)}
                          className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                          title={doc.pinned ? "Sabitlemeyi kaldır" : "Sabitle"}
                        >
                          {doc.pinned ? (
                            <PinOff className="w-4 h-4 text-primary" />
                          ) : (
                            <Pin className="w-4 h-4 text-muted-foreground" />
                          )}
                        </button>
                        <button
                          onClick={() => setDeleteTarget({ id: doc.id, name: doc.name })}
                          className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
