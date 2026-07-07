// Sprint 29.0 — Upgrade dialog.
// Premium orange design, reused by FeatureGate + LimitGuard.
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Check, Sparkles, X } from "lucide-react";
import { PlanBadge } from "./PlanBadge";
import {
  useLicense, PLAN_META, FEATURE_LABELS, minPlanFor,
  openSubscriptionPage, type LicenseFeature, type LicensePlan,
} from "@/lib/licenseStore";

interface UpgradeDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  /** The feature the user tried to reach (drives copy + recommended plan). */
  feature?: LicenseFeature;
  /** Custom title + body override (used by LimitGuard for quota walls). */
  title?: string;
  description?: string;
  /** Explicit target plan; otherwise inferred from `feature`. */
  recommendedPlan?: LicensePlan;
}

const PLAN_HIGHLIGHTS: Record<LicensePlan, string[]> = {
  starter: ["2 aktif proje", "10 personel", "Temel raporlar", "Günde 20 AI"],
  pro: ["10 aktif proje", "100 personel", "Finans + Satın Alma + Depo", "CEO Modu", "Günde 300 AI"],
  business: ["50 aktif proje", "Sınırsız personel & depo", "Makine & Filo", "Gelişmiş analitik", "Günde 1.500 AI"],
  enterprise: ["Sınırsız her şey", "API + SSO", "Çoklu şirket", "Özel entegrasyonlar", "Sınırsız AI"],
  trial: [],
  demo: [],
  super_admin: [],
};

export const UpgradeDialog = ({
  open, onOpenChange, feature, title, description, recommendedPlan,
}: UpgradeDialogProps) => {
  const license = useLicense();
  const target: LicensePlan = recommendedPlan ?? (feature ? minPlanFor(feature) : "pro");
  const meta = PLAN_META[target];
  const featureLabel = feature ? FEATURE_LABELS[feature] : "Bu özellik";

  const handleUpgrade = () => {
    onOpenChange(false);
    openSubscriptionPage();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden border-border">
        <div
          className="p-5 border-b border-border"
          style={{
            background: `linear-gradient(135deg, ${meta.bg}, transparent 70%)`,
          }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center"
                style={{ background: meta.bg, border: `1px solid ${meta.border}` }}
              >
                <Sparkles className="w-4 h-4" style={{ color: meta.color }} />
              </div>
              <div>
                <DialogHeader className="p-0 space-y-0">
                  <DialogTitle className="text-[15px] font-semibold text-foreground">
                    {title ?? "Premium özellik"}
                  </DialogTitle>
                </DialogHeader>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {description ?? `${featureLabel} için plan yükseltmeniz gerekiyor.`}
                </p>
              </div>
            </div>
            <button
              onClick={() => onOpenChange(false)}
              className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label="Kapat"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between text-[12px]">
            <span className="text-muted-foreground">Mevcut plan</span>
            <PlanBadge plan={license.plan} />
          </div>
          <div className="flex items-center justify-between text-[12px]">
            <span className="text-muted-foreground">Önerilen plan</span>
            <PlanBadge plan={target} />
          </div>

          <div
            className="rounded-lg p-3 space-y-1.5"
            style={{ background: "hsl(var(--muted)/0.4)", border: "1px solid hsl(var(--border))" }}
          >
            {(PLAN_HIGHLIGHTS[target] || []).map((h) => (
              <div key={h} className="flex items-center gap-2 text-[12px] text-foreground">
                <Check className="w-3.5 h-3.5" style={{ color: "#FF6B2B" }} />
                {h}
              </div>
            ))}
          </div>
        </div>

        <DialogFooter className="px-5 pb-5 pt-0 gap-2 sm:gap-2">
          <button
            onClick={() => onOpenChange(false)}
            className="h-9 px-3 rounded-md text-[12px] font-medium text-muted-foreground hover:text-foreground border border-border bg-transparent"
          >
            Daha sonra
          </button>
          <button
            onClick={() => { onOpenChange(false); openSubscriptionPage(); }}
            className="h-9 px-3 rounded-md text-[12px] font-medium text-muted-foreground hover:text-foreground border border-border bg-transparent"
          >
            Planları karşılaştır
          </button>
          <button
            onClick={handleUpgrade}
            className="h-9 px-4 rounded-md text-[12px] font-semibold text-white shadow-sm"
            style={{ background: "#FF6B2B" }}
          >
            Planı yükselt
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UpgradeDialog;
