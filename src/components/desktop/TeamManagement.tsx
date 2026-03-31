import { useState } from "react";
import { useTeam } from "@/hooks/useTeam";
import { useUser } from "@/contexts/UserContext";
import { Users, Mail, Shield, Eye, Edit3, Trash2, Plus, Copy, X, Crown, UserPlus } from "lucide-react";
import { toast } from "sonner";

const ROLE_LABELS: Record<string, { label: string; icon: typeof Shield; color: string }> = {
  owner: { label: "Sahip", icon: Crown, color: "#FF6B2B" },
  editor: { label: "Editör", icon: Edit3, color: "#22C55E" },
  viewer: { label: "Görüntüleyici", icon: Eye, color: "#3B82F6" },
};

const TeamManagement = () => {
  const { plan } = useUser();
  const { team, members, invitations, loading, isOwner, createTeam, inviteMember, cancelInvitation, removeMember, updateMemberRole } = useTeam();
  const [teamName, setTeamName] = useState("Ofisim");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"editor" | "viewer">("editor");
  const [showInviteForm, setShowInviteForm] = useState(false);

  const cardStyle = { backgroundColor: "#0F1419", border: "1px solid #1E2732" };

  if (plan !== "office") {
    return (
      <div className="text-center py-12">
        <Users className="w-12 h-12 mx-auto mb-3" style={{ color: "#334155" }} />
        <h3 className="text-[15px] font-semibold mb-2" style={{ color: "#F1F5F9" }}>Ekip Yönetimi</h3>
        <p className="text-[12px] mb-4" style={{ color: "#64748B" }}>
          Ekip yönetimi özelliği Ofis planında kullanılabilir.
        </p>
        <p className="text-[11px]" style={{ color: "#64748B" }}>
          Ofis planına yükselttiğinizde 4 kişiyi daha ekibinize davet edebilirsiniz.
        </p>
      </div>
    );
  }

  if (loading) {
    return <div className="text-center py-8"><p className="text-[13px]" style={{ color: "#64748B" }}>Yükleniyor...</p></div>;
  }

  // No team yet - create one
  if (!team) {
    return (
      <div className="space-y-5">
        <div>
          <h3 className="text-[15px] font-semibold mb-1" style={{ color: "#F1F5F9" }}>Ekip Oluştur</h3>
          <p className="text-[11px]" style={{ color: "#64748B" }}>
            Ekibinizi oluşturun ve 2 kişiyi davet edin. Tüm projeler ve hakediş kayıtları paylaşılır.
          </p>
        </div>
        <div className="flex gap-3">
          <input
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            placeholder="Ekip adı"
            className="flex-1 rounded-lg px-3 text-[13px] outline-none"
            style={{ height: 36, ...cardStyle, color: "#F1F5F9" }}
          />
          <button
            onClick={() => createTeam(teamName)}
            className="px-4 rounded-lg text-[13px] font-semibold text-white"
            style={{ height: 36, backgroundColor: "#FF6B2B" }}
          >
            Oluştur
          </button>
        </div>
      </div>
    );
  }

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    const result = await inviteMember(inviteEmail, inviteRole);
    if (result) {
      setInviteEmail("");
      setShowInviteForm(false);
    }
  };

  const copyInviteLink = (token: string) => {
    const link = `${window.location.origin}/register?invite=${token}`;
    navigator.clipboard.writeText(link);
    toast.success("Davet linki kopyalandı!");
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-[15px] font-semibold mb-1" style={{ color: "#F1F5F9" }}>
            {team.name}
          </h3>
          <p className="text-[11px]" style={{ color: "#64748B" }}>
            {members.length}/{team.max_members} üye
          </p>
        </div>
        {isOwner && (
          <button
            onClick={() => setShowInviteForm(!showInviteForm)}
            className="flex items-center gap-1.5 px-3 rounded-lg text-[12px] font-semibold text-white"
            style={{ height: 32, backgroundColor: showInviteForm ? "#EF4444" : "#FF6B2B" }}
          >
            {showInviteForm ? <X className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />}
            {showInviteForm ? "İptal" : "Davet Et"}
          </button>
        )}
      </div>

      {/* Invite Form */}
      {showInviteForm && (
        <div className="rounded-lg p-4 space-y-3" style={cardStyle}>
          <p className="text-[12px] font-medium" style={{ color: "#F1F5F9" }}>Yeni Üye Davet Et</p>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="E-posta adresi"
              type="email"
              className="flex-1 rounded-lg px-3 text-[13px] outline-none"
              style={{ height: 36, backgroundColor: "#161C23", border: "1px solid #1E2732", color: "#F1F5F9" }}
            />
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as "editor" | "viewer")}
              className="rounded-lg px-3 text-[13px] outline-none"
              style={{ height: 36, backgroundColor: "#161C23", border: "1px solid #1E2732", color: "#F1F5F9" }}
            >
              <option value="editor">Editör</option>
              <option value="viewer">Görüntüleyici</option>
            </select>
            <button
              onClick={handleInvite}
              className="px-4 rounded-lg text-[12px] font-semibold text-white"
              style={{ height: 36, backgroundColor: "#22C55E" }}
            >
              Gönder
            </button>
          </div>
          <p className="text-[10px]" style={{ color: "#64748B" }}>
            Davet edilen kişi bu e-posta ile kayıt olduğunda otomatik olarak ekibe eklenir.
          </p>
        </div>
      )}

      {/* Members List */}
      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "#334155" }}>Üyeler</p>
        {members.map((member) => {
          const roleInfo = ROLE_LABELS[member.role];
          const RoleIcon = roleInfo.icon;
          return (
            <div key={member.id} className="flex items-center gap-3 p-3 rounded-lg" style={cardStyle}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: `${roleInfo.color}20` }}>
                <span className="text-[11px] font-bold" style={{ color: roleInfo.color }}>
                  {(member.profile?.full_name || "?").charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium truncate" style={{ color: "#F1F5F9" }}>
                  {member.profile?.full_name || "Bilinmiyor"}
                </p>
                <p className="text-[10px] truncate" style={{ color: "#64748B" }}>
                  {member.profile?.title || "Mühendis"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium" style={{ backgroundColor: `${roleInfo.color}15`, color: roleInfo.color }}>
                  <RoleIcon className="w-3 h-3" />
                  {roleInfo.label}
                </span>
                {isOwner && member.role !== "owner" && (
                  <div className="flex items-center gap-1">
                    <select
                      value={member.role}
                      onChange={(e) => updateMemberRole(member.id, e.target.value as "editor" | "viewer")}
                      className="rounded px-1.5 py-0.5 text-[10px] outline-none"
                      style={{ backgroundColor: "#161C23", border: "1px solid #1E2732", color: "#94A3B8" }}
                    >
                      <option value="editor">Editör</option>
                      <option value="viewer">Görüntüleyici</option>
                    </select>
                    <button
                      onClick={() => removeMember(member.id)}
                      className="p-1 rounded transition-colors"
                      style={{ color: "#64748B" }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = "#EF4444"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = "#64748B"; }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "#334155" }}>Bekleyen Davetler</p>
          {invitations.map((inv) => (
            <div key={inv.id} className="flex items-center gap-3 p-3 rounded-lg" style={cardStyle}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: "rgba(100,116,139,0.15)" }}>
                <Mail className="w-4 h-4" style={{ color: "#64748B" }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium truncate" style={{ color: "#F1F5F9" }}>{inv.email}</p>
                <p className="text-[10px]" style={{ color: "#64748B" }}>Davet bekliyor • {ROLE_LABELS[inv.role]?.label || inv.role}</p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => copyInviteLink(inv.token)}
                  className="p-1.5 rounded transition-colors"
                  style={{ color: "#64748B" }}
                  title="Davet linkini kopyala"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                {isOwner && (
                  <button
                    onClick={() => cancelInvitation(inv.id)}
                    className="p-1.5 rounded transition-colors"
                    style={{ color: "#64748B" }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = "#EF4444"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = "#64748B"; }}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TeamManagement;
