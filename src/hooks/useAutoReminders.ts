import { useMemo } from "react";
import { differenceInCalendarDays, parseISO } from "date-fns";
import { useAllHakedis } from "@/hooks/useProjectHakedis";
import { useContracts } from "@/hooks/useContracts";
import { useProjects } from "@/hooks/useProjects";
import { useSubcontractorCheckAlerts } from "@/hooks/useSubcontractorCheckAlerts";

export type AutoReminderKind = "check" | "hakedis" | "contract";
export type AutoReminderSeverity = "info" | "warning" | "orange" | "danger" | "critical";

export interface AutoReminder {
  id: string;                 // stable: `${kind}:${sourceId}:${tag}`
  kind: AutoReminderKind;
  severity: AutoReminderSeverity;
  title: string;
  reminder_date: string;      // ISO yyyy-mm-dd
  note?: string;
  navigateTab: string;        // tab key for navigate-tab event
  sourceId: string;           // hakedis/contract/payment id
}

const todayISO = () => new Date().toISOString().slice(0, 10);

function fmtDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
  } catch { return dateStr; }
}

function fmtTRY(n: number) {
  try {
    return new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 }).format(n) + " TL";
  } catch { return `${n} TL`; }
}

const isApprovalSettled = (s?: string | null) =>
  s === "onaylandi" || s === "reddedildi";

const isHakedisPaid = (status?: string | null) =>
  (status || "").toLowerCase().includes("ödend") || (status || "").toLowerCase() === "odendi";

