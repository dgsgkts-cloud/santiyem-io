import { useState } from "react";
import { Sparkles, Loader2, CheckCircle2, Trash2, Crown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import DemoDataPanel from "./DemoDataPanel";

const MsyPremiumDemoCard = () => {
  const [busy, setBusy] = useState<null | "load" | "remove">(null);
  const [summary, setSummary] = useState<Record<string, number> | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);

  const run = async (action: "load" | "remove") => {
    setBusy(action);
    setSummary(null);
    try {
      const { data, error } = await supabase.functions.invoke("seed-msy-demo", { body: { action } });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "İşlem başarısız");
      setSummary(data.counts || {});
      toast.success(action === "load" ? "MSY Yapı demo yüklendi" : "MSY Yapı demo kaldırıldı");
      setConfirmRemove(false);
    } catch (e: any) {
      toast.error("Hata: " + (e?.message || String(e)));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="rounded-xl border-2 p-4 space-y-3" style={{ borderColor: "#FF6B2B33", background: "linear-gradient(135deg, rgba(255,107,43,0.06), transparent)" }}>
      <div className="flex items-center gap-2">
        <Crown className="w-5 h-5" style={{ color: "#FF6B2B" }} />
        <h3 className="text-[15px] font-semibold text-foreground">MSY Yapı A.Ş. — Premium Demo</h3>
      </div>
      <p className="text-[12px] text-muted-foreground leading-relaxed">
        Şantiyem AI'nın her özelliğini sergileyen zengin, birbiriyle ilişkili bir demo şirket yükler:
        24 villalık <b>Ballıca Panorama Villaları</b> projesi, 42+ personel, 18 alt yüklenici,
        100+ malzeme, 448 görev, 60 günlük şantiye günlüğü, 4 hakediş, 24 toplantı, kasa/finans hareketleri,
        şirket hafızası, iletişim geçmişi ve hatırlatıcılar. Her demo satırı işaretlenir; tek tıkla temiz şekilde kaldırılır.
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => run("load")}
          disabled={!!busy}
          className="inline-flex items-center gap-2 px-4 rounded-lg text-[13px] font-semibold text-white disabled:opacity-60"
          style={{ height: 38, backgroundColor: "#FF6B2B" }}
        >
          {busy === "load" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          MSY Yapı Demo'yu Yükle
        </button>
        {!confirmRemove ? (
          <button
            onClick={() => setConfirmRemove(true)}
            disabled={!!busy}
            className="inline-flex items-center gap-2 px-4 rounded-lg text-[13px] font-medium border border-border text-foreground disabled:opacity-60"
            style={{ height: 38 }}
          >
            <Trash2 className="w-4 h-4" />
            Demo Verisini Kaldır
          </button>
        ) : (
          <>
            <button
              onClick={() => run("remove")}
              disabled={!!busy}
              className="inline-flex items-center gap-2 px-4 rounded-lg text-[13px] font-semibold text-white bg-red-600 disabled:opacity-60"
              style={{ height: 38 }}
            >
              {busy === "remove" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              Evet, kaldır
            </button>
            <button
              onClick={() => setConfirmRemove(false)}
              className="inline-flex items-center px-4 rounded-lg text-[13px] font-medium border border-border text-foreground"
              style={{ height: 38 }}
            >
              Vazgeç
            </button>
          </>
        )}
      </div>
      {summary && Object.keys(summary).length > 0 && (
        <div className="rounded-lg bg-background/50 border border-border p-3">
          <div className="flex items-center gap-2 mb-2 text-[12px] font-semibold text-foreground">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            Sonuç
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-[11px]">
            {Object.entries(summary).map(([k, v]) => (
              <div key={k} className="flex justify-between rounded bg-background/60 border border-border px-2 py-1">
                <span className="text-muted-foreground capitalize">{k.replace(/_/g, " ")}</span>
                <span className="font-mono font-semibold text-foreground">{v}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};


/**
 * "Demo Proje Oluştur" — populates the workspace with a realistic construction
 * demo project. Never overwrites existing user data; if a demo already exists,
 * asks for confirmation before creating another one.
 */
const DemoDataTab = () => {
  const [loading, setLoading] = useState(false);
  const [pendingConfirm, setPendingConfirm] = useState(false);
  const [result, setResult] = useState<{ project_name: string; counts: Record<string, number> } | null>(null);

  const run = async (confirm = false) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-demo-project", {
        body: { confirm },
      });
      if (error) throw error;
      if (data?.status === "confirm_required") {
        setPendingConfirm(true);
        toast.warning(data.message);
        return;
      }
      if (data?.status === "ok") {
        setResult({ project_name: data.project_name, counts: data.counts });
        setPendingConfirm(false);
        toast.success("Demo proje başarıyla oluşturuldu");
      } else {
        throw new Error(data?.error || "Bilinmeyen hata");
      }
    } catch (e: any) {
      toast.error(e?.message || "Demo veri oluşturulamadı");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5 lg:space-y-6">
      <DemoDataPanel />
      <div className="border-t border-border" />
      <div>
        <h3 className="text-[15px] lg:text-[16px] font-semibold mb-1 text-foreground flex items-center gap-2">
          <Sparkles className="w-4 h-4" style={{ color: "#FF6B2B" }} />
          Demo Proje Oluştur
        </h3>
        <p className="text-[11px] lg:text-[12px] text-muted-foreground">
          Test ve tanıtım amacıyla, çalışma alanınıza gerçekçi bir inşaat projesi (Arsuz Modern Villas) ekler.
          Mevcut verileriniz silinmez veya değiştirilmez.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card/60 p-4 space-y-3">
        <div className="text-[12px] text-muted-foreground leading-relaxed">
          İçerik: 1 proje, 12 taşeron, 18 personel, ~60 ödeme, 15 hakediş, 50 görev, 35 şantiye günlüğü,
          11 malzeme + stok hareketleri, 25 fatura, 30 not, sözleşmeler ve dökümanlar. Tüm veriler birbiriyle ilişkili
          şekilde eklenir.
        </div>
        <ul className="text-[11px] text-muted-foreground space-y-1 list-disc pl-4">
          <li>Proje: <b>Arsuz Modern Villas</b> — Hatay / Arsuz — 185.000.000 TL — %42 ilerleme</li>
          <li>Müşteri: Arsuz Yapı A.Ş. — Proje Müdürü: Doğuş Göktaş</li>
          <li>Bloklar: A / B / C / D</li>
        </ul>
      </div>

      {pendingConfirm && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-[12px] text-amber-200">
          Bu çalışma alanında zaten bir demo proje bulunuyor. Yine de yeni bir demo daha eklemek istiyor musunuz?
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => run(pendingConfirm)}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 rounded-lg text-[13px] font-semibold text-white disabled:opacity-60"
          style={{ height: 38, backgroundColor: "#FF6B2B" }}
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {pendingConfirm ? "Evet, yeni demo oluştur" : "Demo Proje Oluştur"}
        </button>
        {pendingConfirm && (
          <button
            onClick={() => setPendingConfirm(false)}
            disabled={loading}
            className="inline-flex items-center px-4 rounded-lg text-[13px] font-medium border border-border text-foreground"
            style={{ height: 38 }}
          >
            Vazgeç
          </button>
        )}
      </div>

      {result && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span className="text-[13px] font-semibold text-foreground">{result.project_name} oluşturuldu</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[12px]">
            {Object.entries(result.counts).map(([k, v]) => (
              <div key={k} className="rounded-md bg-background/40 border border-border px-2 py-1.5 flex items-center justify-between">
                <span className="text-muted-foreground capitalize">{k.replace(/_/g, " ")}</span>
                <span className="font-mono font-semibold text-foreground">{v}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DemoDataTab;
