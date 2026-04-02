import { useState, useRef } from "react";
import { useContracts, Contract, ContractInput } from "@/hooks/useContracts";
import { useProjects } from "@/hooks/useProjects";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  FileText, Plus, ArrowLeft, Edit2, Trash2, Upload, Bot, ChevronDown, ChevronUp,
  Calendar, DollarSign, Building2, Clock, AlertTriangle, CheckCircle2, XCircle, RefreshCw, Download, FileUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

const CONTRACT_TYPES: Record<string, string> = {
  yapim_isleri: "Yapım İşleri",
  hizmet: "Hizmet",
  danismanlik: "Danışmanlık",
  taseron: "Taşeron",
  diger: "Diğer",
};

const cardStyle = { backgroundColor: "#161C23", border: "1px solid #1E2732", borderRadius: 12 };
const inputStyle = { backgroundColor: "#0F1419", border: "1px solid #1E2732", color: "#F1F5F9" };
const labelStyle = { color: "#94A3B8" };

// Mock data for empty state
const MOCK_CONTRACTS: Contract[] = [
  {
    id: "mock-1", user_id: "", project_id: null, name: "Akdeniz Residence Yapım Sözleşmesi",
    counterparty: "ABC Yapı A.Ş.", amount: 4500000, start_date: "2024-06-01", end_date: "2025-06-01",
    contract_type: "yapim_isleri", notes: "", status: "aktif",
    ai_analysis: {
      ozet: "Akdeniz Residence yapım işleri sözleşmesi",
      kritik_maddeler: [
        { madde: "Madde 12", aciklama: "Ödeme süresi: 30 gün", onem: "bilgi" },
        { madde: "Madde 18", aciklama: "Gecikme cezası: Günlük ₺3.000", onem: "kritik" },
        { madde: "Madde 24", aciklama: "Fesih bildirimi: 15 gün önceden yazılı bildirim", onem: "uyari" },
        { madde: "Madde 31", aciklama: "Garanti süresi: 24 ay", onem: "uyari" },
      ],
      riskli_maddeler: [{ madde: "Madde 18", aciklama: "Günlük ₺3.000 gecikme cezası yüksek, toplam sözleşmenin %10'u ile sınırlı olmalı" }],
      odeme_takvimi: [],
    },
    payment_schedule: [], file_url: null, file_name: null,
    created_at: "2024-06-01T00:00:00Z", updated_at: "2024-06-01T00:00:00Z",
  },
  {
    id: "mock-2", user_id: "", project_id: null, name: "Villa Projesi Taşeron Sözleşmesi",
    counterparty: "Mehmet Usta İnşaat", amount: 380000, start_date: "2025-01-15", end_date: "2025-07-15",
    contract_type: "taseron", notes: "", status: "aktif",
    ai_analysis: null, payment_schedule: [], file_url: null, file_name: null,
    created_at: "2025-01-15T00:00:00Z", updated_at: "2025-01-15T00:00:00Z",
  },
];

