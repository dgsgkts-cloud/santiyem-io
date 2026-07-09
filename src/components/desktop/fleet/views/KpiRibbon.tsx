// Sprint M1.6 — Global KPI ribbon shown across Fleet tabs.
import { Cog, CheckCircle2, Wrench, XCircle, Clock, Fuel, DollarSign, Timer } from "lucide-react";
import { KpiCard, ResponsiveGrid } from "@/components/ui/responsive";
import { fmtNum, fmtTRY, type Equipment } from "../fleetConstants";
import type { FleetData } from "../useFleetData";

export const KpiRibbon = ({ data }: { data: FleetData }) => {
  const { equipment, totals } = data;
  const totalHours = fmtNum(Math.round(equipment.reduce((s: number, e: Equipment) => s + e.engineHours, 0)));
  return (
    <ResponsiveGrid variant="auto" minItemWidth={180} className="gap-3">
      <KpiCard icon={Cog} label="Toplam Ekipman" value={fmtNum(equipment.length)} />
      <KpiCard icon={CheckCircle2} label="Aktif" value={fmtNum(totals.active)} trend={{ value: "+4%", positive: true }} />
      <KpiCard icon={Wrench} label="Bakımda" value={fmtNum(totals.inMaint)} />
      <KpiCard icon={XCircle} label="Arızalı" value={fmtNum(totals.broken)} />
      <KpiCard icon={Clock} label="Bugünkü Kullanım" value={`${Math.round(totals.engineHoursToday)} sa`} />
      <KpiCard icon={Fuel} label="Aylık Yakıt" value={`${fmtNum(totals.monthFuelLiters)} L`} trend={{ value: "-6%", positive: true }} />
      <KpiCard icon={DollarSign} label="Bakım Maliyeti" value={fmtTRY(totals.monthMaintCost)} />
      <KpiCard icon={Timer} label="Çalışma Saati" value={`${totalHours} sa`} />
    </ResponsiveGrid>
  );
};

export default KpiRibbon;
