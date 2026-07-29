import { Phone, Pencil, Trash2, CalendarClock, Building2 } from "lucide-react";
import type { Personnel } from "@/hooks/usePersonnel";
import { EMPLOYMENT_TYPE_LABELS } from "@/hooks/usePersonnel";
import { cn } from "@/lib/utils";

/**
 * SPRINT 38C — Dense personnel row.
 * Hierarchy: Name → Status → Project → Role. Phone/ID are demoted to actions.
 * ~60px tall so ~9 people fit on a phone screen without scrolling.
 * Presentation only — all data + handlers are supplied by the list.
 */

const TYPE_TINT: Record<string, string> = {
  daily_wage: "text-amber-500",
  monthly_salary: "text-blue-500",
  subcontractor_crew: "text-purple-500",
};

interface Props {
  person: Personnel;
  projectLabel: string;
  onOpen: () => void;
  onAttendance?: () => void;
  onDelete: () => void;
}

export function PersonnelRow({ person: p, projectLabel, onOpen, onAttendance, onDelete }: Props) {
  const stop = (fn?: () => void) => (e: React.MouseEvent) => {
    e.stopPropagation();
    fn?.();
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      className="group flex items-center gap-3 px-3 py-2.5 min-h-[60px] cursor-pointer transition-colors hover:bg-muted/40 focus:outline-none focus-visible:bg-muted/50"
    >
      {/* Status dot — first signal */}
      <span
        aria-hidden
        className={cn(
          "w-2 h-2 rounded-full shrink-0",
          p.is_active ? "bg-emerald-500" : "bg-muted-foreground/40",
        )}
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 min-w-0">
          <span className="ds-body font-medium text-foreground truncate">{p.full_name}</span>
          {!p.is_active && (
            <span className="ds-caption shrink-0 px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground">
              Pasif
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 min-w-0 mt-0.5">
          <Building2 className="w-3 h-3 shrink-0 text-muted-foreground/60" />
          <span className="ds-caption text-muted-foreground truncate">{projectLabel}</span>
          <span className="ds-caption text-muted-foreground/40">·</span>
          <span className={cn("ds-caption truncate", TYPE_TINT[p.employment_type] ?? "text-muted-foreground")}>
            {p.occupation || EMPLOYMENT_TYPE_LABELS[p.employment_type]}
          </span>
        </div>
      </div>

      {/* Quick actions — always visible on touch, delete revealed on hover (desktop) */}
      <div className="flex items-center gap-0.5 shrink-0">
        {p.phone && (
          <a
            href={`tel:${p.phone}`}
            onClick={(e) => e.stopPropagation()}
            aria-label={`${p.full_name} ara`}
            title={p.phone}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <Phone className="w-4 h-4" />
          </a>
        )}
        {onAttendance && (
          <button
            onClick={stop(onAttendance)}
            aria-label="Puantaj detayları"
            className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <CalendarClock className="w-4 h-4" />
          </button>
        )}
        <button
          onClick={stop(onOpen)}
          aria-label="Bilgileri düzenle"
          className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <Pencil className="w-4 h-4" />
        </button>
        <button
          onClick={stop(onDelete)}
          aria-label="Kişiyi sil"
          className="w-9 h-9 rounded-lg flex items-center justify-center text-red-500/80 hover:text-red-500 hover:bg-red-500/10 transition-all md:opacity-0 md:group-hover:opacity-100 md:focus:opacity-100"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default PersonnelRow;
