import { useState, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import {
  BarChart3, CreditCard, Wallet, FileDown, FileSpreadsheet,
  TrendingUp, TrendingDown, DollarSign, Plus, Trash2, Pencil,
  ArrowDownLeft, ArrowUpRight, AlertTriangle, ChevronRight, Banknote, FileText, Receipt
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as ReTooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend
} from "recharts";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useProjects } from "@/hooks/useProjects";
import { useProjectExpenses, ProjectExpense } from "@/hooks/useProjectExpenses";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useCashAccounts } from "@/hooks/useCashAccounts";
import { useCashPayments } from "@/hooks/useCashPayments";
import { useCashCollections } from "@/hooks/useCashCollections";
import { useCashChecks } from "@/hooks/useCashChecks";
import { exportCashPDF, exportCashExcel } from "@/lib/cashReportExport";
import { useSubcontractors, useSubcontractorPayments } from "@/hooks/useSubcontractors";
import { differenceInDays, parseISO, format } from "date-fns";
import { tr } from "date-fns/locale";
import DeleteConfirmModal from "@/components/DeleteConfirmModal";
import SubcontractorsPage from "./SubcontractorsPage";

const INCOME_CATEGORIES = ["Hakediş Tahsilatı", "Avans", "Diğer Gelir"];
const EXPENSE_CATEGORIES = ["Malzeme", "Taşeron Ödemesi", "Ekipman/Kira", "Genel Gider", "Diğer"];
const ALL_CATEGORIES = [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES];
const PIE_COLORS = ["#FF6B2B", "#3B82F6", "#22C55E", "#A855F7", "#F59E0B", "#64748B", "#EC4899", "#14B8A6"];

