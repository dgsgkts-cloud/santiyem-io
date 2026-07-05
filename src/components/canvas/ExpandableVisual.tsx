import { useState, type ReactNode } from "react";
import { Maximize2, Minimize2, ChevronDown, ChevronUp } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";

export const ExpandableVisual = ({
  title,
  children,
}: {
  title?: string;
  children: ReactNode;
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [full, setFull] = useState(false);
  return (
    <div className="rounded-xl border border-border/60 bg-card overflow-hidden animate-scale-in">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/60">
        <p className="text-[12px] font-medium text-foreground/90 truncate">
          {title || "Görsel"}
        </p>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCollapsed((v) => !v)}
            aria-label={collapsed ? "Aç" : "Daralt"}
            className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            {collapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => setFull(true)}
            aria-label="Tam ekran"
            className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      {!collapsed && <div className="p-3">{children}</div>}
      <Dialog open={full} onOpenChange={setFull}>
        <DialogContent className="max-w-6xl w-[95vw] max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-foreground">{title || "Görsel"}</p>
            <button
              onClick={() => setFull(false)}
              aria-label="Kapat"
              className="w-7 h-7 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              <Minimize2 className="w-4 h-4" />
            </button>
          </div>
          <div>{children}</div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ExpandableVisual;
