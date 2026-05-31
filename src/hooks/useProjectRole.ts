import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";
import {
  hasPermission,
  type PermissionKey,
  type ProjectRole,
} from "@/lib/projectPermissions";

interface ProjectRoleState {
  loading: boolean;
  role: ProjectRole | null;
  overrides: Partial<Record<PermissionKey, boolean>>;
  isOwner: boolean;
  isManagerOrOwner: boolean;
  can: (key: PermissionKey) => boolean;
  refetch: () => Promise<void>;
}

/**
 * Returns the current user's role + permission overrides for the given
 * project. The owner short-circuits to true on every `can()` check.
 * If the user has no project_members row but owns the project itself, they
 * are treated as owner (backfill safety).
 */
export function useProjectRole(projectId: string | null | undefined): ProjectRoleState {
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<ProjectRole | null>(null);
  const [overrides, setOverrides] = useState<Partial<Record<PermissionKey, boolean>>>({});

  const fetchAll = useCallback(async () => {
    if (!user || !projectId) {
      setRole(null);
      setOverrides({});
      setLoading(false);
      return;
    }
    setLoading(true);

    const [{ data: member }, { data: project }, { data: perms }] = await Promise.all([
      supabase
        .from("project_members")
        .select("role")
        .eq("project_id", projectId)
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("projects")
        .select("user_id")
        .eq("id", projectId)
        .maybeSingle(),
      supabase
        .from("project_member_permissions")
        .select("permission_key, granted")
        .eq("project_id", projectId)
        .eq("user_id", user.id),
    ]);

    let effectiveRole: ProjectRole | null = (member?.role as ProjectRole) ?? null;
    if (!effectiveRole && project?.user_id === user.id) {
      effectiveRole = "owner";
    }
    setRole(effectiveRole);

    const ov: Partial<Record<PermissionKey, boolean>> = {};
    (perms ?? []).forEach((r) => {
      ov[r.permission_key as PermissionKey] = r.granted;
    });
    setOverrides(ov);
    setLoading(false);
  }, [user, projectId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const can = useCallback(
    (key: PermissionKey) => hasPermission(role, key, overrides),
    [role, overrides],
  );

  return {
    loading,
    role,
    overrides,
    isOwner: role === "owner",
    isManagerOrOwner: role === "owner" || role === "manager",
    can,
    refetch: fetchAll,
  };
}
