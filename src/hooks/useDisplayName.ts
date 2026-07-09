import { useEffect } from "react";
import { useUser } from "@/contexts/UserContext";

const CACHE_KEY = "santiyem:displayName";

/**
 * Resolves the current user's display name without flicker.
 *
 * - While the auth/profile context is still loading, returns the cached
 *   value from the last authenticated session (if any). No placeholder
 *   fallbacks ("Mühendis", "Kullanıcı", …) are ever emitted.
 * - Once the profile resolves, the cache is refreshed so subsequent
 *   loads render the final value on first paint.
 * - `ready` is true when we have a real name to render OR when we know
 *   for certain the user has no profile name (profileLoaded && empty).
 */
export function useDisplayName() {
  const { user, profile, profileLoaded } = useUser();

  const resolved = (
    profile?.full_name ||
    (user?.user_metadata as { full_name?: string } | undefined)?.full_name ||
    ""
  ).trim();

  const cached =
    typeof window !== "undefined"
      ? (localStorage.getItem(CACHE_KEY) || "").trim()
      : "";

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (resolved) {
        if (cached !== resolved) localStorage.setItem(CACHE_KEY, resolved);
      } else if (profileLoaded && !user) {
        localStorage.removeItem(CACHE_KEY);
      }
    } catch {
      /* ignore quota / private-mode errors */
    }
  }, [resolved, profileLoaded, user, cached]);

  const fullName = resolved || cached;
  const firstName = fullName ? fullName.split(" ")[0] : "";
  const hasName = Boolean(fullName);
  const ready = hasName || profileLoaded;

  return { ready, hasName, fullName, firstName };
}

export default useDisplayName;
