// Sprint 28.6 — Centralized frontend access control.
// Reuses existing UserContext + local setup progress + user_subscriptions row.
// No backend changes: all decisions live in the browser and honor the same
// signals other components already read (plan, role, subscription status,
// setupProgress).

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUser, isProOrAbove, isOfficePlan, type PlanType, type UserRole } from "@/contexts/UserContext";
import { isSetupComplete, loadSetupProgress, completionPercent } from "@/lib/setupProgress";

export type GuardTab =
  | "chat" | "reminders" | "pricing" | "daily" | "dashboard" | "projects"
  | "hakedis" | "settings" | "site-diary" | "payments-kasa" | "contracts"
  | "materials" | "e-invoices" | "personnel" | "meetings" | "communication"
  | "reports" | "procurement" | "warehouse" | "fleet" | "render"
  | "integrations" | "tasks";

export type LockReason =
  | "ok"
  | "loading"
  | "setup-required"
  | "subscription-expired"
  | "plan-locked"
  | "role-forbidden";

/**
 * Tabs that are always available (no subscription, no setup gate).
 * Anyone signed in can reach them so they never see a 404 or dead link.
 */
const ALWAYS_ALLOWED: GuardTab[] = [
  "dashboard", "settings", "pricing", "chat", "reminders", "daily", "render",
  "integrations",
];

/**
 * Modules that require a completed workspace setup. Before setup is finished
 * these render the "Kurulum gerekli" screen instead of their real UI.
 */
const SETUP_REQUIRED: GuardTab[] = [
  "projects", "tasks", "hakedis", "site-diary", "materials", "personnel", "meetings",
  "communication", "reports", "contracts",
];

/**
 * Premium modules that also require an active subscription (or admin role).
 */
const PREMIUM_TABS: GuardTab[] = [
  "payments-kasa", "e-invoices", "procurement", "warehouse", "fleet",
  "hakedis", "reports", "contracts",
];

const TAB_LABELS: Record<GuardTab, string> = {
  chat: "AI Asistan", reminders: "Hatırlatıcı", pricing: "Planlar",
  daily: "Günlük Bilgi", dashboard: "Dashboard", projects: "Projeler",
  hakedis: "Hakediş", settings: "Ayarlar", "site-diary": "Şantiye Günlüğü",
  "payments-kasa": "Ödemeler & Kasa", contracts: "Sözleşmeler",
  materials: "Malzeme", "e-invoices": "E-Fatura", personnel: "Personel",
  meetings: "Toplantı Merkezi", communication: "İletişim Merkezi",
  reports: "Raporlar", procurement: "Satın Alma",
  warehouse: "Depo & Envanter", fleet: "Makine & Ekipman",
  render: "Render", integrations: "Entegrasyonlar", tasks: "Görevler / İşler",
};

export const getTabLabel = (t: GuardTab) => TAB_LABELS[t] || t;

/** Look up the latest subscription row for the current user. */
export const useSubscriptionStatus = () => {
  const { user } = useUser();
  return useQuery({
    queryKey: ["subscription-status", user?.id],
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("user_subscriptions")
        .select("status, trial_end, plan_name, current_period_end")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data as {
        status?: string | null;
        trial_end?: string | null;
        plan_name?: string | null;
        current_period_end?: string | null;
      } | null;
    },
  });
};

const PAID_STATUSES = new Set(["active", "trialing", "cancelled"]);

const isSubscriptionExpired = (
  plan: PlanType,
  role: UserRole,
  sub: ReturnType<typeof useSubscriptionStatus>["data"],
): boolean => {
  // Internal demo entitlement — never billed, never expired by subscription.
  if (plan === "demo_full_access") return false;
  // Super admin never has an expired subscription.
  if (role === "admin") return false;
  // A real paid plan on the profile trumps trial state.
  if (isProOrAbove(plan) || isOfficePlan(plan)) {
    if (!sub) return false;
    if (sub.status === "active" || sub.status === "trialing") return false;
    // "cancelled" but current period end in the future = still valid.
    if (sub.current_period_end && new Date(sub.current_period_end).getTime() > Date.now()) return false;
    return sub.status === "expired" || sub.status === "past_due";
  }
  // Free plan — expired only if there was a trial that ended.
  if (sub?.trial_end && new Date(sub.trial_end).getTime() < Date.now()) {
    return !PAID_STATUSES.has(sub.status || "");
  }
  return false;
};

/**
 * Track workspace setup completion in a reactive way so guards recompute
 * as soon as the user finishes a step.
 */
