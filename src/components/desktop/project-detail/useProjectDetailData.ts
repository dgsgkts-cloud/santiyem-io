import { useMemo } from "react";
import { formatNumber0 } from "@/lib/formatCurrency";
import {
  calcHealth, type RibbonKPI, type TimelineEvent, type RiskItem,
  type ActivityItem, type AIDockData,
} from "../ProjectCockpit";
import type { Project } from "@/lib/projectsData";
import {
  DollarSign, CheckCircle2, Calendar, Wallet, ArrowUpRight,
  MessageSquare, Users, AlertTriangle,
} from "lucide-react";

interface Args {
  project: Project;
  user: any;
  milestones: any[];
  mLoading: boolean;
  milestoneProgress: number;
  hakedisler: any[];
  files: any[];
  notes: any[];
  tasks: any[];
  payments: any[];
  collections: any[];
  checks: any[];
}

/**
 * SPRINT M1.3B — Derived state / KPI calculations for Project Detail.
 * Pure frontend computation; no backend, no schema, no business-logic changes.
 */
export function useProjectDetailData({
  project: p, user, milestones, mLoading, milestoneProgress,
  hakedisler, files, notes, tasks, payments, collections, checks,
}: Args) {
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

  return {
    projectPayments, projectCollections, projectChecks,
    totalPaymentsAmt, totalCollectionsAmt, netCashAmt, budgetNum, budgetUsedPct,
    doneTasksCount, overdueTasksCount, openTasksCount, taskCompletionPct,
    displayProgress, completedMilestones, totalMilestones,
    risks, health, daysRemaining, ribbon, timelineEvents, activityItems, aiDock,
  };
}
