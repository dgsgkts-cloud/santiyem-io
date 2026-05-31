import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";
import { ROLE_LABELS, type ProjectRole } from "@/lib/projectPermissions";
import { toast } from "sonner";

export default function InviteAccept() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user, loading: userLoading } = useUser();
  const [invitation, setInvitation] = useState<{
    role: ProjectRole;
    email: string | null;
    project_id: string;
    expires_at: string;
    status: string;
  } | null>(null);
  const [projectName, setProjectName] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    (async () => {
      const { data, error } = await supabase
        .from("project_invitations")
        .select("role, email, project_id, expires_at, status")
        .eq("token", token)
        .maybeSingle();
      if (error || !data) {
        setError("Davet bulunamadı veya geçersiz.");
        return;
      }
      setInvitation(data as any);
      const { data: p } = await supabase
        .from("projects")
        .select("name")
        .eq("id", data.project_id)
        .maybeSingle();
      if (p?.name) setProjectName(p.name);
    })();
  }, [token]);

  const accept = async () => {
    if (!token) return;
    setBusy(true);
    const { error } = await supabase.rpc("accept_project_invitation", { _token: token });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Projeye katıldınız");
    navigate("/projeler");
  };

  if (userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-t-[#FF6B2B] border-[#1E2732] rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <div className="max-w-md w-full text-center space-y-3">
          <h1 className="text-xl font-semibold text-foreground">Davet geçersiz</h1>
          <p className="text-sm text-muted-foreground">{error}</p>
          <button onClick={() => navigate("/")} className="px-4 py-2 rounded-lg bg-[#FF6B2B] text-white text-sm">
            Ana sayfa
          </button>
        </div>
      </div>
    );
  }

  if (!invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-t-[#FF6B2B] border-[#1E2732] rounded-full animate-spin" />
      </div>
    );
  }

  const expired = new Date(invitation.expires_at).getTime() < Date.now();

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="max-w-md w-full rounded-xl border border-border bg-card p-6 space-y-4">
        <h1 className="text-xl font-semibold text-foreground">Proje daveti</h1>
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{projectName || "Bir proje"}</span> projesine{" "}
          <span className="font-medium text-foreground">{ROLE_LABELS[invitation.role]}</span> rolüyle davet edildiniz.
        </p>

        {expired || invitation.status !== "pending" ? (
          <p className="text-sm text-red-500">Bu davetin süresi dolmuş veya kullanılmış.</p>
        ) : !user ? (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Daveti kabul etmek için lütfen giriş yapın
              {invitation.email && <> (<span className="text-foreground">{invitation.email}</span>)</>}.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => navigate(`/login?next=/proje-davet/${token}`)}
                className="flex-1 px-4 py-2 rounded-lg bg-[#FF6B2B] text-white text-sm"
              >
                Giriş yap
              </button>
              <button
                onClick={() => navigate(`/register?next=/proje-davet/${token}`)}
                className="flex-1 px-4 py-2 rounded-lg border border-border text-sm text-foreground"
              >
                Kayıt ol
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={accept}
            disabled={busy}
            className="w-full px-4 py-2 rounded-lg bg-[#FF6B2B] text-white text-sm disabled:opacity-50"
          >
            {busy ? "İşleniyor..." : "Daveti kabul et"}
          </button>
        )}
      </div>
    </div>
  );
}