export function useAutoReminders() {
  const { allHakedisler } = useAllHakedis();
  const { contracts } = useContracts();
  const { projects } = useProjects();
  const { alerts: checkAlerts } = useSubcontractorCheckAlerts();

  return useMemo<AutoReminder[]>(() => {
    const out: AutoReminder[] = [];
    const today = todayISO();
    const projectName = (id: string) => projects.find(p => p.id === id)?.name || "Proje";

    // ── 1) Hakediş approval pending (3 gün / 7 gün)
    for (const h of allHakedisler) {
      const sentAt = h.approval_sent_at;
      if (sentAt && h.approval_status === "onay_bekliyor" && !isApprovalSettled(h.approval_status)) {
        const days = differenceInCalendarDays(new Date(), parseISO(sentAt));
        if (days >= 7) {
          out.push({
            id: `hakedis:${h.id}:approval-7`,
            kind: "hakedis",
            severity: "danger",
            title: `${projectName(h.project_id)} ${h.period}. Hakediş ${days} gündür onay bekliyor`,
            reminder_date: today,
            navigateTab: "hakedis",
            sourceId: h.id,
          });
        } else if (days >= 3) {
          out.push({
            id: `hakedis:${h.id}:approval-3`,
            kind: "hakedis",
            severity: "warning",
            title: `${projectName(h.project_id)} ${h.period}. Hakediş ${days} gündür onay bekliyor`,
            reminder_date: today,
            navigateTab: "hakedis",
            sourceId: h.id,
          });
        }
      }

      // ── Hakediş ödeme vadesi
      if (h.expected_payment_date && !isHakedisPaid(h.status)) {
        const due = h.expected_payment_date;
        const daysLeft = differenceInCalendarDays(parseISO(due), new Date());
        const amt = Number(h.net_total || h.net || 0);
        if (daysLeft < 0) {
          out.push({
            id: `hakedis:${h.id}:payment-overdue`,
            kind: "hakedis",
            severity: "critical",
            title: `Gecikmiş: ${projectName(h.project_id)} ${h.period}. Hakediş ödemesi yapılmadı (Vade: ${fmtDate(due)})`,
            reminder_date: due,
            note: amt > 0 ? `Tutar: ${fmtTRY(amt)}` : undefined,
            navigateTab: "hakedis",
            sourceId: h.id,
          });
        } else if (daysLeft <= 5) {
          out.push({
            id: `hakedis:${h.id}:payment-soon`,
            kind: "hakedis",
            severity: "warning",
            title: `${projectName(h.project_id)} ${h.period}. Hakediş ödemesi ${daysLeft === 0 ? "bugün" : daysLeft + " gün sonra"}${amt > 0 ? ` (Tutar: ${fmtTRY(amt)})` : ""}`,
            reminder_date: due,
            navigateTab: "hakedis",
            sourceId: h.id,
          });
        }
      }
    }

    // ── 2) Sözleşme bitiş hatırlatıcıları
    for (const c of contracts) {
      if (!c.end_date) continue;
      if (c.status === "yenilendi" || c.status === "iptal") continue;
      const daysLeft = differenceInCalendarDays(parseISO(c.end_date), new Date());
      const cp = c.counterparty || "Karşı taraf";
      if (daysLeft < 0) {
        out.push({
          id: `contract:${c.id}:expired`,
          kind: "contract",
          severity: "critical",
          title: `Süresi doldu: ${cp} ile sözleşme bitti (Bitiş: ${fmtDate(c.end_date)})`,
          reminder_date: c.end_date,
          navigateTab: "contracts",
          sourceId: c.id,
        });
      } else if (daysLeft <= 7) {
        out.push({
          id: `contract:${c.id}:end-7`,
          kind: "contract",
          severity: "danger",
          title: `${cp} ile sözleşme ${daysLeft === 0 ? "bugün" : daysLeft + " gün sonra"} bitiyor (Bitiş: ${fmtDate(c.end_date)})`,
          reminder_date: c.end_date,
          navigateTab: "contracts",
          sourceId: c.id,
        });
      } else if (daysLeft <= 15) {
        out.push({
          id: `contract:${c.id}:end-15`,
          kind: "contract",
          severity: "orange",
          title: `${cp} ile sözleşme ${daysLeft} gün sonra bitiyor (Bitiş: ${fmtDate(c.end_date)})`,
          reminder_date: c.end_date,
          navigateTab: "contracts",
          sourceId: c.id,
        });
      } else if (daysLeft <= 30) {
        out.push({
          id: `contract:${c.id}:end-30`,
          kind: "contract",
          severity: "warning",
          title: `${cp} ile sözleşme ${daysLeft} gün sonra bitiyor (Bitiş: ${fmtDate(c.end_date)})`,
          reminder_date: c.end_date,
          navigateTab: "contracts",
          sourceId: c.id,
        });
      }
    }

    // ── 3) Taşeron çek vadesi (mevcut kanaldan)
    for (const a of checkAlerts) {
      const sev: AutoReminderSeverity =
        a.severity === "overdue" ? "critical" :
        a.severity === "today" ? "danger" :
        a.severity === "soon3" ? "orange" : "warning";
      const title =
        a.severity === "overdue"
          ? `Gecikmiş: ${a.subcontractor_name} çek vadesi geçti (Vade: ${fmtDate(a.check_due_date)})`
          : a.severity === "today"
          ? `Bugün: ${a.subcontractor_name} çek vadesi (${fmtTRY(a.amount)})`
          : `${a.subcontractor_name} çek vadesi ${a.daysLeft} gün sonra (${fmtTRY(a.amount)})`;
      out.push({
        id: `check:${a.id}:due`,
        kind: "check",
        severity: sev,
        title,
        reminder_date: a.check_due_date,
        note: a.check_no ? `Çek No: ${a.check_no}` : undefined,
        navigateTab: "payments-kasa",
        sourceId: a.id,
      });
    }

    // Sort: critical > danger > orange > warning, then by date
    const sevRank: Record<AutoReminderSeverity, number> = { critical: 0, danger: 1, orange: 2, warning: 3, info: 4 };
    out.sort((a, b) => sevRank[a.severity] - sevRank[b.severity] || a.reminder_date.localeCompare(b.reminder_date));
    return out;
  }, [allHakedisler, contracts, projects, checkAlerts]);
}
