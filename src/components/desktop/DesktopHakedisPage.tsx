import { useState, useMemo } from "react";
import { ArrowLeft, Plus, FileDown, FileSpreadsheet, Trash2, ChevronDown, X, RefreshCw, Bot, TrendingUp, AlertTriangle, CheckCircle, Clock, FileText, Edit3 } from "lucide-react";
import { useProjects } from "@/hooks/useProjects";
import { useAllHakedis, useProjectHakedis } from "@/hooks/useProjectHakedis";
import { exportHakedisPDF, exportHakedisExcel } from "@/lib/hakedisExport";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, Line, ComposedChart } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const STATUS_OPTIONS = [
  { label: "Bekliyor", color: "#F59E0B" },
  { label: "Onaylandı", color: "#22C55E" },
  { label: "Reddedildi", color: "#EF4444" },
  { label: "Hazırlanıyor", color: "#3B82F6" },
  { label: "Ödendi", color: "#10B981" },
];

const fmt = (n: number) => n.toLocaleString("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 });
const fmtShort = (n: number) => {
  if (n >= 1_000_000) return `₺${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `₺${Math.round(n / 1_000)}K`;
  return `₺${Math.round(n)}`;
};

const LEGAL_INTEREST_RATE = 0.48; // %48/yıl 2025
const DAILY_RATE = LEGAL_INTEREST_RATE / 365;

const DesktopHakedisPage = () => {
  const { projects, loading: projectsLoading } = useProjects();
  const { allHakedisler } = useAllHakedis();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  if (projectsLoading) return <div className="p-6 text-center" style={{ color: "#94A3B8" }}>Yükleniyor...</div>;

  if (selectedProjectId) {
    return <ProjectDetailView projectId={selectedProjectId} projects={projects} allHakedisler={allHakedisler} onBack={() => setSelectedProjectId(null)} />;
  }

  return <ProjectListView projects={projects} allHakedisler={allHakedisler} onSelectProject={setSelectedProjectId} />;
};

// ─── LEVEL 1: Project List ───────────────────────────────────
interface ProjectListViewProps {
  projects: any[];
  allHakedisler: any[];
  onSelectProject: (id: string) => void;
}

const ProjectListView = ({ projects, allHakedisler, onSelectProject }: ProjectListViewProps) => {
  const projectCards = useMemo(() => {
    return projects.map(p => {
      const hakedisler = allHakedisler.filter(h => h.project_id === p.id);
      const contract = Number(p.contract_amount) || 0;
      const totalHakedis = hakedisler.reduce((s: number, h: any) => s + h.amount, 0);
      const remaining = contract - totalHakedis;
      const pct = contract > 0 ? Math.min(100, Math.round((totalHakedis / contract) * 100)) : 0;
      const collected = hakedisler.filter((h: any) => h.status === "Ödendi").reduce((s: number, h: any) => s + h.net, 0);
      const pending = hakedisler.filter((h: any) => h.status === "Bekliyor" || h.status === "Onaylandı").reduce((s: number, h: any) => s + h.net, 0);

      // Overdue: status Bekliyor and created > 30 days ago
      const now = Date.now();
      const overdueItems = hakedisler.filter((h: any) => {
        if (h.status !== "Bekliyor") return false;
        const created = new Date(h.created_at).getTime();
        return (now - created) > 30 * 24 * 60 * 60 * 1000;
      });
      const overdueAmount = overdueItems.reduce((s: number, h: any) => s + h.net, 0);
      const maxOverdueDays = overdueItems.length > 0
        ? Math.max(...overdueItems.map((h: any) => Math.round((now - new Date(h.created_at).getTime()) / (1000 * 60 * 60 * 24))))
        : 0;

      return { ...p, hakedisler, contract, totalHakedis, remaining, pct, collected, pending, overdueAmount, maxOverdueDays };
    });
  }, [projects, allHakedisler]);

  if (projects.length === 0) {
    return (
      <div className="p-3 sm:p-4 md:p-6 max-w-[1200px] mx-auto">
        <h2 className="text-base md:text-lg font-bold mb-4" style={{ color: "#F1F5F9" }}>Hakediş Yönetimi</h2>
        <div className="rounded-xl p-8 text-center" style={{ backgroundColor: "#161C23", border: "1px solid #1E2732" }}>
          <p style={{ color: "#64748B" }}>Henüz proje eklenmedi. Önce Proje Yönetimi'nden proje ekleyin.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 md:p-6 max-w-[1200px] mx-auto space-y-4">
      <h2 className="text-base md:text-lg font-bold" style={{ color: "#F1F5F9" }}>Hakediş Yönetimi</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {projectCards.map(p => (
          <div key={p.id} className="rounded-xl overflow-hidden relative" style={{ backgroundColor: "#161C23", border: "1px solid #1E2732" }}>
            {/* Overdue stripe */}
            {p.maxOverdueDays > 0 && (
              <div className="px-4 py-1.5 text-[11px] font-medium flex items-center gap-1.5" style={{ backgroundColor: "rgba(239,68,68,0.15)", color: "#EF4444" }}>
                <AlertTriangle className="w-3 h-3" /> {p.maxOverdueDays} gündür ödeme bekliyor
              </div>
            )}

            <div className="p-4 space-y-3">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-semibold truncate" style={{ color: "#F1F5F9" }}>{p.name}</p>
                  <p className="text-[12px] mt-0.5" style={{ color: "#64748B" }}>{p.client}</p>
                </div>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-md shrink-0 ml-2" style={{ backgroundColor: `${p.status_color}15`, color: p.status_color }}>
                  {p.status}
                </span>
              </div>

              {/* Contract vs Hakedis */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[12px]">
                  <span style={{ color: "#64748B" }}>Sözleşme Tutarı:</span>
                  <span style={{ color: "#64748B" }}>{p.contract > 0 ? fmt(p.contract) : "Belirtilmedi"}</span>
                </div>
                <div className="flex justify-between text-[12px]">
                  <span style={{ color: "#94A3B8" }}>Toplam Hakediş:</span>
                  <span className="font-semibold" style={{ color: "#F1F5F9" }}>{fmt(p.totalHakedis)}</span>
                </div>
                {p.contract > 0 && (
                  <div className="flex justify-between text-[12px]">
                    <span style={{ color: "#94A3B8" }}>Kalan:</span>
                    <span className="font-semibold" style={{ color: p.remaining >= 0 ? "#22C55E" : "#EF4444" }}>{fmt(p.remaining)}</span>
                  </div>
                )}
              </div>

              {/* Progress bar */}
              {p.contract > 0 && (
                <div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 rounded-full" style={{ backgroundColor: "#1E2732" }}>
                      <div className="h-full rounded-full transition-all" style={{ backgroundColor: p.pct > 90 ? "#EF4444" : "#FF6B2B", width: `${Math.min(100, p.pct)}%` }} />
                    </div>
                    <span className="text-[11px] font-mono font-semibold" style={{ color: "#94A3B8" }}>%{p.pct}</span>
                  </div>
                </div>
              )}

              {/* Mini stats */}
              <div className="grid grid-cols-3 gap-2 pt-1" style={{ borderTop: "1px solid #1E2732" }}>
                <div>
                  <p className="text-[10px]" style={{ color: "#64748B" }}>✅ Tahsil</p>
                  <p className="text-[12px] font-semibold" style={{ color: "#22C55E" }}>{fmtShort(p.collected)}</p>
                </div>
                <div>
                  <p className="text-[10px]" style={{ color: "#64748B" }}>⏳ Bekleyen</p>
                  <p className="text-[12px] font-semibold" style={{ color: "#F59E0B" }}>{fmtShort(p.pending)}</p>
                </div>
                <div>
                  <p className="text-[10px]" style={{ color: "#64748B" }}>⚠️ Gecikmiş</p>
                  <p className="text-[12px] font-semibold" style={{ color: p.overdueAmount > 0 ? "#EF4444" : "#64748B" }}>{fmtShort(p.overdueAmount)}</p>
                </div>
              </div>

              {/* Detail button */}
              <button
                onClick={() => onSelectProject(p.id)}
                className="w-full py-2 rounded-lg text-[12px] font-semibold transition-colors"
                style={{ backgroundColor: "#1E2732", color: "#FF6B2B" }}
              >
                Detay →
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── LEVEL 2: Project Detail ─────────────────────────────────
interface ProjectDetailViewProps {
  projectId: string;
  projects: any[];
  allHakedisler: any[];
  onBack: () => void;
}

const ProjectDetailView = ({ projectId, projects, onBack }: ProjectDetailViewProps) => {
  const project = projects.find((p: any) => p.id === projectId);
  const { hakedisler, loading, addHakedis, deleteHakedis, updateHakedisStatus } = useProjectHakedis(projectId);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formPeriod, setFormPeriod] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formKdvRate, setFormKdvRate] = useState("20");
  const [statusMenuId, setStatusMenuId] = useState<string | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<string[] | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [chartRange, setChartRange] = useState<"6" | "12" | "all">("12");

  const contract = Number(project?.contract_amount) || 0;
  const totalAmount = hakedisler.reduce((s, h) => s + h.amount, 0);
  const totalNet = hakedisler.reduce((s, h) => s + h.net, 0);
  const collected = hakedisler.filter(h => h.status === "Ödendi").reduce((s, h) => s + h.net, 0);
  const pending = hakedisler.filter(h => h.status === "Bekliyor" || h.status === "Onaylandı").reduce((s, h) => s + h.net, 0);
  const remaining = contract - totalAmount;
  const pct = contract > 0 ? Math.min(100, Math.round((totalAmount / contract) * 100)) : 0;

  const now = Date.now();
  const overdueItems = hakedisler.filter(h => {
    if (h.status !== "Bekliyor") return false;
    const created = new Date(h.created_at).getTime();
    return (now - created) > 30 * 24 * 60 * 60 * 1000;
  });

  // Chart data
  const chartData = useMemo(() => {
    const months: Record<string, { name: string; hakedis: number; tahsil: number; gecikme: number }> = {};
    const sorted = [...hakedisler].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    
    sorted.forEach(h => {
      const d = new Date(h.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const monthNames = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
      const name = `${monthNames[d.getMonth()]} ${d.getFullYear().toString().slice(2)}`;
      if (!months[key]) months[key] = { name, hakedis: 0, tahsil: 0, gecikme: 0 };
      months[key].hakedis += h.amount;
      if (h.status === "Ödendi") months[key].tahsil += h.net;
      if (h.status === "Bekliyor" && (now - new Date(h.created_at).getTime()) > 30 * 24 * 60 * 60 * 1000) {
        months[key].gecikme += h.net;
      }
    });

    let data = Object.entries(months).sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => v);
    if (chartRange === "6") data = data.slice(-6);
    else if (chartRange === "12") data = data.slice(-12);
    return data;
  }, [hakedisler, chartRange, now]);

  const avgMonthly = chartData.length > 0 ? chartData.reduce((s, d) => s + d.hakedis, 0) / chartData.length : 0;
  const maxMonth = chartData.length > 0 ? chartData.reduce((max, d) => d.hakedis > max.hakedis ? d : max, chartData[0]) : null;
  const collectionRate = totalNet > 0 ? Math.round((collected / totalNet) * 100) : 0;

  const handleAdd = () => {
    if (!formPeriod || !formAmount) return;
    addHakedis(formPeriod, parseFloat(formAmount), parseFloat(formKdvRate) / 100);
    setFormPeriod("");
    setFormAmount("");
    setShowAddForm(false);
  };

  const generateAIAnalysis = async () => {
    setAiLoading(true);
    try {
      const analysisPrompts: string[] = [];

      // Anomaly check
      if (hakedisler.length >= 2) {
        const prev = hakedisler[hakedisler.length - 2];
        const curr = hakedisler[hakedisler.length - 1];
        const change = prev.amount > 0 ? ((curr.amount - prev.amount) / prev.amount) * 100 : 0;
        if (change > 30) {
          analysisPrompts.push(`⚠️ ${curr.period} döneminde önceki döneme göre %${Math.round(change)} artış tespit edildi. Önceki dönem ${fmt(prev.amount)} iken bu dönem ${fmt(curr.amount)}. Kontrol ediniz.`);
        } else {
          analysisPrompts.push("✅ Hakediş kalemleri arasında anormal artış tespit edilmedi.");
        }
      } else {
        analysisPrompts.push("✅ Hakediş kalemleri arasında anormal artış tespit edilmedi.");
      }

      // Budget projection
      if (contract > 0 && hakedisler.length >= 2) {
        const firstDate = new Date(hakedisler[0].created_at).getTime();
        const lastDate = new Date(hakedisler[hakedisler.length - 1].created_at).getTime();
        const monthsElapsed = Math.max(1, (lastDate - firstDate) / (1000 * 60 * 60 * 24 * 30));
        const monthlyRate = totalAmount / monthsElapsed;
        const remainingMonths = monthlyRate > 0 ? remaining / monthlyRate : 999;
        const budgetEndDate = new Date(Date.now() + remainingMonths * 30 * 24 * 60 * 60 * 1000);
        const endDate = project?.end_date ? new Date(project.end_date) : null;

        if (endDate && budgetEndDate < endDate) {
          const monthsBefore = Math.round((endDate.getTime() - budgetEndDate.getTime()) / (1000 * 60 * 60 * 24 * 30));
          analysisPrompts.push(`📊 Mevcut harcama hızıyla sözleşme tutarı ${budgetEndDate.toLocaleDateString("tr-TR", { month: "long", year: "numeric" })}'te dolacak. Projenin tahmini bitiş tarihi ${endDate.toLocaleDateString("tr-TR", { month: "long", year: "numeric" })} olduğundan ${monthsBefore} ay önce bütçe tükenebilir. Erken önlem almanız önerilir.`);
        } else {
          analysisPrompts.push("✅ Mevcut harcama hızıyla sözleşme bütçesi proje bitiş tarihine kadar yeterli görünüyor.");
        }
      } else if (contract === 0) {
        analysisPrompts.push("ℹ️ Sözleşme tutarı belirtilmediği için bütçe projeksiyonu yapılamadı.");
      } else {
        analysisPrompts.push("✅ Mevcut harcama hızıyla sözleşme bütçesi proje bitiş tarihine kadar yeterli görünüyor.");
      }

      setAiAnalysis(analysisPrompts);
    } catch {
      toast.error("AI analizi oluşturulamadı");
    } finally {
      setAiLoading(false);
    }
  };

  // Auto generate AI analysis on load
  useMemo(() => {
    if (hakedisler.length > 0 && !aiAnalysis && !aiLoading) {
      generateAIAnalysis();
    }
  }, [hakedisler.length]);

  const statusBorder = (status: string) => {
    if (status === "Ödendi") return "#22C55E";
    if (status === "Bekliyor") return "#F59E0B";
    if (status === "Reddedildi") return "#EF4444";
    return "#64748B";
  };

  const statusIcon = (status: string) => {
    if (status === "Ödendi") return <CheckCircle className="w-4 h-4" style={{ color: "#22C55E" }} />;
    if (status === "Bekliyor") return <Clock className="w-4 h-4" style={{ color: "#F59E0B" }} />;
    if (status === "Reddedildi") return <AlertTriangle className="w-4 h-4" style={{ color: "#EF4444" }} />;
    return <FileText className="w-4 h-4" style={{ color: "#64748B" }} />;
  };

  return (
    <div className="p-3 sm:p-4 md:p-6 max-w-[1200px] mx-auto space-y-4 md:space-y-5">
      {/* Top bar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <button onClick={onBack} className="flex items-center gap-1.5 text-[13px] font-medium" style={{ color: "#94A3B8" }}>
          <ArrowLeft className="w-4 h-4" /> Hakediş Yönetimi
        </button>
        <div className="flex items-center gap-2">
          {hakedisler.length > 0 && (
            <>
              <button onClick={() => exportHakedisPDF(hakedisler, project?.name || "Proje")} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-semibold" style={{ backgroundColor: "#1E2732", color: "#F1F5F9" }}>
                <FileDown className="w-3.5 h-3.5" /> PDF
              </button>
              <button onClick={() => exportHakedisExcel(hakedisler, project?.name || "Proje")} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-semibold" style={{ backgroundColor: "#1E2732", color: "#F1F5F9" }}>
                <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
              </button>
            </>
          )}
          <button onClick={() => setShowAddForm(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-semibold text-white" style={{ backgroundColor: "#FF6B2B" }}>
            <Plus className="w-3.5 h-3.5" /> Yeni Hakediş Hazırla
          </button>
        </div>
      </div>

      {/* Project title */}
      <div>
        <h2 className="text-lg font-bold" style={{ color: "#F1F5F9" }}>{project?.name}</h2>
        <p className="text-[13px]" style={{ color: "#64748B" }}>{project?.client}</p>
      </div>

      {/* SECTION 1: Financial Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Sözleşme Tutarı", value: contract > 0 ? fmt(contract) : "—", color: "#64748B" },
          { label: "Toplam Hakediş", value: fmt(totalAmount), color: "#F1F5F9" },
          { label: "Tahsil Edilen", value: fmt(collected), color: "#22C55E" },
          { label: pending > 0 ? "Bekleyen" : "Gecikmiş", value: fmt(pending + overdueItems.reduce((s, h) => s + h.net, 0)), color: overdueItems.length > 0 ? "#EF4444" : "#F59E0B" },
        ].map(s => (
          <div key={s.label} className="rounded-xl p-4" style={{ backgroundColor: "#161C23", border: "1px solid #1E2732" }}>
            <p className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: "#64748B" }}>{s.label}</p>
            <p className="text-xl font-bold" style={{ color: s.color, fontFamily: "'Space Grotesk', sans-serif" }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      {contract > 0 && (
        <div className="rounded-xl p-4" style={{ backgroundColor: "#161C23", border: "1px solid #1E2732" }}>
          <p className="text-[13px] font-semibold mb-3" style={{ color: "#F1F5F9" }}>Sözleşme Kullanım Durumu</p>
          <div className="h-3 rounded-full mb-2" style={{ backgroundColor: "#1E2732" }}>
            <div className="h-full rounded-full transition-all" style={{ backgroundColor: pct > 90 ? "#EF4444" : "#FF6B2B", width: `${Math.min(100, pct)}%` }} />
          </div>
          <div className="flex justify-between text-[12px]">
            <span style={{ color: "#94A3B8" }}>Kullanılan: {fmt(totalAmount)}</span>
            <span className="font-semibold" style={{ color: "#FF6B2B" }}>%{pct}</span>
            <span style={{ color: "#94A3B8" }}>Kalan: {fmt(remaining)}</span>
          </div>
          <p className="text-[10px] mt-1" style={{ color: "#475569" }}>Toplam sözleşme: {fmt(contract)} + KDV</p>
        </div>
      )}

      {/* SECTION 2: AI Analysis */}
      <div className="rounded-xl p-4" style={{ backgroundColor: "#161C23", border: "1px solid rgba(255,107,43,0.3)" }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4" style={{ color: "#FF6B2B" }} />
            <p className="text-[13px] font-semibold" style={{ color: "#F1F5F9" }}>AI Proje Analizi</p>
          </div>
          <button onClick={generateAIAnalysis} disabled={aiLoading} className="flex items-center gap-1 text-[11px] font-medium" style={{ color: "#FF6B2B" }}>
            <RefreshCw className={`w-3 h-3 ${aiLoading ? "animate-spin" : ""}`} /> Yenile
          </button>
        </div>
        {aiLoading ? (
          <div className="py-4 text-center text-[12px]" style={{ color: "#64748B" }}>Analiz oluşturuluyor...</div>
        ) : aiAnalysis ? (
          <div className="space-y-2">
            {aiAnalysis.map((a, i) => (
              <p key={i} className="text-[12px] leading-relaxed" style={{ color: "#94A3B8" }}>{a}</p>
            ))}
          </div>
        ) : (
          <p className="text-[12px]" style={{ color: "#64748B" }}>Henüz analiz oluşturulmadı.</p>
        )}
        <p className="text-[10px] mt-3" style={{ color: "#475569" }}>⚠️ AI yorumu referans amaçlıdır. Kesin karar için hakediş belgelerini kontrol ediniz.</p>
      </div>

      {/* SECTION 3: Monthly Cash Flow Chart */}
      {chartData.length > 0 && (
        <div className="rounded-xl p-4" style={{ backgroundColor: "#161C23", border: "1px solid #1E2732" }}>
          <div className="flex items-center justify-between mb-4">
            <p className="text-[13px] font-semibold" style={{ color: "#F1F5F9" }}>Aylık Nakit Akışı</p>
            <div className="flex gap-1">
              {(["6", "12", "all"] as const).map(r => (
                <button key={r} onClick={() => setChartRange(r)} className="text-[10px] px-2 py-1 rounded-md font-medium" style={{ backgroundColor: chartRange === r ? "#FF6B2B" : "#1E2732", color: chartRange === r ? "#fff" : "#64748B" }}>
                  {r === "6" ? "6 Ay" : r === "12" ? "12 Ay" : "Tümü"}
                </button>
              ))}
            </div>
          </div>
          <div className="h-[220px] overflow-x-auto">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData}>
                <XAxis dataKey="name" tick={{ fill: "#64748B", fontSize: 10 }} />
                <YAxis tick={{ fill: "#64748B", fontSize: 10 }} tickFormatter={v => fmtShort(v)} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#1C242D", border: "1px solid #2D3748", borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: "#F1F5F9" }}
                  formatter={(v: number, name: string) => [fmt(v), name === "hakedis" ? "Hakediş" : name === "tahsil" ? "Tahsilat" : "Gecikmiş"]}
                />
                <Legend formatter={v => v === "hakedis" ? "Hakediş" : v === "tahsil" ? "Tahsilat" : "Gecikmiş"} />
                <Bar dataKey="hakedis" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="tahsil" fill="#22C55E" radius={[4, 4, 0, 0]} />
                <Line type="monotone" dataKey="gecikme" stroke="#EF4444" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-3 gap-3 mt-3 pt-3" style={{ borderTop: "1px solid #1E2732" }}>
            <div>
              <p className="text-[10px]" style={{ color: "#64748B" }}>Ort. Aylık Hakediş</p>
              <p className="text-[13px] font-semibold" style={{ color: "#F1F5F9" }}>{fmt(avgMonthly)}</p>
            </div>
            <div>
              <p className="text-[10px]" style={{ color: "#64748B" }}>En Yüksek Ay</p>
              <p className="text-[13px] font-semibold" style={{ color: "#F1F5F9" }}>{maxMonth ? `${maxMonth.name} — ${fmt(maxMonth.hakedis)}` : "—"}</p>
            </div>
            <div>
              <p className="text-[10px]" style={{ color: "#64748B" }}>Tahsilat Oranı</p>
              <p className="text-[13px] font-semibold" style={{ color: collectionRate > 70 ? "#22C55E" : "#F59E0B" }}>%{collectionRate}</p>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 4: Timeline */}
      <div className="rounded-xl p-4" style={{ backgroundColor: "#161C23", border: "1px solid #1E2732" }}>
        <p className="text-[13px] font-semibold mb-4" style={{ color: "#F1F5F9" }}>Hakediş Geçmişi</p>

        {loading ? (
          <div className="py-4 text-center text-[12px]" style={{ color: "#64748B" }}>Yükleniyor...</div>
        ) : hakedisler.length === 0 ? (
          <div className="py-4 text-center text-[12px]" style={{ color: "#64748B" }}>Bu projeye ait hakediş yok.</div>
        ) : (
          <div className="space-y-0">
            {[...hakedisler].reverse().map((h, i) => {
              const createdDate = new Date(h.created_at);
              const isOverdue = h.status === "Bekliyor" && (now - createdDate.getTime()) > 30 * 24 * 60 * 60 * 1000;
              const overdueDays = isOverdue ? Math.round((now - createdDate.getTime()) / (1000 * 60 * 60 * 24)) : 0;
              const borderColor = isOverdue ? "#EF4444" : statusBorder(h.status);

              return (
                <div key={h.id} className="flex gap-3">
                  {/* Timeline line */}
                  <div className="flex flex-col items-center">
                    <div className="w-3 h-3 rounded-full shrink-0 mt-1" style={{ backgroundColor: borderColor }} />
                    {i < hakedisler.length - 1 && <div className="w-0.5 flex-1 my-1" style={{ backgroundColor: "#1E2732" }} />}
                  </div>

                  {/* Card */}
                  <div className="flex-1 mb-4 rounded-lg p-3" style={{ backgroundColor: "#0F1419", borderLeft: `3px solid ${borderColor}`, border: "1px solid #1E2732" }}>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-[13px] font-semibold" style={{ color: "#F1F5F9" }}>Hakediş #{hakedisler.length - i}</p>
                        <p className="text-[11px] mt-0.5" style={{ color: "#64748B" }}>Düzenleme: {createdDate.toLocaleDateString("tr-TR")}</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {/* Status dropdown */}
                        <div className="relative">
                          <button
                            onClick={() => setStatusMenuId(statusMenuId === h.id ? null : h.id)}
                            className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md"
                            style={{ backgroundColor: `${h.status_color}15`, color: h.status_color }}
                          >
                            {statusIcon(h.status)}
                            {h.status}
                            {isOverdue && <span className="ml-1">({overdueDays}g)</span>}
                            <ChevronDown className="w-3 h-3" />
                          </button>
                          {statusMenuId === h.id && (
                            <div className="absolute z-50 top-full right-0 mt-1 rounded-lg py-1 shadow-xl min-w-[140px]" style={{ backgroundColor: "#1C242D", border: "1px solid #2D3748" }}>
                              {STATUS_OPTIONS.map(opt => (
                                <button key={opt.label} onClick={() => { updateHakedisStatus(h.id, opt.label, opt.color); setStatusMenuId(null); }}
                                  className="w-full text-left px-3 py-1.5 text-[11px] hover:bg-white/5 flex items-center gap-2" style={{ color: opt.color }}>
                                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: opt.color }} /> {opt.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                      <div>
                        <p className="text-[10px]" style={{ color: "#64748B" }}>Tutar</p>
                        <p className="text-[12px] font-mono font-semibold" style={{ color: "#F1F5F9" }}>{fmt(h.amount)}</p>
                      </div>
                      <div>
                        <p className="text-[10px]" style={{ color: "#64748B" }}>KDV</p>
                        <p className="text-[12px] font-mono" style={{ color: "#94A3B8" }}>{fmt(h.kdv)}</p>
                      </div>
                      <div>
                        <p className="text-[10px]" style={{ color: "#64748B" }}>Net</p>
                        <p className="text-[12px] font-mono font-semibold" style={{ color: "#F1F5F9" }}>{fmt(h.net)}</p>
                      </div>
                    </div>

                    {h.payment_date && (
                      <p className="text-[11px] mt-1.5" style={{ color: "#22C55E" }}>
                        ✅ Ödeme: {new Date(h.payment_date).toLocaleDateString("tr-TR")}
                        {h.status === "Ödendi" && ` — Bekleme: ${Math.round((new Date(h.payment_date).getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24))} gün`}
                      </p>
                    )}

                    <div className="flex items-center gap-2 mt-2 pt-2" style={{ borderTop: "1px solid #1E2732" }}>
                      <button onClick={() => exportHakedisPDF([h], project?.name || "Proje")} className="text-[10px] font-medium flex items-center gap-1" style={{ color: "#94A3B8" }}>
                        <FileDown className="w-3 h-3" /> PDF
                      </button>
                      <button onClick={() => { if (confirm("Bu hakediş silinsin mi?")) deleteHakedis(h.id); }} className="text-[10px] font-medium flex items-center gap-1 ml-auto" style={{ color: "#EF4444" }}>
                        <Trash2 className="w-3 h-3" /> Sil
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <button onClick={() => setShowAddForm(true)} className="w-full py-2.5 rounded-lg text-[12px] font-semibold text-white mt-2" style={{ backgroundColor: "#FF6B2B" }}>
          + Yeni Hakediş Hazırla
        </button>
      </div>

      {/* SECTION 5: Overdue Payments */}
      {overdueItems.length > 0 && (
        <div className="rounded-xl p-4" style={{ backgroundColor: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.3)" }}>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4" style={{ color: "#EF4444" }} />
            <p className="text-[13px] font-semibold" style={{ color: "#EF4444" }}>Gecikmiş Ödeme Tespit Edildi</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr>
                  {["Hakediş", "Tutar", "Düzenleme", "Gecikme", "Yasal Faiz"].map(h => (
                    <th key={h} className="text-left px-3 py-2 font-semibold uppercase tracking-wide" style={{ color: "#94A3B8", fontSize: 10, borderBottom: "1px solid rgba(239,68,68,0.2)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {overdueItems.map((h, i) => {
                  const days = Math.round((now - new Date(h.created_at).getTime()) / (1000 * 60 * 60 * 24));
                  const interest = Math.round(h.net * DAILY_RATE * days);
                  return (
                    <tr key={h.id}>
                      <td className="px-3 py-2 font-mono" style={{ color: "#F1F5F9" }}>#{hakedisler.indexOf(h) + 1}</td>
                      <td className="px-3 py-2 font-mono" style={{ color: "#F1F5F9" }}>{fmt(h.net)}</td>
                      <td className="px-3 py-2" style={{ color: "#94A3B8" }}>{new Date(h.created_at).toLocaleDateString("tr-TR")}</td>
                      <td className="px-3 py-2 font-semibold" style={{ color: "#EF4444" }}>{days} gün</td>
                      <td className="px-3 py-2 font-mono font-semibold" style={{ color: "#EF4444" }}>{fmt(interest)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {overdueItems.map((h) => {
            const days = Math.round((now - new Date(h.created_at).getTime()) / (1000 * 60 * 60 * 24));
            const interest = Math.round(h.net * DAILY_RATE * days);
            return (
              <p key={h.id} className="text-[11px] mt-2" style={{ color: "#94A3B8" }}>
                Formül: {fmt(h.net)} × %{(DAILY_RATE * 100).toFixed(3)} × {days} gün = {fmt(interest)} yasal faiz hakkı
              </p>
            );
          })}

          <p className="text-[10px] mt-3" style={{ color: "#475569" }}>
            Bu hesaplama 3095 sayılı Kanun kapsamında yasal faiz hakkını göstermektedir. Hukuki süreç için avukat danışınız.
          </p>
        </div>
      )}

      {/* Add form modal */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setShowAddForm(false)}>
          <div className="rounded-xl p-5 w-full max-w-md space-y-4" style={{ backgroundColor: "#161C23", border: "1px solid #1E2732" }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-[15px] font-semibold" style={{ color: "#F1F5F9" }}>Yeni Hakediş Ekle</h3>
              <button onClick={() => setShowAddForm(false)} className="text-gray-400 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            <div>
              <label className="text-[11px] font-semibold mb-1 block" style={{ color: "#94A3B8" }}>Dönem</label>
              <input value={formPeriod} onChange={e => setFormPeriod(e.target.value)} placeholder="ör: Ocak 2026"
                className="w-full rounded-lg px-3 py-2 text-[13px] outline-none" style={{ backgroundColor: "#0F1419", color: "#F1F5F9", border: "1px solid #1E2732" }} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold mb-1 block" style={{ color: "#94A3B8" }}>Tutar (₺)</label>
                <input type="number" value={formAmount} onChange={e => setFormAmount(e.target.value)} placeholder="850000"
                  className="w-full rounded-lg px-3 py-2 text-[13px] outline-none" style={{ backgroundColor: "#0F1419", color: "#F1F5F9", border: "1px solid #1E2732" }} />
              </div>
              <div>
                <label className="text-[11px] font-semibold mb-1 block" style={{ color: "#94A3B8" }}>KDV Oranı (%)</label>
                <input type="number" value={formKdvRate} onChange={e => setFormKdvRate(e.target.value)}
                  className="w-full rounded-lg px-3 py-2 text-[13px] outline-none" style={{ backgroundColor: "#0F1419", color: "#F1F5F9", border: "1px solid #1E2732" }} />
              </div>
            </div>
            <button onClick={handleAdd} disabled={!formPeriod || !formAmount}
              className="w-full py-2.5 rounded-lg text-[13px] font-semibold text-white disabled:opacity-40" style={{ backgroundColor: "#FF6B2B" }}>
              Hakediş Ekle
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DesktopHakedisPage;
