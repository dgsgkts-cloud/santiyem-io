// PinButton — persists a canvas visual to localStorage so it can surface on
// the Executive Dashboard. No backend, no schema changes.

import { useEffect, useState } from "react";
import { Pin, PinOff } from "lucide-react";
import { toast } from "sonner";
import type { AIUiPayload } from "@/components/ai/AIResponseRenderer";

const KEY = "canvas_pinned_v1";
const MAX = 12;

export type PinnedItem = {
  id: string;
  title: string;
  ui: AIUiPayload;
  createdAt: number;
};

export const readPinned = (): PinnedItem[] => {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as PinnedItem[]) : [];
  } catch {
    return [];
  }
};

export const writePinned = (items: PinnedItem[]) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(items.slice(0, MAX)));
    window.dispatchEvent(new CustomEvent("canvas-pinned-changed"));
  } catch { /* noop */ }
};

const idFor = (title: string, ui: AIUiPayload) =>
  `${title}::${(ui.type || "unknown")}::${JSON.stringify(ui.rows ?? ui.data ?? ui.items ?? ui.kpis ?? "").slice(0, 80)}`;

export const PinButton = ({ title, ui }: { title: string; ui: AIUiPayload }) => {
  const [pinned, setPinned] = useState(false);
  const key = idFor(title, ui);

  useEffect(() => {
    setPinned(readPinned().some((p) => p.id === key));
    const onChange = () => setPinned(readPinned().some((p) => p.id === key));
    window.addEventListener("canvas-pinned-changed", onChange);
    return () => window.removeEventListener("canvas-pinned-changed", onChange);
  }, [key]);

  const toggle = () => {
    const list = readPinned();
    if (pinned) {
      writePinned(list.filter((p) => p.id !== key));
      toast.success("Panodan kaldırıldı");
    } else {
      writePinned([{ id: key, title, ui, createdAt: Date.now() }, ...list]);
      toast.success("Panoya sabitlendi");
    }
  };

  return (
    <button
      onClick={toggle}
      aria-label={pinned ? "Panodan kaldır" : "Panoya sabitle"}
      className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
    >
      {pinned ? (
        <PinOff className="w-3.5 h-3.5 text-primary" />
      ) : (
        <Pin className="w-3.5 h-3.5" />
      )}
    </button>
  );
};

export default PinButton;
