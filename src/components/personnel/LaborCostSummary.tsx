import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Wallet, Users, Briefcase } from "lucide-react";
import { useLaborCost } from "@/hooks/useAttendanceGrid";
import { KpiCard } from "@/components/ui/responsive/KpiCard";
import { ResponsiveGrid } from "@/components/ui/responsive/ResponsiveGrid";
import { SectionCard } from "@/components/ui/responsive/SectionCard";

const MONTH_NAMES = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];

const fmt = (n: number) => new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(n || 0);

interface Props {
  projectId: string;
  canViewCost: boolean;
}

export default function LaborCostSummary({ projectId, canViewCost }: Props) {
  const [month, setMonth] = useState(() => new Date());
  const { data, loading } = useLaborCost(projectId, month);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button size="icon" variant="outline" aria-label="Önceki ay" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <span className="font-semibold min-w-[160px] text-center text-fs-md">{MONTH_NAMES[month.getMonth()]} {month.getFullYear()}</span>
        <Button size="icon" variant="outline" aria-label="Sonraki ay" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {loading || !data ? (
        <SectionCard><div className="space-y-2">{[0, 1, 2].map((i) => (<div key={i} className="ds-skeleton h-10 rounded-lg" />))}</div></SectionCard>
      ) : (
        <ResponsiveGrid variant="kpi">
          {canViewCost && (
            <>
              <KpiCard
                label="Yevmiyeli"
                value={fmt(Number(data.daily_wage_cost))}
                hint={`${data.daily_wage_count} kişi`}
                icon={Users}
              />
              <KpiCard
                label="Maktu Aylık"
                value={fmt(Number(data.monthly_salary_cost))}
                hint={`${data.monthly_salary_count} kişi`}
                icon={Briefcase}
              />
              <KpiCard
                label="Toplam Personel Maliyeti"
                value={fmt(Number(data.total_cost))}
                hint="Kasa raporlarına ayrı kategori olarak yansır"
                icon={Wallet}
                accent="primary"
              />
            </>
          )}
          <KpiCard
            label="Taşeron Ekibi (Kontrol)"
            value={`${data.subcontractor_crew_count} kişi`}
            hint={`${data.subcontractor_crew_days} adam-gün · maliyet taşeron sözleşmesinden`}
            icon={Users}
          />
        </ResponsiveGrid>
      )}
    </div>
  );
}
