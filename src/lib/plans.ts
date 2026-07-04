// Public plan taxonomy for UI-facing labels.
// Internal DB keys (free/pro/team/enterprise) stay unchanged for billing and
// existing authorization; UI + marketing surfaces only ever show these three
// public tiers. Mapping mirrors the `plans` table seeded in migration 11.1.

export type PublicPlan = "starter" | "professional" | "enterprise";
export type InternalPlan = "free" | "pro" | "team" | "enterprise" | (string & {});

export const PUBLIC_PLAN_LABELS: Record<PublicPlan, string> = {
  starter: "Starter",
  professional: "Professional",
  enterprise: "Enterprise",
};

const INTERNAL_TO_PUBLIC: Record<string, PublicPlan> = {
  free: "starter",
  pro: "starter",
  team: "professional",
  enterprise: "enterprise",
};

export function toPublicPlan(internal?: string | null): PublicPlan {
  if (!internal) return "starter";
  return INTERNAL_TO_PUBLIC[internal] ?? "starter";
}

export function publicPlanLabel(internal?: string | null): string {
  return PUBLIC_PLAN_LABELS[toPublicPlan(internal)];
}
