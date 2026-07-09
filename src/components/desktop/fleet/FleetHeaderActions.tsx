// Sprint M1.6 — Fleet header actions: CEO Mode toggle.
import { Crown } from "lucide-react";

export const FleetHeaderActions = ({ ceoMode, onToggleCeo }: { ceoMode: boolean; onToggleCeo: () => void }) => (
  <button
    onClick={onToggleCeo}
    className={`flex items-center gap-2 px-3 h-10 min-h-[44px] rounded-lg text-fs-xs border transition-colors ${
      ceoMode
        ? "bg-[#FF6B2B]/15 border-[#FF6B2B]/40 text-[#FF6B2B]"
        : "bg-card border-border text-foreground/70 hover:bg-muted"
    }`}
  >
    <Crown className="w-3.5 h-3.5" /> CEO Modu
  </button>
);
