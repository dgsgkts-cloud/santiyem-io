// Purchase-request approval policy — who may approve, self-approval rule and
// the Turkish copy helpers used by dialogs, cards and toasts.
//
// Approver source of truth = existing company access model (`office_members`
// + `project_members` surfaced through useCompanyUsers). No new role table.
//
// SELF-APPROVAL RULE (enforced consistently everywhere):
//   Only the company owner (company_owner) may approve their own request.
//   Every other role is excluded from its own approver list.
import type { AccessRoleId, UserStatus } from "@/lib/companyAccess";

export interface ApproverCandidate {
  userId: string;
  name: string;
  role: AccessRoleId;
  roleLabel: string;
  /** "Şirket geneli" or project names */
  scopeLabel: string;
  isSelf: boolean;
  status: UserStatus;
}

/** Roles whose members may approve a purchase request. */
export const APPROVER_ROLES: AccessRoleId[] = [
  "company_owner",
  "company_member",
  "manager",
];

export const ROLE_APPROVAL_LABEL: Partial<Record<AccessRoleId, string>> = {
  company_owner: "Şirket Sahibi",
  company_member: "Yönetici",
  manager: "Proje Yöneticisi",
};

export const SELF_APPROVAL_ROLES: AccessRoleId[] = ["company_owner"];

export const NO_APPROVER_MESSAGE =
  "Bu talep için uygun bir onaylayıcı bulunamadı.";

/** Turkish possessive suffix: "Doğuş Göktaş" → "Doğuş Göktaş'ın" */
export function possessive(name: string): string {
  const clean = (name || "").trim();
  if (!clean) return "";
  const lower = clean.toLocaleLowerCase("tr-TR");
  const vowels = "aeıioöuü";
  let last = "";
  for (let i = lower.length - 1; i >= 0; i--) {
    if (vowels.includes(lower[i])) {
      last = lower[i];
      break;
    }
  }
  const back = "aı".includes(last) ? "ın" : "ei".includes(last) ? "in" : "ou".includes(last) ? "un" : "öü".includes(last) ? "ün" : "ın";
  const endsWithVowel = vowels.includes(lower[lower.length - 1]);
  return `${clean}'${endsWithVowel ? "n" : ""}${back}`;
}

/** Dative suffix: "Doğuş Göktaş" → "Doğuş Göktaş'a" */
export function dative(name: string): string {
  const clean = (name || "").trim();
  if (!clean) return "";
  const lower = clean.toLocaleLowerCase("tr-TR");
  const vowels = "aeıioöuü";
  let last = "a";
  for (let i = lower.length - 1; i >= 0; i--) {
    if (vowels.includes(lower[i])) {
      last = lower[i];
      break;
    }
  }
  const suffix = "aıou".includes(last) ? "a" : "e";
  return `${clean}'${suffix}`;
}

/** Contextual submit-button copy (spec §4). */
export function submitButtonCopy(approverName?: string | null, roleLabel?: string | null) {
  if (approverName) return `${dative(approverName)} Onaya Gönder`;
  if (roleLabel) return `${roleLabel} Onayına Gönder`;
  return "Yönetici Onayına Gönder";
}

/** Success toast copy (spec §5). */
export function submitSuccessCopy(approverName?: string | null, roleLabel?: string | null) {
  if (approverName) return `Talep ${possessive(approverName)} onayına gönderildi.`;
  return `Talep ${(roleLabel ?? "yönetici").toLocaleLowerCase("tr-TR")} onayına gönderildi.`;
}

/** Card / detail status copy (spec §6). */
export function approvalStatusLabel(opts: {
  status: string;
  approverName?: string | null;
  approverRoleLabel?: string | null;
}): string {
  if (opts.status !== "Onay Bekliyor") return opts.status;
  if (opts.approverName) return `${possessive(opts.approverName)} Onayında`;
  if (opts.approverRoleLabel) return `${opts.approverRoleLabel} Onayı Bekleniyor`;
  return "Onay Bekliyor";
}
