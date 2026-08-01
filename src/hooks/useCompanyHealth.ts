import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";
import type { CompanyHealthAccess, CompanyHealthPayload } from "@/lib/companyHealth";

let cache: { userId: string; at: number; promise: Promise<any> } | null = null;
export const resetCompanyHealthCache = () => {
  cache = null;
};

interface State {
  loading: boolean;
  /** Server-resolved permission set. `can_view: false` → render nothing. */
  access: CompanyHealthAccess | null;
  payload: CompanyHealthPayload | null;
  denied: boolean;
  refetch: () => Promise<void>;
  /** Records an audit-log row (view / expand / export). */
  logAccess: (section: string, action?: string) => Promise<void>;
}

/**
 * Loads the company-health summary through the server RPC. All permission
 * checks and the score computation happen in the database — an unauthorized
 * caller receives an error and never sees any figure.
 */
export function useCompanyHealth(options?: { auto?: boolean }): State {
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [access, setAccess] = useState<CompanyHealthAccess | null>(null);
  const [payload, setPayload] = useState<CompanyHealthPayload | null>(null);
  const [denied, setDenied] = useState(false);

  const load = useCallback(async () => {
    if (!user) {
      setAccess(null);
      setPayload(null);
      setDenied(true);
      setLoading(false);
      return;
    }
    setLoading(true);
    // Several dashboard surfaces show the score at once — share one in-flight
    // request for a short window instead of hitting the RPC per component.
    if (!cache || cache.userId !== user.id || Date.now() - cache.at > 30_000) {
      cache = {
        userId: user.id,
        at: Date.now(),
        promise: (supabase as any).rpc("get_company_health"),
      };
    }
    const { data, error } = await cache.promise;
    if (error || !data) {
      // The RPC raises for unauthorized callers — treat every failure as denied
      // so no figure is ever rendered from a stale/partial response.
      const { data: acc } = await (supabase as any).rpc("company_health_access");
      setAccess((acc as CompanyHealthAccess) ?? { scope: "none", can_view: false });
      setPayload(null);
      setDenied(true);
      setLoading(false);
      return;
    }
    const result = data as CompanyHealthPayload;
    setPayload(result);
    setAccess(result.access);
    setDenied(!result.access?.can_view);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (options?.auto === false) {
      setLoading(false);
      return;
    }
    load();
  }, [load, options?.auto]);

  const logAccess = useCallback(async (section: string, action = "view") => {
    await (supabase as any).rpc("log_company_health_access", {
      _section: section,
      _action: action,
    });
  }, []);

  const refetch = useCallback(async () => {
    cache = null;
    await load();
  }, [load]);

  return { loading, access, payload, denied, refetch, logAccess };
}
