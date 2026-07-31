import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";
import { useOrgPlan, effectiveLimit } from "@/hooks/useOrgPlan";
import { toast } from "sonner";
import type { PermissionKey, ProjectRole } from "@/lib/projectPermissions";
import { isProjectRole, type AccessRoleId, type UserStatus } from "@/lib/companyAccess";

export interface AccessProject {
  id: string;
  name: string;
  status: string | null;
  location: string | null;
  ownerId: string;
}

export interface CompanyUser {
  key: string;
  kind: "member" | "invitation";
  /** office_members.id when the person is a company member */
  memberId: string | null;
  /** office_invitations.id / project_invitations.id */
  invitationId: string | null;
  invitationScope: "company" | "project" | null;
  invitationToken: string | null;
  userId: string | null;
  name: string;
  email: string | null;
  title: string | null;
  status: UserStatus;
  role: AccessRoleId;
  isCompanyMember: boolean;
  isOwner: boolean;
  isSelf: boolean;
  projectIds: string[];
  projectRoles: Record<string, ProjectRole>;
  joinedAt: string | null;
  invitedAt: string | null;
  expiresAt: string | null;
}

export interface SeatInfo {
  limit: number | null;
  used: number;
  invited: number;
  free: number | null;
  full: boolean;
}

interface InvitePayload {
  fullName: string;
  email: string;
  role: AccessRoleId;
  projectIds: string[];
  message?: string;
}

const INVITE_DAYS = 14;

