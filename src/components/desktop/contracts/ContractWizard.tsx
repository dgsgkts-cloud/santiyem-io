import { useState, useRef } from "react";
import { Contract, ContractInput } from "@/hooks/useContracts";
import { useProjects } from "@/hooks/useProjects";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Upload, Plus, Trash2, Bot, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cardStyleClass, CONTRACT_TYPES, CriticalClause } from "./ContractTypes";

interface Props {
  contract?: Contract;
  onSave: (input: ContractInput) => Promise<boolean>;
  onCancel: () => void;
}

export default function ContractWizard({ contract, onSave, onCancel }: Props) {
  const { projects } = useProjects();
  const { user } = useUser();
  const pdfRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState(1);
  const totalSteps = 4;
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  const [form, setForm] = useState<ContractInput & { contract_no?: string }>({
    name: contract?.name || "",
    project_id: contract?.project_id || "",
    counterparty: contract?.counterparty || "",
    amount: contract?.amount || 0,
    start_date: contract?.start_date || "",
    end_date: contract?.end_date || "",
    contract_type: contract?.contract_type || "goturu",
    notes: contract?.notes || "",
    file_url: contract?.file_url || "",
    file_name: contract?.file_name || "",
    ai_analysis: contract?.ai_analysis || undefined,
    payment_schedule: contract?.payment_schedule || [],
    contract_no: "",
  });

  const [clauses, setClauses] = useState<CriticalClause[]>(
    contract?.ai_analysis?.kritik_maddeler?.map((m: any) => ({
      madde_no: m.madde_no || m.madde || "",
      konu: m.konu || "",
      icerik: m.icerik || m.aciklama || "",
      onem: m.onem === "kritik" ? "kritik" : m.onem === "onemli" || m.onem === "uyari" ? "onemli" : "bilgi",
      tarih: m.tarih || "",
    })) || []
  );

  const [schedule, setSchedule] = useState<Array<{ hakedis_no: number; tarih: string; tutar: number; not: string }>>(
    contract?.ai_analysis?.odeme_takvimi || contract?.payment_schedule || []
  );

  const addClause = () => setClauses(p => [...p, { madde_no: "", konu: "", icerik: "", onem: "bilgi", tarih: "" }]);
  const removeClause = (i: number) => setClauses(p => p.filter((_, idx) => idx !== i));
  const updateClause = (i: number, field: string, value: string) => setClauses(p => p.map((c, idx) => idx === i ? { ...c, [field]: value } : c));

  const addScheduleItem = () => setSchedule(p => [...p, { hakedis_no: p.length + 1, tarih: "", tutar: 0, not: "" }]);
  const removeScheduleItem = (i: number) => setSchedule(p => p.filter((_, idx) => idx !== i));
  const updateScheduleItem = (i: number, field: string, value: any) => setSchedule(p => p.map((s, idx) => idx === i ? { ...s, [field]: value } : s));

  const scheduleTotal = schedule.reduce((s, item) => s + (Number(item.tutar) || 0), 0);
  const scheduleDiff = form.amount - scheduleTotal;

  const handlePdfUpload = async (file: File) => {
    if (!user) return;
    if (file.size > 10 * 1024 * 1024) { toast.error("Dosya boyutu max 10MB olabilir."); return; }
    setAnalyzing(true);
    try {
      const path = `${user.id}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage.from("project-files").upload(path, file);
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("project-files").getPublicUrl(path);
      setForm(f => ({ ...f, file_url: urlData.publicUrl, file_name: file.name }));

      const text = await file.text();
      if (text.length < 50) {
        toast.error("PDF metni okunamadı.");
        setAnalyzing(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke("analyze-contract", { body: { contractText: text } });
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
        }));
        if (a.kritik_maddeler?.length) {
          setClauses(a.kritik_maddeler.map((m: any) => ({
            madde_no: m.madde_no || "", konu: m.konu || "", icerik: m.icerik || m.aciklama || "",
            onem: m.onem === "kritik" ? "kritik" : m.onem === "onemli" || m.onem === "uyari" ? "onemli" : "bilgi",
            tarih: m.tarih || "",
          })));
        }
        if (a.odeme_takvimi?.length) setSchedule(a.odeme_takvimi);
        toast.success("AI analizi tamamlandı! Bilgiler forma yansıtıldı.");
      }
    } catch (e: any) {
      toast.error(e?.message || "AI analiz hatası.");
    }
    setAnalyzing(false);
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) { toast.error("Sözleşme adı zorunludur."); setStep(1); return; }
    if (!form.counterparty.trim()) { toast.error("İşveren adı zorunludur."); setStep(1); return; }
    setSaving(true);
    const { contract_no, ...formWithoutExtra } = form;
    const input: ContractInput = {
      ...formWithoutExtra,
      project_id: formWithoutExtra.project_id || undefined,
      start_date: formWithoutExtra.start_date || undefined,
      end_date: formWithoutExtra.end_date || undefined,
      file_url: formWithoutExtra.file_url || undefined,
      file_name: formWithoutExtra.file_name || undefined,
      ai_analysis: {
        ...(formWithoutExtra.ai_analysis || {}),
        kritik_maddeler: clauses,
        odeme_takvimi: schedule,
        gecikme_cezasi: formWithoutExtra.ai_analysis?.gecikme_cezasi || null,
      },
      payment_schedule: schedule,
    };
    const ok = await onSave(input);
    setSaving(false);
    if (ok) onCancel();
  };

  const canProceed = () => {
    if (step === 1) return form.name.trim() && form.counterparty.trim();
    return true;
  };

  const stepLabels = ["Temel Bilgiler", "Kritik Maddeler", "Ödeme Takvimi", "PDF Yükleme"];

  const inputClass = "bg-background border border-border text-foreground";

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <button onClick={onCancel} className="text-sm flex items-center gap-1 text-muted-foreground">
        <ArrowLeft className="w-4 h-4" /> Sözleşme Takibi
      </button>
      <h1 className="text-lg font-bold text-foreground">
        {contract ? "Sözleşme Düzenle" : "Yeni Sözleşme Ekle"}
      </h1>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {stepLabels.map((label, i) => {
          const s = i + 1;
          const active = s === step;
          const done = s < step;
          return (
            <div key={s} className="flex items-center gap-2 flex-1">
              <button
                onClick={() => setStep(s)}
                className="flex items-center gap-2 text-xs font-medium"
                style={{ color: active ? "#FF6B2B" : done ? "#22C55E" : undefined }}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${!active && !done ? "bg-muted text-muted-foreground" : ""}`}
                  style={{
                    backgroundColor: active ? "rgba(255,107,43,0.15)" : done ? "rgba(34,197,94,0.15)" : undefined,
                    color: active ? "#FF6B2B" : done ? "#22C55E" : undefined,
                  }}
                >
                  {done ? <Check className="w-3 h-3" /> : s}
                </div>
                <span className={`hidden md:inline ${!active && !done ? "text-muted-foreground" : ""}`}>{label}</span>
              </button>
              {i < stepLabels.length - 1 && <div className="flex-1 h-px bg-border" />}
            </div>
          );
        })}
      </div>

      {/* Step 1: Basics */}
      {step === 1 && (
        <div className={`space-y-4 p-5 ${cardStyleClass}`}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1 text-muted-foreground">Proje Seçin</label>
              <select value={form.project_id} onChange={e => setForm(f => ({ ...f, project_id: e.target.value }))} className={`w-full rounded-lg px-3 py-2.5 text-sm outline-none ${inputClass}`}>
                <option value="">Proje seçiniz (opsiyonel)</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 text-muted-foreground">Sözleşme Adı *</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={`w-full rounded-lg px-3 py-2.5 text-sm outline-none ${inputClass}`} placeholder="örn: Akdeniz Residence İnşaat Sözleşmesi" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 text-muted-foreground">İşveren / Karşı Taraf *</label>
              <input value={form.counterparty} onChange={e => setForm(f => ({ ...f, counterparty: e.target.value }))} className={`w-full rounded-lg px-3 py-2.5 text-sm outline-none ${inputClass}`} placeholder="örn: ABC Yapı A.Ş." />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 text-muted-foreground">Sözleşme Türü</label>
              <select value={form.contract_type} onChange={e => setForm(f => ({ ...f, contract_type: e.target.value }))} className={`w-full rounded-lg px-3 py-2.5 text-sm outline-none ${inputClass}`}>
                {Object.entries(CONTRACT_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 text-muted-foreground">Sözleşme Tutarı (₺)</label>
              <input type="number" value={form.amount || ""} onChange={e => setForm(f => ({ ...f, amount: Number(e.target.value) }))} className={`w-full rounded-lg px-3 py-2.5 text-sm outline-none ${inputClass}`} placeholder="örn: 4500000" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 text-muted-foreground">Sözleşme No</label>
              <input value={form.contract_no || ""} onChange={e => setForm(f => ({ ...f, contract_no: e.target.value }))} className={`w-full rounded-lg px-3 py-2.5 text-sm outline-none ${inputClass}`} placeholder="Opsiyonel" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 text-muted-foreground">Başlangıç Tarihi</label>
              <input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} className={`w-full rounded-lg px-3 py-2.5 text-sm outline-none ${inputClass}`} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 text-muted-foreground">Bitiş Tarihi</label>
              <input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} className={`w-full rounded-lg px-3 py-2.5 text-sm outline-none ${inputClass}`} />
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Critical Clauses */}
      {step === 2 && (
        <div className={`space-y-4 p-5 ${cardStyleClass}`}>
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">Kritik Maddeler</p>
            <Button onClick={addClause} variant="outline" size="sm" className="h-8 text-xs text-primary">
              <Plus className="w-3 h-3 mr-1" /> Madde Ekle
            </Button>
          </div>
          {clauses.length === 0 && (
            <p className="text-xs text-center py-6 text-muted-foreground">
              Henüz madde eklenmedi. "Madde Ekle" butonuna tıklayın veya 4. adımda PDF yükleyerek AI'dan otomatik çıkartın.
            </p>
          )}
          {clauses.map((c, i) => (
            <div key={i} className="rounded-lg p-3 space-y-2 bg-background border border-border">
              <div className="flex items-center gap-2">
                <input value={c.madde_no} onChange={e => updateClause(i, "madde_no", e.target.value)} className={`w-20 rounded px-2 py-1 text-xs outline-none ${inputClass}`} placeholder="Madde No" />
                <input value={c.konu} onChange={e => updateClause(i, "konu", e.target.value)} className={`flex-1 rounded px-2 py-1 text-xs outline-none ${inputClass}`} placeholder="Konu" />
                <select value={c.onem} onChange={e => updateClause(i, "onem", e.target.value)} className={`rounded px-2 py-1 text-xs outline-none ${inputClass}`}>
                  <option value="kritik">🔴 Kritik</option>
                  <option value="onemli">🟡 Önemli</option>
                  <option value="bilgi">🟢 Bilgi</option>
                </select>
                <button onClick={() => removeClause(i)}><Trash2 className="w-3.5 h-3.5 text-destructive" /></button>
              </div>
              <textarea value={c.icerik} onChange={e => updateClause(i, "icerik", e.target.value)} rows={2} className={`w-full rounded px-2 py-1 text-xs outline-none resize-none ${inputClass}`} placeholder="İçerik" />
            </div>
          ))}
        </div>
      )}

      {/* Step 3: Payment Schedule */}
      {step === 3 && (
        <div className={`space-y-4 p-5 ${cardStyleClass}`}>
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">Ödeme Takvimi</p>
            <Button onClick={addScheduleItem} variant="outline" size="sm" className="h-8 text-xs text-primary">
              <Plus className="w-3 h-3 mr-1" /> Hakediş Ekle
            </Button>
          </div>

          {schedule.length === 0 ? (
            <p className="text-xs text-center py-6 text-muted-foreground">Ödeme takvimi oluşturmak için hakediş ekleyin.</p>
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-[50px_1fr_1fr_1fr_32px] gap-2 text-[10px] font-semibold px-1 text-muted-foreground">
                <span>No</span><span>Tarih</span><span>Tutar (₺)</span><span>Not</span><span></span>
              </div>
              {schedule.map((s, i) => (
                <div key={i} className="grid grid-cols-[50px_1fr_1fr_1fr_32px] gap-2 items-center">
                  <span className="text-xs font-mono text-center text-muted-foreground">{s.hakedis_no}</span>
                  <input type="date" value={s.tarih} onChange={e => updateScheduleItem(i, "tarih", e.target.value)} className={`rounded px-2 py-1.5 text-xs outline-none ${inputClass}`} />
                  <input type="number" value={s.tutar || ""} onChange={e => updateScheduleItem(i, "tutar", Number(e.target.value))} className={`rounded px-2 py-1.5 text-xs outline-none ${inputClass}`} />
                  <input value={s.not} onChange={e => updateScheduleItem(i, "not", e.target.value)} className={`rounded px-2 py-1.5 text-xs outline-none ${inputClass}`} placeholder="Not" />
                  <button onClick={() => removeScheduleItem(i)}><Trash2 className="w-3.5 h-3.5 text-destructive" /></button>
                </div>
              ))}
            </div>
          )}

          {schedule.length > 0 && form.amount > 0 && (
            <div className="rounded-lg p-3 flex items-center justify-between text-xs" style={{
              backgroundColor: Math.abs(scheduleDiff) < 1 ? "rgba(34,197,94,0.08)" : "rgba(245,158,11,0.08)",
              border: `1px solid ${Math.abs(scheduleDiff) < 1 ? "rgba(34,197,94,0.2)" : "rgba(245,158,11,0.2)"}`,
            }}>
              <span className="text-muted-foreground">
                Toplam: {scheduleTotal.toLocaleString("tr-TR")} ₺ / Sözleşme: {form.amount.toLocaleString("tr-TR")} ₺
              </span>
              <span style={{ color: Math.abs(scheduleDiff) < 1 ? "#22C55E" : "#F59E0B" }}>
                {Math.abs(scheduleDiff) < 1 ? "✓ Tutarlar eşleşiyor" : `Fark: ${scheduleDiff.toLocaleString("tr-TR")} ₺`}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Step 4: PDF Upload */}
      {step === 4 && (
        <div className="space-y-4">
          <div
            className={`p-8 text-center cursor-pointer transition-colors border-2 border-dashed border-border ${cardStyleClass}`}
            onClick={() => !analyzing && pdfRef.current?.click()}
          >
            <input ref={pdfRef} type="file" accept=".pdf,.doc,.docx,.txt" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handlePdfUpload(f); }} />
            {analyzing ? (
              <>
                <div className="w-10 h-10 mx-auto mb-3 border-2 border-t-primary border-border rounded-full animate-spin" />
                <p className="text-sm font-medium text-foreground">AI sözleşmeyi analiz ediyor...</p>
                <p className="text-xs mt-1 text-muted-foreground">Bu işlem 10-30 saniye sürebilir</p>
              </>
            ) : form.file_name ? (
              <>
                <Bot className="w-10 h-10 mx-auto mb-3" style={{ color: "#22C55E" }} />
                <p className="text-sm font-medium text-foreground">📄 {form.file_name}</p>
                <p className="text-xs mt-1 text-muted-foreground">Dosya yüklendi. Farklı bir dosya yüklemek için tıklayın.</p>
              </>
            ) : (
              <>
                <Upload className="w-10 h-10 mx-auto mb-3 text-primary" />
                <p className="text-sm font-medium text-foreground">Sözleşme PDF'ini yükleyin</p>
                <p className="text-xs mt-1 text-muted-foreground">AI otomatik analiz edip bilgileri çıkaracak • Max 10MB</p>
                <p className="text-[10px] mt-2 text-muted-foreground">PDF, DOC, DOCX, TXT desteklenir</p>
              </>
            )}
          </div>

          {form.ai_analysis && (
            <div className="rounded-xl p-4" style={{ backgroundColor: "rgba(255,107,43,0.05)", border: "1px solid rgba(255,107,43,0.2)" }}>
              <div className="flex items-center gap-2 mb-2">
                <Bot className="w-4 h-4 text-primary" />
                <span className="text-xs font-semibold text-primary">AI Analiz Sonucu</span>
              </div>
              <p className="text-xs text-muted-foreground">{form.ai_analysis.ozet}</p>
            </div>
          )}

          <div className={`p-5 ${cardStyleClass}`}>
            <label className="block text-xs font-medium mb-1 text-muted-foreground">Önemli Notlar</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} className={`w-full rounded-lg px-3 py-2.5 text-sm outline-none resize-none ${inputClass}`} placeholder="Özel notlar..." />
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2">
        <Button
          onClick={() => step > 1 ? setStep(step - 1) : onCancel()}
          variant="outline"
          className="h-9 text-sm"
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> {step > 1 ? "Geri" : "İptal"}
        </Button>
        {step < totalSteps ? (
          <Button
            onClick={() => setStep(step + 1)}
            disabled={!canProceed()}
            className="h-9 text-sm font-semibold text-primary-foreground bg-primary hover:bg-primary/90"
          >
            İleri <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={saving}
            className="h-9 text-sm font-semibold text-primary-foreground bg-primary hover:bg-primary/90"
          >
            {saving ? "Kaydediliyor..." : contract ? "Güncelle" : "Sözleşmeyi Kaydet"}
          </Button>
        )}
      </div>
    </div>
  );
}
