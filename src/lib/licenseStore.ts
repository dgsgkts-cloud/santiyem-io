// Sprint 29.0 — Centralized Licensing / Subscription store.
// Frontend-only. Reads from existing UserContext + accessControl signals,
// then normalises them into a single license snapshot that every page,
// FeatureGate, LimitGuard, badge or AI prompt can consume.
//
// No backend, no schema, no business logic changes.
// Concepts are strictly separated:
//   1. Subscription plan  → what the company pays for
//   2. User role          → what the user is allowed to do
//   3. Trial state        → time-bounded full access
//   4. Super Admin        → global override (never gated, never nudged)

import { useMemo } from "react";
import { useUser, type PlanType, type UserRole } from "@/contexts/UserContext";
import { useSubscriptionStatus } from "@/lib/accessControl";

/** Public plan tiers exposed by the licensing system. */
export type LicensePlan =
  | "starter"
  | "pro"
  | "business"
  | "enterprise"
  | "trial"
  | "demo"
  | "super_admin";

/** Independent role taxonomy (permissions layer). */
export type LicenseRole =
  | "super_admin"
  | "company_admin"
  | "project_manager"
  | "site_chief"
  | "engineer"
  | "accounting"
  | "procurement"
  | "warehouse_manager"
  | "hr"
  | "operator"
  | "viewer";

export type LicenseFeature =
  | "dashboard" | "projects" | "daily" | "hakedis" | "reports_basic"
  | "finance" | "purchasing" | "warehouse" | "fleet"
  | "ceo_mode" | "reports_advanced" | "analytics_advanced"
  | "api" | "sso" | "multi_company" | "custom_integrations";

export interface LicenseLimits {
  projects: number;      // -1 = unlimited
  personnel: number;
  warehouses: number;
  aiPerDay: number;
  companies: number;
}

export interface LicenseSnapshot {
  plan: LicensePlan;
  planLabel: string;
  role: LicenseRole;
  isSuperAdmin: boolean;
  isTrial: boolean;
  isDemo: boolean;
  trialEnds: Date | null;
  daysRemaining: number | null;
  subscriptionActive: boolean;
  features: Record<LicenseFeature, boolean>;
  limits: LicenseLimits;
  // convenience flags (mirror features for ergonomic reads)
  canFinance: boolean;
  canPurchasing: boolean;
  canWarehouse: boolean;
  canFleet: boolean;
  canCEO: boolean;
  canAdvancedReports: boolean;
  // helpers
  hasFeature: (f: LicenseFeature) => boolean;
  isWithinLimit: (key: keyof LicenseLimits, current: number) => boolean;
}

const UNLIMITED = -1;

const PLAN_LABELS: Record<LicensePlan, string> = {
  starter: "Starter",
  pro: "Pro",
  business: "Business",
  enterprise: "Enterprise",
  trial: "Trial",
  demo: "Demo",
  super_admin: "Super Admin",
};

const PLAN_LIMITS: Record<LicensePlan, LicenseLimits> = {
  starter:     { projects: 2,         personnel: 10,        warehouses: 1,         aiPerDay: 20,        companies: 1 },
  pro:         { projects: 10,        personnel: 100,       warehouses: 3,         aiPerDay: 300,       companies: 1 },
  business:    { projects: 50,        personnel: UNLIMITED, warehouses: UNLIMITED, aiPerDay: 1500,      companies: 3 },
  enterprise:  { projects: UNLIMITED, personnel: UNLIMITED, warehouses: UNLIMITED, aiPerDay: UNLIMITED, companies: UNLIMITED },
  trial:       { projects: UNLIMITED, personnel: UNLIMITED, warehouses: UNLIMITED, aiPerDay: 300,       companies: 1 },
  demo:        { projects: UNLIMITED, personnel: UNLIMITED, warehouses: UNLIMITED, aiPerDay: UNLIMITED, companies: UNLIMITED },
  super_admin: { projects: UNLIMITED, personnel: UNLIMITED, warehouses: UNLIMITED, aiPerDay: UNLIMITED, companies: UNLIMITED },
};

