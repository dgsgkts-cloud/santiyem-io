import { useEffect, useRef, useState } from "react";
import { ChevronRight, MoreVertical, Trash2, Receipt, Wallet } from "lucide-react";
import { Project } from "@/lib/projectsData";
import { useWorkspaceHighlight } from "@/hooks/useWorkspaceHighlight";
import { cn } from "@/lib/utils";

/**
 * SPRINT 40 — Denser project card for mobile.
 * Hierarchy: name (max 2 lines) → status → progress → meta.
 * Destructive delete lives in an overflow menu so it can never be hit
 * by accident while scrolling. Presentation only.
 */

interface Props {
  project: Project;
  canManage: boolean;
  onOpen: () => void;
  onDelete: () => void;
  onHakedis: () => void;
  onPayment: () => void;
}

export default function ProjectListCard({
  project: p, canManage, onOpen, onDelete, onHakedis, onPayment,
}: Props) {
  const highlighted = useWorkspaceHighlight("project", p.id);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [menuOpen]);

  const stop = (fn: () => void) => (e: React.MouseEvent) => {
    e.stopPropagation();
    fn();
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(); }
      }}
      className={cn(
        "group relative w-full text-left rounded-card border border-border/70 bg-card",
        "px-3.5 py-2.5 cursor-pointer transition-all duration-200",
        "hover:border-primary/40 hover:shadow-soft active:scale-[0.995]",
        highlighted && "ws-highlight",
      )}
    >
      {/* Row 1 — name (max 2 lines) + status */}
      <div className="flex items-start gap-2 min-w-0">
        <span
          className="w-1.5 h-1.5 rounded-full shrink-0 mt-[7px]"
          style={{ backgroundColor: p.statusColor }}
        />
        <h3 className="ds-title text-foreground min-w-0 flex-1 line-clamp-2 leading-snug">
          {p.name}
        </h3>
        <span
          className="ds-caption font-medium px-2 py-0.5 rounded-md shrink-0"
          style={{ backgroundColor: `${p.statusColor}15`, color: p.statusColor }}
        >
          {p.status}
        </span>
        <ChevronRight className="w-4 h-4 text-muted-foreground/50 shrink-0 hidden sm:block mt-0.5" />
      </div>

      {/* Row 2 — progress */}
      <div className="flex items-center gap-2 mt-1.5">
        <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${p.progress}%`, backgroundColor: p.statusColor }}
          />
        </div>
        <span className="ds-caption ds-numeric text-muted-foreground shrink-0 tabular-nums">
          %{p.progress}
        </span>
      </div>

      {/* Row 3 — meta + actions */}
      <div className="flex items-center justify-between gap-2 mt-1.5">
        <div className="flex items-center gap-2 min-w-0 ds-caption text-muted-foreground/80">
          <span className="truncate">{p.client || "—"}</span>
          {p.end && (
            <>
              <span className="opacity-40">·</span>
              <span className="shrink-0 tabular-nums">{p.end}</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-0.5 shrink-0">
          <button
            onClick={stop(onHakedis)}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
            aria-label="Hakedişleri aç"
            title="Hakediş"
          >
            <Receipt className="w-4 h-4" />
          </button>
          <button
            onClick={stop(onPayment)}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
            aria-label="Ödemeleri aç"
            title="Ödeme"
          >
            <Wallet className="w-4 h-4" />
          </button>
          {canManage && (
            <div className="relative" ref={menuRef}>
              <button
                onClick={stop(() => setMenuOpen((o) => !o))}
                className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                aria-label="Diğer işlemler"
                aria-expanded={menuOpen}
              >
                <MoreVertical className="w-4 h-4" />
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-10 z-20 w-40 rounded-xl border border-border bg-popover shadow-raised overflow-hidden">
                  <button
                    onClick={stop(() => { setMenuOpen(false); onDelete(); })}
                    className="w-full flex items-center gap-2 px-3 h-11 ds-body text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Projeyi Sil
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
