import { useOrgPlan, effectiveLimit } from "./useOrgPlan";

export interface QuotaState {
  loading: boolean;
  limit: number | null;
  used: number;
  remaining: number | null;
  ratio: number;                   // used / limit (0..>1). 0 when unlimited.
  enforcement: "hard" | "soft";
  over: boolean;
  approaching: boolean;            // >= 80%
  critical: boolean;               // >= 95%
}

export function useQuota(metric: string): QuotaState {
  const { summary, loading } = useOrgPlan();
  const spec = effectiveLimit(summary, metric);
  const used = summary?.usage?.[metric] ?? 0;
  const limit = spec?.limit ?? null;
  const enforcement = spec?.enforcement ?? "soft";
  const unlimited = limit === null || limit < 0;
  const ratio = unlimited || !limit ? 0 : used / limit;
  return {
    loading,
    limit,
    used,
    remaining: unlimited ? null : Math.max((limit ?? 0) - used, 0),
    ratio,
    enforcement,
    over: !unlimited && used >= (limit ?? 0),
    approaching: !unlimited && ratio >= 0.8,
    critical: !unlimited && ratio >= 0.95,
  };
}
