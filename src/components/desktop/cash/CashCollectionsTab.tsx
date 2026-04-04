import { useState } from "react";
import DeleteConfirmModal from "@/components/DeleteConfirmModal";
import { useCashCollections } from "@/hooks/useCashCollections";
import { useProjects } from "@/hooks/useProjects";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";

const TYPES = ["Hakediş Ödemesi", "Avans", "Kesin Hesap", "Kira Geliri", "Diğer"];
const PAYMENT_TYPES = [
  { value: "nakit", label: "Nakit" },
  { value: "havale", label: "Havale/EFT" },
  { value: "cek", label: "Çek" },
];
const STATUSES = [
  { value: "tahsil_edildi", label: "✅ Tahsil Edildi", color: "#22C55E" },
  { value: "bekleniyor", label: "⏳ Bekleniyor", color: "#F59E0B" },
  { value: "gecikmi", label: "⚠️ Gecikmiş", color: "#EF4444" },
];

const fmt = (n: number) => new Intl.NumberFormat("tr-TR").format(n);

const CashCollectionsTab = () => {
  const { collections, addCollection, deleteCollection } = useCashCollections();
  const { projects } = useProjects();
  const [showForm, setShowForm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [form, setForm] = useState({
    collection_date: new Date().toISOString().slice(0, 10),
    sender: "",
    collection_type: "Hakediş Ödemesi",
    project_id: "",
    amount: "",
    payment_type: "nakit",
    status: "bekleniyor",
    description: "",
    check_no: "",
    check_bank: "",
    check_due_date: "",
  });

  const handleSubmit = () => {
    if (!form.sender || !form.amount) return;
    addCollection.mutate({
      collection_date: form.collection_date,
      sender: form.sender,
      collection_type: form.collection_type,
      project_id: form.project_id || null,
      amount: parseFloat(form.amount),
      payment_type: form.payment_type,
      status: form.status,
      description: form.description || null,
      check_no: form.check_no || null,
      check_bank: form.check_bank || null,
      check_due_date: form.check_due_date || null,
    });
    setShowForm(false);
    setForm({ collection_date: new Date().toISOString().slice(0, 10), sender: "", collection_type: "Hakediş Ödemesi", project_id: "", amount: "", payment_type: "nakit", status: "bekleniyor", description: "", check_no: "", check_bank: "", check_due_date: "" });
  };

  const statusInfo = (s: string) => STATUSES.find(st => st.value === s) || STATUSES[1];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Button onClick={() => setShowForm(true)} className="gap-2" style={{ backgroundColor: "#FF6B2B" }}>
          <Plus className="w-4 h-4" /> Tahsilat Ekle
        </Button>
      </div>

      <Card className="border-0" style={{ backgroundColor: "#161C23" }}>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr style={{ borderBottom: "1px solid #1E2732" }}>
                  {["Tarih", "Gönderen", "Tür", "Proje", "Tutar", "Ödeme Tipi", "Durum", ""].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-medium" style={{ color: "#64748B" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {collections.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-12" style={{ color: "#64748B" }}>Henüz tahsilat yok</td></tr>
                ) : collections.map(c => {
                  const si = statusInfo(c.status);
                  const proj = projects.find(pr => pr.id === c.project_id);
                  return (
                    <tr key={c.id} style={{ borderBottom: "1px solid #1E2732" }} className="hover:bg-[#1A2028]">
                      <td className="px-4 py-3" style={{ color: "#F1F5F9" }}>{c.collection_date}</td>
                      <td className="px-4 py-3 font-medium" style={{ color: "#F1F5F9" }}>{c.sender}</td>
                      <td className="px-4 py-3" style={{ color: "#94A3B8" }}>{c.collection_type}</td>
                      <td className="px-4 py-3" style={{ color: "#94A3B8" }}>{proj?.name || "-"}</td>
                      <td className="px-4 py-3 font-semibold" style={{ color: "#22C55E" }}>₺{fmt(c.amount)}</td>
                      <td className="px-4 py-3" style={{ color: "#94A3B8" }}>{PAYMENT_TYPES.find(t => t.value === c.payment_type)?.label}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-medium" style={{ backgroundColor: si.color + "20", color: si.color }}>{si.label}</span>
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => setDeleteTarget({ id: c.id, name: `${c.sender} - ₺${fmt(c.amount)}` })} className="p-1 rounded hover:bg-red-500/10"><Trash2 className="w-3.5 h-3.5" style={{ color: "#EF4444" }} /></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md" style={{ backgroundColor: "#161C23", borderColor: "#1E2732" }}>
          <DialogHeader><DialogTitle style={{ color: "#F1F5F9" }}>Tahsilat Ekle</DialogTitle></DialogHeader>
          <div className="space-y-3 max-h-[65vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[12px] mb-1 block" style={{ color: "#94A3B8" }}>Tarih</label>
                <Input type="date" value={form.collection_date} onChange={e => setForm(f => ({ ...f, collection_date: e.target.value }))} style={{ backgroundColor: "#1A2028", borderColor: "#2A3441", color: "#F1F5F9" }} />
              </div>
              <div>
                <label className="text-[12px] mb-1 block" style={{ color: "#94A3B8" }}>Tutar (₺)</label>
                <Input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} style={{ backgroundColor: "#1A2028", borderColor: "#2A3441", color: "#F1F5F9" }} />
              </div>
            </div>
            <div>
              <label className="text-[12px] mb-1 block" style={{ color: "#94A3B8" }}>Gönderen</label>
              <Input value={form.sender} onChange={e => setForm(f => ({ ...f, sender: e.target.value }))} placeholder="Kişi veya firma adı" style={{ backgroundColor: "#1A2028", borderColor: "#2A3441", color: "#F1F5F9" }} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[12px] mb-1 block" style={{ color: "#94A3B8" }}>Tür</label>
                <Select value={form.collection_type} onValueChange={v => setForm(f => ({ ...f, collection_type: v }))}>
                  <SelectTrigger style={{ backgroundColor: "#1A2028", borderColor: "#2A3441", color: "#F1F5F9" }}><SelectValue /></SelectTrigger>
                  <SelectContent>{TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-[12px] mb-1 block" style={{ color: "#94A3B8" }}>Ödeme Tipi</label>
                <Select value={form.payment_type} onValueChange={v => setForm(f => ({ ...f, payment_type: v }))}>
                  <SelectTrigger style={{ backgroundColor: "#1A2028", borderColor: "#2A3441", color: "#F1F5F9" }}><SelectValue /></SelectTrigger>
                  <SelectContent>{PAYMENT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            {form.payment_type === "cek" && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[12px] mb-1 block" style={{ color: "#94A3B8" }}>Çek No</label>
                  <Input value={form.check_no} onChange={e => setForm(f => ({ ...f, check_no: e.target.value }))} style={{ backgroundColor: "#1A2028", borderColor: "#2A3441", color: "#F1F5F9" }} />
                </div>
                <div>
                  <label className="text-[12px] mb-1 block" style={{ color: "#94A3B8" }}>Banka</label>
                  <Input value={form.check_bank} onChange={e => setForm(f => ({ ...f, check_bank: e.target.value }))} style={{ backgroundColor: "#1A2028", borderColor: "#2A3441", color: "#F1F5F9" }} />
                </div>
              </div>
            )}
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
            <div>
              <label className="text-[12px] mb-1 block" style={{ color: "#94A3B8" }}>Durum</label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger style={{ backgroundColor: "#1A2028", borderColor: "#2A3441", color: "#F1F5F9" }}><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-[12px] mb-1 block" style={{ color: "#94A3B8" }}>Açıklama</label>
              <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} style={{ backgroundColor: "#1A2028", borderColor: "#2A3441", color: "#F1F5F9" }} />
            </div>
          </div>
          <Button onClick={handleSubmit} className="w-full mt-2" style={{ backgroundColor: "#FF6B2B" }} disabled={!form.sender || !form.amount}>Kaydet</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CashCollectionsTab;
