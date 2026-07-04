import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { isActivePlan } from "@/lib/verifySubscription";

export interface VoiceAccess {
  loading: boolean;
  hasAccess: boolean;
  isPremium: boolean;
  secondsUsedToday: number;
  dailyLimitSeconds: number | null;
  remainingSeconds: number | null;
  refresh: () => Promise<void>;
}

const FREE_DAILY_LIMIT = 600; // 10 minutes/day

export function useVoiceAccess(): VoiceAccess {
  const [loading, setLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(false);
  const [seconds, setSeconds] = useState(0);

  const load = async () => {
    setLoading(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      const user = u?.user;
      if (!user) {
        setIsPremium(false);
        setSeconds(0);
        return;
      }
      const [{ data: profile }, { data: usage }] = await Promise.all([
        supabase.from("profiles").select("plan, role").eq("user_id", user.id).maybeSingle(),
        supabase
          .from("voice_usage")
          .select("seconds_used")
          .eq("user_id", user.id)
          .eq("usage_date", new Date().toISOString().slice(0, 10))
          .maybeSingle(),
      ]);
      const plan = (profile?.plan as string) ?? "free";
      // Also treat trial as premium via user_subscriptions if present
      const { data: sub } = await supabase
        .from("user_subscriptions")
        .select("status, trial_end")
        .eq("user_id", user.id)
        .maybeSingle();
      const trialActive =
        sub?.trial_end && new Date(sub.trial_end as string).getTime() > Date.now();
      const premium = (profile as any)?.role === "admin" || isActivePlan(plan) || sub?.status === "active" || sub?.status === "trialing" || !!trialActive;
      setIsPremium(premium);
      setSeconds((usage?.seconds_used as number | undefined) ?? 0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // IMPORTANT: never run supabase queries synchronously inside the
    // onAuthStateChange callback — supabase-js holds an internal auth lock
    // while dispatching the event, and awaiting auth/getUser/queries inside
    // the callback deadlocks (page hangs on loading forever).
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "TOKEN_REFRESHED") {
        setTimeout(() => { load(); }, 0);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const dailyLimit = isPremium ? null : FREE_DAILY_LIMIT;
  const remaining = isPremium ? null : Math.max(0, FREE_DAILY_LIMIT - seconds);
  const hasAccess = isPremium || (remaining ?? 0) > 0;

  return {
    loading,
    hasAccess,
    isPremium,
    secondsUsedToday: seconds,
    dailyLimitSeconds: dailyLimit,
    remainingSeconds: remaining,
    refresh: load,
  };
}
