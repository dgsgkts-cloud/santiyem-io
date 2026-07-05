// PinnedInsights — renders the user's pinned canvas visuals on the
// Executive Dashboard. Empty state when nothing pinned.

import { useEffect, useState } from "react";
import { Pin, X } from "lucide-react";
import { AIResponseRenderer } from "@/components/ai/AIResponseRenderer";
import { readPinned, writePinned, type PinnedItem } from "./PinButton";

export const PinnedInsights = () => {
  const [items, setItems] = useState<PinnedItem[]>([]);

  useEffect(() => {
    const sync = () => setItems(readPinned());
    sync();
    window.addEventListener("canvas-pinned-changed", sync);
    return () => window.removeEventListener("canvas-pinned-changed", sync);
  }, []);

  if (!items.length) return null;

  return (
    <section className="mb-6 animate-fade-in">
      <div className="flex items-center gap-2 mb-3 px-1">
        <Pin className="w-4 h-4 text-primary" />
        <h2 className="text-[14px] font-semibold text-foreground">Sabitlenmiş İçgörüler</h2>
        <span className="text-[11px] text-muted-foreground">({items.length})</span>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {items.map((it) => (
          <div key={it.id} className="rounded-xl border border-border/60 bg-card p-3 relative group">
            <button
              onClick={() => writePinned(readPinned().filter((p) => p.id !== it.id))}
              aria-label="Kaldır"
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-opacity"
            >
              <X className="w-3.5 h-3.5" />
            </button>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2 pr-6 truncate">
              {it.title}
            </p>
            <AIResponseRenderer ui={it.ui} />
          </div>
        ))}
      </div>
    </section>
  );
};

export default PinnedInsights;