function getDaysRemaining(endDate: string | null): number | null {
  if (!endDate) return null;
  return Math.ceil((new Date(endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function getStatusInfo(endDate: string | null): { label: string; color: string; bg: string } {
  const days = getDaysRemaining(endDate);
  if (days === null) return { label: "Süresiz", color: "#94A3B8", bg: "rgba(148,163,184,0.1)" };
  if (days < 0) return { label: "Sona Erdi", color: "#EF4444", bg: "rgba(239,68,68,0.1)" };
  if (days <= 30) return { label: "Süresi Yaklaşıyor", color: "#F59E0B", bg: "rgba(245,158,11,0.1)" };
  return { label: "Aktif", color: "#22C55E", bg: "rgba(34,197,94,0.1)" };
}

function formatCurrency(v: number) {
  return v.toLocaleString("tr-TR", { style: "currency", currency: "TRY", minimumFractionDigits: 0 });
}

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("tr-TR");
}

// ─── List View ───
function ContractList({ contracts, onSelect, onAdd }: { contracts: Contract[]; onSelect: (c: Contract) => void; onAdd: () => void }) {
  const now = new Date();
  const stats = {
    total: contracts.length,
    active: contracts.filter(c => !c.end_date || new Date(c.end_date) >= now).length,
    expiring: contracts.filter(c => { const d = getDaysRemaining(c.end_date); return d !== null && d > 0 && d <= 30; }).length,
    expired: contracts.filter(c => c.end_date && new Date(c.end_date) < now).length,
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "#F1F5F9" }}>Sözleşme Takibi</h1>
          <p className="text-xs mt-1" style={{ color: "#64748B" }}>Tüm sözleşmelerinizi tek ekrandan yönetin</p>
        </div>
        <Button onClick={onAdd} className="h-9 text-sm font-semibold text-white" style={{ backgroundColor: "#FF6B2B" }}>
          <Plus className="w-4 h-4 mr-1.5" /> Yeni Sözleşme Ekle
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Toplam Sözleşme", value: stats.total, color: "#94A3B8", icon: FileText },
          { label: "Aktif", value: stats.active, color: "#22C55E", icon: CheckCircle2 },
          { label: "Süresi Yaklaşan", value: stats.expiring, color: "#F59E0B", icon: AlertTriangle },
          { label: "Süresi Dolan", value: stats.expired, color: "#EF4444", icon: XCircle },
        ].map((s) => (
          <div key={s.label} className="rounded-xl p-4" style={cardStyle}>
            <div className="flex items-center gap-2 mb-2">
              <s.icon className="w-4 h-4" style={{ color: s.color }} />
              <span className="text-xs font-medium" style={{ color: "#64748B" }}>{s.label}</span>
            </div>
            <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Contract Cards */}
      {contracts.length === 0 ? (
        <div className="text-center py-16 rounded-xl" style={cardStyle}>
          <FileText className="w-12 h-12 mx-auto mb-3" style={{ color: "#334155" }} />
          <p className="text-sm font-medium" style={{ color: "#64748B" }}>Henüz sözleşme eklenmedi</p>
          <p className="text-xs mt-1" style={{ color: "#475569" }}>Yeni bir sözleşme ekleyerek başlayın</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {contracts.map((c) => {
            const status = getStatusInfo(c.end_date);
            const daysLeft = getDaysRemaining(c.end_date);
            return (
              <button
                key={c.id}
                onClick={() => onSelect(c)}
                className="text-left rounded-xl p-5 transition-all hover:border-[#2A3441]"
                style={cardStyle}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold truncate" style={{ color: "#F1F5F9" }}>{c.name}</h3>
                    <p className="text-xs mt-0.5" style={{ color: "#64748B" }}>{c.counterparty}</p>
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-1 rounded-full shrink-0 ml-2" style={{ color: status.color, backgroundColor: status.bg }}>
                    {status.label}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs" style={{ color: "#94A3B8" }}>
                  <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" />{formatCurrency(c.amount)}</span>
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDate(c.start_date)} — {formatDate(c.end_date)}</span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: "rgba(255,107,43,0.1)", color: "#FF6B2B" }}>
                    {CONTRACT_TYPES[c.contract_type] || c.contract_type}
                  </span>
                  {c.ai_analysis && <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: "rgba(59,130,246,0.1)", color: "#60A5FA" }}>🤖 AI Analiz</span>}
                </div>
                {daysLeft !== null && daysLeft > 0 && daysLeft <= 30 && (
                  <div className="mt-3 flex items-center gap-1.5 text-xs font-medium" style={{ color: "#F59E0B" }}>
                    <AlertTriangle className="w-3 h-3" /> {daysLeft} gün sonra sona eriyor
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Add/Edit Form ───
function ContractForm({ contract, onSave, onCancel }: { contract?: Contract; onSave: (input: ContractInput) => Promise<boolean>; onCancel: () => void }) {
  const { projects } = useProjects();
  const { user } = useUser();
  const fileRef = useRef<HTMLInputElement>(null);
  const pdfRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<ContractInput>({
    name: contract?.name || "",
    project_id: contract?.project_id || "",
    counterparty: contract?.counterparty || "",
    amount: contract?.amount || 0,
    start_date: contract?.start_date || "",
    end_date: contract?.end_date || "",
    contract_type: contract?.contract_type || "yapim_isleri",
    notes: contract?.notes || "",
    file_url: contract?.file_url || "",
    file_name: contract?.file_name || "",
    ai_analysis: contract?.ai_analysis || undefined,
    payment_schedule: contract?.payment_schedule || [],
  });
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [tab, setTab] = useState<"manual" | "ai">("manual");

  const handleSubmit = async () => {
    if (!form.name.trim()) { toast.error("Sözleşme adı zorunludur."); return; }
    if (!form.counterparty.trim()) { toast.error("Karşı taraf adı zorunludur."); return; }
    setSaving(true);
    const ok = await onSave(form);
    setSaving(false);
    if (ok) onCancel();
  };

  const handlePdfUpload = async (file: File) => {
    if (!user) return;
    setAnalyzing(true);
    try {
      // Upload file to storage
      const path = `${user.id}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage.from("project-files").upload(path, file);
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("project-files").getPublicUrl(path);
      setForm(f => ({ ...f, file_url: urlData.publicUrl, file_name: file.name }));

      // Extract text (simplified: read as text for AI)
      const text = await file.text();
      if (text.length < 50) {
        toast.error("PDF metni okunamadı. Lütfen bilgileri manuel girin.");
        setAnalyzing(false);
        return;
      }

      // Call AI analysis
      const { data, error } = await supabase.functions.invoke("analyze-contract", {
        body: { contractText: text },
      });

      if (error) throw error;
      if (data?.analysis) {
        const a = data.analysis;
        setForm(f => ({
          ...f,
          amount: a.tutar || f.amount,
          start_date: a.baslangic || f.start_date,
          end_date: a.bitis || f.end_date,
          counterparty: a.karsi_taraf || f.counterparty,
          contract_type: a.tur || f.contract_type,
          ai_analysis: a,
          payment_schedule: a.odeme_takvimi || [],
        }));
        toast.success("AI analizi tamamlandı! Bilgiler forma yansıtıldı.");
        setTab("manual");
      } else {
        toast.error("AI analiz sonucu alınamadı.");
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "AI analiz hatası.");
    }
    setAnalyzing(false);
  };

  const handleFileUpload = async (file: File) => {
    if (!user) return;
    const path = `${user.id}/${Date.now()}_${file.name}`;
    const { error } = await supabase.storage.from("project-files").upload(path, file);
    if (error) { toast.error("Dosya yüklenemedi."); return; }
    const { data: urlData } = supabase.storage.from("project-files").getPublicUrl(path);
    setForm(f => ({ ...f, file_url: urlData.publicUrl, file_name: file.name }));
    toast.success("Dosya yüklendi.");
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={onCancel} className="text-sm flex items-center gap-1" style={{ color: "#94A3B8" }}>
          <ArrowLeft className="w-4 h-4" /> Sözleşme Takibi
        </button>
      </div>
      <h1 className="text-lg font-bold" style={{ color: "#F1F5F9" }}>{contract ? "Sözleşme Düzenle" : "Yeni Sözleşme Ekle"}</h1>

      {/* Tab switch */}
      {!contract && (
        <div className="flex gap-2">
          <button onClick={() => setTab("manual")} className="px-4 py-2 rounded-lg text-sm font-medium transition-colors" style={{ backgroundColor: tab === "manual" ? "rgba(255,107,43,0.15)" : "#161C23", color: tab === "manual" ? "#FF6B2B" : "#94A3B8", border: "1px solid #1E2732" }}>
            ✏️ Manuel Giriş
          </button>
          <button onClick={() => setTab("ai")} className="px-4 py-2 rounded-lg text-sm font-medium transition-colors" style={{ backgroundColor: tab === "ai" ? "rgba(255,107,43,0.15)" : "#161C23", color: tab === "ai" ? "#FF6B2B" : "#94A3B8", border: "1px solid #1E2732" }}>
            🤖 PDF Yükle + AI Analiz
          </button>
        </div>
      )}

      {/* AI Upload */}
      {tab === "ai" && !contract && (
        <div
          className="rounded-xl p-8 text-center cursor-pointer transition-colors"
          style={{ ...cardStyle, border: "2px dashed #2A3441" }}
          onClick={() => !analyzing && pdfRef.current?.click()}
        >
          <input ref={pdfRef} type="file" accept=".pdf,.doc,.docx,.txt" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePdfUpload(f); }} />
          {analyzing ? (
            <>
              <div className="w-10 h-10 mx-auto mb-3 border-2 border-t-[#FF6B2B] border-[#1E2732] rounded-full animate-spin" />
              <p className="text-sm font-medium" style={{ color: "#F1F5F9" }}>AI sözleşmeyi analiz ediyor...</p>
              <p className="text-xs mt-1" style={{ color: "#64748B" }}>Bu işlem 10-30 saniye sürebilir</p>
            </>
          ) : (
            <>
              <Upload className="w-10 h-10 mx-auto mb-3" style={{ color: "#FF6B2B" }} />
              <p className="text-sm font-medium" style={{ color: "#F1F5F9" }}>Sözleşme PDF'ini yükleyin</p>
              <p className="text-xs mt-1" style={{ color: "#64748B" }}>AI otomatik analiz edip bilgileri çıkaracak</p>
              <p className="text-[10px] mt-2" style={{ color: "#475569" }}>PDF, DOC, DOCX, TXT desteklenir</p>
            </>
          )}
        </div>
      )}

      {/* Manual Form */}
      {(tab === "manual" || contract) && (
        <div className="space-y-4 rounded-xl p-5" style={cardStyle}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1" style={labelStyle}>Sözleşme Adı *</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full rounded-lg px-3 py-2.5 text-sm outline-none" style={inputStyle} placeholder="Sözleşme adı" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={labelStyle}>Proje</label>
              <select value={form.project_id} onChange={e => setForm(f => ({ ...f, project_id: e.target.value }))} className="w-full rounded-lg px-3 py-2.5 text-sm outline-none" style={inputStyle}>
                <option value="">Proje seçiniz (opsiyonel)</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={labelStyle}>Karşı Taraf *</label>
              <input value={form.counterparty} onChange={e => setForm(f => ({ ...f, counterparty: e.target.value }))} className="w-full rounded-lg px-3 py-2.5 text-sm outline-none" style={inputStyle} placeholder="Firma / kişi adı" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={labelStyle}>Sözleşme Tutarı (₺)</label>
              <input type="number" value={form.amount || ""} onChange={e => setForm(f => ({ ...f, amount: Number(e.target.value) }))} className="w-full rounded-lg px-3 py-2.5 text-sm outline-none" style={inputStyle} placeholder="0" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={labelStyle}>Başlangıç Tarihi</label>
              <input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} className="w-full rounded-lg px-3 py-2.5 text-sm outline-none" style={inputStyle} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={labelStyle}>Bitiş Tarihi</label>
              <input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} className="w-full rounded-lg px-3 py-2.5 text-sm outline-none" style={inputStyle} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={labelStyle}>Sözleşme Türü</label>
              <select value={form.contract_type} onChange={e => setForm(f => ({ ...f, contract_type: e.target.value }))} className="w-full rounded-lg px-3 py-2.5 text-sm outline-none" style={inputStyle}>
                {Object.entries(CONTRACT_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={labelStyle}>Belge Yükle</label>
              <input ref={fileRef} type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); }} />
              <button onClick={() => fileRef.current?.click()} className="w-full rounded-lg px-3 py-2.5 text-sm text-left flex items-center gap-2" style={inputStyle}>
                <FileUp className="w-4 h-4" style={{ color: "#64748B" }} />
                <span style={{ color: form.file_name ? "#F1F5F9" : "#64748B" }}>{form.file_name || "PDF/Word yükle (opsiyonel)"}</span>
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={labelStyle}>Önemli Notlar</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} className="w-full rounded-lg px-3 py-2.5 text-sm outline-none resize-none" style={inputStyle} placeholder="Özel notlar..." />
          </div>

          {/* AI Analysis Preview */}
          {form.ai_analysis && (
            <div className="rounded-xl p-4 mt-4" style={{ backgroundColor: "rgba(255,107,43,0.05)", border: "1px solid rgba(255,107,43,0.2)" }}>
              <div className="flex items-center gap-2 mb-2">
                <Bot className="w-4 h-4" style={{ color: "#FF6B2B" }} />
                <span className="text-xs font-semibold" style={{ color: "#FF6B2B" }}>AI Analiz Sonucu</span>
              </div>
              <p className="text-xs" style={{ color: "#94A3B8" }}>{form.ai_analysis.ozet}</p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button onClick={onCancel} variant="outline" className="h-9 text-sm" style={{ borderColor: "#1E2732", color: "#94A3B8" }}>İptal</Button>
            <Button onClick={handleSubmit} disabled={saving} className="h-9 text-sm font-semibold text-white" style={{ backgroundColor: "#FF6B2B" }}>
              {saving ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Detail View ───
function ContractDetail({ contract, onBack, onEdit, onDelete, onReanalyze }: {
  contract: Contract; onBack: () => void; onEdit: () => void; onDelete: () => void; onReanalyze: () => void;
}) {
  const daysLeft = getDaysRemaining(contract.end_date);
  const status = getStatusInfo(contract.end_date);
  const totalDays = contract.start_date && contract.end_date
    ? Math.ceil((new Date(contract.end_date).getTime() - new Date(contract.start_date).getTime()) / (1000 * 60 * 60 * 24))
    : 0;
  const elapsedDays = contract.start_date
    ? Math.max(0, Math.ceil((Date.now() - new Date(contract.start_date).getTime()) / (1000 * 60 * 60 * 24)))
    : 0;
  const progressPct = totalDays > 0 ? Math.min(100, (elapsedDays / totalDays) * 100) : 0;
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({ general: true, financial: true, ai: true, schedule: false, docs: false });
  const toggle = (key: string) => setExpandedSections(p => ({ ...p, [key]: !p[key] }));

  const analysis = contract.ai_analysis;

  const Section = ({ id, title, icon, children }: { id: string; title: string; icon: React.ReactNode; children: React.ReactNode }) => (
    <div className="rounded-xl overflow-hidden" style={cardStyle}>
      <button onClick={() => toggle(id)} className="w-full flex items-center justify-between p-4">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-semibold" style={{ color: "#F1F5F9" }}>{title}</span>
        </div>
        {expandedSections[id] ? <ChevronUp className="w-4 h-4" style={{ color: "#64748B" }} /> : <ChevronDown className="w-4 h-4" style={{ color: "#64748B" }} />}
      </button>
      {expandedSections[id] && <div className="px-4 pb-4">{children}</div>}
    </div>
  );

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="text-sm flex items-center gap-1" style={{ color: "#94A3B8" }}>
          <ArrowLeft className="w-4 h-4" /> Sözleşme Takibi
        </button>
        <div className="flex items-center gap-2">
          <Button onClick={onEdit} variant="outline" size="sm" className="h-8 text-xs" style={{ borderColor: "#1E2732", color: "#94A3B8" }}>
            <Edit2 className="w-3 h-3 mr-1" /> Düzenle
          </Button>
          {contract.file_url && (
            <a href={contract.file_url} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" className="h-8 text-xs" style={{ borderColor: "#1E2732", color: "#94A3B8" }}>
                <Download className="w-3 h-3 mr-1" /> Görüntüle
              </Button>
            </a>
          )}
          <Button onClick={onDelete} variant="outline" size="sm" className="h-8 text-xs" style={{ borderColor: "#1E2732", color: "#EF4444" }}>
            <Trash2 className="w-3 h-3 mr-1" /> Sil
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <h1 className="text-lg font-bold" style={{ color: "#F1F5F9" }}>{contract.name}</h1>
        <span className="text-[10px] font-semibold px-2 py-1 rounded-full" style={{ color: status.color, backgroundColor: status.bg }}>{status.label}</span>
      </div>

      {/* Sections */}
      <Section id="general" title="Genel Bilgiler" icon={<Building2 className="w-4 h-4" style={{ color: "#FF6B2B" }} />}>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs">
          <div><span style={{ color: "#64748B" }}>Karşı Taraf</span><p className="font-medium mt-0.5" style={{ color: "#F1F5F9" }}>{contract.counterparty}</p></div>
          <div><span style={{ color: "#64748B" }}>Tür</span><p className="font-medium mt-0.5" style={{ color: "#F1F5F9" }}>{CONTRACT_TYPES[contract.contract_type]}</p></div>
          <div><span style={{ color: "#64748B" }}>Tutar</span><p className="font-medium mt-0.5" style={{ color: "#F1F5F9" }}>{formatCurrency(contract.amount)}</p></div>
          <div><span style={{ color: "#64748B" }}>Başlangıç</span><p className="font-medium mt-0.5" style={{ color: "#F1F5F9" }}>{formatDate(contract.start_date)}</p></div>
          <div><span style={{ color: "#64748B" }}>Bitiş</span><p className="font-medium mt-0.5" style={{ color: "#F1F5F9" }}>{formatDate(contract.end_date)}</p></div>
          <div><span style={{ color: "#64748B" }}>Kalan</span><p className="font-medium mt-0.5" style={{ color: status.color }}>{daysLeft !== null ? `${daysLeft} gün` : "—"}</p></div>
        </div>
        {totalDays > 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-[10px] mb-1" style={{ color: "#64748B" }}>
              <span>Süre İlerlemesi</span>
              <span>%{Math.round(progressPct)}</span>
            </div>
            <Progress value={progressPct} className="h-2" />
          </div>
        )}
      </Section>

      {/* AI Analysis */}
      {analysis && (
        <Section id="ai" title="AI Analiz Sonuçları" icon={<Bot className="w-4 h-4" style={{ color: "#FF6B2B" }} />}>
          <p className="text-xs mb-4" style={{ color: "#94A3B8" }}>{analysis.ozet}</p>

          {/* Critical items */}
          {analysis.kritik_maddeler?.length > 0 && (
            <div className="space-y-2 mb-4">
              <p className="text-xs font-semibold" style={{ color: "#F1F5F9" }}>📋 Kritik Maddeler</p>
              {analysis.kritik_maddeler.map((m: any, i: number) => (
                <div key={i} className="flex items-start gap-2 text-xs rounded-lg p-2" style={{ backgroundColor: "#0F1419" }}>
                  <span>{m.onem === "kritik" ? "🔴" : m.onem === "uyari" ? "⚠️" : "✅"}</span>
                  <div>
                    <span className="font-medium" style={{ color: "#F1F5F9" }}>{m.aciklama}</span>
                    <span className="ml-1" style={{ color: "#64748B" }}>({m.madde})</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Risky items */}
          {analysis.riskli_maddeler?.length > 0 && (
            <div className="space-y-2 mb-4">
              <p className="text-xs font-semibold" style={{ color: "#EF4444" }}>⚠️ Riskli Maddeler</p>
              {analysis.riskli_maddeler.map((m: any, i: number) => (
                <div key={i} className="text-xs rounded-lg p-2" style={{ backgroundColor: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.15)" }}>
                  <span className="font-medium" style={{ color: "#F1F5F9" }}>{m.aciklama}</span>
                  <span className="ml-1" style={{ color: "#64748B" }}>({m.madde})</span>
                </div>
              ))}
            </div>
          )}

          <Button onClick={onReanalyze} variant="outline" size="sm" className="h-8 text-xs mt-2" style={{ borderColor: "#1E2732", color: "#FF6B2B" }}>
            <RefreshCw className="w-3 h-3 mr-1" /> Yeniden Analiz Et
          </Button>
        </Section>
      )}

      {/* Payment schedule */}
      {analysis?.odeme_takvimi?.length > 0 && (
        <Section id="schedule" title="Ödeme Takvimi" icon={<Calendar className="w-4 h-4" style={{ color: "#FF6B2B" }} />}>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: "1px solid #1E2732" }}>
                  <th className="text-left py-2 font-medium" style={{ color: "#64748B" }}>Ödeme</th>
                  <th className="text-left py-2 font-medium" style={{ color: "#64748B" }}>Tarih</th>
                  <th className="text-right py-2 font-medium" style={{ color: "#64748B" }}>Tutar</th>
                </tr>
              </thead>
              <tbody>
                {analysis.odeme_takvimi.map((o: any, i: number) => (
                  <tr key={i} style={{ borderBottom: "1px solid #1E2732" }}>
                    <td className="py-2" style={{ color: "#F1F5F9" }}>{o.odeme}</td>
                    <td className="py-2" style={{ color: "#94A3B8" }}>{o.tarih || "—"}</td>
                    <td className="py-2 text-right" style={{ color: "#F1F5F9" }}>{o.tutar ? formatCurrency(o.tutar) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {/* Documents */}
      <Section id="docs" title="Belgeler" icon={<FileText className="w-4 h-4" style={{ color: "#FF6B2B" }} />}>
        {contract.file_url ? (
          <div className="flex items-center justify-between rounded-lg p-3" style={{ backgroundColor: "#0F1419" }}>
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4" style={{ color: "#64748B" }} />
              <span className="text-xs" style={{ color: "#F1F5F9" }}>{contract.file_name || "Belge"}</span>
            </div>
            <a href={contract.file_url} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" className="h-7 text-[11px]" style={{ borderColor: "#1E2732", color: "#94A3B8" }}>
                <Download className="w-3 h-3 mr-1" /> İndir
              </Button>
            </a>
          </div>
        ) : (
          <p className="text-xs" style={{ color: "#64748B" }}>Henüz belge yüklenmemiş</p>
        )}
      </Section>

      {/* Notes */}
      {contract.notes && (
        <div className="rounded-xl p-4" style={cardStyle}>
          <p className="text-xs font-semibold mb-2" style={{ color: "#F1F5F9" }}>📝 Notlar</p>
          <p className="text-xs whitespace-pre-wrap" style={{ color: "#94A3B8" }}>{contract.notes}</p>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ───
export default function DesktopContractsPage() {
  const { user } = useUser();
  const { contracts, loading, addContract, updateContract, deleteContract } = useContracts();
  const [view, setView] = useState<"list" | "add" | "detail" | "edit">("list");
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);

  // Use mock data if no real contracts and user has none
  const displayContracts = contracts.length > 0 ? contracts : (user ? [] : MOCK_CONTRACTS);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-t-[#FF6B2B] border-[#1E2732] rounded-full animate-spin" />
      </div>
    );
  }

  if (view === "add" || view === "edit") {
    return (
      <ContractForm
        contract={view === "edit" ? selectedContract || undefined : undefined}
        onSave={async (input) => {
          if (view === "edit" && selectedContract) {
            return await updateContract(selectedContract.id, input);
          }
          const result = await addContract(input);
          return !!result;
        }}
        onCancel={() => { setView(selectedContract ? "detail" : "list"); }}
      />
    );
  }

  if (view === "detail" && selectedContract) {
    return (
      <ContractDetail
        contract={selectedContract}
        onBack={() => { setView("list"); setSelectedContract(null); }}
        onEdit={() => setView("edit")}
        onDelete={async () => {
          if (confirm("Bu sözleşmeyi silmek istediğinize emin misiniz?")) {
            await deleteContract(selectedContract.id);
            setView("list");
            setSelectedContract(null);
          }
        }}
        onReanalyze={async () => {
          toast.info("Yeniden analiz için sözleşme PDF'ini tekrar yükleyin.");
        }}
      />
    );
  }

  return (
    <ContractList
      contracts={displayContracts}
      onSelect={(c) => { setSelectedContract(c); setView("detail"); }}
      onAdd={() => setView("add")}
    />
  );
}
