// Canonical home route + navigation-state reset used after login/logout.
// Normal email/password (and demo) login must ALWAYS land on Ana Sayfa —
// no previous pathname, returnTo or persisted last tab may override it.
// Deep-link flows (reset password, invite, e-mail confirm) don't call this.

export const HOME_ROUTE = "/dashboard";

const NAV_STATE_KEYS = [
  "santiyem_active_tab",
  "returnTo",
  "lastVisitedRoute",
  "santiyem_last_route",
];

export const clearNavigationState = () => {
  if (typeof window === "undefined") return;
  for (const key of NAV_STATE_KEYS) {
    try {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    } catch {
      /* storage unavailable — ignore */
    }
  }
};
