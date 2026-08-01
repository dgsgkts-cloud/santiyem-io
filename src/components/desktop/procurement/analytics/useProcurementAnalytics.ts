// Satın Alma → Analitik: one data hook shared by Analitik and CEO Modu.
// Reads only real connected records (purchase orders + nested children,
// purchase requests, RFQ records, project budgets) and runs them through the
// pure analytics engine, so both views can never drift apart.
import { useCallback, useMemo, useState } from "react";
import { useProjects } from "@/hooks/useProjects";
import { useLicense } from "@/lib/licenseStore";
import type { OrderWorkflow } from "../orders/usePurchaseOrders";
import type { RfqRecord } from "../rfq/rfqModel";
import type { Request } from "../procurementConstants";
import {
  buildAnalytics,
  canViewAnalytics,
  canViewCashSources,
  canViewFinancials,
  defaultFilters,
  rangeForPreset,
  type AnalyticsFilters,
  type AnalyticsResult,
  type DatePreset,
} from "./analyticsModel";

export interface ProcurementAnalytics {
  filters: AnalyticsFilters;
  setFilters: (patch: Partial<AnalyticsFilters>) => void;
  setPreset: (preset: DatePreset) => void;
  clearFilters: () => void;
  result: AnalyticsResult;
  isLoading: boolean;
  refresh: () => void;
  lastRefreshedAt: Date;
  canView: boolean;
  canViewFinancials: boolean;
  canViewCashSources: boolean;
}

interface Args {
  orderWorkflow: OrderWorkflow;
  requests: Request[];
  rfqs: RfqRecord[];
  filters: AnalyticsFilters;
  onFiltersChange: (next: AnalyticsFilters) => void;
}

export const useProcurementAnalytics = ({
  orderWorkflow,
  requests,
  rfqs,
  filters,
  onFiltersChange,
}: Args): ProcurementAnalytics => {
  const { projects } = useProjects();
  const license = useLicense();
  const [lastRefreshedAt, setLastRefreshedAt] = useState(() => new Date());

  const setFilters = useCallback(
    (patch: Partial<AnalyticsFilters>) => onFiltersChange({ ...filters, ...patch }),
    [filters, onFiltersChange]
  );

  const setPreset = useCallback(
    (preset: DatePreset) => {
      if (preset === "custom") {
        onFiltersChange({ ...filters, preset });
        return;
      }
      const range = rangeForPreset(preset);
      onFiltersChange({ ...filters, preset, from: range.from, to: range.to });
    },
    [filters, onFiltersChange]
  );

  const clearFilters = useCallback(
    () => onFiltersChange(defaultFilters()),
    [onFiltersChange]
  );

  const refresh = useCallback(() => {
    orderWorkflow.refetch();
    setLastRefreshedAt(new Date());
  }, [orderWorkflow]);

  const result = useMemo(
    () =>
      buildAnalytics({
        orders: orderWorkflow.orders,
        requests,
        rfqs,
        projects: (projects || []).map((p) => ({
          id: p.id,
          name: p.name,
          budget: p.budget,
          contract_amount: p.contract_amount ?? null,
        })),
        filters,
        now: lastRefreshedAt,
      }),
    [orderWorkflow.orders, requests, rfqs, projects, filters, lastRefreshedAt]
  );

  return {
    filters,
    setFilters,
    setPreset,
    clearFilters,
    result,
    isLoading: orderWorkflow.isLoading,
    refresh,
    lastRefreshedAt,
    canView: canViewAnalytics(license.role),
    canViewFinancials: canViewFinancials(license.role),
    canViewCashSources: canViewCashSources(license.role),
  };
};
