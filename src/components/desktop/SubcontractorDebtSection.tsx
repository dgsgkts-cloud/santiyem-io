import { useState, useMemo } from "react";
import { Plus, Banknote, FileText, Building2, CreditCard, X, Trash2, AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import { useSubcontractors, useSubcontractorPayments, Subcontractor } from "@/hooks/useSubcontractors";
import { useProjects } from "@/hooks/useProjects";
import { formatCurrencyFull as fmtFull } from "@/lib/formatCurrency";
import DeleteConfirmModal from "@/components/DeleteConfirmModal";
import { format, parseISO, isBefore } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";
import { useQueryClient } from "@tanstack/react-query";

const SUB_PAY_MARKER = "__sub_pay:";


const PAYMENT_METHODS = [
  { value: "nakit", label: "Nakit", icon: Banknote, emoji: "💵" },
  { value: "cek", label: "Çek", icon: FileText, emoji: "🧾" },
  { value: "havale", label: "Havale / EFT", icon: Building2, emoji: "🏦" },
  { value: "kredi_karti", label: "Kredi Kartı", icon: CreditCard, emoji: "💳" },
];

const methodLabel = (m: string) => PAYMENT_METHODS.find(x => x.value === m) ?? PAYMENT_METHODS[0];

export default function SubcontractorDebtSection() {
  const { user } = useUser();
  const queryClient = useQueryClient();
  const { projects } = useProjects();
  const { subcontractors, addSubcontractor, deleteSubcontractor } = useSubcontractors();
  const { payments: allPayments, deletePayment } = useSubcontractorPayments();


  const [addSubModal, setAddSubModal] = useState(false);
  const [detailSub, setDetailSub] = useState<Subcontractor | null>(null);
  const [payModalFor, setPayModalFor] = useState<Subcontractor | null>(null);
  const [deleteSub, setDeleteSub] = useState<Subcontractor | null>(null);
  const [deletePay, setDeletePay] = useState<{ id: string } | null>(null);

  const subForm0 = { name: "", contact_person: "", phone: "", project_ids: [] as string[], contract_amount: "", description: "" };
  const [subForm, setSubForm] = useState(subForm0);

  const payForm0 = {
    payment_date: new Date().toISOString().slice(0, 10),
    amount: "",
    payment_method: "nakit",
    project_id: "",
    check_no: "",
    check_due_date: "",
    bank_name: "",
    account_no: "",
    note: "",
  };
  const [payForm, setPayForm] = useState(payForm0);
  const [payErrors, setPayErrors] = useState<Record<string, string>>({});

  const validatePayForm = (f: typeof payForm0) => {
    const errs: Record<string, string> = {};
    if (!f.payment_date) errs.payment_date = "Ödeme tarihi zorunlu";
    if (!f.amount || Number(f.amount) <= 0) errs.amount = "Geçerli bir tutar girin";
    if (!f.payment_method) errs.payment_method = "Ödeme yöntemi seçin";
    if (f.payment_method === "cek") {
      if (!f.check_no.trim()) errs.check_no = "Çek No zorunlu";
      if (!f.check_due_date) errs.check_due_date = "Vade tarihi zorunlu";
    }
    if (f.payment_method === "havale" && !f.bank_name.trim()) {
      errs.bank_name = "Banka adı zorunlu";
    }
    return errs;
  };

  const enriched = useMemo(() => subcontractors.map(s => {
    const pays = allPayments.filter(p => p.subcontractor_id === s.id && p.status === "odendi");
    const totalPaid = pays.reduce((sum, p) => sum + Number(p.amount), 0);
    const remaining = Number(s.contract_amount) - totalPaid;
    const pct = s.contract_amount > 0 ? Math.min(100, (totalPaid / Number(s.contract_amount)) * 100) : 0;
    return { ...s, totalPaid, remaining, pct };
  }), [subcontractors, allPayments]);

  const projectName = (id?: string | null) => projects.find(p => p.id === id)?.name || "—";

  const handleAddSub = async () => {
    if (!subForm.name.trim()) return toast.error("Taşeron adı zorunlu");
    if (!subForm.contract_amount || Number(subForm.contract_amount) <= 0) return toast.error("Sözleşme bedeli zorunlu");
    await addSubcontractor.mutateAsync({
      name: subForm.name.trim(),
      contact_person: subForm.contact_person.trim() || null,
      phone: subForm.phone.trim() || null,
      project_ids: subForm.project_ids,
      project_id: subForm.project_ids[0] || null,
      contract_amount: Number(subForm.contract_amount),
      description: subForm.description.trim() || null,
    } as any);
    setSubForm(subForm0);
    setAddSubModal(false);
  };

  const handleAddPay = async () => {
    if (!payModalFor || !user) return;
    const errs = validatePayForm(payForm);
    if (Object.keys(errs).length > 0) {
      setPayErrors(errs);
      toast.error("Lütfen zorunlu alanları doldurun");
      return;
    }
    setPayErrors({});

    // 1) Insert subcontractor payment, get its id back
    const { data: subPayRow, error: spErr } = await supabase
      .from("subcontractor_payments" as any)
      .insert({
        user_id: user.id,
        subcontractor_id: payModalFor.id,
        amount: Number(payForm.amount),
        payment_date: payForm.payment_date,
        payment_method: payForm.payment_method,
        project_id: payForm.project_id || null,
        check_no: payForm.check_no || null,
        check_due_date: payForm.check_due_date || null,
        bank_name: payForm.bank_name || null,
        account_no: payForm.account_no || null,
        note: payForm.note || null,
        status: "odendi",
      } as any)
      .select()
      .single();

    if (spErr || !subPayRow) {
      toast.error("Ödeme eklenemedi");
      return;
    }

    // 2) Mirror into Kasa as a general expense (cash_payments)
    const subPayId = (subPayRow as any).id;
    const cashPayloadDesc = [
      payForm.note?.trim(),
      `[${SUB_PAY_MARKER}${subPayId}]`,
    ].filter(Boolean).join(" ");

    const { error: cashErr } = await supabase.from("cash_payments" as any).insert({
      user_id: user.id,
      recipient: payModalFor.name,
      category: "Taşeron Ödemesi",
      amount: Number(payForm.amount),
      payment_date: payForm.payment_date,
      payment_type: payForm.payment_method === "kredi_karti" ? "kredi_karti" : payForm.payment_method,
      project_id: payForm.project_id || null,
      check_no: payForm.payment_method === "cek" ? (payForm.check_no || null) : null,
      check_due_date: payForm.payment_method === "cek" ? (payForm.check_due_date || null) : null,
      check_bank: payForm.payment_method === "cek" ? (payForm.bank_name || null) : null,
      bank_name: payForm.payment_method === "havale" ? (payForm.bank_name || null) : null,
      iban: payForm.payment_method === "havale" ? (payForm.account_no || null) : null,
      description: cashPayloadDesc,
      status: "odendi",
    } as any);

    if (cashErr) {
      console.warn("Kasa kaydı eklenemedi", cashErr);
      toast.warning("Ödeme kaydedildi ancak kasa akışına yansıtılamadı");
    } else {
      toast.success("Ödeme kaydedildi ve kasaya yansıtıldı");
    }

    queryClient.invalidateQueries({ queryKey: ["subcontractor_payments"] });
    queryClient.invalidateQueries({ queryKey: ["cash_payments"] });

    setPayForm(payForm0);
    setPayErrors({});
    setPayModalFor(null);
  };

  const handleDeletePay = async (id: string) => {
    // Remove mirrored cash row first (best-effort)
    await supabase
      .from("cash_payments" as any)
      .delete()
      .like("description", `%${SUB_PAY_MARKER}${id}%`);
    await deletePayment.mutateAsync(id);
    queryClient.invalidateQueries({ queryKey: ["cash_payments"] });
  };

  const detailPayments = useMemo(() => {
    if (!detailSub) return [];
    return allPayments.filter(p => p.subcontractor_id === detailSub.id)
      .sort((a, b) => b.payment_date.localeCompare(a.payment_date));
  }, [detailSub, allPayments]);

  const detailEnriched = detailSub ? enriched.find(e => e.id === detailSub.id) : null;

  return (
    <div className="rounded-xl bg-card border border-border p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground">Taşeron Borç Takibi</h3>
        <button
          onClick={() => setAddSubModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white"
          style={{ backgroundColor: "#FF6B2B" }}
        >
          <Plus className="w-3.5 h-3.5" /> Taşeron Ekle
        </button>
      </div>

      {enriched.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-6">Taşeron kaydı yok</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {enriched.map(s => (
            <div key={s.id} className="rounded-lg border border-border bg-background p-3 group">
              <div className="flex items-start justify-between mb-2">
                <button
                  onClick={() => setDetailSub(s)}
                  className="text-left flex-1 min-w-0"
                >
                  <p className="text-[14px] font-semibold text-foreground truncate">{s.name}</p>
                  {s.contact_person && <p className="text-[11px] text-muted-foreground truncate">{s.contact_person}</p>}
                </button>
                <button
                  onClick={() => setDeleteSub(s)}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded text-muted-foreground hover:text-red-500"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {(s.project_ids?.length > 0 || s.project_id) && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {(s.project_ids?.length ? s.project_ids : (s.project_id ? [s.project_id] : [])).map(pid => (
                    <span key={pid} className="text-[10px] px-2 py-0.5 rounded-full" style={{ backgroundColor: "rgba(255,107,43,0.12)", color: "#FF6B2B" }}>
                      {projectName(pid)}
                    </span>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-3 gap-2 text-center mb-2">
                <div>
                  <p className="text-[10px] text-muted-foreground">Sözleşme</p>
                  <p className="text-[12px] font-semibold text-foreground">{fmtFull(Number(s.contract_amount))}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Ödenen</p>
                  <p className="text-[12px] font-semibold" style={{ color: "#22C55E" }}>{fmtFull(s.totalPaid)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Kalan</p>
                  <p className="text-[13px] font-bold" style={{ color: s.remaining > 0 ? "#EF4444" : "#22C55E" }}>{fmtFull(s.remaining)}</p>
                </div>
              </div>

              <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden mb-2">
                <div className="h-full rounded-full transition-all" style={{ width: `${s.pct}%`, backgroundColor: "#FF6B2B" }} />
              </div>

              <button
                onClick={() => { setPayForm(payForm0); setPayModalFor(s); }}
                className="w-full py-2 rounded-lg text-xs font-medium text-white"
                style={{ backgroundColor: "#FF6B2B" }}
              >
                + Ödeme Ekle
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── Add subcontractor modal ── */}
      <Dialog open={addSubModal} onOpenChange={setAddSubModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Yeni Taşeron Ekle</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground">Taşeron / Firma Adı *</label>
              <input value={subForm.name} onChange={e => setSubForm({ ...subForm, name: e.target.value })} className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-muted-foreground">Yetkili Kişi</label>
                <input value={subForm.contact_person} onChange={e => setSubForm({ ...subForm, contact_person: e.target.value })} className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-sm" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Telefon</label>
                <input value={subForm.phone} onChange={e => setSubForm({ ...subForm, phone: e.target.value })} className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-sm" />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">İlişkili Projeler (çoklu seçim)</label>
              <div className="mt-1 max-h-32 overflow-y-auto border border-border rounded-lg p-2 bg-background space-y-1">
                {projects.length === 0 && <p className="text-xs text-muted-foreground p-2">Proje yok</p>}
                {projects.map(p => (
                  <label key={p.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 p-1 rounded">
                    <input
                      type="checkbox"
                      checked={subForm.project_ids.includes(p.id)}
                      onChange={e => {
                        const next = e.target.checked
                          ? [...subForm.project_ids, p.id]
                          : subForm.project_ids.filter(x => x !== p.id);
                        setSubForm({ ...subForm, project_ids: next });
                      }}
                    />
                    <span>{p.name}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Toplam Sözleşme Bedeli (₺) *</label>
              <input type="number" value={subForm.contract_amount} onChange={e => setSubForm({ ...subForm, contract_amount: e.target.value })} className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Açıklama / İş Tanımı</label>
              <textarea value={subForm.description} onChange={e => setSubForm({ ...subForm, description: e.target.value })} rows={2} className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-sm" />
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={() => setAddSubModal(false)} className="flex-1 py-2 rounded-lg border border-border text-sm">Vazgeç</button>
              <button onClick={handleAddSub} className="flex-1 py-2 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: "#FF6B2B" }}>Kaydet</button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Add payment modal ── */}
      <Dialog open={!!payModalFor} onOpenChange={o => { if (!o) { setPayModalFor(null); setPayErrors({}); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Ödeme Ekle — {payModalFor?.name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-muted-foreground">Ödeme Tarihi *</label>
                <input type="date" value={payForm.payment_date} onChange={e => setPayForm({ ...payForm, payment_date: e.target.value })} className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-sm" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Tutar (₺) *</label>
                <input type="number" value={payForm.amount} onChange={e => setPayForm({ ...payForm, amount: e.target.value })} className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-sm" />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Ödeme Yöntemi *</label>
              <div className="grid grid-cols-4 gap-1.5 mt-1">
                {PAYMENT_METHODS.map(m => (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setPayForm({ ...payForm, payment_method: m.value })}
                    className="py-2 rounded-lg text-xs font-medium border transition-colors"
                    style={{
                      borderColor: payForm.payment_method === m.value ? "#FF6B2B" : "hsl(var(--border))",
                      backgroundColor: payForm.payment_method === m.value ? "rgba(255,107,43,0.12)" : "transparent",
                      color: payForm.payment_method === m.value ? "#FF6B2B" : "hsl(var(--foreground))",
                    }}
                  >
                    <span className="block text-base">{m.emoji}</span>
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {payForm.payment_method === "cek" && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground">Çek No *</label>
                  <input value={payForm.check_no} onChange={e => setPayForm({ ...payForm, check_no: e.target.value })} className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-sm" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Vade Tarihi *</label>
                  <input type="date" value={payForm.check_due_date} onChange={e => setPayForm({ ...payForm, check_due_date: e.target.value })} className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-sm" />
                </div>
              </div>
            )}
            {payForm.payment_method === "havale" && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground">Banka Adı *</label>
                  <input value={payForm.bank_name} onChange={e => setPayForm({ ...payForm, bank_name: e.target.value })} className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-sm" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">IBAN / Hesap No</label>
                  <input value={payForm.account_no} onChange={e => setPayForm({ ...payForm, account_no: e.target.value })} className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-sm" />
                </div>
              </div>
            )}

            <div>
              <label className="text-xs text-muted-foreground">İlişkili Proje</label>
              <select value={payForm.project_id} onChange={e => setPayForm({ ...payForm, project_id: e.target.value })} className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-sm">
                <option value="">Seçiniz</option>
                {(payModalFor?.project_ids?.length ? payModalFor.project_ids : projects.map(p => p.id))
                  .map(pid => projects.find(p => p.id === pid))
                  .filter(Boolean)
                  .map(p => <option key={p!.id} value={p!.id}>{p!.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Not</label>
              <textarea value={payForm.note} onChange={e => setPayForm({ ...payForm, note: e.target.value })} rows={2} className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-sm" />
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={() => setPayModalFor(null)} className="flex-1 py-2 rounded-lg border border-border text-sm">Vazgeç</button>
              <button onClick={handleAddPay} className="flex-1 py-2 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: "#FF6B2B" }}>Kaydet</button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Detail drawer ── */}
      <Sheet open={!!detailSub} onOpenChange={o => !o && setDetailSub(null)}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{detailSub?.name}</SheetTitle>
          </SheetHeader>
          {detailSub && detailEnriched && (
            <div className="mt-4 space-y-4">
              <div className="text-xs text-muted-foreground space-y-1">
                {detailSub.contact_person && <p>Yetkili: {detailSub.contact_person}</p>}
                {detailSub.phone && <p>Tel: {detailSub.phone}</p>}
                {detailSub.description && <p className="pt-1">{detailSub.description}</p>}
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-lg p-3 bg-muted/40">
                  <p className="text-[10px] text-muted-foreground">Sözleşme</p>
                  <p className="text-sm font-semibold">{fmtFull(Number(detailSub.contract_amount))}</p>
                </div>
                <div className="rounded-lg p-3 bg-muted/40">
                  <p className="text-[10px] text-muted-foreground">Ödenen</p>
                  <p className="text-sm font-semibold" style={{ color: "#22C55E" }}>{fmtFull(detailEnriched.totalPaid)}</p>
                </div>
                <div className="rounded-lg p-3 bg-muted/40">
                  <p className="text-[10px] text-muted-foreground">Kalan</p>
                  <p className="text-sm font-bold" style={{ color: detailEnriched.remaining > 0 ? "#EF4444" : "#22C55E" }}>{fmtFull(detailEnriched.remaining)}</p>
                </div>
              </div>

              <button
                onClick={() => { setPayForm(payForm0); setPayModalFor(detailSub); }}
                className="w-full py-2 rounded-lg text-sm font-medium text-white"
                style={{ backgroundColor: "#FF6B2B" }}
              >
                + Ödeme Ekle
              </button>

              <div>
                <h4 className="text-xs font-semibold mb-2 text-foreground">Ödeme Geçmişi</h4>
                {detailPayments.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">Henüz ödeme yok</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-left text-muted-foreground border-b border-border">
                          <th className="py-2 px-2">Tarih</th>
                          <th className="py-2 px-2">Tutar</th>
                          <th className="py-2 px-2">Yöntem</th>
                          <th className="py-2 px-2">Proje</th>
                          <th className="py-2 px-2">Not</th>
                          <th className="py-2 px-2"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {detailPayments.map(p => {
                          const m = methodLabel(p.payment_method);
                          const isOverdueCheck = p.payment_method === "cek" && p.check_due_date && isBefore(parseISO(p.check_due_date), new Date());
                          return (
                            <tr key={p.id} className={`border-b border-border ${isOverdueCheck ? "bg-yellow-500/10" : ""}`}>
                              <td className="py-2 px-2">{format(parseISO(p.payment_date), "dd.MM.yyyy")}</td>
                              <td className="py-2 px-2 font-semibold">{fmtFull(Number(p.amount))}</td>
                              <td className="py-2 px-2">
                                <span title={m.label}>{m.emoji} {m.label}</span>
                                {p.payment_method === "cek" && p.check_due_date && (
                                  <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                                    {isOverdueCheck && <AlertTriangle className="w-3 h-3" style={{ color: "#F59E0B" }} />}
                                    Vade: {format(parseISO(p.check_due_date), "dd.MM.yyyy")}
                                  </div>
                                )}
                              </td>
                              <td className="py-2 px-2">{projectName(p.project_id)}</td>
                              <td className="py-2 px-2 text-muted-foreground">{p.note || "—"}</td>
                              <td className="py-2 px-2">
                                <button onClick={() => setDeletePay({ id: p.id })} className="text-muted-foreground hover:text-red-500">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <DeleteConfirmModal
        open={!!deleteSub}
        onClose={() => setDeleteSub(null)}
        title="Taşeronu Sil"
        itemName={deleteSub?.name || ""}
        onConfirm={async () => { if (deleteSub) await deleteSubcontractor.mutateAsync(deleteSub.id); setDeleteSub(null); }}
      />
      <DeleteConfirmModal
        open={!!deletePay}
        onClose={() => setDeletePay(null)}
        title="Ödemeyi Sil"
        itemName="ödeme kaydı"
        onConfirm={async () => { if (deletePay) await handleDeletePay(deletePay.id); setDeletePay(null); }}
      />
    </div>
  );
}
