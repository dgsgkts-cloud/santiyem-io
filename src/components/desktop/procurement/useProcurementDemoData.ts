// Sprint M1.4 — Procurement demo data hook.
// Extracted verbatim from ProcurementPage.tsx; no logic changes.
import { useMemo } from "react";
import { useProjects } from "@/hooks/useProjects";
import { useSubcontractors } from "@/hooks/useSubcontractors";
import {
  CATS,
  DELIV_STAGES,
  PRIORITIES,
  STATUSES,
  seed,
  type Order,
  type Request,
  type Supplier,
} from "./procurementConstants";

export type ProcurementData = {
  suppliers: Supplier[];
  requests: Request[];
  orders: Order[];
  projNames: string[];
};

export const useProcurementDemoData = (): ProcurementData => {
  const { projects } = useProjects();
  const { subcontractors } = useSubcontractors();

  return useMemo(() => {
    const projNames = (projects || []).map((p: any) => p.name).slice(0, 6);
    if (projNames.length === 0)
      projNames.push("Şantiye A", "Şantiye B", "Şantiye C");

    const supplierSeeds = (subcontractors || [])
      .slice(0, 8)
      .map((s: any) => s.name);
    while (supplierSeeds.length < 8) {
      supplierSeeds.push(
        [
          "Betonsa",
          "Erdemir Çelik",
          "Kalekim",
          "Filli Boya",
          "Ege Seramik",
          "İzocam",
          "Legrand",
          "Wilo Pompa",
        ][supplierSeeds.length]
      );
    }

    const suppliers: Supplier[] = supplierSeeds.map((name, i) => {
      const delivery = 70 + Math.round(seed(i + 1) * 30);
      const quality = 65 + Math.round(seed(i + 2) * 35);
      const price = 60 + Math.round(seed(i + 3) * 40);
      const response = 60 + Math.round(seed(i + 4) * 40);
      const payment = 70 + Math.round(seed(i + 5) * 30);
      const score = Math.round(
        (delivery + quality + price + response + payment) / 5
      );
      return {
        id: `sup-${i}`,
        name,
        category: CATS[i % CATS.length],
        score,
        delivery,
        quality,
        price,
        response,
        payment,
        orders: 3 + Math.round(seed(i + 6) * 22),
        totalSpend:
          Math.round((200000 + seed(i + 7) * 1800000) / 1000) * 1000,
      };
    });

    const requests: Request[] = Array.from({ length: 12 }).map((_, i) => {
      const proj = projNames[i % projNames.length];
      const projMatch = (projects || []).find((p: any) => p.name === proj);
      const st = STATUSES[i % STATUSES.length];
      const stageMap: Record<string, number> = {
        Taslak: 0,
        "Onay Bekliyor": 1,
        Onaylandı: 3,
        "Sipariş Verildi": 4,
        İptal: 0,
      };
      return {
        id: `req-${i}`,
        no: `PR-2026-${String(1024 + i).padStart(4, "0")}`,
        project: proj,
        projectId: projMatch?.id,
        category: CATS[i % CATS.length],
        requester: ["Ahmet Y.", "Merve K.", "Kerem D.", "Selin A."][i % 4],
        priority: PRIORITIES[i % 3],
        budget: Math.round((50000 + seed(i + 11) * 950000) / 500) * 500,
        needBy: Math.round(seed(i + 12) * 25) - 3,
        status: st,
        approvalStage: stageMap[st] ?? 0,
      };
    });

    const orders: Order[] = Array.from({ length: 10 }).map((_, i) => ({
      id: `po-${i}`,
      no: `PO-2026-${String(2048 + i).padStart(4, "0")}`,
      supplier: suppliers[i % suppliers.length].name,
      project: projNames[i % projNames.length],
      amount: Math.round((80000 + seed(i + 21) * 1200000) / 1000) * 1000,
      eta: Math.round(seed(i + 22) * 18) - 2,
      paid: i % 3 === 0,
      delivery: DELIV_STAGES[i % DELIV_STAGES.length],
      category: CATS[i % CATS.length],
    }));

    return { suppliers, requests, orders, projNames };
  }, [projects, subcontractors]);
};