export const useSetupState = () => {
  const [state, setState] = useState(() => ({
    complete: isSetupComplete(),
    percent: completionPercent(),
    progress: loadSetupProgress(),
  }));
  useEffect(() => {
    const refresh = () => setState({
      complete: isSetupComplete(),
      percent: completionPercent(),
      progress: loadSetupProgress(),
    });
    window.addEventListener("setup-progress-changed", refresh);
    return () => window.removeEventListener("setup-progress-changed", refresh);
  }, []);
  return state;
};

export interface AccessDecision {
  ok: boolean;
  reason: LockReason;
  label: string;
}

export interface AccessGuard {
  ready: boolean;
  isSuperAdmin: boolean;
  role: UserRole;
  plan: PlanType;
  subscriptionExpired: boolean;
  setupComplete: boolean;
  setupPercent: number;
  /** Return the decision for a given tab. */
  check: (tab: GuardTab) => AccessDecision;
}

export const useAccessGuard = (): AccessGuard => {
  const { plan, role, profileLoaded, isAdmin } = useUser();
  const { data: sub, isLoading: subLoading } = useSubscriptionStatus();
  const setup = useSetupState();

  return useMemo<AccessGuard>(() => {
    const ready = profileLoaded && !subLoading;
    const subscriptionExpired = isSubscriptionExpired(plan, role, sub);

    const check = (tab: GuardTab): AccessDecision => {
      const label = getTabLabel(tab);
      // Super admin bypass — always ok.
      if (isAdmin) return { ok: true, reason: "ok", label };
      // Demo entitlement: all completed modules open, no setup/subscription gate.
      if (plan === "demo_full_access") return { ok: true, reason: "ok", label };
      // Ambiguous while loading — treat as allowed to avoid false locks.
      if (!ready) return { ok: true, reason: "ok", label };

      if (ALWAYS_ALLOWED.includes(tab)) return { ok: true, reason: "ok", label };

      // Setup gate first — hard requirement for operational modules.
      if (!setup.complete && SETUP_REQUIRED.includes(tab)) {
        return { ok: false, reason: "setup-required", label };
      }
      // Subscription gate for premium modules.
      if (PREMIUM_TABS.includes(tab)) {
        if (subscriptionExpired) {
          return { ok: false, reason: "subscription-expired", label };
        }
        // Plan-tier lock for tabs that need Pro/Office.
        const hasPaid = isProOrAbove(plan) || isOfficePlan(plan);
        if (!hasPaid) return { ok: false, reason: "plan-locked", label };
      }
      return { ok: true, reason: "ok", label };
    };

    return {
      ready,
      isSuperAdmin: isAdmin,
      role,
      plan,
      subscriptionExpired,
      setupComplete: setup.complete,
      setupPercent: setup.percent,
      check,
    };
  }, [profileLoaded, subLoading, plan, role, isAdmin, sub, setup]);
};

/** Convenience: is the module currently locked for the current user? */
export const useIsLocked = (tab: GuardTab): AccessDecision => {
  const guard = useAccessGuard();
  return guard.check(tab);
};

/**
 * Global snapshot for non-React callers (chat pipeline, action executor)
 * to answer "is X locked?" without pulling in hooks. Kept in sync via the
 * useAccessSnapshot hook below.
 */
export interface AccessSnapshot {
  ready: boolean;
  isSuperAdmin: boolean;
  subscriptionExpired: boolean;
  setupComplete: boolean;
  lockedTabs: GuardTab[];
}

let currentSnapshot: AccessSnapshot = {
  ready: false, isSuperAdmin: false, subscriptionExpired: false,
  setupComplete: true, lockedTabs: [],
};

export const getAccessSnapshot = (): AccessSnapshot => currentSnapshot;

const ALL_TABS: GuardTab[] = [
  "chat", "reminders", "pricing", "daily", "dashboard", "projects", "hakedis",
  "settings", "site-diary", "payments-kasa", "contracts", "materials",
  "e-invoices", "personnel", "meetings", "communication", "reports",
  "procurement", "warehouse", "fleet", "render",
];

/** Mount once (e.g. inside Index) to keep the global snapshot fresh. */
export const useAccessSnapshotSync = () => {
  const guard = useAccessGuard();
  useEffect(() => {
    currentSnapshot = {
      ready: guard.ready,
      isSuperAdmin: guard.isSuperAdmin,
      subscriptionExpired: guard.subscriptionExpired,
      setupComplete: guard.setupComplete,
      lockedTabs: ALL_TABS.filter((t) => !guard.check(t).ok),
    };
    window.dispatchEvent(new CustomEvent("access-snapshot-changed", { detail: currentSnapshot }));
  }, [guard]);
};

export const isModuleLocked = (tab: GuardTab): boolean =>
  currentSnapshot.lockedTabs.includes(tab);
