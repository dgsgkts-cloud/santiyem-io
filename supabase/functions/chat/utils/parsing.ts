// ============================================================
// chat/utils/parsing.ts
// Small pure helpers extracted from chat/index.ts (Sprint 8.1).
// Zero behavior change — logic is byte-identical to the originals.
// ============================================================

export type CacheEntry<T> = { value: T; expiresAt: number };

export const CACHE_MAX = 200;

export function cacheGet<T>(m: Map<string, CacheEntry<T>>, k: string): T | null {
  const e = m.get(k);
  if (!e) return null;
  if (e.expiresAt < Date.now()) { m.delete(k); return null; }
  return e.value;
}

export function cacheSet<T>(m: Map<string, CacheEntry<T>>, k: string, v: T, ttlMs: number) {
  if (m.size >= CACHE_MAX) {
    const firstKey = m.keys().next().value;
    if (firstKey !== undefined) m.delete(firstKey);
  }
  m.set(k, { value: v, expiresAt: Date.now() + ttlMs });
}

export function normalizeQuery(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

export function extractDateWindow(q: string): { df: string | null; dt: string | null } {
  const now = new Date();
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  if (/\bbugün\b|\bbugun\b/.test(q)) return { df: iso(now), dt: iso(now) };
  if (/\bdün\b|\bdun\b/.test(q)) {
    const d = new Date(now); d.setDate(d.getDate() - 1); return { df: iso(d), dt: iso(d) };
  }
  if (/\bbu ay\b/.test(q)) {
    const s = new Date(now.getFullYear(), now.getMonth(), 1);
    const e = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { df: iso(s), dt: iso(e) };
  }
  if (/\bgeçen ay\b|\bgecen ay\b/.test(q)) {
    const s = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const e = new Date(now.getFullYear(), now.getMonth(), 0);
    return { df: iso(s), dt: iso(e) };
  }
  if (/\bbu hafta\b/.test(q)) {
    const d = new Date(now);
    const day = (d.getDay() + 6) % 7; // Monday=0
    const s = new Date(d); s.setDate(d.getDate() - day);
    const e = new Date(s); e.setDate(s.getDate() + 6);
    return { df: iso(s), dt: iso(e) };
  }
  return { df: null, dt: null };
}
