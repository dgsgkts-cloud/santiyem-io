// Sprint M1.6 — Equipment detail sheet (right drawer on desktop, bottom on mobile).
import { Cog, QrCode, Wrench, FileText, ArrowUpRight } from "lucide-react";
import { ResponsiveSheet } from "@/components/ui/responsive";
import { fmtNum, fmtTRY, type Equipment, type Maintenance } from "./fleetConstants";
import { StatusPill } from "./fleetUi";

interface Props {
  equipment: Equipment | null;
  maintenance: Maintenance[];
  onClose: () => void;
}

export const EquipmentSheet = ({ equipment, maintenance, onClose }: Props) => {
  const open = equipment !== null;
  const eq = equipment;
  const history = eq ? maintenance.filter(m => m.equipmentCode === eq.code) : [];

  return (
    <ResponsiveSheet
      open={open}
      onOpenChange={o => { if (!o) onClose(); }}
      size="lg"
      title={
        eq && (
          <span className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-lg bg-muted border border-border flex items-center justify-center">
              <Cog className="w-4 h-4 text-[#FF6B2B]" />
            </span>
            <span className="flex flex-col">
              <span className="text-fs-md font-semibold text-foreground">{eq.name}</span>
              <span className="text-fs-xs text-muted-foreground">{eq.code} · {eq.type}</span>
            </span>
          </span>
        )
      }
      footer={
        eq && (
          <div className="flex gap-2">
            <button className="flex-1 h-11 min-h-[44px] rounded-lg bg-[#FF6B2B] text-white text-fs-sm hover:bg-[#FF8A4B] transition-colors flex items-center justify-center gap-2">
              <Wrench className="w-3.5 h-3.5" /> Bakım Oluştur
            </button>
            <button className="flex-1 h-11 min-h-[44px] rounded-lg bg-muted border border-border text-foreground/85 text-fs-sm hover:bg-muted/70 transition-colors flex items-center justify-center gap-2">
              <ArrowUpRight className="w-3.5 h-3.5" /> Transfer Et
            </button>
          </div>
        )
      }
    >
      {eq && (
        <div className="space-y-5">
          <div className="aspect-[16/8] rounded-xl bg-gradient-to-br from-muted to-muted/40 border border-border flex items-center justify-center relative">
            <Cog className="w-16 h-16 text-muted-foreground/60" />
            <div className="absolute bottom-3 right-3 flex items-center gap-1.5 px-2 py-1 rounded-md bg-background/60 border border-border">
              <QrCode className="w-3 h-3 text-muted-foreground" />
              <span className="text-fs-xs text-foreground/80 font-mono">{eq.code}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {[
              { l: "Marka / Model", v: `${eq.brand} ${eq.model}` },
              { l: "Seri No", v: eq.serial },
              { l: "Yıl", v: String(eq.year) },
              { l: "Proje", v: eq.project },
              { l: "Operatör", v: eq.operator },
              { l: "Motor Saati", v: `${fmtNum(eq.engineHours)} / ${fmtNum(eq.targetService)} sa` },
              { l: "Yakıt Türü", v: eq.fuelType },
              { l: "Saatlik Maliyet", v: fmtTRY(eq.hourlyCost) },
            ].map(r => (
              <div key={r.l} className="rounded-lg bg-card border border-border p-3">
                <div className="text-fs-xs uppercase tracking-wider text-muted-foreground">{r.l}</div>
                <div className="text-fs-sm text-foreground/90 mt-1">{r.v}</div>
              </div>
            ))}
          </div>

          <div className="rounded-lg bg-card border border-border p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-fs-sm text-foreground/80">Sağlık Skoru</span>
              <StatusPill s={eq.status} />
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div className={`h-full ${eq.health >= 80 ? "bg-emerald-500" : eq.health >= 60 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${eq.health}%` }} />
            </div>
            <div className="mt-2 text-fs-xs text-muted-foreground">Bakım · arıza · yakıt · kullanım · yaş faktörlerinden hesaplanır.</div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-3 text-fs-sm font-semibold text-foreground">
              <Wrench className="w-4 h-4 text-sky-400" /> Bakım Geçmişi
            </div>
            <div className="space-y-2">
              {history.length === 0 && <div className="text-fs-xs text-muted-foreground">Bu ekipman için bakım kaydı yok.</div>}
              {history.map(h => (
                <div key={h.id} className="rounded-lg bg-card border border-border p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-fs-sm text-foreground">{h.title}</div>
                    <div className="text-fs-xs text-muted-foreground">{h.whenDays > 0 ? `+${h.whenDays}g` : `${h.whenDays}g`}</div>
                  </div>
                  <div className="text-fs-xs text-muted-foreground mt-0.5">{h.mechanic} · {fmtTRY(h.cost)} · {h.hours}s</div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-3 text-fs-sm font-semibold text-foreground">
              <FileText className="w-4 h-4 text-emerald-400" /> Belgeler
            </div>
            <div className="grid grid-cols-2 gap-2">
              {["Kullanım Kılavuzu", "Garanti Belgesi", "Fatura", "Sertifika", "Muayene Raporu", "Sigorta"].map(d => (
                <div key={d} className="flex items-center gap-2 p-2.5 rounded-lg bg-card border border-border text-fs-xs text-foreground/75">
                  <FileText className="w-3.5 h-3.5 text-muted-foreground" /> {d}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </ResponsiveSheet>
  );
};

export default EquipmentSheet;
