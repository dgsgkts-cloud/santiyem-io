// Sprint M1.6 — Overview: AI insights, worst-health, upcoming maintenance, fleet health.
import { useMemo } from "react";
import { Gauge, Wrench, Sparkles, Fuel, Timer } from "lucide-react";
import { ResponsiveGrid, SectionCard } from "@/components/ui/responsive";
import { fmtNum, fmtTRY, type Equipment } from "../fleetConstants";
import { HealthDot, StatusPill } from "../fleetUi";
import type { FleetData } from "../useFleetData";

const AIInsights = ({ equipment }: { equipment: Equipment[] }) => {
  const insights = useMemo(() => {
    const soon = equipment.find(e => e.status === "maintenance-soon");
    const lowUtil = [...equipment].sort((a, b) => a.utilization - b.utilization)[0];
    const idle = equipment.find(e => e.idleDays >= 5);
    return [
      soon && { icon: Wrench, tone: "amber", text: `${soon.name} (${soon.code}) yaklaşık 18 saat içinde bakım gerektirecek.` },
      { icon: Fuel, tone: "orange", text: "Bu ay yakıt tüketimi geçen aya göre %22 arttı — rotasyon ve rölanti kontrolü öneriyoruz." },
      lowUtil && { icon: Gauge, tone: "sky", text: `${lowUtil.name} kullanım oranı %${lowUtil.utilization} — başka projeye yönlendirilebilir.` },
      idle && { icon: Timer, tone: "red", text: `${idle.name} son ${idle.idleDays} gündür atıl — transfer veya kiraya verme değerlendirilmeli.` },
    ].filter(Boolean) as { icon: any; tone: string; text: string }[];
  }, [equipment]);

  return (
    <div className="rounded-xl border border-[#FF6B2B]/25 bg-gradient-to-br from-[#FF6B2B]/10 via-[#FF6B2B]/[0.04] to-transparent p-4 lg:p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-[#FF6B2B]/20 border border-[#FF6B2B]/30 flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-[#FF6B2B]" />
        </div>
        <div>
          <div className="text-fs-sm font-semibold text-foreground">Filo AI Öngörüleri</div>
          <div className="text-fs-xs text-muted-foreground">Gerçek zamanlı — bakım, yakıt ve kullanım verilerinden</div>
        </div>
      </div>
      <ResponsiveGrid variant="auto" minItemWidth={260} className="gap-2">
        {insights.map((i, idx) => (
          <div key={idx} className="flex items-start gap-2.5 p-3 rounded-lg bg-card border border-border">
            <i.icon className={`w-4 h-4 mt-0.5 shrink-0 ${
              i.tone === "amber" ? "text-amber-400" :
              i.tone === "red" ? "text-red-400" :
              i.tone === "sky" ? "text-sky-400" : "text-[#FF6B2B]"
            }`} />
            <div className="text-fs-xs text-foreground/80 leading-relaxed">{i.text}</div>
          </div>
        ))}
      </ResponsiveGrid>
    </div>
  );
};

export const OverviewView = ({ data }: { data: FleetData }) => {
  const { equipment, maintenance, totals } = data;
  const upcoming = maintenance.filter(m => m.kind === "scheduled" || m.kind === "urgent").slice(0, 6);
  const worst = [...equipment].sort((a, b) => a.health - b.health).slice(0, 5);

  return (
    <div className="space-y-4 lg:space-y-5">
      <AIInsights equipment={equipment} />

      <ResponsiveGrid variant="auto" minItemWidth={320} className="gap-4">
        <SectionCard
          title="Sağlık Skoru En Düşük Ekipmanlar"
          subtitle="Bakım / yenileme önceliği önerilenler"
          className="lg:col-span-2"
        >
          <div className="space-y-2">
            {worst.map(e => (
              <div key={e.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 border border-border/60">
                <div className="w-9 h-9 rounded-md bg-muted border border-border flex items-center justify-center text-fs-xs text-muted-foreground shrink-0">
                  {e.code.slice(-4)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-fs-sm text-foreground truncate">
                    {e.name} <span className="text-muted-foreground text-fs-xs ml-1">· {e.project}</span>
                  </div>
                  <div className="text-fs-xs text-muted-foreground">{e.type} · {fmtNum(e.engineHours)} sa</div>
                </div>
                <div className="hidden sm:block"><HealthDot score={e.health} /></div>
                <StatusPill s={e.status} />
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Yaklaşan Bakımlar">
          <div className="space-y-3">
            {upcoming.map(m => (
              <div key={m.id} className="flex items-start gap-3">
                <div className={`w-1.5 h-1.5 mt-2 rounded-full shrink-0 ${m.kind === "urgent" ? "bg-red-400" : "bg-amber-400"}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-fs-sm text-foreground truncate">{m.title}</div>
                  <div className="text-fs-xs text-muted-foreground truncate">{m.equipmentName} · {m.mechanic} · {fmtTRY(m.cost)}</div>
                </div>
                <div className="text-fs-xs text-muted-foreground tabular-nums whitespace-nowrap">{m.whenDays > 0 ? `+${m.whenDays}g` : `${m.whenDays}g`}</div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Filo Sağlığı">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-fs-xs text-muted-foreground">Ortalama sağlık skoru</span>
              <span className="text-fs-xs text-foreground tabular-nums">{totals.avgHealth}</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-gradient-to-r from-red-500 via-amber-500 to-emerald-500" style={{ width: `${totals.avgHealth}%` }} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="rounded-lg bg-muted/50 border border-border p-3">
              <div className="text-fs-xs text-muted-foreground">Filo Değeri</div>
              <div className="text-fs-sm font-semibold text-foreground mt-0.5">{fmtTRY(totals.fleetValue)}</div>
            </div>
            <div className="rounded-lg bg-muted/50 border border-border p-3">
              <div className="text-fs-xs text-muted-foreground">Atıl Varlık</div>
              <div className="text-fs-sm font-semibold text-amber-400 mt-0.5">{totals.idleAssets} adet</div>
            </div>
          </div>
        </SectionCard>
      </ResponsiveGrid>
    </div>
  );
};

export default OverviewView;
