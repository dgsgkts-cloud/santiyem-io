// Read-only access to the database financial engine.
// No calculation happens on the client.

import { useQuery } from "@tanstack/react-query";
import {
  fetchCostCodeFinancials,
  fetchProjectFinancials,
} from "@/lib/finance/profitEngine";
import { supabase } from "@/integrations/supabase/client";

export const useProjectFinancials = (projectId?: string | null) =>
  useQuery({
    queryKey: ["project-financials", projectId],
    enabled: !!projectId,
    staleTime: 60_000,
    queryFn: () => fetchProjectFinancials(projectId as string),
  });

export const useCostCodeFinancials = (projectId?: string | null) =>
  useQuery({
    queryKey: ["cost-code-financials", projectId],
    enabled: !!projectId,
    staleTime: 60_000,
    queryFn: () => fetchCostCodeFinancials(projectId as string),
  });

export const useProjectRisks = (projectId?: string | null) =>
  useQuery({
    queryKey: ["project-risks", projectId],
    enabled: !!projectId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_risks")
        .select("*")
        .eq("project_id", projectId as string)
        .in("status", ["open", "acknowledged"])
        .order("detected_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

export const useForecastSnapshots = (projectId?: string | null, days = 90) =>
  useQuery({
    queryKey: ["forecast-snapshots", projectId, days],
    enabled: !!projectId,
    staleTime: 60_000,
    queryFn: async () => {
      const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from("project_forecast_snapshots")
        .select("*")
        .eq("project_id", projectId as string)
        .gte("snapshot_date", since)
        .order("snapshot_date", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
