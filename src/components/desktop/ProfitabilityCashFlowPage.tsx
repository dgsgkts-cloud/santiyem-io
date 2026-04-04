import { useState, useMemo } from "react";
import DeleteConfirmModal from "@/components/DeleteConfirmModal";
import { useProjects } from "@/hooks/useProjects";
import { useProjectExpenses, ProjectExpense } from "@/hooks/useProjectExpenses";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft, TrendingUp, TrendingDown, DollarSign, Wallet,
  Plus, Trash2, Bot, ChevronRight, AlertTriangle
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as ReTooltip, ResponsiveContainer,
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, Legend
} from "recharts";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

type Page = "overview" | "project-detail" | "cashflow";

const CATEGORIES = ["İşçilik", "Malzeme", "Makine-Ekipman", "Taşeron", "Genel Gider", "Diğer"];
const PIE_COLORS = ["#FF6B2B", "#3B82F6", "#22C55E", "#A855F7", "#F59E0B", "#64748B"];
const FILTERS = ["Bu Ay", "Bu Çeyrek", "Bu Yıl", "Tümü"] as const;

const formatCurrency = (n: number) => {
  if (Math.abs(n) >= 1_000_000) return `₺${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `₺${(n / 1_000).toFixed(0)}K`;
  return `₺${Math.round(n).toLocaleString("tr-TR")}`;
};

const fmtFull = (n: number) => `₺${Math.round(n).toLocaleString("tr-TR")}`;

const ProfitabilityCashFlowPage = () => {
  const { user } = useUser();
  const { projects } = useProjects();
  const { expenses, addExpense, deleteExpense } = useProjectExpenses();
  const [page, setPage] = useState<Page>("overview");
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [filter, setFilter] = useState<typeof FILTERS[number]>("Tümü");
  const [addModal, setAddModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [expForm, setExpForm] = useState({
    project_id: "", category: "İşçilik", description: "", amount: "",
    expense_date: new Date().toISOString().slice(0, 10), has_invoice: false,
    invoice_no: "", note: ""
  });

  // Fetch all hakedis
  const { data: allHakedis = [] } = useQuery({
    queryKey: ["all_hakedis_profitability"],
    queryFn: async () => {
      const { data } = await supabase.from("project_hakedis").select("*");
      return data || [];
    },
    enabled: !!user,
  });

  // Mock monthly data for charts
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

  // Project-level profitability
  const projectStats = useMemo(() => {
    return projects.map(p => {
      const pHakedis = allHakedis.filter(h => h.project_id === p.id);
      const pExpenses = expenses.filter(e => e.project_id === p.id);
      const hakedisTotal = pHakedis.reduce((s, h) => s + Number(h.net || 0), 0);
      const expenseTotal = pExpenses.reduce((s, e) => s + Number(e.amount), 0);
      const netKar = hakedisTotal - expenseTotal;
      const karMarji = hakedisTotal > 0 ? (netKar / hakedisTotal) * 100 : 0;
      return {
        ...p, hakedisTotal, expenseTotal, netKar, karMarji,
        contract: Number(p.contract_amount || 0),
        hakedisItems: pHakedis,
        expenseItems: pExpenses,
      };
    });
  }, [projects, allHakedis, expenses]);

  const totals = useMemo(() => {
    const ciro = projectStats.reduce((s, p) => s + p.hakedisTotal, 0);
    const gider = projectStats.reduce((s, p) => s + p.expenseTotal, 0);
    const kar = ciro - gider;
    const bekleyenTahsilat = allHakedis.filter(h => h.status !== "Ödendi").reduce((s, h) => s + Number(h.net || 0), 0);
    return { ciro, gider, kar, marj: ciro > 0 ? (kar / ciro) * 100 : 0, bekleyenTahsilat };
  }, [projectStats, allHakedis]);

  const selectedProject = projectStats.find(p => p.id === selectedProjectId);

  const handleAddExpense = async () => {
    if (!expForm.project_id || !expForm.amount || Number(expForm.amount) <= 0) {
      toast.error("Proje ve tutar zorunludur");
      return;
    }
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
    toast.success("Gider eklendi");
    setAddModal(false);
    setExpForm({ project_id: "", category: "İşçilik", description: "", amount: "", expense_date: new Date().toISOString().slice(0, 10), has_invoice: false, invoice_no: "", note: "" });
  };

  // Category breakdown for selected project
  const categoryBreakdown = useMemo(() => {
    if (!selectedProject) return [];
    const cats: Record<string, number> = {};
    selectedProject.expenseItems.forEach(e => {
      cats[e.category] = (cats[e.category] || 0) + Number(e.amount);
    });
    return Object.entries(cats).map(([name, value]) => ({ name, value }));
  }, [selectedProject]);

  const karColor = (pct: number) => {
    if (pct >= 20) return "#22C55E";
    if (pct >= 10) return "#F59E0B";
    if (pct >= 0) return "#EF4444";
    return "#991B1B";
  };

  const expDeleteModal = (
    <DeleteConfirmModal
      open={!!deleteTarget}
      onClose={() => setDeleteTarget(null)}
      onConfirm={async () => { if (deleteTarget) deleteExpense.mutate(deleteTarget.id); }}
      title="Gideri Sil"
      itemName={deleteTarget?.name}
    />
  );

  // ─── OVERVIEW PAGE ───
  if (page === "overview") {
    return (
      <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
        {expDeleteModal}
        {/* Tabs */}
        <div className="flex items-center gap-2 flex-wrap">
          {(["overview", "cashflow"] as Page[]).map(p => (
            <button key={p} onClick={() => setPage(p)}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{
                backgroundColor: page === p ? "#FF6B2B" : "#1E2732",
                color: page === p ? "#FFF" : "#94A3B8",
              }}>
              {p === "overview" ? "📊 Karlılık Özeti" : "💰 Nakit Akışı"}
            </button>
          ))}
          <button onClick={() => setAddModal(true)}
            className="ml-auto px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
            style={{ backgroundColor: "#FF6B2B", color: "#FFF" }}>
            <Plus className="w-4 h-4" /> Gider Ekle
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Toplam Ciro", value: totals.ciro, color: "#FF6B2B", icon: TrendingUp, sub: `↑ Toplam hakediş geliri` },
            { label: "Toplam Gider", value: totals.gider, color: "#EF4444", icon: TrendingDown, sub: `Tüm proje giderleri` },
            { label: "Net Kar", value: totals.kar, color: "#22C55E", icon: DollarSign, sub: `Kar marjı: %${totals.marj.toFixed(0)}` },
            { label: "Bekleyen Tahsilat", value: totals.bekleyenTahsilat, icon: Wallet, sub: "Ödenmemiş hakedişler" },
          ].map((c, i) => (
            <div key={i} className="rounded-xl p-4 bg-card border border-border">
              <div className="flex items-center gap-2 mb-2">
                <c.icon className="w-4 h-4" style={{ color: c.color }} />
                <span className="text-xs text-muted-foreground">{c.label}</span>
              </div>
              <p className="text-xl font-bold" style={{ color: c.color }}>{fmtFull(c.value)}</p>
              <p className="text-[11px] mt-1 text-muted-foreground">{c.sub}</p>
            </div>
          ))}
        </div>

        {/* Filter */}
        <div className="flex gap-2">
          {FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              style={{ backgroundColor: filter === f ? "#FF6B2B20" : "#1E2732", color: filter === f ? "#FF6B2B" : "#94A3B8" }}>
              {f}
            </button>
          ))}
        </div>

        {/* Revenue vs Expense Chart */}
        <div className="rounded-xl p-4 bg-card border border-border">
          <h3 className="text-sm font-semibold mb-4 text-foreground">Gelir — Gider Grafiği</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={monthlyData}>
              <XAxis dataKey="month" tick={{ fill: "#64748B", fontSize: 11 }} axisLine={false} />
              <YAxis tick={{ fill: "#64748B", fontSize: 11 }} axisLine={false} tickFormatter={v => formatCurrency(v)} />
              <ReTooltip contentStyle={{ backgroundColor: "#1E2732", border: "none", borderRadius: 8 }} formatter={(v: number) => fmtFull(v)} />
              <Bar dataKey="gelir" fill="#3B82F6" radius={[4, 4, 0, 0]} name="Hakediş Geliri" />
              <Bar dataKey="gider" fill="#EF4444" radius={[4, 4, 0, 0]} name="Gider" />
              <Line type="monotone" dataKey="kar" stroke="#22C55E" strokeWidth={2} name="Net Kar" dot={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Project Profitability Table */}
        <div className="rounded-xl overflow-hidden bg-card border border-border">
          <div className="p-4">
            <h3 className="text-sm font-semibold text-foreground">Proje Bazlı Karlılık</h3>
          </div>
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: "1px solid #1E2732" }}>
                  {["Proje", "Sözleşme", "Hakediş", "Gider", "Net Kar", "Kar %", ""].map(h => (
                    <th key={h} className="text-left px-4 py-2 font-medium text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {projectStats.map(p => (
                  <tr key={p.id} className="cursor-pointer hover:bg-white/5 transition-colors"
                    onClick={() => { setSelectedProjectId(p.id); setPage("project-detail"); }}
                    style={{ borderBottom: "1px solid #1E2732" }}>
                    <td className="px-4 py-3 font-medium text-foreground">{p.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{fmtFull(p.contract)}</td>
                    <td className="px-4 py-3" style={{ color: "#3B82F6" }}>{fmtFull(p.hakedisTotal)}</td>
                    <td className="px-4 py-3" style={{ color: "#EF4444" }}>{fmtFull(p.expenseTotal)}</td>
                    <td className="px-4 py-3 font-medium" style={{ color: karColor(p.karMarji) }}>{fmtFull(p.netKar)}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ backgroundColor: karColor(p.karMarji) + "20", color: karColor(p.karMarji) }}>
                        {p.karMarji < 0 && "⚠️ "}{p.karMarji.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-4 py-3"><ChevronRight className="w-4 h-4 text-muted-foreground" /></td>
                  </tr>
                ))}
                {projectStats.length === 0 && (
                  <tr><td colSpan={7} className="text-center py-8 text-sm text-muted-foreground">Henüz proje yok</td></tr>
                )}
              </tbody>
              {projectStats.length > 0 && (
                <tfoot>
                  <tr style={{ borderTop: "2px solid #1E2732" }}>
                    <td className="px-4 py-3 font-bold text-foreground">Toplam</td>
                    <td className="px-4 py-3 font-bold text-muted-foreground">{fmtFull(projectStats.reduce((s, p) => s + p.contract, 0))}</td>
                    <td className="px-4 py-3 font-bold" style={{ color: "#3B82F6" }}>{fmtFull(totals.ciro)}</td>
                    <td className="px-4 py-3 font-bold" style={{ color: "#EF4444" }}>{fmtFull(totals.gider)}</td>
                    <td className="px-4 py-3 font-bold" style={{ color: karColor(totals.marj) }}>{fmtFull(totals.kar)}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ backgroundColor: karColor(totals.marj) + "20", color: karColor(totals.marj) }}>
                        {totals.marj.toFixed(1)}%
                      </span>
                    </td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
          {/* Mobile cards */}
          <div className="md:hidden space-y-2 p-3">
            {projectStats.map(p => (
              <div key={p.id} className="rounded-lg p-3 cursor-pointer bg-background border border-border"
                onClick={() => { setSelectedProjectId(p.id); setPage("project-detail"); }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-foreground">{p.name}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ backgroundColor: karColor(p.karMarji) + "20", color: karColor(p.karMarji) }}>
                    {p.karMarji.toFixed(1)}%
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-[11px]">
                  <div><span className="text-muted-foreground">Gelir</span><br /><span style={{ color: "#3B82F6" }}>{formatCurrency(p.hakedisTotal)}</span></div>
                  <div><span className="text-muted-foreground">Gider</span><br /><span style={{ color: "#EF4444" }}>{formatCurrency(p.expenseTotal)}</span></div>
                  <div><span className="text-muted-foreground">Kar</span><br /><span style={{ color: karColor(p.karMarji) }}>{formatCurrency(p.netKar)}</span></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Add Expense Modal */}
        <AddExpenseModal open={addModal} onClose={() => setAddModal(false)} form={expForm} setForm={setExpForm} onSave={handleAddExpense} projects={projects} saving={addExpense.isPending} />
      </div>
    );
  }

  // ─── PROJECT DETAIL PAGE ───
  if (page === "project-detail" && selectedProject) {
    const marj = selectedProject.hakedisTotal > 0 ? (selectedProject.netKar / selectedProject.hakedisTotal) * 100 : 0;
    const topCategory = categoryBreakdown.sort((a, b) => b.value - a.value)[0];

    return (
      <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">
        <button onClick={() => setPage("overview")} className="flex items-center gap-2 text-sm font-medium" style={{ color: "#FF6B2B" }}>
          <ArrowLeft className="w-4 h-4" /> Karlılık & Nakit Akışı
        </button>

        <div>
          <h2 className="text-lg font-bold text-foreground">{selectedProject.name}</h2>
          <p className="text-xs text-muted-foreground">{selectedProject.client} • {selectedProject.start_date} — {selectedProject.end_date}</p>
        </div>

        {/* 4 summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Sözleşme", value: selectedProject.contract },
            { label: "Toplam Hakediş", value: selectedProject.hakedisTotal, color: "#3B82F6" },
            { label: "Toplam Gider", value: selectedProject.expenseTotal, color: "#EF4444" },
            { label: "Net Kar", value: selectedProject.netKar, color: karColor(marj) },
          ].map((c, i) => (
            <div key={i} className="rounded-xl p-4 text-center bg-card border border-border">
              <p className="text-xs mb-1 text-muted-foreground">{c.label}</p>
              <p className="text-lg font-bold" style={{ color: c.color }}>{fmtFull(c.value)}</p>
            </div>
          ))}
        </div>

        {/* Profit gauge */}
        <div className="rounded-xl p-6 flex flex-col items-center bg-card border border-border">
          <div className="relative w-32 h-32">
            <svg viewBox="0 0 36 36" className="w-32 h-32">
              <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#1E2732" strokeWidth="3" />
              <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none" stroke={karColor(marj)} strokeWidth="3" strokeDasharray={`${Math.max(0, Math.min(marj, 100))}, 100`} strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-bold" style={{ color: karColor(marj) }}>%{marj.toFixed(0)}</span>
              <span className="text-[10px] text-muted-foreground">Kar Marjı</span>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-4">
          {/* Revenue detail */}
          <div className="rounded-xl p-4 bg-card border border-border">
            <h3 className="text-sm font-semibold mb-3 text-foreground">Gelirler</h3>
            {selectedProject.hakedisItems.length === 0 ? (
              <p className="text-xs text-muted-foreground">Hakediş kaydı yok</p>
            ) : (
              <div className="space-y-2">
                {selectedProject.hakedisItems.map((h: any, i: number) => (
                  <div key={h.id} className="flex items-center justify-between py-2" style={{ borderBottom: "1px solid #1E2732" }}>
                    <div>
                      <span className="text-xs font-medium text-foreground">Hakediş #{i + 1} — {h.period}</span>
                      <p className="text-[11px] text-muted-foreground">{h.payment_date || "Tarih belirtilmemiş"}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold" style={{ color: "#3B82F6" }}>{fmtFull(Number(h.net))}</span>
                      <p className="text-[10px]" style={{ color: h.status === "Ödendi" ? "#22C55E" : "#F59E0B" }}>{h.status}</p>
                    </div>
                  </div>
                ))}
                <div className="pt-2 flex justify-between">
                  <span className="text-xs font-bold text-foreground">Toplam</span>
                  <span className="text-sm font-bold" style={{ color: "#3B82F6" }}>{fmtFull(selectedProject.hakedisTotal)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Expense detail */}
          <div className="rounded-xl p-4 bg-card border border-border">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground">Giderler</h3>
              <button onClick={() => { setExpForm(f => ({ ...f, project_id: selectedProject.id })); setAddModal(true); }}
                className="px-3 py-1 rounded-lg text-xs font-medium flex items-center gap-1"
                style={{ backgroundColor: "#FF6B2B", color: "#FFF" }}>
                <Plus className="w-3 h-3" /> Gider Ekle
              </button>
            </div>
            {selectedProject.expenseItems.length === 0 ? (
              <p className="text-xs text-muted-foreground">Gider kaydı yok</p>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {selectedProject.expenseItems.map((e: ProjectExpense) => (
                  <div key={e.id} className="flex items-center justify-between py-2" style={{ borderBottom: "1px solid #1E2732" }}>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-foreground">{e.description || e.category}</span>
                        {e.source === "site_diary" && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium" style={{ backgroundColor: "rgba(59,130,246,0.15)", color: "#60A5FA" }}>📔 Günlük</span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground">{e.category} • {e.expense_date}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold" style={{ color: "#EF4444" }}>{fmtFull(Number(e.amount))}</span>
                      <button onClick={(ev) => { ev.stopPropagation(); setDeleteTarget({ id: e.id, name: `${e.description} - ${fmtFull(Number(e.amount))}` }); }}
                        className="p-1 rounded hover:bg-white/10"><Trash2 className="w-3 h-3 text-muted-foreground" /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Pie chart */}
        {categoryBreakdown.length > 0 && (
          <div className="rounded-xl p-4 bg-card border border-border">
            <h3 className="text-sm font-semibold mb-3 text-foreground">Kategori Bazlı Gider Dağılımı</h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={categoryBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} %${(percent * 100).toFixed(0)}`}>
                  {categoryBreakdown.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Legend wrapperStyle={{ fontSize: 11, color: "#94A3B8" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* AI Comment */}
        <div className="rounded-xl p-4" style={{ backgroundColor: "#FF6B2B10", border: "1px solid #FF6B2B30" }}>
          <div className="flex items-center gap-2 mb-2">
            <Bot className="w-5 h-5" style={{ color: "#FF6B2B" }} />
            <span className="text-sm font-semibold" style={{ color: "#FF6B2B" }}>AI Karlılık Yorumu</span>
          </div>
          <p className="text-xs leading-relaxed" style={{ color: "#CBD5E1" }}>
            {selectedProject.expenseItems.length > 0
              ? `Bu projede toplam ${fmtFull(selectedProject.expenseTotal)} gider kaydedildi. ${topCategory ? `En yüksek gider kalemi ${topCategory.name} (${((topCategory.value / selectedProject.expenseTotal) * 100).toFixed(0)}%).` : ""} Mevcut kar marjı %${marj.toFixed(0)}${marj >= 20 ? " olup sektör ortalamasının üzerindedir. ✅" : marj >= 10 ? " olup sektör ortalamasına yakındır." : " olup düşük seviyededir. ⚠️ Giderleri gözden geçirin."}`
              : "Henüz gider kaydı bulunmamaktadır. Gider eklemeye başlayarak karlılık analizinden faydalanabilirsiniz."
            }
          </p>
        </div>

        <AddExpenseModal open={addModal} onClose={() => setAddModal(false)} form={expForm} setForm={setExpForm} onSave={handleAddExpense} projects={projects} saving={addExpense.isPending} />
      </div>
    );
  }

  // ─── CASH FLOW PAGE ───
  if (page === "cashflow") {
    const bekleyenTahsilatlar = allHakedis.filter(h => h.status !== "Ödendi");
    const nakit = totals.ciro - totals.gider;

    // 12-week forecast mock
    const forecastData = Array.from({ length: 12 }, (_, i) => {
      const week = `Hafta ${i + 1}`;
      const tahsilat = i === 2 ? 485000 : i === 6 ? 320000 : Math.random() * 100000;
      const odeme = i === 4 ? 180000 : i === 8 ? 85000 : Math.random() * 80000;
      return { week, tahsilat: Math.round(tahsilat), odeme: Math.round(odeme), net: Math.round(nakit + tahsilat - odeme) };
    });

    return (
      <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
        {expDeleteModal}
        {/* Tabs */}
        <div className="flex items-center gap-2">
          {(["overview", "cashflow"] as Page[]).map(p => (
            <button key={p} onClick={() => setPage(p)}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{
                backgroundColor: page === p ? "#FF6B2B" : "#1E2732",
                color: page === p ? "#FFF" : "#94A3B8",
              }}>
              {p === "overview" ? "📊 Karlılık Özeti" : "💰 Nakit Akışı"}
            </button>
          ))}
        </div>

        {/* Current cash */}
        <div className="rounded-xl p-6 text-center bg-card border border-border">
          <p className="text-xs mb-1 text-muted-foreground">Bugün itibarıyla tahmini nakit</p>
          <p className="text-3xl font-bold text-foreground">{fmtFull(nakit)}</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-4">
          {/* Pending collections */}
          <div className="rounded-xl p-4 bg-card border border-border">
            <h3 className="text-sm font-semibold mb-3" style={{ color: "#22C55E" }}>Bekleyen Tahsilatlar</h3>
            {bekleyenTahsilatlar.length === 0 ? (
              <p className="text-xs text-muted-foreground">Bekleyen tahsilat yok</p>
            ) : (
              <div className="space-y-2">
                {bekleyenTahsilatlar.map(h => {
                  const proj = projects.find(p => p.id === h.project_id);
                  return (
                    <div key={h.id} className="flex justify-between py-2" style={{ borderBottom: "1px solid #1E2732" }}>
                      <div>
                        <span className="text-xs text-foreground">{proj?.name || "Proje"}</span>
                        <p className="text-[11px] text-muted-foreground">{h.period}</p>
                      </div>
                      <span className="text-sm font-bold" style={{ color: "#22C55E" }}>{fmtFull(Number(h.net))}</span>
                    </div>
                  );
                })}
                <div className="pt-2 flex justify-between">
                  <span className="text-xs font-bold text-foreground">Toplam</span>
                  <span className="text-sm font-bold" style={{ color: "#22C55E" }}>{fmtFull(totals.bekleyenTahsilat)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Info card */}
          <div className="rounded-xl p-4 bg-card border border-border">
            <h3 className="text-sm font-semibold mb-3" style={{ color: "#EF4444" }}>Planlanan Ödemeler</h3>
            <p className="text-xs text-muted-foreground">Gider kaydı eklediğinizde, vadesi gelen ödemeler burada görünecektir.</p>
            <div className="pt-3 flex justify-between">
              <span className="text-xs font-bold text-foreground">Toplam Gider</span>
              <span className="text-sm font-bold" style={{ color: "#EF4444" }}>{fmtFull(totals.gider)}</span>
            </div>
          </div>
        </div>

        {/* Forecast chart */}
        <div className="rounded-xl p-4 bg-card border border-border">
          <h3 className="text-sm font-semibold mb-4 text-foreground">3 Aylık Nakit Akışı Tahmini</h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={forecastData}>
              <XAxis dataKey="week" tick={{ fill: "#64748B", fontSize: 10 }} axisLine={false} />
              <YAxis tick={{ fill: "#64748B", fontSize: 10 }} axisLine={false} tickFormatter={v => formatCurrency(v)} />
              <ReTooltip contentStyle={{ backgroundColor: "#1E2732", border: "none", borderRadius: 8 }} formatter={(v: number) => fmtFull(v)} />
              <Area type="monotone" dataKey="tahsilat" fill="#22C55E20" stroke="#22C55E" name="Beklenen Tahsilat" />
              <Area type="monotone" dataKey="odeme" fill="#EF444420" stroke="#EF4444" name="Beklenen Ödeme" />
              <Line type="monotone" dataKey="net" stroke="#3B82F6" strokeWidth={2} name="Nakit Pozisyonu" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* AI Cash Flow Comment */}
        <div className="rounded-xl p-4" style={{ backgroundColor: "#FF6B2B10", border: "1px solid #FF6B2B30" }}>
          <div className="flex items-center gap-2 mb-2">
            <Bot className="w-5 h-5" style={{ color: "#FF6B2B" }} />
            <span className="text-sm font-semibold" style={{ color: "#FF6B2B" }}>AI Nakit Akışı Tahmini</span>
          </div>
          <p className="text-xs leading-relaxed" style={{ color: "#CBD5E1" }}>
            📊 Önümüzdeki 30 gün: Beklenen tahsilat: {fmtFull(totals.bekleyenTahsilat)}.
            Planlanan gider: {fmtFull(totals.gider * 0.3)}.
            {totals.bekleyenTahsilat > totals.gider * 0.3
              ? ` Tahmini net: +${fmtFull(totals.bekleyenTahsilat - totals.gider * 0.3)} ✅`
              : ` ⚠️ Nakit sıkışıklığı riski mevcut. Hakedişlerinizi hızlandırmanız önerilir.`
            }
          </p>
        </div>

        <AddExpenseModal open={addModal} onClose={() => setAddModal(false)} form={expForm} setForm={setExpForm} onSave={handleAddExpense} projects={projects} saving={addExpense.isPending} />
      </div>
    );
  }

  // Fallback to overview
  return null;
};

