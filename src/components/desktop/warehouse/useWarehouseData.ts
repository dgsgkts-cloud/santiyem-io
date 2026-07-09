// Sprint M1.5 — Warehouse demo data hook (unchanged business logic).
import { useMemo } from "react";
import { useProjects } from "@/hooks/useProjects";
import { useSubcontractors } from "@/hooks/useSubcontractors";
import {
  seed, CATEGORIES, UNITS, MATERIALS,
  type Warehouse_, type Stock, type StockState, type Movement,
  type Transfer, type Assignment, type Count,
} from "./warehouseConstants";

export const useWarehouseData = () => {
  const { projects } = useProjects();
  const { subcontractors } = useSubcontractors();

  return useMemo(() => {
    const projNames = ((projects || []).map((p: any) => p.name).slice(0, 6));
    while (projNames.length < 4) projNames.push(`Şantiye ${projNames.length + 1}`);

    const supplierNames = ((subcontractors || []).slice(0, 6).map((s: any) => s.name));
    while (supplierNames.length < 6) {
      supplierNames.push(["Betonsa", "Erdemir Çelik", "Kalekim", "Filli Boya", "Ege Seramik", "İzocam"][supplierNames.length]);
    }

    const warehouses: Warehouse_[] = [
      { id: "wh-1", name: "Merkez Depo", type: "Merkez", manager: "Ahmet Yılmaz", location: "İstanbul / Tuzla", capacity: 5000, occupied: 3450, items: 128, value: 4_820_000 },
      { id: "wh-2", name: "Şantiye Deposu A", type: "Şantiye", manager: "Kerem Demir", location: projNames[0], capacity: 1200, occupied: 890, items: 62, value: 1_240_000 },
      { id: "wh-3", name: "Şantiye Deposu B", type: "Şantiye", manager: "Merve Kaya", location: projNames[1], capacity: 900, occupied: 320, items: 41, value: 480_000 },
      { id: "wh-4", name: "Geçici Alan", type: "Temporary", manager: "Selin Aksoy", location: projNames[2], capacity: 500, occupied: 470, items: 24, value: 320_000 },
      { id: "wh-5", name: "Konteyner 12", type: "Container", manager: "Osman Er", location: projNames[3], capacity: 200, occupied: 90, items: 18, value: 165_000 },
    ];

    const stocks: Stock[] = MATERIALS.map((name, i) => {
      const min = 40 + Math.round(seed(i + 1) * 60);
      const current = Math.round(seed(i + 2) * 220);
      const state: StockState = current === 0 ? "out" : current < min * 0.35 ? "critical" : current < min ? "low" : "healthy";
      return {
        id: `stk-${i}`, name,
        category: CATEGORIES[i % CATEGORIES.length],
        unit: UNITS[i % UNITS.length],
        warehouse: warehouses[i % warehouses.length].name,
        current,
        reserved: Math.round(current * seed(i + 3) * 0.3),
        min,
        avgCost: Math.round((80 + seed(i + 4) * 4200) / 10) * 10,
        supplier: supplierNames[i % supplierNames.length],
        lastPurchase: -Math.round(seed(i + 5) * 40),
        state,
      };
    });

    const movements: Movement[] = Array.from({ length: 14 }).map((_, i) => {
      const kinds: Movement["kind"][] = ["in", "out", "transfer", "adjust", "consume", "return"];
      const kind = kinds[i % kinds.length];
      const mat = MATERIALS[i % MATERIALS.length];
      return {
        id: `mv-${i}`, kind, material: mat,
        qty: Math.round(seed(i + 20) * 80 + 5),
        unit: UNITS[i % UNITS.length],
        warehouse: warehouses[i % warehouses.length].name,
        project: projNames[i % projNames.length],
        actor: ["Ahmet Y.", "Merve K.", "Kerem D.", "Selin A.", "Osman E."][i % 5],
        whenDays: -i,
        reason: ["Şantiye teslim", "İade", "Fire", "Transfer", "Tüketim", "Sayım fark"][i % 6],
      };
    });

    const transfers: Transfer[] = Array.from({ length: 6 }).map((_, i) => ({
      id: `tr-${i}`,
      from: warehouses[i % warehouses.length].name,
      to: warehouses[(i + 1) % warehouses.length].name,
      material: MATERIALS[i % MATERIALS.length],
      qty: 10 + Math.round(seed(i + 40) * 90),
      unit: UNITS[i % UNITS.length],
      status: (["requested", "approved", "transit", "done"] as const)[i % 4],
    }));

    const tools = ["Hilti Kırıcı", "Bosch Matkap", "Lazer Metre", "Makita Taşlama", "Kaynak Makinesi", "Baret + KKD Seti", "İskele Takımı", "Vibratör"];
    const assignments: Assignment[] = tools.map((t, i) => {
      const ret = 3 - i;
      return {
        id: `zm-${i}`, item: t,
        employee: ["Mehmet A.", "Hasan K.", "Ali T.", "Fatih Y.", "Barış O.", "Cem D.", "Deniz S.", "Emre G."][i],
        project: projNames[i % projNames.length],
        department: ["İnşaat", "Elektrik", "Mekanik", "Yardımcı"][i % 4],
        assignedDays: -10 - i * 2,
        returnDays: ret,
        returned: i > 5,
      };
    });

    const counts: Count[] = MATERIALS.slice(0, 8).map((m, i) => {
      const expected = 50 + Math.round(seed(i + 60) * 200);
      const diff = Math.round((seed(i + 61) - 0.5) * 20);
      return {
        id: `ct-${i}`, material: m, expected,
        counted: expected + diff,
        unit: UNITS[i % UNITS.length],
        warehouse: warehouses[i % warehouses.length].name,
      };
    });

    return { warehouses, stocks, movements, transfers, assignments, counts };
  }, [projects, subcontractors]);
};

export type WarehouseData = ReturnType<typeof useWarehouseData>;
