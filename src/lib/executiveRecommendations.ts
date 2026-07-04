import type { Finding, Severity } from "@/hooks/useExecutiveBrief";
import type { ActionDef, ActionPriority } from "./actionRegistry";

export interface RecommendedAction {
  priority: ActionPriority;
  why: string;
  recommendation: string;
  impact: string;
  actions: ActionDef[];
}

const priorityFromSeverity = (sev: Severity, id: string): ActionPriority => {
  if (sev === "critical") return "immediate";
  if (sev === "important") return id.includes("today") ? "today" : "this-week";
  return "optional";
};

const defaultActionsFor = (f: Finding): ActionDef[] => {
  const acts: ActionDef[] = [];
  if (f.action?.projectId) {
    acts.push({
      id: "view-project",
      label: "Aç",
      kind: "open-project",
      variant: "primary",
      payload: { projectId: f.action.projectId },
    });
  } else if (f.action?.tab) {
    acts.push({
      id: "view-tab",
      label: "Aç",
      kind: "open-tab",
      variant: "primary",
      payload: { tab: f.action.tab },
    });
  }
  acts.push({
    id: "create-task",
    label: "Görev Oluştur",
    kind: "create-task",
    confirm: true,
    payload: {
      title: f.title,
      dueDate: new Date().toISOString().slice(0, 10),
      priority: "high",
      projectId: f.action?.projectId,
    },
  });
  return acts;
};

/**
 * Enriches a Finding produced by useExecutiveBrief with human-readable
 * reasoning (why / what / impact) and the reusable action list rendered by
 * the ActionCard.  Executive Brief logic is NOT modified — this is a
 * presentation-layer enrichment keyed on the finding id.
 */
export function recommendFor(f: Finding): RecommendedAction {
  const base = {
    priority: priorityFromSeverity(f.severity, f.id),
    actions: defaultActionsFor(f),
  };

  // Match by id prefix so future finding ids inherit sensible defaults.
  if (f.id.startsWith("sub-overdue") || f.id === "overdue-checks") {
    return {
      ...base,
      why: "Ödeme vadesi geçti — tedarikçi güveni ve gecikme faizi riski oluşuyor.",
      recommendation: "Ödemeyi bugün tamamla; mümkün değilse tedarikçiyle net bir yeni tarih belirle.",
      impact: "Tedarik zinciri korunur, gecikme cezaları önlenir.",
      actions: [
        ...base.actions,
        {
          id: "wa",
          label: "WhatsApp",
          kind: "whatsapp",
          payload: { text: `Merhaba, ${f.title.toLowerCase()} hakkında bilgi almak istiyorum.` },
        },
        {
          id: "mail",
          label: "E-posta",
          kind: "email",
          payload: { subject: f.title, body: "Merhaba,\n\nÖdeme durumu için görüşmek isterim." },
        },
      ],
    };
  }

  if (f.id === "sub-today" || f.id === "upcoming-checks") {
    return {
      ...base,
      why: "Ödeme günü çok yakın — sonraki iş günlerine sarkarsa maliyet artar.",
      recommendation: "Bugün kasa akışını gözden geçir ve ödemeyi planla.",
      impact: "Ay sonu likidite tahmini bozulmaz.",
      actions: [
        ...base.actions,
        {
          id: "mail",
          label: "Muhasebeye Yönlendir",
          kind: "email",
          payload: { subject: f.title, body: "Bugün ödenecek kalem için lütfen kasa hazırlığı yapalım." },
        },
      ],
    };
  }

  if (f.id === "hakedis-pending" || f.id === "hakedis-rejected") {
    return {
      ...base,
      why: "Onay bekleyen hakediş, tahsilat takvimini geciktiriyor.",
      recommendation: "Müşteriyle görüş, gerekiyorsa revize et ve yeniden onaya gönder.",
      impact: "Nakit girişi hızlanır, işletme sermayesi rahatlar.",
      actions: [
        ...base.actions,
        { id: "wa", label: "Müşteriyi Ara", kind: "whatsapp", payload: { text: `${f.title} hakkında görüşebilir miyiz?` } },
      ],
    };
  }

  if (f.id === "cash-shortfall") {
    return {
      ...base,
      why: "Kasa, yaklaşan 7 günün ödemelerini karşılamıyor.",
      recommendation: "Bekleyen tahsilatları hızlandır; kritik ödemeler için nakit planı çıkar.",
      impact: "Ödemeler aksamaz, tedarikçi ilişkileri korunur.",
      actions: [
        ...base.actions,
        { id: "receivables", label: "Tahsilatları Aç", kind: "open-tab", payload: { tab: "payments-kasa" } },
        { id: "report", label: "Tahsilat Raporu", kind: "export-pdf" },
      ],
    };
  }

  if (f.id === "stock-critical") {
    return {
      ...base,
      why: "Son 30 günün tüketim hızı, minimum stok eşiğini geçiyor — kısa sürede tükenebilir.",
      recommendation: "24 saat içinde satın alma talebi oluştur; alternatif tedarikçilerden teklif iste.",
      impact: "Sahada malzeme beklemesi kaynaklı iş gücü kaybı önlenir.",
      actions: [
        ...base.actions,
        {
          id: "wa-purchasing",
          label: "Satın Almayı Bilgilendir",
          kind: "whatsapp",
          payload: { text: `${f.title} — acil satın alma talebi.` },
        },
      ],
    };
  }

  if (f.id === "tasks-overdue" || f.id === "tasks-today") {
    return {
      ...base,
      why: "Açık görevler birikirse ekipler önceliği kaybediyor.",
      recommendation: "Sorumluları netleştir, gerekiyorsa vadeleri güncelle.",
      impact: "Ekip odağı korunur, kritik işler zamanında biter.",
      actions: base.actions,
    };
  }

  if (f.id.startsWith("project-late-")) {
    return {
      ...base,
      why: "Proje süresi doldu ancak ilerleme %100 değil — teslim tarihi riske girdi.",
      recommendation: "Ek iş gücü planla veya kalan iş kalemlerini paralel yürüt.",
      impact: "Gecikme cezası riski azalır, müşteri güveni korunur.",
      actions: [
        ...base.actions,
        { id: "meeting", label: "Toplantı Aç", kind: "open-tab", payload: { tab: "meetings" } },
      ],
    };
  }

  if (f.id === "expense-spike") {
    return {
      ...base,
      why: "Aylık gider trendi belirgin şekilde arttı.",
      recommendation: "Kategori bazında hangi kalemin arttığını incele; onay eşiği devreye al.",
      impact: "Kâr marjı korunur, sürpriz maliyet önlenir.",
      actions: base.actions,
    };
  }

  // Fallback
  return {
    ...base,
    why: f.detail || "Bu bulgu dikkat gerektiriyor.",
    recommendation: "Ayrıntıları incele ve gerekli aksiyonu al.",
    impact: "Operasyon sürekliliği korunur.",
    actions: base.actions,
  };
}
