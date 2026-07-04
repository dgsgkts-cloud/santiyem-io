import { useOrgPlan, effectiveFeature } from "./useOrgPlan";

export function useFeature(key: string): { enabled: boolean; loading: boolean } {
  const { summary, loading } = useOrgPlan();
  return { enabled: effectiveFeature(summary, key), loading };
}
