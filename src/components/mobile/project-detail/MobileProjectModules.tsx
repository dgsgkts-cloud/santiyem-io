import { ChevronRight, Lock, type LucideIcon } from "lucide-react";

export interface ModuleRow {
  id: string;
  label: string;
  Icon: LucideIcon;
  status?: string;
  statusTone?: "neutral" | "warning" | "critical";
  locked?: boolean;
  accent?: boolean;
}

export interface ModuleGroup {
  label: string;
  items: ModuleRow[];
}

interface Props {
  groups: ModuleGroup[];
  onOpen: (m: ModuleRow) => void;
}

/** SPRINT 41A — grouped module navigation, 60px rows, restrained icon surfaces. */
export default function MobileProjectModules({ groups, onOpen }: Props) {
  return (
    <div className="flex flex-col gap-5">
      {groups.map((g) => (
        <section key={g.label}>
          <div className="text-[12px] font-semibold tracking-[0.06em] text-muted-foreground mb-[10px]">
            {g.label}
          </div>
          <div className="rounded-[16px] border border-border/60 bg-card divide-y divide-border/50 overflow-hidden">
            {g.items.map((m) => (
              <button
                key={m.id}
                onClick={() => onOpen(m)}
                className={`w-full flex items-center gap-3 px-3 h-[60px] text-left active:bg-muted/50 ${
                  m.locked ? "opacity-60" : ""
                }`}
              >
                <span
                  className={`h-[38px] w-[38px] rounded-[11px] flex items-center justify-center shrink-0 ${
                    m.accent ? "bg-primary/10" : "bg-muted"
                  }`}
                >
                  <m.Icon className={`h-[21px] w-[21px] ${m.accent ? "text-primary" : "text-foreground/70"}`} />
                </span>

                <span className="min-w-0 flex-1 text-[16px] text-foreground truncate">{m.label}</span>

                {m.locked ? (
                  <Lock className="h-4 w-4 text-muted-foreground shrink-0" />
                ) : m.status ? (
                  <span
                    className={`text-[12px] shrink-0 max-w-[45%] truncate ${
                      m.statusTone === "critical"
                        ? "text-destructive"
                        : m.statusTone === "warning"
                        ? "text-primary"
                        : "text-muted-foreground"
                    }`}
                  >
                    {m.status}
                  </span>
                ) : null}

                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
