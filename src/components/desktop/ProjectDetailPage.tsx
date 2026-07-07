import { useState, useRef } from "react";
import { toast } from "sonner";
import {
  DollarSign, CheckCircle2, MessageSquare, Users,
  Plus, FileText, Camera, ClipboardCheck,
} from "lucide-react";

import DeleteConfirmModal from "@/components/DeleteConfirmModal";
import QrCodeModal from "./QrCodeModal";
import EditProjectModal, { EditProjectData } from "./EditProjectModal";
import TaskBoard from "./TaskBoard";
import AttendancePanel from "./AttendancePanel";
import ProjectMembersManagement from "./ProjectMembersManagement";

import { Project } from "@/lib/projectsData";
import { formatNumber0 } from "@/lib/formatCurrency";
import { useUser } from "@/contexts/UserContext";
import { useProjectHakedis } from "@/hooks/useProjectHakedis";
import { useProjectFiles } from "@/hooks/useProjectFiles";
import { useProjectMilestones } from "@/hooks/useProjectMilestones";
import { useProjectNotes } from "@/hooks/useProjectNotes";
import { useTasks } from "@/hooks/useTasks";
import { useCashPayments } from "@/hooks/useCashPayments";
import { useCashCollections } from "@/hooks/useCashCollections";
import { useCashChecks } from "@/hooks/useCashChecks";

import {
  ExecutiveRibbon, ProjectTimeline, RiskCenter, ProjectActivityFeed,
  QuickActionBar, ProjectAIDock, CEOExecutiveSummary,
} from "./ProjectCockpit";

import { PageShell, SectionCard } from "@/components/ui/responsive";

import ProjectHeader from "./project-detail/ProjectHeader";
import ProjectInfoCards from "./project-detail/ProjectInfoCards";
import ProjectTaskSummary from "./project-detail/ProjectTaskSummary";
import ProjectMilestones from "./project-detail/ProjectMilestones";
import ProjectRecentActivity from "./project-detail/ProjectRecentActivity";
import ProjectHakedisSection from "./project-detail/ProjectHakedisSection";
import ProjectFilesSection from "./project-detail/ProjectFilesSection";
import ProjectCashFlowSection from "./project-detail/ProjectCashFlowSection";
import ProjectNotesSection from "./project-detail/ProjectNotesSection";
import ProjectDeleteSection from "./project-detail/ProjectDeleteSection";
import { useProjectDetailData } from "./project-detail/useProjectDetailData";


interface ProjectDetailPageProps {
  project: Project;
  onBack: () => void;
  onDelete?: (id: string) => void;
  onStatusChange?: (id: string, status: string, color: string) => void;
  onUpdate?: (id: string, data: EditProjectData) => Promise<boolean> | boolean;
  isDeletable?: boolean;
}

/**
 * SPRINT M1.3B — Project Detail migrated to the Responsive Design System and
 * decomposed into feature components. Business logic and data flow unchanged.
 */