// ─── Add Expense Modal ───
interface AddExpenseModalProps {
  open: boolean;
  onClose: () => void;
  form: any;
  setForm: (fn: any) => void;
  onSave: () => void;
  projects: any[];
  saving: boolean;
}

const AddExpenseModal = ({ open, onClose, form, setForm, onSave, projects, saving }: AddExpenseModalProps) => (
  <Dialog open={open} onOpenChange={onClose}>
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle className="text-foreground">Gider Ekle</DialogTitle>
      </DialogHeader>
      <div className="space-y-3">
        <div>
          <label className="text-xs mb-1 block text-muted-foreground">Proje *</label>
          <select value={form.project_id} onChange={e => setForm((f: any) => ({ ...f, project_id: e.target.value }))}
            className="w-full px-3 py-2 rounded-lg text-sm">
            <option value="">Proje seçin...</option>
            {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs mb-1 block text-muted-foreground">Kategori</label>
          <select value={form.category} onChange={e => setForm((f: any) => ({ ...f, category: e.target.value }))}
            className="w-full px-3 py-2 rounded-lg text-sm">
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs mb-1 block text-muted-foreground">Açıklama</label>
          <input value={form.description} onChange={e => setForm((f: any) => ({ ...f, description: e.target.value }))}
            className="w-full px-3 py-2 rounded-lg text-sm"
            placeholder="Gider açıklaması" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs mb-1 block text-muted-foreground">Tutar (₺) *</label>
            <input type="number" value={form.amount} onChange={e => setForm((f: any) => ({ ...f, amount: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg text-sm"
              placeholder="0" />
          </div>
          <div>
            <label className="text-xs mb-1 block text-muted-foreground">Tarih</label>
            <input type="date" value={form.expense_date} onChange={e => setForm((f: any) => ({ ...f, expense_date: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg text-sm" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input type="checkbox" checked={form.has_invoice} onChange={e => setForm((f: any) => ({ ...f, has_invoice: e.target.checked }))} />
          <label className="text-xs text-muted-foreground">Fatura var</label>
        </div>
        {form.has_invoice && (
          <div>
            <label className="text-xs mb-1 block text-muted-foreground">Fatura No</label>
            <input value={form.invoice_no} onChange={e => setForm((f: any) => ({ ...f, invoice_no: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg text-sm" />
          </div>
        )}
        <div>
          <label className="text-xs mb-1 block text-muted-foreground">Not (opsiyonel)</label>
          <textarea value={form.note} onChange={e => setForm((f: any) => ({ ...f, note: e.target.value }))}
            className="w-full px-3 py-2 rounded-lg text-sm resize-none" rows={2} />
        </div>
        <button onClick={onSave} disabled={saving}
          className="w-full py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
          style={{ backgroundColor: "#FF6B2B", color: "#FFF" }}>
          {saving ? "Kaydediliyor..." : "Kaydet"}
        </button>
      </div>
    </DialogContent>
  </Dialog>
);

export default ProfitabilityCashFlowPage;
