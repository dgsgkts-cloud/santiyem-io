import { useState, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import DeleteConfirmModal from "@/components/DeleteConfirmModal";
import QrCodeModal from "./QrCodeModal";
import { ArrowLeft, MapPin, User, Users, Calendar, DollarSign, CheckCircle2, Clock, XCircle, FileDown, FileSpreadsheet, Upload, Trash2, FileText, Plus, X, ChevronDown, MessageSquare, Send, ArrowDownLeft, ArrowUpRight, Wallet, QrCode, Pencil } from "lucide-react";
import EditProjectModal, { EditProjectData } from "./EditProjectModal";
import { Project } from "@/lib/projectsData";
import { useProjectHakedis } from "@/hooks/useProjectHakedis";
import { useProjectFiles } from "@/hooks/useProjectFiles";
import { useProjectMilestones } from "@/hooks/useProjectMilestones";
import { useUser } from "@/contexts/UserContext";
import { useProjectNotes } from "@/hooks/useProjectNotes";
import { useTasks } from "@/hooks/useTasks";
import { useCashPayments } from "@/hooks/useCashPayments";
import { useCashCollections } from "@/hooks/useCashCollections";
import { useCashChecks } from "@/hooks/useCashChecks";
import { toast } from "sonner";
import TaskBoard from "./TaskBoard";
import AttendancePanel from "./AttendancePanel";
import { formatCurrency, formatNumber0 } from "@/lib/formatCurrency";

const STATUS_OPTIONS = [
  { label: "Devam Ediyor", color: "#3B82F6" },
  { label: "Gecikmiş", color: "#EF4444" },
  { label: "Tamamlanıyor", color: "#F59E0B" },
  { label: "Tamamlandı", color: "#22C55E" },
  { label: "Durduruldu", color: "#64748B" },
];

const HAKEDIS_STATUS_OPTIONS = [
  { label: "Bekliyor", color: "#F59E0B" },
  { label: "Onaylandı", color: "#22C55E" },
  { label: "Reddedildi", color: "#EF4444" },
  { label: "Hazırlanıyor", color: "#3B82F6" },
  { label: "Ödendi", color: "#10B981" },
];

interface ProjectDetailPageProps {
  project: Project;
  onBack: () => void;
  onDelete?: (id: string) => void;
  onStatusChange?: (id: string, status: string, color: string) => void;
  onUpdate?: (id: string, data: EditProjectData) => Promise<boolean> | boolean;
  isDeletable?: boolean;
}

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / 1048576).toFixed(1) + " MB";
};

