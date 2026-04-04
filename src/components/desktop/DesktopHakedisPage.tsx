import { useState, useMemo, useCallback } from "react";
import DeleteConfirmModal from "@/components/DeleteConfirmModal";
import { ArrowLeft, Plus, FileDown, FileSpreadsheet, Trash2, ChevronDown, X, RefreshCw, Bot, TrendingUp, AlertTriangle, CheckCircle, Clock, FileText, Edit3, Bell, Send } from "lucide-react";
import { useProjects } from "@/hooks/useProjects";
import { useAllHakedis, useProjectHakedis, ProjectHakedis } from "@/hooks/useProjectHakedis";
import { exportHakedisPDF, exportHakedisExcel, type PDFSignatureInfo, type PDFOptions, type HakedisWorkItem } from "@/lib/hakedisExport";
import { getCompanyProfile, isCompanyProfileComplete } from "@/lib/companyProfile";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, Line, ComposedChart } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import HakedisItemsSection from "./HakedisItemsSection";

const STATUS_OPTIONS = [
  { label: "Taslak", color: "#64748B", emoji: "📝" },
  { label: "Gönderildi", color: "#3B82F6", emoji: "📤" },
  { label: "Bekliyor", color: "#F59E0B", emoji: "⏳" },
  { label: "Onaylandı", color: "#22C55E", emoji: "✅" },
  { label: "Reddedildi", color: "#EF4444", emoji: "❌" },
  { label: "Ödendi", color: "#10B981", emoji: "✅" },
];

