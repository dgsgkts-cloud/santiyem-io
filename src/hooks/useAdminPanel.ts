// Internal Admin Panel veri erişimi.
// Tüm okumalar sunucu tarafında yetki kontrolü yapan RPC'ler üzerinden yapılır;
// yönetici olmayan bir hesap çağırsa bile veri dönmez.

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const rpc = async <T,>(name: string, args?: Record<string, unknown>): Promise<T> => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc(name, args ?? {});
  if (error) throw error;
  return data as T;
};

export interface AdminOverview {
  total_companies: number;
  total_users: number;
  active_users_30d: number;
  active_projects: number;
  total_projects: number;
  profit_ready_projects: number;
  whatsapp_connected: number;
  ai_insights_24h: number;
  failed_messages_24h: number;
  open_risks: number;
}

export interface AdminCompanyRow {
  unit_id: string;
  unit_name: string;
  owner_name: string | null;
  owner_email: string | null;
  kind: string;
  user_count: number;
  project_count: number;
  active_project_count: number;
  profit_ready_count: number;
  whatsapp_connected: boolean | null;
  account_status: string;
  last_activity: string | null;
}

export interface AdminUserRow {
  user_id: string;
  full_name: string | null;
  email: string | null;
  title: string | null;
  city: string | null;
  role: string;
  plan: string;
  company: string | null;
  account_status: string;
  last_activity: string | null;
  created_at: string;
}

export interface AdminProjectRow {
  id: string;
  name: string;
  status: string | null;
  company: string | null;
  budget_ready: boolean;
  snapshot_ready: boolean;
  last_snapshot_at: string | null;
  open_risks: number;
  created_at: string;
}

export interface AdminWhatsAppRow {
  id: string;
  status: string;
  mode: string | null;
  company: string | null;
  user_name: string | null;
  number_masked: string | null;
  last_health_check: string | null;
  connected_at: string | null;
  last_disconnected_at: string | null;
  last_message_at: string | null;
  last_error: string | null;
}

export interface AdminAiRow {
  run_hour: string;
  last_run_at: string;
  company: string | null;
  project_name: string | null;
  insight_count: number;
  model_version: string | null;
  failed_count: number;
}

export interface AdminHealth {
  profit_engine_last_budget_at: string | null;
  risk_engine_last_detect_at: string | null;
  forecast_snapshot_last_at: string | null;
  agent_last_run_at: string | null;
  evolution_connections_total: number;
  evolution_connected: number;
  evolution_last_health_check: string | null;
  scheduler_last_send_at: string | null;
  scheduler_failed_24h: number;
}

export interface AdminAuditRow {
  id: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  admin_name: string | null;
  created_at: string;
}

export const useIsPlatformAdmin = () =>
  useQuery({
    queryKey: ["admin", "whoami"],
    queryFn: () => rpc<boolean>("admin_whoami"),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

export const useAdminOverview = (enabled: boolean) =>
  useQuery({
    queryKey: ["admin", "overview"],
    queryFn: () => rpc<AdminOverview>("admin_overview"),
    enabled,
    staleTime: 60 * 1000,
  });

export const useAdminCompanies = (enabled: boolean, search: string, page: number, pageSize = 25) =>
  useQuery({
    queryKey: ["admin", "companies", search, page, pageSize],
    queryFn: () =>
      rpc<{ rows: AdminCompanyRow[]; total: number }>("admin_companies", {
        _search: search || null,
        _limit: pageSize,
        _offset: page * pageSize,
      }),
    enabled,
    staleTime: 60 * 1000,
  });

export const useAdminCompanyDetail = (unitId: string | null) =>
  useQuery({
    queryKey: ["admin", "company", unitId],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    queryFn: () => rpc<any>("admin_company_detail", { _unit_id: unitId }),
    enabled: !!unitId,
  });

export const useAdminUsers = (enabled: boolean, search: string, page: number, pageSize = 25) =>
  useQuery({
    queryKey: ["admin", "users", search, page, pageSize],
    queryFn: () =>
      rpc<{ rows: AdminUserRow[]; total: number }>("admin_users", {
        _search: search || null,
        _limit: pageSize,
        _offset: page * pageSize,
      }),
    enabled,
    staleTime: 60 * 1000,
  });

export const useAdminProjects = (enabled: boolean, search: string, page: number, pageSize = 25) =>
  useQuery({
    queryKey: ["admin", "projects", search, page, pageSize],
    queryFn: () =>
      rpc<{ rows: AdminProjectRow[]; total: number }>("admin_projects", {
        _search: search || null,
        _limit: pageSize,
        _offset: page * pageSize,
      }),
    enabled,
    staleTime: 60 * 1000,
  });

export const useAdminWhatsApp = (enabled: boolean) =>
  useQuery({
    queryKey: ["admin", "whatsapp"],
    queryFn: () => rpc<{ rows: AdminWhatsAppRow[]; total: number }>("admin_whatsapp", { _limit: 50, _offset: 0 }),
    enabled,
    staleTime: 60 * 1000,
  });

export const useAdminAiOps = (enabled: boolean) =>
  useQuery({
    queryKey: ["admin", "ai"],
    queryFn: () => rpc<{ rows: AdminAiRow[] }>("admin_ai_operations", { _limit: 50 }),
    enabled,
    staleTime: 60 * 1000,
  });

export const useAdminHealth = (enabled: boolean) =>
  useQuery({
    queryKey: ["admin", "health"],
    queryFn: () => rpc<AdminHealth>("admin_system_health"),
    enabled,
    staleTime: 60 * 1000,
  });

export const useAdminAudit = (enabled: boolean) =>
  useQuery({
    queryKey: ["admin", "audit"],
    queryFn: () => rpc<{ rows: AdminAuditRow[] }>("admin_audit_list", { _limit: 50 }),
    enabled,
    staleTime: 60 * 1000,
  });

export const logAdminAction = async (
  action: string,
  targetType?: string,
  targetId?: string,
  metadata?: Record<string, unknown>,
) => {
  try {
    await rpc("admin_log_action", {
      _action: action,
      _target_type: targetType ?? null,
      _target_id: targetId ?? null,
      _metadata: metadata ?? {},
    });
  } catch {
    // Denetim kaydı yazılamazsa panel çalışmaya devam eder.
  }
};
