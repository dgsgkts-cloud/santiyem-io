import { Badge } from "@/components/ui/badge";
import { useOrgPlan } from "@/hooks/useOrgPlan";
import { useUser } from "@/contexts/UserContext";

export function PlanBadge({ className }: { className?: string }) {
  const { plan } = useUser();
  const { summary, loading } = useOrgPlan();
  // Demo entitlement is never a billed plan — label it explicitly.
  if (plan === "demo_full_access") {
    return <Badge variant="secondary" className={className}>Demo Hesabı</Badge>;
  }
  if (loading) return null;
  const label = summary?.display_name ?? "Starter";
  const tier = summary?.public_plan ?? "starter";
  const variant =
    tier === "enterprise" ? "default" :
    tier === "professional" ? "secondary" : "outline";
  return <Badge variant={variant} className={className}>{label}</Badge>;
}
