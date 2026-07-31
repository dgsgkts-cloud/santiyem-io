import { useMemo, useState } from "react";
import { Check, Plus, Search, X } from "lucide-react";
import { MobileSheet } from "./MobileSheet";
import { cn } from "@/lib/utils";

export interface SelectorOption {
  id: string;
  label: string;
  hint?: string;
}

interface MobileSelectorSheetProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description?: string;
  options: SelectorOption[];
  value?: string | null;
  onSelect: (id: string) => void;
  searchPlaceholder?: string;
  /** Optional "create new" row shown above the list. */
  createLabel?: string;
  onCreate?: (query: string) => void;
  emptyText?: string;
}

/**
 * SPRINT 41B — full-width selector sheet used instead of desktop dropdowns for
 * material, project, supplier, category and personnel pickers.
 */
export function MobileSelectorSheet({
  open, onOpenChange, title, description, options, value, onSelect,
  searchPlaceholder = "Ara", createLabel, onCreate, emptyText = "Sonuç bulunamadı.",
}: MobileSelectorSheetProps) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const s = q.trim().toLocaleLowerCase("tr");
    if (!s) return options;
    return options.filter(o => o.label.toLocaleLowerCase("tr").includes(s));
  }, [options, q]);

  return (
    <MobileSheet
      open={open}
      onOpenChange={(v) => { if (!v) setQ(""); onOpenChange(v); }}
      title={title}
      description={description}
      variant="selector"
    >
      <div className="sticky top-0 bg-card pb-3 z-10">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full h-12 pl-9 pr-9 rounded-[13px] bg-background border border-border text-[16px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
          />
          {q && (
            <button
              type="button"
              onClick={() => setQ("")}
              aria-label="Aramayı temizle"
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground active:bg-muted"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {onCreate && (
        <button
          type="button"
          onClick={() => { onCreate(q.trim()); setQ(""); }}
          className="w-full flex items-center gap-3 px-3.5 min-h-[52px] rounded-[14px] border border-dashed border-primary/40 text-primary text-[15px] font-medium mb-3 active:bg-primary/10"
        >
          <Plus className="w-4 h-4" />
          {createLabel ?? "Yeni oluştur"}{q.trim() ? `: “${q.trim()}”` : ""}
        </button>
      )}

      {filtered.length === 0 ? (
        <p className="text-[14px] text-muted-foreground py-6 text-center">{emptyText}</p>
      ) : (
        <div className="rounded-[16px] border border-border/70 overflow-hidden divide-y divide-border/60">
          {filtered.map(o => {
            const active = o.id === value;
            return (
              <button
                key={o.id}
                type="button"
                onClick={() => { onSelect(o.id); setQ(""); onOpenChange(false); }}
                className={cn(
                  "w-full flex items-center gap-3 px-3.5 min-h-[52px] py-2.5 text-left active:bg-muted/60",
                  active && "bg-primary/[0.07]",
                )}
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] text-foreground leading-tight">{o.label}</span>
                  {o.hint && (
                    <span className="block text-[12.5px] text-muted-foreground mt-0.5">{o.hint}</span>
                  )}
                </span>
                {active && <Check className="w-4 h-4 text-primary shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </MobileSheet>
  );
}

export default MobileSelectorSheet;
