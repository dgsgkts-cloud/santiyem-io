import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";

export type Severity = "critical" | "important" | "info";

export interface Finding {
  id: string;
  severity: Severity;
  title: string;
  detail?: string;
  action?: { tab: string; projectId?: string; label?: string };
}

export interface ExecutiveKpis {
  healthScore: number;
  cashOnHand: number;
  monthRevenue: number;
  monthExpenses: number;
  activeProjects: number;
  activeWorkersToday: number;
  criticalRisks: number;
  criticalStockItems: number;
  pendingPayments: number;
  tasksDueToday: number;
  laborDeltaPct: number | null;
}

interface Row { [k: string]: unknown }

const today = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};
const addDays = (d: Date, n: number) => {
  const nd = new Date(d);
  nd.setDate(nd.getDate() + n);
  return nd;
};
const iso = (d: Date) => d.toISOString().slice(0, 10);

export function useExecutiveBrief() {
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    projects: Row[];
    cashAccounts: Row[];
    checks: Row[];
    hakedis: Row[];
    subPayments: Row[];
    expenses: Row[];
    materials: Row[];
    materialExits: Row[];
    tasks: Row[];
    workerAttendanceToday: Row[];
    laborThis: number;
    laborPrev: number;
  } | null>(null);

  const fetchAll = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const now = today();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const in7 = addDays(now, 7);
    const in30ago = addDays(now, -30);

    const q = <T extends { data: unknown }>(p: PromiseLike<T>) => Promise.resolve(p).catch(() => ({ data: [] } as T));

    const [
      projectsR,
      cashR,
      checksR,
      hakedisR,
      subPaysR,
      expensesR,
      materialsR,
      exitsR,
      tasksR,
      attendanceR,
    ] = await Promise.all([
      q(supabase.from("projects").select("id,name,status,progress,end_date").eq("user_id", user.id)),
      q(supabase.from("cash_accounts").select("id,balance,name").eq("user_id", user.id)),
      q(supabase.from("cash_checks").select("id,amount,due_date,status,direction").eq("user_id", user.id)),
      q(supabase.from("project_hakedis").select("id,project_id,amount,net,status,payment_date,expected_payment_date,approval_status,approval_sent_at,created_at").eq("user_id", user.id)),
      q(supabase.from("subcontractor_payments").select("id,amount,status,payment_date,planned_date,subcontractor_id").eq("user_id", user.id)),
      q(supabase.from("project_expenses").select("id,amount,expense_date").eq("user_id", user.id).gte("expense_date", iso(prevMonthStart))),
      q(supabase.from("materials").select("id,name,unit,min_stock,project_id").eq("user_id", user.id)),
      q(supabase.from("material_exits").select("material_id,quantity,exit_date").eq("user_id", user.id).gte("exit_date", iso(in30ago))),
      q(supabase.from("tasks").select("id,title,status,due_date,project_id").eq("created_by", user.id)),
      q(supabase.from("worker_attendance").select("id,full_name,team_size,entry_type,check_in,check_out").eq("user_id", user.id).gte("check_in", iso(now))),
    ]);

    setData({
      projects: (projectsR.data as Row[]) || [],
      cashAccounts: (cashR.data as Row[]) || [],
      checks: (checksR.data as Row[]) || [],
      hakedis: (hakedisR.data as Row[]) || [],
      subPayments: (subPaysR.data as Row[]) || [],
      expenses: (expensesR.data as Row[]) || [],
      materials: (materialsR.data as Row[]) || [],
      materialExits: (exitsR.data as Row[]) || [],
      tasks: (tasksR.data as Row[]) || [],
      workerAttendanceToday: (attendanceR.data as Row[]) || [],
      laborThis: 0,
      laborPrev: 0,
    });
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    const onRefresh = () => fetchAll();
    const onVisible = () => { if (document.visibilityState === "visible") fetchAll(); };
    window.addEventListener("executive-brief-refresh", onRefresh);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("executive-brief-refresh", onRefresh);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [fetchAll]);

  const { findings, insights, kpis } = useMemo(() => {
    const findings: Finding[] = [];
    const insights: string[] = [];
    if (!data) {
      return {
        findings,
        insights,
        kpis: {
          healthScore: 100,
          cashOnHand: 0,
          monthRevenue: 0,
          monthExpenses: 0,
          activeProjects: 0,
          activeWorkersToday: 0,
          criticalRisks: 0,
          criticalStockItems: 0,
          pendingPayments: 0,
          tasksDueToday: 0,
          laborDeltaPct: null,
        } as ExecutiveKpis,
      };
    }

    const now = today();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const in7 = addDays(now, 7);
    const in30ago = addDays(now, -30);

    // ── Cash ─────────────────────────────────────────
    const cashOnHand = data.cashAccounts.reduce((s, a) => s + Number(a.balance || 0), 0);

    // ── Checks (payable outgoing within 7d) ──────────
    const upcomingChecks = data.checks.filter((c) => {
      const dt = new Date(String(c.due_date));
      const paid = c.status === "odendi" || c.status === "tahsil_edildi";
      return !paid && dt >= now && dt <= in7 && (c.direction === "out" || !c.direction);
    });
    const overdueChecks = data.checks.filter((c) => {
      const dt = new Date(String(c.due_date));
      const paid = c.status === "odendi" || c.status === "tahsil_edildi";
      return !paid && dt < now;
    });
    const upcomingPayables = upcomingChecks.reduce((s, c) => s + Number(c.amount || 0), 0);

    if (overdueChecks.length > 0) {
      findings.push({
        id: "overdue-checks",
        severity: "critical",
        title: `${overdueChecks.length} vadesi geçmiş çek`,
        detail: `Toplam ${overdueChecks.reduce((s, c) => s + Number(c.amount || 0), 0).toLocaleString("tr-TR")} ₺`,
        action: { tab: "payments-kasa", label: "Kasayı aç" },
      });
    }
    if (upcomingChecks.length > 0) {
      findings.push({
        id: "upcoming-checks",
        severity: upcomingChecks.length >= 3 ? "important" : "info",
        title: `${upcomingChecks.length} çek 7 gün içinde vadeli`,
        detail: `${upcomingPayables.toLocaleString("tr-TR")} ₺ ödeme yaklaşıyor`,
        action: { tab: "payments-kasa", label: "Kasa" },
      });
    }

    // ── Subcontractor payments ───────────────────────
    const subPending = data.subPayments.filter((p) => p.status !== "odendi");
    const subOverdue = subPending.filter((p) => {
      const pd = p.planned_date ? new Date(String(p.planned_date)) : null;
      return pd && pd < now;
    });
    const subDueToday = subPending.filter((p) => {
      const pd = p.planned_date ? new Date(String(p.planned_date)) : null;
      return pd && pd.getTime() === now.getTime();
    });
    if (subOverdue.length > 0) {
      findings.push({
        id: "sub-overdue",
        severity: "critical",
        title: `${subOverdue.length} taşeron ödemesi gecikmiş`,
        action: { tab: "subcontractors", label: "Taşeronlar" },
      });
    }
    if (subDueToday.length > 0) {
      findings.push({
        id: "sub-today",
        severity: "important",
        title: `${subDueToday.length} taşeron ödemesi bugün`,
        action: { tab: "subcontractors" },
      });
    }

    // ── Hakediş ──────────────────────────────────────
    const hakedisPending = data.hakedis.filter((h) => {
      const sent = h.approval_sent_at ? new Date(String(h.approval_sent_at)) : null;
      return h.approval_status === "beklemede" && sent && (now.getTime() - sent.getTime()) / 86400000 > 7;
    });
    if (hakedisPending.length > 0) {
      findings.push({
        id: "hakedis-pending",
        severity: "important",
        title: `${hakedisPending.length} hakediş 7+ gündür onay bekliyor`,
        action: { tab: "hakedis", label: "Hakediş" },
      });
    }
    const hakedisRejected = data.hakedis.filter((h) => h.approval_status === "reddedildi");
    if (hakedisRejected.length > 0) {
      findings.push({
        id: "hakedis-rejected",
        severity: "critical",
        title: `${hakedisRejected.length} hakediş reddedildi`,
        action: { tab: "hakedis" },
      });
    }

    // ── Revenue / Expenses ───────────────────────────
    const monthRevenue = data.hakedis
      .filter((h) => h.payment_date && new Date(String(h.payment_date)) >= monthStart)
      .reduce((s, h) => s + Number(h.net || h.amount || 0), 0);
    const prevMonthRevenue = data.hakedis
      .filter((h) => {
        const pd = h.payment_date ? new Date(String(h.payment_date)) : null;
        return pd && pd >= prevMonthStart && pd < monthStart;
      })
      .reduce((s, h) => s + Number(h.net || h.amount || 0), 0);

    const monthExpenses = data.expenses
      .filter((e) => new Date(String(e.expense_date)) >= monthStart)
      .reduce((s, e) => s + Number(e.amount || 0), 0);
    const prevMonthExpenses = data.expenses
      .filter((e) => {
        const ed = new Date(String(e.expense_date));
        return ed >= prevMonthStart && ed < monthStart;
      })
      .reduce((s, e) => s + Number(e.amount || 0), 0);

    if (prevMonthRevenue > 0) {
      const d = ((monthRevenue - prevMonthRevenue) / prevMonthRevenue) * 100;
      if (Math.abs(d) >= 10) {
        insights.push(
          d > 0
            ? `Ciro geçen aya göre %${d.toFixed(0)} arttı.`
            : `Ciro geçen aya göre %${Math.abs(d).toFixed(0)} düştü.`
        );
      }
    }
    let laborDeltaPct: number | null = null;
    if (prevMonthExpenses > 0) {
      const d = ((monthExpenses - prevMonthExpenses) / prevMonthExpenses) * 100;
      laborDeltaPct = d;
      if (d >= 10) {
        insights.push(`Gider geçen aya göre %${d.toFixed(0)} arttı.`);
        findings.push({
          id: "expense-spike",
          severity: "important",
          title: `Aylık gider %${d.toFixed(0)} arttı`,
          action: { tab: "payments-kasa" },
        });
      } else if (d <= -10) {
        insights.push(`Gider geçen aya göre %${Math.abs(d).toFixed(0)} azaldı.`);
      }
    }

    // ── Cash flow warning ────────────────────────────
    if (cashOnHand > 0 && upcomingPayables > cashOnHand) {
      findings.push({
        id: "cash-shortfall",
        severity: "critical",
        title: "Nakit önümüzdeki 7 günün ödemelerini karşılamıyor",
        detail: `Kasa ${cashOnHand.toLocaleString("tr-TR")} ₺ / Ödeme ${upcomingPayables.toLocaleString("tr-TR")} ₺`,
        action: { tab: "payments-kasa" },
      });
    } else if (cashOnHand > 0 && upcomingPayables > 0 && upcomingPayables > cashOnHand * 0.6) {
      insights.push(`Kasa, yaklaşan ödemelerin %${((upcomingPayables / cashOnHand) * 100).toFixed(0)}'ini karşılıyor.`);
    }

    // ── Materials ────────────────────────────────────
    const exitsByMat = new Map<string, number>();
    for (const e of data.materialExits) {
      const key = String(e.material_id);
      exitsByMat.set(key, (exitsByMat.get(key) || 0) + Number(e.quantity || 0));
    }
    const criticalStock: Row[] = [];
    for (const m of data.materials) {
      const min = Number(m.min_stock || 0);
      if (min <= 0) continue;
      const consumed30 = exitsByMat.get(String(m.id)) || 0;
      if (consumed30 >= min * 1.5) {
        criticalStock.push(m);
      }
    }
    if (criticalStock.length > 0) {
      findings.push({
        id: "stock-critical",
        severity: "important",
        title: `${criticalStock.length} malzeme kritik seviyede`,
        detail: criticalStock.slice(0, 3).map((m) => String(m.name)).join(", "),
        action: { tab: "materials", label: "Malzemeler" },
      });
    }

    // ── Tasks ────────────────────────────────────────
    const openTasks = data.tasks.filter((t) => t.status !== "done" && t.status !== "completed");
    const tasksDueToday = openTasks.filter((t) => {
      const dd = t.due_date ? new Date(String(t.due_date)) : null;
      return dd && dd.getTime() === now.getTime();
    });
    const tasksOverdue = openTasks.filter((t) => {
      const dd = t.due_date ? new Date(String(t.due_date)) : null;
      return dd && dd < now;
    });
    if (tasksOverdue.length > 0) {
      findings.push({
        id: "tasks-overdue",
        severity: "important",
        title: `${tasksOverdue.length} görev gecikti`,
        action: { tab: "tasks", label: "Görevler" },
      });
    }
    if (tasksDueToday.length > 0) {
      findings.push({
        id: "tasks-today",
        severity: "info",
        title: `${tasksDueToday.length} görev bugün teslim`,
        action: { tab: "tasks" },
      });
    }

    // ── Projects ─────────────────────────────────────
    const activeProjects = data.projects.filter((p) => p.status !== "tamamlandi" && p.status !== "iptal");
    for (const p of activeProjects) {
      const end = p.end_date ? new Date(String(p.end_date)) : null;
      const prog = Number(p.progress || 0);
      if (end && end < now && prog < 100) {
        findings.push({
          id: `project-late-${p.id}`,
          severity: "critical",
          title: `Proje süresi doldu: ${String(p.name)}`,
          detail: `İlerleme %${prog}`,
          action: { tab: "projects", projectId: String(p.id), label: "Projeyi aç" },
        });
      }
    }

    // ── Workers today ────────────────────────────────
    const activeWorkersToday = data.workerAttendanceToday.reduce(
      (s, w) => s + (w.entry_type === "team" ? Number(w.team_size || 1) : 1),
      0
    );

    // ── Insights padding ─────────────────────────────
    if (activeWorkersToday > 0) {
      insights.push(`Bugün sahada ${activeWorkersToday} kişi giriş yaptı.`);
    }
    if (findings.length === 0) {
      insights.push("Şu an için kritik uyarı yok. Şantiye sakin görünüyor.");
    }

    // ── Score ────────────────────────────────────────
    let score = 100;
    for (const f of findings) {
      if (f.severity === "critical") score -= 15;
      else if (f.severity === "important") score -= 5;
    }
    score = Math.max(0, Math.min(100, score));

    const criticalRisks = findings.filter((f) => f.severity === "critical").length;
    const pendingPayments = subPending.length + upcomingChecks.length + overdueChecks.length;

    // Severity order
    const order: Record<Severity, number> = { critical: 0, important: 1, info: 2 };
    findings.sort((a, b) => order[a.severity] - order[b.severity]);

    return {
      findings,
      insights: insights.slice(0, 4),
      kpis: {
        healthScore: score,
        cashOnHand,
        monthRevenue,
        monthExpenses,
        activeProjects: activeProjects.length,
        activeWorkersToday,
        criticalRisks,
        criticalStockItems: criticalStock.length,
        pendingPayments,
        tasksDueToday: tasksDueToday.length,
        laborDeltaPct,
      },
    };
  }, [data]);

  return { loading, findings, insights, kpis, refresh: fetchAll };
}