export function useCompanyUsers() {
  const { user } = useUser();
  const { summary } = useOrgPlan();
  const [loading, setLoading] = useState(true);
  const [teamId, setTeamId] = useState<string | null>(null);
  const [teamOwnerId, setTeamOwnerId] = useState<string | null>(null);
  const [users, setUsers] = useState<CompanyUser[]>([]);
  const [projects, setProjects] = useState<AccessProject[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);

    // projects visible to me (own, team, membership) — RLS scoped
    const { data: projectRows } = await supabase
      .from("projects")
      .select("id, name, status, location, user_id")
      .order("created_at", { ascending: false });
    const projectList: AccessProject[] = (projectRows ?? []).map(p => ({
      id: p.id as string,
      name: (p.name as string) ?? "İsimsiz proje",
      status: (p.status as string) ?? null,
      location: (p.location as string) ?? null,
      ownerId: p.user_id as string,
    }));
    setProjects(projectList);
    const projectIds = projectList.map(p => p.id);

    // my company team
    const { data: myMembership } = await supabase
      .from("office_members")
      .select("team_id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();
    const tid = (myMembership?.team_id as string | undefined) ?? null;
    setTeamId(tid);

    let members: any[] = [];
    let companyInvites: any[] = [];
    if (tid) {
      const [{ data: teamRow }, { data: memberRows }, { data: inviteRows }] = await Promise.all([
        supabase.from("office_teams").select("id, owner_id, name").eq("id", tid).maybeSingle(),
        supabase.from("office_members").select("*").eq("team_id", tid),
        supabase.from("office_invitations").select("*").eq("team_id", tid).eq("status", "pending"),
      ]);
      setTeamOwnerId((teamRow?.owner_id as string | undefined) ?? null);
      members = memberRows ?? [];
      companyInvites = inviteRows ?? [];
    } else {
      setTeamOwnerId(user.id);
    }

    // project-scoped people
    const [{ data: pmRows }, { data: piRows }] = projectIds.length
      ? await Promise.all([
          supabase.from("project_members").select("id, project_id, user_id, role").in("project_id", projectIds),
          supabase
            .from("project_invitations")
            .select("id, project_id, email, role, status, token, created_at, expires_at")
            .in("project_id", projectIds)
            .eq("status", "pending"),
        ])
      : [{ data: [] as any[] }, { data: [] as any[] }];

    const projectMembers = (pmRows ?? []).filter(m => m.role !== "owner");
    const projectInvites = piRows ?? [];

    // profiles for everyone we know
    const ids = Array.from(
      new Set<string>([
        user.id,
        ...members.map((m: any) => m.user_id as string),
        ...projectMembers.map((m: any) => m.user_id as string),
      ]),
    );
    const { data: profileRows } = await supabase
      .from("profiles")
      .select("user_id, full_name, title, email")
      .in("user_id", ids);
    const profileMap = new Map((profileRows ?? []).map((p: any) => [p.user_id, p]));

    const projectsOf = (uid: string) =>
      projectMembers.filter((m: any) => m.user_id === uid);

    const rows: CompanyUser[] = [];

    // 1. company members
    for (const m of members) {
      const uid = m.user_id as string;
      const profile = profileMap.get(uid);
      const owner = (m.role as string) === "owner";
      const mine = projectsOf(uid);
      rows.push({
        key: `member:${m.id}`,
        kind: "member",
        memberId: m.id as string,
        invitationId: null,
        invitationScope: null,
        invitationToken: null,
        userId: uid,
        name: profile?.full_name || profile?.email || "İsimsiz kullanıcı",
        email: profile?.email ?? null,
        title: profile?.title ?? null,
        status: (m.status as string) === "suspended" ? "suspended" : "active",
        role: owner ? "company_owner" : "company_member",
        isCompanyMember: true,
        isOwner: owner,
        isSelf: uid === user.id,
        projectIds: mine.map((x: any) => x.project_id as string),
        projectRoles: Object.fromEntries(mine.map((x: any) => [x.project_id, x.role as ProjectRole])),
        joinedAt: (m.joined_at as string) ?? null,
        invitedAt: null,
        expiresAt: null,
      });
    }

    // owner fallback: no team row yet → I am the (implicit) company owner
    if (!tid) {
      const profile = profileMap.get(user.id);
      rows.push({
        key: `member:self`,
        kind: "member",
        memberId: null,
        invitationId: null,
        invitationScope: null,
        invitationToken: null,
        userId: user.id,
        name: profile?.full_name || user.email || "Hesabım",
        email: profile?.email ?? user.email ?? null,
        title: profile?.title ?? null,
        status: "active",
        role: "company_owner",
        isCompanyMember: true,
        isOwner: true,
        isSelf: true,
        projectIds: [],
        projectRoles: {},
        joinedAt: null,
        invitedAt: null,
        expiresAt: null,
      });
    }

    // 2. project-only members (not in the company team)
    const companyUserIds = new Set(rows.map(r => r.userId));
    const projectOnly = new Map<string, any[]>();
    for (const m of projectMembers) {
      const uid = m.user_id as string;
      if (companyUserIds.has(uid)) continue;
      projectOnly.set(uid, [...(projectOnly.get(uid) ?? []), m]);
    }
    for (const [uid, list] of projectOnly) {
      const profile = profileMap.get(uid);
      rows.push({
        key: `project-member:${uid}`,
        kind: "member",
        memberId: null,
        invitationId: null,
        invitationScope: null,
        invitationToken: null,
        userId: uid,
        name: profile?.full_name || profile?.email || "İsimsiz kullanıcı",
        email: profile?.email ?? null,
        title: profile?.title ?? null,
        status: "active",
        role: (list[0].role as ProjectRole) ?? "worker",
        isCompanyMember: false,
        isOwner: false,
        isSelf: uid === user.id,
        projectIds: list.map((x: any) => x.project_id as string),
        projectRoles: Object.fromEntries(list.map((x: any) => [x.project_id, x.role as ProjectRole])),
        joinedAt: null,
        invitedAt: null,
        expiresAt: null,
      });
    }

    // 3. pending company invitations
    for (const inv of companyInvites) {
      const expired = inv.expires_at ? new Date(inv.expires_at) < new Date() : false;
      rows.push({
        key: `company-invite:${inv.id}`,
        kind: "invitation",
        memberId: null,
        invitationId: inv.id as string,
        invitationScope: "company",
        invitationToken: (inv.token as string) ?? null,
        userId: null,
        name: (inv.email as string) ?? "",
        email: (inv.email as string) ?? null,
        title: null,
        status: expired ? "expired" : "invited",
        role: "company_member",
        isCompanyMember: false,
        isOwner: false,
        isSelf: false,
        projectIds: [],
        projectRoles: {},
        joinedAt: null,
        invitedAt: (inv.created_at as string) ?? null,
        expiresAt: (inv.expires_at as string) ?? null,
      });
    }

    // 4. pending project invitations (grouped per e-mail)
    const byEmail = new Map<string, any[]>();
    for (const inv of projectInvites) {
      const mail = ((inv.email as string) ?? "").toLowerCase();
      if (!mail) continue;
      byEmail.set(mail, [...(byEmail.get(mail) ?? []), inv]);
    }
    for (const [mail, list] of byEmail) {
      if (rows.some(r => (r.email ?? "").toLowerCase() === mail)) continue;
      const expired = list.every((i: any) => new Date(i.expires_at) < new Date());
      rows.push({
        key: `project-invite:${mail}`,
        kind: "invitation",
        memberId: null,
        invitationId: list[0].id as string,
        invitationScope: "project",
        invitationToken: (list[0].token as string) ?? null,
        userId: null,
        name: mail,
        email: mail,
        title: null,
        status: expired ? "expired" : "invited",
        role: (list[0].role as ProjectRole) ?? "worker",
        isCompanyMember: false,
        isOwner: false,
        isSelf: false,
        projectIds: list.map((i: any) => i.project_id as string),
        projectRoles: Object.fromEntries(list.map((i: any) => [i.project_id, i.role as ProjectRole])),
        joinedAt: null,
        invitedAt: (list[0].created_at as string) ?? null,
        expiresAt: (list[0].expires_at as string) ?? null,
      });
    }

    setUsers(rows);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const isOwner = !!user && (teamOwnerId === user.id || teamId === null);

  const seats: SeatInfo = useMemo(() => {
    const spec = effectiveLimit(summary, "users");
    const rawLimit = spec?.limit ?? null;
    const limit = rawLimit === null || rawLimit < 0 ? null : rawLimit;
    // Real seat usage = company members (owner included) + pending company invites.
    const used = Math.max(users.filter(u => u.isCompanyMember).length, 1);
    const invited = users.filter(u => u.status === "invited" && u.invitationScope === "company").length;
    const free = limit === null ? null : Math.max(limit - used - invited, 0);
    return { limit, used, invited, free, full: limit !== null && used + invited >= limit };
  }, [summary, users]);

  const ensureTeam = useCallback(async (): Promise<string | null> => {
    if (!user) return null;
    if (teamId) return teamId;
    const { data: team, error } = await supabase
      .from("office_teams")
      .insert({ owner_id: user.id, name: "Şirketim" })
      .select()
      .single();
    if (error || !team) { toast.error("Şirket ekibi oluşturulamadı."); return null; }
    const { error: memberError } = await supabase
      .from("office_members")
      .insert({ team_id: team.id, user_id: user.id, role: "owner" });
    if (memberError) { toast.error("Şirket ekibi oluşturulamadı."); return null; }
    setTeamId(team.id as string);
    setTeamOwnerId(user.id);
    return team.id as string;
  }, [user, teamId]);

  const inviteUser = useCallback(async (payload: InvitePayload): Promise<boolean> => {
    if (!user) return false;
    const email = payload.email.trim().toLowerCase();
    if (!isOwner) { toast.error("Kullanıcı davet etme yetkiniz yok."); return false; }

    const existing = users.find(u => (u.email ?? "").toLowerCase() === email);
    if (existing) {
      toast.error(
        existing.status === "invited"
          ? "Bu e-posta için bekleyen bir davet var."
          : "Bu kullanıcı ekibinizde zaten mevcut.",
      );
      return false;
    }

    const companyScope = payload.role === "company_member";
    if (companyScope && seats.full) {
      toast.error(`Kullanıcı sınırına ulaştınız (${seats.used}/${seats.limit}).`);
      return false;
    }

    setBusy(true);
    try {
      if (companyScope) {
        const tid = await ensureTeam();
        if (!tid) return false;
        const { error } = await supabase.from("office_invitations").insert({
          team_id: tid,
          email,
          role: "editor",
          invited_by: user.id,
        });
        if (error) {
          toast.error(
            error.code === "23505"
              ? "Bu e-posta için bekleyen bir davet var."
              : "Davet oluşturulamadı.",
          );
          return false;
        }
        // optional project assignments for the new company member
        if (payload.projectIds.length) {
          await supabase.from("project_invitations").insert(
            payload.projectIds.map(pid => ({
              project_id: pid,
              email,
              role: "manager" as ProjectRole,
              invited_by: user.id,
            })),
          );
        }
      } else {
        if (!payload.projectIds.length) {
          toast.error("Bu rol için en az bir proje seçmelisiniz.");
          return false;
        }
        const { error } = await supabase.from("project_invitations").insert(
          payload.projectIds.map(pid => ({
            project_id: pid,
            email,
            role: payload.role as ProjectRole,
            invited_by: user.id,
          })),
        );
        if (error) { toast.error("Davet oluşturulamadı."); return false; }
      }
      toast.success("Davet gönderildi.");
      await load();
      return true;
    } finally {
      setBusy(false);
    }
  }, [user, users, isOwner, seats, ensureTeam, load]);

  const copyInviteLink = useCallback((token: string | null) => {
    if (!token) return;
    navigator.clipboard?.writeText(`${window.location.origin}/register?invite=${token}`);
    toast.success("Davet bağlantısı kopyalandı.");
  }, []);

  const resendInvitation = useCallback(async (u: CompanyUser) => {
    if (!u.invitationId) return;
    const expires = new Date(Date.now() + INVITE_DAYS * 86400000).toISOString();
    const table = u.invitationScope === "company" ? "office_invitations" : "project_invitations";
    const { error } = await supabase
      .from(table as any)
      .update({ expires_at: expires })
      .eq("id", u.invitationId);
    if (error) { toast.error("Davet yenilenemedi."); return; }
    copyInviteLink(u.invitationToken);
    toast.success("Davet yeniden gönderildi.");
    await load();
  }, [copyInviteLink, load]);

  const cancelInvitation = useCallback(async (u: CompanyUser) => {
    if (!u.invitationId) return;
    if (u.invitationScope === "company") {
      await supabase.from("office_invitations").delete().eq("id", u.invitationId);
    } else if (u.email) {
      await supabase
        .from("project_invitations")
        .delete()
        .eq("status", "pending")
        .ilike("email", u.email)
        .in("project_id", u.projectIds);
    }
    toast.success("Davet iptal edildi.");
    await load();
  }, [load]);

  const setSuspended = useCallback(async (u: CompanyUser, suspended: boolean) => {
    if (!u.memberId) { toast.error("Bu kullanıcı için askıya alma yapılamaz."); return; }
    if (u.isSelf) { toast.error("Kendi erişiminizi askıya alamazsınız."); return; }
    if (u.isOwner) { toast.error("Şirket sahibinin erişimi askıya alınamaz."); return; }
    setBusy(true);
    const { error } = await supabase
      .from("office_members")
      .update({ status: suspended ? "suspended" : "active", suspended_at: suspended ? new Date().toISOString() : null } as any)
      .eq("id", u.memberId);
    setBusy(false);
    if (error) { toast.error("İşlem tamamlanamadı, yetkiniz olmayabilir."); return; }
    toast.success(suspended ? "Kullanıcı askıya alındı." : "Kullanıcının erişimi yeniden açıldı.");
    await load();
  }, [load]);

  const removeAccess = useCallback(async (u: CompanyUser) => {
    if (u.isSelf) { toast.error("Kendi şirket erişiminizi kaldıramazsınız."); return; }
    if (u.isOwner) { toast.error("Şirket sahibi kaldırılamaz. Önce sahiplik devri gerekir."); return; }
    setBusy(true);
    if (u.memberId) {
      const { error } = await supabase.from("office_members").delete().eq("id", u.memberId);
      if (error) { setBusy(false); toast.error("Erişim kaldırılamadı."); return; }
    }
    if (u.userId && u.projectIds.length) {
      await supabase
        .from("project_members")
        .delete()
        .eq("user_id", u.userId)
        .in("project_id", u.projectIds);
    }
    setBusy(false);
    toast.success("Kullanıcının şirket erişimi kaldırıldı. Geçmiş kayıtları korundu.");
    await load();
  }, [load]);

  /** Replaces the project assignment set for an existing user. */
  const setProjectAccess = useCallback(async (
    u: CompanyUser,
    nextProjectIds: string[],
    role: ProjectRole,
  ) => {
    if (!u.userId) { toast.error("Davet kabul edilmeden proje erişimi değiştirilemez."); return; }
    const current = new Set(u.projectIds);
    const next = new Set(nextProjectIds);
    const toAdd = nextProjectIds.filter(id => !current.has(id));
    const toRemove = u.projectIds.filter(id => !next.has(id));
    setBusy(true);
    if (toRemove.length) {
      await supabase.from("project_members").delete().eq("user_id", u.userId).in("project_id", toRemove);
    }
    if (toAdd.length) {
      const { error } = await supabase.from("project_members").insert(
        toAdd.map(pid => ({ project_id: pid, user_id: u.userId as string, role })),
      );
      if (error) { setBusy(false); toast.error("Proje erişimi güncellenemedi."); return; }
    }
    setBusy(false);
    toast.success("Proje erişimi güncellendi.");
    await load();
  }, [load]);

  const updateProjectRole = useCallback(async (u: CompanyUser, role: ProjectRole) => {
    if (!u.userId || !u.projectIds.length) return;
    const { error } = await supabase
      .from("project_members")
      .update({ role })
      .eq("user_id", u.userId)
      .in("project_id", u.projectIds);
    if (error) { toast.error("Rol güncellenemedi."); return; }
    toast.success("Rol güncellendi.");
    await load();
  }, [load]);

  const loadPermissions = useCallback(async (userId: string, projectId: string) => {
    const { data } = await supabase
      .from("project_member_permissions")
      .select("permission_key, granted")
      .eq("user_id", userId)
      .eq("project_id", projectId);
    return Object.fromEntries(
      (data ?? []).map((r: any) => [r.permission_key as PermissionKey, r.granted as boolean]),
    ) as Partial<Record<PermissionKey, boolean>>;
  }, []);

  const setPermission = useCallback(async (
    userId: string,
    projectId: string,
    key: PermissionKey,
    granted: boolean,
  ) => {
    const { error } = await supabase
      .from("project_member_permissions")
      .upsert(
        { user_id: userId, project_id: projectId, permission_key: key, granted },
        { onConflict: "project_id,user_id,permission_key" },
      );
    if (error) { toast.error("Yetki güncellenemedi, yetkiniz olmayabilir."); return false; }
    return true;
  }, []);

  const counts = useMemo(() => ({
    active: users.filter(u => u.status === "active").length,
    invited: users.filter(u => u.status === "invited" || u.status === "expired").length,
    suspended: users.filter(u => u.status === "suspended").length,
  }), [users]);

  return {
    loading, busy, users, projects, seats, counts, isOwner, teamId,
    refresh: load,
    inviteUser, resendInvitation, cancelInvitation, copyInviteLink,
    setSuspended, removeAccess, setProjectAccess, updateProjectRole,
    loadPermissions, setPermission,
    isProjectRole,
  };
}
