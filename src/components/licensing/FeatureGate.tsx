// Sprint 29.0 — FeatureGate. Wrap any UI that requires a specific license
// feature; renders a premium lock card + upgrade dialog when unavailable.
// Super Admin always bypasses. Trial and Demo behave per licenseStore rules.
import { ReactNode, useState } from "react";
import { Lock, Sparkles } from "lucide-react";
import {
  useLicense, FEATURE_LABELS, PLAN_META, minPlanFor, type LicenseFeature,
} from "@/lib/licenseStore";
import { PlanBadge } from "./PlanBadge";
import { UpgradeDialog } from "./UpgradeDialog";

interface FeatureGateProps {
  feature: LicenseFeature;
  children: ReactNode;
  /** Render nothing instead of the lock card when denied. */
  silent?: boolean;
  /** Render an inline compact lock instead of the full card. */
  compact?: boolean;
  fallback?: ReactNode;
}

export const FeatureGate = ({
  feature, children, silent, compact, fallback,
}: FeatureGateProps) => {
  const license = useLicense();
  const [open, setOpen] = useState(false);

  if (license.hasFeature(feature)) return <>{children}</>;
  if (silent) return null;
  if (fallback) return <>{fallback}</>;

  const target = minPlanFor(feature);
  const meta = PLAN_META[target];

  if (compact) {
    return (
      <>
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium text-muted-foreground border border-border hover:text-foreground hover:border-foreground/30 transition-colors"
        >
          <Lock className="w-3 h-3" />
          {FEATURE_LABELS[feature]}
          <PlanBadge plan={target} showIcon={false} />
        </button>
        <UpgradeDialog open={open} onOpenChange={setOpen} feature={feature} />
      </>
    );
  }

  return (
    <>
      <div
        className="rounded-xl border p-6 text-center flex flex-col items-center gap-3"
        style={{
          borderColor: meta.border,
          background: `linear-gradient(160deg, ${meta.bg}, transparent 65%)`,
        }}
      >
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center"
          style={{ background: meta.bg, border: `1px solid ${meta.border}` }}
        >
          <Sparkles className="w-5 h-5" style={{ color: meta.color }} />
        </div>
        <div>
          <div className="text-[14px] font-semibold text-foreground">
            {FEATURE_LABELS[feature]} — Premium özellik
          </div>
          <div className="text-[12px] text-muted-foreground mt-1">
            Bu modül mevcut planınızda kilitli. Erişim için planı yükseltebilirsiniz.
          </div>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[11px] text-muted-foreground">Gerekli plan:</span>
          <PlanBadge plan={target} />
        </div>
        <button
          onClick={() => setOpen(true)}
          className="mt-2 h-9 px-4 rounded-md text-[12px] font-semibold text-white"
          style={{ background: "#FF6B2B" }}
        >
          Planı yükselt
        </button>
      </div>
      <UpgradeDialog open={open} onOpenChange={setOpen} feature={feature} />
    </>
  );
};

export default FeatureGate;
