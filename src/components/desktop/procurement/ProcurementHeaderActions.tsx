// Sprint M1.4 — Right-side header actions (command palette + CEO mode).
import { Search, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  ceoMode: boolean;
  onToggleCeo: () => void;
}

export const ProcurementHeaderActions = ({ ceoMode, onToggleCeo }: Props) => (
  <div className="flex items-center gap-2 flex-wrap">
    <button
      onClick={() =>
        window.dispatchEvent(new CustomEvent("open-command-palette"))
      }
      className="min-h-[36px] px-3 py-1.5 text-fs-xs rounded-lg bg-muted/60 border border-border text-foreground/80 hover:bg-muted flex items-center gap-1.5"
    >
      <Search className="w-3 h-3" /> Ara / Komut{" "}
      <kbd className="text-fs-xs px-1 py-0.5 rounded bg-muted border border-border">
        ⌘K
      </kbd>
    </button>
    <button
      onClick={onToggleCeo}
      className={cn(
        "min-h-[36px] px-3 py-1.5 text-fs-xs rounded-lg flex items-center gap-1.5 border",
        ceoMode
          ? "bg-[#FF6B2B]/15 text-[#FF6B2B] border-[#FF6B2B]/30"
          : "bg-muted/60 text-foreground/80 border-border hover:bg-muted"
      )}
    >
      <Zap className="w-3 h-3" /> {ceoMode ? "CEO Modu Aktif" : "CEO Modu"}
    </button>
  </div>
);

export default ProcurementHeaderActions;
