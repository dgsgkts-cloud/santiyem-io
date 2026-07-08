import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";
import { toast } from "sonner";
import {
  ROLE_LABELS,
  ROLE_COLORS,
  TUNABLE_KEYS,
  type ProjectRole,
  type PermissionKey,
  hasPermission,
} from "@/lib/projectPermissions";
import { useProjectRole } from "@/hooks/useProjectRole";
import { Users, UserPlus, Trash2, Copy, X, Shield, Settings2 } from "lucide-react";
import {
  ResponsiveSheet,
  ResponsiveTable,
  SectionCard,
  type ResponsiveColumn,
} from "@/components/ui/responsive";

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
  "manager",
  "site_engineer",
  "accountant",
  "subcontractor",
  "worker",
  "landowner",
];

export default function ProjectMembersManagement({ projectId }: { projectId: string }) {
  const { user } = useUser();
  const { isOwner, isManagerOrOwner } = useProjectRole(projectId);
  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [permsByUser, setPermsByUser] = useState<Record<string, Record<string, boolean>>>({});
  const [loading, setLoading] = useState(true);

  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [invitePhone, setInvitePhone] = useState("");
  const [inviteRole, setInviteRole] = useState<ProjectRole>("worker");

  const [permTarget, setPermTarget] = useState<Member | null>(null);

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
    (((perms as PermRow[]) | null) ?? []).forEach((p) => {
      byUser[p.user_id] = byUser[p.user_id] || {};
      byUser[p.user_id][p.permission_key] = p.granted;
    });
    setPermsByUser(byUser);
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

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
    const link = `https://santiyem.io/proje-davet/${token}`;
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
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Rol güncellendi");
    fetchAll();
  };

  const removeMember = async (uid: string) => {
    if (!confirm("Bu üyeyi projeden çıkarmak istediğinize emin misiniz?")) return;
    const { error } = await supabase.rpc("remove_project_member", {
      _project: projectId,
      _user: uid,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
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
    if (error) {
      toast.error(error.message);
      return;
    }
    fetchAll();
  };

  if (loading) return <p className="text-fs-sm text-muted-foreground p-4">Yükleniyor...</p>;

  if (!isManagerOrOwner) {
    return (
      <div className="text-center py-12">
        <Shield className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
        <p className="text-fs-sm text-muted-foreground">
          Bu projenin üye yönetimine erişiminiz yok.
        </p>
      </div>
    );
  }

  const memberColumns: ResponsiveColumn<Member>[] = [
    {
      key: "name",
      header: "Üye",
      primary: true,
      cell: (m) => (
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
            style={{ backgroundColor: `${ROLE_COLORS[m.role]}20` }}
          >
            <span className="text-fs-xs font-bold" style={{ color: ROLE_COLORS[m.role] }}>
              {(m.profile?.full_name || "?").charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="min-w-0">
            <div className="text-fs-sm font-medium truncate text-foreground">
              {m.profile?.full_name || "İsimsiz"}
              {m.user_id === user?.id && (
                <span className="text-fs-xs text-muted-foreground ml-1">(siz)</span>
              )}
            </div>
            <div className="text-fs-xs text-muted-foreground truncate">
              {m.profile?.title || ""}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "role",
      header: "Rol",
      cell: (m) =>
        m.role === "owner" ? (
          <span
            className="px-2 py-0.5 rounded-md text-fs-xs font-medium"
            style={{
              backgroundColor: `${ROLE_COLORS[m.role]}15`,
              color: ROLE_COLORS[m.role],
            }}
          >
            {ROLE_LABELS[m.role]}
          </span>
        ) : (
          <select
            value={m.role}
            onChange={(e) => changeRole(m.user_id, e.target.value as ProjectRole)}
            className="rounded px-2 py-1 text-fs-xs outline-none bg-background border border-border"
          >
            {ASSIGNABLE_ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
        ),
    },
    {
      key: "actions",
      header: "İşlem",
      align: "right",
      cell: (m) =>
        m.role === "owner" ? (
          <span className="text-fs-xs text-muted-foreground">—</span>
        ) : (
          <div className="flex items-center justify-end gap-1">
            <button
              onClick={() => setPermTarget(m)}
              className="text-fs-xs px-2 py-1 rounded border border-border text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              <Settings2 className="w-3 h-3" /> İnce ayar
            </button>
            <button
              onClick={() => removeMember(m.user_id)}
              className="p-1.5 rounded text-muted-foreground hover:text-red-500"
              title="Üyeyi çıkar"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ),
    },
  ];

  const inviteColumns: ResponsiveColumn<Invitation>[] = [
    {
      key: "who",
      header: "Davet",
      primary: true,
      cell: (inv) => (
        <div className="min-w-0">
          <div className="text-fs-sm text-foreground truncate">
            {inv.email || inv.phone || "—"}
          </div>
          <div className="text-fs-xs text-muted-foreground truncate">
            {ROLE_LABELS[inv.role]} •{" "}
            {new Date(inv.expires_at).toLocaleDateString("tr-TR")} tarihine kadar
          </div>
        </div>
      ),
    },
    {
      key: "actions",
      header: "İşlem",
      align: "right",
      cell: (inv) => (
        <div className="flex items-center justify-end gap-1">
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
      ),
    },
  ];

  const overrides = permTarget ? permsByUser[permTarget.user_id] || {} : {};

  return (
    <div className="space-y-4">
      <SectionCard
        title={
          <span className="flex items-center gap-2">
            <Users className="w-4 h-4" /> Proje Üyeleri
          </span>
        }
        subtitle={`${members.length} üye • ${invitations.length} bekleyen davet`}
        action={
          <button
            onClick={() => setShowInvite(true)}
            className="flex items-center gap-1.5 h-9 px-3 rounded-lg text-fs-xs font-semibold text-white"
            style={{ backgroundColor: "#FF6B2B" }}
          >
            <UserPlus className="w-3.5 h-3.5" /> Davet Et
          </button>
        }
      >
        <ResponsiveTable<Member>
          columns={memberColumns}
          rows={members}
          rowKey={(m) => m.id}
          empty={
            <p className="text-fs-sm text-muted-foreground text-center py-6">Üye yok</p>
          }
        />
      </SectionCard>

      {invitations.length > 0 && (
        <SectionCard title="Bekleyen Davetler">
          <ResponsiveTable<Invitation>
            columns={inviteColumns}
            rows={invitations}
            rowKey={(i) => i.id}
          />
        </SectionCard>
      )}

      <ResponsiveSheet
        open={showInvite}
        onOpenChange={setShowInvite}
        title="Yeni üye davet et"
        size="md"
        footer={
          <button
            onClick={handleInvite}
            className="w-full h-11 rounded-lg text-fs-sm font-semibold text-white"
            style={{ backgroundColor: "#22C55E" }}
          >
            Davet oluştur
          </button>
        }
      >
        <div className="space-y-3">
          <input
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            type="email"
            placeholder="E-posta"
            className="w-full h-11 rounded-lg px-3 text-fs-sm outline-none bg-background border border-border"
          />
          <input
            value={invitePhone}
            onChange={(e) => setInvitePhone(e.target.value)}
            placeholder="Telefon (opsiyonel)"
            className="w-full h-11 rounded-lg px-3 text-fs-sm outline-none bg-background border border-border"
          />
          <select
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value as ProjectRole)}
            className="w-full h-11 rounded-lg px-3 text-fs-sm outline-none bg-background border border-border"
          >
            {ASSIGNABLE_ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
          <p className="text-fs-xs text-muted-foreground">
            Daveti oluşturduktan sonra link kopyalayıp paylaşabilirsiniz.
          </p>
        </div>
      </ResponsiveSheet>

      <ResponsiveSheet
        open={!!permTarget}
        onOpenChange={(v) => !v && setPermTarget(null)}
        title={permTarget ? `${permTarget.profile?.full_name || "Üye"} — İzinler` : ""}
        size="md"
      >
        {permTarget && (
          <div className="space-y-2">
            <p className="text-fs-xs uppercase text-muted-foreground">Kişiye özel görünürlük</p>
            {TUNABLE_KEYS.map(({ key, label, financial }) => {
              const effective = hasPermission(
                permTarget.role,
                key,
                overrides as Partial<Record<PermissionKey, boolean>>,
              );
              const disabled = financial && !isOwner;
              return (
                <label
                  key={key}
                  className={`flex items-center justify-between text-fs-sm py-2 border-b border-border/40 ${
                    disabled ? "opacity-50" : ""
                  }`}
                >
                  <span className="text-foreground">
                    {label}
                    {financial && (
                      <span className="ml-1 text-fs-xs text-[#FF6B2B]">(sadece sahip)</span>
                    )}
                  </span>
                  <input
                    type="checkbox"
                    disabled={disabled}
                    checked={effective}
                    onChange={(e) => togglePermission(permTarget.user_id, key, e.target.checked)}
                  />
                </label>
              );
            })}
          </div>
        )}
      </ResponsiveSheet>
    </div>
  );
}
