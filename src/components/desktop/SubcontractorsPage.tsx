import { useState, useMemo } from "react";
import { useSubcontractors, useSubcontractorPayments, Subcontractor } from "@/hooks/useSubcontractors";
import { useProjects } from "@/hooks/useProjects";
import { useUser } from "@/contexts/UserContext";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import DeleteConfirmModal from "@/components/DeleteConfirmModal";
import { Plus, Trash2, ArrowLeft, Phone, Wrench, AlertTriangle, ChevronRight } from "lucide-react";
import { differenceInDays, parseISO } from "date-fns";
import { toast } from "sonner";

const fmt = (n: number) => `₺${Math.round(n).toLocaleString("tr-TR")}`;

const SubcontractorsPage = () => {
  const { user } = useUser();
  const { subcontractors, isLoading, addSubcontractor, deleteSubcontractor } = useSubcontractors();
  const { payments: allPayments } = useSubcontractorPayments();
  const { projects } = useProjects();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [addModal, setAddModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", specialty: "", project_id: "", contract_amount: "" });

  const enriched = useMemo(() => {
    return subcontractors.map(s => {
      const pays = allPayments.filter(p => p.subcontractor_id === s.id);
      const totalPaid = pays.filter(p => p.status === "odendi").reduce((sum, p) => sum + Number(p.amount), 0);
      const remaining = Number(s.contract_amount) - totalPaid;
      const upcoming = pays.filter(p => {
        if (!p.planned_date || p.status === "odendi") return false;
        const days = differenceInDays(parseISO(p.planned_date), new Date());
        return days >= 0 && days <= 7;
      });
      const proj = projects.find(p => p.id === s.project_id);
      return { ...s, totalPaid, remaining, upcomingCount: upcoming.length, projectName: proj?.name || "" };
    });
  }, [subcontractors, allPayments, projects]);

  const handleAdd = async () => {
    if (!form.name) { toast.error("Taşeron adı zorunludur"); return; }
    await addSubcontractor.mutateAsync({
      name: form.name,
      phone: form.phone || null,
      specialty: form.specialty || null,
      project_id: form.project_id || null,
      contract_amount: Number(form.contract_amount) || 0,
    });
    setAddModal(false);
    setForm({ name: "", phone: "", specialty: "", project_id: "", contract_amount: "" });
  };

  if (selectedId) {
    const sub = enriched.find(s => s.id === selectedId);
    if (!sub) return null;
    return <SubcontractorDetail sub={sub} onBack={() => setSelectedId(null)} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Taşeron Takibi</h3>
        <button onClick={() => setAddModal(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium" style={{ backgroundColor: "#FF6B2B", color: "#FFF" }}>
          <Plus className="w-3.5 h-3.5" /> Taşeron Ekle
        </button>
      </div>

      {/* Warning: upcoming payments */}
      {enriched.some(s => s.upcomingCount > 0) && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs" style={{ backgroundColor: "rgba(245,158,11,0.12)", color: "#F59E0B" }}>
          <AlertTriangle className="w-3.5 h-3.5" /> 7 gün içinde vadesi gelen taşeron ödemeleri var
        </div>
      )}

      {enriched.length === 0 ? (
        <div className="text-center py-12 text-sm text-muted-foreground">Henüz taşeron eklenmemiş</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {enriched.map(s => (
            <Card key={s.id} className="border-border cursor-pointer hover:border-[#FF6B2B]/30 transition-colors" onClick={() => setSelectedId(s.id)}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{s.name}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      {s.specialty && <span className="flex items-center gap-1"><Wrench className="w-3 h-3" />{s.specialty}</span>}
                      {s.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{s.phone}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {s.upcomingCount > 0 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ backgroundColor: "rgba(245,158,11,0.15)", color: "#F59E0B" }}>
                        ⏰ {s.upcomingCount}
                      </span>
                    )}
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
                {s.projectName && <p className="text-[11px] text-muted-foreground mb-2">📁 {s.projectName}</p>}
                <div className="grid grid-cols-3 gap-2 pt-2" style={{ borderTop: "1px solid hsl(var(--border))" }}>
                  <div><p className="text-[10px] text-muted-foreground">Sözleşme</p><p className="text-xs font-semibold text-foreground">{fmt(s.contract_amount)}</p></div>
                  <div><p className="text-[10px] text-muted-foreground">Ödenen</p><p className="text-xs font-semibold" style={{ color: "#22C55E" }}>{fmt(s.totalPaid)}</p></div>
                  <div><p className="text-[10px] text-muted-foreground">Kalan</p><p className="text-xs font-semibold" style={{ color: s.remaining > 0 ? "#F59E0B" : "#22C55E" }}>{fmt(s.remaining)}</p></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Modal */}
      <Dialog open={addModal} onOpenChange={setAddModal}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Yeni Taşeron</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Taşeron adı" className="w-full px-3 py-2 rounded-lg text-sm bg-muted border border-border text-foreground" />
            <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="Telefon (opsiyonel)" className="w-full px-3 py-2 rounded-lg text-sm bg-muted border border-border text-foreground" />
            <input value={form.specialty} onChange={e => setForm(f => ({ ...f, specialty: e.target.value }))} placeholder="Uzmanlık alanı (örn: Kalıp, Demir, Sıva)" className="w-full px-3 py-2 rounded-lg text-sm bg-muted border border-border text-foreground" />
            <select value={form.project_id} onChange={e => setForm(f => ({ ...f, project_id: e.target.value }))} className="w-full px-3 py-2 rounded-lg text-sm bg-muted border border-border text-foreground">
              <option value="">Proje seçin (opsiyonel)</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <input value={form.contract_amount} onChange={e => setForm(f => ({ ...f, contract_amount: e.target.value }))} placeholder="Sözleşme tutarı (₺)" type="number" className="w-full px-3 py-2 rounded-lg text-sm bg-muted border border-border text-foreground" />
            <button onClick={handleAdd} disabled={addSubcontractor.isPending} className="w-full py-2.5 rounded-lg text-sm font-semibold" style={{ backgroundColor: "#FF6B2B", color: "#FFF" }}>
              {addSubcontractor.isPending ? "Ekleniyor..." : "Taşeron Ekle"}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <DeleteConfirmModal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={() => { if (deleteTarget) deleteSubcontractor.mutate(deleteTarget.id); }} title="Taşeronu Sil" itemName={deleteTarget?.name} />
    </div>
  );
};

// Detail view for a single subcontractor
const SubcontractorDetail = ({ sub, onBack }: { sub: any; onBack: () => void }) => {
  const { user } = useUser();
  const { payments, addPayment, deletePayment } = useSubcontractorPayments(sub.id);
  const [addModal, setAddModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [form, setForm] = useState({ amount: "", payment_date: new Date().toISOString().slice(0, 10), planned_date: "", description: "", status: "odendi" });

  const totalPaid = payments.filter(p => p.status === "odendi").reduce((s, p) => s + Number(p.amount), 0);
  const remaining = Number(sub.contract_amount) - totalPaid;
  const pct = sub.contract_amount > 0 ? Math.min(100, Math.round((totalPaid / sub.contract_amount) * 100)) : 0;

  const handleAdd = async () => {
    if (!form.amount || Number(form.amount) <= 0) { toast.error("Tutar giriniz"); return; }
    await addPayment.mutateAsync({
      subcontractor_id: sub.id,
      amount: Number(form.amount),
      payment_date: form.payment_date,
      planned_date: form.planned_date || null,
      description: form.description || null,
      status: form.status,
    });
    setAddModal(false);
    setForm({ amount: "", payment_date: new Date().toISOString().slice(0, 10), planned_date: "", description: "", status: "odendi" });
  };

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-2 text-sm font-medium" style={{ color: "#FF6B2B" }}>
        <ArrowLeft className="w-4 h-4" /> Taşeronlar
      </button>

      <div>
        <h3 className="text-lg font-bold text-foreground">{sub.name}</h3>
        <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
          {sub.specialty && <span>🔧 {sub.specialty}</span>}
          {sub.phone && <span>📞 {sub.phone}</span>}
          {sub.projectName && <span>📁 {sub.projectName}</span>}
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-border"><CardContent className="p-4 text-center">
          <p className="text-[11px] text-muted-foreground mb-1">Sözleşme</p>
          <p className="text-lg font-bold text-foreground">{fmt(sub.contract_amount)}</p>
        </CardContent></Card>
        <Card className="border-border"><CardContent className="p-4 text-center">
          <p className="text-[11px] text-muted-foreground mb-1">Ödenen</p>
          <p className="text-lg font-bold" style={{ color: "#22C55E" }}>{fmt(totalPaid)}</p>
        </CardContent></Card>
        <Card className="border-border"><CardContent className="p-4 text-center">
          <p className="text-[11px] text-muted-foreground mb-1">Kalan Borç</p>
          <p className="text-lg font-bold" style={{ color: remaining > 0 ? "#EF4444" : "#22C55E" }}>{fmt(remaining)}</p>
        </CardContent></Card>
      </div>

      {/* Progress bar */}
      {sub.contract_amount > 0 && (
        <div className="flex items-center gap-2">
          <div className="flex-1 h-2 rounded-full bg-muted">
            <div className="h-full rounded-full transition-all" style={{ backgroundColor: "#22C55E", width: `${pct}%` }} />
          </div>
          <span className="text-xs font-mono text-muted-foreground">%{pct}</span>
        </div>
      )}

      {/* Payment list */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-foreground">Ödeme Geçmişi</h4>
        <button onClick={() => setAddModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium" style={{ backgroundColor: "#FF6B2B", color: "#FFF" }}>
          <Plus className="w-3 h-3" /> Ödeme Ekle
        </button>
      </div>

      {payments.length === 0 ? (
        <div className="text-center py-8 text-sm text-muted-foreground">Henüz ödeme kaydı yok</div>
      ) : (
        <div className="space-y-2">
          {payments.map(p => (
            <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div>
                <p className="text-sm font-medium text-foreground">{p.description || "Ödeme"}</p>
                <p className="text-[11px] text-muted-foreground">{p.payment_date} • {p.status === "odendi" ? "✅ Ödendi" : "⏳ Planlandı"}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold" style={{ color: p.status === "odendi" ? "#22C55E" : "#F59E0B" }}>{fmt(p.amount)}</span>
                <button onClick={() => setDeleteTarget({ id: p.id, name: fmt(p.amount) })} className="p-1 rounded hover:bg-muted">
                  <Trash2 className="w-3 h-3 text-muted-foreground" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add payment modal */}
      <Dialog open={addModal} onOpenChange={setAddModal}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Ödeme Ekle — {sub.name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <input value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="Tutar (₺)" type="number" className="w-full px-3 py-2 rounded-lg text-sm bg-muted border border-border text-foreground" />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Ödeme Tarihi</label>
                <input value={form.payment_date} onChange={e => setForm(f => ({ ...f, payment_date: e.target.value }))} type="date" className="w-full px-3 py-2 rounded-lg text-sm bg-muted border border-border text-foreground" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Durum</label>
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="w-full px-3 py-2 rounded-lg text-sm bg-muted border border-border text-foreground">
                  <option value="odendi">Ödendi</option>
                  <option value="planlandi">Planlandı</option>
                </select>
              </div>
            </div>
            {form.status === "planlandi" && (
              <div>
                <label className="text-xs text-muted-foreground">Planlanan Tarih</label>
                <input value={form.planned_date} onChange={e => setForm(f => ({ ...f, planned_date: e.target.value }))} type="date" className="w-full px-3 py-2 rounded-lg text-sm bg-muted border border-border text-foreground" />
              </div>
            )}
            <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Açıklama (opsiyonel)" className="w-full px-3 py-2 rounded-lg text-sm bg-muted border border-border text-foreground" />
            <button onClick={handleAdd} disabled={addPayment.isPending} className="w-full py-2.5 rounded-lg text-sm font-semibold" style={{ backgroundColor: "#FF6B2B", color: "#FFF" }}>
              {addPayment.isPending ? "Kaydediliyor..." : "Ödemeyi Kaydet"}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <DeleteConfirmModal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={() => { if (deleteTarget) deletePayment.mutate(deleteTarget.id); }} title="Ödemeyi Sil" itemName={deleteTarget?.name} />
    </div>
  );
};

export default SubcontractorsPage;
