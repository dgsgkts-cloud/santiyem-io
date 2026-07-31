import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Users, Clock, AlertTriangle, ClipboardList, Package, FileText, Plus,
  BookOpen, CheckSquare, HardHat, Boxes, Warehouse, ShoppingCart, Truck,
  WalletCards, Receipt, FolderOpen, BarChart3, FilePlus2, Bell, Upload,
  Pencil, UsersRound, Archive, Layers, Droplets, Building2,
} from "lucide-react";

import { Project } from "@/lib/projectsData";
import { useUser } from "@/contexts/UserContext";
import { useProjectMilestones } from "@/hooks/useProjectMilestones";
import { useProjectHakedis } from "@/hooks/useProjectHakedis";
import { useProjectNotes } from "@/hooks/useProjectNotes";
import { useTasks } from "@/hooks/useTasks";
import { useCashPayments } from "@/hooks/useCashPayments";
import { useCashCollections } from "@/hooks/useCashCollections";
import { useSiteDiary } from "@/hooks/useSiteDiary";
import { useWorkerAttendance } from "@/hooks/useWorkerAttendance";
import { useMaterials } from "@/hooks/useMaterials";
import { useOrgPlan, effectiveFeature } from "@/hooks/useOrgPlan";

import MobileProjectHeader from "./MobileProjectHeader";
import MobileViewSwitcher, { MobileProjectView } from "./MobileViewSwitcher";
import MobileProjectOverview, { IssueItem, TodayItem } from "./MobileProjectOverview";
import MobileProjectModules, { ModuleGroup, ModuleRow } from "./MobileProjectModules";
import MobileActionSheet from "./MobileActionSheet";
import EditProjectModal, { EditProjectData } from "@/components/desktop/EditProjectModal";

interface Props {
  project: Project;
  onBack: () => void;
  onUpdate?: (id: string, data: EditProjectData) => Promise<boolean> | boolean;
}

const go = (tab: string) =>
  window.dispatchEvent(new CustomEvent("navigate-tab", { detail: { tab } }));

const fmtTime = (d: Date) => {
  const diff = Date.now() - d.getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return "Az önce";
  if (h < 24) return `${h} saat önce`;
  return d.toLocaleDateString("tr-TR", { day: "numeric", month: "long" });
};

/**
 * SPRINT 41A — mobile-native Project Detail workspace.
 * Header + single segmented control (Genel Bakış / Modüller) + view content.
 */
