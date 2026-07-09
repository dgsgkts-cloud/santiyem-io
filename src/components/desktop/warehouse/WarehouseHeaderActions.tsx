// Sprint M1.5 — Warehouse header actions (Command palette + CEO mode toggle).
import { Search, Zap } from "lucide-react";

interface Props {
  ceoMode: boolean;
  onToggleCeo: () => void;
}

export const WarehouseHeaderActions = ({ ceoMode, onToggleCeo }: Props) => (
  <div className="flex items-center gap-2 flex-wrap">
    <button
      onClick={() => window.dispatchEvent(new CustomEvent("open-command-palette"))}
      className="px-3 h-11 min-h-[44px] text-fs-xs rounded-lg bg-card border border-border text-foreground/70 hover:bg-muted flex items-center gap-1.5 transition-colors duration-[220ms]"
    >
      <Search className="w-3 h-3" /> Ara / Komut{" "}
      <kbd className="text-fs-xs px-1 py-0.5 rounded bg-muted border border-border hidden sm:inline">⌘K</kbd>
    </button>
    <button
      onClick={onToggleCeo}
      aria-pressed={ceoMode}
      className={`px-3 h-11 min-h-[44px] text-fs-xs rounded-lg flex items-center gap-1.5 border transition-colors duration-[220ms] ${
        ceoMode
          ? "bg-[#FF6B2B]/15 text-[#FF6B2B] border-[#FF6B2B]/30"
          : "bg-card text-foreground/70 border-border hover:bg-muted"
      }`}
    >
      <Zap className="w-3 h-3" /> {ceoMode ? "CEO Modu Aktif" : "CEO Modu"}
    </button>
  </div>
);

export default WarehouseHeaderActions;
