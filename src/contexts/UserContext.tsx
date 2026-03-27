import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

export type PlanType = "free" | "pro" | "office";

interface UsageLimits {
  aiQuestions: { used: number; max: number };
  projectAnalysis: { used: number; max: number };
  photoAnalysis: { used: number; max: number };
  ekbCalc: { used: number; max: number };
  costCalc: { used: number; max: number };
}

const FREE_LIMITS: UsageLimits = {
  aiQuestions: { used: 0, max: 3 },
  projectAnalysis: { used: 0, max: 2 },
  photoAnalysis: { used: 0, max: 2 },
  ekbCalc: { used: 0, max: 2 },
  costCalc: { used: 0, max: 1 },
};

interface UserContextType {
  user: User | null;
  profile: { full_name: string; title: string; city: string; plan: PlanType } | null;
  loading: boolean;
  plan: PlanType;
  usage: UsageLimits;
  setPlan: (plan: PlanType) => void;
  incrementUsage: (key: keyof UsageLimits) => boolean; // returns false if limit reached
  canUse: (key: keyof UsageLimits) => boolean;
  signOut: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserContextType["profile"]>(null);
  const [loading, setLoading] = useState(true);
  const [plan, setPlanState] = useState<PlanType>("free");
  const [usage, setUsage] = useState<UsageLimits>({ ...FREE_LIMITS });

  const fetchProfile = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("full_name, title, city, plan")
      .eq("user_id", userId)
      .single();
    if (data) {
      setProfile(data as UserContextType["profile"]);
      setPlanState((data.plan as PlanType) || "free");
    }
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        setTimeout(() => fetchProfile(session.user.id), 0);
      } else {
        setProfile(null);
        setPlanState("free");
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  // Load usage from localStorage daily
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    const stored = localStorage.getItem("muhendisai_usage");
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.date === today) {
        setUsage(parsed.usage);
        return;
      }
    }
    // Reset daily for AI questions, keep monthly for others
    const month = new Date().toISOString().slice(0, 7);
    const storedMonthly = localStorage.getItem("muhendisai_usage_monthly");
    if (storedMonthly) {
      const parsed = JSON.parse(storedMonthly);
      if (parsed.month === month) {
        setUsage({
          aiQuestions: { used: 0, max: 3 },
          projectAnalysis: parsed.usage.projectAnalysis || FREE_LIMITS.projectAnalysis,
          photoAnalysis: parsed.usage.photoAnalysis || FREE_LIMITS.photoAnalysis,
          ekbCalc: parsed.usage.ekbCalc || FREE_LIMITS.ekbCalc,
          costCalc: parsed.usage.costCalc || FREE_LIMITS.costCalc,
        });
        return;
      }
    }
    setUsage({ ...FREE_LIMITS });
  }, []);

  // Save usage
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    localStorage.setItem("muhendisai_usage", JSON.stringify({ date: today, usage }));
    const month = new Date().toISOString().slice(0, 7);
    localStorage.setItem("muhendisai_usage_monthly", JSON.stringify({ month, usage }));
  }, [usage]);

  const canUse = (key: keyof UsageLimits) => {
    if (plan !== "free") return true;
    return usage[key].used < usage[key].max;
  };

  const incrementUsage = (key: keyof UsageLimits) => {
    if (plan !== "free") return true;
    if (usage[key].used >= usage[key].max) return false;
    setUsage(prev => ({
      ...prev,
      [key]: { ...prev[key], used: prev[key].used + 1 },
    }));
    return true;
  };

  const setPlan = (newPlan: PlanType) => {
    setPlanState(newPlan);
    if (user) {
      supabase.from("profiles").update({ plan: newPlan }).eq("user_id", user.id).then(() => {});
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setPlanState("free");
  };

  return (
    <UserContext.Provider value={{ user, profile, loading, plan, usage, setPlan, incrementUsage, canUse, signOut }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used within UserProvider");
  return ctx;
};
