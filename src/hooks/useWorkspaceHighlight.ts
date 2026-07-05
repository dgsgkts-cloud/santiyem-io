// useWorkspaceHighlight — one-liner opt-in for any row/card.
// Usage: const highlighted = useWorkspaceHighlight("project", p.id);
//        <div className={highlighted ? "ws-highlight" : ""}>…</div>

import { useEffect, useState } from "react";
import { workspaceBus, type EntityKind } from "@/lib/workspaceBus";

export const useWorkspaceHighlight = (kind: EntityKind, id: string | undefined) => {
  const [on, setOn] = useState(false);

  useEffect(() => {
    if (!id) return;
    // Sync initial state (row may have mounted after the pulse fired).
    setOn(workspaceBus.isHighlighted(kind, id));
    return workspaceBus.subscribe((e) => {
      if (e.type === "highlight") {
        const match = e.refs.some((r) => r.kind === kind && r.id === id);
        if (match) {
          setOn(false);
          // Restart animation on next frame.
          requestAnimationFrame(() => setOn(true));
        }
      } else if (e.type === "highlight-expire") {
        setOn(workspaceBus.isHighlighted(kind, id));
      }
    });
  }, [kind, id]);

  return on;
};
