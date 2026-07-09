// Sprint M1.6 — Fleet data hook. Deterministic; no backend.
import { useMemo } from "react";
import { useProjects } from "@/hooks/useProjects";
import {
  makeEquipment, makeMaintenance, makeFuel, makeAssignments,
  type Equipment, type Maintenance, type FuelEntry, type OperatorAssignment,
} from "./fleetConstants";

export interface FleetData {
  equipment: Equipment[];
  maintenance: Maintenance[];
  fuel: FuelEntry[];
  assignments: OperatorAssignment[];
  totals: {
    active: number; inMaint: number; broken: number;
    monthFuelLiters: number; monthFuelCost: number; monthMaintCost: number;
    engineHoursToday: number; avgHealth: number; fleetValue: number; idleAssets: number;
  };
}

export function useFleetData(): FleetData {
  const { projects } = useProjects();
  const projectNames = useMemo(
    () => (projects.map((p: any) => p.name).filter(Boolean) as string[]).slice(0, 6),
    [projects]
  );
  const equipment = useMemo(
    () => makeEquipment(projectNames.length ? projectNames : ["Kartal Rezidans", "İzmir Ofis Kompleksi", "Antalya Otel Projesi"]),
    [projectNames]
  );
  const maintenance = useMemo(() => makeMaintenance(equipment), [equipment]);
  const fuel = useMemo(() => makeFuel(equipment), [equipment]);
  const assignments = useMemo(() => makeAssignments(equipment), [equipment]);

  const totals = useMemo(() => {
    const active = equipment.filter(e => e.status === "healthy" || e.status === "maintenance-soon").length;
    const inMaint = equipment.filter(e => e.status === "in-maintenance").length;
    const broken = equipment.filter(e => e.status === "broken").length;
    const monthFuelLiters = fuel.reduce((s, f) => s + f.liters, 0);
    const monthFuelCost = fuel.reduce((s, f) => s + f.liters * f.unitPrice, 0);
    const monthMaintCost = maintenance.filter(m => m.kind === "completed").reduce((s, m) => s + m.cost, 0);
    const engineHoursToday = equipment.reduce((s, e) => s + (e.utilization / 100) * 8, 0);
    const avgHealth = Math.round(equipment.reduce((s, e) => s + e.health, 0) / equipment.length);
    const fleetValue = equipment.reduce((s, e) => s + e.purchasePrice, 0);
    const idleAssets = equipment.filter(e => e.idleDays >= 5).length;
    return { active, inMaint, broken, monthFuelLiters, monthFuelCost, monthMaintCost, engineHoursToday, avgHealth, fleetValue, idleAssets };
  }, [equipment, fuel, maintenance]);

  return { equipment, maintenance, fuel, assignments, totals };
}
