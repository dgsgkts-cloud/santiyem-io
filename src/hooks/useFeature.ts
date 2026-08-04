import { useOrgPlan, effectiveFeature } from "./useOrgPlan";
import { useUser } from "@/contexts/UserContext";

export function useFeature(key: string): { enabled: boolean; loading: boolean } {
  const { plan, role } = useUser();
  const { summary, loading } = useOrgPlan();
  // Demo entitlement and super admin bypass every plan feature gate.
  if (plan === "demo_full_access" || role === "admin") return { enabled: true, loading: false };
  return { enabled: effectiveFeature(summary, key), loading };
}
