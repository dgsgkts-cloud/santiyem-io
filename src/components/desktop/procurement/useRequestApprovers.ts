// Resolves the valid approver list for a purchase request from the existing
// company access model. No new tables: `useCompanyUsers` already reads
// office_members / project_members / invitations under RLS.
import { useMemo } from "react";
import { useUser } from "@/contexts/UserContext";
import { useCompanyUsers } from "@/hooks/useCompanyUsers";
import {
  APPROVER_ROLES,
  ROLE_APPROVAL_LABEL,
  SELF_APPROVAL_ROLES,
  type ApproverCandidate,
} from "./approvalPolicy";
import type { Request } from "./procurementConstants";

export interface ApproverResolution {
  loading: boolean;
  candidates: ApproverCandidate[];
  /** auto-selected when there is exactly one valid approver */
  auto: ApproverCandidate | null;
  /** may the current user pick a different approver than the auto one */
  canChange: boolean;
  selfApprovalAllowed: boolean;
}

export function useRequestApprovers(request: Request | null): ApproverResolution {
  const { user } = useUser();
  const { users, projects, loading } = useCompanyUsers();

  return useMemo(() => {
    const projectName = (id: string) =>
      projects.find((p) => p.id === id)?.name ?? "Proje";

    const myRoles = users.filter((u) => u.isSelf).map((u) => u.role);
    const selfApprovalAllowed = myRoles.some((r) => SELF_APPROVAL_ROLES.includes(r));

    const candidates: ApproverCandidate[] = users
      .filter((u) => !!u.userId)
      .filter((u) => u.status === "active") // invited / expired / suspended excluded
      .filter((u) => APPROVER_ROLES.includes(u.role))
      .filter((u) => (u.userId === user?.id ? selfApprovalAllowed : true))
      .filter((u) => {
        // scope: company roles always valid, project roles only on their projects
        if (u.role === "company_owner" || u.role === "company_member") return true;
        if (!request?.projectId) return u.projectIds.length > 0;
        return u.projectIds.includes(request.projectId);
      })
      .map((u) => ({
        userId: u.userId as string,
        name: u.name,
        role: u.role,
        roleLabel: ROLE_APPROVAL_LABEL[u.role] ?? "Yönetici",
        scopeLabel:
          u.role === "company_owner" || u.role === "company_member"
            ? "Şirket geneli"
            : u.projectIds.map(projectName).slice(0, 2).join(", ") || "Proje",
        isSelf: u.userId === user?.id,
        status: u.status,
      }))
      // dedupe by user (a person can hold both a company and a project row)
      .filter((c, i, arr) => arr.findIndex((x) => x.userId === c.userId) === i)
      .sort((a, b) => APPROVER_ROLES.indexOf(a.role) - APPROVER_ROLES.indexOf(b.role));

    return {
      loading,
      candidates,
      auto: candidates.length === 1 ? candidates[0] : null,
      canChange: candidates.length > 1,
      selfApprovalAllowed,
    };
  }, [users, projects, loading, request?.projectId, user?.id]);
}
