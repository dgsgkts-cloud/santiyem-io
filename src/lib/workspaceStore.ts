// Frontend-only local stores for pinning entities and recent history (Sprint 25).
// No backend touched — purely user-scoped browser state.

export type PinnedKind = "project" | "task" | "document" | "supplier" | "personnel";
export type PinnedItem = { id: string; kind: PinnedKind; label: string; sub?: string; ts: number };

const P_KEY = "santiyem_pinned_v1";
const R_KEY = "santiyem_recent_v1";
const MAX_RECENT = 15;

const readJSON = <T,>(k: string, fallback: T): T => {
  try { const raw = localStorage.getItem(k); return raw ? JSON.parse(raw) as T : fallback; } catch { return fallback; }
};
const writeJSON = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

/* ---------- Pinned ---------- */
export const getPinned = (): PinnedItem[] => readJSON<PinnedItem[]>(P_KEY, []);
export const isPinned = (kind: PinnedKind, id: string) =>
  getPinned().some(p => p.kind === kind && p.id === id);
export const togglePin = (item: Omit<PinnedItem, "ts">): boolean => {
  const list = getPinned();
  const i = list.findIndex(p => p.kind === item.kind && p.id === item.id);
  if (i >= 0) { list.splice(i, 1); writeJSON(P_KEY, list); window.dispatchEvent(new Event("santiyem-pinned-changed")); return false; }
  list.unshift({ ...item, ts: Date.now() });
  writeJSON(P_KEY, list.slice(0, 30));
  window.dispatchEvent(new Event("santiyem-pinned-changed"));
  return true;
};

/* ---------- Recent history ---------- */
export type RecentItem = { id: string; kind: string; label: string; sub?: string; ts: number };
export const getRecent = (): RecentItem[] => readJSON<RecentItem[]>(R_KEY, []);
export const pushRecent = (item: Omit<RecentItem, "ts">) => {
  const list = getRecent().filter(r => !(r.kind === item.kind && r.id === item.id));
  list.unshift({ ...item, ts: Date.now() });
  writeJSON(R_KEY, list.slice(0, MAX_RECENT));
  window.dispatchEvent(new Event("santiyem-recent-changed"));
};
export const clearRecent = () => { writeJSON(R_KEY, []); window.dispatchEvent(new Event("santiyem-recent-changed")); };
