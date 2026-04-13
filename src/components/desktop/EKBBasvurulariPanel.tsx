import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MessageCircle, Download, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

interface EKBBasvuru {
  id: string;
  ad_soyad: string;
  telefon: string;
  il_ilce: string;
  bina_tipi: string;
  mesaj: string | null;
  durum: string;
  created_at: string;
}

const EKBBasvurulariPanel = () => {
  const [basvurular, setBasvurular] = useState<EKBBasvuru[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBasvurular = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("ekb_basvurulari" as any)
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Başvurular yüklenemedi.");
    } else {
      setBasvurular((data as any) || []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchBasvurular(); }, []);

  const exportExcel = () => {
    if (!basvurular.length) return;
    const rows = basvurular.map((b) => ({
      "Ad Soyad": b.ad_soyad,
      "Telefon": b.telefon,
      "İl/İlçe": b.il_ilce,
      "Bina Tipi": b.bina_tipi,
      "Mesaj": b.mesaj || "",
      "Durum": b.durum,
      "Tarih": new Date(b.created_at).toLocaleString("tr-TR"),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "EKB Başvuruları");
    XLSX.writeFile(wb, `ekb-basvurulari-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="p-4 lg:p-6 max-w-[1200px] mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground">EKB Başvuruları</h2>
        <div className="flex gap-2">
          <button onClick={fetchBasvurular} className="p-2 rounded-lg border border-input hover:bg-muted transition-colors">
            <RefreshCw className="w-4 h-4 text-muted-foreground" />
          </button>
          <button onClick={exportExcel} disabled={!basvurular.length} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50">
            <Download className="w-4 h-4" />
            Excel'e Aktar
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground text-center py-10">Yükleniyor...</div>
      ) : !basvurular.length ? (
        <div className="text-sm text-muted-foreground text-center py-10">Henüz başvuru yok.</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 text-left">
                <th className="px-3 py-2 font-medium text-muted-foreground">Ad Soyad</th>
                <th className="px-3 py-2 font-medium text-muted-foreground">Telefon</th>
                <th className="px-3 py-2 font-medium text-muted-foreground">İl/İlçe</th>
                <th className="px-3 py-2 font-medium text-muted-foreground">Bina Tipi</th>
                <th className="px-3 py-2 font-medium text-muted-foreground">Mesaj</th>
                <th className="px-3 py-2 font-medium text-muted-foreground">Tarih</th>
                <th className="px-3 py-2 font-medium text-muted-foreground"></th>
              </tr>
            </thead>
            <tbody>
              {basvurular.map((b) => (
                <tr key={b.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                  <td className="px-3 py-2.5 text-foreground font-medium">{b.ad_soyad}</td>
                  <td className="px-3 py-2.5 text-foreground">{b.telefon}</td>
                  <td className="px-3 py-2.5 text-foreground">{b.il_ilce}</td>
                  <td className="px-3 py-2.5 text-foreground">{b.bina_tipi}</td>
                  <td className="px-3 py-2.5 text-muted-foreground max-w-[200px] truncate">{b.mesaj || "—"}</td>
                  <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">{new Date(b.created_at).toLocaleDateString("tr-TR")}</td>
                  <td className="px-3 py-2.5">
                    <a
                      href={`https://wa.me/90${b.telefon.replace(/\D/g, "").replace(/^0/, "").replace(/^90/, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-white"
                      style={{ backgroundColor: "#25D366" }}
                    >
                      <MessageCircle className="w-3 h-3" /> Ara
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default EKBBasvurulariPanel;
