import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";
import { ROLE_LABELS, type ProjectRole } from "@/lib/projectPermissions";
import { toast } from "sonner";

const IOS_STORE_URL = "https://apps.apple.com/app/id0000000000"; // TODO: replace with real App Store ID
const ANDROID_STORE_URL = "https://play.google.com/store/apps/details?id=app.lovable.75507a907e2b421c9e2d6aa7effd7c93";

function detectMobileOs(): "ios" | "android" | null {
  if (typeof navigator === "undefined") return null;
  const ua = navigator.userAgent || "";
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  if (/Android/i.test(ua)) return "android";
  return null;
}

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

  const mobileOs = useMemo(() => detectMobileOs(), []);
  const isInNativeApp = Capacitor.isNativePlatform();
  const showOpenInApp = !!mobileOs && !isInNativeApp;

  const openInApp = () => {
    if (!token) return;
    // Try the custom scheme first; if the app isn't installed the browser
    // will simply do nothing — after a short delay we send the user to
    // the store. Universal link (https) opens the app directly when
    // installed; we use the scheme to handle the not-installed fallback.
    const scheme = `santiyem://proje-davet/${token}`;
    const storeUrl = mobileOs === "ios" ? IOS_STORE_URL : ANDROID_STORE_URL;
    const startedAt = Date.now();
    window.location.href = scheme;
    setTimeout(() => {
      // If the app opened, the page is hidden and this won't run reliably;
      // when it does run, redirect to the store.
      if (Date.now() - startedAt < 2500 && document.visibilityState === "visible") {
        window.location.href = storeUrl;
      }
    }, 1500);
  };

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
