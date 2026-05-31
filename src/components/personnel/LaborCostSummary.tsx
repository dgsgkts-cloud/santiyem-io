import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Wallet, Users, Briefcase } from "lucide-react";
import { useLaborCost } from "@/hooks/useAttendanceGrid";

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
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Button size="icon" variant="outline" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <span className="font-semibold min-w-[160px] text-center">{MONTH_NAMES[month.getMonth()]} {month.getFullYear()}</span>
        <Button size="icon" variant="outline" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {loading || !data ? (
        <p className="text-sm text-muted-foreground">Yükleniyor...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {canViewCost && (
            <>
              <Card className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">
                  <Users className="w-4 h-4" /> YEVMİYELİ
                </div>
                <div className="text-2xl font-bold">{fmt(Number(data.daily_wage_cost))}</div>
                <div className="text-xs text-muted-foreground mt-1">{data.daily_wage_count} kişi</div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">
                  <Briefcase className="w-4 h-4" /> MAKTU AYLIK
                </div>
                <div className="text-2xl font-bold">{fmt(Number(data.monthly_salary_cost))}</div>
                <div className="text-xs text-muted-foreground mt-1">{data.monthly_salary_count} kişi</div>
              </Card>
              <Card className="p-4 border-[#FF6B2B]/40 bg-[#FF6B2B]/5">
                <div className="flex items-center gap-2 text-[#FF6B2B] text-xs mb-2">
                  <Wallet className="w-4 h-4" /> TOPLAM PERSONEL MALİYETİ
                </div>
                <div className="text-2xl font-bold text-[#FF6B2B]">{fmt(Number(data.total_cost))}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Gider olarak Kasa raporlarına ayrı kategori yansır
                </div>
              </Card>
            </>
          )}
          <Card className={`p-4 ${canViewCost ? "" : "md:col-span-3"}`}>
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">
              <Users className="w-4 h-4" /> TAŞERON EKİBİ (KONTROL)
            </div>
            <div className="text-lg font-semibold">{data.subcontractor_crew_count} kişi · {data.subcontractor_crew_days} adam-gün</div>
            <div className="text-xs text-muted-foreground mt-1">
              Maliyet taşeron sözleşmesinden gelir, puantajdan hesaplanmaz.
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
