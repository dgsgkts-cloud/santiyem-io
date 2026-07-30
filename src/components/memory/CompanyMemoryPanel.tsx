import { useState } from "react";
import { Pin, PinOff, Trash2, Plus, Brain, Search } from "lucide-react";
import { useCompanyMemory, type MemoryType, type CompanyMemory } from "@/hooks/useCompanyMemory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import DeleteConfirmModal from "@/components/DeleteConfirmModal";

const TYPES: { value: MemoryType; label: string }[] = [
  { value: "company", label: "Şirket" },
  { value: "project", label: "Proje" },
  { value: "personnel", label: "Personel" },
  { value: "supplier", label: "Tedarikçi" },
  { value: "decision", label: "Karar" },
  { value: "preference", label: "Tercih" },
  { value: "other", label: "Diğer" },
];

const typeLabel = (t: MemoryType) => TYPES.find((x) => x.value === t)?.label ?? t;

export default function CompanyMemoryPanel() {
  const { memories, loading, upsert, pin, forget, search } = useCompanyMemory();
  const [type, setType] = useState<MemoryType>("company");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CompanyMemory[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CompanyMemory | null>(null);

  const handleAdd = async () => {
    if (!content.trim()) return;
    setSaving(true);
    try {
      await upsert({ type, title: title || null, content });
      setTitle(""); setContent("");
    } finally {
      setSaving(false);
    }
  };

  const runSearch = async () => {
    if (!query.trim()) { setResults(null); return; }
    setSearching(true);
    try { setResults(await search(query)); } finally { setSearching(false); }
  };

  const list = results ?? memories;

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      <DeleteConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => { if (deleteTarget) await forget(deleteTarget.id); }}
        title="Hafızadan Sil"
        itemName={deleteTarget?.title || deleteTarget?.content?.slice(0, 60)}
      />

      <div className="flex items-center gap-2">
        <Brain className="w-5 h-5 text-primary" />
        <div>
          <h1 className="text-lg font-semibold text-foreground">Şirket Hafızası</h1>
          <p className="text-xs text-muted-foreground">
            AI'ın uzun vadede hatırladığı iş bilgileri — tercihler, kararlar, kişiler, tedarikçiler.
          </p>
        </div>
      </div>

      <Card className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          <h2 className="text-sm font-semibold">Yeni Hafıza Ekle</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <Select value={type} onValueChange={(v) => setType(v as MemoryType)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input
            placeholder="Başlık (opsiyonel)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="md:col-span-2"
          />
        </div>
        <Textarea
          placeholder="Hafızaya eklenecek bilgi… ör. 'Aylık özet raporları tercih ediyoruz.'"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={3}
        />
        <div className="flex justify-end">
          <Button onClick={handleAdd} disabled={saving || !content.trim()}>
            {saving ? "Kaydediliyor…" : "Kaydet"}
          </Button>
        </div>
      </Card>

      <Card className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4" />
          <h2 className="text-sm font-semibold">Semantik Arama</h2>
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Hafızada ara… ör. 'nakit akışı tercihi'"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && runSearch()}
          />
          <Button variant="outline" onClick={runSearch} disabled={searching}>
            {searching ? "…" : "Ara"}
          </Button>
          {results && (
            <Button variant="ghost" onClick={() => { setResults(null); setQuery(""); }}>
              Temizle
            </Button>
          )}
        </div>
      </Card>

      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-foreground">
          {results ? `Sonuçlar (${list.length})` : `Tüm Hafıza (${list.length})`}
        </h2>
        {loading && <p className="text-xs text-muted-foreground">Yükleniyor…</p>}
        {!loading && list.length === 0 && (
          <p className="text-xs text-muted-foreground py-6 text-center">
            Henüz hafıza kaydı yok. Yukarıdan ilk bilgiyi ekle.
          </p>
        )}
        {list.map((m) => (
          <Card key={m.id} className="p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <Badge variant="secondary" className="text-[10px]">{typeLabel(m.type)}</Badge>
                  {m.pinned && <Badge className="text-[10px]">📌 Sabit</Badge>}
                  <span className="text-[10px] text-muted-foreground">
                    güven {(m.confidence * 100).toFixed(0)}%
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    kaynak: {m.source}
                  </span>
                  {typeof m.similarity === "number" && (
                    <span className="text-[10px] text-primary">
                      alaka {(m.similarity * 100).toFixed(0)}%
                    </span>
                  )}
                  <span className="text-[10px] text-muted-foreground ml-auto">
                    {new Date(m.updated_at).toLocaleDateString("tr-TR")}
                  </span>
                </div>
                {m.title && <p className="text-sm font-medium text-foreground">{m.title}</p>}
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{m.content}</p>
              </div>
              <div className="flex flex-col gap-1 shrink-0">
                <Button size="icon" variant="ghost" onClick={() => pin(m.id, !m.pinned)} aria-label={m.pinned ? "Sabitlemeyi kaldır" : "Sabitle"} title={m.pinned ? "Sabitlemeyi kaldır" : "Sabitle"}>
                  {m.pinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
                </Button>
                <Button size="icon" variant="ghost" onClick={() => setDeleteTarget(m)} aria-label="Bu hafızayı unut" title="Unut">
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