const fmtFull = (n: number) => `₺${Math.round(n).toLocaleString("tr-TR")}`;
const fmtShort = (n: number) => {
  if (Math.abs(n) >= 1_000_000) return `₺${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `₺${(n / 1_000).toFixed(0)}K`;
  return `₺${Math.round(n).toLocaleString("tr-TR")}`;
};
const fmt = (n: number) => new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 0 }).format(n);

const PaymentsKasaPage = () => {
  const { user } = useUser();
  const { projects } = useProjects();
  const { expenses, addExpense, updateExpense, deleteExpense } = useProjectExpenses();
  const { accounts } = useCashAccounts();
  const { payments: cashPayments } = useCashPayments();
  const { collections: cashCollections } = useCashCollections();
  const { checks } = useCashChecks();
  const { subcontractors } = useSubcontractors();
  const { payments: subPayments } = useSubcontractorPayments();

  const [addModal, setAddModal] = useState(false);
  const [editTarget, setEditTarget] = useState<ProjectExpense | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [selectedProjectFilter, setSelectedProjectFilter] = useState<string>("all");
  const [reportDateFrom, setReportDateFrom] = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth() - 3);
    return d.toISOString().slice(0, 10);
  });
  const [reportDateTo, setReportDateTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [reportProjectFilter, setReportProjectFilter] = useState<string>("all");

  const defaultForm = {
    project_id: "", category: "Malzeme", description: "", amount: "",
    expense_date: new Date().toISOString().slice(0, 10), has_invoice: false,
    invoice_no: "", note: "", is_income: false
  };
  const [expForm, setExpForm] = useState(defaultForm);

  // Fetch all hakedis
  const { data: allHakedis = [] } = useQuery({
    queryKey: ["all_hakedis_payments_kasa"],
    queryFn: async () => {
      const { data } = await supabase.from("project_hakedis").select("*");
      return data || [];
    },
    enabled: !!user,
  });

  // ─── COMPUTED DATA ───
  const monthlyData = useMemo(() => {
    const months = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
    const now = new Date();
    return months.slice(0, now.getMonth() + 1).map((m, i) => {
      const monthHakedis = allHakedis.filter(h => {
        const d = new Date(h.created_at);
        return d.getMonth() === i && d.getFullYear() === now.getFullYear();
      });
      const monthExpenses = expenses.filter(e => {
        const d = new Date(e.expense_date);
        return d.getMonth() === i && d.getFullYear() === now.getFullYear();
      });
      const gelir = monthHakedis.reduce((s, h) => s + Number(h.net || 0), 0);
      const gider = monthExpenses.reduce((s, e) => s + Number(e.amount), 0);
      return { month: m, gelir, gider, kar: gelir - gider };
    });
  }, [allHakedis, expenses]);

  const projectStats = useMemo(() => {
    return projects.map(p => {
      const pHakedis = allHakedis.filter(h => h.project_id === p.id);
      const pExpenses = expenses.filter(e => e.project_id === p.id);
      const hakedisTotal = pHakedis.reduce((s, h) => s + Number(h.net || 0), 0);
      const expenseTotal = pExpenses.reduce((s, e) => s + Number(e.amount), 0);
      const netKar = hakedisTotal - expenseTotal;
      const karMarji = hakedisTotal > 0 ? (netKar / hakedisTotal) * 100 : 0;
      return { ...p, hakedisTotal, expenseTotal, netKar, karMarji };
    });
  }, [projects, allHakedis, expenses]);

  const totals = useMemo(() => {
    const ciro = projectStats.reduce((s, p) => s + p.hakedisTotal, 0);
    const gider = projectStats.reduce((s, p) => s + p.expenseTotal, 0);
    const kar = ciro - gider;
    const bekleyenTahsilat = allHakedis.filter(h => h.status !== "Ödendi").reduce((s, h) => s + Number(h.net || 0), 0);
    return { ciro, gider, kar, marj: ciro > 0 ? (kar / ciro) * 100 : 0, bekleyenTahsilat };
  }, [projectStats, allHakedis]);

  const kasaBalance = accounts.reduce((s, a) => s + Number(a.balance), 0);

  const karColor = (pct: number) => {
    if (pct >= 20) return "#22C55E";
    if (pct >= 10) return "#F59E0B";
    if (pct >= 0) return "#EF4444";
    return "#991B1B";
  };

  // Filtered expenses for Gelir & Giderler tab
  const filteredExpenses = useMemo(() => {
    let list = [...expenses];
    if (selectedProjectFilter !== "all") {
      list = list.filter(e => e.project_id === selectedProjectFilter);
    }
    return list.sort((a, b) => b.expense_date.localeCompare(a.expense_date));
  }, [expenses, selectedProjectFilter]);

  // Cash flow data
  const now = new Date();
  const bekleyenTahsilatlar = allHakedis.filter(h => h.status !== "Ödendi" && h.status !== "Taslak" && h.status !== "Reddedildi");
  const expectedIncome = bekleyenTahsilatlar.reduce((s, h) => s + Number(h.net || 0), 0);

  // Subcontractor enriched data
  const enrichedSubs = useMemo(() => {
    return subcontractors.map(s => {
      const pays = subPayments.filter(p => p.subcontractor_id === s.id);
      const totalPaid = pays.filter(p => p.status === "odendi").reduce((sum, p) => sum + Number(p.amount), 0);
      const remaining = Number(s.contract_amount) - totalPaid;
      return { ...s, totalPaid, remaining };
    });
  }, [subcontractors, subPayments]);

  // Upcoming checks
  const upcomingChecks = checks.filter(c => {
    const days = differenceInDays(parseISO(c.due_date), now);
    return days >= 0 && days <= 7 && c.status !== "odendi" && c.status !== "tahsil_edildi";
  });

  // Report filtered data
  const reportExpenses = useMemo(() => {
    let list = [...expenses];
    if (reportProjectFilter !== "all") list = list.filter(e => e.project_id === reportProjectFilter);
    list = list.filter(e => e.expense_date >= reportDateFrom && e.expense_date <= reportDateTo);
    return list;
  }, [expenses, reportProjectFilter, reportDateFrom, reportDateTo]);

  const reportHakedis = useMemo(() => {
    let list = [...allHakedis];
    if (reportProjectFilter !== "all") list = list.filter(h => h.project_id === reportProjectFilter);
    list = list.filter(h => {
      const d = h.created_at?.slice(0, 10) || "";
      return d >= reportDateFrom && d <= reportDateTo;
    });
    return list;
  }, [allHakedis, reportProjectFilter, reportDateFrom, reportDateTo]);

  const reportCategoryBreakdown = useMemo(() => {
    const cats: Record<string, number> = {};
    reportExpenses.forEach(e => { cats[e.category] = (cats[e.category] || 0) + Number(e.amount); });
    return Object.entries(cats).map(([name, value]) => ({ name, value }));
  }, [reportExpenses]);

  const openEditModal = (e: ProjectExpense) => {
    setEditTarget(e);
    setExpForm({
      project_id: e.project_id,
      category: e.category,
      description: e.description,
      amount: String(e.amount),
      expense_date: e.expense_date,
      has_invoice: e.has_invoice,
      invoice_no: e.invoice_no || "",
      note: e.note || "",
      is_income: INCOME_CATEGORIES.includes(e.category),
    });
    setAddModal(true);
  };

  const handleSaveExpense = async () => {
    if (!expForm.project_id || !expForm.amount || Number(expForm.amount) <= 0) {
      toast.error("Proje ve tutar zorunludur");
      return;
    }
    if (editTarget) {
      await updateExpense.mutateAsync({
        id: editTarget.id,
        project_id: expForm.project_id,
        category: expForm.category,
        description: expForm.description,
        amount: Number(expForm.amount),
        expense_date: expForm.expense_date,
        has_invoice: expForm.has_invoice,
        invoice_no: expForm.invoice_no || null,
        note: expForm.note || null,
      });
      toast.success("Kayıt güncellendi");
    } else {
      await addExpense.mutateAsync({
        project_id: expForm.project_id,
        user_id: user!.id,
        category: expForm.category,
        description: expForm.description,
        amount: Number(expForm.amount),
        expense_date: expForm.expense_date,
        has_invoice: expForm.has_invoice,
        invoice_no: expForm.invoice_no || null,
        invoice_url: null,
        note: expForm.note || null,
        source: "manual",
      });
      toast.success(expForm.is_income ? "Gelir eklendi" : "Gider eklendi");
    }
    setAddModal(false);
    setEditTarget(null);
    setExpForm(defaultForm);
  };

  const handleExport = (type: "pdf" | "excel") => {
    const data = { payments: cashPayments, collections: cashCollections, checks, accounts };
    try {
      if (type === "pdf") exportCashPDF(data);
      else exportCashExcel(data);
      toast.success(`${type === "pdf" ? "PDF" : "Excel"} raporu indirildi`);
    } catch {
      toast.error("Rapor oluşturulamadı");
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-[1400px] mx-auto">
      <DeleteConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => { if (deleteTarget) deleteExpense.mutate(deleteTarget.id); }}
        title="Kaydı Sil"
        itemName={deleteTarget?.name}
      />

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="w-full justify-start mb-6 h-11 p-1 rounded-xl bg-card border border-border flex-wrap">
          <TabsTrigger value="overview" className="gap-2 text-[13px] data-[state=active]:bg-primary/15 data-[state=active]:text-primary rounded-lg">
            <BarChart3 className="w-4 h-4" /> Genel Bakış
          </TabsTrigger>
          <TabsTrigger value="transactions" className="gap-2 text-[13px] data-[state=active]:bg-primary/15 data-[state=active]:text-primary rounded-lg">
            <CreditCard className="w-4 h-4" /> Gelir & Giderler
          </TabsTrigger>
          <TabsTrigger value="kasa" className="gap-2 text-[13px] data-[state=active]:bg-primary/15 data-[state=active]:text-primary rounded-lg">
            <Wallet className="w-4 h-4" /> Kasa & Ödemeler
          </TabsTrigger>
          <TabsTrigger value="reports" className="gap-2 text-[13px] data-[state=active]:bg-primary/15 data-[state=active]:text-primary rounded-lg">
            <FileText className="w-4 h-4" /> Raporlar
          </TabsTrigger>
        </TabsList>

        {/* ═══ TAB 1: GENEL BAKIŞ ═══ */}
        <TabsContent value="overview">
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: "Toplam Gelir", value: totals.ciro, color: "#22C55E", icon: TrendingUp },
                { label: "Toplam Gider", value: totals.gider, color: "#EF4444", icon: TrendingDown },
                { label: "Net Bakiye", value: totals.kar, color: "#3B82F6", icon: DollarSign },
                { label: "Bekleyen Hakediş", value: totals.bekleyenTahsilat, color: "#F59E0B", icon: Receipt },
              ].map((c, i) => (
                <div key={i} className="rounded-xl p-4 bg-card border border-border">
                  <div className="flex items-center gap-2 mb-2">
                    <c.icon className="w-4 h-4" style={{ color: c.color }} />
                    <span className="text-xs text-muted-foreground">{c.label}</span>
                  </div>
                  <p className="text-xl font-bold" style={{ color: c.color }}>{fmtFull(c.value)}</p>
                </div>
              ))}
            </div>

            {/* Monthly Chart */}
            <div className="rounded-xl p-4 bg-card border border-border">
              <h3 className="text-sm font-semibold mb-4 text-foreground">Aylık Gelir / Gider</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={monthlyData}>
                  <XAxis dataKey="month" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} />
                  <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickFormatter={v => fmtShort(v)} />
                  <ReTooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} formatter={(v: number) => fmtFull(v)} />
                  <Bar dataKey="gelir" fill="#22C55E" radius={[4, 4, 0, 0]} name="Gelir" />
                  <Bar dataKey="gider" fill="#EF4444" radius={[4, 4, 0, 0]} name="Gider" />
                  <Line type="monotone" dataKey="kar" stroke="#3B82F6" strokeWidth={2} name="Net" dot={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Project Profitability Cards */}
            <div>
              <h3 className="text-sm font-semibold mb-3 text-foreground">Proje Bazlı Karlılık</h3>
              {projectStats.length === 0 ? (
                <p className="text-xs text-muted-foreground py-8 text-center">Henüz proje yok</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {projectStats.map(p => (
                    <div key={p.id} className="rounded-xl p-4 bg-card border border-border">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium text-foreground truncate">{p.name}</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0" style={{ backgroundColor: karColor(p.karMarji) + "20", color: karColor(p.karMarji) }}>
                          {p.karMarji.toFixed(1)}%
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-[11px]">
                        <div>
                          <span className="text-muted-foreground">Gelir</span>
                          <p className="font-semibold" style={{ color: "#22C55E" }}>{fmtShort(p.hakedisTotal)}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Gider</span>
                          <p className="font-semibold" style={{ color: "#EF4444" }}>{fmtShort(p.expenseTotal)}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Net</span>
                          <p className="font-semibold" style={{ color: karColor(p.karMarji) }}>{fmtShort(p.netKar)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ═══ TAB 2: GELİR & GİDERLER ═══ */}
        <TabsContent value="transactions">
          <div className="space-y-4">
            {/* Filters & Add */}
            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={selectedProjectFilter}
                onChange={e => setSelectedProjectFilter(e.target.value)}
                className="px-3 py-2 rounded-lg text-xs bg-card border border-border text-foreground"
              >
                <option value="all">Tüm Projeler</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <button onClick={() => setAddModal(true)}
                className="ml-auto px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 bg-primary text-primary-foreground">
                <Plus className="w-4 h-4" /> Kayıt Ekle
              </button>
            </div>

            {/* List */}
            <div className="rounded-xl bg-card border border-border overflow-hidden">
              {filteredExpenses.length === 0 ? (
                <p className="text-xs text-muted-foreground py-12 text-center">Henüz kayıt yok</p>
              ) : (
                <div className="divide-y divide-border">
                  {filteredExpenses.map(e => {
                    const proj = projects.find(p => p.id === e.project_id);
                    return (
                      <div key={e.id} className="flex items-center justify-between px-4 py-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: "rgba(239,68,68,0.12)" }}>
                            <ArrowUpRight className="w-4 h-4" style={{ color: "#EF4444" }} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[13px] font-medium text-foreground truncate">{e.description || e.category}</p>
                            <p className="text-[11px] text-muted-foreground">{e.category} • {proj?.name || "—"} • {e.expense_date}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-sm font-semibold" style={{ color: "#EF4444" }}>-{fmtFull(Number(e.amount))}</span>
                          <button onClick={() => setDeleteTarget({ id: e.id, name: `${e.description} - ${fmtFull(Number(e.amount))}` })}
                            className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                            <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ═══ TAB 3: KASA & ÖDEMELER ═══ */}
        <TabsContent value="kasa">
          <div className="space-y-6">
            {/* Kasa Balance */}
            <div className="rounded-xl p-6 text-center bg-card border border-border">
              <p className="text-xs mb-1 text-muted-foreground">Mevcut Kasa Bakiyesi</p>
              <p className="text-3xl font-bold text-foreground">{fmtFull(kasaBalance)}</p>
              <p className="text-[11px] text-muted-foreground mt-1">
                Nakit: ₺{fmt(accounts.filter(a => a.account_type === "nakit_kasa").reduce((s, a) => s + Number(a.balance), 0))} |
                Banka: ₺{fmt(accounts.filter(a => a.account_type === "banka").reduce((s, a) => s + Number(a.balance), 0))}
              </p>
            </div>

            {/* Subcontractor debts */}
            <div className="rounded-xl bg-card border border-border p-4">
              <h3 className="text-sm font-semibold mb-3 text-foreground">Taşeron Borç Takibi</h3>
              {enrichedSubs.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">Taşeron kaydı yok</p>
              ) : (
                <div className="space-y-2">
                  {enrichedSubs.map(s => (
                    <div key={s.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50">
                      <div>
                        <p className="text-[13px] font-medium text-foreground">{s.name}</p>
                        <p className="text-[11px] text-muted-foreground">Sözleşme: {fmtFull(Number(s.contract_amount))} • Ödenen: {fmtFull(s.totalPaid)}</p>
                      </div>
                      <span className="text-sm font-bold" style={{ color: s.remaining > 0 ? "#EF4444" : "#22C55E" }}>
                        {fmtFull(s.remaining)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Cash flow forecast */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="rounded-xl p-4 bg-card border border-border">
                <p className="text-xs text-muted-foreground mb-1">Beklenen Tahsilat (30 gün)</p>
                <p className="text-xl font-bold" style={{ color: "#22C55E" }}>{fmtFull(expectedIncome)}</p>
                <p className="text-[11px] text-muted-foreground">{bekleyenTahsilatlar.length} onaylı hakediş</p>
              </div>
              <div className="rounded-xl p-4 bg-card border border-border">
                <p className="text-xs text-muted-foreground mb-1">Planlanan Ödemeler</p>
                <p className="text-xl font-bold" style={{ color: "#EF4444" }}>{fmtFull(enrichedSubs.reduce((s, sub) => s + Math.max(0, sub.remaining), 0))}</p>
                <p className="text-[11px] text-muted-foreground">Taşeron kalan borçlar</p>
              </div>
              <div className="rounded-xl p-4 bg-card border border-border">
                <p className="text-xs text-muted-foreground mb-1">Tahmini Net Bakiye</p>
                {(() => {
                  const net = kasaBalance + expectedIncome - enrichedSubs.reduce((s, sub) => s + Math.max(0, sub.remaining), 0);
                  return (
                    <>
                      <p className="text-xl font-bold" style={{ color: net >= 0 ? "#22C55E" : "#EF4444" }}>{fmtFull(net)}</p>
                      {net < 0 && <p className="text-[11px]" style={{ color: "#EF4444" }}>⚠️ Nakit sıkışıklığı riski!</p>}
                    </>
                  );
                })()}
              </div>
            </div>

            {/* Upcoming checks */}
            {upcomingChecks.length > 0 && (
              <div className="rounded-xl bg-card border border-border p-4">
                <h3 className="text-sm font-semibold mb-3 text-foreground flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" style={{ color: "#F59E0B" }} />
                  Vadesi Yaklaşan Çekler (7 gün)
                </h3>
                <div className="space-y-2">
                  {upcomingChecks.map(chk => {
                    const days = differenceInDays(parseISO(chk.due_date), now);
                    return (
                      <div key={chk.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50">
                        <div>
                          <p className="text-[13px] font-medium text-foreground">{chk.counterparty}</p>
                          <p className="text-[11px] text-muted-foreground">{chk.bank_name} • Çek No: {chk.check_no}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold" style={{ color: "#F59E0B" }}>₺{fmt(chk.amount)}</p>
                          <span className="text-[10px]" style={{ color: days <= 3 ? "#EF4444" : "#F59E0B" }}>
                            {days === 0 ? "Bugün!" : `${days} gün`}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ═══ TAB 4: RAPORLAR ═══ */}
        <TabsContent value="reports">
          <div className="space-y-6">
            {/* Filters */}
            <div className="flex items-center gap-3 flex-wrap">
              <div>
                <label className="text-[11px] text-muted-foreground mb-1 block">Başlangıç</label>
                <input type="date" value={reportDateFrom} onChange={e => setReportDateFrom(e.target.value)}
                  className="px-3 py-2 rounded-lg text-xs bg-card border border-border text-foreground" />
              </div>
              <div>
                <label className="text-[11px] text-muted-foreground mb-1 block">Bitiş</label>
                <input type="date" value={reportDateTo} onChange={e => setReportDateTo(e.target.value)}
                  className="px-3 py-2 rounded-lg text-xs bg-card border border-border text-foreground" />
              </div>
              <div>
                <label className="text-[11px] text-muted-foreground mb-1 block">Proje</label>
                <select value={reportProjectFilter} onChange={e => setReportProjectFilter(e.target.value)}
                  className="px-3 py-2 rounded-lg text-xs bg-card border border-border text-foreground">
                  <option value="all">Tüm Projeler</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="ml-auto flex gap-2 self-end">
                <button onClick={() => handleExport("pdf")}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-medium transition-colors"
                  style={{ backgroundColor: "rgba(239,68,68,0.12)", color: "#EF4444" }}>
                  <FileDown className="w-3.5 h-3.5" /> PDF İndir
                </button>
                <button onClick={() => handleExport("excel")}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-medium transition-colors"
                  style={{ backgroundColor: "rgba(34,197,94,0.12)", color: "#22C55E" }}>
                  <FileSpreadsheet className="w-3.5 h-3.5" /> Excel İndir
                </button>
              </div>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="rounded-xl p-4 bg-card border border-border">
                <p className="text-xs text-muted-foreground mb-1">Dönem Geliri</p>
                <p className="text-lg font-bold" style={{ color: "#22C55E" }}>{fmtFull(reportHakedis.reduce((s, h) => s + Number(h.net || 0), 0))}</p>
              </div>
              <div className="rounded-xl p-4 bg-card border border-border">
                <p className="text-xs text-muted-foreground mb-1">Dönem Gideri</p>
                <p className="text-lg font-bold" style={{ color: "#EF4444" }}>{fmtFull(reportExpenses.reduce((s, e) => s + Number(e.amount), 0))}</p>
              </div>
              <div className="rounded-xl p-4 bg-card border border-border">
                <p className="text-xs text-muted-foreground mb-1">Net</p>
                {(() => {
                  const net = reportHakedis.reduce((s, h) => s + Number(h.net || 0), 0) - reportExpenses.reduce((s, e) => s + Number(e.amount), 0);
                  return <p className="text-lg font-bold" style={{ color: net >= 0 ? "#22C55E" : "#EF4444" }}>{fmtFull(net)}</p>;
                })()}
              </div>
              <div className="rounded-xl p-4 bg-card border border-border">
                <p className="text-xs text-muted-foreground mb-1">Kayıt Sayısı</p>
                <p className="text-lg font-bold text-foreground">{reportExpenses.length + reportHakedis.length}</p>
              </div>
            </div>

            {/* Category breakdown */}
            {reportCategoryBreakdown.length > 0 && (
              <div className="rounded-xl p-4 bg-card border border-border">
                <h3 className="text-sm font-semibold mb-3 text-foreground">Kategori Bazlı Gider Dağılımı</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={reportCategoryBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}
                      label={({ name, percent }) => `${name} %${(percent * 100).toFixed(0)}`}>
                      {reportCategoryBreakdown.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Monthly comparison */}
            <div className="rounded-xl p-4 bg-card border border-border">
              <h3 className="text-sm font-semibold mb-3 text-foreground">Aylık Karşılaştırma</h3>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={monthlyData}>
                  <XAxis dataKey="month" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} />
                  <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickFormatter={v => fmtShort(v)} />
                  <ReTooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} formatter={(v: number) => fmtFull(v)} />
                  <Line type="monotone" dataKey="gelir" stroke="#22C55E" strokeWidth={2} name="Gelir" dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="gider" stroke="#EF4444" strokeWidth={2} name="Gider" dot={{ r: 3 }} />
                  <Legend />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Add Expense Modal */}
      <Dialog open={addModal} onOpenChange={() => setAddModal(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground">Kayıt Ekle</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs mb-1 block text-muted-foreground">Proje *</label>
              <select value={expForm.project_id} onChange={e => setExpForm(f => ({ ...f, project_id: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg text-sm bg-background border border-border text-foreground">
                <option value="">Proje seçin...</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs mb-1 block text-muted-foreground">Kategori</label>
              <select value={expForm.category} onChange={e => setExpForm(f => ({ ...f, category: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg text-sm bg-background border border-border text-foreground">
                {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs mb-1 block text-muted-foreground">Açıklama</label>
              <input value={expForm.description} onChange={e => setExpForm(f => ({ ...f, description: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg text-sm bg-background border border-border text-foreground" placeholder="Açıklama" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs mb-1 block text-muted-foreground">Tutar (₺) *</label>
                <input type="number" value={expForm.amount} onChange={e => setExpForm(f => ({ ...f, amount: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg text-sm bg-background border border-border text-foreground" placeholder="0" />
              </div>
              <div>
                <label className="text-xs mb-1 block text-muted-foreground">Tarih</label>
                <input type="date" value={expForm.expense_date} onChange={e => setExpForm(f => ({ ...f, expense_date: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg text-sm bg-background border border-border text-foreground" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={expForm.has_invoice} onChange={e => setExpForm(f => ({ ...f, has_invoice: e.target.checked }))} />
              <label className="text-xs text-muted-foreground">Fatura var</label>
            </div>
            {expForm.has_invoice && (
              <div>
                <label className="text-xs mb-1 block text-muted-foreground">Fatura No</label>
                <input value={expForm.invoice_no} onChange={e => setExpForm(f => ({ ...f, invoice_no: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg text-sm bg-background border border-border text-foreground" />
              </div>
            )}
            <div>
              <label className="text-xs mb-1 block text-muted-foreground">Not</label>
              <textarea value={expForm.note} onChange={e => setExpForm(f => ({ ...f, note: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg text-sm resize-none bg-background border border-border text-foreground" rows={2} />
            </div>
            <button onClick={handleAddExpense} disabled={addExpense.isPending}
              className="w-full py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 bg-primary text-primary-foreground">
              {addExpense.isPending ? "Kaydediliyor..." : "Kaydet"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PaymentsKasaPage;
