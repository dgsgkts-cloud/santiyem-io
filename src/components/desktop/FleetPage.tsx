// Sprint M1.6 — Fleet & Equipment composition shell.
// Frontend-only responsive migration. No backend/schema/hook/business logic
// changes. All views live under ./fleet/* and use the M1 responsive DS.

import { useState } from "react";
import { Truck } from "lucide-react";
import { PageShell } from "@/components/ui/responsive";
import { useFleetData } from "./fleet/useFleetData";
import type { Equipment, FleetTab } from "./fleet/fleetConstants";
import { FleetHeaderActions } from "./fleet/FleetHeaderActions";
import { FleetTabs } from "./fleet/FleetTabs";
import { KpiRibbon } from "./fleet/views/KpiRibbon";
import { OverviewView } from "./fleet/views/OverviewView";
import { EquipmentView } from "./fleet/views/EquipmentView";
import { MaintenanceView } from "./fleet/views/MaintenanceView";
import { FuelView } from "./fleet/views/FuelView";
import { OperatorsView } from "./fleet/views/OperatorsView";
import { WorkingHoursView } from "./fleet/views/WorkingHoursView";
import { AnalyticsView } from "./fleet/views/AnalyticsView";
import { CEOView } from "./fleet/views/CEOView";
import { EquipmentSheet } from "./fleet/EquipmentSheet";
import { FleetFAB } from "./fleet/FleetFAB";

export default function FleetPage() {
  const data = useFleetData();
  const [tab, setTab] = useState<FleetTab>("overview");
  const [ceoMode, setCeoMode] = useState(false);
  const [selected, setSelected] = useState<Equipment | null>(null);

  return (
    <>
      <PageShell
        title={
          <span className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-[#FF6B2B] shrink-0" />
            Makine & Ekipman Merkezi
          </span>
        }
        subtitle="Filo, bakım, yakıt ve operatör yönetimi — AI destekli"
        actions={<FleetHeaderActions ceoMode={ceoMode} onToggleCeo={() => setCeoMode(v => !v)} />}
      >
        {ceoMode ? (
          <CEOView data={data} />
        ) : (
          <div className="space-y-4 lg:space-y-5">
            <FleetTabs active={tab} onChange={setTab} />
            <KpiRibbon data={data} />
            {tab === "overview" && <OverviewView data={data} />}
            {tab === "equipment" && (
              <EquipmentView
                items={data.equipment.filter(e => e.typeKey !== "truck")}
                onOpen={setSelected}
              />
            )}
            {tab === "vehicles" && (
              <EquipmentView
                items={data.equipment.filter(e => e.typeKey === "truck" || e.typeKey === "concrete-mixer")}
                onOpen={setSelected}
                isVehicles
              />
            )}
            {tab === "maintenance" && <MaintenanceView items={data.maintenance} />}
            {tab === "fuel" && <FuelView entries={data.fuel} />}
            {tab === "operators" && <OperatorsView items={data.assignments} />}
            {tab === "hours" && <WorkingHoursView data={data} />}
            {tab === "analytics" && <AnalyticsView data={data} />}
          </div>
        )}
      </PageShell>

      <EquipmentSheet
        equipment={selected}
        maintenance={data.maintenance}
        onClose={() => setSelected(null)}
      />
      <FleetFAB />
    </>
  );
}
