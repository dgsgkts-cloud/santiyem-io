// Company health ("Firma Sağlığı") — access model + explainability helpers.
//
// The score itself is NEVER computed on the client. `get_company_health()` on
// the server resolves the caller's permissions (company owner / manager /
// accountant / project member) and returns only the sections that person may
// see, plus the factors and data-completeness used to build the score.
// The client only formats what the server already allowed.

export type CompanyHealthScope = "company" | "project" | "none";

export interface CompanyHealthAccess {
  scope: CompanyHealthScope;
  can_view: boolean;
  financial?: boolean;
  projects?: boolean;
  procurement?: boolean;
  personnel?: boolean;
  can_export?: boolean;
  owner_id?: string | null;
  team_id?: string | null;
  project_ids?: string[];
  role?: string | null;
  reason?: string;
}

export interface CompanyHealthFactor {
  key: string;
  label: string;
  weight: number;
  section: CompanyHealthSection;
  detail: string;
}

export type CompanyHealthSection = "financial" | "projects" | "procurement" | "personnel";

export interface CompanyHealthPayload {
  access: CompanyHealthAccess;
  generated_at: string;
  score: number | null;
  computable: boolean;
  completeness: { present: number; expected: number; ratio: number };
  factors: CompanyHealthFactor[];
  sections: {
    financial?: {
      cash_on_hand: number;
      cash_accounts: number;
      overdue_payables: number;
      overdue_count: number;
      checks_due_30d: number;
      open_receivables: number;
      has_data: boolean;
    };
    projects?: {
      total: number;
      active: number;
      with_budget: number;
      over_budget: number;
      avg_progress: number;
      has_data: boolean;
    };
    procurement?: {
      orders: number;
      open_orders: number;
      unmatched_invoices: number;
      has_data: boolean;
    };
    personnel?: {
      active_personnel: number;
      diary_last_7_days: number;
      has_data: boolean;
    };
  };
}

export const SECTION_LABELS: Record<CompanyHealthSection, string> = {
  financial: "Finans",
  projects: "Projeler",
  procurement: "Satın Alma",
  personnel: "Saha & Personel",
};

export const SCOPE_LABELS: Record<CompanyHealthScope, string> = {
  company: "Şirket geneli",
  project: "Yetkili olduğunuz projeler",
  none: "Erişim yok",
};

export const DENIED_MESSAGE =
  "Firma sağlığı verilerini görüntüleme yetkiniz bulunmuyor. Bu bilgiler yalnızca şirket yönetimi ve yetkilendirilmiş yöneticiler tarafından görülebilir.";

export const NOT_COMPUTABLE_MESSAGE =
  "Skor hesaplanamadı: kasa, ödeme veya proje kaydı henüz yeterli değil. Veri girdikçe skor otomatik oluşur.";

export function scoreTone(score: number): "good" | "warn" | "alert" {
  return score >= 80 ? "good" : score >= 60 ? "warn" : "alert";
}

export function scoreLabel(score: number): string {
  return score >= 80 ? "Sağlıklı" : score >= 60 ? "Dikkat" : "Kritik";
}

/** Plain-language sentence explaining how complete the underlying data is. */
export function completenessCopy(c: CompanyHealthPayload["completeness"]): string {
  if (!c || c.expected === 0) return "Veri kaynağı bulunamadı.";
  if (c.present >= c.expected) return "Tüm veri kaynakları hesaplamaya dahil edildi.";
  return `${c.present}/${c.expected} veri kaynağı hesaplamaya dahil edildi; eksik alanlar skoru düşürmedi.`;
}

/** Single-sentence summary used by cards and the Voice AI page context. */
export function healthSummarySentence(payload: CompanyHealthPayload): string {
  if (!payload.computable || payload.score === null) return NOT_COMPUTABLE_MESSAGE;
  const parts = [
    `Firma sağlık skoru ${payload.score}/100 (${scoreLabel(payload.score)}), kapsam: ${
      SCOPE_LABELS[payload.access.scope]
    }.`,
  ];
  const f = payload.sections.financial;
  if (f?.has_data) {
    parts.push(
      `Nakit ${Math.round(f.cash_on_hand).toLocaleString("tr-TR")} ₺, vadesi geçmiş ${
        f.overdue_count
      } ödeme (${Math.round(f.overdue_payables).toLocaleString("tr-TR")} ₺).`
    );
  }
  const p = payload.sections.projects;
  if (p?.has_data) {
    parts.push(`${p.active} aktif proje, ${p.over_budget} proje bütçe aşımında.`);
  }
  return parts.join(" ");
}

export function voiceHealthContext(payload: CompanyHealthPayload | null, canView: boolean): string {
  if (!canView || !payload) {
    return "FİRMA SAĞLIĞI: Kullanıcının firma sağlığı verilerine erişim yetkisi yok. Skor, nakit, borç veya bütçe rakamı paylaşma; yetki gerektiğini söyle.";
  }
  return `FİRMA SAĞLIĞI (yetkili): ${healthSummarySentence(payload)} Yalnızca bu rakamları kullan, tahmin üretme.`;
}
