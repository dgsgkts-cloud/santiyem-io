// Sprint 31 — AI Operations Brain
// Pure, frontend-only derivation layer that turns the raw dataset already
// fetched by `useExecutiveBrief` into an operational-director view: prioritized
// risks, opportunities, today's priorities, plus AI-suggested actions.
//
// No backend calls. No schema changes. Just interpretation.

import type { AIAction, AIActionType } from "@/hooks/useActionExecutor";

export type AIPriority = "critical" | "high" | "medium" | "low";
export type AIInsightKind = "risk" | "opportunity" | "priority";
export type AIInsightDomain =
  | "finance"
  | "projects"
  | "personnel"
  | "procurement"
  | "fleet"
  | "tasks";

export interface AIInsight {
  id: string;
  kind: AIInsightKind;
  domain: AIInsightDomain;
  priority: AIPriority;
  title: string;
  detail?: string;
  /** Sprint 31.1 — why this happened (root-cause hypothesis). */
  cause?: string;
  /** Sprint 31.1 — why it matters (business impact). */
  impact?: string;
  /** Short recommendation the AI would say aloud. */
  recommendation?: string;
  /** Sprint 31.1 — bullet steps user should take. */
  suggestedSteps?: string[];
  /** Sprint 31.1 — short one-liner for the "Top Action Today" strip. */
  topActionLabel?: string;
  /** Sprint 31.1 — expected impact copy for the top-action strip. */
  expectedImpact?: string;
  /** Follow-up actions the user can execute from the card. */
  actions?: AIAction[];
}

export interface AIOperationsSummary {
  topInsight: AIInsight | null;
  topAction: AIInsight | null;
  topRisks: AIInsight[];
  topOpportunities: AIInsight[];
  todayPriorities: AIInsight[];
  all: AIInsight[];
  /** Short natural-language sentence for the AI Hero ticker. */
  headline: string | null;
}

type Row = { [k: string]: unknown };

interface BrainInput {
  now: Date;
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
  personnel?: Row[];
  subcontractors?: Row[];
}

const priorityWeight: Record<AIPriority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const fmtTRY = (n: number) => `${Math.round(n).toLocaleString("tr-TR")} ₺`;
const daysBetween = (a: Date, b: Date) =>
  Math.round((a.getTime() - b.getTime()) / 86400000);
const addDays = (d: Date, n: number) => {
  const nd = new Date(d);
  nd.setDate(nd.getDate() + n);
  return nd;
};
const startOfDay = (d: Date) => {
  const nd = new Date(d);
  nd.setHours(0, 0, 0, 0);
  return nd;
};

const makeAction = (
  id: string,
  label: string,
  type: AIActionType,
  extras: Partial<AIAction> = {}
): AIAction => ({
  id,
  label,
  type,
  priority: extras.priority ?? "medium",
  ...extras,
});

/**
 * Compute the AI Operations Brain summary from raw brief data.
 * Deterministic, pure — safe to memoize on the caller side.
 */
