// Sprint M1.6 — CEO Mode: same widgets across every device.
import { DollarSign, Gauge, ShieldCheck, Timer, Fuel, Crown } from "lucide-react";
import { KpiCard, ResponsiveGrid, SectionCard } from "@/components/ui/responsive";
import { fmtTRY } from "../fleetConstants";
import type { FleetData } from "../useFleetData";

export const CEOView = ({ data }: { data: FleetData }) => {
  const { totals, equipment } = data;
  const risk = totals.broken * 3 + totals.inMaint;
  return (
    <div className="space-y-4 lg:space-y-5">
      <ResponsiveGrid variant="auto" minItemWidth={200} className="gap-3">
        <KpiCard icon={DollarSign} label="Filo Değeri" value={fmtTRY(totals.fleetValue)} />
        <KpiCard icon={Gauge} label="Filo Sağlığı" value={`${totals.avgHealth}/100`} />
        <KpiCard icon={ShieldCheck} label="Bakım Riski" value={`${risk} puan`} />
        <KpiCard icon={Timer} label="Atıl Varlıklar" value={`${totals.idleAssets} adet`} />
        <KpiCard icon={Fuel} label="Aylık Yakıt Maliyeti" value={fmtTRY(totals.monthFuelCost)} trend={{ value: "+12%", positive: false }} />
      </ResponsiveGrid>

      <SectionCard
        title={<span className="flex items-center gap-2"><Crown className="w-4 h-4 text-[#FF6B2B]" /> CEO Yönetici Özeti — Filo</span>}
      >
        <div className="text-fs-sm text-foreground/85 space-y-2 leading-relaxed">
          <p>
            Toplam <b className="text-foreground">{equipment.length}</b> ekipmanlık filonun tahmini değeri{" "}
            <b className="text-foreground">{fmtTRY(totals.fleetValue)}</b>. Ortalama sağlık skoru{" "}
            <b className="text-foreground">{totals.avgHealth}/100</b>,{" "}
            {totals.avgHealth >= 75 ? "sağlıklı seviyede." : "iyileştirme gerektiriyor."}
          </p>
          <p>
            Bu ay <b className="text-red-400">{totals.broken}</b> ekipman arızalı ve{" "}
            <b className="text-sky-400">{totals.inMaint}</b> ekipman bakımda.{" "}
            <b className="text-amber-400">{totals.idleAssets}</b> adet atıl varlık için transfer / dış kiralama önerilir.
          </p>
          <p>
            Yakıt maliyeti aylık <b className="text-foreground">{fmtTRY(totals.monthFuelCost)}</b>; rotasyon ve rölanti kontrolü ile ~%15 tasarruf mümkün.
          </p>
        </div>
      </SectionCard>
    </div>
  );
};

export default CEOView;
