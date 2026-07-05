// workspaceBus — tiny pub/sub for AI Canvas ↔ ERP surfaces.
// Publishers: AICanvas (after a turn completes). Subscribers: list rows,
// dashboards, preview cards. No logic depends on this bus — every surface
// works normally if the bus is silent.

export type EntityKind =
  | "project"
  | "personnel"
  | "supplier"
  | "material"
  | "task"
  | "payment"
  | "document";

export type EntityRef = { kind: EntityKind; id: string; label?: string };

export type WorkspaceEvent =
  | { type: "highlight"; refs: EntityRef[]; ttlMs?: number }
  | { type: "filter"; kind: EntityKind; ids: string[]; label?: string }
  | { type: "filter-clear"; kind: EntityKind }
  | { type: "navigate"; ref: EntityRef; confidence: "high" | "medium" }
  | { type: "preview"; ref: EntityRef };

const target = new EventTarget();
const EVT = "ws";

// Highlight state cache so late-mounting rows still show a pulse.
type ActiveHighlight = { kind: EntityKind; id: string; expiresAt: number };
let activeHighlights: ActiveHighlight[] = [];

const pruneExpired = () => {
  const now = Date.now();
  activeHighlights = activeHighlights.filter((h) => h.expiresAt > now);
};

export const workspaceBus = {
  publish(event: WorkspaceEvent) {
    if (event.type === "highlight") {
      const ttl = event.ttlMs ?? 2200;
      const capped = event.refs.slice(0, 2); // ≤ 2 concurrent highlights
      const expiresAt = Date.now() + ttl;
      activeHighlights = [
        ...activeHighlights.filter(
          (h) => !capped.some((r) => r.kind === h.kind && r.id === h.id),
        ),
        ...capped.map((r) => ({ kind: r.kind, id: r.id, expiresAt })),
      ].slice(-4);
      target.dispatchEvent(new CustomEvent(EVT, { detail: { ...event, refs: capped } }));
      setTimeout(() => {
        pruneExpired();
        target.dispatchEvent(new CustomEvent(EVT, { detail: { type: "highlight-expire" } }));
      }, ttl + 50);
      return;
    }
    target.dispatchEvent(new CustomEvent(EVT, { detail: event }));
  },
  subscribe(fn: (e: WorkspaceEvent | { type: "highlight-expire" }) => void) {
    const listener = (evt: Event) => fn((evt as CustomEvent).detail);
    target.addEventListener(EVT, listener);
    return () => target.removeEventListener(EVT, listener);
  },
  isHighlighted(kind: EntityKind, id: string): boolean {
    pruneExpired();
    return activeHighlights.some((h) => h.kind === kind && h.id === id);
  },
};