const ProjectDetailPage = ({ project, onBack, onDelete, onStatusChange, onUpdate, isDeletable }: ProjectDetailPageProps) => {
  const [showEditModal, setShowEditModal] = useState(false);
  const [editedProject, setEditedProject] = useState<Project>(project);
  const p = editedProject;
  const { user } = useUser();
  const { milestones, loading: mLoading, progress: milestoneProgress, toggleCompleted, addMilestone, deleteMilestone } = useProjectMilestones(p.id, p.milestones);
  const { hakedisler, loading: hLoading, addHakedis, deleteHakedis, updateHakedisStatus } = useProjectHakedis(p.id);
  const [hakedisStatusMenuId, setHakedisStatusMenuId] = useState<string | null>(null);
  const { files, loading: fLoading, uploading, uploadFile, deleteFile } = useProjectFiles(p.id);
  const { notes, loading: nLoading, addNote, deleteNote } = useProjectNotes(p.id);
  const { tasks } = useTasks(p.id);
  const { payments } = useCashPayments();
  const { collections } = useCashCollections();
  const { checks } = useCashChecks();
  const [newNoteContent, setNewNoteContent] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "milestone" | "hakedis" | "file" | "note";
    id: string;
    name: string;
    fileUrl?: string;
  } | null>(null);
  const [showAddHakedis, setShowAddHakedis] = useState(false);
  const [newPeriod, setNewPeriod] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [showAddMilestone, setShowAddMilestone] = useState(false);
  const [newMilestoneTitle, setNewMilestoneTitle] = useState("");
  const [newMilestoneDate, setNewMilestoneDate] = useState("");
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(p.status);
  const [currentStatusColor, setCurrentStatusColor] = useState(p.statusColor);
  const [showQrModal, setShowQrModal] = useState(false);

  const handleAddMilestone = () => {
    if (!newMilestoneTitle) return;
    addMilestone(newMilestoneTitle, newMilestoneDate);
    setNewMilestoneTitle("");
    setNewMilestoneDate("");
    setShowAddMilestone(false);
  };

  const displayProgress = user && !mLoading ? milestoneProgress : p.progress;
  const completedMilestones = user && !mLoading ? milestones.filter(m => m.completed).length : p.milestones.filter(m => m.completed).length;
  const totalMilestones = user && !mLoading ? milestones.length : p.milestones.length;

  const handleAddHakedis = () => {
    if (!newPeriod || !newAmount) return;
    addHakedis(newPeriod, parseFloat(newAmount));
    setNewPeriod("");
    setNewAmount("");
    setShowAddHakedis(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const cardStyle = {  };
  const labelStyle = { color: "#64748B" };
  const textStyle = {  };
  const getNotePreview = (content: string) => content.length > 60 ? `${content.slice(0, 60)}...` : content;

  const handleConfirmDeleteTarget = async () => {
    if (!deleteTarget) return;

    switch (deleteTarget.type) {
      case "milestone":
        await deleteMilestone(deleteTarget.id);
        break;
      case "hakedis":
        await deleteHakedis(deleteTarget.id);
        break;
      case "file":
        if (deleteTarget.fileUrl) await deleteFile(deleteTarget.id, deleteTarget.fileUrl);
        break;
      case "note":
        await deleteNote(deleteTarget.id);
        break;
    }
  };

  const deleteTargetTitle = deleteTarget?.type === "milestone"
    ? "Kilometre Taşını Sil"
    : deleteTarget?.type === "hakedis"
      ? "Hakedişi Sil"
      : deleteTarget?.type === "file"
        ? "Dosyayı Sil"
        : deleteTarget?.type === "note"
          ? "Notu Sil"
          : "Kaydı Sil";

  return (
    <div className="p-3 sm:p-4 lg:p-6 max-w-[1200px] mx-auto space-y-4 lg:space-y-5">
      {showQrModal && <QrCodeModal projectId={p.id} projectName={p.name} onClose={() => setShowQrModal(false)} />}
      <EditProjectModal
        open={showEditModal}
        initial={{
          name: p.name,
          client: p.client,
          location: p.location,
          manager: p.manager,
          site_responsible: (p as any).site_responsible || "",
          description: p.description,
          budget: p.budget,
          start_date: p.start,
          end_date: p.end,
        }}
        onClose={() => setShowEditModal(false)}
        onSave={async (data) => {
          if (!onUpdate) return false;
          const ok = await onUpdate(p.id, data);
          if (ok) {
            setEditedProject(prev => ({
              ...prev,
              name: data.name,
              client: data.client,
              location: data.location,
              manager: data.manager,
              description: data.description,
              budget: data.budget,
              start: data.start_date,
              end: data.end_date,
            }));
          }
          return ok;
        }}
      />
      <DeleteConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDeleteTarget}
        title={deleteTargetTitle}
        itemName={deleteTarget?.name}
      />
      {/* Back + Header */}
      <div>
        <button onClick={onBack} className="flex items-center gap-1.5 text-[12px] mb-3 transition-colors" style={labelStyle}>
          <ArrowLeft className="w-3.5 h-3.5" /> Projelere Dön
        </button>
        <div className="rounded-xl p-4 lg:p-5" style={{ ...cardStyle, borderLeft: "3px solid " + currentStatusColor }}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-base lg:text-xl font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif", ...textStyle }}>{p.name}</h2>
                <div className="relative">
                  <button
                    onClick={() => onStatusChange && setShowStatusMenu(!showStatusMenu)}
                    className={`text-[10px] lg:text-[11px] font-medium px-2 py-0.5 rounded-md transition-colors ${onStatusChange ? "cursor-pointer hover:opacity-80" : ""}`}
                    style={{ backgroundColor: `${currentStatusColor}15`, color: currentStatusColor }}
                  >
                    {currentStatus} {onStatusChange && "▾"}
                  </button>
                  {showStatusMenu && (
                    <div className="absolute top-full left-0 mt-1 z-50 rounded-lg py-1 min-w-[160px] shadow-xl bg-card border border-border">
                      {STATUS_OPTIONS.map(opt => (
                        <button
                          key={opt.label}
                          onClick={() => {
                            setCurrentStatus(opt.label);
                            setCurrentStatusColor(opt.color);
                            onStatusChange?.(p.id, opt.label, opt.color);
                            setShowStatusMenu(false);
                          }}
                          className="w-full text-left px-3 py-2 text-[12px] flex items-center gap-2 transition-colors hover:bg-white/5 text-foreground"
                        >
                          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: opt.color }} />
                          {opt.label}
                          {currentStatus === opt.label && <span className="ml-auto text-[10px]" style={{ color: opt.color }}>✓</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <p className="text-[12px] lg:text-[13px]" style={labelStyle}>{p.description}</p>
            </div>
            <div className="flex items-center gap-3 shrink-0 flex-wrap">
              {onUpdate && (
                <button
                  onClick={() => setShowEditModal(true)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-colors hover:opacity-80 bg-card border border-border text-foreground"
                >
                  <Pencil className="w-3.5 h-3.5" /> Düzenle
                </button>
              )}
              <button
                onClick={() => setShowQrModal(true)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-colors hover:opacity-80"
                style={{ backgroundColor: "#7C3AED", color: "#FFFFFF" }}
              >
                <QrCode className="w-3.5 h-3.5" /> QR Giriş
              </button>
              <button
                onClick={() => {
                  import("@/lib/projectExport").then(m => {
                    const ms = user && !mLoading ? milestones.map(mi => ({ title: mi.title, date: mi.milestone_date, completed: mi.completed })) : p.milestones;
                    m.exportProjectPDF(p, tasks, ms);
                    toast.success("PDF raporu indirildi");
                  });
                }}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-colors hover:opacity-80"
                style={{ backgroundColor: "#1E2732", border: "1px solid #334155", color: "#E2E8F0" }}
              >
                <FileDown className="w-3.5 h-3.5" /> PDF
              </button>
              <button
                onClick={() => {
                  import("@/lib/projectExport").then(m => {
                    const ms = user && !mLoading ? milestones.map(mi => ({ title: mi.title, date: mi.milestone_date, completed: mi.completed })) : p.milestones;
                    m.exportProjectExcel(p, tasks, ms);
                    toast.success("Excel raporu indirildi");
                  });
                }}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-colors hover:opacity-80"
                style={{ backgroundColor: "#22C55E", color: "#FFFFFF" }}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
              </button>
              <div className="relative w-14 h-14 lg:w-16 lg:h-16">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                  <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#1E2732" strokeWidth="3" />
                  <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#FF6B2B" strokeWidth="3" strokeDasharray={`${displayProgress}, 100`} />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-[13px] font-bold font-mono" style={textStyle}>{displayProgress}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Info cards row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { icon: MapPin, label: "Lokasyon", value: p.location },
          { icon: User, label: "Müşteri", value: p.client },
          { icon: DollarSign, label: "Bütçe", value: formatCurrency(p.budget) },
          { icon: Calendar, label: "Süre", value: `${p.start} → ${p.end}` },
        ].map((info, i) => {
          const Icon = info.icon;
          return (
            <div key={i} className="rounded-xl p-3 lg:p-4" style={cardStyle}>
              <div className="flex items-center gap-2 mb-1">
                <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: "#FF6B2B" }} />
                <span className="text-[10px] lg:text-[11px] font-semibold uppercase" style={labelStyle}>{info.label}</span>
              </div>
              <p className="text-[12px] lg:text-[13px] font-medium truncate" style={textStyle}>{info.value}</p>
            </div>
          );
        })}
      </div>

      {/* Task summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: CheckCircle2, label: "Tamamlanan", value: p.done, color: "#22C55E" },
          { icon: Clock, label: "Devam Eden", value: p.ongoing, color: "#F59E0B" },
          { icon: XCircle, label: "Başarısız", value: p.failed, color: "#EF4444" },
        ].map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="rounded-xl p-3 lg:p-4 text-center" style={cardStyle}>
              <Icon className="w-5 h-5 mx-auto mb-1" style={{ color: s.color }} />
              <p className="text-lg lg:text-2xl font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif", color: s.color }}>{s.value}</p>
              <p className="text-[10px] lg:text-[11px]" style={labelStyle}>{s.label}</p>
            </div>
          );
        })}
      </div>

      {/* Two columns: milestones + activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-5">
        {/* Milestones */}
        <div className="rounded-xl p-4 lg:p-5" style={cardStyle}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm lg:text-[15px] font-semibold" style={textStyle}>Kilometre Taşları</h3>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-md" style={{ backgroundColor: "rgba(255,107,43,0.1)", color: "#FF6B2B" }}>
                {completedMilestones}/{totalMilestones}
              </span>
              {user && (
                <button onClick={() => setShowAddMilestone(!showAddMilestone)} className="w-6 h-6 rounded-md flex items-center justify-center transition-colors" style={{ backgroundColor: showAddMilestone ? "#EF4444" : "#FF6B2B" }}>
                  {showAddMilestone ? <X className="w-3 h-3 text-white" /> : <Plus className="w-3 h-3 text-white" />}
                </button>
              )}
            </div>
          </div>

          {showAddMilestone && (
            <div className="flex flex-col sm:flex-row gap-2 mb-4 p-3 rounded-lg bg-background border border-border">
              <input value={newMilestoneTitle} onChange={e => setNewMilestoneTitle(e.target.value)} placeholder="Görev adı"
                className="flex-1 px-3 py-2 rounded-lg text-[13px] outline-none" />
              <input value={newMilestoneDate} onChange={e => setNewMilestoneDate(e.target.value)} placeholder="Tarih (ör: 01.05.2026)"
                className="w-full sm:w-36 px-3 py-2 rounded-lg text-[13px] outline-none" />
              <button onClick={handleAddMilestone} className="px-4 py-2 rounded-lg text-[12px] font-semibold text-white" style={{ backgroundColor: "#22C55E" }}>Ekle</button>
            </div>
          )}

          {mLoading ? (
            <p className="text-[12px]" style={labelStyle}>Yükleniyor...</p>
          ) : (
            <div className="space-y-2">
              {(user ? milestones : p.milestones.map((m, i) => ({ id: String(i), title: m.title, milestone_date: m.date, completed: m.completed, project_id: p.id, sort_order: i }))).map((m) => (
                <div key={m.id} className="flex items-center gap-3 group">
                  <button
                    onClick={() => user && toggleCompleted(m.id)}
                    className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-colors ${user ? "cursor-pointer hover:opacity-80" : ""}`}
                    style={{ backgroundColor: m.completed ? "#22C55E" : "#1E2732", border: m.completed ? "none" : "2px solid #334155" }}
                    disabled={!user}
                  >
                    {m.completed && <CheckCircle2 className="w-3 h-3 text-white" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={`text-[12px] lg:text-[13px] font-medium ${m.completed ? "line-through text-muted-foreground" : "text-foreground"}`}>{m.title}</p>
                  </div>
                  <span className="text-[10px] lg:text-[11px] font-mono shrink-0" style={labelStyle}>{m.milestone_date}</span>
                  {user && (
                    <button onClick={() => setDeleteTarget({ type: "milestone", id: m.id, name: m.title })} className="w-5 h-5 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "#EF4444" }}>
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 pt-3" style={{ borderTop: "1px solid #1E2732" }}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px]" style={labelStyle}>İlerleme</span>
              <span className="text-[11px] font-mono font-medium" style={{ color: "#FF6B2B" }}>{displayProgress}%</span>
            </div>
            <div className="h-2 rounded-full" style={{ backgroundColor: "#1E2732" }}>
              <div className="h-full rounded-full transition-all" style={{ backgroundColor: "#FF6B2B", width: `${displayProgress}%` }} />
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="rounded-xl p-4 lg:p-5" style={cardStyle}>
          <h3 className="text-sm lg:text-[15px] font-semibold mb-4" style={textStyle}>Son Aktiviteler</h3>
          <div className="space-y-3">
            {p.recentActivity.map((a, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: a.color }} />
                <span className="text-[12px] lg:text-[13px] flex-1 min-w-0 text-muted-foreground">{a.text}</span>
                <span className="text-[10px] lg:text-[11px] shrink-0" style={labelStyle}>{a.time}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-3" style={{ borderTop: "1px solid #1E2732" }}>
            <p className="text-[10px] font-semibold uppercase tracking-wide mb-2" style={{ color: "#334155" }}>Proje Sorumlusu</p>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: "rgba(255,107,43,0.15)" }}>
                <User className="w-4 h-4" style={{ color: "#FF6B2B" }} />
              </div>
              <div>
                <p className="text-[12px] lg:text-[13px] font-medium" style={textStyle}>{p.manager}</p>
                <p className="text-[10px]" style={labelStyle}>Şantiye Şefi</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hakediş Özeti */}
      <div className="rounded-xl p-4 lg:p-5" style={cardStyle}>
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h3 className="text-sm lg:text-[15px] font-semibold" style={textStyle}>Hakediş Özeti</h3>
          <div className="flex items-center gap-2">
            {hakedisler.length > 0 && (
              <>
                <button
                  onClick={() => { import("@/lib/hakedisExport").then(m => m.exportHakedisPDF(hakedisler, p.name, { includeHeader: true, includeSignature: true, includeWarning: true, signatureInfo: {} }, p.client)); }}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-colors"
                  style={{ backgroundColor: "#1E2732", color: "#E2E8F0" }}
                >
                  <FileDown className="w-3 h-3" /> PDF
                </button>
                <button
                  onClick={() => { import("@/lib/hakedisExport").then(m => m.exportHakedisExcel(hakedisler, p.name)); }}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-colors"
                  style={{ backgroundColor: "#22C55E", color: "#FFFFFF" }}
                >
                  <FileSpreadsheet className="w-3 h-3" /> Excel
                </button>
              </>
            )}
            {user && (
              <button
                onClick={() => setShowAddHakedis(!showAddHakedis)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold text-white transition-colors"
                style={{ backgroundColor: "#FF6B2B" }}
              >
                <Plus className="w-3.5 h-3.5" /> Yeni Hakediş
              </button>
            )}
          </div>
        </div>

        {showAddHakedis && (
          <div className="flex flex-col sm:flex-row gap-3 mb-4 p-3 rounded-lg bg-background border border-border">
            <input
              value={newPeriod}
              onChange={e => setNewPeriod(e.target.value)}
              placeholder="Dönem (ör: Nisan 2026)"
              className="flex-1 px-3 py-2 rounded-lg text-[13px] outline-none"
            />
            <input
              value={newAmount}
              onChange={e => setNewAmount(e.target.value)}
              type="number"
              placeholder="Tutar (₺)"
              className="w-full sm:w-40 px-3 py-2 rounded-lg text-[13px] outline-none"
            />
            <button
              onClick={handleAddHakedis}
              className="px-4 py-2 rounded-lg text-[12px] font-semibold text-white"
              style={{ backgroundColor: "#22C55E" }}
            >
              Ekle
            </button>
          </div>
        )}

        {hLoading ? (
          <p className="text-[12px]" style={labelStyle}>Yükleniyor...</p>
        ) : hakedisler.length === 0 ? (
          <div className="text-center py-8">
            <DollarSign className="w-8 h-8 mx-auto mb-2" style={{ color: "#334155" }} />
            <p className="text-[13px]" style={labelStyle}>Henüz hakediş kaydı yok</p>
            {user && <p className="text-[11px] mt-1" style={{ color: "#475569" }}>Yukarıdaki butona tıklayarak ilk hakedişi ekleyin</p>}
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="bg-background">
                    {["No", "Dönem", "Tutar", "KDV", "Net", "Durum", ""].map(h => (
                      <th key={h} className="text-left px-4 py-2.5 font-semibold uppercase tracking-wide" style={{ color: "#64748B", fontSize: 11 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {hakedisler.map((h, i) => (
                    <tr key={h.id} style={{ borderBottom: "1px solid #1E2732" }}>
                      <td className="px-4 py-3 font-mono" style={textStyle}>{i + 1}</td>
                      <td className="px-4 py-3 text-muted-foreground">{h.period}</td>
                      <td className="px-4 py-3 font-mono" style={textStyle}>₺{formatNumber0(h.amount)}</td>
                      <td className="px-4 py-3 font-mono text-muted-foreground">₺{formatNumber0(h.kdv)}</td>
                      <td className="px-4 py-3 font-mono font-semibold" style={textStyle}>₺{formatNumber0(h.net)}</td>
                      <td className="px-4 py-3 relative">
                        <button
                          onClick={() => setHakedisStatusMenuId(hakedisStatusMenuId === h.id ? null : h.id)}
                          className="text-[11px] font-medium px-2 py-0.5 rounded-md cursor-pointer flex items-center gap-1"
                          style={{ backgroundColor: `${h.status_color}15`, color: h.status_color }}
                        >
                          {h.status}
                          <ChevronDown className="w-3 h-3" />
                        </button>
                        {hakedisStatusMenuId === h.id && (
                          <div className="absolute z-50 top-full left-0 mt-1 rounded-lg py-1 shadow-xl min-w-[140px]" style={{ backgroundColor: "#1C242D", border: "1px solid #2D3748" }}>
                            {HAKEDIS_STATUS_OPTIONS.map(opt => (
                              <button
                                key={opt.label}
                                onClick={() => { updateHakedisStatus(h.id, opt.label, opt.color); setHakedisStatusMenuId(null); }}
                                className="w-full text-left px-3 py-1.5 text-[11px] hover:bg-white/5 flex items-center gap-2"
                                style={{ color: opt.color }}
                              >
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: opt.color }} />
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => setDeleteTarget({ type: "hakedis", id: h.id, name: `#${i + 1} — ${h.period}` })} className="w-7 h-7 rounded flex items-center justify-center transition-colors text-muted-foreground">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Mobile cards */}
            <div className="lg:hidden space-y-2">
              {hakedisler.map((h, i) => (
                <div key={h.id} className="p-3 rounded-lg relative bg-background border border-border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[12px] font-semibold" style={textStyle}>#{i + 1} — {h.period}</span>
                    <button
                      onClick={() => setHakedisStatusMenuId(hakedisStatusMenuId === h.id ? null : h.id)}
                      className="text-[10px] font-medium px-2 py-0.5 rounded-md flex items-center gap-1"
                      style={{ backgroundColor: `${h.status_color}15`, color: h.status_color }}
                    >
                      {h.status} <ChevronDown className="w-2.5 h-2.5" />
                    </button>
                    {hakedisStatusMenuId === h.id && (
                      <div className="absolute right-3 top-2 z-50 rounded-lg py-1 shadow-xl min-w-[130px]" style={{ backgroundColor: "#1C242D", border: "1px solid #2D3748" }}>
                        {HAKEDIS_STATUS_OPTIONS.map(opt => (
                          <button
                            key={opt.label}
                            onClick={() => { updateHakedisStatus(h.id, opt.label, opt.color); setHakedisStatusMenuId(null); }}
                            className="w-full text-left px-3 py-1.5 text-[10px] hover:bg-white/5 flex items-center gap-2"
                            style={{ color: opt.color }}
                          >
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: opt.color }} />
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span style={labelStyle}>Tutar: <span className="font-mono" style={textStyle}>₺{formatNumber0(h.amount)}</span></span>
                    <span style={labelStyle}>Net: <span className="font-mono font-semibold" style={textStyle}>₺{formatNumber0(h.net)}</span></span>
                    <button onClick={() => setDeleteTarget({ type: "hakedis", id: h.id, name: `#${i + 1} — ${h.period}` })} className="text-muted-foreground"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              ))}
            </div>
            {/* Summary row */}
            <div className="mt-3 pt-3 flex items-center justify-between" style={{ borderTop: "1px solid #1E2732" }}>
              <span className="text-[11px] font-semibold uppercase" style={labelStyle}>Toplam</span>
              <span className="text-[14px] font-bold font-mono" style={{ color: "#FF6B2B" }}>
                ₺{formatNumber0(hakedisler.reduce((s, h) => s + h.net, 0))}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Dosya Ekleri */}
      <div className="rounded-xl p-4 lg:p-5" style={cardStyle}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm lg:text-[15px] font-semibold" style={textStyle}>Dosya Ekleri</h3>
          {user && (
            <>
              <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold text-white transition-colors disabled:opacity-50"
                style={{ backgroundColor: "#FF6B2B" }}
              >
                <Upload className="w-3.5 h-3.5" /> {uploading ? "Yükleniyor..." : "Dosya Yükle"}
              </button>
            </>
          )}
        </div>

        {fLoading ? (
          <p className="text-[12px]" style={labelStyle}>Yükleniyor...</p>
        ) : files.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="w-8 h-8 mx-auto mb-2" style={{ color: "#334155" }} />
            <p className="text-[13px]" style={labelStyle}>Henüz dosya eklenmemiş</p>
            {user && <p className="text-[11px] mt-1" style={{ color: "#475569" }}>PDF, DWG, resim veya diğer dosyaları yükleyebilirsiniz</p>}
          </div>
        ) : (
          <div className="space-y-2">
            {files.map(f => (
              <div key={f.id} className="flex items-center gap-3 p-3 rounded-lg transition-colors bg-background border border-border">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: "rgba(255,107,43,0.1)" }}>
                  <FileText className="w-4 h-4" style={{ color: "#FF6B2B" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] lg:text-[13px] font-medium truncate" style={textStyle}>{f.file_name}</p>
                  <p className="text-[10px]" style={labelStyle}>{formatBytes(f.file_size)} · {new Date(f.created_at).toLocaleDateString("tr-TR")}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <a href={f.file_url} target="_blank" rel="noopener noreferrer" className="w-7 h-7 rounded flex items-center justify-center transition-colors text-muted-foreground">
                    <FileDown className="w-3.5 h-3.5" />
                  </a>
                  <button onClick={() => setDeleteTarget({ type: "file", id: f.id, name: f.file_name, fileUrl: f.file_url })} className="w-7 h-7 rounded flex items-center justify-center transition-colors text-muted-foreground">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Ödemeler & Tahsilatlar */}
      {user && (() => {
        const fmt = formatNumber0;
        const projectPayments = payments.filter(pay => pay.project_id === p.id);
        const projectCollections = collections.filter(col => col.project_id === p.id);
        const projectChecks = checks.filter(chk => chk.project_id === p.id);
        const totalPayments = projectPayments.reduce((s, pay) => s + Number(pay.amount), 0);
        const totalCollections = projectCollections.reduce((s, col) => s + Number(col.amount), 0);
        const netCashFlow = totalCollections - totalPayments;

        return (
          <div className="rounded-xl p-4 lg:p-5" style={cardStyle}>
            <div className="flex items-center gap-2 mb-4">
              <Wallet className="w-4 h-4" style={{ color: "#FF6B2B" }} />
              <h3 className="text-sm lg:text-[15px] font-semibold" style={textStyle}>Ödemeler & Tahsilatlar</h3>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-3 mb-5">
              <div className="rounded-lg p-3 bg-background border border-border">
                <div className="flex items-center gap-2 mb-1">
                  <ArrowUpRight className="w-3.5 h-3.5" style={{ color: "#EF4444" }} />
                  <span className="text-[10px] uppercase font-semibold" style={labelStyle}>Ödemeler</span>
                </div>
                <p className="text-[16px] font-bold" style={{ color: "#EF4444" }}>₺{fmt(totalPayments)}</p>
                <p className="text-[10px]" style={labelStyle}>{projectPayments.length} işlem</p>
              </div>
              <div className="rounded-lg p-3 bg-background border border-border">
                <div className="flex items-center gap-2 mb-1">
                  <ArrowDownLeft className="w-3.5 h-3.5" style={{ color: "#22C55E" }} />
                  <span className="text-[10px] uppercase font-semibold" style={labelStyle}>Tahsilatlar</span>
                </div>
                <p className="text-[16px] font-bold" style={{ color: "#22C55E" }}>₺{fmt(totalCollections)}</p>
                <p className="text-[10px]" style={labelStyle}>{projectCollections.length} işlem</p>
              </div>
              <div className="rounded-lg p-3 bg-background border border-border">
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="w-3.5 h-3.5" style={{ color: netCashFlow >= 0 ? "#22C55E" : "#EF4444" }} />
                  <span className="text-[10px] uppercase font-semibold" style={labelStyle}>Net Nakit Akışı</span>
                </div>
                <p className="text-[16px] font-bold" style={{ color: netCashFlow >= 0 ? "#22C55E" : "#EF4444" }}>
                  {netCashFlow >= 0 ? "+" : ""}₺{fmt(netCashFlow)}
                </p>
                <p className="text-[10px]" style={labelStyle}>Tahsilat - Ödeme</p>
              </div>
            </div>

            {/* Lists side by side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Payments list */}
              <div>
                <p className="text-[11px] font-semibold uppercase mb-2" style={{ color: "#334155" }}>Son Ödemeler</p>
                {projectPayments.length === 0 ? (
                  <p className="text-[12px] py-4 text-center" style={labelStyle}>Bu projeye ait ödeme yok</p>
                ) : (
                  <div className="space-y-1.5">
                    {projectPayments.slice(0, 5).map(pay => (
                      <div key={pay.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-background">
                        <div>
                          <p className="text-[12px] font-medium" style={textStyle}>{pay.recipient}</p>
                          <p className="text-[10px]" style={labelStyle}>{pay.category} • {pay.payment_date}</p>
                        </div>
                        <p className="text-[13px] font-semibold" style={{ color: "#EF4444" }}>-₺{fmt(pay.amount)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Collections list */}
              <div>
                <p className="text-[11px] font-semibold uppercase mb-2" style={{ color: "#334155" }}>Son Tahsilatlar</p>
                {projectCollections.length === 0 ? (
                  <p className="text-[12px] py-4 text-center" style={labelStyle}>Bu projeye ait tahsilat yok</p>
                ) : (
                  <div className="space-y-1.5">
                    {projectCollections.slice(0, 5).map(col => (
                      <div key={col.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-background">
                        <div>
                          <p className="text-[12px] font-medium" style={textStyle}>{col.sender}</p>
                          <p className="text-[10px]" style={labelStyle}>{col.collection_type} • {col.collection_date}</p>
                        </div>
                        <p className="text-[13px] font-semibold" style={{ color: "#22C55E" }}>+₺{fmt(col.amount)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Project checks */}
            {projectChecks.length > 0 && (
              <div className="mt-4 pt-4" style={{ borderTop: "1px solid #1E2732" }}>
                <p className="text-[11px] font-semibold uppercase mb-2" style={{ color: "#334155" }}>Proje Çekleri</p>
                <div className="space-y-1.5">
                  {projectChecks.map(chk => (
                    <div key={chk.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-background">
                      <div>
                        <p className="text-[12px] font-medium" style={textStyle}>
                          {chk.check_type === "verilen" ? "Verilen" : "Alınan"} — {chk.counterparty}
                        </p>
                        <p className="text-[10px]" style={labelStyle}>{chk.bank_name} • Vade: {chk.due_date}</p>
                      </div>
                      <p className="text-[13px] font-semibold" style={{ color: chk.check_type === "verilen" ? "#EF4444" : "#22C55E" }}>
                        ₺{fmt(chk.amount)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* Notlar / Yorumlar */}
      <div className="rounded-xl p-4 lg:p-5" style={cardStyle}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" style={{ color: "#FF6B2B" }} />
            <h3 className="text-sm lg:text-[15px] font-semibold" style={textStyle}>Notlar & Yorumlar</h3>
          </div>
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-md" style={{ backgroundColor: "rgba(255,107,43,0.1)", color: "#FF6B2B" }}>
            {notes.length} not
          </span>
        </div>

        {user && (
          <div className="flex gap-2 mb-4">
            <input
              value={newNoteContent}
              onChange={e => setNewNoteContent(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); addNote(newNoteContent); setNewNoteContent(""); } }}
              placeholder="Not veya yorum ekleyin..."
              className="flex-1 px-3 py-2.5 rounded-lg text-[13px] outline-none"
            />
            <button
              onClick={() => { addNote(newNoteContent); setNewNoteContent(""); }}
              disabled={!newNoteContent.trim()}
              className="px-3 py-2.5 rounded-lg transition-colors disabled:opacity-40"
              style={{ backgroundColor: "#FF6B2B" }}
            >
              <Send className="w-4 h-4 text-white" />
            </button>
          </div>
        )}

        {nLoading ? (
          <p className="text-[12px]" style={labelStyle}>Yükleniyor...</p>
        ) : notes.length === 0 ? (
          <p className="text-[12px] text-center py-6" style={labelStyle}>Henüz not eklenmemiş.</p>
        ) : (
          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
            {notes.map(note => (
              <div key={note.id} className="p-3 rounded-lg group bg-background border border-border">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[12px] lg:text-[13px] whitespace-pre-wrap flex-1" style={textStyle}>{note.content}</p>
                  {user && (
                    <button onClick={() => setDeleteTarget({ type: "note", id: note.id, name: getNotePreview(note.content) })} className="w-5 h-5 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5" style={{ color: "#EF4444" }}>
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <p className="text-[10px] mt-1.5" style={labelStyle}>{new Date(note.created_at).toLocaleString("tr-TR")}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Görevlendirme / Kanban */}
      {user && (
        <div className="rounded-xl p-4 lg:p-5" style={cardStyle}>
          <TaskBoard projectId={p.id} />
        </div>
      )}

      {/* İşçi Devam Takibi */}
      {user && (
        <div className="rounded-xl p-4 lg:p-5" style={cardStyle}>
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-4 h-4" style={{ color: "#7C3AED" }} />
            <h3 className="text-sm lg:text-[15px] font-semibold" style={textStyle}>İşçi Devam Takibi</h3>
          </div>
          <AttendancePanel projectId={p.id} projectName={p.name} />
        </div>
      )}

      {isDeletable && onDelete && user && (
        <>
          <DeleteConfirmModal
            open={showDeleteModal}
            onClose={() => setShowDeleteModal(false)}
            onConfirm={async () => { onDelete(p.id); }}
            title="Projeyi Sil"
            itemName={p.name}
            extraWarning="Projeye ait tüm iş kalemleri, hakedişler ve şantiye kayıtları da silinecektir."
          />
          <div className="rounded-xl p-4 lg:p-5" style={{ ...cardStyle, borderColor: "rgba(239,68,68,0.3)" }}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm lg:text-[15px] font-semibold" style={{ color: "#EF4444" }}>Projeyi Sil</h3>
                <p className="text-[12px] mt-0.5" style={labelStyle}>Bu işlem geri alınamaz. Tüm hakediş, dosya ve kilometre taşı verileri silinir.</p>
              </div>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-[13px] font-semibold text-white transition-colors shrink-0"
                style={{ backgroundColor: "#EF4444" }}
              >
                <Trash2 className="w-4 h-4" /> Projeyi Sil
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ProjectDetailPage;
