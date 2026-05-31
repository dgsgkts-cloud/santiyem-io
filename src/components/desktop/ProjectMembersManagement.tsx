import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";
import { toast } from "sonner";
import {
  ROLE_LABELS,
  ROLE_COLORS,
  TUNABLE_KEYS,
  FINANCIAL_KEYS,
  type ProjectRole,
  type PermissionKey,
  hasPermission,
} from "@/lib/projectPermissions";
import { useProjectRole } from "@/hooks/useProjectRole";
import { Users, UserPlus, Trash2, Copy, X, Shield } from "lucide-react";

interface Member {
  id: string;
  user_id: string;
  role: ProjectRole;
  joined_at: string;
  profile?: { full_name: string | null; title: string | null };
}
interface Invitation {
  id: string;
  email: string | null;
  phone: string | null;
  role: ProjectRole;
  token: string;
  status: string;
  expires_at: string;
}
interface PermRow {
  user_id: string;
  permission_key: PermissionKey;
  granted: boolean;
}

const ASSIGNABLE_ROLES: ProjectRole[] = [
  "manager", "site_engineer", "accountant", "subcontractor", "worker", "landowner",
];

export default function ProjectMembersManagement({ projectId }: { projectId: string }) {
  const { user } = useUser();
  const { role: myRole, isOwner, isManagerOrOwner } = useProjectRole(projectId);
  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [permsByUser, setPermsByUser] = useState<Record<string, Record<string, boolean>>>({});
  const [loading, setLoading] = useState(true);

  // invite form
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [invitePhone, setInvitePhone] = useState("");
  const [inviteRole, setInviteRole] = useState<ProjectRole>("worker");

  // expanded fine-tune
  const [expanded, setExpanded] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    const [{ data: ms }, { data: invs }, { data: perms }] = await Promise.all([
      supabase
        .from("project_members")
        .select("id, user_id, role, joined_at")
        .eq("project_id", projectId)
        .order("joined_at", { ascending: true }),
      supabase
        .from("project_invitations")
        .select("id, email, phone, role, token, status, expires_at")
        .eq("project_id", projectId)
        .eq("status", "pending"),
      supabase
        .from("project_member_permissions")
        .select("user_id, permission_key, granted")
        .eq("project_id", projectId),
    ]);

    const userIds = (ms ?? []).map((m) => m.user_id);
    let profileMap = new Map<string, { full_name: string | null; title: string | null }>();
    if (userIds.length) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, title")
        .in("user_id", userIds);
      profileMap = new Map((profiles ?? []).map((p) => [p.user_id, p]));
    }
    setMembers(
      (ms ?? []).map((m) => ({
        ...m,
        role: m.role as ProjectRole,
        profile: profileMap.get(m.user_id),
      })),
    );
    setInvitations((invs ?? []) as Invitation[]);

    const byUser: Record<string, Record<string, boolean>> = {};
    (perms as PermRow[] | null ?? []).forEach((p) => {
      byUser[p.user_id] = byUser[p.user_id] || {};
      byUser[p.user_id][p.permission_key] = p.granted;
    });
    setPermsByUser(byUser);
    setLoading(false);
  }, [projectId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleInvite = async () => {
    if (!user) return;
    if (!inviteEmail.trim() && !invitePhone.trim()) {
      toast.error("E-posta veya telefon girin");
      return;
    }
    const { error } = await supabase.from("project_invitations").insert({
      project_id: projectId,
      invited_by: user.id,
      email: inviteEmail.trim() ? inviteEmail.trim().toLowerCase() : null,
      phone: invitePhone.trim() || null,
      role: inviteRole,
    });
    if (error) {
      toast.error("Davet gönderilemedi: " + error.message);
      return;
    }
    toast.success("Davet oluşturuldu");
    setInviteEmail("");
    setInvitePhone("");
    setShowInvite(false);
    fetchAll();
  };

  const copyInviteLink = (token: string) => {
    const link = `${window.location.origin}/proje-davet/${token}`;
    navigator.clipboard.writeText(link);
    toast.success("Davet linki kopyalandı");
  };

  const cancelInvitation = async (id: string) => {
    await supabase.from("project_invitations").delete().eq("id", id);
    fetchAll();
  };

  const changeRole = async (uid: string, newRole: ProjectRole) => {
    const { error } = await supabase.rpc("set_project_member_role", {
      _project: projectId,
      _user: uid,
      _role: newRole,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Rol güncellendi");
    fetchAll();
  };

  const removeMember = async (uid: string) => {
    if (!confirm("Bu üyeyi projeden çıkarmak istediğinize emin misiniz?")) return;
    const { error } = await supabase.rpc("remove_project_member", {
      _project: projectId,
      _user: uid,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Üye çıkarıldı");
    fetchAll();
  };

  const togglePermission = async (uid: string, key: PermissionKey, granted: boolean) => {
    const { error } = await supabase.rpc("set_project_member_permission", {
      _project: projectId,
      _user: uid,
      _key: key,
      _granted: granted,
    });
    if (error) { toast.error(error.message); return; }
    fetchAll();
  };

  if (loading) return <p className="text-[13px] text-muted-foreground p-4">Yükleniyor...</p>;

  if (!isManagerOrOwner) {
    return (
      <div className="text-center py-12">
        <Shield className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
        <p className="text-[13px] text-muted-foreground">
          Bu projenin üye yönetimine erişiminiz yok.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-[15px] font-semibold text-foreground flex items-center gap-2">
            <Users className="w-4 h-4" /> Proje Üyeleri
          </h3>
          <p className="text-[11px] text-muted-foreground mt-1">
            {members.length} üye • {invitations.length} bekleyen davet
          </p>
        </div>
        <button
          onClick={() => setShowInvite(!showInvite)}
          className="flex items-center gap-1.5 px-3 rounded-lg text-[12px] font-semibold text-white"
          style={{ height: 32, backgroundColor: showInvite ? "#EF4444" : "#FF6B2B" }}
        >
          {showInvite ? <X className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />}
          {showInvite ? "İptal" : "Davet Et"}
        </button>
      </div>

      {showInvite && (
        <div className="rounded-lg p-4 space-y-3 border border-border bg-card">
          <p className="text-[12px] font-medium text-foreground">Yeni üye davet et</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              type="email"
              placeholder="E-posta"
              className="rounded-lg px-3 text-[13px] outline-none bg-background border border-border"
              style={{ height: 36 }}
            />
            <input
              value={invitePhone}
              onChange={(e) => setInvitePhone(e.target.value)}
              placeholder="Telefon (opsiyonel)"
              className="rounded-lg px-3 text-[13px] outline-none bg-background border border-border"
              style={{ height: 36 }}
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as ProjectRole)}
              className="flex-1 rounded-lg px-3 text-[13px] outline-none bg-background border border-border"
              style={{ height: 36 }}
            >
              {ASSIGNABLE_ROLES.map((r) => (
                <option key={r} value={r}>{ROLE_LABELS[r]}</option>
              ))}
            </select>
            <button
              onClick={handleInvite}
              className="px-4 rounded-lg text-[12px] font-semibold text-white"
              style={{ height: 36, backgroundColor: "#22C55E" }}
            >
              Davet oluştur
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Daveti oluşturduktan sonra link kopyalayıp paylaşabilirsiniz.
          </p>
        </div>
      )}

      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Üyeler</p>
        {members.map((m) => {
          const isMeRow = m.user_id === user?.id;
          const isOwnerRow = m.role === "owner";
          const overrides = permsByUser[m.user_id] || {};
          return (
            <div key={m.id} className="rounded-lg border border-border bg-card">
              <div className="flex items-center gap-3 p-3">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${ROLE_COLORS[m.role]}20` }}
                >
                  <span className="text-[11px] font-bold" style={{ color: ROLE_COLORS[m.role] }}>
                    {(m.profile?.full_name || "?").charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium truncate text-foreground">
                    {m.profile?.full_name || "İsimsiz"} {isMeRow && <span className="text-[10px] text-muted-foreground">(siz)</span>}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate">{m.profile?.title || ""}</p>
                </div>
                <span
                  className="px-2 py-0.5 rounded-md text-[10px] font-medium"
                  style={{ backgroundColor: `${ROLE_COLORS[m.role]}15`, color: ROLE_COLORS[m.role] }}
                >
                  {ROLE_LABELS[m.role]}
                </span>
                {!isOwnerRow && (
                  <>
                    <select
                      value={m.role}
                      onChange={(e) => changeRole(m.user_id, e.target.value as ProjectRole)}
                      className="rounded px-1.5 py-0.5 text-[10px] outline-none bg-background border border-border"
                    >
                      {ASSIGNABLE_ROLES.map((r) => (
                        <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => setExpanded(expanded === m.user_id ? null : m.user_id)}
                      className="text-[10px] px-2 py-1 rounded border border-border text-muted-foreground hover:text-foreground"
                    >
                      İnce ayar
                    </button>
                    <button
                      onClick={() => removeMember(m.user_id)}
                      className="p-1 rounded text-muted-foreground hover:text-red-500"
                      title="Üyeyi çıkar"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>
              {expanded === m.user_id && !isOwnerRow && (
                <div className="border-t border-border p-3 space-y-2">
                  <p className="text-[10px] uppercase text-muted-foreground">Kişiye özel görünürlük</p>
                  {TUNABLE_KEYS.map(({ key, label, financial }) => {
                    const effective = hasPermission(m.role, key, overrides as Partial<Record<PermissionKey, boolean>>);
                    const disabled = financial && !isOwner;
                    return (
                      <label
                        key={key}
                        className={`flex items-center justify-between text-[12px] py-1 ${disabled ? "opacity-50" : ""}`}
                      >
                        <span className="text-foreground">
                          {label}
                          {financial && <span className="ml-1 text-[10px] text-[#FF6B2B]">(sadece sahip)</span>}
                        </span>
                        <input
                          type="checkbox"
                          disabled={disabled}
                          checked={effective}
                          onChange={(e) => togglePermission(m.user_id, key, e.target.checked)}
                        />
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {invitations.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Bekleyen davetler</p>
          {invitations.map((inv) => (
            <div key={inv.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card">
              <div className="flex-1 min-w-0">
                <p className="text-[13px] text-foreground truncate">
                  {inv.email || inv.phone || "—"}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {ROLE_LABELS[inv.role]} • {new Date(inv.expires_at).toLocaleDateString("tr-TR")} tarihine kadar
                </p>
              </div>
              <button
                onClick={() => copyInviteLink(inv.token)}
                className="p-1.5 rounded text-muted-foreground hover:text-foreground"
                title="Davet linkini kopyala"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => cancelInvitation(inv.id)}
                className="p-1.5 rounded text-muted-foreground hover:text-red-500"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
