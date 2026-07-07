// Sprint 29.0 — PlanBadge. Uniform badge for every plan/trial/demo/admin state.
import { PLAN_META, type LicensePlan } from "@/lib/licenseStore";
import { Crown, Sparkles, Rocket, Building2, Zap, Beaker, Shield } from "lucide-react";

const ICONS: Record<LicensePlan, typeof Crown> = {
  starter: Sparkles,
  pro: Rocket,
  business: Building2,
  enterprise: Crown,
  trial: Zap,
  demo: Beaker,
  super_admin: Shield,
};

interface PlanBadgeProps {
  plan: LicensePlan;
  size?: "sm" | "md";
  className?: string;
  showIcon?: boolean;
}

export const PlanBadge = ({ plan, size = "sm", className = "", showIcon = true }: PlanBadgeProps) => {
  const meta = PLAN_META[plan];
  const Icon = ICONS[plan];
  const isSm = size === "sm";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md font-semibold uppercase tracking-wide ${className}`}
      style={{
        color: meta.color,
        backgroundColor: meta.bg,
        border: `1px solid ${meta.border}`,
        fontSize: isSm ? 10 : 11,
        padding: isSm ? "2px 6px" : "3px 8px",
        lineHeight: 1.1,
      }}
    >
      {showIcon && <Icon className="w-3 h-3" />}
      {meta.label}
    </span>
  );
};

export default PlanBadge;
