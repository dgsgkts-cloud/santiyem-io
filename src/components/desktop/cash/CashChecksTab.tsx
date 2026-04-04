import { useState } from "react";
import DeleteConfirmModal from "@/components/DeleteConfirmModal";
import { useCashChecks } from "@/hooks/useCashChecks";
import { useProjects } from "@/hooks/useProjects";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, AlertTriangle, FileText } from "lucide-react";
import { differenceInDays, parseISO } from "date-fns";

const CHECK_STATUSES = [
  { value: "bekliyor", label: "⏳ Vadesi Gelmedi", color: "#64748B" },
  { value: "yaklasan", label: "🟡 Vadesi Yaklaşıyor", color: "#F59E0B" },
  { value: "gecti", label: "🔴 Vadesi Geçti", color: "#EF4444" },
  { value: "odendi", label: "✅ Ödendi", color: "#22C55E" },
  { value: "tahsil_edildi", label: "✅ Tahsil Edildi", color: "#22C55E" },
  { value: "karsilsiz", label: "❌ Karşılıksız", color: "#EF4444" },
];

const fmt = (n: number) => new Intl.NumberFormat("tr-TR").format(n);

const getCheckStatus = (check: { due_date: string; status: string }) => {
  if (check.status === "odendi" || check.status === "tahsil_edildi" || check.status === "karsilsiz") return check.status;
  const days = differenceInDays(parseISO(check.due_date), new Date());
  if (days < 0) return "gecti";
  if (days <= 7) return "yaklasan";
  return "bekliyor";
};