const FEATURE_MATRIX: Record<LicensePlan, LicenseFeature[]> = {
  starter: ["dashboard", "projects", "daily", "hakedis", "reports_basic"],
  pro: [
    "dashboard", "projects", "daily", "hakedis", "reports_basic",
    "finance", "purchasing", "warehouse", "ceo_mode",
  ],
  business: [
    "dashboard", "projects", "daily", "hakedis", "reports_basic",
    "finance", "purchasing", "warehouse", "fleet",
    "ceo_mode", "reports_advanced", "analytics_advanced",
  ],
  enterprise: [
    "dashboard", "projects", "daily", "hakedis", "reports_basic",
    "finance", "purchasing", "warehouse", "fleet",
    "ceo_mode", "reports_advanced", "analytics_advanced",
    "api", "sso", "multi_company", "custom_integrations",
  ],
  // Trial = full access (Business tier), Demo = everything unlocked,
  // Super Admin = everything, always.
  trial: [
    "dashboard", "projects", "daily", "hakedis", "reports_basic",
    "finance", "purchasing", "warehouse", "fleet",
    "ceo_mode", "reports_advanced", "analytics_advanced",
  ],
  demo: [
    "dashboard", "projects", "daily", "hakedis", "reports_basic",
    "finance", "purchasing", "warehouse", "fleet",
    "ceo_mode", "reports_advanced", "analytics_advanced",
    "api", "sso", "multi_company", "custom_integrations",
  ],
  super_admin: [
    "dashboard", "projects", "daily", "hakedis", "reports_basic",
    "finance", "purchasing", "warehouse", "fleet",
    "ceo_mode", "reports_advanced", "analytics_advanced",
    "api", "sso", "multi_company", "custom_integrations",
  ],
};

/**
 * Map the (legacy) internal DB plan + subscription row into one of the new
 * public licensing tiers. Preserves existing billing keys — nothing writes
 * back to the database from here.
 */
export function resolveLicensePlan(
  plan: PlanType,
  role: UserRole,
  sub: { status?: string | null; trial_end?: string | null; plan_name?: string | null } | null | undefined,
): LicensePlan {
  if (role === "admin") return "super_admin";

  const status = (sub?.status || "").toLowerCase();
  const now = Date.now();
  const trialEnd = sub?.trial_end ? Date.parse(sub.trial_end) : NaN;
  const trialActive = status === "trial" || status === "trialing" || (!!trialEnd && trialEnd > now);
  if (trialActive) return "trial";

  const name = (sub?.plan_name || plan || "").toLowerCase();
  if (name.includes("enterprise") || name === "enterprise") return "enterprise";
  if (name.includes("business") || name.includes("team") || name === "team") return "business";
  if (name.includes("pro") || plan === "pro" || plan === "office_pro") return "pro";
  if (name.includes("demo")) return "demo";
  return "starter";
}

export function resolveLicenseRole(role: UserRole): LicenseRole {
  if (role === "admin") return "super_admin";
  if (role === "office") return "company_admin";
  if (role === "pro") return "project_manager";
  return "viewer";
}

function buildFeatureFlags(plan: LicensePlan): Record<LicenseFeature, boolean> {
  const allowed = new Set(FEATURE_MATRIX[plan]);
  const all: LicenseFeature[] = [
    "dashboard", "projects", "daily", "hakedis", "reports_basic",
    "finance", "purchasing", "warehouse", "fleet",
    "ceo_mode", "reports_advanced", "analytics_advanced",
    "api", "sso", "multi_company", "custom_integrations",
  ];
  return all.reduce((acc, f) => {
    acc[f] = allowed.has(f);
    return acc;
  }, {} as Record<LicenseFeature, boolean>);
}

/**
 * Centralised license hook — the single source of truth for plan, role,
 * trial state and limits. Every page/component should read from here.
 */
