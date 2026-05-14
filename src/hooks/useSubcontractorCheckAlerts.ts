import { useMemo } from "react";
import { parseISO, differenceInCalendarDays } from "date-fns";
import { useSubcontractors, useSubcontractorPayments } from "@/hooks/useSubcontractors";

export type CheckAlertSeverity = "overdue" | "today" | "soon3" | "soon7";

export interface CheckAlert {
  id: string;                // payment id
  subcontractor_id: string;
  subcontractor_name: string;
  amount: number;
  check_no: string | null;
  check_due_date: string;    // ISO yyyy-mm-dd
  daysLeft: number;          // negative = overdue
  severity: CheckAlertSeverity;
}

/**
 * Single source of truth for upcoming/overdue subcontractor check-due alerts.
 * Used by:
 *   - Dashboard warning card
 *   - SubcontractorDebtSection summary banner
 *   - RemindersPanel auto reminders section
 */
export function useSubcontractorCheckAlerts() {
  const { subcontractors } = useSubcontractors();
  const { payments } = useSubcontractorPayments();

  const alerts = useMemo<CheckAlert[]>(() => {
    const subById = new Map(subcontractors.map(s => [s.id, s]));
    const out: CheckAlert[] = [];
    for (const p of payments) {
      if (p.payment_method !== "cek" || !p.check_due_date) continue;
      const days = differenceInCalendarDays(parseISO(p.check_due_date), new Date());
      let sev: CheckAlertSeverity | null = null;
      if (days < 0) sev = "overdue";
      else if (days === 0) sev = "today";
      else if (days <= 3) sev = "soon3";
      else if (days <= 7) sev = "soon7";
      if (!sev) continue;
      const sub = subById.get(p.subcontractor_id);
      out.push({
        id: p.id,
        subcontractor_id: p.subcontractor_id,
        subcontractor_name: sub?.name || "Taşeron",
        amount: Number(p.amount) || 0,
        check_no: p.check_no,
        check_due_date: p.check_due_date,
        daysLeft: days,
        severity: sev,
      });
    }
    // Most urgent first: overdue (most days late) → today → 3 → 7
    return out.sort((a, b) => a.daysLeft - b.daysLeft);
  }, [subcontractors, payments]);

  const overdue = alerts.filter(a => a.severity === "overdue");
  const upcoming = alerts.filter(a => a.severity !== "overdue");
  const overdueTotal = overdue.reduce((s, a) => s + a.amount, 0);
  const upcomingTotal = upcoming.reduce((s, a) => s + a.amount, 0);

  return { alerts, overdue, upcoming, overdueTotal, upcomingTotal };
}
