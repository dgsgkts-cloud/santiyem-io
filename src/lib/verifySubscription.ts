import { supabase } from "@/integrations/supabase/client";

export type SubscriptionVerification =
  | { state: "verifying" }
  | { state: "active"; plan: string }
  | { state: "inactive"; plan: string }
  | { state: "unauthenticated" }
  | { state: "error"; message: string };

const ACTIVE_PLANS = new Set([
  "pro",
  "team",
  "enterprise",
  "plus",
  "office_pro",
  "office_custom",
]);

export function isActivePlan(plan?: string | null): boolean {
  return !!plan && ACTIVE_PLANS.has(plan);
}

/**
 * Polls `profiles.plan` (and optionally `user_subscriptions.status`) for up to
 * `timeoutMs` to verify that the iyzico callback actually activated the user's
 * subscription. Returns the final state.
 */
export async function verifySubscriptionActivation(opts: {
  expectedPlan?: string;
  timeoutMs?: number;
  intervalMs?: number;
} = {}): Promise<SubscriptionVerification> {
  const timeoutMs = opts.timeoutMs ?? 12000;
  const intervalMs = opts.intervalMs ?? 1500;
  const deadline = Date.now() + timeoutMs;

  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr) return { state: "error", message: userErr.message };
  const user = userData?.user;
  if (!user) return { state: "unauthenticated" };

  let lastPlan = "free";

  while (Date.now() < deadline) {
    const { data, error } = await supabase
      .from("profiles")
      .select("plan")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      // Geçici hata — tekrar dene
      await sleep(intervalMs);
      continue;
    }

    lastPlan = (data?.plan as string) || "free";
    const matchesExpected = opts.expectedPlan ? lastPlan === opts.expectedPlan : isActivePlan(lastPlan);
    if (matchesExpected) {
      return { state: "active", plan: lastPlan };
    }

    await sleep(intervalMs);
  }

  return { state: "inactive", plan: lastPlan };
}

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}
