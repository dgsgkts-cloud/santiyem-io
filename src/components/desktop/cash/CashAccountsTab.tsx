import { useState } from "react";
import DeleteConfirmModal from "@/components/DeleteConfirmModal";
import { useCashAccounts } from "@/hooks/useCashAccounts";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Banknote, Building2, CreditCard, ArrowLeftRight } from "lucide-react";

const ACCOUNT_TYPES = [
  { value: "nakit_kasa", label: "💵 Nakit Kasa", icon: Banknote, color: "#22C55E" },
  { value: "banka", label: "🏦 Banka Hesabı", icon: Building2, color: "#3B82F6" },
  { value: "kredi_karti", label: "💳 Kredi Kartı", icon: CreditCard, color: "#A855F7" },
];

const fmt = (n: number) => new Intl.NumberFormat("tr-TR").format(n);

const CashAccountsTab = () => {
  const { accounts, addAccount, updateAccount, deleteAccount } = useCashAccounts();
  const [showForm, setShowForm] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [form, setForm] = useState({
    name: "", account_type: "nakit_kasa", balance: "", bank_name: "", iban: "", account_no: "", branch: "",
  });
  const [transfer, setTransfer] = useState({ from: "", to: "", amount: "" });

  const handleSubmit = () => {
    if (!form.name) return;
    addAccount.mutate({
      name: form.name,
      account_type: form.account_type,
      balance: parseFloat(form.balance) || 0,
      bank_name: form.bank_name || null,
      iban: form.iban || null,
      account_no: form.account_no || null,
      branch: form.branch || null,
    });
    setShowForm(false);
    setForm({ name: "", account_type: "nakit_kasa", balance: "", bank_name: "", iban: "", account_no: "", branch: "" });
  };

  const handleTransfer = () => {
    const amount = parseFloat(transfer.amount);
    if (!transfer.from || !transfer.to || !amount || transfer.from === transfer.to) return;
    const fromAcc = accounts.find(a => a.id === transfer.from);
    const toAcc = accounts.find(a => a.id === transfer.to);
    if (!fromAcc || !toAcc) return;
    updateAccount.mutate({ id: fromAcc.id, balance: Number(fromAcc.balance) - amount });
    updateAccount.mutate({ id: toAcc.id, balance: Number(toAcc.balance) + amount });
    setShowTransfer(false);
    setTransfer({ from: "", to: "", amount: "" });
  };

  const handleUpdateBalance = (id: string) => {
    const newBalance = prompt("Yeni bakiye (₺):");
    if (newBalance === null) return;
    updateAccount.mutate({ id, balance: parseFloat(newBalance) || 0 });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end gap-3">
        {accounts.length >= 2 && (
          <Button onClick={() => setShowTransfer(true)} variant="outline" className="gap-2 text-[13px]" style={{ borderColor: "#2A3441" }}>
            <ArrowLeftRight className="w-4 h-4" /> Transfer
          </Button>
        )}
        <Button onClick={() => setShowForm(true)} className="gap-2" style={{ backgroundColor: "#FF6B2B" }}>
          <Plus className="w-4 h-4" /> Hesap Ekle
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {accounts.length === 0 ? (
          <p className="col-span-3 text-center py-16 text-[13px]" style={{ color: "#64748B" }}>Henüz hesap eklenmemiş</p>
        ) : accounts.map(acc => {
          const type = ACCOUNT_TYPES.find(t => t.value === acc.account_type) || ACCOUNT_TYPES[0];
          const Icon = type.icon;
          return (
            <Card key={acc.id} className="border-0 bg-card">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: type.color + "15" }}>
                      <Icon className="w-5 h-5" style={{ color: type.color }} />
                    </div>
                    <div>
                      <p className="text-[14px] font-semibold text-foreground">{acc.name}</p>
                      <p className="text-[11px]" style={{ color: "#64748B" }}>{type.label}</p>
                    </div>
                  </div>
                  <button onClick={() => setDeleteTarget({ id: acc.id, name: acc.name })} className="p-1.5 rounded-lg hover:bg-red-500/10">
                    <Trash2 className="w-4 h-4" style={{ color: "#EF4444" }} />
                  </button>
                </div>
                <p className="text-2xl font-bold mb-2" style={{ color: Number(acc.balance) >= 0 ? "#22C55E" : "#EF4444" }}>
                  ₺{fmt(acc.balance)}
                </p>
                {acc.bank_name && <p className="text-[11px] mb-1" style={{ color: "#64748B" }}>Banka: {acc.bank_name}</p>}
                {acc.iban && <p className="text-[11px] mb-1" style={{ color: "#64748B" }}>IBAN: {acc.iban}</p>}
                <button
                  onClick={() => handleUpdateBalance(acc.id)}
                  className="mt-3 text-[12px] font-medium px-3 py-1.5 rounded-md"
                  style={{ backgroundColor: "rgba(59,130,246,0.1)", color: "#3B82F6" }}
                >
                  Bakiyeyi Güncelle
                </button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Add Account Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md" style={{ borderColor: "#1E2732" }}>
          <DialogHeader><DialogTitle className="text-foreground">Hesap Ekle</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-[12px] mb-1 block" style={{ color: "#94A3B8" }}>Hesap Adı</label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Örn: Şantiye Kasası" style={{ backgroundColor: "#1A2028", borderColor: "#2A3441" }} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[12px] mb-1 block" style={{ color: "#94A3B8" }}>Hesap Tipi</label>
                <Select value={form.account_type} onValueChange={v => setForm(f => ({ ...f, account_type: v }))}>
                  <SelectTrigger style={{ backgroundColor: "#1A2028", borderColor: "#2A3441" }}><SelectValue /></SelectTrigger>
                  <SelectContent>{ACCOUNT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-[12px] mb-1 block" style={{ color: "#94A3B8" }}>Bakiye (₺)</label>
                <Input type="number" value={form.balance} onChange={e => setForm(f => ({ ...f, balance: e.target.value }))} style={{ backgroundColor: "#1A2028", borderColor: "#2A3441" }} />
              </div>
            </div>
            {form.account_type === "banka" && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[12px] mb-1 block" style={{ color: "#94A3B8" }}>Banka Adı</label>
                    <Input value={form.bank_name} onChange={e => setForm(f => ({ ...f, bank_name: e.target.value }))} style={{ backgroundColor: "#1A2028", borderColor: "#2A3441" }} />
                  </div>
                  <div>
                    <label className="text-[12px] mb-1 block" style={{ color: "#94A3B8" }}>Şube</label>
                    <Input value={form.branch} onChange={e => setForm(f => ({ ...f, branch: e.target.value }))} style={{ backgroundColor: "#1A2028", borderColor: "#2A3441" }} />
                  </div>
                </div>
                <div>
                  <label className="text-[12px] mb-1 block" style={{ color: "#94A3B8" }}>IBAN</label>
                  <Input value={form.iban} onChange={e => setForm(f => ({ ...f, iban: e.target.value }))} style={{ backgroundColor: "#1A2028", borderColor: "#2A3441" }} />
                </div>
              </>
            )}
          </div>
          <Button onClick={handleSubmit} className="w-full mt-2" style={{ backgroundColor: "#FF6B2B" }} disabled={!form.name}>Kaydet</Button>
        </DialogContent>
      </Dialog>

      {/* Transfer Dialog */}
      <Dialog open={showTransfer} onOpenChange={setShowTransfer}>
        <DialogContent className="max-w-sm" style={{ borderColor: "#1E2732" }}>
          <DialogHeader><DialogTitle className="text-foreground">Hesaplar Arası Transfer</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-[12px] mb-1 block" style={{ color: "#94A3B8" }}>Kaynak Hesap</label>
              <Select value={transfer.from} onValueChange={v => setTransfer(t => ({ ...t, from: v }))}>
                <SelectTrigger style={{ backgroundColor: "#1A2028", borderColor: "#2A3441" }}><SelectValue placeholder="Seçiniz" /></SelectTrigger>
                <SelectContent>{accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name} (₺{fmt(a.balance)})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-[12px] mb-1 block" style={{ color: "#94A3B8" }}>Hedef Hesap</label>
              <Select value={transfer.to} onValueChange={v => setTransfer(t => ({ ...t, to: v }))}>
                <SelectTrigger style={{ backgroundColor: "#1A2028", borderColor: "#2A3441" }}><SelectValue placeholder="Seçiniz" /></SelectTrigger>
                <SelectContent>{accounts.filter(a => a.id !== transfer.from).map(a => <SelectItem key={a.id} value={a.id}>{a.name} (₺{fmt(a.balance)})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-[12px] mb-1 block" style={{ color: "#94A3B8" }}>Tutar (₺)</label>
              <Input type="number" value={transfer.amount} onChange={e => setTransfer(t => ({ ...t, amount: e.target.value }))} style={{ backgroundColor: "#1A2028", borderColor: "#2A3441" }} />
            </div>
          </div>
          <Button onClick={handleTransfer} className="w-full mt-2" style={{ backgroundColor: "#FF6B2B" }} disabled={!transfer.from || !transfer.to || !transfer.amount}>Transfer Et</Button>
        </DialogContent>
      </Dialog>
      <DeleteConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => { if (deleteTarget) deleteAccount.mutate(deleteTarget.id); }}
        title="Hesabı Sil"
        itemName={deleteTarget?.name}
      />
    </div>
  );
};

export default CashAccountsTab;
