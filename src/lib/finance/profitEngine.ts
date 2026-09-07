// Profit Intelligence read layer.
// ALL financial numbers come from the database calculation layer
// (project_financials / cost_code_financials). Nothing is computed here.

import { supabase } from "@/integrations/supabase/client";

export interface ProjectFinancials {
  project_id: string;
  original_revenue: number;
  forecast_revenue: number;
  original_budget: number;
  actual_cost: number;
  committed_cost: number;
  remaining_committed_cost: number;
  etc: number;
  eac: number;
  original_expected_profit: number;
  forecast_final_profit: number;
  profit_erosion: number;
  forecast_margin_percent: number;
  budget_variance: number;
}

export interface CostCodeFinancials {
  cost_code_id: string;
  code: string;
  name: string;
  parent_id: string | null;
  unit: string | null;
  original_budget: number;
  budget_unit_price: number;
  actual_cost: number;
  latest_unit_price: number | null;
  committed_total: number;
  remaining_committed: number;
  progress_percent: number;
  consumed_budget_percent: number;
  etc: number;
  etc_is_manual: boolean;
  uncommitted_remaining_forecast: number;
  eac: number;
  budget_variance: number;
}

const num = (v: unknown) => (v === null || v === undefined ? 0 : Number(v));

export const fetchProjectFinancials = async (projectId: string): Promise<ProjectFinancials | null> => {
  const { data, error } = await supabase.rpc("project_financials", { _project_id: projectId });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return null;
  const r = row as Record<string, unknown>;
  return {
    project_id: String(r.project_id ?? projectId),
    original_revenue: num(r.original_revenue),
    forecast_revenue: num(r.forecast_revenue),
    original_budget: num(r.original_budget),
    actual_cost: num(r.actual_cost),
    committed_cost: num(r.committed_cost),
    remaining_committed_cost: num(r.remaining_committed_cost),
    etc: num(r.etc),
    eac: num(r.eac),
    original_expected_profit: num(r.original_expected_profit),
    forecast_final_profit: num(r.forecast_final_profit),
    profit_erosion: num(r.profit_erosion),
    forecast_margin_percent: num(r.forecast_margin_percent),
    budget_variance: num(r.budget_variance),
  };
};

export const fetchCostCodeFinancials = async (projectId: string): Promise<CostCodeFinancials[]> => {
  const { data, error } = await supabase.rpc("cost_code_financials", { _project_id: projectId });
  if (error) throw error;
  return ((data as Record<string, unknown>[]) ?? []).map((r) => ({
    cost_code_id: String(r.cost_code_id),
    code: String(r.code ?? ""),
    name: String(r.name ?? ""),
    parent_id: (r.parent_id as string) ?? null,
    unit: (r.unit as string) ?? null,
    original_budget: num(r.original_budget),
    budget_unit_price: num(r.budget_unit_price),
    actual_cost: num(r.actual_cost),
    latest_unit_price: r.latest_unit_price === null || r.latest_unit_price === undefined ? null : num(r.latest_unit_price),
    committed_total: num(r.committed_total),
    remaining_committed: num(r.remaining_committed),
    progress_percent: num(r.progress_percent),
    consumed_budget_percent: num(r.consumed_budget_percent),
    etc: num(r.etc),
    etc_is_manual: r.etc_is_manual === true,
    uncommitted_remaining_forecast: num(r.uncommitted_remaining_forecast),
    eac: num(r.eac),
    budget_variance: num(r.budget_variance),
  }));
};

/** Runs the deterministic rule engine and refreshes open risks for a project. */
export const runRiskDetection = async (projectId: string): Promise<number> => {
  const { data, error } = await supabase.rpc("detect_project_risks", { _project_id: projectId });
  if (error) throw error;
  return num(data);
};

/** Writes (or refreshes) today's forecast snapshot for a project. */
export const captureForecastSnapshot = async (projectId: string): Promise<string | null> => {
  const { data, error } = await supabase.rpc("create_project_forecast_snapshot", { _project_id: projectId });
  if (error) throw error;
  return (data as string) ?? null;
};
