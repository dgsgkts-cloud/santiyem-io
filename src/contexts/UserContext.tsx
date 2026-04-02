import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

export type PlanType = "free" | "pro" | "team" | "enterprise" | "plus" | "office_free" | "office_pro" | "office_custom";
export type UserRole = "free" | "pro" | "office" | "admin";

interface UsageLimits {
  aiQuestions: { used: number; max: number };
  photoAnalysis: { used: number; max: number };
  render: { used: number; max: number };
  reminders: { used: number; max: number };
}

const FREE_LIMITS: UsageLimits = {
  aiQuestions: { used: 0, max: 3 },
  photoAnalysis: { used: 0, max: 2 },
  render: { used: 0, max: 2 },
  reminders: { used: 0, max: 3 },
};

// Helper to check plan tiers
export const isTeamOrAbove = (plan: PlanType) => plan === "team" || plan === "enterprise" || plan === "office_pro" || plan === "office_custom";
export const isProOrAbove = (plan: PlanType) => plan === "pro" || isTeamOrAbove(plan);
export const isOfficePlan = (plan: PlanType) => plan === "office_free" || plan === "office_pro" || plan === "office_custom" || plan === "team" || plan === "enterprise";
export const isIndividualPlan = (plan: PlanType) => plan === "free" || plan === "plus" || plan === "pro";

// Feature access helpers
export const canAccessProjects = (plan: PlanType, role?: UserRole) => role === "admin" || isProOrAbove(plan) || isOfficePlan(plan);
export const canAccessHakedis = (plan: PlanType, role?: UserRole) => role === "admin" || isProOrAbove(plan) || isOfficePlan(plan);
export const canAccessProfitability = (plan: PlanType, role?: UserRole) => role === "admin" || isProOrAbove(plan) || isOfficePlan(plan);
export const canAccessRender = (plan: PlanType) => true;
export const canAccessReminders = (plan: PlanType) => true;
export const canDownload = (plan: PlanType) => plan !== "free";

interface UserContextType {
  user: User | null;
  profile: { full_name: string; title: string; city: string; plan: PlanType; role: UserRole } | null;
  loading: boolean;
  plan: PlanType;
  role: UserRole;
  usage: UsageLimits;
  setPlan: (plan: PlanType) => void;
  incrementUsage: (key: keyof UsageLimits) => boolean;
  canUse: (key: keyof UsageLimits) => boolean;
  signOut: () => Promise<void>;
  isAdmin: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserContextType["profile"]>(null);
  const [loading, setLoading] = useState(true);
  const [plan, setPlanState] = useState<PlanType>("free");
  const [role, setRole] = useState<UserRole>("free");
  const [usage, setUsage] = useState<UsageLimits>({ ...FREE_LIMITS });

  const getLimitsForPlan = (p: PlanType): UsageLimits => {
    if (p === "free") return { ...FREE_LIMITS };
    // pro and above = unlimited
    return {
      aiQuestions: { used: 0, max: 999 },
      photoAnalysis: { used: 0, max: 999 },
      render: { used: 0, max: 999 },
      reminders: { used: 0, max: 999 },
    };
  };

  const fetchProfile = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("full_name, title, city, plan, role")
      .eq("user_id", userId)
      .single();
    if (data) {
      const p = (data.plan as PlanType) || "free";
      const r = ((data as any).role as UserRole) || "free";
      setProfile({ ...data, role: r } as UserContextType["profile"]);
      setPlanState(p);
      setRole(r);
      setUsage(prev => {
        const effectivePlan = r === "admin" ? "pro" : p;
        const limits = getLimitsForPlan(effectivePlan);
        return {
          aiQuestions: { used: prev.aiQuestions.used, max: limits.aiQuestions.max },
          photoAnalysis: { used: prev.photoAnalysis.used, max: limits.photoAnalysis.max },
          render: { used: prev.render.used, max: limits.render.max },
          reminders: { used: prev.reminders.used, max: limits.reminders.max },
        };
      });
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
        setRole("free");
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
    const stored = localStorage.getItem("muhendisai_usage_v2");
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.date === today) {
        setUsage(prev => ({
          ...prev,
          aiQuestions: { ...prev.aiQuestions, used: parsed.usage.aiQuestions?.used || 0 },
          photoAnalysis: { ...prev.photoAnalysis, used: parsed.usage.photoAnalysis?.used || 0 },
          render: { ...prev.render, used: parsed.usage.render?.used || 0 },
        }));
        return;
      }
    }
    setUsage(prev => ({
      ...prev,
      aiQuestions: { ...prev.aiQuestions, used: 0 },
      photoAnalysis: { ...prev.photoAnalysis, used: 0 },
      render: { ...prev.render, used: 0 },
    }));
  }, []);

  // Save usage
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    localStorage.setItem("muhendisai_usage_v2", JSON.stringify({ date: today, usage }));
  }, [usage]);

  const isAdmin = role === "admin";

  const canUse = (key: keyof UsageLimits) => {
    if (isAdmin || isProOrAbove(plan) || isOfficePlan(plan)) return true;
    return usage[key].used < usage[key].max;
  };

  const incrementUsage = (key: keyof UsageLimits) => {
    if (isAdmin || isProOrAbove(plan) || isOfficePlan(plan)) return true;
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
    setRole("free");
  };

  return (
    <UserContext.Provider value={{ user, profile, loading, plan, role, usage, setPlan, incrementUsage, canUse, signOut, isAdmin }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used within UserProvider");
  return ctx;
};
