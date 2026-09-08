// Profit / Risk Agent read layer.
// Insights are produced by the `profit-agent` edge function and stored in the
// database. Every amount shown here was copied from the deterministic finance
// engine — the client never calculates and the model never supplies numbers.

import { useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ProfitInsight {
  id: string;
  project_id: string | null;
  scope: string;
  insight_type: string;
  priority: number;
  title: string;
  summary: string | null;
  recommended_action: string | null;
  financial_impact: number | null;
  cost_code_id: string | null;
  related_risk_ids: string[] | null;
  confidence: string;
  status: string;
  generated_at: string;
  metadata: Record<string, unknown> | null;
}

const STALE_MS = 60 * 60 * 1000; // 1 saat sonra arka planda tazele

const select = (scope: "project" | "portfolio", projectId?: string | null) => {
  let q = supabase
    .from("ai_project_insights")
    .select(
      "id,project_id,scope,insight_type,priority,title,summary,recommended_action,financial_impact,cost_code_id,related_risk_ids,confidence,status,generated_at,metadata",
    )
    .eq("scope", scope)
    .eq("status", "active")
    .order("priority", { ascending: true })
    .limit(scope === "portfolio" ? 5 : 3);
  if (scope === "project" && projectId) q = q.eq("project_id", projectId);
  return q;
};

export const useProfitInsights = (
  scope: "project" | "portfolio",
  projectId?: string | null,
  options?: { enabled?: boolean; autoRefresh?: boolean },
) => {
  const enabled = options?.enabled !== false && (scope === "portfolio" || !!projectId);
  const qc = useQueryClient();
  const triggered = useRef(false);

  const query = useQuery({
    queryKey: ["profit-insights", scope, projectId ?? null],
    enabled,
    staleTime: 60_000,
    queryFn: async (): Promise<ProfitInsight[]> => {
      const { data, error } = await select(scope, projectId);
      if (error) throw error;
      return (data ?? []) as unknown as ProfitInsight[];
    },
  });

  const run = useMutation<{ ok?: boolean; reason?: string; summary?: string }, Error, boolean>({
    mutationFn: async (force: boolean) => {
      const { data, error } = await supabase.functions.invoke("profit-agent", {
        body: { scope, project_id: projectId ?? undefined, force },
      });
      if (error) throw error;
      return data as { ok?: boolean; reason?: string; summary?: string };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profit-insights", scope, projectId ?? null] });
    },
  });

  // Kullanıcı ekranı açtığında veri eskiyse tek bir analiz tetiklenir (debounce
  // ve tazelik kontrolü edge function tarafında da uygulanır).
  const rows = query.data;
  useEffect(() => {
    if (!enabled || options?.autoRefresh === false || triggered.current || !rows) return;
    const newest = rows[0]?.generated_at ? new Date(rows[0].generated_at).getTime() : 0;
    if (rows.length === 0 || Date.now() - newest > STALE_MS) {
      triggered.current = true;
      run.mutate(false);
    }
  }, [enabled, rows, options?.autoRefresh]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    insights: rows ?? [],
    isLoading: query.isLoading,
    isRunning: run.isPending,
    failed: run.isError || (run.data?.ok === false),
    generatedAt: rows?.[0]?.generated_at ?? null,
    refresh: () => run.mutate(true),
  };
};

export const relativeTime = (iso?: string | null) => {
  if (!iso) return null;
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60000);
  if (m < 1) return "az önce";
  if (m < 60) return `${m} dk önce`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} saat önce`;
  return `${Math.round(h / 24)} gün önce`;
};
