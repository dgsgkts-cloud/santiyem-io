import { CalendarX2, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SantiyemWordmark } from "@/components/brand/SantiyemLogo";
import { useDemoAccount } from "@/hooks/useDemoAccount";

/** Full-screen block shown when the demo period ended or was deactivated. */
export const DemoExpiredScreen = () => {
  const demo = useDemoAccount();
  const expiry = demo.expiresAt ? new Date(demo.expiresAt).toLocaleDateString("tr-TR") : null;

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center gap-6 bg-background px-5 py-10 text-center">
      <SantiyemWordmark size="md" />
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-card">
        <CalendarX2 className="h-7 w-7" style={{ color: "#FF6B2B" }} />
      </div>
      <div className="max-w-md space-y-2">
        <h1 className="text-[18px] font-semibold text-foreground">
          Demo hesabının 7 günlük kullanım süresi sona erdi.
        </h1>
        <p className="text-[13px] leading-relaxed text-muted-foreground">
          {demo.isActive === false
            ? "Bu demo hesabı geçici olarak devre dışı bırakıldı."
            : "Süreyi uzatmak veya demoyu yeniden başlatmak için Şantiyem AI ekibiyle iletişime geçin."}
          {expiry && ` (Bitiş: ${expiry})`}
        </p>
      </div>
      <button
        onClick={() => supabase.auth.signOut().then(() => { window.location.href = "/giris"; })}
        className="flex h-11 items-center gap-2 rounded-lg border border-border px-5 text-[13px] font-semibold text-foreground transition-colors hover:bg-muted"
      >
        <LogOut className="h-4 w-4" /> Çıkış yap
      </button>
    </div>
  );
};

export default DemoExpiredScreen;