const CashChecksTab = () => {
  const { checks, addCheck, deleteCheck, updateCheck } = useCashChecks();
  const { projects } = useProjects();
  const [showForm, setShowForm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [formType, setFormType] = useState<"verilen" | "alınan">("verilen");
  const [form, setForm] = useState({
    check_no: "", bank_name: "", branch: "", account_no: "", counterparty: "", amount: "", due_date: "", project_id: "",
  });

  const verilenChecks = checks.filter(c => c.check_type === "verilen").sort((a, b) => {
    const sa = getCheckStatus(a), sb = getCheckStatus(b);
    if (sa === "yaklasan" && sb !== "yaklasan") return -1;
    if (sb === "yaklasan" && sa !== "yaklasan") return 1;
    return a.due_date.localeCompare(b.due_date);
  });
  const alinanChecks = checks.filter(c => c.check_type === "alınan").sort((a, b) => {
    const sa = getCheckStatus(a), sb = getCheckStatus(b);
    if (sa === "yaklasan" && sb !== "yaklasan") return -1;
    if (sb === "yaklasan" && sa !== "yaklasan") return 1;
    return a.due_date.localeCompare(b.due_date);
  });

  const handleSubmit = () => {
    if (!form.check_no || !form.amount || !form.due_date) return;
    addCheck.mutate({
      check_type: formType,
      check_no: form.check_no,
      bank_name: form.bank_name,
      branch: form.branch || null,
      account_no: form.account_no || null,
      counterparty: form.counterparty,
      amount: parseFloat(form.amount),
      due_date: form.due_date,
      project_id: form.project_id || null,
    });
    setShowForm(false);
    setForm({ check_no: "", bank_name: "", branch: "", account_no: "", counterparty: "", amount: "", due_date: "", project_id: "" });
  };

  const renderCheckCard = (chk: typeof checks[0]) => {
    const effectiveStatus = getCheckStatus(chk);
    const si = CHECK_STATUSES.find(s => s.value === effectiveStatus) || CHECK_STATUSES[0];
    const days = differenceInDays(parseISO(chk.due_date), new Date());
    const proj = projects.find(p => p.id === chk.project_id);

    return (
      <Card key={chk.id} className="border-0" style={{ backgroundColor: "#1A2028", borderLeft: `3px solid ${si.color}` }}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4" style={{ color: si.color }} />
              <span className="text-[13px] font-semibold" style={{ color: "#F1F5F9" }}>Çek No: {chk.check_no}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full text-[11px] font-medium" style={{ backgroundColor: si.color + "20", color: si.color }}>{si.label}</span>
              <button onClick={() => deleteCheck.mutate(chk.id)} className="p-1 rounded hover:bg-red-500/10"><Trash2 className="w-3.5 h-3.5" style={{ color: "#EF4444" }} /></button>
            </div>
          </div>
          <p className="text-[11px] mb-1" style={{ color: "#64748B" }}>Banka: {chk.bank_name}</p>
          <p className="text-xl font-bold mb-1" style={{ color: si.color }}>₺{fmt(chk.amount)}</p>
          <p className="text-[12px]" style={{ color: "#94A3B8" }}>
            Vade: {chk.due_date} {days >= 0 ? `(${days} gün sonra)` : `(${Math.abs(days)} gün geçti)`}
          </p>
          <p className="text-[12px]" style={{ color: "#94A3B8" }}>
            {chk.check_type === "verilen" ? "Alıcı" : "Veren"}: {chk.counterparty}
          </p>
          {proj && <p className="text-[11px] mt-1" style={{ color: "#64748B" }}>Proje: {proj.name}</p>}

          {/* Quick status update buttons */}
          {effectiveStatus !== "odendi" && effectiveStatus !== "tahsil_edildi" && (
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => updateCheck.mutate({ id: chk.id, status: chk.check_type === "verilen" ? "odendi" : "tahsil_edildi" })}
                className="text-[11px] px-3 py-1 rounded-md font-medium" style={{ backgroundColor: "rgba(34,197,94,0.15)", color: "#22C55E" }}
              >
                {chk.check_type === "verilen" ? "Ödendi" : "Tahsil Edildi"}
              </button>
              <button
                onClick={() => updateCheck.mutate({ id: chk.id, status: "karsilsiz" })}
                className="text-[11px] px-3 py-1 rounded-md font-medium" style={{ backgroundColor: "rgba(239,68,68,0.15)", color: "#EF4444" }}
              >
                Karşılıksız
              </button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  // Warning banner
  const urgentChecks = checks.filter(c => {
    const s = getCheckStatus(c);
    return s === "yaklasan" || s === "gecti";
  });

  return (
    <div className="space-y-4">
      {urgentChecks.length > 0 && (
        <div className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)" }}>
          <AlertTriangle className="w-5 h-5 shrink-0" style={{ color: "#F59E0B" }} />
          <p className="text-[13px] font-medium" style={{ color: "#F59E0B" }}>
            {urgentChecks.length} çekin vadesi yaklaştı veya geçti! Toplam: ₺{fmt(urgentChecks.reduce((s, c) => s + Number(c.amount), 0))}
          </p>
        </div>
      )}

      <Tabs defaultValue="verilen" className="w-full">
        <div className="flex items-center justify-between mb-4">
          <TabsList style={{ backgroundColor: "#161C23", border: "1px solid #1E2732" }}>
            <TabsTrigger value="verilen" className="text-[13px] data-[state=active]:bg-[#FF6B2B]/15 data-[state=active]:text-[#FF6B2B]">Verdiğim Çekler ({verilenChecks.length})</TabsTrigger>
            <TabsTrigger value="alinan" className="text-[13px] data-[state=active]:bg-[#FF6B2B]/15 data-[state=active]:text-[#FF6B2B]">Aldığım Çekler ({alinanChecks.length})</TabsTrigger>
          </TabsList>
          <Button onClick={() => setShowForm(true)} className="gap-2" style={{ backgroundColor: "#FF6B2B" }}>
            <Plus className="w-4 h-4" /> Çek Ekle
          </Button>
        </div>

        <TabsContent value="verilen">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {verilenChecks.length === 0 ? (
              <p className="col-span-3 text-center py-12 text-[13px]" style={{ color: "#64748B" }}>Verilen çek yok</p>
            ) : verilenChecks.map(renderCheckCard)}
          </div>
        </TabsContent>
        <TabsContent value="alinan">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {alinanChecks.length === 0 ? (
              <p className="col-span-3 text-center py-12 text-[13px]" style={{ color: "#64748B" }}>Alınan çek yok</p>
            ) : alinanChecks.map(renderCheckCard)}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md" style={{ backgroundColor: "#161C23", borderColor: "#1E2732" }}>
          <DialogHeader><DialogTitle style={{ color: "#F1F5F9" }}>Çek Ekle</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-[12px] mb-1 block" style={{ color: "#94A3B8" }}>Çek Türü</label>
              <Select value={formType} onValueChange={v => setFormType(v as any)}>
                <SelectTrigger style={{ backgroundColor: "#1A2028", borderColor: "#2A3441", color: "#F1F5F9" }}><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="verilen">Verdiğim Çek</SelectItem>
                  <SelectItem value="alınan">Aldığım Çek</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[12px] mb-1 block" style={{ color: "#94A3B8" }}>Çek No</label>
                <Input value={form.check_no} onChange={e => setForm(f => ({ ...f, check_no: e.target.value }))} style={{ backgroundColor: "#1A2028", borderColor: "#2A3441", color: "#F1F5F9" }} />
              </div>
              <div>
                <label className="text-[12px] mb-1 block" style={{ color: "#94A3B8" }}>Tutar (₺)</label>
                <Input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} style={{ backgroundColor: "#1A2028", borderColor: "#2A3441", color: "#F1F5F9" }} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[12px] mb-1 block" style={{ color: "#94A3B8" }}>Banka</label>
                <Input value={form.bank_name} onChange={e => setForm(f => ({ ...f, bank_name: e.target.value }))} style={{ backgroundColor: "#1A2028", borderColor: "#2A3441", color: "#F1F5F9" }} />
              </div>
              <div>
                <label className="text-[12px] mb-1 block" style={{ color: "#94A3B8" }}>Şube (opsiyonel)</label>
                <Input value={form.branch} onChange={e => setForm(f => ({ ...f, branch: e.target.value }))} style={{ backgroundColor: "#1A2028", borderColor: "#2A3441", color: "#F1F5F9" }} />
              </div>
            </div>
            <div>
              <label className="text-[12px] mb-1 block" style={{ color: "#94A3B8" }}>{formType === "verilen" ? "Alıcı" : "Veren"}</label>
              <Input value={form.counterparty} onChange={e => setForm(f => ({ ...f, counterparty: e.target.value }))} style={{ backgroundColor: "#1A2028", borderColor: "#2A3441", color: "#F1F5F9" }} />
            </div>
            <div>
              <label className="text-[12px] mb-1 block" style={{ color: "#94A3B8" }}>Vade Tarihi</label>
              <Input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} style={{ backgroundColor: "#1A2028", borderColor: "#2A3441", color: "#F1F5F9" }} />
            </div>
            <div>
              <label className="text-[12px] mb-1 block" style={{ color: "#94A3B8" }}>Proje (opsiyonel)</label>
              <Select value={form.project_id || "none"} onValueChange={v => setForm(f => ({ ...f, project_id: v === "none" ? "" : v }))}>
                <SelectTrigger style={{ backgroundColor: "#1A2028", borderColor: "#2A3441", color: "#F1F5F9" }}><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Seçilmedi —</SelectItem>
                  {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={handleSubmit} className="w-full mt-2" style={{ backgroundColor: "#FF6B2B" }} disabled={!form.check_no || !form.amount || !form.due_date}>Kaydet</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CashChecksTab;