const fmt = (n: number) => n.toLocaleString("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 });
const fmtShort = (n: number) => {
  if (n >= 1_000_000) return `₺${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `₺${Math.round(n / 1_000)}K`;
  return `₺${Math.round(n)}`;
};

const LEGAL_INTEREST_RATE = 0.48;
const DAILY_RATE = LEGAL_INTEREST_RATE / 365;

const fireConfetti = () => {
  const colors = ["#FF6B2B", "#FFFFFF", "#FFD700"];
  confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, colors });
  setTimeout(() => confetti({ particleCount: 50, spread: 100, origin: { y: 0.5 }, colors }), 200);
};

// Compute enriched status
const getEnrichedStatus = (h: ProjectHakedis) => {
  const now = Date.now();
  if (h.status === "Ödendi") return { label: "Ödendi ✅", color: "#10B981", emoji: "✅", sortOrder: 5 };
  if (h.status === "Taslak") return { label: "Taslak", color: "#64748B", emoji: "📝", sortOrder: 4 };
  if (h.status === "Reddedildi") return { label: "Reddedildi", color: "#EF4444", emoji: "❌", sortOrder: 3 };

  // Check overdue
  const created = new Date(h.created_at).getTime();
  const daysSinceCreated = Math.round((now - created) / (1000 * 60 * 60 * 24));
  const expectedDate = h.expected_payment_date ? new Date(h.expected_payment_date).getTime() : null;
  const daysOverdue = expectedDate ? Math.round((now - expectedDate) / (1000 * 60 * 60 * 24)) : daysSinceCreated;
  const isOverdue = expectedDate ? now > expectedDate : daysSinceCreated > 30;

  if (isOverdue && daysOverdue > 0) {
    return { label: `Gecikmiş — ${daysOverdue} gündür ödenmedi`, color: "#EF4444", emoji: "⚠️", sortOrder: 0, overdueDays: daysOverdue };
  }

  if (h.status === "Gönderildi") {
    const daysWaiting = expectedDate ? Math.max(0, Math.round((expectedDate - now) / (1000 * 60 * 60 * 24))) : daysSinceCreated;
    return { label: `Gönderildi — ${daysSinceCreated} gün`, color: "#3B82F6", emoji: "📤", sortOrder: 2, daysWaiting };
  }

  return { label: `Ödeme Bekleniyor — ${daysSinceCreated} gün`, color: "#F59E0B", emoji: "⏳", sortOrder: 1, daysWaiting: daysSinceCreated };
};

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
const ProjectListView = ({ projects, allHakedisler, onSelectProject }: { projects: any[]; allHakedisler: any[]; onSelectProject: (id: string) => void }) => {
  const projectCards = useMemo(() => {
    return projects.map(p => {
      const hakedisler = allHakedisler.filter(h => h.project_id === p.id);
      const contract = Number(p.contract_amount) || 0;
      const totalHakedis = hakedisler.reduce((s: number, h: any) => s + h.amount, 0);
      const remaining = contract - totalHakedis;
      const pct = contract > 0 ? Math.min(100, Math.round((totalHakedis / contract) * 100)) : 0;
      const collected = hakedisler.filter((h: any) => h.status === "Ödendi").reduce((s: number, h: any) => s + h.net, 0);
      const pending = hakedisler.filter((h: any) => ["Bekliyor", "Onaylandı", "Gönderildi"].includes(h.status)).reduce((s: number, h: any) => s + h.net, 0);

      const now = Date.now();
      const overdueItems = hakedisler.filter((h: any) => {
        if (h.status === "Ödendi" || h.status === "Taslak" || h.status === "Reddedildi") return false;
        if (h.expected_payment_date) return now > new Date(h.expected_payment_date).getTime();
        return (now - new Date(h.created_at).getTime()) > 30 * 24 * 60 * 60 * 1000;
      });
      const overdueAmount = overdueItems.reduce((s: number, h: any) => s + h.net, 0);
      const maxOverdueDays = overdueItems.length > 0
        ? Math.max(...overdueItems.map((h: any) => {
          if (h.expected_payment_date) return Math.round((now - new Date(h.expected_payment_date).getTime()) / (1000 * 60 * 60 * 24));
          return Math.round((now - new Date(h.created_at).getTime()) / (1000 * 60 * 60 * 24));
        }))
        : 0;

      return { ...p, hakedisler, contract, totalHakedis, remaining, pct, collected, pending, overdueAmount, maxOverdueDays };
    });
  }, [projects, allHakedisler]);

  if (projects.length === 0) {
    return (
      <div className="p-3 sm:p-4 md:p-6 max-w-[1200px] mx-auto">
        <h2 className="text-base md:text-lg font-bold mb-4 text-foreground">Hakediş Yönetimi</h2>
        <div className="rounded-xl p-8 text-center bg-card border border-border">
          <p style={{ color: "#64748B" }}>Henüz proje eklenmedi. Önce Proje Yönetimi'nden proje ekleyin.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 md:p-6 max-w-[1200px] mx-auto space-y-4">
      <h2 className="text-base md:text-lg font-bold text-foreground">Hakediş Yönetimi</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {projectCards.map(p => (
          <div key={p.id} className="rounded-xl overflow-hidden relative bg-card border border-border">
            {p.maxOverdueDays > 0 && (
              <div className="px-4 py-1.5 text-[11px] font-medium flex items-center gap-1.5" style={{ backgroundColor: "rgba(239,68,68,0.15)", color: "#EF4444" }}>
                <AlertTriangle className="w-3 h-3" /> {p.maxOverdueDays} gündür ödeme bekliyor
              </div>
            )}
            <div className="p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-semibold truncate text-foreground">{p.name}</p>
                  <p className="text-[12px] mt-0.5" style={{ color: "#64748B" }}>{p.client}</p>
                </div>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-md shrink-0 ml-2" style={{ backgroundColor: `${p.status_color}15`, color: p.status_color }}>
                  {p.status}
                </span>
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between text-[12px]">
                  <span style={{ color: "#64748B" }}>Sözleşme Tutarı:</span>
                  <span style={{ color: "#64748B" }}>{p.contract > 0 ? fmt(p.contract) : "Belirtilmedi"}</span>
                </div>
                <div className="flex justify-between text-[12px]">
                  <span style={{ color: "#94A3B8" }}>Toplam Hakediş:</span>
                  <span className="font-semibold text-foreground">{fmt(p.totalHakedis)}</span>
                </div>
                {p.contract > 0 && (
                  <div className="flex justify-between text-[12px]">
                    <span style={{ color: "#94A3B8" }}>Kalan:</span>
                    <span className="font-semibold" style={{ color: p.remaining >= 0 ? "#22C55E" : "#EF4444" }}>{fmt(p.remaining)}</span>
                  </div>
                )}
              </div>
              {p.contract > 0 && (
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 rounded-full" style={{ backgroundColor: "#1E2732" }}>
                    <div className="h-full rounded-full transition-all" style={{ backgroundColor: p.pct > 90 ? "#EF4444" : "#FF6B2B", width: `${Math.min(100, p.pct)}%` }} />
                  </div>
                  <span className="text-[11px] font-mono font-semibold" style={{ color: "#94A3B8" }}>%{p.pct}</span>
                </div>
              )}
              <div className="grid grid-cols-3 gap-2 pt-1" style={{ borderTop: "1px solid #1E2732" }}>
                <div><p className="text-[10px]" style={{ color: "#64748B" }}>✅ Tahsil</p><p className="text-[12px] font-semibold" style={{ color: "#22C55E" }}>{fmtShort(p.collected)}</p></div>
                <div><p className="text-[10px]" style={{ color: "#64748B" }}>⏳ Bekleyen</p><p className="text-[12px] font-semibold" style={{ color: "#F59E0B" }}>{fmtShort(p.pending)}</p></div>
                <div><p className="text-[10px]" style={{ color: "#64748B" }}>⚠️ Gecikmiş</p><p className="text-[12px] font-semibold" style={{ color: p.overdueAmount > 0 ? "#EF4444" : "#64748B" }}>{fmtShort(p.overdueAmount)}</p></div>
              </div>
              <button onClick={() => onSelectProject(p.id)} className="w-full py-2 rounded-lg text-[12px] font-semibold transition-colors" style={{ backgroundColor: "#1E2732", color: "#FF6B2B" }}>
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
const ProjectDetailView = ({ projectId, projects, onBack }: { projectId: string; projects: any[]; allHakedisler: any[]; onBack: () => void }) => {
  const project = projects.find((p: any) => p.id === projectId);
  const { hakedisler, loading, addHakedis, deleteHakedis, updateHakedisStatus, setExpectedPaymentDate } = useProjectHakedis(projectId);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formPeriod, setFormPeriod] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formKdvRate, setFormKdvRate] = useState("20");
  const [statusMenuId, setStatusMenuId] = useState<string | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<string[] | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [chartRange, setChartRange] = useState<"6" | "12" | "all">("12");
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [pdfSig, setPdfSig] = useState<PDFSignatureInfo>(() => {
    try { return JSON.parse(localStorage.getItem("santiyem_pdf_sig") || "{}"); } catch { return {}; }
  });
  const [pdfIncludeHeader, setPdfIncludeHeader] = useState(true);
  const [pdfIncludeSignature, setPdfIncludeSignature] = useState(true);
  const [pdfIncludeWarning, setPdfIncludeWarning] = useState(true);
  const [pdfProgress, setPdfProgress] = useState<number | null>(null);

  // Payment reminder modal
  const [reminderModal, setReminderModal] = useState<{ open: boolean; hakedisId: string; hakedisNet: number } | null>(null);
  const [reminderDate, setReminderDate] = useState("");
  const [reminderDays, setReminderDays] = useState("3");

  // Payment confirmation modal
  const [paymentModal, setPaymentModal] = useState<{ open: boolean; hakedisId: string; hakedisNet: number; hakedisNum: number } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string; type: string } | null>(null);

  const contract = Number(project?.contract_amount) || 0;
  const totalAmount = hakedisler.reduce((s, h) => s + h.amount, 0);
  const totalNet = hakedisler.reduce((s, h) => s + h.net, 0);
  const collected = hakedisler.filter(h => h.status === "Ödendi").reduce((s, h) => s + h.net, 0);
  const pending = hakedisler.filter(h => ["Bekliyor", "Onaylandı", "Gönderildi"].includes(h.status)).reduce((s, h) => s + h.net, 0);
  const remaining = contract - totalAmount;
  const pct = contract > 0 ? Math.min(100, Math.round((totalAmount / contract) * 100)) : 0;

  const now = Date.now();
  const overdueItems = hakedisler.filter(h => {
    if (h.status === "Ödendi" || h.status === "Taslak" || h.status === "Reddedildi") return false;
    if (h.expected_payment_date) return now > new Date(h.expected_payment_date).getTime();
    return (now - new Date(h.created_at).getTime()) > 30 * 24 * 60 * 60 * 1000;
  });

  // Sort hakedisler: overdue first
  const sortedHakedisler = useMemo(() => {
    return [...hakedisler].sort((a, b) => {
      const sa = getEnrichedStatus(a);
      const sb = getEnrichedStatus(b);
      return sa.sortOrder - sb.sortOrder;
    });
  }, [hakedisler]);

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
      const es = getEnrichedStatus(h);
      if ((es as any).overdueDays) months[key].gecikme += h.net;
    });
    let data = Object.entries(months).sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => v);
    if (chartRange === "6") data = data.slice(-6);
    else if (chartRange === "12") data = data.slice(-12);
    return data;
  }, [hakedisler, chartRange]);

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

  const handleStatusChange = (hakedisId: string, label: string, color: string) => {
    updateHakedisStatus(hakedisId, label, color);
    setStatusMenuId(null);
    // Show reminder modal when status changes to "Gönderildi"
    if (label === "Gönderildi") {
      const h = hakedisler.find(x => x.id === hakedisId);
      if (h) {
        setReminderModal({ open: true, hakedisId, hakedisNet: h.net });
        setReminderDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
      }
    }
  };

  const handlePaymentConfirm = (id: string) => {
    updateHakedisStatus(id, "Ödendi", "#10B981");
    setPaymentModal(null);
    fireConfetti();
    const h = hakedisler.find(x => x.id === id);
    toast.success(`${h ? fmt(h.net) : ""} tahsil edildi! Tebrikler! 🎉`);
  };

  const handleReminderSave = () => {
    if (!reminderModal || !reminderDate) return;
    setExpectedPaymentDate(reminderModal.hakedisId, reminderDate, parseInt(reminderDays));
    setReminderModal(null);
  };

  const generateAIAnalysis = async () => {
    setAiLoading(true);
    try {
      const analysisPrompts: string[] = [];
      if (hakedisler.length >= 2) {
        const prev = hakedisler[hakedisler.length - 2];
        const curr = hakedisler[hakedisler.length - 1];
        const change = prev.amount > 0 ? ((curr.amount - prev.amount) / prev.amount) * 100 : 0;
        if (change > 30) {
          analysisPrompts.push(`⚠️ ${curr.period} döneminde önceki döneme göre %${Math.round(change)} artış tespit edildi.`);
        } else {
          analysisPrompts.push("✅ Hakediş kalemleri arasında anormal artış tespit edilmedi.");
        }
      } else {
        analysisPrompts.push("✅ Hakediş kalemleri arasında anormal artış tespit edilmedi.");
      }
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
          analysisPrompts.push(`📊 Mevcut harcama hızıyla bütçe ${budgetEndDate.toLocaleDateString("tr-TR", { month: "long", year: "numeric" })}'te dolacak. ${monthsBefore} ay önce bütçe tükenebilir.`);
        } else {
          analysisPrompts.push("✅ Bütçe proje bitiş tarihine kadar yeterli.");
        }
      }
      setAiAnalysis(analysisPrompts);
    } catch { toast.error("AI analizi oluşturulamadı"); }
    finally { setAiLoading(false); }
  };

  useMemo(() => {
    if (hakedisler.length > 0 && !aiAnalysis && !aiLoading) generateAIAnalysis();
  }, [hakedisler.length]);

  return (
    <div className="p-3 sm:p-4 md:p-6 max-w-[1200px] mx-auto space-y-4 md:space-y-5">
      <DeleteConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => { if (deleteTarget) deleteHakedis(deleteTarget.id); }}
        title={`${deleteTarget?.type || "Hakedişi"} Sil`}
        itemName={deleteTarget?.name}
      />
      {/* Top bar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <button onClick={onBack} className="flex items-center gap-1.5 text-[13px] font-medium" style={{ color: "#94A3B8" }}>
          <ArrowLeft className="w-4 h-4" /> Hakediş Yönetimi
        </button>
        <div className="flex items-center gap-2">
          {hakedisler.length > 0 && (
            <>
              <button onClick={() => setShowPdfModal(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-semibold" style={{ backgroundColor: "#1E2732" }}>
                <FileDown className="w-3.5 h-3.5" /> PDF
              </button>
              <button
                onClick={async () => {
                  try {
                    const allIds = hakedisler.map(h => h.id);
                    const { data: allItems } = await supabase.from("hakedis_items").select("*").in("hakedis_id", allIds).order("sort_order");
                    const wi: HakedisWorkItem[] = (allItems || []).map((i: any) => ({
                      description: i.description, unit: i.unit, quantity: Number(i.quantity),
                      unit_price: Number(i.unit_price), total_price: Number(i.total_price),
                    }));
                    exportHakedisExcel(hakedisler, project?.name || "Proje", wi.length > 0 ? wi : undefined, project?.client);
                    toast.success("✅ Excel indirildi");
                  } catch { toast.error("Excel oluşturulamadı. Sayfayı yenileyip tekrar deneyin."); }
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-semibold"
                style={{ backgroundColor: "rgba(34,197,94,0.15)", color: "#22C55E" }}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
              </button>
            </>
          )}
          <button onClick={() => setShowAddForm(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-semibold text-white" style={{ backgroundColor: "#FF6B2B" }}>
            <Plus className="w-3.5 h-3.5" /> Yeni Hakediş Hazırla
          </button>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-bold text-foreground">{project?.name}</h2>
        <p className="text-[13px]" style={{ color: "#64748B" }}>{project?.client}</p>
      </div>

      {/* Financial Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Sözleşme Tutarı", value: contract > 0 ? fmt(contract) : "—", color: "#64748B" },
          { label: "Toplam Hakediş", value: fmt(totalAmount) },
          { label: "Tahsil Edilen", value: fmt(collected), color: "#22C55E" },
          { label: pending > 0 ? "Bekleyen" : "Gecikmiş", value: fmt(pending + overdueItems.reduce((s, h) => s + h.net, 0)), color: overdueItems.length > 0 ? "#EF4444" : "#F59E0B" },
        ].map(s => (
          <div key={s.label} className="rounded-xl p-4 bg-card border border-border">
            <p className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: "#64748B" }}>{s.label}</p>
            <p className="text-xl font-bold" style={{ color: s.color, fontFamily: "'Space Grotesk', sans-serif" }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      {contract > 0 && (
        <div className="rounded-xl p-4 bg-card border border-border">
          <p className="text-[13px] font-semibold mb-3 text-foreground">Sözleşme Kullanım Durumu</p>
          <div className="h-3 rounded-full mb-2" style={{ backgroundColor: "#1E2732" }}>
            <div className="h-full rounded-full transition-all" style={{ backgroundColor: pct > 90 ? "#EF4444" : "#FF6B2B", width: `${Math.min(100, pct)}%` }} />
          </div>
          <div className="flex justify-between text-[12px]">
            <span style={{ color: "#94A3B8" }}>Kullanılan: {fmt(totalAmount)}</span>
            <span className="font-semibold" style={{ color: "#FF6B2B" }}>%{pct}</span>
            <span style={{ color: "#94A3B8" }}>Kalan: {fmt(remaining)}</span>
          </div>
        </div>
      )}

      {/* AI Analysis */}
      <div className="rounded-xl p-4" style={{ border: "1px solid rgba(255,107,43,0.3)" }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4" style={{ color: "#FF6B2B" }} />
            <p className="text-[13px] font-semibold text-foreground">AI Proje Analizi</p>
          </div>
          <button onClick={generateAIAnalysis} disabled={aiLoading} className="flex items-center gap-1 text-[11px] font-medium" style={{ color: "#FF6B2B" }}>
            <RefreshCw className={`w-3 h-3 ${aiLoading ? "animate-spin" : ""}`} /> Yenile
          </button>
        </div>
        {aiLoading ? (
          <div className="py-4 text-center text-[12px]" style={{ color: "#64748B" }}>Analiz oluşturuluyor...</div>
        ) : aiAnalysis ? (
          <div className="space-y-2">
            {aiAnalysis.map((a, i) => <p key={i} className="text-[12px] leading-relaxed" style={{ color: "#94A3B8" }}>{a}</p>)}
          </div>
        ) : (
          <p className="text-[12px]" style={{ color: "#64748B" }}>Henüz analiz oluşturulmadı.</p>
        )}
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="rounded-xl p-4 bg-card border border-border">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[13px] font-semibold text-foreground">Aylık Nakit Akışı</p>
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
                <Tooltip contentStyle={{ backgroundColor: "#1C242D", border: "1px solid #2D3748", borderRadius: 8, fontSize: 12 }} labelStyle={{  }} formatter={(v: number, name: string) => [fmt(v), name === "hakedis" ? "Hakediş" : name === "tahsil" ? "Tahsilat" : "Gecikmiş"]} />
                <Legend formatter={v => v === "hakedis" ? "Hakediş" : v === "tahsil" ? "Tahsilat" : "Gecikmiş"} />
                <Bar dataKey="hakedis" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="tahsil" fill="#22C55E" radius={[4, 4, 0, 0]} />
                <Line type="monotone" dataKey="gecikme" stroke="#EF4444" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-3 gap-3 mt-3 pt-3" style={{ borderTop: "1px solid #1E2732" }}>
            <div><p className="text-[10px]" style={{ color: "#64748B" }}>Ort. Aylık Hakediş</p><p className="text-[13px] font-semibold text-foreground">{fmt(avgMonthly)}</p></div>
            <div><p className="text-[10px]" style={{ color: "#64748B" }}>En Yüksek Ay</p><p className="text-[13px] font-semibold text-foreground">{maxMonth ? `${maxMonth.name} — ${fmt(maxMonth.hakedis)}` : "—"}</p></div>
            <div><p className="text-[10px]" style={{ color: "#64748B" }}>Tahsilat Oranı</p><p className="text-[13px] font-semibold" style={{ color: collectionRate > 70 ? "#22C55E" : "#F59E0B" }}>%{collectionRate}</p></div>
          </div>
        </div>
      )}

      {/* Hakedis Timeline - sorted with overdue first */}
      <div className="rounded-xl p-4 bg-card border border-border">
        <p className="text-[13px] font-semibold mb-4 text-foreground">Hakediş Geçmişi</p>
        {loading ? (
          <div className="py-4 text-center text-[12px]" style={{ color: "#64748B" }}>Yükleniyor...</div>
        ) : hakedisler.length === 0 ? (
          <div className="py-4 text-center text-[12px]" style={{ color: "#64748B" }}>Bu projeye ait hakediş yok.</div>
        ) : (
          <div className="space-y-0">
            {sortedHakedisler.map((h, i) => {
              const enriched = getEnrichedStatus(h);
              const createdDate = new Date(h.created_at);
              const hakedisNum = hakedisler.indexOf(h) + 1;

              return (
                <div key={h.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="w-3 h-3 rounded-full shrink-0 mt-1" style={{ backgroundColor: enriched.color }} />
                    {i < hakedisler.length - 1 && <div className="w-0.5 flex-1 my-1" style={{ backgroundColor: "#1E2732" }} />}
                  </div>
                  <div className="flex-1 mb-4 rounded-lg p-3" style={{ borderLeft: `3px solid ${enriched.color}` }}>
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-[13px] font-semibold text-foreground">Hakediş #{hakedisNum}</p>
                          {h.expected_payment_date && <Bell className="w-3 h-3" style={{ color: "#F59E0B" }} />}
                        </div>
                        <p className="text-[11px] mt-0.5" style={{ color: "#64748B" }}>
                          {h.period} • Düzenleme: {createdDate.toLocaleDateString("tr-TR")}
                          {h.expected_payment_date && ` • Beklenen: ${new Date(h.expected_payment_date).toLocaleDateString("tr-TR")}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {/* Payment button for non-paid */}
                        {h.status !== "Ödendi" && h.status !== "Taslak" && h.status !== "Reddedildi" && (
                          <button
                            onClick={() => setPaymentModal({ open: true, hakedisId: h.id, hakedisNet: h.net, hakedisNum })}
                            className="flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-md transition-colors hover:opacity-90"
                            style={{ backgroundColor: "rgba(34,197,94,0.1)", color: "#22C55E" }}
                          >
                            <CheckCircle className="w-3 h-3" /> Ödeme Geldi
                          </button>
                        )}
                        {/* Status dropdown */}
                        <div className="relative">
                          <button onClick={() => setStatusMenuId(statusMenuId === h.id ? null : h.id)}
                            className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md"
                            style={{ backgroundColor: `${enriched.color}15`, color: enriched.color }}>
                            <span>{enriched.emoji}</span>
                            <span className="max-w-[120px] truncate">{enriched.label}</span>
                            <ChevronDown className="w-3 h-3" />
                          </button>
                          {statusMenuId === h.id && (
                            <div className="absolute z-50 top-full right-0 mt-1 rounded-lg py-1 shadow-xl min-w-[140px]" style={{ backgroundColor: "#1C242D", border: "1px solid #2D3748" }}>
                              {STATUS_OPTIONS.map(opt => (
                                <button key={opt.label} onClick={() => handleStatusChange(h.id, opt.label, opt.color)}
                                  className="w-full text-left px-3 py-1.5 text-[11px] hover:bg-white/5 flex items-center gap-2" style={{ color: opt.color }}>
                                  <span>{opt.emoji}</span> {opt.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                      <div><p className="text-[10px]" style={{ color: "#64748B" }}>Tutar</p><p className="text-[12px] font-mono font-semibold text-foreground">{fmt(h.amount)}</p></div>
                      <div><p className="text-[10px]" style={{ color: "#64748B" }}>KDV</p><p className="text-[12px] font-mono" style={{ color: "#94A3B8" }}>{fmt(h.kdv)}</p></div>
                      <div><p className="text-[10px]" style={{ color: "#64748B" }}>Net</p><p className="text-[12px] font-mono font-semibold text-foreground">{fmt(h.net)}</p></div>
                    </div>

                    {h.payment_date && (
                      <p className="text-[11px] mt-1.5" style={{ color: "#22C55E" }}>
                        ✅ Ödeme: {new Date(h.payment_date).toLocaleDateString("tr-TR")}
                        {h.status === "Ödendi" && ` — Bekleme: ${Math.round((new Date(h.payment_date).getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24))} gün`}
                      </p>
                    )}

                    <HakedisItemsSection hakedisId={h.id} />

                    <div className="flex items-center gap-2 mt-2 pt-2" style={{ borderTop: "1px solid #1E2732" }}>
                      <button onClick={async () => {
                        const { data: items } = await supabase.from("hakedis_items").select("*").eq("hakedis_id", h.id).order("sort_order");
                        const wi = (items || []).map((i: any) => ({ description: i.description, unit: i.unit, quantity: Number(i.quantity), unit_price: Number(i.unit_price), total_price: Number(i.total_price) }));
                        exportHakedisPDF([h], project?.name || "Proje", { includeHeader: true, includeSignature: true, includeWarning: true, signatureInfo: pdfSig }, project?.client, undefined, undefined, wi.length > 0 ? wi : undefined);
                      }} className="text-[10px] font-medium flex items-center gap-1" style={{ color: "#94A3B8" }}>
                        <FileDown className="w-3 h-3" /> PDF
                      </button>
                      <button onClick={() => setDeleteTarget({ id: h.id, name: h.period, type: "Hakedişi" })} className="text-[10px] font-medium flex items-center gap-1 ml-auto" style={{ color: "#EF4444" }}>
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

      {/* Overdue Section */}
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
                {overdueItems.map((h) => {
                  const days = h.expected_payment_date
                    ? Math.round((now - new Date(h.expected_payment_date).getTime()) / (1000 * 60 * 60 * 24))
                    : Math.round((now - new Date(h.created_at).getTime()) / (1000 * 60 * 60 * 24));
                  const interest = Math.round(h.net * DAILY_RATE * days);
                  return (
                    <tr key={h.id}>
                      <td className="px-3 py-2 font-mono text-foreground">#{hakedisler.indexOf(h) + 1}</td>
                      <td className="px-3 py-2 font-mono text-foreground">{fmt(h.net)}</td>
                      <td className="px-3 py-2" style={{ color: "#94A3B8" }}>{new Date(h.created_at).toLocaleDateString("tr-TR")}</td>
                      <td className="px-3 py-2 font-semibold" style={{ color: "#EF4444" }}>{days} gün</td>
                      <td className="px-3 py-2 font-mono font-semibold" style={{ color: "#EF4444" }}>{fmt(interest)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-[10px] mt-3" style={{ color: "#475569" }}>
            Bu hesaplama 3095 sayılı Kanun kapsamında yasal faiz hakkını göstermektedir.
          </p>
        </div>
      )}

      {/* Add form modal */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setShowAddForm(false)}>
          <div className="rounded-xl p-5 w-full max-w-md space-y-4 bg-card border border-border" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-[15px] font-semibold text-foreground">Yeni Hakediş Ekle</h3>
              <button onClick={() => setShowAddForm(false)} className="text-gray-400 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            <div>
              <label className="text-[11px] font-semibold mb-1 block" style={{ color: "#94A3B8" }}>Dönem</label>
              <input value={formPeriod} onChange={e => setFormPeriod(e.target.value)} placeholder="ör: Ocak 2026"
                className="w-full rounded-lg px-3 py-2 text-[13px] outline-none" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold mb-1 block" style={{ color: "#94A3B8" }}>Tutar (₺)</label>
                <input type="number" value={formAmount} onChange={e => setFormAmount(e.target.value)} placeholder="850000"
                  className="w-full rounded-lg px-3 py-2 text-[13px] outline-none" />
              </div>
              <div>
                <label className="text-[11px] font-semibold mb-1 block" style={{ color: "#94A3B8" }}>KDV Oranı (%)</label>
                <input type="number" value={formKdvRate} onChange={e => setFormKdvRate(e.target.value)}
                  className="w-full rounded-lg px-3 py-2 text-[13px] outline-none" />
              </div>
            </div>
            <button onClick={handleAdd} disabled={!formPeriod || !formAmount}
              className="w-full py-2.5 rounded-lg text-[13px] font-semibold text-white disabled:opacity-40" style={{ backgroundColor: "#FF6B2B" }}>
              Hakediş Ekle
            </button>
          </div>
        </div>
      )}

      {/* Payment Reminder Modal */}
      {reminderModal?.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setReminderModal(null)}>
          <div className="rounded-xl p-5 w-full max-w-sm space-y-4 bg-card border border-border" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5" style={{ color: "#FF6B2B" }} />
              <h3 className="text-[15px] font-semibold text-foreground">📅 Ödeme Hatırlatıcısı Kur</h3>
            </div>
            <p className="text-[12px]" style={{ color: "#94A3B8" }}>Bu hakedişin ödeme tarihini belirleyerek hatırlatıcı kuralım.</p>
            <div>
              <label className="text-[11px] font-semibold mb-1 block" style={{ color: "#94A3B8" }}>Beklenen Ödeme Tarihi</label>
              <input type="date" value={reminderDate} onChange={e => setReminderDate(e.target.value)}
                className="w-full rounded-lg px-3 py-2 text-[13px] outline-none" />
            </div>
            <div>
              <label className="text-[11px] font-semibold mb-1 block" style={{ color: "#94A3B8" }}>Kaç gün önce uyarılsın?</label>
              <select value={reminderDays} onChange={e => setReminderDays(e.target.value)}
                className="w-full rounded-lg px-3 py-2 text-[13px] outline-none">
                <option value="3">3 gün önce</option>
                <option value="1">1 gün önce</option>
                <option value="0">Vade günü</option>
                <option value="-1">Vade geçince (1 gün sonra)</option>
              </select>
            </div>
            <button onClick={handleReminderSave} disabled={!reminderDate}
              className="w-full py-2.5 rounded-lg text-[13px] font-semibold text-white disabled:opacity-40" style={{ backgroundColor: "#FF6B2B" }}>
              🔔 Hatırlatıcı Kur
            </button>
            <button onClick={() => setReminderModal(null)} className="w-full text-center text-[12px]" style={{ color: "#64748B" }}>
              Şimdi Değil
            </button>
          </div>
        </div>
      )}

      {/* Payment Confirmation Modal */}
      {paymentModal?.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setPaymentModal(null)}>
          <div className="rounded-xl p-5 w-full max-w-sm space-y-4 bg-card border border-border" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5" style={{ color: "#22C55E" }} />
              <h3 className="text-[15px] font-semibold text-foreground">Ödeme Onayı</h3>
            </div>
            <p className="text-[13px]" style={{ color: "#CBD5E1" }}>
              Hakediş #{paymentModal.hakedisNum} — <span className="font-bold" style={{ color: "#22C55E" }}>{fmt(paymentModal.hakedisNet)}</span> ödemesi tahsil edildi olarak işaretlensin mi?
            </p>
            <div className="flex gap-2">
              <button onClick={() => handlePaymentConfirm(paymentModal.hakedisId)}
                className="flex-1 py-2.5 rounded-lg text-[13px] font-semibold text-white" style={{ backgroundColor: "#22C55E" }}>
                ✅ Evet, Tahsil Edildi
              </button>
              <button onClick={() => setPaymentModal(null)}
                className="px-4 py-2.5 rounded-lg text-[12px] font-medium" style={{ backgroundColor: "#1E2732", color: "#94A3B8" }}>
                İptal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PDF Signature Modal */}
      {showPdfModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setShowPdfModal(false)}>
          <div className="rounded-xl p-5 w-full max-w-lg space-y-4 bg-card border border-border" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-[15px] font-semibold text-foreground">📄 PDF Ayarları</h3>
              <button onClick={() => setShowPdfModal(false)} style={{ color: "#94A3B8" }}><X className="w-4 h-4" /></button>
            </div>

            {/* Signature fields */}
            {(["hazirlayan", "kontrolEden", "isveren"] as const).map((key, ki) => {
              const labels = ["Hazırlayan", "Kontrol Eden (opsiyonel)", "İşveren / Onaylayan (opsiyonel)"];
              const colors = ["#FF6B2B", "#3B82F6", "#22C55E"];
              return (
                <div key={key} className="rounded-lg p-3 space-y-2 bg-background border border-border">
                  <p className="text-[11px] font-semibold" style={{ color: colors[ki] }}>{labels[ki]}</p>
                  <div className="grid grid-cols-2 gap-2">
                    <input placeholder="Adı Soyadı" value={pdfSig[key]?.name || ""} onChange={e => setPdfSig(p => ({ ...p, [key]: { ...p[key], name: e.target.value, title: p[key]?.title || "" } }))}
                      className="rounded-lg px-3 py-1.5 text-[12px] outline-none" />
                    <input placeholder="Ünvanı" value={pdfSig[key]?.title || ""} onChange={e => setPdfSig(p => ({ ...p, [key]: { ...p[key], name: p[key]?.name || "", title: e.target.value } }))}
                      className="rounded-lg px-3 py-1.5 text-[12px] outline-none" />
                  </div>
                </div>
              );
            })}

            {/* Checkboxes */}
            <div className="space-y-2 rounded-lg p-3 bg-background border border-border">
              {[
                { label: "Firma başlığı ekle", checked: pdfIncludeHeader, set: setPdfIncludeHeader },
                { label: "İmza alanı ekle", checked: pdfIncludeSignature, set: setPdfIncludeSignature },
                { label: "Uyarı metni ekle", checked: pdfIncludeWarning, set: setPdfIncludeWarning },
              ].map(opt => (
                <label key={opt.label} className="flex items-center gap-2 text-[12px] cursor-pointer" style={{ color: "#CBD5E1" }}>
                  <input type="checkbox" checked={opt.checked} onChange={e => opt.set(e.target.checked)}
                    className="rounded accent-[#FF6B2B]" />
                  {opt.label}
                </label>
              ))}
            </div>

            {/* Progress bar */}
            {pdfProgress !== null && (
              <div className="space-y-1">
                <div className="h-2 rounded-full" style={{ backgroundColor: "#1E2732" }}>
                  <div className="h-full rounded-full transition-all duration-300" style={{ backgroundColor: "#FF6B2B", width: `${pdfProgress}%` }} />
                </div>
                <p className="text-[11px] text-center" style={{ color: "#94A3B8" }}>PDF hazırlanıyor... %{pdfProgress}</p>
              </div>
            )}

            <div className="flex gap-2">
              <button
                disabled={pdfProgress !== null}
                onClick={async () => {
                  localStorage.setItem("santiyem_pdf_sig", JSON.stringify(pdfSig));
                  setPdfProgress(0);
                  try {
                    // Fetch all work items for all hakedisler
                    const allIds = hakedisler.map(h => h.id);
                    const { data: allItems } = await supabase
                      .from("hakedis_items")
                      .select("*")
                      .in("hakedis_id", allIds)
                      .order("sort_order", { ascending: true });
                    const workItems: HakedisWorkItem[] = (allItems || []).map((i: any) => ({
                      description: i.description, unit: i.unit, quantity: Number(i.quantity),
                      unit_price: Number(i.unit_price), total_price: Number(i.total_price),
                    }));
                    exportHakedisPDF(
                      hakedisler,
                      project?.name || "Proje",
                      {
                        includeHeader: pdfIncludeHeader,
                        includeSignature: pdfIncludeSignature,
                        includeWarning: pdfIncludeWarning,
                        signatureInfo: pdfSig,
                        onProgress: (pct) => setPdfProgress(pct),
                      },
                      project?.client,
                      undefined,
                      undefined,
                      workItems.length > 0 ? workItems : undefined,
                    );
                    setTimeout(() => {
                      setPdfProgress(null);
                      setShowPdfModal(false);
                      toast.success("✅ PDF indirildi");
                    }, 400);
                  } catch (err) {
                    console.error("PDF oluşturma hatası:", err);
                    setPdfProgress(null);
                    toast.error("PDF oluşturulurken hata oluştu. Lütfen tekrar deneyin.");
                  }
                }}
                className="flex-1 py-2.5 rounded-lg text-[13px] font-semibold text-white disabled:opacity-50" style={{ backgroundColor: "#FF6B2B" }}>
                📄 PDF Oluştur
              </button>
              <button onClick={() => setShowPdfModal(false)} className="px-4 py-2.5 rounded-lg text-[12px] font-medium" style={{ backgroundColor: "#1E2732", color: "#94A3B8" }}>İptal</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DesktopHakedisPage;