export function computeAIOperations(input: BrainInput): AIOperationsSummary {
  const now = startOfDay(input.now);
  const in7 = addDays(now, 7);
  const in14 = addDays(now, 14);
  const in30 = addDays(now, 30);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const insights: AIInsight[] = [];

  // ───────────────────────── FINANCE ─────────────────────────
  const cashOnHand = input.cashAccounts.reduce(
    (s, a) => s + Number(a.balance || 0),
    0
  );

  const outgoing30 = [
    ...input.checks
      .filter((c) => {
        const paid = c.status === "odendi" || c.status === "tahsil_edildi";
        const dt = c.due_date ? new Date(String(c.due_date)) : null;
        return !paid && dt && dt >= now && dt <= in30;
      })
      .map((c) => ({ amount: Number(c.amount || 0), date: new Date(String(c.due_date)) })),
    ...input.subPayments
      .filter((p) => {
        if (p.status === "odendi") return false;
        const pd = p.planned_date ? new Date(String(p.planned_date)) : null;
        return pd && pd >= now && pd <= in30;
      })
      .map((p) => ({ amount: Number(p.amount || 0), date: new Date(String(p.planned_date)) })),
  ];

  const incoming30 = input.hakedis
    .filter((h) => {
      if (h.payment_date) return false;
      const ed = h.expected_payment_date ? new Date(String(h.expected_payment_date)) : null;
      return ed && ed >= now && ed <= in30;
    })
    .map((h) => ({ amount: Number(h.net || h.amount || 0), date: new Date(String(h.expected_payment_date)) }));

  const outflow30 = outgoing30.reduce((s, x) => s + x.amount, 0);
  const inflow30 = incoming30.reduce((s, x) => s + x.amount, 0);
  const projected30 = cashOnHand + inflow30 - outflow30;

  if (cashOnHand > 0 && projected30 < 0) {
    // Estimate deficit day: run a naive daily balance and find first negative.
    let running = cashOnHand;
    const events = [
      ...incoming30.map((x) => ({ date: x.date, delta: +x.amount })),
      ...outgoing30.map((x) => ({ date: x.date, delta: -x.amount })),
    ].sort((a, b) => a.date.getTime() - b.date.getTime());
    let deficitDate: Date | null = null;
    for (const e of events) {
      running += e.delta;
      if (running < 0) {
        deficitDate = e.date;
        break;
      }
    }
    const deficitDays = deficitDate ? daysBetween(deficitDate, now) : 30;
    insights.push({
      id: "cash-shortfall-30",
      kind: "risk",
      domain: "finance",
      priority: "critical",
      title: `Yaklaşık ${deficitDays} gün içinde nakit açığı öngörülüyor`,
      detail: `Kasa ${fmtTRY(cashOnHand)} + tahsilat ${fmtTRY(inflow30)} − ödeme ${fmtTRY(outflow30)} = ${fmtTRY(projected30)}`,
      cause:
        "Beklenen tahsilatlar planlanan ödemelerden geride kalıyor; çıkış hızı giriş hızını aşıyor.",
      impact:
        "Vadeler karşılanmazsa taşeron ve tedarikçi ilişkileri bozulabilir; kredi maliyeti artabilir.",
      recommendation:
        "Düşük öncelikli ödemeleri erteleyin, tahsilatları hızlandırın, satın alma takvimini gözden geçirin.",
      suggestedSteps: [
        "Beklenen hakediş tahsilatlarını arayarak teyit edin.",
        "Kritik olmayan taşeron ödemelerini 7–10 gün öteleyin.",
        "Bu ayki satın alma taleplerini önceliklendirin.",
      ],
      topActionLabel: "Nakit planını gözden geçir",
      expectedImpact: `Yaklaşık ${fmtTRY(Math.abs(projected30))} açığı kapatma`,
      actions: [
        makeAction("cash-open", "Nakit Planını Aç", "open_payment", { priority: "high" }),
        makeAction("cash-collections", "Tahsilatları Gör", "open_report"),
        makeAction("cash-task", "Tahsilat görevi oluştur", "create_task", {
          priority: "high",
          payload: { title: "Beklenen tahsilatları hızlandır", priority: "high" },
        }),
      ],
    });
  } else if (cashOnHand > 0 && outflow30 > cashOnHand && projected30 >= 0) {
    insights.push({
      id: "cash-tight-30",
      kind: "risk",
      domain: "finance",
      priority: "high",
      title: "30 günlük ödemeler mevcut kasayı aşıyor",
      detail: `Ödeme ${fmtTRY(outflow30)} > Kasa ${fmtTRY(cashOnHand)} — tahsilatlarla kapanıyor`,
      cause: "Nakit stoğu, önümüzdeki ay ödemelerini tek başına karşılamıyor.",
      impact: "Tahsilat gecikirse aynı hafta içinde kasa açığa düşebilir.",
      recommendation:
        "Tahsilat takvimini yakın takibe alın, gerekirse ödeme sıralamasını yeniden planlayın.",
      suggestedSteps: [
        "Bu haftanın beklenen tahsilatlarını teyit edin.",
        "Kritik olmayan ödemeleri bir sonraki tahsilat sonrasına planlayın.",
      ],
      topActionLabel: "Haftalık nakit takibi kur",
      expectedImpact: "Nakit görünürlüğünde 4 hafta öngörü",
      actions: [
        makeAction("cash-open-tight", "Nakit Planını Aç", "open_payment"),
        makeAction("cash-remind", "Hatırlatma oluştur", "create_task", {
          payload: { title: "Kasa dengesini haftalık takip et", priority: "medium" },
        }),
      ],
    });
  }


  // Overdue subcontractor payments
  const subOverdue = input.subPayments.filter((p) => {
    if (p.status === "odendi") return false;
    const pd = p.planned_date ? new Date(String(p.planned_date)) : null;
    return pd && pd < now;
  });
  if (subOverdue.length > 0) {
    const total = subOverdue.reduce((s, p) => s + Number(p.amount || 0), 0);
    insights.push({
      id: "sub-overdue-ops",
      kind: "risk",
      domain: "finance",
      priority: "critical",
      title: `${subOverdue.length} taşeron ödemesi vadesi geçmiş`,
      detail: `Toplam ${fmtTRY(total)}`,
      cause: "Tahsilat gecikmesi veya ödeme planı eksikliği taşeron vadelerinin kaçmasına yol açmış.",
      impact: "Tedarikçi ilişkileri zayıflar; kritik iş gücü ve malzeme kesintileri oluşabilir.",
      recommendation:
        "Yüksek riskli taşeronları önceliklendirin ve düşük öncelikli ödemeleri planlı biçimde erteleyin.",
      suggestedSteps: [
        "Taşeronları risk/etki matrisine göre gruplayın.",
        "Kritik olanlara kısmi ödeme + kalan bakiye planı önerin.",
        "Kalanlara yazılı ödeme takvimi paylaşın.",
      ],
      topActionLabel: `${subOverdue.length} taşeron için ödeme planı oluştur`,
      expectedImpact: `${fmtTRY(total)} tutarında ödeme yükünün yönetilmesi`,
      actions: [
        makeAction("sub-plan-open", "Ödeme Planı Oluştur", "create_task", {
          priority: "high",
          payload: {
            title: `${subOverdue.length} taşeron ödeme planı`,
            priority: "high",
          },
        }),
        makeAction("sub-open", "Ödeme Takvimi Aç", "open_payment"),
        makeAction("sub-group", "Taşeronları Grupla", "open_report"),
      ],
    });
  }


  // Expected collections opportunity (this month)
  const collectionsThisMonth = input.hakedis
    .filter((h) => {
      if (h.payment_date) return false;
      const ed = h.expected_payment_date ? new Date(String(h.expected_payment_date)) : null;
      return ed && ed >= now && ed <= addDays(now, 31);
    });
  if (collectionsThisMonth.length > 0) {
    const total = collectionsThisMonth.reduce(
      (s, h) => s + Number(h.net || h.amount || 0),
      0
    );
    insights.push({
      id: "collections-window",
      kind: "opportunity",
      domain: "finance",
      priority: total > cashOnHand * 0.5 ? "high" : "medium",
      title: `Önümüzdeki 30 günde ${fmtTRY(total)} tahsilat beklentisi`,
      detail: `${collectionsThisMonth.length} hakediş tahsilatı planda`,
      actions: [
        makeAction("collect-open", "Hakedişleri aç", "open_report"),
      ],
    });
  }

  // Category dominance this month
  const catMap = new Map<string, number>();
  for (const e of input.expenses) {
    const ed = e.expense_date ? new Date(String(e.expense_date)) : null;
    if (!ed || ed < monthStart) continue;
    const key = String(
      (e as Record<string, unknown>).category ??
        (e as Record<string, unknown>).type ??
        "Diğer"
    );
    catMap.set(key, (catMap.get(key) || 0) + Number(e.amount || 0));
  }
  const totalMonthSpend = Array.from(catMap.values()).reduce((s, v) => s + v, 0);
  if (totalMonthSpend > 0) {
    const top = Array.from(catMap.entries()).sort((a, b) => b[1] - a[1])[0];
    const share = top[1] / totalMonthSpend;
    if (share >= 0.4) {
      insights.push({
        id: `expense-concentration-${top[0]}`,
        kind: "risk",
        domain: "finance",
        priority: share >= 0.6 ? "high" : "medium",
        title: `Bu ay harcamaların %${Math.round(share * 100)}'i ${top[0]} kaleminde`,
        detail: `${fmtTRY(top[1])} / ${fmtTRY(totalMonthSpend)}`,
        recommendation:
          "Bu kalem için tedarikçi çeşitliliği ve fiyat karşılaştırması yapmayı düşünün.",
      });
    }
  }

  // ───────────────────────── PROJECTS ─────────────────────────
  const activeProjects = input.projects.filter(
    (p) => p.status !== "tamamlandi" && p.status !== "iptal"
  );

  // Riskiest project: overdue with lowest progress
  const projectRisks = activeProjects
    .map((p) => {
      const end = p.end_date ? new Date(String(p.end_date)) : null;
      const prog = Number(p.progress || 0);
      const slip = end ? daysBetween(now, end) : 0; // positive = late
      const score = (slip > 0 ? slip * 2 : 0) + Math.max(0, 80 - prog);
      return { p, end, prog, slip, score };
    })
    .filter((r) => r.slip > 0 || r.prog < 40)
    .sort((a, b) => b.score - a.score);

  if (projectRisks.length > 0) {
    const top = projectRisks[0];
    const isLate = top.slip > 0;
    // Rough recovery estimate: assume 1 extra worker recovers ~0.4 day per week.
    const recoverWorkers = isLate ? Math.max(2, Math.min(8, Math.ceil(top.slip / 2))) : 0;
    insights.push({
      id: `project-risk-${String(top.p.id)}`,
      kind: "risk",
      domain: "projects",
      priority: top.slip > 7 ? "critical" : isLate ? "high" : "medium",
      title: isLate
        ? `${String(top.p.name)} planın ${top.slip} gün gerisinde`
        : `${String(top.p.name)} ilerleme oranı düşük (%${top.prog})`,
      detail: top.end
        ? `Bitiş: ${top.end.toLocaleDateString("tr-TR")} · İlerleme %${top.prog}`
        : `İlerleme %${top.prog}`,
      cause: isLate
        ? "Düşük iş gücü, geciken malzeme teslimatları veya bekleyen kontrol/onay süreçleri gecikmenin muhtemel nedenleri."
        : "Planlanan ilerleme temposu tutmuyor; blok noktalar plana yansımıyor olabilir.",
      impact: isLate
        ? "Teslim tarihinin kayması hakediş, ceza ve müşteri ilişkileri açısından risk oluşturur."
        : "Kritik yol aktivitelerinde birikme yaşanırsa gecikme kısa sürede büyüyebilir.",
      recommendation: isLate
        ? `${recoverWorkers} kişilik takviye planlayın, bekleyen satın almaları onaylayın, mesai/vardiya seçeneklerini değerlendirin.`
        : "Proje planını revize edin ve engelleri ekiple birlikte belirleyin.",
      suggestedSteps: isLate
        ? [
            `Diğer projelerden ${recoverWorkers} kişilik takviye planlayın.`,
            "Bekleyen satın alma taleplerini onaylayın.",
            "Kritik yol için mesai/vardiya planı çıkarın.",
          ]
        : [
            "Kritik yol aktivitelerini yeniden listeleyin.",
            "Ekipten engel/darboğaz listesini isteyin.",
          ],
      topActionLabel: isLate
        ? `${String(top.p.name)} için ${recoverWorkers} kişilik takviye planla`
        : `${String(top.p.name)} planını revize et`,
      expectedImpact: isLate
        ? `Yaklaşık ${Math.max(2, Math.round(top.slip / 3))} takvim günü kazanım`
        : "İlerleme temposunda görünürlük artışı",
      actions: [
        makeAction(`proj-recover-${top.p.id}`, "Görev Oluştur", "create_task", {
          priority: "high",
          payload: {
            title: `${String(top.p.name)} — plan gecikmesi kurtarma aksiyonu`,
            projectId: String(top.p.id),
            priority: "high",
          },
        }),
        makeAction(`proj-personnel-${top.p.id}`, "Personel Planla", "open_personnel"),
        makeAction(`proj-purchase-${top.p.id}`, "Satın Alma Aç", "create_purchase_request", {
          priority: "high",
          payload: { projectId: String(top.p.id) },
        }),
        makeAction(`proj-open-${top.p.id}`, "Projeyi Aç", "open_project", {
          payload: { projectId: String(top.p.id) },
        }),
      ],
    });
  }


  // Budget overrun risk (if budget field exists)
  for (const p of activeProjects) {
    const budget = Number((p as Row).budget || 0);
    const spent = Number((p as Row).spent || (p as Row).actual_cost || 0);
    const prog = Number(p.progress || 0);
    if (budget > 0 && spent > 0 && prog > 0) {
      const burnRate = spent / (prog / 100);
      if (burnRate > budget * 1.1) {
        insights.push({
          id: `project-budget-${String(p.id)}`,
          kind: "risk",
          domain: "projects",
          priority: burnRate > budget * 1.25 ? "high" : "medium",
          title: `${String(p.name)} bütçeyi aşma riski taşıyor`,
          detail: `Tahmini tamamlanma maliyeti ${fmtTRY(burnRate)} / Bütçe ${fmtTRY(budget)}`,
          actions: [
            makeAction(`proj-budget-${p.id}`, "Projeyi aç", "open_project", {
              payload: { projectId: String(p.id) },
            }),
          ],
        });
        break;
      }
    }
  }

  // ───────────────────────── PERSONNEL ─────────────────────────
  const activeWorkersToday = input.workerAttendanceToday.reduce(
    (s, w) => s + (w.entry_type === "team" ? Number(w.team_size || 1) : 1),
    0
  );
  const personnelCount = input.personnel?.length ?? 0;

  if (personnelCount > 0 && activeWorkersToday === 0) {
    insights.push({
      id: "attendance-none",
      kind: "risk",
      domain: "personnel",
      priority: "high",
      title: "Bugün sahada kayıtlı personel girişi yok",
      detail: `${personnelCount} kayıtlı personel · 0 giriş`,
      recommendation:
        "QR devam sistemini kontrol edin veya ekip liderleriyle iletişime geçin.",
      actions: [
        makeAction("attendance-open", "Ekip takibini aç", "open_personnel"),
      ],
    });
  } else if (
    personnelCount > 0 &&
    activeWorkersToday > 0 &&
    activeWorkersToday < personnelCount * 0.5
  ) {
    insights.push({
      id: "attendance-low",
      kind: "risk",
      domain: "personnel",
      priority: "medium",
      title: `Bugün sadece ${activeWorkersToday}/${personnelCount} personel sahada`,
      recommendation: "Devamsız personelleri kontrol edin.",
      actions: [
        makeAction("attendance-open-2", "Ekip takibini aç", "open_personnel"),
      ],
    });
  } else if (activeWorkersToday > 0) {
    insights.push({
      id: "attendance-ok",
      kind: "opportunity",
      domain: "personnel",
      priority: "low",
      title: `Bugün sahada ${activeWorkersToday} kişi aktif`,
    });
  }

  // ───────────────────────── PROCUREMENT ─────────────────────────
  const exitsByMat = new Map<string, { qty: number; days: Set<string> }>();
  for (const e of input.materialExits) {
    const key = String(e.material_id);
    if (!exitsByMat.has(key)) exitsByMat.set(key, { qty: 0, days: new Set() });
    const rec = exitsByMat.get(key)!;
    rec.qty += Number(e.quantity || 0);
    if (e.exit_date) rec.days.add(String(e.exit_date).slice(0, 10));
  }

  const materialsRunOut14: { name: string; days: number }[] = [];
  const criticalStock: string[] = [];
  for (const m of input.materials) {
    const min = Number(m.min_stock || 0);
    const stock = Number((m as Row).current_stock || (m as Row).stock || 0);
    const rec = exitsByMat.get(String(m.id));
    const consumedPerDay = rec ? rec.qty / 30 : 0;
    if (min > 0 && rec && rec.qty >= min * 1.5) {
      criticalStock.push(String(m.name));
    }
    if (stock > 0 && consumedPerDay > 0) {
      const daysLeft = stock / consumedPerDay;
      if (daysLeft <= 14) {
        materialsRunOut14.push({ name: String(m.name), days: Math.round(daysLeft) });
      }
    }
  }
  if (criticalStock.length > 0) {
    insights.push({
      id: "stock-critical-ops",
      kind: "risk",
      domain: "procurement",
      priority: "high",
      title: `${criticalStock.length} malzeme kritik tüketim seviyesinde`,
      detail: criticalStock.slice(0, 3).join(", "),
      actions: [
        makeAction("stock-open", "Envanteri aç", "open_inventory"),
        makeAction("stock-purchase", "Satın alma talebi aç", "create_purchase_request", {
          priority: "high",
        }),
      ],
    });
  }
  if (materialsRunOut14.length > 0) {
    const soon = materialsRunOut14.sort((a, b) => a.days - b.days).slice(0, 3);
    // Suggested reorder ~= 14 days of consumption for the most urgent item.
    const urgent = soon[0];
    const urgentMat = input.materials.find((m) => String(m.name) === urgent.name);
    const rec = urgentMat ? exitsByMat.get(String(urgentMat.id)) : null;
    const perDay = rec ? rec.qty / 30 : 0;
    const requirement = Math.ceil(perDay * 14);
    const suggested = Math.ceil(requirement * 1.1);
    const unit = urgentMat ? String((urgentMat as Row).unit || "") : "";
    insights.push({
      id: "stock-runout-14",
      kind: "risk",
      domain: "procurement",
      priority: urgent.days <= 7 ? "high" : "medium",
      title: `${urgent.name} stoğu ~${urgent.days} gün içinde tükenebilir`,
      detail: soon.map((s) => `${s.name} (~${s.days} gün)`).join(", "),
      cause:
        "Son 30 günlük tüketim hızı, mevcut stok seviyesinin altında bir gün sayısına işaret ediyor.",
      impact:
        "Malzeme kesintisi kritik yol aktivitelerini durdurabilir; işçilik verimi düşer.",
      recommendation:
        requirement > 0
          ? `Tahmini ihtiyaç ${requirement} ${unit}; ~${suggested} ${unit} siparişi önerilir.`
          : "Kritik malzemeler için satın alma talebi açın ve tedarikçileri karşılaştırın.",
      suggestedSteps: [
        "Kritik malzemelerin gerçek stok sayımını doğrulayın.",
        "Onaylı tedarikçilerden hızlı teklif alın.",
        "Satın alma talebini bugün açın.",
      ],
      topActionLabel:
        requirement > 0
          ? `${urgent.name}: ~${suggested} ${unit} satın alma talebi aç`
          : `${urgent.name} için satın alma talebi aç`,
      expectedImpact: "Kritik yol kesintisinin önlenmesi",
      actions: [
        makeAction("stock-purchase-run", "Talep Oluştur", "create_purchase_request", {
          priority: "high",
        }),
        makeAction("stock-purchase-open", "Satın Alma Aç", "create_purchase_request"),
        makeAction("stock-suppliers", "Tedarikçileri Gör", "open_report"),
        makeAction("stock-open-2", "Envanteri Aç", "open_inventory"),
      ],
    });
  }


  // ───────────────────────── TASKS ─────────────────────────
  const openTasks = input.tasks.filter(
    (t) => t.status !== "done" && t.status !== "completed"
  );
  const tasksDueToday = openTasks.filter((t) => {
    const dd = t.due_date ? new Date(String(t.due_date)) : null;
    return dd && startOfDay(dd).getTime() === now.getTime();
  });
  const tasksOverdue = openTasks.filter((t) => {
    const dd = t.due_date ? new Date(String(t.due_date)) : null;
    return dd && dd < now;
  });

  if (tasksOverdue.length > 0) {
    insights.push({
      id: "tasks-overdue-ops",
      kind: "priority",
      domain: "tasks",
      priority: tasksOverdue.length >= 5 ? "high" : "medium",
      title: `${tasksOverdue.length} görev gecikti`,
      recommendation: "Gecikmiş görevleri yeniden önceliklendirin.",
      actions: [makeAction("tasks-open", "Görevleri aç", "open_task")],
    });
  }
  if (tasksDueToday.length > 0) {
    insights.push({
      id: "tasks-today-ops",
      kind: "priority",
      domain: "tasks",
      priority: "medium",
      title: `${tasksDueToday.length} görev bugün teslim`,
      detail: tasksDueToday
        .slice(0, 3)
        .map((t) => String(t.title || ""))
        .join(" · "),
      actions: [makeAction("tasks-open-2", "Görevleri aç", "open_task")],
    });
  }

  // Cash-side priority for today
  const paymentsToday = input.subPayments.filter((p) => {
    if (p.status === "odendi") return false;
    const pd = p.planned_date ? new Date(String(p.planned_date)) : null;
    return pd && startOfDay(pd).getTime() === now.getTime();
  });
  if (paymentsToday.length > 0) {
    const total = paymentsToday.reduce((s, p) => s + Number(p.amount || 0), 0);
    insights.push({
      id: "priority-pay-today",
      kind: "priority",
      domain: "finance",
      priority: "high",
      title: `Bugün ${paymentsToday.length} ödeme planlı — ${fmtTRY(total)}`,
      actions: [makeAction("pay-open", "Ödemeleri aç", "open_payment")],
    });
  }

  // ───────────────────────── SORT & SUMMARIZE ─────────────────────────
  const sorted = [...insights].sort(
    (a, b) => priorityWeight[a.priority] - priorityWeight[b.priority]
  );

  const risks = sorted.filter((i) => i.kind === "risk");
  const opps = sorted.filter((i) => i.kind === "opportunity");
  const prios = sorted.filter((i) => i.kind === "priority");

  const topInsight = sorted[0] ?? null;
  const headline = topInsight
    ? topInsight.priority === "critical"
      ? `Bugün dikkat: ${topInsight.title}.`
      : `Bugünün odak konusu: ${topInsight.title}.`
    : null;

  return {
    topInsight,
    topRisks: risks.slice(0, 3),
    topOpportunities: opps.slice(0, 3),
    todayPriorities: prios.slice(0, 5),
    all: sorted,
    headline,
  };
}
