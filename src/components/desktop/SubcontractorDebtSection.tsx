import { useState, useMemo, useEffect, useRef } from "react";
import { Plus, Banknote, FileText, Building2, CreditCard, Trash2, AlertTriangle, Pencil, MoreHorizontal, Download, Users } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useSubcontractors, useSubcontractorPayments, Subcontractor, SubcontractorPayment } from "@/hooks/useSubcontractors";
import { useSubcontractorCheckAlerts } from "@/hooks/useSubcontractorCheckAlerts";
import { useProjects } from "@/hooks/useProjects";
import { formatCurrencyFull as fmtFull } from "@/lib/formatCurrency";
import DeleteConfirmModal from "@/components/DeleteConfirmModal";
import { format, parseISO, isBefore } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";
import { useQueryClient } from "@tanstack/react-query";
import { exportSubcontractorPDF, exportSubcontractorExcel } from "@/lib/subcontractorReportExport";




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
  const { payments: allPayments } = useSubcontractorPayments();


  const [addSubModal, setAddSubModal] = useState(false);
  const [detailSub, setDetailSub] = useState<Subcontractor | null>(null);
  const [payModalFor, setPayModalFor] = useState<Subcontractor | null>(null);
  const [deleteSub, setDeleteSub] = useState<Subcontractor | null>(null);
  const [deletePay, setDeletePay] = useState<{ id: string } | null>(null);
  const [editPayId, setEditPayId] = useState<string | null>(null);

  const subForm0 = { name: "", contact_person: "", phone: "", project_ids: [] as string[], contract_amount: "", description: "" };
  const [subForm, setSubForm] = useState(subForm0);

  // Cross-page deep-link: open a subcontractor's drawer from elsewhere (e.g. cash list)
  useEffect(() => {
    const handler = (e: Event) => {
      const id = (e as CustomEvent).detail?.id;
      if (!id) return;
      const sub = subcontractors.find(s => s.id === id);
      if (sub) setDetailSub(sub);
    };
    window.addEventListener("open-subcontractor-detail", handler as EventListener);
    return () => window.removeEventListener("open-subcontractor-detail", handler as EventListener);
  }, [subcontractors]);

  const payForm0 = {
    payment_date: new Date().toISOString().slice(0, 10),
    amount: "",
    payment_method: "",
    project_id: "",
    check_no: "",
    check_due_date: "",
    bank_name: "",
    account_no: "",
    note: "",
  };
  const [payForm, setPayForm] = useState(payForm0);
  const [payErrors, setPayErrors] = useState<Record<string, string>>({});
  const payFieldRefs = useRef<Record<string, HTMLElement | null>>({});
  const payFormSnapshot = useRef<typeof payForm0>(payForm0);

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

  const handleSavePay = async () => {
    if (!payModalFor || !user) return;
    const errs = validatePayForm(payForm);
    if (Object.keys(errs).length > 0) {
      setPayErrors(errs);
      toast.error("Lütfen zorunlu alanları doldurun");
      const order = ["payment_date", "amount", "check_no", "check_due_date", "bank_name"];
      const firstKey = order.find(k => errs[k]);
      if (firstKey) {
        setTimeout(() => {
          const el = payFieldRefs.current[firstKey];
          if (el) { el.focus(); el.scrollIntoView({ behavior: "smooth", block: "center" }); }
        }, 0);
      }
      return;
    }
    setPayErrors({});

    // Single atomic transaction — both subcontractor_payments and cash_payments
    // are written together (or neither is) via the database function.
    const { error } = await supabase.rpc("save_subcontractor_payment_with_cash" as any, {
      _payment_id: editPayId,
      _subcontractor_id: payModalFor.id,
      _amount: Number(payForm.amount),
      _payment_date: payForm.payment_date,
      _payment_method: payForm.payment_method,
      _project_id: payForm.project_id || null,
      _check_no: payForm.payment_method === "cek" ? (payForm.check_no || null) : null,
      _check_due_date: payForm.payment_method === "cek" ? (payForm.check_due_date || null) : null,
      _bank_name: ["cek", "havale"].includes(payForm.payment_method) ? (payForm.bank_name || null) : null,
      _account_no: payForm.payment_method === "havale" ? (payForm.account_no || null) : null,
      _note: payForm.note || null,
      _recipient: payModalFor.name,
    });

    if (error) {
      const msg = error.message || (editPayId ? "Ödeme güncellenemedi" : "Ödeme kaydedilemedi");
      toast.error(`${editPayId ? "Güncelleme" : "Kayıt"} başarısız: ${msg}. Form önceki değerlerine geri yüklendi.`);
      // Restore the form to its last known good state (original record on edit, empty on new)
      setPayForm(payFormSnapshot.current);
      setPayErrors({});
      return;
    }

    toast.success(editPayId ? "Ödeme ve kasa kaydı güncellendi" : "Ödeme kaydedildi ve kasaya yansıtıldı");

    queryClient.invalidateQueries({ queryKey: ["subcontractor_payments"] });
    queryClient.invalidateQueries({ queryKey: ["cash_payments"] });

    setPayForm(payForm0);
    setPayErrors({});
    setEditPayId(null);
    setPayModalFor(null);
  };

  const openEditPay = (p: SubcontractorPayment, sub: Subcontractor) => {
    const snapshot = {
      payment_date: p.payment_date,
      amount: String(p.amount ?? ""),
      payment_method: p.payment_method || "nakit",
      project_id: p.project_id || "",
      check_no: p.check_no || "",
      check_due_date: p.check_due_date || "",
      bank_name: p.bank_name || "",
      account_no: p.account_no || "",
      note: p.note || "",
    };
    setPayForm(snapshot);
    payFormSnapshot.current = snapshot;
    setPayErrors({});
    setEditPayId(p.id);
    setPayModalFor(sub);
  };

  const handleDeletePay = async (id: string) => {
    // Atomic: removes both the subcontractor payment and the linked cash row.
    const { error } = await supabase.rpc("delete_subcontractor_payment_with_cash" as any, {
      _payment_id: id,
    });
    if (error) {
      toast.error("Ödeme silinemedi");
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["subcontractor_payments"] });
    queryClient.invalidateQueries({ queryKey: ["cash_payments"] });
    toast.success("Ödeme silindi");
  };

  // Drawer filters / sort
  const [paySearch, setPaySearch] = useState("");
  const [payMethodFilter, setPayMethodFilter] = useState<string>("all");
  const [paySortKey, setPaySortKey] = useState<"date" | "amount" | "due">("date");
  const [paySortDir, setPaySortDir] = useState<"asc" | "desc">("desc");
  const [showOverdueOnly, setShowOverdueOnly] = useState(false);

  const detailPayments = useMemo(() => {
    if (!detailSub) return [];
    const today = new Date();
    const q = paySearch.trim().toLowerCase();
    let list = allPayments.filter(p => p.subcontractor_id === detailSub.id);

    if (payMethodFilter !== "all") list = list.filter(p => p.payment_method === payMethodFilter);
    if (showOverdueOnly) list = list.filter(p => p.payment_method === "cek" && p.check_due_date && isBefore(parseISO(p.check_due_date), today));
    if (q) list = list.filter(p => {
      const haystack = [
        p.note, p.check_no, p.bank_name, projectName(p.project_id), String(p.amount),
      ].filter(Boolean).join(" ").toLowerCase();
      return haystack.includes(q);
    });

    const dir = paySortDir === "asc" ? 1 : -1;
    return [...list].sort((a, b) => {
      if (paySortKey === "amount") return (Number(a.amount) - Number(b.amount)) * dir;
      if (paySortKey === "due") {
        const av = a.check_due_date || "";
        const bv = b.check_due_date || "";
        return av.localeCompare(bv) * dir;
      }
      return a.payment_date.localeCompare(b.payment_date) * dir;
    });
  }, [detailSub, allPayments, paySearch, payMethodFilter, paySortKey, paySortDir, showOverdueOnly, projects]);

  const detailOverdueCount = useMemo(() => {
    if (!detailSub) return 0;
    const today = new Date();
    return allPayments.filter(p => p.subcontractor_id === detailSub.id && p.payment_method === "cek" && p.check_due_date && isBefore(parseISO(p.check_due_date), today)).length;
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
                onClick={() => { setPayForm(payForm0); payFormSnapshot.current = payForm0; setPayModalFor(s); }}
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
      <Dialog open={!!payModalFor} onOpenChange={o => { if (!o) { setPayModalFor(null); setPayErrors({}); setEditPayId(null); setPayForm(payForm0); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editPayId ? "Ödemeyi Düzenle" : "Ödeme Ekle"} — {payModalFor?.name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {Object.keys(payErrors).filter(k => payErrors[k]).length > 0 && (
              <div className="rounded-lg border border-red-500/60 bg-red-500/10 p-3">
                <p className="text-xs font-semibold text-red-500 mb-1.5">Lütfen aşağıdaki alanları düzeltin:</p>
                <ul className="space-y-1">
                  {(() => {
                    const labels: Record<string, string> = {
                      payment_date: "Ödeme tarihi zorunludur",
                      amount: "Geçerli bir ödeme tutarı girin",
                      payment_method: "Ödeme yöntemi seçilmelidir",
                      check_no: "Çek No zorunludur",
                      check_due_date: "Vade tarihi zorunludur",
                      bank_name: "Banka adı zorunludur",
                    };
                    const order = ["payment_date", "amount", "payment_method", "check_no", "check_due_date", "bank_name"];
                    return order.filter(k => payErrors[k]).map(k => (
                      <li key={k}>
                        <button
                          type="button"
                          onClick={() => {
                            const el = payFieldRefs.current[k];
                            if (el) {
                              el.scrollIntoView({ behavior: "smooth", block: "center" });
                              // Compensate for fixed header (~80px)
                              setTimeout(() => window.scrollBy({ top: -80, left: 0, behavior: "smooth" }), 300);
                              if ("focus" in el && typeof (el as HTMLInputElement).focus === "function") {
                                (el as HTMLInputElement).focus();
                              }
                            }
                          }}
                          className="text-left text-xs text-red-500 hover:underline"
                        >
                          • {labels[k] || payErrors[k]}
                        </button>
                      </li>
                    ));
                  })()}
                </ul>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-muted-foreground">Ödeme Tarihi *</label>
                <input ref={el => { payFieldRefs.current.payment_date = el; }} type="date" value={payForm.payment_date} onChange={e => { setPayForm({ ...payForm, payment_date: e.target.value }); if (payErrors.payment_date) setPayErrors({ ...payErrors, payment_date: "" }); }} className={`w-full mt-1 px-3 py-2 rounded-lg border bg-background text-sm ${payErrors.payment_date ? "border-red-500" : "border-border"}`} />
                {payErrors.payment_date && <p className="text-[11px] text-red-500 mt-1">{payErrors.payment_date}</p>}
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Tutar (₺) *</label>
                <input ref={el => { payFieldRefs.current.amount = el; }} type="number" value={payForm.amount} onChange={e => { setPayForm({ ...payForm, amount: e.target.value }); if (payErrors.amount) setPayErrors({ ...payErrors, amount: "" }); }} className={`w-full mt-1 px-3 py-2 rounded-lg border bg-background text-sm ${payErrors.amount ? "border-red-500" : "border-border"}`} />
                {payErrors.amount && <p className="text-[11px] text-red-500 mt-1">{payErrors.amount}</p>}
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Ödeme Yöntemi *</label>
              <div ref={el => { payFieldRefs.current.payment_method = el; }} className={`grid grid-cols-4 gap-1.5 mt-1 ${payErrors.payment_method ? "p-2 rounded-lg border border-red-500" : ""}`}>
                {PAYMENT_METHODS.map(m => (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => { setPayForm({ ...payForm, payment_method: m.value }); setPayErrors({ ...payErrors, payment_method: "", check_no: "", check_due_date: "", bank_name: "" }); }}
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
              {payErrors.payment_method && <p className="text-[11px] text-red-500 mt-1">{payErrors.payment_method}</p>}
            </div>

            {payForm.payment_method === "cek" && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground">Çek No *</label>
                  <input ref={el => { payFieldRefs.current.check_no = el; }} value={payForm.check_no} onChange={e => { setPayForm({ ...payForm, check_no: e.target.value }); if (payErrors.check_no) setPayErrors({ ...payErrors, check_no: "" }); }} className={`w-full mt-1 px-3 py-2 rounded-lg border bg-background text-sm ${payErrors.check_no ? "border-red-500" : "border-border"}`} />
                  {payErrors.check_no && <p className="text-[11px] text-red-500 mt-1">{payErrors.check_no}</p>}
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Vade Tarihi *</label>
                  <input ref={el => { payFieldRefs.current.check_due_date = el; }} type="date" value={payForm.check_due_date} onChange={e => { setPayForm({ ...payForm, check_due_date: e.target.value }); if (payErrors.check_due_date) setPayErrors({ ...payErrors, check_due_date: "" }); }} className={`w-full mt-1 px-3 py-2 rounded-lg border bg-background text-sm ${payErrors.check_due_date ? "border-red-500" : "border-border"}`} />
                  {payErrors.check_due_date && <p className="text-[11px] text-red-500 mt-1">{payErrors.check_due_date}</p>}
                </div>
              </div>
            )}
            {payForm.payment_method === "havale" && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground">Banka Adı *</label>
                  <input ref={el => { payFieldRefs.current.bank_name = el; }} value={payForm.bank_name} onChange={e => { setPayForm({ ...payForm, bank_name: e.target.value }); if (payErrors.bank_name) setPayErrors({ ...payErrors, bank_name: "" }); }} className={`w-full mt-1 px-3 py-2 rounded-lg border bg-background text-sm ${payErrors.bank_name ? "border-red-500" : "border-border"}`} />
                  {payErrors.bank_name && <p className="text-[11px] text-red-500 mt-1">{payErrors.bank_name}</p>}
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
              <button onClick={() => { setPayModalFor(null); setEditPayId(null); setPayForm(payForm0); setPayErrors({}); }} className="flex-1 py-2 rounded-lg border border-border text-sm">Vazgeç</button>
              {(() => {
                const isInvalid = Object.keys(validatePayForm(payForm)).length > 0;
                return (
                  <button
                    onClick={handleSavePay}
                    disabled={isInvalid}
                    className="flex-1 py-2 rounded-lg text-sm font-medium text-white transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ backgroundColor: "#FF6B2B" }}
                  >
                    {editPayId ? "Güncelle" : "Kaydet"}
                  </button>
                );
              })()}
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
                onClick={() => { setPayForm(payForm0); payFormSnapshot.current = payForm0; setPayModalFor(detailSub); }}
                className="w-full py-2 rounded-lg text-sm font-medium text-white"
                style={{ backgroundColor: "#FF6B2B" }}
              >
                + Ödeme Ekle
              </button>

              <div>
                <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-semibold text-foreground">Ödeme Geçmişi</h4>
                    {detailOverdueCount > 0 && (
                      <button
                        onClick={() => setShowOverdueOnly(v => !v)}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border"
                        style={{
                          borderColor: showOverdueOnly ? "#F59E0B" : "rgba(245,158,11,0.4)",
                          backgroundColor: showOverdueOnly ? "rgba(245,158,11,0.18)" : "rgba(245,158,11,0.08)",
                          color: "#F59E0B",
                        }}
                        title="Vadesi geçmiş çekleri göster"
                      >
                        <AlertTriangle className="w-3 h-3" /> {detailOverdueCount} vadesi geçti
                      </button>
                    )}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {detailPayments.length} kayıt
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <input
                    type="text"
                    value={paySearch}
                    onChange={e => setPaySearch(e.target.value)}
                    placeholder="Ara: not, çek no, banka, proje, tutar…"
                    className="flex-1 min-w-[180px] px-3 py-1.5 rounded-lg border border-border bg-background text-xs"
                  />
                  <select
                    value={payMethodFilter}
                    onChange={e => setPayMethodFilter(e.target.value)}
                    className="px-2 py-1.5 rounded-lg border border-border bg-background text-xs"
                  >
                    <option value="all">Tüm yöntemler</option>
                    {PAYMENT_METHODS.map(m => (
                      <option key={m.value} value={m.value}>{m.emoji} {m.label}</option>
                    ))}
                  </select>
                  {(paySearch || payMethodFilter !== "all" || showOverdueOnly) && (
                    <button
                      onClick={() => { setPaySearch(""); setPayMethodFilter("all"); setShowOverdueOnly(false); }}
                      className="text-[11px] text-muted-foreground hover:text-foreground underline"
                    >
                      Temizle
                    </button>
                  )}
                </div>

                {detailPayments.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-6 border border-dashed border-border rounded-lg">
                    {(paySearch || payMethodFilter !== "all" || showOverdueOnly) ? "Filtrelere uygun kayıt yok" : "Henüz ödeme yok"}
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-left text-muted-foreground border-b border-border select-none">
                          {([
                            { key: "date", label: "Tarih" },
                            { key: "amount", label: "Tutar" },
                          ] as const).map(col => {
                            const active = paySortKey === col.key;
                            return (
                              <th
                                key={col.key}
                                className="py-2 px-2 cursor-pointer hover:text-foreground"
                                onClick={() => {
                                  if (active) setPaySortDir(d => (d === "asc" ? "desc" : "asc"));
                                  else { setPaySortKey(col.key); setPaySortDir("desc"); }
                                }}
                              >
                                {col.label}{active ? (paySortDir === "asc" ? " ↑" : " ↓") : ""}
                              </th>
                            );
                          })}
                          <th
                            className="py-2 px-2 cursor-pointer hover:text-foreground"
                            onClick={() => {
                              if (paySortKey === "due") setPaySortDir(d => (d === "asc" ? "desc" : "asc"));
                              else { setPaySortKey("due"); setPaySortDir("asc"); }
                            }}
                          >
                            Yöntem / Vade{paySortKey === "due" ? (paySortDir === "asc" ? " ↑" : " ↓") : ""}
                          </th>
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
                            <tr
                              key={p.id}
                              className={`border-b border-border ${isOverdueCheck ? "bg-yellow-500/10" : "hover:bg-muted/30"}`}
                              style={isOverdueCheck ? { borderLeft: "3px solid #F59E0B" } : undefined}
                            >
                              <td className="py-2 px-2">{format(parseISO(p.payment_date), "dd.MM.yyyy")}</td>
                              <td className="py-2 px-2 font-semibold">{fmtFull(Number(p.amount))}</td>
                              <td className="py-2 px-2">
                                <span title={m.label}>{m.emoji} {m.label}</span>
                                {p.payment_method === "cek" && p.check_due_date && (
                                  <div className={`text-[10px] flex items-center gap-1 mt-0.5 ${isOverdueCheck ? "font-medium" : "text-muted-foreground"}`} style={isOverdueCheck ? { color: "#F59E0B" } : undefined}>
                                    {isOverdueCheck && <AlertTriangle className="w-3 h-3" />}
                                    {isOverdueCheck ? "Vadesi geçti: " : "Vade: "}
                                    {format(parseISO(p.check_due_date), "dd.MM.yyyy")}
                                  </div>
                                )}
                              </td>
                              <td className="py-2 px-2">{projectName(p.project_id)}</td>
                              <td className="py-2 px-2 text-muted-foreground">{p.note || "—"}</td>
                              <td className="py-2 px-2">
                                <div className="flex items-center gap-1">
                                  <button onClick={() => detailSub && openEditPay(p, detailSub)} className="text-muted-foreground hover:text-[#FF6B2B]" title="Düzenle">
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  <button onClick={() => setDeletePay({ id: p.id })} className="text-muted-foreground hover:text-red-500" title="Sil">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
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
