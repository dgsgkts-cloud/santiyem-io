import { useMemo } from "react";
import { toast } from "sonner";
import { AlertCircle, Loader2, Wallet } from "lucide-react";
import {
  useCostCodeFinancials, useForecastSnapshots, useProjectFinancials, useProjectRisks,
} from "@/hooks/useProjectFinancials";
import ProfitHeadline from "./ProfitHeadline";
import ProfitDrainSection from "./ProfitDrainSection";
import ProfitRiskSection, { type RiskRow } from "./ProfitRiskSection";
import ProfitTrendChart from "./ProfitTrendChart";

/**
 * Project Profit Intelligence — kullanıcıya "Proje Kârlılığı" olarak görünür.
 * Tüm rakamlar veritabanı finans motorundan gelir; frontend hesap yapmaz.
 * Mobil ve desktop için tek responsive yerleşim.
 */
export default function ProjectProfitPanel({ projectId }: { projectId: string }) {
  const { data: fin, isLoading, error } = useProjectFinancials(projectId);
  const { data: costItems = [] } = useCostCodeFinancials(projectId);
  const { data: risks = [] } = useProjectRisks(projectId);
  const { data: snapshots = [] } = useForecastSnapshots(projectId);

  const costCodeNames = useMemo(() => {
    const map: Record<string, string> = {};
    costItems.forEach((c) => { map[c.cost_code_id] = c.name || c.code; });
    return map;
  }, [costItems]);

  const codedItems = useMemo(() => costItems.filter((c) => !c.is_uncoded), [costItems]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-10 justify-center text-[13px] text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" /> Kârlılık verisi hazırlanıyor…
      </div>
    );
  }

  if (error || !fin) {
    return (
      <Notice
        icon={<AlertCircle className="w-5 h-5" />}
        title="Kârlılık verisi şu anda görüntülenemiyor"
        text="Birkaç saniye sonra tekrar deneyin."
      />
    );
  }

  const noBudget = fin.original_budget === 0;
  const noCostCodes = codedItems.length === 0;

  return (
    <div className="space-y-4 lg:space-y-5 min-w-0">
      <ProfitHeadline f={fin} />

      {noBudget && (
        <Notice
          icon={<Wallet className="w-5 h-5" />}
          title="Kârlılık analizi için başlangıç bütçenizi ekleyin."
          text="Bütçe girildiğinde kârın nerede eridiğini kalem kalem görebilirsiniz."
          cta="Bütçe Oluştur"
        />
      )}

      {noCostCodes ? (
        <Notice
          icon={<AlertCircle className="w-5 h-5" />}
          title="Maliyetlerin nereden saptığını görebilmek için iş kalemlerinizi ekleyin."
          text="İş kalemleri eklendiğinde giderleriniz otomatik olarak bu kalemlere dağıtılır."
          cta="İş Kalemlerini Oluştur"
        />
      ) : (
        <ProfitDrainSection items={costItems} />
      )}

      <ProfitRiskSection risks={risks as RiskRow[]} costCodeNames={costCodeNames} />

      <ProfitTrendChart snapshots={snapshots as any} />
    </div>
  );
}

function Notice({
  icon, title, text, cta,
}: { icon: React.ReactNode; title: string; text: string; cta?: string }) {
  return (
    <div className="rounded-card border border-border/80 bg-card shadow-card p-5 flex items-start gap-3">
      <span className="text-muted-foreground shrink-0 mt-0.5">{icon}</span>
      <div className="min-w-0">
        <p className="text-[14px] font-medium text-foreground">{title}</p>
        <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">{text}</p>
        {cta && (
          <button
            type="button"
            onClick={() => toast.info("İş kalemi ve bütçe giriş ekranı bir sonraki adımda geliyor.")}
            className="mt-3 h-9 px-3 rounded-lg bg-primary text-primary-foreground text-[13px] font-medium hover:opacity-90 transition-opacity"
          >
            {cta}
          </button>
        )}
      </div>
    </div>
  );
}
