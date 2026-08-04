import { useState } from "react";
import { Sparkles, Loader2, RotateCcw, CalendarPlus, Power, KeyRound, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";
import { toast } from "sonner";

type Action = "status" | "provision" | "reset" | "extend" | "restart_period" | "activate" | "deactivate" | "set_password";

/** Admin-only control panel for the shared investor demo account. */
export const DemoAccountAdminPanel = () => {
  const { isAdmin } = useUser();
  const [busy, setBusy] = useState<Action | null>(null);
  const [state, setState] = useState<any>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [restartPeriod, setRestartPeriod] = useState(false);
  const [password, setPassword] = useState("");

  if (!isAdmin) return null;

  const run = async (action: Action, body: Record<string, unknown> = {}) => {
    setBusy(action);
    try {
      const { data, error } = await supabase.functions.invoke("demo-account", { body: { action, ...body } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.state) setState(data.state);
      toast.success(
        action === "reset" ? "Demo verileri sıfırlandı" :
        action === "extend" ? "Demo süresi 7 gün uzatıldı" :
        action === "restart_period" ? "Demo süresi yeniden başlatıldı" :
        action === "set_password" ? "Demo şifresi güncellendi" :
        action === "activate" ? "Demo hesabı aktifleştirildi" :
        action === "deactivate" ? "Demo hesabı devre dışı bırakıldı" :
        "İşlem tamamlandı",
      );
      if (action === "reset") setConfirmReset(false);
      if (action === "set_password") setPassword("");
    } catch (e: any) {
      toast.error("Hata: " + (e?.message || String(e)));
    } finally {
      setBusy(null);
    }
  };

  const Btn = ({ action, icon: Icon, label, onClick }: { action: Action; icon: any; label: string; onClick: () => void }) => (
    <button
      onClick={onClick}
      disabled={!!busy}
      className="flex h-10 items-center gap-2 rounded-lg border border-border px-3 text-[12px] font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
    >
      {busy === action ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
      {label}
    </button>
  );

  return (
    <div className="space-y-3 rounded-xl border border-border p-4">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5" style={{ color: "#FF6B2B" }} />
        <h3 className="text-[15px] font-semibold text-foreground">Yatırımcı Demo Hesabı</h3>
      </div>
      <p className="text-[12px] leading-relaxed text-muted-foreground">
        <b>demo@santiyem.ai</b> — Şantiyem AI Demo İnşaat A.Ş. Süre ilk girişte başlar ve 7 gün sürer.
      </p>

      {state && (
        <div className="grid grid-cols-2 gap-2 rounded-lg border border-border bg-muted/40 p-3 text-[11px] text-muted-foreground sm:grid-cols-4">
          <Info label="İlk giriş" value={state.first_login_at ? new Date(state.first_login_at).toLocaleString("tr-TR") : "—"} />
          <Info label="Bitiş" value={state.expires_at ? new Date(state.expires_at).toLocaleString("tr-TR") : "—"} />
          <Info label="Durum" value={state.blocked ? "Erişim kapalı" : "Aktif"} />
          <Info label="Sıfırlama" value={String(state.reset_count ?? 0)} />
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Btn action="status" icon={RefreshCw} label="Durumu yenile" onClick={() => run("status")} />
        <Btn action="extend" icon={CalendarPlus} label="7 gün uzat" onClick={() => run("extend", { days: 7 })} />
        <Btn action="restart_period" icon={RotateCcw} label="Süreyi yeniden başlat" onClick={() => run("restart_period")} />
        <Btn action="activate" icon={Power} label="Aktifleştir" onClick={() => run("activate")} />
        <Btn action="deactivate" icon={Power} label="Devre dışı bırak" onClick={() => run("deactivate")} />
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <input
          type="text"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Yeni demo şifresi"
          className="h-10 flex-1 min-w-[180px] rounded-lg border border-border bg-background px-3 text-[16px] sm:text-[13px] text-foreground"
        />
        <Btn action="set_password" icon={KeyRound} label="Şifreyi güncelle" onClick={() => run("set_password", { password })} />
      </div>

      <div className="space-y-2 rounded-lg border border-border p-3">
        <label className="flex items-center gap-2 text-[12px] text-muted-foreground">
          <input type="checkbox" checked={restartPeriod} onChange={(e) => setRestartPeriod(e.target.checked)} />
          Sıfırlamada 7 günlük süreyi de yeniden başlat
        </label>
        {!confirmReset ? (
          <button
            onClick={() => setConfirmReset(true)}
            disabled={!!busy}
            className="flex h-10 items-center gap-2 rounded-lg px-3 text-[12px] font-semibold text-white disabled:opacity-50"
            style={{ backgroundColor: "#FF6B2B" }}
          >
            <RotateCcw className="h-4 w-4" /> Demo Verilerini Sıfırla
          </button>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[12px] text-foreground">
              Demo kullanımı sırasında oluşan tüm kayıtlar silinip özgün veri seti geri yüklenecek. Emin misiniz?
            </span>
            <Btn action="reset" icon={RotateCcw} label="Evet, sıfırla" onClick={() => run("reset", { restart_period: restartPeriod })} />
            <button onClick={() => setConfirmReset(false)} className="h-10 rounded-lg border border-border px-3 text-[12px] text-muted-foreground">
              Vazgeç
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const Info = ({ label, value }: { label: string; value: string }) => (
  <div>
    <p className="font-medium text-muted-foreground">{label}</p>
    <p className="text-foreground">{value}</p>
  </div>
);

export default DemoAccountAdminPanel;
