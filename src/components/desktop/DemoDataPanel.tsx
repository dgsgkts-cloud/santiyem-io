import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Database, Sparkles, Trash2, Loader2 } from "lucide-react";

const DemoDataPanel = () => {
  const [busy, setBusy] = useState<"seed" | "clean" | null>(null);
  const [summary, setSummary] = useState<Record<string, number> | null>(null);

  const invoke = async (action: "seed" | "clean") => {
    setBusy(action);
    setSummary(null);
    try {
      const { data, error } = await supabase.functions.invoke("seed-demo-data", { body: { action } });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "İşlem başarısız");
      setSummary(data.summary || {});
      toast.success(action === "seed" ? "Demo veri yüklendi" : "Demo veri temizlendi");
    } catch (e: any) {
      toast.error("Hata: " + (e?.message || String(e)));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Database className="w-4 h-4 text-[#FF6B2B]" />
        <h3 className="text-sm font-semibold">Demo Verisi — Göktaş İnşaat</h3>
      </div>
      <p className="text-xs text-muted-foreground">
        18 proje, 20 personel, 8 tedarikçi, kasa hareketleri, çekler, malzeme, günlük ve şirket hafıza
        kayıtlarıyla dolu bir gösterim çalışma alanı oluşturur. Tüm demo satırları <code>[DEMO]</code>{" "}
        etiketiyle işaretlenir ve tek tıkla temizlenebilir.
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => invoke("seed")}
          disabled={!!busy}
          className="px-3 py-2 rounded-lg text-sm font-medium text-white flex items-center gap-2 disabled:opacity-50"
          style={{ backgroundColor: "#FF6B2B" }}
        >
          {busy === "seed" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          Demo Veri Yükle
        </button>
        <button
          onClick={() => invoke("clean")}
          disabled={!!busy}
          className="px-3 py-2 rounded-lg text-sm font-medium border border-border text-foreground flex items-center gap-2 disabled:opacity-50"
        >
          {busy === "clean" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
          Demo Verisini Temizle
        </button>
      </div>
      {summary && (
        <div className="text-xs bg-background border border-border rounded-lg p-3 space-y-1">
          <div className="font-medium text-muted-foreground mb-1">Sonuç:</div>
          {Object.entries(summary).map(([k, v]) => (
            <div key={k} className="flex justify-between">
              <span className="text-muted-foreground">{k}</span>
              <span className="font-mono text-foreground">{v}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DemoDataPanel;