export function useLicense(): LicenseSnapshot {
  const { plan, role } = useUser();
  const { data: sub } = useSubscriptionStatus();
  const viewAs = useViewAs();

  return useMemo(() => {
    const realPlan = resolveLicensePlan(plan, role, sub);
    const realRole = resolveLicenseRole(role);
    const realIsSuperAdmin = realRole === "super_admin";

    // Super Admin "View As" simulator — only applies for real super admins.
    const licensePlan: LicensePlan = realIsSuperAdmin && viewAs ? viewAs : realPlan;
    const licenseRole: LicenseRole =
      realIsSuperAdmin && viewAs && viewAs !== "super_admin" ? "company_admin" : realRole;
    const isSuperAdmin = licenseRole === "super_admin";
    const isTrial = licensePlan === "trial";
    const isDemo = licensePlan === "demo";
    const isExpired = viewAs === undefined
      ? (sub?.status || "").toLowerCase() === "expired"
      : false;

    const trialEnds = sub?.trial_end ? new Date(sub.trial_end) : null;
    const daysRemaining =
      trialEnds && !Number.isNaN(trialEnds.getTime())
        ? Math.max(0, Math.ceil((trialEnds.getTime() - Date.now()) / 86_400_000))
        : (isTrial ? 14 : null);

    const subscriptionActive =
      isSuperAdmin || isTrial || isDemo ||
      ["active", "trialing", "cancelled"].includes((sub?.status || "").toLowerCase());

    const limits = isSuperAdmin ? PLAN_LIMITS.super_admin : PLAN_LIMITS[licensePlan];
    const features = isSuperAdmin
      ? buildFeatureFlags("super_admin")
      : buildFeatureFlags(licensePlan);

    const hasFeature = (f: LicenseFeature) => isSuperAdmin || features[f] === true;
    const isWithinLimit = (key: keyof LicenseLimits, current: number) => {
      if (isSuperAdmin || isDemo) return true;
      const max = limits[key];
      return max === UNLIMITED || current < max;
    };

    return {
      plan: licensePlan,
      planLabel: PLAN_LABELS[licensePlan],
      role: licenseRole,
      isSuperAdmin,
      isTrial,
      isDemo,
      trialEnds,
      daysRemaining,
      subscriptionActive: subscriptionActive && !isExpired,
      features,
      limits,
      canFinance: hasFeature("finance"),
      canPurchasing: hasFeature("purchasing"),
      canWarehouse: hasFeature("warehouse"),
      canFleet: hasFeature("fleet"),
      canCEO: hasFeature("ceo_mode"),
      canAdvancedReports: hasFeature("reports_advanced"),
      hasFeature,
      isWithinLimit,
    };
  }, [plan, role, sub, viewAs]);
}


export const PLAN_META: Record<LicensePlan, { label: string; color: string; bg: string; border: string }> = {
  starter:     { label: "Starter",     color: "#CBD5E1", bg: "rgba(148,163,184,0.12)", border: "rgba(148,163,184,0.35)" },
  pro:         { label: "Pro",         color: "#60A5FA", bg: "rgba(96,165,250,0.12)",  border: "rgba(96,165,250,0.35)" },
  business:    { label: "Business",    color: "#FF9B4A", bg: "rgba(255,107,43,0.12)",  border: "rgba(255,107,43,0.4)" },
  enterprise:  { label: "Enterprise",  color: "#C084FC", bg: "rgba(192,132,252,0.14)", border: "rgba(192,132,252,0.4)" },
  trial:       { label: "Trial",       color: "#FACC15", bg: "rgba(250,204,21,0.12)",  border: "rgba(250,204,21,0.4)" },
  demo:        { label: "Demo",        color: "#22D3EE", bg: "rgba(34,211,238,0.12)",  border: "rgba(34,211,238,0.4)" },
  super_admin: { label: "Super Admin", color: "#FFD166", bg: "rgba(255,209,102,0.14)", border: "rgba(255,209,102,0.5)" },
};

/** Human-readable feature labels for dialogs / lock cards. */
export const FEATURE_LABELS: Record<LicenseFeature, string> = {
  dashboard: "Dashboard",
  projects: "Projeler",
  daily: "Şantiye Günlüğü",
  hakedis: "Hakediş",
  reports_basic: "Temel Raporlar",
  finance: "Finans & Muhasebe",
  purchasing: "Satın Alma",
  warehouse: "Depo & Envanter",
  fleet: "Makine & Ekipman",
  ceo_mode: "CEO Modu",
  reports_advanced: "Gelişmiş Raporlar",
  analytics_advanced: "İleri Analitik",
  api: "API Erişimi",
  sso: "SSO / Kurumsal Giriş",
  multi_company: "Çoklu Şirket",
  custom_integrations: "Özel Entegrasyonlar",
};

/** Minimum plan that grants a given feature — used by the UpgradeDialog. */
export function minPlanFor(feature: LicenseFeature): LicensePlan {
  const order: LicensePlan[] = ["starter", "pro", "business", "enterprise"];
  for (const p of order) if (FEATURE_MATRIX[p].includes(feature)) return p;
  return "enterprise";
}

/** Convenience: dispatch a UI event to open the subscription page. */
export function openSubscriptionPage() {
  window.dispatchEvent(new CustomEvent("navigate-tab", { detail: "settings" }));
  setTimeout(() => {
    window.dispatchEvent(new CustomEvent("open-subscription-tab"));
  }, 120);
}
