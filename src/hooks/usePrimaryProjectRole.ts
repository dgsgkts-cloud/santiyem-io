import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";
import type { ProjectRole } from "@/lib/projectPermissions";

// Higher number = more privileged. Used to pick a single "primary" role
// to drive global UI (bottom tab bar, drawer) when a user belongs to
// multiple projects with different roles.
const ROLE_RANK: Record<ProjectRole, number> = {
  owner: 100,
  manager: 90,
  accountant: 70,
  site_engineer: 60,
  subcontractor: 40,
  landowner: 30,
  worker: 10,
};

interface PrimaryRoleState {
  loading: boolean;
  /** Highest-privileged role across all of the user's project memberships. */
  role: ProjectRole | null;
  /** True if the user owns at least one project (covers backfill case). */
  ownsAnyProject: boolean;
}

export function usePrimaryProjectRole(): PrimaryRoleState {
  const { user, loading: userLoading } = useUser();
  const [state, setState] = useState<PrimaryRoleState>({
    loading: true,
    role: null,
    ownsAnyProject: false,
  });

  useEffect(() => {
    let cancelled = false;
    if (userLoading) return;
    if (!user) {
      setState({ loading: false, role: null, ownsAnyProject: false });
      return;
    }
    (async () => {
      const [{ data: members }, { data: owned }] = await Promise.all([
        supabase
          .from("project_members")
          .select("role")
          .eq("user_id", user.id),
        supabase
          .from("projects")
          .select("id")
          .eq("user_id", user.id)
          .limit(1),
      ]);
      if (cancelled) return;
      const ownsAnyProject = (owned?.length ?? 0) > 0;
      let best: ProjectRole | null = null;
      (members ?? []).forEach((m) => {
        const r = m.role as ProjectRole;
        if (!best || ROLE_RANK[r] > ROLE_RANK[best]) best = r;
      });
      if (!best && ownsAnyProject) best = "owner";
      setState({ loading: false, role: best, ownsAnyProject });
    })();
    return () => {
      cancelled = true;
    };
  }, [user, userLoading]);

  return state;
}
