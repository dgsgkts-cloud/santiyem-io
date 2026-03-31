import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";
import { toast } from "sonner";

export interface TeamMember {
  id: string;
  user_id: string;
  role: "owner" | "editor" | "viewer";
  joined_at: string;
  profile?: { full_name: string | null; title: string | null; city: string | null };
}

export interface TeamInvitation {
  id: string;
  email: string;
  role: string;
  status: string;
  token: string;
  created_at: string;
}

export interface Team {
  id: string;
  name: string;
  owner_id: string;
  max_members: number;
}

export function useTeam() {
  const { user, plan } = useUser();
  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<TeamInvitation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTeam = useCallback(async () => {
    if (!user) { setLoading(false); return; }

    // Get user's team membership
    const { data: memberData } = await supabase
      .from("office_members")
      .select("team_id")
      .eq("user_id", user.id)
      .limit(1)
      .single();

    if (!memberData) {
      setTeam(null);
      setMembers([]);
      setInvitations([]);
      setLoading(false);
      return;
    }

    // Get team info
    const { data: teamData } = await supabase
      .from("office_teams")
      .select("*")
      .eq("id", memberData.team_id)
      .single();

    if (teamData) setTeam(teamData as Team);

    // Get members with profiles
    const { data: membersData } = await supabase
      .from("office_members")
      .select("id, user_id, role, joined_at")
      .eq("team_id", memberData.team_id);

    if (membersData) {
      // Fetch profiles for each member
      const memberIds = membersData.map(m => m.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, title, city")
        .in("user_id", memberIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      setMembers(membersData.map(m => ({
        ...m,
        role: m.role as "owner" | "editor" | "viewer",
        profile: profileMap.get(m.user_id) || undefined,
      })));
    }

    // Get invitations
    const { data: invData } = await supabase
      .from("office_invitations")
      .select("*")
      .eq("team_id", memberData.team_id)
      .eq("status", "pending");

    if (invData) setInvitations(invData as TeamInvitation[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchTeam(); }, [fetchTeam]);

  // Check pending invitations on login
  useEffect(() => {
    if (!user?.email) return;
    supabase.rpc("check_pending_invitations", {
      _user_id: user.id,
      _email: user.email,
    }).then(() => fetchTeam());
  }, [user?.id, user?.email, fetchTeam]);

  const createTeam = useCallback(async (name: string) => {
    if (!user || plan !== "office") {
      toast.error("Takım oluşturmak için Ofis planı gereklidir");
      return null;
    }

    const { data: teamData, error: teamError } = await supabase
      .from("office_teams")
      .insert({ owner_id: user.id, name })
      .select()
      .single();

    if (teamError) { toast.error("Takım oluşturulamadı"); return null; }

    // Add owner as member
    await supabase.from("office_members").insert({
      team_id: teamData.id,
      user_id: user.id,
      role: "owner",
    });

    toast.success("Takım oluşturuldu!");
    fetchTeam();
    return teamData;
  }, [user, plan, fetchTeam]);

  const inviteMember = useCallback(async (email: string, role: "editor" | "viewer") => {
    if (!user || !team) return null;

    // Check member limit
    const totalMembers = members.length + invitations.length;
    if (totalMembers >= team.max_members) {
      toast.error(`Maksimum ${team.max_members} kişi davet edebilirsiniz`);
      return null;
    }

    const { data, error } = await supabase
      .from("office_invitations")
      .insert({
        team_id: team.id,
        email: email.toLowerCase().trim(),
        role,
        invited_by: user.id,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") toast.error("Bu e-posta zaten davet edilmiş");
      else toast.error("Davet gönderilemedi");
      return null;
    }

    toast.success(`${email} adresine davet gönderildi`);
    fetchTeam();
    return data;
  }, [user, team, members, invitations, fetchTeam]);

  const cancelInvitation = useCallback(async (id: string) => {
    await supabase.from("office_invitations").delete().eq("id", id);
    toast.success("Davet iptal edildi");
    fetchTeam();
  }, [fetchTeam]);

  const removeMember = useCallback(async (memberId: string) => {
    await supabase.from("office_members").delete().eq("id", memberId);
    toast.success("Üye çıkarıldı");
    fetchTeam();
  }, [fetchTeam]);

  const updateMemberRole = useCallback(async (memberId: string, role: "editor" | "viewer") => {
    await supabase.from("office_members").update({ role }).eq("id", memberId);
    toast.success("Rol güncellendi");
    fetchTeam();
  }, [fetchTeam]);

  const isOwner = team?.owner_id === user?.id;

  return {
    team, members, invitations, loading, isOwner,
    createTeam, inviteMember, cancelInvitation, removeMember, updateMemberRole,
    refetch: fetchTeam,
  };
}
