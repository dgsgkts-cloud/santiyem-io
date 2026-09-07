// Read-only portfolio view of the database financial engine.
// One RPC call for the whole company — no per-project queries, no client math.

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PortfolioProjectRow {
  id: string;
  name: string;
  status: string | null;
  original_revenue: number;
  forecast_revenue: number;
  original_budget: number;
  actual_cost: number;
  eac: number;
  original_expected_profit: number;
  forecast_final_profit: number;
  profit_erosion: number;
  forecast_margin_percent: number;
  open_risks: number;
  critical_risks: number;
  risk_amount: number;
  is_ready: boolean;
}

export interface PortfolioTotals {
  project_count: number;
  ready_count: number;
  forecast_final_profit: number;
  original_expected_profit: number;
  profit_erosion: number;
  forecast_revenue: number;
  actual_cost: number;
  eac: number;
  open_risks: number;
  risk_amount: number;
}

export interface PortfolioRiskRow {
  id: string;
  project_id: string;
  project_name: string | null;
  risk_type: string | null;
  severity: string | null;
  title: string | null;
  description: string | null;
  financial_impact: number | null;
  cost_code_id: string | null;
  detected_at: string | null;
}

export interface PortfolioFinancials {
  totals: PortfolioTotals;
  projects: PortfolioProjectRow[];
  risks: PortfolioRiskRow[];
}

const num = (v: unknown) => (v === null || v === undefined ? 0 : Number(v));

const EMPTY_TOTALS: PortfolioTotals = {
  project_count: 0, ready_count: 0, forecast_final_profit: 0,
  original_expected_profit: 0, profit_erosion: 0, forecast_revenue: 0,
  actual_cost: 0, eac: 0, open_risks: 0, risk_amount: 0,
};

export const usePortfolioFinancials = () =>
  useQuery({
    queryKey: ["portfolio-financials"],
    staleTime: 60_000,
    queryFn: async (): Promise<PortfolioFinancials> => {
      const { data, error } = await supabase.rpc("portfolio_financials" as never);
      if (error) throw error;
      const raw = (data ?? {}) as Record<string, unknown>;
      const t = (raw.totals ?? {}) as Record<string, unknown>;
      const totals: PortfolioTotals = {
        ...EMPTY_TOTALS,
        project_count: num(t.project_count),
        ready_count: num(t.ready_count),
        forecast_final_profit: num(t.forecast_final_profit),
        original_expected_profit: num(t.original_expected_profit),
        profit_erosion: num(t.profit_erosion),
        forecast_revenue: num(t.forecast_revenue),
        actual_cost: num(t.actual_cost),
        eac: num(t.eac),
        open_risks: num(t.open_risks),
        risk_amount: num(t.risk_amount),
      };
      const projects = ((raw.projects as Record<string, unknown>[]) ?? []).map((p) => ({
        id: String(p.id),
        name: String(p.name ?? ""),
        status: (p.status as string) ?? null,
        original_revenue: num(p.original_revenue),
        forecast_revenue: num(p.forecast_revenue),
        original_budget: num(p.original_budget),
        actual_cost: num(p.actual_cost),
        eac: num(p.eac),
        original_expected_profit: num(p.original_expected_profit),
        forecast_final_profit: num(p.forecast_final_profit),
        profit_erosion: num(p.profit_erosion),
        forecast_margin_percent: num(p.forecast_margin_percent),
        open_risks: num(p.open_risks),
        critical_risks: num(p.critical_risks),
        risk_amount: num(p.risk_amount),
        is_ready: p.is_ready === true,
      })) as PortfolioProjectRow[];
      const risks = ((raw.risks as Record<string, unknown>[]) ?? []).map((r) => ({
        id: String(r.id),
        project_id: String(r.project_id ?? ""),
        project_name: (r.project_name as string) ?? null,
        risk_type: (r.risk_type as string) ?? null,
        severity: (r.severity as string) ?? null,
        title: (r.title as string) ?? null,
        description: (r.description as string) ?? null,
        financial_impact: r.financial_impact === null || r.financial_impact === undefined ? null : num(r.financial_impact),
        cost_code_id: (r.cost_code_id as string) ?? null,
        detected_at: (r.detected_at as string) ?? null,
      })) as PortfolioRiskRow[];
      return { totals, projects, risks };
    },
  });
