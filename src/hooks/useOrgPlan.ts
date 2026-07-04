import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";
import { toPublicPlan, type PublicPlan } from "@/lib/plans";

export interface QuotaSpec {
  limit: number;
  enforcement: "hard" | "soft";
  grace_pct: number;
}

export interface OrgPlanSummary {
  team_id: string | null;
  internal_plan: string;
  public_plan: PublicPlan;
  display_name: string;
  limits: Record<string, QuotaSpec>;
  features: Record<string, boolean>;
  feature_overrides: Record<string, { enabled: boolean; expires_at: string | null }>;
  limit_overrides: Record<string, QuotaSpec & { expires_at: string | null }>;
  usage: Record<string, number>;
}

interface State {
  loading: boolean;
  summary: OrgPlanSummary | null;
  error: string | null;
}

export function useOrgPlan() {
  const { user } = useUser();
  const [state, setState] = useState<State>({ loading: true, summary: null, error: null });

  const load = useCallback(async () => {
    if (!user) {
      setState({ loading: false, summary: null, error: null });
      return;
    }
    setState((s) => ({ ...s, loading: true }));
    const { data, error } = await supabase.rpc("get_org_plan_summary");
    if (error) {
      setState({ loading: false, summary: null, error: error.message });
      return;
    }
    const raw = (data ?? {}) as Partial<OrgPlanSummary> & { internal_plan?: string };
    setState({
      loading: false,
      summary: {
        team_id: raw.team_id ?? null,
        internal_plan: raw.internal_plan ?? "free",
        public_plan: toPublicPlan(raw.internal_plan ?? "free"),
        display_name: raw.display_name ?? "Starter",
        limits: (raw.limits as Record<string, QuotaSpec>) ?? {},
        features: (raw.features as Record<string, boolean>) ?? {},
        feature_overrides: (raw.feature_overrides as OrgPlanSummary["feature_overrides"]) ?? {},
        limit_overrides: (raw.limit_overrides as OrgPlanSummary["limit_overrides"]) ?? {},
        usage: (raw.usage as Record<string, number>) ?? {},
      },
      error: null,
    });
  }, [user]);

  useEffect(() => { load(); }, [load]);

  return { ...state, refresh: load };
}

export function effectiveLimit(summary: OrgPlanSummary | null, key: string): QuotaSpec | null {
  if (!summary) return null;
  const ov = summary.limit_overrides[key];
  if (ov) return { limit: ov.limit, enforcement: ov.enforcement, grace_pct: ov.grace_pct };
  return summary.limits[key] ?? null;
}

export function effectiveFeature(summary: OrgPlanSummary | null, key: string): boolean {
  if (!summary) return false;
  const ov = summary.feature_overrides[key];
  if (ov) return ov.enabled;
  return !!summary.features[key];
}
