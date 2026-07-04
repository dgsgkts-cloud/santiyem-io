import { Badge } from "@/components/ui/badge";
import { useOrgPlan } from "@/hooks/useOrgPlan";

export function PlanBadge({ className }: { className?: string }) {
  const { summary, loading } = useOrgPlan();
  if (loading) return null;
  const label = summary?.display_name ?? "Starter";
  const tier = summary?.public_plan ?? "starter";
  const variant =
    tier === "enterprise" ? "default" :
    tier === "professional" ? "secondary" : "outline";
  return <Badge variant={variant} className={className}>{label}</Badge>;
}