export default function ProjectDetailMobile({ project: p, onBack, onUpdate }: Props) {
  const { user } = useUser();
  const [view, setView] = useState<MobileProjectView>("overview");
  const [overflowOpen, setOverflowOpen] = useState(false);
  const [quickOverflowOpen, setQuickOverflowOpen] = useState(false);
  const [lockedModule, setLockedModule] = useState<ModuleRow | null>(null);
  const [aiDismissed, setAiDismissed] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [current, setCurrent] = useState<Project>(p);

  const { milestones, progress: milestoneProgress, loading: mLoading } = useProjectMilestones(p.id, p.milestones);
  const { hakedisler } = useProjectHakedis(p.id);
  const { notes, addNote } = useProjectNotes(p.id);
  const { tasks } = useTasks(p.id);
  const { payments } = useCashPayments();
  const { collections } = useCashCollections();
  const { entries: diaryEntries } = useSiteDiary(p.id);
  const { attendance } = useWorkerAttendance(p.id);
  const { stockMap } = useMaterials();
  const { summary } = useOrgPlan();

  /* ---------- derived, project-scoped ---------- */
  const projectPayments = payments.filter((x: any) => x.project_id === p.id);
  const projectCollections = collections.filter((x: any) => x.project_id === p.id);
  const spent = projectPayments.reduce((s: number, x: any) => s + Number(x.amount || 0), 0);
  const collected = projectCollections.reduce((s: number, x: any) => s + Number(x.amount || 0), 0);
  const budgetNum = Number(String(current.budget).replace(/[^\d]/g, "")) || 0;

  const approvedHakedis = hakedisler
    .filter((h: any) => /onay|ödendi/i.test(h.status || ""))
    .reduce((s: number, h: any) => s + Number(h.net || 0), 0);
  const pendingHakedisCount = hakedisler.filter((h: any) => /bekli|hazırla/i.test(h.status || "")).length;

  const doneTasks = tasks.filter((t: any) => t.status === "done").length;
  const overdueTasks = tasks.filter(
    (t: any) => t.status !== "done" && t.due_date && new Date(t.due_date) < new Date()
  ).length;

  const progressPct = user && !mLoading ? milestoneProgress : current.progress;
  const completedMs = user && !mLoading ? milestones.filter((m) => m.completed).length : current.milestones.filter((m) => m.completed).length;
  const totalMs = user && !mLoading ? milestones.length : current.milestones.length;
  const nextMs = (user && !mLoading ? milestones : []).find((m: any) => !m.completed);

  const todayStr = new Date().toDateString();
  const todayDiary = diaryEntries.filter((e: any) => new Date(e.date || e.created_at).toDateString() === todayStr);
  const onSiteToday = attendance.filter((a: any) => new Date(a.check_in).toDateString() === todayStr)
    .reduce((s: number, a: any) => s + (Number(a.team_size) || 1), 0);
  const criticalStock = stockMap.filter((m: any) => m.belowMin).length;
  const dueToday = tasks.filter((t: any) => t.due_date && new Date(t.due_date).toDateString() === todayStr);

  const today: TodayItem[] = useMemo(() => {
    const items: TodayItem[] = [];
    if (onSiteToday > 0) items.push({ id: "t1", label: `${onSiteToday} kişi sahada`, Icon: Users });
    if (todayDiary.length > 0) items.push({ id: "t2", label: `${todayDiary.length} günlük kaydı girildi`, Icon: BookOpen });
    if (dueToday.length > 0) items.push({ id: "t3", label: `${dueToday.length} görev bugün teslim`, Icon: Clock });
    if (items.length < 3 && overdueTasks > 0) items.push({ id: "t4", label: `${overdueTasks} görev gecikmiş`, Icon: AlertTriangle });
    return items.slice(0, 3);
  }, [onSiteToday, todayDiary.length, dueToday.length, overdueTasks]);

  const allIssues: IssueItem[] = useMemo(() => {
    const arr: IssueItem[] = [];
    if (overdueTasks > 0)
      arr.push({ id: "i1", title: `${overdueTasks} görev gecikmiş`, severity: "critical", actionLabel: "Görevleri aç", onAction: () => go("projects") });
    if (criticalStock > 0)
      arr.push({ id: "i2", title: `${criticalStock} malzeme kritik seviyede`, severity: "warning", actionLabel: "Malzemeyi aç", onAction: () => go("materials") });
    if (pendingHakedisCount > 0)
      arr.push({ id: "i3", title: `${pendingHakedisCount} hakediş onay bekliyor`, severity: "warning", actionLabel: "Hakedişi aç", onAction: () => go("hakedis") });
    if (todayDiary.length === 0)
      arr.push({ id: "i4", title: "Bugün saha günlüğü girilmedi", severity: "warning", actionLabel: "Günlük ekle", onAction: () => go("site-diary") });
    if (budgetNum > 0 && spent / budgetNum > 0.85)
      arr.push({ id: "i5", title: "Bütçe kullanımı %85 üzerinde", severity: "critical", actionLabel: "Finansı aç", onAction: () => go("payments-kasa") });
    return arr;
  }, [overdueTasks, criticalStock, pendingHakedisCount, todayDiary.length, budgetNum, spent]);

  const activity = useMemo(() => {
    const arr: { id: string; text: string; date: Date }[] = [];
    diaryEntries.slice(0, 5).forEach((e: any) =>
      arr.push({ id: `d-${e.id}`, text: "Günlük rapor eklendi", date: new Date(e.created_at) }));
    notes.slice(0, 5).forEach((n) =>
      arr.push({ id: `n-${n.id}`, text: `Not: ${n.content.slice(0, 60)}`, date: new Date(n.created_at) }));
    hakedisler.slice(0, 5).forEach((h: any) => h.created_at &&
      arr.push({ id: `h-${h.id}`, text: `Hakediş kaydedildi: ${h.period}`, date: new Date(h.created_at) }));
    tasks.filter((t: any) => t.status === "done").slice(0, 5).forEach((t: any) =>
      arr.push({ id: `t-${t.id}`, text: `Görev tamamlandı: ${t.title}`, date: new Date(t.updated_at || t.created_at) }));
    return arr
      .filter((a) => !isNaN(a.date.getTime()))
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 3)
      .map((a) => ({ id: a.id, text: a.text, time: fmtTime(a.date) }));
  }, [diaryEntries, notes, hakedisler, tasks]);

  /* ---------- modules ---------- */
  const isLocked = (key?: string) => {
    if (!key || !summary) return false;
    const known = key in summary.features || key in summary.feature_overrides;
    return known && !effectiveFeature(summary, key);
  };

  const groups: ModuleGroup[] = [
    {
      label: "SAHA OPERASYONLARI",
      items: [
        { id: "site-diary", label: "Şantiye Günlüğü", Icon: BookOpen, accent: true, status: todayDiary.length ? undefined : "Bugün kayıt yok", statusTone: "warning" },
        { id: "projects", label: "Görevler", Icon: CheckSquare, status: overdueTasks ? `${overdueTasks} gecikmiş` : `${tasks.length - doneTasks} açık`, statusTone: overdueTasks ? "critical" : "neutral" },
        { id: "personnel", label: "Personel & Puantaj", Icon: HardHat, status: onSiteToday ? `${onSiteToday} kişi` : undefined },
      ],
    },
    {
      label: "KAYNAKLAR",
      items: [
        { id: "materials", label: "Malzeme", Icon: Boxes, status: criticalStock ? `${criticalStock} kritik` : undefined, statusTone: "critical" },
        { id: "warehouse", label: "Depo ve Envanter", Icon: Warehouse, locked: isLocked("warehouse") },
        { id: "procurement", label: "Satın Alma", Icon: ShoppingCart, locked: isLocked("procurement") },
        { id: "fleet", label: "Makine ve Ekipman", Icon: Truck, locked: isLocked("fleet") },
      ],
    },
    {
      label: "FİNANS",
      items: [
        { id: "hakedis", label: "Hakediş", Icon: FileText, accent: true, status: pendingHakedisCount ? `${pendingHakedisCount} bekliyor` : undefined, statusTone: "warning" },
        { id: "payments-kasa", label: "Kasa ve Ödemeler", Icon: WalletCards },
        { id: "e-invoices", label: "E-Fatura / E-Arşiv", Icon: Receipt, locked: isLocked("e_invoices") },
      ],
    },
    {
      label: "DOKÜMANLAR",
      items: [
        { id: "contracts", label: "Sözleşmeler", Icon: FolderOpen },
        { id: "reports", label: "Raporlar", Icon: BarChart3 },
      ],
    },
  ];

  const openModule = (m: ModuleRow) => {
    if (m.locked) { setLockedModule(m); return; }
    go(m.id);
  };

  const aiInsight = !aiDismissed && (pendingHakedisCount > 0 || todayDiary.length === 0 || criticalStock > 0)
    ? {
        text: pendingHakedisCount > 0
          ? "Bekleyen hakedişler için onay hatırlatması hazırlayabilirim."
          : criticalStock > 0
          ? "Kritik stok kalemleri için satın alma talebi taslağı hazırlayabilirim."
          : "Bugünün saha günlüğü için ekibe bilgilendirme hazırlayabilirim.",
        onPrepare: () => {
          window.dispatchEvent(new CustomEvent("canvas-followup", {
            detail: { question: `[${current.name}] ${pendingHakedisCount > 0 ? "Bekleyen hakedişler için hatırlatma hazırla" : criticalStock > 0 ? "Kritik stoklar için satın alma talebi hazırla" : "Bugünün saha günlüğü için bilgilendirme hazırla"}` },
          }));
          go("chat");
        },
        onDismiss: () => setAiDismissed(true),
      }
    : undefined;

  return (
    <div
      className="w-full no-overflow-x px-4"
      style={{
        paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 76px + 16px)",
      }}
    >
      <MobileProjectHeader
        name={current.name}
        secondary={[current.location, current.client].filter(Boolean).join(" · ")}
        status={current.status}
        statusColor={current.statusColor || "#FF6B2B"}
        onBack={onBack}
        onOverflow={() => setOverflowOpen(true)}
      />

      <div className="pt-4">
        <MobileViewSwitcher value={view} onChange={setView} />
      </div>

      <div className="pt-5">
        {view === "overview" ? (
          <MobileProjectOverview
            progressPct={progressPct}
            doneItems={completedMs}
            totalItems={totalMs}
            phase={nextMs ? `Devam eden: ${nextMs.title}` : totalMs > 0 ? "Tüm kilometre taşları tamamlandı" : "Faz bilgisi girilmedi"}
            plannedEnd={current.end}
            today={today}
            todayMoreCount={Math.max(0, dueToday.length + todayDiary.length - today.length)}
            onSeeAllToday={() => go("site-diary")}
            issues={allIssues.slice(0, 3)}
            issuesTotal={allIssues.length}
            onSeeAllIssues={() => go("dashboard")}
            budget={budgetNum}
            spent={spent}
            approvedHakedis={approvedHakedis}
            outstanding={Math.max(0, budgetNum - spent)}
            onOpenFinance={() => go("payments-kasa")}
            activity={activity}
            onSeeAllActivity={() => go("site-diary")}
            quickActions={[
              { label: "Günlük Ekle", Icon: BookOpen, onClick: () => go("site-diary") },
              { label: "Görev Oluştur", Icon: ClipboardList, onClick: () => go("projects") },
              { label: "Malzeme Hareketi", Icon: Package, onClick: () => go("materials") },
              { label: "Hakediş Aç", Icon: FileText, onClick: () => go("hakedis") },
            ]}
            onQuickOverflow={() => setQuickOverflowOpen(true)}
            aiInsight={aiInsight}
            notes={notes.slice(0, 2).map((n) => ({ id: n.id, content: n.content, time: fmtTime(new Date(n.created_at)) }))}
            onAddNote={() => setQuickOverflowOpen(true)}
          />
        ) : (
          <MobileProjectModules groups={groups} onOpen={openModule} />
        )}
      </div>

      {/* Project overflow sheet */}
      <MobileActionSheet
        open={overflowOpen}
        onOpenChange={setOverflowOpen}
        title="Proje İşlemleri"
        actions={[
          { label: "Projeyi Düzenle", icon: <Pencil className="h-[18px] w-[18px]" />, onSelect: () => setShowEdit(true) },
          { label: "Ekip Yönetimi", icon: <UsersRound className="h-[18px] w-[18px]" />, onSelect: () => go("personnel") },
          { label: "Rapor Oluştur", icon: <BarChart3 className="h-[18px] w-[18px]" />, onSelect: () => go("reports") },
          { label: "Arşivle", icon: <Archive className="h-[18px] w-[18px]" />, onSelect: () => toast.info("Arşivleme masaüstü sürümünde yönetilir") },
        ]}
      />

      {/* Quick action overflow sheet */}
      <MobileActionSheet
        open={quickOverflowOpen}
        onOpenChange={setQuickOverflowOpen}
        title="Diğer İşlemler"
        actions={[
          { label: "Yeni not", icon: <FilePlus2 className="h-[18px] w-[18px]" />, onSelect: () => setNoteSheet(true) },
          { label: "Dosya yükle", icon: <Upload className="h-[18px] w-[18px]" />, onSelect: () => toast.info("Dosya yükleme proje dosyalarından yapılır") },
          { label: "Toplantı oluştur", icon: <Users className="h-[18px] w-[18px]" />, onSelect: () => go("dashboard") },
          { label: "Hatırlatıcı oluştur", icon: <Bell className="h-[18px] w-[18px]" />, onSelect: () => go("dashboard") },
        ]}
      />

      <NoteSheet
        onSave={async (text) => { await addNote(text); toast.success("Not eklendi"); }}
        registerOpener={(fn) => (openNoteSheetRef.current = fn)}
      />

      {/* Locked module sheet */}
      <MobileActionSheet
        open={!!lockedModule}
        onOpenChange={(v) => !v && setLockedModule(null)}
        title={lockedModule?.label}
        description="Bu modül Profesyonel pakette kullanılabilir."
        actions={[
          { label: "Paketi İncele", onSelect: () => go("pricing") },
          { label: "Kapat", onSelect: () => setLockedModule(null) },
        ]}
      />

      <EditProjectModal
        open={showEdit}
        initial={{
          name: current.name, client: current.client, location: current.location,
          manager: current.manager, site_responsible: (current as any).site_responsible || "",
          description: current.description, budget: current.budget,
          start_date: current.start, end_date: current.end,
        }}
        onClose={() => setShowEdit(false)}
        onSave={async (data) => {
          if (!onUpdate) return false;
          const ok = await onUpdate(current.id, data);
          if (ok) setCurrent((prev) => ({
            ...prev, name: data.name, client: data.client, location: data.location,
            manager: data.manager, description: data.description, budget: data.budget,
            start: data.start_date, end: data.end_date,
          }));
          return ok;
        }}
      />
    </div>
  );
}
