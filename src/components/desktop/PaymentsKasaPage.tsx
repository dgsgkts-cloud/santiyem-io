import { useState, useMemo, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart3, CreditCard, Wallet, FileDown, FileSpreadsheet,
  TrendingUp, TrendingDown, DollarSign, Plus, Trash2, Pencil,
  ArrowDownLeft, ArrowUpRight, AlertTriangle, Banknote, FileText, Receipt, Building2
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as ReTooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend
} from "recharts";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  PageShell,
  SectionCard,
  ResponsiveGrid,
  ResponsiveSheet,
  KpiCard,
} from "@/components/ui/responsive";
import { toast } from "sonner";
import MetricTooltip from "@/components/MetricTooltip";
import { useProjects } from "@/hooks/useProjects";
import { useProjectExpenses, ProjectExpense } from "@/hooks/useProjectExpenses";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCashAccounts } from "@/hooks/useCashAccounts";
import { useCashPayments } from "@/hooks/useCashPayments";
import { useCashCollections } from "@/hooks/useCashCollections";
import { useCashChecks } from "@/hooks/useCashChecks";
import { exportCashPDF, exportCashExcel } from "@/lib/cashReportExport";
import { useSubcontractors, useSubcontractorPayments } from "@/hooks/useSubcontractors";
import { differenceInDays, parseISO, format } from "date-fns";
import DeleteConfirmModal from "@/components/DeleteConfirmModal";
import SubcontractorDebtSection from "@/components/desktop/SubcontractorDebtSection";
import PullToRefresh from "@/components/PullToRefresh";
import AIInsightCard from "@/components/finance/AIInsightCard";
import { PaymentMethodBadge, StatusBadge } from "@/components/finance/PaymentBadges";
import { Sparkles, Wallet as WalletIcon } from "lucide-react";

const INCOME_CATEGORIES = ["Hakediş Tahsilatı", "Avans", "Diğer Gelir"];
const EXPENSE_CATEGORIES = ["Malzeme", "Taşeron Ödemesi", "Ekipman/Kira", "Genel Gider", "Diğer"];
const PAYMENT_TYPES = [
  { value: "nakit", label: "Nakit", icon: Banknote },
  { value: "havale", label: "Havale / EFT", icon: Building2 },
  { value: "cek", label: "Çek", icon: FileText },
];
const PIE_COLORS = ["#FF6B2B", "#3B82F6", "#22C55E", "#A855F7", "#F59E0B", "#64748B", "#EC4899", "#14B8A6"];

import { formatCurrencyFull as fmtFull, formatCurrencyShort as fmtShort, formatNumber0 as fmt } from "@/lib/formatCurrency";

