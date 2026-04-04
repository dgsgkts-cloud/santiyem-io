import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";

type Theme = "dark" | "light";

interface ThemeContextType {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    const stored = localStorage.getItem("santiyem_theme");
    return (stored === "light" ? "light" : "dark") as Theme;
  });
  const { user } = useUser();

  // Load theme from profile on login
  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("theme")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (data?.theme) {
          const t = data.theme === "light" ? "light" : "dark";
          setThemeState(t as Theme);
          localStorage.setItem("santiyem_theme", t);
        }
      });
  }, [user]);

  // Apply theme class to document — only when logged in
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "light" && user) {
      root.classList.add("light");
    } else {
      root.classList.remove("light");
    }
  }, [theme, user]);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    if (t === "light") {
      document.documentElement.classList.add("light");
    } else {
      document.documentElement.classList.remove("light");
    }
    localStorage.setItem("santiyem_theme", t);
    if (user) {
      supabase.from("profiles").update({ theme: t } as any).eq("user_id", user.id).then(() => {});
    }
  }, [user]);

  const toggleTheme = useCallback(() => {
    const isLight = document.documentElement.classList.toggle("light");
    const nextTheme: Theme = isLight ? "light" : "dark";
    setThemeState(nextTheme);
    localStorage.setItem("santiyem_theme", nextTheme);
    if (user) {
      supabase.from("profiles").update({ theme: nextTheme } as any).eq("user_id", user.id).then(() => {});
    }
  }, [user]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
};