const ProjectDetailPage = ({
  project, onBack, onDelete, onStatusChange, onUpdate, isDeletable,
}: ProjectDetailPageProps) => {
  const [editedProject, setEditedProject] = useState<Project>(project);
  const p = editedProject;
  const { user } = useUser();

  const {
    milestones, loading: mLoading, progress: milestoneProgress,
    toggleCompleted, addMilestone, deleteMilestone,
  } = useProjectMilestones(p.id, p.milestones);
  const {
    hakedisler, loading: hLoading, addHakedis, deleteHakedis, updateHakedisStatus,
  } = useProjectHakedis(p.id);
  const { files, loading: fLoading, uploading, uploadFile, deleteFile } = useProjectFiles(p.id);
  const { notes, loading: nLoading, addNote, deleteNote } = useProjectNotes(p.id);
  const { tasks } = useTasks(p.id);
  const { payments } = useCashPayments();
  const { collections } = useCashCollections();
  const { checks } = useCashChecks();

  const [showEditModal, setShowEditModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [ceoMode, setCeoMode] = useState(false);

  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(p.status);
  const [currentStatusColor, setCurrentStatusColor] = useState(p.statusColor);

  const [hakedisStatusMenuId, setHakedisStatusMenuId] = useState<string | null>(null);
  const [showAddHakedis, setShowAddHakedis] = useState(false);
  const [newPeriod, setNewPeriod] = useState("");
  const [newAmount, setNewAmount] = useState("");

  const [showAddMilestone, setShowAddMilestone] = useState(false);
  const [newMilestoneTitle, setNewMilestoneTitle] = useState("");
  const [newMilestoneDate, setNewMilestoneDate] = useState("");

  const [newNoteContent, setNewNoteContent] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [deleteTarget, setDeleteTarget] = useState<{
    type: "milestone" | "hakedis" | "file" | "note";
    id: string;
    name: string;
    fileUrl?: string;
  } | null>(null);

  /* ---------- Derived data (frontend only) ---------- */
  const projectPayments = useMemo(() => payments.filter(x => x.project_id === p.id), [payments, p.id]);
  const projectCollections = useMemo(() => collections.filter(x => x.project_id === p.id), [collections, p.id]);
  const projectChecks = useMemo(() => checks.filter(x => x.project_id === p.id), [checks, p.id]);

  const totalPaymentsAmt = projectPayments.reduce((s, x) => s + Number(x.amount), 0);
  const totalCollectionsAmt = projectCollections.reduce((s, x) => s + Number(x.amount), 0);
  const netCashAmt = totalCollectionsAmt - totalPaymentsAmt;
  const budgetNum = Number(String(p.budget).replace(/[^\d]/g, "")) || 0;
  const budgetUsedPct = budgetNum > 0 ? Math.round((totalPaymentsAmt / budgetNum) * 100) : 0;

  const doneTasksCount = tasks.filter(t => t.status === "done").length;
  const overdueTasksCount = tasks.filter(
    t => t.status !== "done" && t.due_date && new Date(t.due_date) < new Date()
  ).length;
  const openTasksCount = tasks.length - doneTasksCount;
  const taskCompletionPct = tasks.length ? Math.round((doneTasksCount / tasks.length) * 100) : 0;

  const displayProgress = user && !mLoading ? milestoneProgress : p.progress;
  const completedMilestones = user && !mLoading
    ? milestones.filter(m => m.completed).length
    : p.milestones.filter(m => m.completed).length;
  const totalMilestones = user && !mLoading ? milestones.length : p.milestones.length;

  const risks: RiskItem[] = useMemo(() => {
    const r: RiskItem[] = [];
    if (overdueTasksCount > 0)
      r.push({ id: "r1", title: `${overdueTasksCount} görev gecikmede`, probability: "Yüksek", impact: "Orta", owner: p.manager, status: "Açık", mitigation: "Sorumlulara hatırlatma gönderin ve öncelik yeniden değerlendirin." });
    if (budgetUsedPct > 85)
      r.push({ id: "r2", title: "Bütçe kullanımı %85 üzerinde", probability: "Yüksek", impact: "Yüksek", owner: p.manager, status: "Açık", mitigation: "Kalan iş kalemleri için maliyet revizyonu yapın." });
    if (netCashAmt < 0)
      r.push({ id: "r3", title: "Negatif nakit akışı", probability: "Orta", impact: "Yüksek", owner: p.manager, status: "İzleniyor", mitigation: "Tahsilat takibini hızlandırın, ödemeleri planlayın." });
    const pendingHakedis = hakedisler.filter(h => /bekli/i.test(h.status)).length;
    if (pendingHakedis > 0)
      r.push({ id: "r4", title: `${pendingHakedis} hakediş onay bekliyor`, probability: "Orta", impact: "Orta", owner: p.client, status: "İzleniyor", mitigation: "Onay süreci için müşteri ile iletişime geçin." });
    return r;
  }, [overdueTasksCount, budgetUsedPct, netCashAmt, hakedisler, p.manager, p.client]);

  const health = calcHealth({
    progressPct: displayProgress,
    budgetUsedPct,
    taskCompletionPct,
    overdueCount: overdueTasksCount,
    netCash: netCashAmt,
    risksCount: risks.length,
  });

  const daysRemaining = (() => {
    const end = new Date(p.end); const now = new Date();
    const d = Math.round((end.getTime() - now.getTime()) / 86400000);
    return isNaN(d) ? 0 : d;
  })();

  const ribbon: RibbonKPI[] = [
    { label: "Bütçe", value: `₺${formatNumber0(budgetNum)}`, Icon: DollarSign, tone: "neutral" },
    { label: "Harcanan", value: `₺${formatNumber0(totalPaymentsAmt)}`, sub: `%${budgetUsedPct}`, Icon: ArrowUpRight, tone: budgetUsedPct > 85 ? "danger" : "neutral" },
    { label: "Kalan", value: `₺${formatNumber0(Math.max(0, budgetNum - totalPaymentsAmt))}`, Icon: Wallet, tone: "positive" },
    { label: "Tamamlanma", value: `${displayProgress}%`, Icon: CheckCircle2, tone: "positive" },
    { label: "Kalan Gün", value: `${daysRemaining}`, sub: p.end, Icon: Calendar, tone: daysRemaining < 30 ? "warning" : "neutral" },
    { label: "Bugün İşgücü", value: "—", sub: "Devam", Icon: Users, tone: "neutral" },
    { label: "Açık RFI", value: "0", Icon: MessageSquare, tone: "neutral" },
    { label: "Açık Konular", value: `${openTasksCount}`, Icon: AlertTriangle, tone: openTasksCount > 10 ? "warning" : "neutral" },
    { label: "Yaklaşan Ödeme", value: `₺${formatNumber0(hakedisler.filter(h => /bekli|hazırla/i.test(h.status)).reduce((s, h) => s + Number(h.net || 0), 0))}`, Icon: DollarSign, tone: "warning" },
  ];

  const timelineEvents: TimelineEvent[] = useMemo(() => {
    const evs: TimelineEvent[] = [];
    const ms = user && !mLoading
      ? milestones
      : p.milestones.map((m, i) => ({ id: `m${i}`, title: m.title, milestone_date: m.date, completed: m.completed } as any));
    ms.forEach((m: any) => {
      const d = new Date(m.milestone_date);
      if (!isNaN(d.getTime())) evs.push({ id: `ms-${m.id}`, date: d.toISOString(), title: m.title, kind: "milestone" });
    });
    hakedisler.forEach((h: any) => {
      const d = h.created_at ? new Date(h.created_at) : null;
      if (d && !isNaN(d.getTime())) evs.push({ id: `pay-${h.id}`, date: d.toISOString(), title: `${h.period} hakediş`, kind: "payment" });
    });
    return evs;
  }, [milestones, mLoading, p.milestones, hakedisler, user]);

  const activityItems: ActivityItem[] = useMemo(() => {
    const arr: ActivityItem[] = [];
    files.slice(0, 8).forEach(f => arr.push({ id: `f-${f.id}`, text: `Dosya yüklendi: ${f.file_name}`, date: new Date(f.created_at), color: "#A855F7" }));
    notes.slice(0, 8).forEach(n => arr.push({ id: `n-${n.id}`, text: `Not eklendi: ${n.content.slice(0, 50)}`, date: new Date(n.created_at), color: "#3B82F6" }));
    hakedisler.slice(0, 5).forEach((h: any) => h.created_at && arr.push({ id: `h-${h.id}`, text: `Hakediş: ${h.period} — ₺${formatNumber0(h.net)}`, date: new Date(h.created_at), color: "#22C55E" }));
    tasks.slice(0, 8).forEach(t => arr.push({ id: `t-${t.id}`, text: `Görev: ${t.title}`, date: new Date(t.created_at), color: "#FF6B2B" }));
    return arr.sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 20);
  }, [files, notes, hakedisler, tasks]);

  const aiDock: AIDockData = {
    todaySummary: [
      `Proje sağlığı ${health.score}/100 (${health.delta >= 0 ? "+" : ""}${health.delta} bu hafta).`,
      `${openTasksCount} açık görev, ${overdueTasksCount} gecikmede.`,
      `Bütçe kullanımı %${budgetUsedPct}.`,
    ],
    criticalRisks: risks.slice(0, 3).map(r => r.title),
    nextPayments: hakedisler.filter((h: any) => /bekli|hazırla/i.test(h.status)).slice(0, 4).map((h: any) => ({ label: h.period, amount: `₺${formatNumber0(h.net)}` })),
    todayTasks: tasks.filter(t => t.due_date && new Date(t.due_date).toDateString() === new Date().toDateString()).slice(0, 5).map(t => t.title),
    latestDocs: [...files].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 4).map(f => f.file_name),
    recentNotes: notes.slice(0, 4).map(n => n.content.slice(0, 60)),
  };

  const askProjectAI = (q: string) => {
    window.dispatchEvent(new CustomEvent("canvas-followup", { detail: { question: `[${p.name}] ${q}` } }));
    toast.success("AI'ya iletildi");
  };

  const quickActions = [
    { label: "Görev Ekle", Icon: Plus, color: "#FF6B2B", onClick: () => toast.info("Görev sekmesinden ekleyin") },
    { label: "Ödeme Ekle", Icon: DollarSign, color: "#22C55E", onClick: () => window.dispatchEvent(new CustomEvent("navigate-tab", { detail: { tab: "payments-kasa" } })) },
    { label: "İlerleme Kaydı", Icon: CheckCircle2, color: "#3B82F6", onClick: () => toast.info("Kilometre taşı ekleyin") },
    { label: "Doküman", Icon: FileText, color: "#A855F7", onClick: () => fileInputRef.current?.click() },
    { label: "Fotoğraf", Icon: Camera, color: "#F59E0B", onClick: () => fileInputRef.current?.click() },
    { label: "Not Ekle", Icon: MessageSquare, color: "#64748B", onClick: () => document.querySelector<HTMLInputElement>("input[placeholder*='Not']")?.focus() },
    { label: "Denetim", Icon: ClipboardCheck, color: "#EF4444", onClick: () => toast.info("Yakında") },
  ];

  /* ---------- Handlers ---------- */
  const handleAddMilestone = () => {
    if (!newMilestoneTitle) return;
    addMilestone(newMilestoneTitle, newMilestoneDate);
    setNewMilestoneTitle("");
    setNewMilestoneDate("");
    setShowAddMilestone(false);
  };

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

  const handleConfirmDeleteTarget = async () => {
    if (!deleteTarget) return;
    switch (deleteTarget.type) {
      case "milestone": await deleteMilestone(deleteTarget.id); break;
      case "hakedis": await deleteHakedis(deleteTarget.id); break;
      case "file": if (deleteTarget.fileUrl) await deleteFile(deleteTarget.id, deleteTarget.fileUrl); break;
      case "note": await deleteNote(deleteTarget.id); break;
    }
  };

  const deleteTargetTitle =
    deleteTarget?.type === "milestone" ? "Kilometre Taşını Sil"
    : deleteTarget?.type === "hakedis" ? "Hakedişi Sil"
    : deleteTarget?.type === "file" ? "Dosyayı Sil"
    : deleteTarget?.type === "note" ? "Notu Sil"
    : "Kaydı Sil";

  const displayMilestones = user
    ? milestones
    : p.milestones.map((m, i) => ({
        id: String(i),
        title: m.title,
        milestone_date: m.date,
        completed: m.completed,
        project_id: p.id,
        sort_order: i,
      }));

  const exportPdf = () => {
    import("@/lib/projectExport").then(m => {
      const ms = user && !mLoading
        ? milestones.map(mi => ({ title: mi.title, date: mi.milestone_date, completed: mi.completed }))
        : p.milestones;
      m.exportProjectPDF(p, tasks, ms);
    });
  };

  const exportExcel = () => {
    import("@/lib/projectExport").then(m => {
      const ms = user && !mLoading
        ? milestones.map(mi => ({ title: mi.title, date: mi.milestone_date, completed: mi.completed }))
        : p.milestones;
      m.exportProjectExcel(p, tasks, ms);
    });
  };

  const exportHakedisPdf = () => {
    import("@/lib/hakedisExport").then(m =>
      m.exportHakedisPDF(hakedisler, p.name, {
        includeHeader: true, includeSignature: true, includeWarning: true, signatureInfo: {},
      }, p.client)
    );
  };
  const exportHakedisExcel = () => {
    import("@/lib/hakedisExport").then(m => m.exportHakedisExcel(hakedisler, p.name));
  };

  return (
    <PageShell maxWidth={1200}>
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
              name: data.name, client: data.client, location: data.location, manager: data.manager,
              description: data.description, budget: data.budget, start: data.start_date, end: data.end_date,
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

      <div className="flex flex-col gap-4 lg:gap-5">
        <ProjectHeader
          project={p}
          currentStatus={currentStatus}
          currentStatusColor={currentStatusColor}
          showStatusMenu={showStatusMenu}
          onToggleStatusMenu={() => setShowStatusMenu(v => !v)}
          onStatusPick={(label, color) => {
            setCurrentStatus(label);
            setCurrentStatusColor(color);
            onStatusChange?.(p.id, label, color);
            setShowStatusMenu(false);
          }}
          onBack={onBack}
          onEdit={onUpdate ? () => setShowEditModal(true) : undefined}
          onQr={() => setShowQrModal(true)}
          ceoMode={ceoMode}
          onCeoToggle={() => setCeoMode(v => !v)}
          onStatusChange={onStatusChange}
          displayProgress={displayProgress}
          budgetUsedPct={budgetUsedPct}
          taskCompletionPct={taskCompletionPct}
          overdueTasksCount={overdueTasksCount}
          netCashAmt={netCashAmt}
          risks={risks}
          onExportPdf={exportPdf}
          onExportExcel={exportExcel}
        />

        <ExecutiveRibbon items={ribbon} />

        {ceoMode && (
          <CEOExecutiveSummary
            health={health.score}
            budget={`₺${formatNumber0(budgetNum)}`}
            spent={`₺${formatNumber0(totalPaymentsAmt)}`}
            cash={`₺${formatNumber0(netCashAmt)}`}
            completion={displayProgress}
            forecast={netCashAmt >= 0 ? "Pozitif" : "Riskli"}
            insights={[
              `Bütçe kullanımı %${budgetUsedPct}. ${budgetUsedPct > 85 ? "Yakın takip önerilir." : "Kontrol altında."}`,
              `${overdueTasksCount} görev gecikmede; ${openTasksCount} açık iş var.`,
              `Nakit akışı ₺${formatNumber0(netCashAmt)} — ${netCashAmt >= 0 ? "sağlıklı" : "negatif, tahsilatları hızlandırın"}.`,
              `Öncelikli riskler: ${risks.slice(0, 2).map(r => r.title).join("; ") || "yok"}.`,
            ]}
          />
        )}

        {!ceoMode && (
          <>
            <ProjectInfoCards project={p} />
            <ProjectTaskSummary project={p} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-5">
              <ProjectMilestones
                canEdit={!!user}
                loading={mLoading}
                milestones={displayMilestones as any}
                completedCount={completedMilestones}
                totalCount={totalMilestones}
                displayProgress={displayProgress}
                showAdd={showAddMilestone}
                onToggleAdd={() => setShowAddMilestone(v => !v)}
                newTitle={newMilestoneTitle}
                newDate={newMilestoneDate}
                onTitleChange={setNewMilestoneTitle}
                onDateChange={setNewMilestoneDate}
                onAdd={handleAddMilestone}
                onToggle={toggleCompleted}
                onRequestDelete={(id, name) => setDeleteTarget({ type: "milestone", id, name })}
              />
              <ProjectRecentActivity project={p} />
            </div>

            <ProjectTimeline events={timelineEvents} />
            <RiskCenter risks={risks} />

            <ProjectHakedisSection
              canEdit={!!user}
              loading={hLoading}
              hakedisler={hakedisler as any}
              showAdd={showAddHakedis}
              onToggleAdd={() => setShowAddHakedis(v => !v)}
              newPeriod={newPeriod}
              newAmount={newAmount}
              onPeriodChange={setNewPeriod}
              onAmountChange={setNewAmount}
              onAdd={handleAddHakedis}
              statusMenuId={hakedisStatusMenuId}
              onToggleStatusMenu={setHakedisStatusMenuId}
              onUpdateStatus={updateHakedisStatus}
              onRequestDelete={(id, name) => setDeleteTarget({ type: "hakedis", id, name })}
              onExportPdf={exportHakedisPdf}
              onExportExcel={exportHakedisExcel}
            />

            <ProjectFilesSection
              canEdit={!!user}
              loading={fLoading}
              uploading={uploading}
              files={files as any}
              fileInputRef={fileInputRef}
              onFileChange={handleFileUpload}
              onRequestDelete={(id, name, fileUrl) => setDeleteTarget({ type: "file", id, name, fileUrl })}
            />

            {user && (
              <ProjectCashFlowSection
                payments={projectPayments as any}
                collections={projectCollections as any}
                checks={projectChecks as any}
              />
            )}

            <ProjectNotesSection
              canEdit={!!user}
              loading={nLoading}
              notes={notes as any}
              newContent={newNoteContent}
              onContentChange={setNewNoteContent}
              onAdd={() => { addNote(newNoteContent); setNewNoteContent(""); }}
              onRequestDelete={(id, preview) => setDeleteTarget({ type: "note", id, name: preview })}
            />

            <ProjectActivityFeed items={activityItems} />

            {user && (
              <SectionCard>
                <TaskBoard projectId={p.id} />
              </SectionCard>
            )}

            {user && (
              <SectionCard
                title={
                  <span className="flex items-center gap-2">
                    <Users className="w-4 h-4" style={{ color: "#7C3AED" }} />
                    İşçi Devam Takibi
                  </span>
                }
              >
                <AttendancePanel projectId={p.id} projectName={p.name} />
              </SectionCard>
            )}

            {user && (
              <SectionCard>
                <ProjectMembersManagement projectId={p.id} />
              </SectionCard>
            )}
          </>
        )}

        <ProjectAIDock data={aiDock} onAsk={askProjectAI} />
        <QuickActionBar actions={quickActions} />

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
            <ProjectDeleteSection onDelete={() => setShowDeleteModal(true)} />
          </>
        )}
      </div>
    </PageShell>
  );
};

export default ProjectDetailPage;