const PaymentsKasaPage = () => {
  const { user } = useUser();
  const queryClient = useQueryClient();
  const { projects } = useProjects();
  const { expenses, addExpense, updateExpense, deleteExpense } = useProjectExpenses();
  const { accounts, addAccount, updateAccount, deleteAccount } = useCashAccounts();
  const { payments: cashPayments } = useCashPayments();
  const { collections: cashCollections } = useCashCollections();
  const { checks } = useCashChecks();
  const { subcontractors } = useSubcontractors();
  const { payments: subPayments } = useSubcontractorPayments();

  const [activeTab, setActiveTab] = useState("overview");
  const [addModal, setAddModal] = useState(false);

  const handleRefresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["project_expenses"] }),
      queryClient.invalidateQueries({ queryKey: ["cash_accounts"] }),
      queryClient.invalidateQueries({ queryKey: ["cash_payments"] }),
      queryClient.invalidateQueries({ queryKey: ["cash_collections"] }),
      queryClient.invalidateQueries({ queryKey: ["cash_checks"] }),
      queryClient.invalidateQueries({ queryKey: ["all_hakedis_payments_kasa"] }),
      queryClient.invalidateQueries({ queryKey: ["subcontractors"] }),
    ]);
  };
  const [editTarget, setEditTarget] = useState<ProjectExpense | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [selectedProjectFilter, setSelectedProjectFilter] = useState<string>("all");
  const [reportDateFrom, setReportDateFrom] = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth() - 3);
    return d.toISOString().slice(0, 10);
  });
  const [reportDateTo, setReportDateTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [reportProjectFilter, setReportProjectFilter] = useState<string>("all");

  // Kasa tab modals
  const [kasaModal, setKasaModal] = useState(false);
  const [kasaModalType, setKasaModalType] = useState<"add_account" | "deposit" | "withdraw">("add_account");
  const [kasaTargetAccountId, setKasaTargetAccountId] = useState("");
  const [kasaAmount, setKasaAmount] = useState("");
  const [kasaDesc, setKasaDesc] = useState("");
  const [kasaAccountForm, setKasaAccountForm] = useState({ name: "", account_type: "nakit_kasa", bank_name: "", iban: "" });
  const [deleteAccountTarget, setDeleteAccountTarget] = useState<{ id: string; name: string } | null>(null);

  const defaultForm = {
    project_id: "", category: "Malzeme", description: "", amount: "",
    expense_date: new Date().toISOString().slice(0, 10), has_invoice: false,
    invoice_no: "", note: "", is_income: false, payment_type: "nakit"
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
      const gider = monthExpenses.filter(e => !INCOME_CATEGORIES.includes(e.category)).reduce((s, e) => s + Number(e.amount), 0);
      const incomeFromExpenses = monthExpenses.filter(e => INCOME_CATEGORIES.includes(e.category)).reduce((s, e) => s + Number(e.amount), 0);
      return { month: m, gelir: gelir + incomeFromExpenses, gider, kar: gelir + incomeFromExpenses - gider };
    });
  }, [allHakedis, expenses]);

  const projectStats = useMemo(() => {
    return projects.map(p => {
      const pHakedis = allHakedis.filter(h => h.project_id === p.id);
      const pExpenses = expenses.filter(e => e.project_id === p.id);
      const hakedisTotal = pHakedis.reduce((s, h) => s + Number(h.net || 0), 0);
      const incomeTotal = pExpenses.filter(e => INCOME_CATEGORIES.includes(e.category)).reduce((s, e) => s + Number(e.amount), 0);
      const expenseTotal = pExpenses.filter(e => !INCOME_CATEGORIES.includes(e.category)).reduce((s, e) => s + Number(e.amount), 0);
      const totalIncome = hakedisTotal + incomeTotal;
      const netKar = totalIncome - expenseTotal;
      const karMarji = totalIncome > 0 ? (netKar / totalIncome) * 100 : 0;
      return { ...p, hakedisTotal: totalIncome, expenseTotal, netKar, karMarji };
    });
  }, [projects, allHakedis, expenses]);

  const totals = useMemo(() => {
    const incomeFromExpenses = expenses.filter(e => INCOME_CATEGORIES.includes(e.category)).reduce((s, e) => s + Number(e.amount), 0);
    const ciro = projectStats.reduce((s, p) => s + p.hakedisTotal, 0);
    const gider = projectStats.reduce((s, p) => s + p.expenseTotal, 0);
    const kar = ciro - gider;
    const bekleyenTahsilat = allHakedis.filter(h => h.status !== "Ödendi").reduce((s, h) => s + Number(h.net || 0), 0);
    return { ciro, gider, kar, marj: ciro > 0 ? (kar / ciro) * 100 : 0, bekleyenTahsilat };
  }, [projectStats, allHakedis, expenses]);

  const nakitKasaBalance = accounts.filter(a => a.account_type === "nakit_kasa").reduce((s, a) => s + Number(a.balance), 0);
  const bankaBalance = accounts.filter(a => a.account_type === "banka").reduce((s, a) => s + Number(a.balance), 0);
  const kasaBalance = nakitKasaBalance + bankaBalance;

  const karColor = (pct: number) => {
    if (pct >= 20) return "#22C55E";
    if (pct >= 10) return "#F59E0B";
    if (pct >= 0) return "#EF4444";
    return "#991B1B";
  };

  const filteredExpenses = useMemo(() => {
    let list = [...expenses];
    if (selectedProjectFilter !== "all") {
      list = list.filter(e => e.project_id === selectedProjectFilter);
    }
    return list.sort((a, b) => b.expense_date.localeCompare(a.expense_date));
  }, [expenses, selectedProjectFilter]);

  const now = new Date();
  const bekleyenTahsilatlar = allHakedis.filter(h => h.status !== "Ödendi" && h.status !== "Taslak" && h.status !== "Reddedildi");
  const expectedIncome = bekleyenTahsilatlar.reduce((s, h) => s + Number(h.net || 0), 0);

  const enrichedSubs = useMemo(() => {
    return subcontractors.map(s => {
      const pays = subPayments.filter(p => p.subcontractor_id === s.id);
      const totalPaid = pays.filter(p => p.status === "odendi").reduce((sum, p) => sum + Number(p.amount), 0);
      const remaining = Number(s.contract_amount) - totalPaid;
      return { ...s, totalPaid, remaining };
    });
  }, [subcontractors, subPayments]);

  const upcomingChecks = checks.filter(c => {
    const days = differenceInDays(parseISO(c.due_date), now);
    return days >= 0 && days <= 7 && c.status !== "odendi" && c.status !== "tahsil_edildi";
  });

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
    const isIncome = INCOME_CATEGORIES.includes(e.category);
    setExpForm({
      project_id: e.project_id,
      category: e.category,
      description: e.description,
      amount: String(e.amount),
      expense_date: e.expense_date,
      has_invoice: e.has_invoice,
      invoice_no: e.invoice_no || "",
      note: e.note || "",
      is_income: isIncome,
      payment_type: (e as any).payment_type || "nakit",
    });
    setAddModal(true);
  };

  const updateAccountBalance = useCallback(async (paymentType: string, amount: number, isIncome: boolean) => {
    const targetType = paymentType === "nakit" ? "nakit_kasa" : "banka";
    if (paymentType === "cek") return; // Çek ile bakiye etkilenmez

    const targetAccount = accounts.find(a => a.account_type === targetType);
    if (!targetAccount) return;

    const newBalance = isIncome
      ? Number(targetAccount.balance) + amount
      : Number(targetAccount.balance) - amount;

    await supabase.from("cash_accounts" as any).update({ balance: newBalance } as any).eq("id", targetAccount.id);
    queryClient.invalidateQueries({ queryKey: ["cash_accounts"] });
  }, [accounts, queryClient]);

  const handleSaveExpense = async () => {
    if (!expForm.project_id || !expForm.amount || Number(expForm.amount) <= 0) {
      toast.error("Proje ve tutar zorunludur");
      return;
    }
    const amount = Number(expForm.amount);
    if (editTarget) {
      await updateExpense.mutateAsync({
        id: editTarget.id,
        project_id: expForm.project_id,
        category: expForm.category,
        description: expForm.description,
        amount,
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
        amount,
        expense_date: expForm.expense_date,
        has_invoice: expForm.has_invoice,
        invoice_no: expForm.invoice_no || null,
        invoice_url: null,
        note: expForm.note || null,
        source: "manual",
      });
      // Update account balance
      await updateAccountBalance(expForm.payment_type, amount, expForm.is_income);
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

  // Kasa helpers
  const handleAddAccount = async () => {
    if (!kasaAccountForm.name) { toast.error("Hesap adı zorunlu"); return; }
    await addAccount.mutateAsync({
      name: kasaAccountForm.name,
      account_type: kasaAccountForm.account_type,
      bank_name: kasaAccountForm.bank_name || null,
      iban: kasaAccountForm.iban || null,
      balance: 0,
    });
    setKasaModal(false);
    setKasaAccountForm({ name: "", account_type: "nakit_kasa", bank_name: "", iban: "" });
  };

  const handleKasaTransaction = async () => {
    const amt = Number(kasaAmount);
    if (!kasaTargetAccountId || !amt || amt <= 0) { toast.error("Hesap ve tutar zorunlu"); return; }
    const acc = accounts.find(a => a.id === kasaTargetAccountId);
    if (!acc) return;
    const newBalance = kasaModalType === "deposit"
      ? Number(acc.balance) + amt
      : Number(acc.balance) - amt;
    await updateAccount.mutateAsync({ id: acc.id, balance: newBalance });
    toast.success(kasaModalType === "deposit" ? "Para girişi kaydedildi" : "Para çıkışı kaydedildi");
    setKasaModal(false);
    setKasaAmount("");
    setKasaDesc("");
    setKasaTargetAccountId("");
  };

  const currentCategories = expForm.is_income ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  return (
    <PageShell maxWidth={1400} className="!py-4">
      <DeleteConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => { if (deleteTarget) deleteExpense.mutate(deleteTarget.id); }}
        title="Kaydı Sil"
        itemName={deleteTarget?.name}
      />
      <DeleteConfirmModal
        open={!!deleteAccountTarget}
        onClose={() => setDeleteAccountTarget(null)}
        onConfirm={async () => { if (deleteAccountTarget) deleteAccount.mutate(deleteAccountTarget.id); }}
        title="Hesabı Sil"
        itemName={deleteAccountTarget?.name}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full mb-6 h-auto p-1 rounded-xl bg-card border border-border flex flex-nowrap gap-0.5 sm:gap-1">
          <TabsTrigger value="overview" className="flex-1 min-w-0 touch-target flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2 px-1 sm:px-3 py-1.5 sm:py-2 text-fs-xs sm:text-fs-sm leading-tight data-[state=active]:bg-primary/15 data-[state=active]:text-primary data-[state=active]:font-semibold rounded-lg transition-colors">
            <BarChart3 className="w-4 h-4 shrink-0" /> <span className="truncate">Genel Bakış</span>
          </TabsTrigger>
          <TabsTrigger value="transactions" className="flex-1 min-w-0 touch-target flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2 px-1 sm:px-3 py-1.5 sm:py-2 text-fs-xs sm:text-fs-sm leading-tight data-[state=active]:bg-primary/15 data-[state=active]:text-primary data-[state=active]:font-semibold rounded-lg transition-colors">
            <CreditCard className="w-4 h-4 shrink-0" /> <span className="truncate">Gelir & Gider</span>
          </TabsTrigger>
          <TabsTrigger value="kasa" className="flex-1 min-w-0 touch-target flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2 px-1 sm:px-3 py-1.5 sm:py-2 text-fs-xs sm:text-fs-sm leading-tight data-[state=active]:bg-primary/15 data-[state=active]:text-primary data-[state=active]:font-semibold rounded-lg transition-colors">
            <Wallet className="w-4 h-4 shrink-0" /> <span className="truncate">Hesaplar</span>
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex-1 min-w-0 touch-target flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2 px-1 sm:px-3 py-1.5 sm:py-2 text-fs-xs sm:text-fs-sm leading-tight data-[state=active]:bg-primary/15 data-[state=active]:text-primary data-[state=active]:font-semibold rounded-lg transition-colors">
            <FileText className="w-4 h-4 shrink-0" /> <span className="truncate">Raporlar</span>
          </TabsTrigger>
        </TabsList>

        {/* ═══ TAB 1: GENEL BAKIŞ ═══ */}
        <TabsContent value="overview">
          <div className="space-y-6">
            {/* Sprint 21.1 — AI Finance Summary */}
            {(() => {
              const weekAhead = new Date(); weekAhead.setDate(weekAhead.getDate() + 7);
              const weekAheadStr = weekAhead.toISOString().slice(0, 10);
              const todayStr = now.toISOString().slice(0, 10);
              const plannedPayments = cashPayments.filter(p => p.status !== "odendi" && p.payment_date >= todayStr && p.payment_date <= weekAheadStr);
              const expectedCollections = cashCollections.filter(c => c.status === "bekleniyor" && c.collection_date >= todayStr && c.collection_date <= weekAheadStr);
              const plannedTotal = plannedPayments.reduce((s, p) => s + Number(p.amount), 0);
              const expectedTotal = expectedCollections.reduce((s, c) => s + Number(c.amount), 0);
              const availableCash = nakitKasaBalance + bankaBalance;
              const netAvailable = availableCash + expectedTotal - plannedTotal;

              const insights: string[] = [];
              if (plannedPayments.length > 0) insights.push(`Bu hafta ${plannedPayments.length} ödeme planlanıyor.`);
              if (expectedCollections.length > 0) insights.push(`${expectedCollections.length} tahsilat nakit akışını dengeliyor.`);
              if (upcomingChecks.length > 0) insights.push(`${upcomingChecks.length} çek vadesi 7 gün içinde.`);
              if (netAvailable < 0) insights.push("Uyarı: Net nakit pozisyonu negatif — tahsilat takibi öncelikli.");
              else if (insights.length === 0) insights.push("Şu anda kritik finansal risk görünmüyor.");

              return (
                <>
                  <AIInsightCard
                    title="AI Finans"
                    insights={insights}
                    actions={[
                      { label: "Detaylı Analiz", onClick: () => setActiveTab("reports") },
                      { label: "Ödeme Planı", onClick: () => setActiveTab("kasa"), tone: "ghost" },
                    ]}
                  />


                  {/* Executive Cash Position */}
                  <SectionCard title="Nakit Pozisyonu" padded={false}>
                    <div className="px-4 pb-4">
                      <ResponsiveGrid variant="auto" minItemWidth={200}>
                        {[
                          { label: "Kullanılabilir Nakit", value: nakitKasaBalance, color: "#22C55E", icon: Banknote },
                          { label: "Banka Bakiyesi", value: bankaBalance, color: "#3B82F6", icon: Building2 },
                          { label: "Beklenen Tahsilat (7 gün)", value: expectedTotal, color: "#A855F7", icon: ArrowDownLeft },
                          { label: "Planlı Ödemeler (7 gün)", value: plannedTotal, color: "#F59E0B", icon: ArrowUpRight },
                          { label: "Net Kullanılabilir", value: netAvailable, color: netAvailable >= 0 ? "#22C55E" : "#EF4444", icon: DollarSign },
                        ].map((c, i) => (
                          <KpiCard
                            key={i}
                            label={c.label}
                            icon={c.icon}
                            accent={c.color}
                            value={
                              <MetricTooltip full={fmtFull(c.value)}>
                                <span className="cursor-help tabular-nums" style={{ color: c.color }}>
                                  {fmtShort(c.value)}
                                </span>
                              </MetricTooltip>
                            }
                          />
                        ))}
                      </ResponsiveGrid>
                    </div>
                  </SectionCard>
                </>
              );
            })()}

            <ResponsiveGrid variant="kpi">
              {[
                { label: "Toplam Gelir", value: totals.ciro, color: "#22C55E", icon: TrendingUp },
                { label: "Toplam Gider", value: totals.gider, color: "#EF4444", icon: TrendingDown },
                { label: "Net Bakiye", value: totals.kar, color: "#3B82F6", icon: DollarSign },
                { label: "Bekleyen Hakediş", value: totals.bekleyenTahsilat, color: "#F59E0B", icon: Receipt },
              ].map((c, i) => (
                <KpiCard
                  key={i}
                  label={c.label}
                  icon={c.icon}
                  accent={c.color}
                  value={
                    <MetricTooltip full={fmtFull(c.value)}>
                      <span className="cursor-help tabular-nums" style={{ color: c.color }}>
                        {fmtShort(c.value)}
                      </span>
                    </MetricTooltip>
                  }
                />
              ))}
            </ResponsiveGrid>


            <div className="rounded-xl p-4 bg-card border border-border">
              <h3 className="text-sm font-semibold mb-4 text-foreground">Aylık Gelir / Gider</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={monthlyData}>
                  <XAxis dataKey="month" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} />
                  <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickFormatter={v => fmtShort(v)} />
                  <ReTooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} formatter={(v: number) => fmtFull(v)} />
                  <Bar dataKey="gelir" fill="#22C55E" radius={[4, 4, 0, 0]} name="Gelir" />
                  <Bar dataKey="gider" fill="#EF4444" radius={[4, 4, 0, 0]} name="Gider" />
                </BarChart>
              </ResponsiveContainer>
            </div>

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
                          <MetricTooltip full={fmtFull(p.hakedisTotal)}><p className="font-semibold truncate cursor-help" style={{ color: "#22C55E" }}>{fmtShort(p.hakedisTotal)}</p></MetricTooltip>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Gider</span>
                          <MetricTooltip full={fmtFull(p.expenseTotal)}><p className="font-semibold truncate cursor-help" style={{ color: "#EF4444" }}>{fmtShort(p.expenseTotal)}</p></MetricTooltip>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Net</span>
                          <MetricTooltip full={fmtFull(p.netKar)}><p className="font-semibold truncate cursor-help" style={{ color: karColor(p.karMarji) }}>{fmtShort(p.netKar)}</p></MetricTooltip>
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
          <PullToRefresh onRefresh={handleRefresh}>
            <div className="space-y-4">
              {(() => {
                const last30 = new Date(); last30.setDate(last30.getDate() - 30);
                const prev30Start = new Date(); prev30Start.setDate(prev30Start.getDate() - 60);
                const inRange = (d: string, from: Date, to: Date) => {
                  const dt = new Date(d);
                  return dt >= from && dt <= to;
                };
                const catSum = (list: typeof expenses, cats: string[], from: Date, to: Date) =>
                  list
                    .filter(x => cats.some(c => x.category.toLowerCase().includes(c)) && inRange(x.expense_date, from, to))
                    .reduce((s, x) => s + Number(x.amount), 0);
                const now2 = new Date();
                const malzemeNow = catSum(expenses, ["malzeme"], last30, now2);
                const malzemePrev = catSum(expenses, ["malzeme"], prev30Start, last30);
                const pctChange = malzemePrev > 0 ? Math.round(((malzemeNow - malzemePrev) / malzemePrev) * 100) : 0;
                const insights: string[] = [];
                if (malzemeNow > 0)
                  insights.push(
                    pctChange === 0
                      ? "Malzeme giderleri son 30 günde stabil."
                      : `Son 30 günde malzeme giderleri %${Math.abs(pctChange)} ${pctChange > 0 ? "arttı" : "azaldı"}.`,
                  );
                const iscilikNow = catSum(expenses, ["işçilik", "iscilik", "taşeron"], last30, now2);
                if (iscilikNow > 0) insights.push("İşçilik giderleri normal seviyede.");
                if (expenses.length === 0) insights.push("İlk kaydınızı ekleyerek AI harcama analizini başlatın.");
                return (
                  <AIInsightCard
                    title="AI Harcama Analizi"
                    insights={insights}
                    actions={[{ label: "İncele", onClick: () => setActiveTab("reports") }]}
                    compact
                  />
                );
              })()}

              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={selectedProjectFilter}
                  onChange={e => setSelectedProjectFilter(e.target.value)}
                  className="px-3 py-2 rounded-lg text-xs bg-card border border-border text-foreground"
                >
                  <option value="all">Tüm Projeler</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <button onClick={() => { setEditTarget(null); setExpForm(defaultForm); setAddModal(true); }}
                  className="ml-auto px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 bg-primary text-primary-foreground">
                  <Plus className="w-4 h-4" /> Kayıt Ekle
                </button>
              </div>

              <div className="rounded-xl bg-card border border-border overflow-hidden">
                {filteredExpenses.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-12 text-center">Henüz kayıt yok</p>
                ) : (
                  <div className="divide-y divide-border">
                    {filteredExpenses.map(e => {
                      const proj = projects.find(p => p.id === e.project_id);
                      const isIncome = INCOME_CATEGORIES.includes(e.category);
                      const paymentType = (e as any).payment_type as string | undefined;
                      return (
                        <div key={e.id} className="flex items-center justify-between px-4 py-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                              style={{ backgroundColor: isIncome ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)" }}>
                              {isIncome
                                ? <ArrowDownLeft className="w-4 h-4" style={{ color: "#22C55E" }} />
                                : <ArrowUpRight className="w-4 h-4" style={{ color: "#EF4444" }} />
                              }
                            </div>
                            <div className="min-w-0">
                              <p className="text-[13px] font-medium text-foreground truncate">{e.description || e.category}</p>
                              <p className="text-[11px] text-muted-foreground truncate">{e.category} • {proj?.name || "—"} • {e.expense_date}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <div className="hidden sm:flex items-center gap-1.5">
                              <PaymentMethodBadge type={paymentType} />
                              <StatusBadge status="odendi" />
                            </div>
                            <span className="text-sm font-semibold min-w-[80px] text-right" style={{ color: isIncome ? "#22C55E" : "#EF4444" }}>
                              {isIncome ? "+" : "-"}{fmtFull(Number(e.amount))}
                            </span>
                            <button onClick={() => openEditModal(e)}
                              className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                              <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                            </button>
                            <button onClick={() => setDeleteTarget({ id: e.id, name: `${e.description || e.category} - ${fmtFull(Number(e.amount))}` })}
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
          </PullToRefresh>

        </TabsContent>

        {/* ═══ TAB 3: KASA & ÖDEMELER ═══ */}
        <TabsContent value="kasa">
          <div className="space-y-6">
            {/* Total Balance */}
            <div className="rounded-xl p-6 text-center bg-card border border-border">
              <p className="text-xs mb-1 text-muted-foreground">Toplam Kasa Bakiyesi</p>
              <p className="text-3xl font-bold text-foreground">{fmtFull(kasaBalance)}</p>
            </div>

            {/* Account Cards */}
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Hesaplar</h3>
              <button
                onClick={() => { setKasaModalType("add_account"); setKasaModal(true); }}
                className="px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 bg-primary text-primary-foreground"
              >
                <Plus className="w-3.5 h-3.5" /> Hesap Ekle
              </button>
            </div>

            {accounts.length === 0 ? (
              <div className="rounded-2xl p-10 text-center bg-card border border-border">
                <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center bg-[#FF6B2B]/10 border border-[#FF6B2B]/20">
                  <WalletIcon className="w-8 h-8 text-[#FF6B2B]" />
                </div>
                <h4 className="text-[15px] font-semibold text-foreground mb-1.5">Henüz hesap oluşturmadınız</h4>
                <p className="text-[12.5px] text-muted-foreground max-w-sm mx-auto mb-4">
                  İlk banka hesabınızı eklediğinizde AI, nakit akışınızı analiz etmeye başlayacak.
                </p>
                <button
                  onClick={() => { setKasaModalType("add_account"); setKasaModal(true); }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold bg-[#FF6B2B] text-white hover:bg-[#FF6B2B]/90 transition-colors"
                >
                  <Plus className="w-4 h-4" /> İlk Hesabı Oluştur
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {accounts.map(acc => {
                  const bankGradients: Record<string, string> = {
                    ziraat: "linear-gradient(135deg,#0E4C2B,#1B7A3A)",
                    vakıfbank: "linear-gradient(135deg,#F5A623,#C77B14)",
                    vakifbank: "linear-gradient(135deg,#F5A623,#C77B14)",
                    "iş bankası": "linear-gradient(135deg,#0F2E5C,#1E4A8A)",
                    is_bankasi: "linear-gradient(135deg,#0F2E5C,#1E4A8A)",
                    garanti: "linear-gradient(135deg,#005B9E,#0AA7D6)",
                    akbank: "linear-gradient(135deg,#B4001F,#E53950)",
                    halkbank: "linear-gradient(135deg,#0E1B4D,#2036A0)",
                    yapı_kredi: "linear-gradient(135deg,#0057A7,#1E7DD0)",
                    finansbank: "linear-gradient(135deg,#4E1F86,#7B3EC4)",
                    denizbank: "linear-gradient(135deg,#EE1D23,#F5636A)",
                  };
                  const isCash = acc.account_type === "nakit_kasa";
                  const bankKey = (acc.bank_name || "").toLowerCase().replace(/\s+/g, "_");
                  const bankKeySimple = (acc.bank_name || "").toLowerCase();
                  const gradient = isCash
                    ? "linear-gradient(135deg,#1B3A2E,#2C5F45)"
                    : bankGradients[bankKey] || bankGradients[bankKeySimple] || "linear-gradient(135deg,#1E2732,#2A3441)";
                  const balanceNum = Number(acc.balance);
                  return (
                    <div
                      key={acc.id}
                      className="relative rounded-2xl p-4 text-white overflow-hidden shadow-lg"
                      style={{ background: gradient }}
                    >
                      <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/5 pointer-events-none" />
                      <div className="absolute -bottom-10 -left-10 w-24 h-24 rounded-full bg-white/5 pointer-events-none" />
                      <div className="relative flex items-start justify-between mb-6">
                        <div className="flex items-center gap-2 min-w-0">
                          {isCash
                            ? <Banknote className="w-5 h-5 text-white/90" />
                            : <Building2 className="w-5 h-5 text-white/90" />
                          }
                          <div className="min-w-0">
                            <p className="text-[13px] font-semibold truncate">{acc.name}</p>
                            <p className="text-[10.5px] text-white/70 truncate">
                              {isCash ? "Nakit Kasa" : (acc.bank_name || "Banka Hesabı")}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => setDeleteAccountTarget({ id: acc.id, name: acc.name })}
                          className="p-1.5 rounded-lg text-white/70 hover:bg-white/10 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="relative">
                        <p className="text-[10px] uppercase tracking-wider text-white/60 mb-0.5">Bakiye</p>
                        <p className="text-2xl font-bold mb-2">{fmtFull(balanceNum)}</p>
                        {acc.iban && (
                          <p className="text-[11px] font-mono text-white/70 tracking-wider mb-2">
                            {acc.iban.replace(/(.{4})/g, "$1 ").trim()}
                          </p>
                        )}
                        <p className="text-[10.5px] text-white/60 mb-3">
                          Son güncelleme: {new Date(acc.updated_at || acc.created_at).toLocaleDateString("tr-TR")}
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => { setKasaModalType("deposit"); setKasaTargetAccountId(acc.id); setKasaModal(true); }}
                            className="flex-1 py-1.5 rounded-lg text-[11.5px] font-medium bg-white/15 hover:bg-white/25 transition-colors flex items-center justify-center gap-1.5"
                          >
                            <ArrowDownLeft className="w-3 h-3" /> Giriş
                          </button>
                          <button
                            onClick={() => { setKasaModalType("withdraw"); setKasaTargetAccountId(acc.id); setKasaModal(true); }}
                            className="flex-1 py-1.5 rounded-lg text-[11.5px] font-medium bg-white/15 hover:bg-white/25 transition-colors flex items-center justify-center gap-1.5"
                          >
                            <ArrowUpRight className="w-3 h-3" /> Çıkış
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}


            {/* Subcontractor debts */}
            <SubcontractorDebtSection />


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

            {/* Sprint 22 — AI Report Summary */}
            {(() => {
              const income = reportHakedis.reduce((s, h) => s + Number(h.net || 0), 0);
              const expense = reportExpenses.reduce((s, e) => s + Number(e.amount), 0);
              const topCat = [...reportCategoryBreakdown].sort((a, b) => b.value - a.value)[0];
              const topProject = [...projectStats].sort((a, b) => b.netKar - a.netKar)[0];
              const insights: string[] = [];
              insights.push(`Toplam gelir ${fmtFull(income)}, gider ${fmtFull(expense)}.`);
              if (topCat) insights.push(`En yüksek gider kalemi: ${topCat.name}.`);
              if (topProject) insights.push(`En kârlı proje: ${topProject.name}.`);
              if (income > 0 && expense > 0) {
                const marj = ((income - expense) / income) * 100;
                insights.push(
                  marj >= 0
                    ? `Dönem kâr marjı %${marj.toFixed(1)} — tahsilatlar hızlanırsa nakit pozisyonu güçlenir.`
                    : `Dönem zararı %${Math.abs(marj).toFixed(1)} — gider optimizasyonu önerilir.`,
                );
              }
              return (
                <AIInsightCard
                  title="AI Rapor Özeti"
                  insights={insights}
                  actions={[
                    { label: "PDF Açıkla", onClick: () => handleExport("pdf") },
                    { label: "Excel Açıkla", onClick: () => handleExport("excel"), tone: "ghost" },
                  ]}
                />
              );
            })()}
          </div>

        </TabsContent>
      </Tabs>

      {/* ═══ Add/Edit Expense Modal ═══ */}
      <Dialog open={addModal} onOpenChange={v => { if (!v) { setAddModal(false); setEditTarget(null); setExpForm(defaultForm); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground">{editTarget ? "Kaydı Düzenle" : "Kayıt Ekle"}</DialogTitle>
            <p className="text-[12px] text-muted-foreground mt-0.5">Gelir veya gider işlemi oluşturun.</p>
          </DialogHeader>

          <div className="space-y-3">
            {/* Gelir / Gider Toggle */}
            <div>
              <label className="text-xs mb-1.5 block text-muted-foreground">İşlem Tipi</label>
              <div className="flex rounded-lg overflow-hidden border border-border">
                <button
                  type="button"
                  onClick={() => setExpForm(f => ({ ...f, is_income: false, category: EXPENSE_CATEGORIES[0] }))}
                  className="flex-1 py-2 text-xs font-medium transition-colors"
                  style={{
                    backgroundColor: !expForm.is_income ? "rgba(239,68,68,0.15)" : "transparent",
                    color: !expForm.is_income ? "#EF4444" : "hsl(var(--muted-foreground))"
                  }}
                >
                  <ArrowUpRight className="w-3.5 h-3.5 inline mr-1" /> Gider
                </button>
                <button
                  type="button"
                  onClick={() => setExpForm(f => ({ ...f, is_income: true, category: INCOME_CATEGORIES[0] }))}
                  className="flex-1 py-2 text-xs font-medium transition-colors"
                  style={{
                    backgroundColor: expForm.is_income ? "rgba(34,197,94,0.15)" : "transparent",
                    color: expForm.is_income ? "#22C55E" : "hsl(var(--muted-foreground))"
                  }}
                >
                  <ArrowDownLeft className="w-3.5 h-3.5 inline mr-1" /> Gelir
                </button>
              </div>
            </div>

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
              <select
                value={expForm.category}
                onChange={e => setExpForm(f => ({ ...f, category: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg text-sm bg-background border border-border text-foreground appearance-auto"
              >
                {currentCategories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* Ödeme Tipi */}
            <div>
              <label className="text-xs mb-1.5 block text-muted-foreground">Ödeme Tipi</label>
              <div className="flex gap-2">
                {PAYMENT_TYPES.map(pt => (
                  <button
                    key={pt.value}
                    type="button"
                    onClick={() => setExpForm(f => ({ ...f, payment_type: pt.value }))}
                    className="flex-1 py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 border transition-colors"
                    style={{
                      borderColor: expForm.payment_type === pt.value ? "hsl(var(--primary))" : "hsl(var(--border))",
                      backgroundColor: expForm.payment_type === pt.value ? "hsl(var(--primary) / 0.1)" : "transparent",
                      color: expForm.payment_type === pt.value ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))"
                    }}
                  >
                    <pt.icon className="w-3.5 h-3.5" /> {pt.label}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                {expForm.payment_type === "nakit" ? "Nakit kasadan düşer" : expForm.payment_type === "havale" ? "Banka hesabından düşer" : "Çek olarak kaydedilir"}
              </p>
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
            <div className="flex gap-2">
              {editTarget && (
                <button onClick={() => { setAddModal(false); setEditTarget(null); setExpForm(defaultForm); }}
                  className="flex-1 py-2.5 rounded-lg text-sm font-medium border border-border text-muted-foreground">
                  İptal
                </button>
              )}
              <button onClick={handleSaveExpense} disabled={addExpense.isPending || updateExpense.isPending}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 bg-primary text-primary-foreground">
                {(addExpense.isPending || updateExpense.isPending) ? "Kaydediliyor..." : "Kaydet"}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══ Kasa Account / Transaction Modal ═══ */}
      <Dialog open={kasaModal} onOpenChange={v => { if (!v) { setKasaModal(false); setKasaAmount(""); setKasaDesc(""); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              {kasaModalType === "add_account" ? "Yeni Hesap" : kasaModalType === "deposit" ? "Para Girişi" : "Para Çıkışı"}
            </DialogTitle>
            <p className="text-[12px] text-muted-foreground mt-0.5">
              {kasaModalType === "add_account"
                ? "Yeni banka veya kasa hesabı oluşturun."
                : kasaModalType === "deposit"
                ? "Seçilen hesaba giriş kaydı ekleyin."
                : "Seçilen hesaptan çıkış kaydı ekleyin."}
            </p>
          </DialogHeader>


          {kasaModalType === "add_account" ? (
            <div className="space-y-3">
              <div>
                <label className="text-xs mb-1 block text-muted-foreground">Hesap Adı *</label>
                <input value={kasaAccountForm.name} onChange={e => setKasaAccountForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg text-sm bg-background border border-border text-foreground" placeholder="örn: Ana Kasa" />
              </div>
              <div>
                <label className="text-xs mb-1 block text-muted-foreground">Hesap Türü</label>
                <select value={kasaAccountForm.account_type} onChange={e => setKasaAccountForm(f => ({ ...f, account_type: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg text-sm bg-background border border-border text-foreground">
                  <option value="nakit_kasa">Nakit Kasa</option>
                  <option value="banka">Banka Hesabı</option>
                </select>
              </div>
              {kasaAccountForm.account_type === "banka" && (
                <>
                  <div>
                    <label className="text-xs mb-1 block text-muted-foreground">Banka Adı</label>
                    <input value={kasaAccountForm.bank_name} onChange={e => setKasaAccountForm(f => ({ ...f, bank_name: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg text-sm bg-background border border-border text-foreground" />
                  </div>
                  <div>
                    <label className="text-xs mb-1 block text-muted-foreground">IBAN</label>
                    <input value={kasaAccountForm.iban} onChange={e => setKasaAccountForm(f => ({ ...f, iban: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg text-sm bg-background border border-border text-foreground" placeholder="TR..." />
                  </div>
                </>
              )}
              <button onClick={handleAddAccount} disabled={addAccount.isPending}
                className="w-full py-2.5 rounded-lg text-sm font-semibold bg-primary text-primary-foreground disabled:opacity-50">
                {addAccount.isPending ? "Ekleniyor..." : "Hesap Ekle"}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="text-xs mb-1 block text-muted-foreground">Hesap</label>
                <select value={kasaTargetAccountId} onChange={e => setKasaTargetAccountId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm bg-background border border-border text-foreground">
                  <option value="">Hesap seçin...</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name} ({fmtFull(Number(a.balance))})</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs mb-1 block text-muted-foreground">Tutar (₺) *</label>
                <input type="number" value={kasaAmount} onChange={e => setKasaAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm bg-background border border-border text-foreground" placeholder="0" />
              </div>
              <div>
                <label className="text-xs mb-1 block text-muted-foreground">Açıklama</label>
                <input value={kasaDesc} onChange={e => setKasaDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm bg-background border border-border text-foreground" placeholder="Açıklama" />
              </div>
              <button onClick={handleKasaTransaction} disabled={updateAccount.isPending}
                className="w-full py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50"
                style={{
                  backgroundColor: kasaModalType === "deposit" ? "#22C55E" : "#EF4444",
                  color: "#FFFFFF"
                }}>
                {updateAccount.isPending ? "Kaydediliyor..." : kasaModalType === "deposit" ? "Para Girişi Kaydet" : "Para Çıkışı Kaydet"}
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </PageShell>
  );
};

export default PaymentsKasaPage;
