import { useState } from "react";
import DeleteConfirmModal from "@/components/DeleteConfirmModal";
import { useCashPayments, CashPayment } from "@/hooks/useCashPayments";
import { useProjects } from "@/hooks/useProjects";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";

const CATEGORIES = ["Malzeme", "Taşeron", "İşçilik", "Ekipman Kirası", "Nakliye", "Vergi/SGK", "Sigorta", "Ofis Gideri", "Diğer"];
const PAYMENT_TYPES = [
  { value: "nakit", label: "Nakit" },
  { value: "havale", label: "Havale/EFT" },
  { value: "cek", label: "Çek" },
  { value: "kredi_karti", label: "Kredi Kartı" },
];
const STATUSES = [
  { value: "odendi", label: "✅ Ödendi", color: "#22C55E" },
  { value: "bekliyor", label: "⏳ Bekliyor", color: "#F59E0B" },
  { value: "planlandi", label: "📅 Planlandı", color: "#3B82F6" },
];

const fmt = (n: number) => new Intl.NumberFormat("tr-TR").format(n);

const CashPaymentsTab = () => {
  const { payments, isLoading, addPayment, deletePayment } = useCashPayments();
  const { projects } = useProjects();
  const [showForm, setShowForm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [form, setForm] = useState({
    payment_date: new Date().toISOString().slice(0, 10),
    recipient: "",
    category: "Malzeme",
    project_id: "",
    amount: "",
    payment_type: "nakit",
    status: "odendi",
    description: "",
    check_no: "",
    check_bank: "",
    check_due_date: "",
    iban: "",
    bank_name: "",
  });

  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const filtered = payments.filter(p => {
    if (filterCategory !== "all" && p.category !== filterCategory) return false;
    if (filterStatus !== "all" && p.status !== filterStatus) return false;
    return true;
  });

  const handleSubmit = () => {
    if (!form.recipient || !form.amount) return;
    addPayment.mutate({
      payment_date: form.payment_date,
      recipient: form.recipient,
      category: form.category,
      project_id: form.project_id || null,
      amount: parseFloat(form.amount),
      payment_type: form.payment_type,
      status: form.status,
      description: form.description || null,
      check_no: form.check_no || null,
      check_bank: form.check_bank || null,
      check_due_date: form.check_due_date || null,
      iban: form.iban || null,
      bank_name: form.bank_name || null,
    });
    setShowForm(false);
    setForm({ payment_date: new Date().toISOString().slice(0, 10), recipient: "", category: "Malzeme", project_id: "", amount: "", payment_type: "nakit", status: "odendi", description: "", check_no: "", check_bank: "", check_due_date: "", iban: "", bank_name: "" });
  };

  const statusInfo = (s: string) => STATUSES.find(st => st.value === s) || STATUSES[0];

  const inputClass = "bg-background border-border";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-[150px] h-9 text-[13px] border-border">
              <SelectValue placeholder="Kategori" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm Kategoriler</SelectItem>
              {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[140px] h-9 text-[13px] border-border">
              <SelectValue placeholder="Durum" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm Durumlar</SelectItem>
              {STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => setShowForm(true)} className="gap-2 text-primary-foreground bg-primary hover:bg-primary/90">
          <Plus className="w-4 h-4" /> Ödeme Ekle
        </Button>
      </div>

      {/* Desktop table */}
      <Card className="border border-border bg-card hidden md:block">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-border">
                  {["Tarih", "Alıcı", "Kategori", "Proje", "Tutar", "Ödeme Tipi", "Durum", ""].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-medium text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-12 text-muted-foreground">Henüz ödeme yok</td></tr>
                ) : filtered.map(p => {
                  const si = statusInfo(p.status);
                  const proj = projects.find(pr => pr.id === p.project_id);
                  return (
                    <tr key={p.id} className="border-b border-border hover-row">
                      <td className="px-4 py-3 text-foreground">{p.payment_date}</td>
                      <td className="px-4 py-3 font-medium text-foreground">{p.recipient}</td>
                      <td className="px-4 py-3 text-muted-foreground">{p.category}</td>
                      <td className="px-4 py-3 text-muted-foreground">{proj?.name || "-"}</td>
                      <td className="px-4 py-3 font-semibold" style={{ color: "#EF4444" }}>₺{fmt(p.amount)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{PAYMENT_TYPES.find(t => t.value === p.payment_type)?.label}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-medium" style={{ backgroundColor: si.color + "20", color: si.color }}>{si.label}</span>
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => setDeleteTarget({ id: p.id, name: `${p.recipient} - ₺${fmt(p.amount)}` })} className="p-1 rounded hover-danger"><Trash2 className="w-3.5 h-3.5" /></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {filtered.length === 0 ? (
          <p className="text-center py-12 text-muted-foreground text-[13px]">Henüz ödeme yok</p>
        ) : filtered.map(p => {
          const si = statusInfo(p.status);
          const proj = projects.find(pr => pr.id === p.project_id);
          return (
            <Card key={p.id} className="border border-border bg-card">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-[15px] font-semibold text-foreground">{p.recipient}</p>
                    <p className="text-[12px] text-muted-foreground">{p.category} • {PAYMENT_TYPES.find(t => t.value === p.payment_type)?.label}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-medium" style={{ backgroundColor: si.color + "20", color: si.color }}>{si.label}</span>
                    <button onClick={() => setDeleteTarget({ id: p.id, name: `${p.recipient} - ₺${fmt(p.amount)}` })} className="p-1.5 rounded hover-danger"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
                <p className="text-xl font-bold mb-1" style={{ color: "#EF4444" }}>₺{fmt(p.amount)}</p>
                <div className="flex items-center gap-3 text-[12px] text-muted-foreground">
                  <span>📅 {p.payment_date}</span>
                  {proj && <span>📁 {proj.name}</span>}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Add Payment Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Ödeme Ekle</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-[65vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[12px] mb-1 block text-muted-foreground">Tarih</label>
                <Input type="date" value={form.payment_date} onChange={e => setForm(f => ({ ...f, payment_date: e.target.value }))} className={inputClass} />
              </div>
              <div>
                <label className="text-[12px] mb-1 block text-muted-foreground">Tutar (₺)</label>
                <Input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="örn: 125000" className={inputClass} />
              </div>
            </div>
            <div>
              <label className="text-[12px] mb-1 block text-muted-foreground">Alıcı</label>
              <Input value={form.recipient} onChange={e => setForm(f => ({ ...f, recipient: e.target.value }))} placeholder="örn: Ahmet Usta / Demir Çelik A.Ş." className={inputClass} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[12px] mb-1 block text-muted-foreground">Kategori</label>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger className={inputClass}><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-[12px] mb-1 block text-muted-foreground">Ödeme Tipi</label>
                <Select value={form.payment_type} onValueChange={v => setForm(f => ({ ...f, payment_type: v }))}>
                  <SelectTrigger className={inputClass}><SelectValue /></SelectTrigger>
                  <SelectContent>{PAYMENT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            {form.payment_type === "cek" && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[12px] mb-1 block text-muted-foreground">Çek No</label>
                  <Input value={form.check_no} onChange={e => setForm(f => ({ ...f, check_no: e.target.value }))} placeholder="örn: 123456" className={inputClass} />
                </div>
                <div>
                  <label className="text-[12px] mb-1 block text-muted-foreground">Banka</label>
                  <Input value={form.check_bank} onChange={e => setForm(f => ({ ...f, check_bank: e.target.value }))} placeholder="örn: Ziraat Bankası" className={inputClass} />
                </div>
              </div>
            )}
            {form.payment_type === "havale" && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[12px] mb-1 block text-muted-foreground">IBAN</label>
                  <Input value={form.iban} onChange={e => setForm(f => ({ ...f, iban: e.target.value }))} placeholder="TR00 0000 0000 0000 0000 00" className={inputClass} />
                </div>
                <div>
                  <label className="text-[12px] mb-1 block text-muted-foreground">Banka</label>
                  <Input value={form.bank_name} onChange={e => setForm(f => ({ ...f, bank_name: e.target.value }))} placeholder="örn: Garanti BBVA" className={inputClass} />
                </div>
              </div>
            )}
            <div>
              <label className="text-[12px] mb-1 block text-muted-foreground">Proje (opsiyonel)</label>
              <Select value={form.project_id || "none"} onValueChange={v => setForm(f => ({ ...f, project_id: v === "none" ? "" : v }))}>
                <SelectTrigger className={inputClass}><SelectValue placeholder="Proje seçin..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Seçilmedi —</SelectItem>
                  {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-[12px] mb-1 block text-muted-foreground">Durum</label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger className={inputClass}><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-[12px] mb-1 block text-muted-foreground">Açıklama (opsiyonel)</label>
              <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="örn: Mart ayı işçilik ödemesi" className={inputClass} />
            </div>
          </div>
          <Button onClick={handleSubmit} className="w-full mt-2 text-primary-foreground bg-primary hover:bg-primary/90" disabled={!form.recipient || !form.amount}>
            Kaydet
          </Button>
        </DialogContent>
      </Dialog>
      <DeleteConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => { if (deleteTarget) deletePayment.mutate(deleteTarget.id); }}
        title="Ödemeyi Sil"
        itemName={deleteTarget?.name}
      />
    </div>
  );
};

export default CashPaymentsTab;
