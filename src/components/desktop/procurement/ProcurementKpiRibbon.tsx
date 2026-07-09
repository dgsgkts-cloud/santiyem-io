// Sprint M1.4 — 7-tile KPI ribbon using shared KpiCard + ResponsiveGrid.
import {
  AlertTriangle,
  ClipboardList,
  Clock,
  ShoppingCart,
  Star,
  Truck,
  Wallet,
} from "lucide-react";
import { KpiCard, ResponsiveGrid } from "@/components/ui/responsive";
import type { ProcurementData } from "./useProcurementDemoData";

interface Props {
  data: ProcurementData;
}

export const ProcurementKpiRibbon = ({ data }: Props) => {
  const pendingApprovals = data.requests.filter(
    (r) => r.status === "Onay Bekliyor"
  ).length;
  const openReqs = data.requests.filter(
    (r) => r.status !== "İptal" && r.status !== "Sipariş Verildi"
  ).length;
  const delayed = data.orders.filter((o) => o.eta < 0).length;
  const avgSup = Math.round(
    data.suppliers.reduce((s, x) => s + x.score, 0) /
      Math.max(1, data.suppliers.length)
  );
  const pendingDeliv = data.orders.filter(
    (o) => o.delivery !== "Teslim Edildi"
  ).length;

  return (
    <ResponsiveGrid
      variant="auto"
      minItemWidth={160}
      className="gap-3"
    >
      <KpiCard
        label="Açık Talep"
        value={openReqs}
        icon={ClipboardList}
        trend={{ value: "+3", positive: true }}
      />
      <KpiCard
        label="Bekleyen Onay"
        value={pendingApprovals}
        icon={Clock}
        trend={{ value: "-1", positive: true }}
      />
      <KpiCard
        label="Bu Ay Sipariş"
        value={data.orders.length}
        icon={ShoppingCart}
        trend={{ value: "+12%", positive: true }}
      />
      <KpiCard
        label="Beklenen Teslim"
        value={pendingDeliv}
        icon={Truck}
      />
      <KpiCard
        label="Geciken"
        value={delayed}
        icon={AlertTriangle}
        trend={{ value: "+1", positive: false }}
      />
      <KpiCard
        label="Tedarikçi Puanı"
        value={avgSup}
        icon={Star}
        trend={{ value: "+2", positive: true }}
      />
      <KpiCard
        label="Bütçe Kullanımı"
        value="%64"
        icon={Wallet}
        trend={{ value: "+8%", positive: false }}
      />
    </ResponsiveGrid>
  );
};

export default ProcurementKpiRibbon;
