// Demo account state for the shared investor demo (demo@santiyem.ai).
// Reads public.demo_accounts through the security-definer RPCs and starts the
// 7-day window on the first successful login.

import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";
import { setDemoModeActive } from "@/lib/demoMode";

export interface DemoState {
  isDemo: boolean;
  email?: string | null;
  companyName?: string | null;
  teamId?: string | null;
  firstLoginAt?: string | null;
  expiresAt?: string | null;
  lastLoginAt?: string | null;
  isActive: boolean;
  expired: boolean;
  blocked: boolean;
  remainingDays: number | null;
  accessDays: number;
  resetCount: number;
}

const EMPTY: DemoState = {
  isDemo: false,
  isActive: true,
  expired: false,
  blocked: false,
  remainingDays: null,
  accessDays: 7,
  resetCount: 0,
};

const mapRow = (row: any): DemoState => {
  if (!row || row.is_demo_account === false) return EMPTY;
  const expiresAt: string | null = row.expires_at ?? null;
  const expired = !!expiresAt && new Date(expiresAt).getTime() < Date.now();
  const remainingDays = expiresAt
    ? Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000))
    : row.access_days ?? 7;
  return {
    isDemo: true,
    email: row.email ?? null,
    companyName: row.company_name ?? null,
    teamId: row.team_id ?? null,
    firstLoginAt: row.first_login_at ?? null,
    expiresAt,
    lastLoginAt: row.last_login_at ?? null,
    isActive: row.is_active !== false,
    expired,
    blocked: row.is_active === false || expired,
    remainingDays,
    accessDays: row.access_days ?? 7,
    resetCount: row.reset_count ?? 0,
  };
};

/**
 * Registers the login (idempotent, starts the window once) and returns the
 * demo state. Non-demo users get a cheap no-op row and isDemo=false.
 */
export const useDemoAccount = () => {
  const { user } = useUser();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["demo-account-state", user?.id],
    enabled: !!user?.id,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<DemoState> => {
      // demo_register_login() starts the 7-day period on first login and
      // returns the resulting row; it is a no-op for regular accounts.
      const { data, error } = await supabase.rpc("demo_register_login");
      if (error) {
        const fallback = await supabase.rpc("demo_account_state");
        return mapRow(fallback.data);
      }
      return mapRow(data);
    },
  });

  useEffect(() => {
    setDemoModeActive(!!query.data?.isDemo);
  }, [query.data?.isDemo]);

  const state = query.data ?? EMPTY;

  return {
    ...state,
    loading: query.isLoading,
    refresh: () => qc.invalidateQueries({ queryKey: ["demo-account-state"] }),
  };
};

/** Read-only variant that never triggers login registration. */
export const useDemoStateOnly = () => {
  const { user } = useUser();
  return useQuery({
    queryKey: ["demo-account-state", user?.id],
    enabled: !!user?.id,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<DemoState> => {
      const { data } = await supabase.rpc("demo_account_state");
      return mapRow(data);
    },
  });
};
