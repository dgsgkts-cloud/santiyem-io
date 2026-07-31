import { useEffect, useMemo, useState } from "react";
import { Check, Search, X } from "lucide-react";
import { MobileSheet } from "@/components/mobile/sheets/MobileSheet";
import type { AccessProject } from "@/hooks/useCompanyUsers";
import { cn } from "@/lib/utils";

/**
 * SPRINT 41C — project access selector: "Tüm projeler" vs "Belirli projeler"
 * with a searchable list, select-all / clear and a live selection summary.
 */
export function ProjectAccessSheet({
  open, onOpenChange, projects, value, onSave, companyWide, busy,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  projects: AccessProject[];
  value: string[];
  onSave: (ids: string[]) => void;
  /** Company members already inherit every company project. */
  companyWide?: boolean;
  busy?: boolean;
}) {
  const [mode, setMode] = useState<"all" | "specific">(
    value.length === projects.length && projects.length > 0 ? "all" : "specific",
  );
  const [selected, setSelected] = useState<string[]>(value);
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!open) return;
    setSelected(value);
    setMode(projects.length > 0 && value.length === projects.length ? "all" : "specific");
    setQ("");
  }, [open, value, projects.length]);

  const filtered = useMemo(() => {
    const s = q.trim().toLocaleLowerCase("tr");
    if (!s) return projects;
    return projects.filter(
      p =>
        p.name.toLocaleLowerCase("tr").includes(s) ||
        (p.location ?? "").toLocaleLowerCase("tr").includes(s),
    );
  }, [projects, q]);

  const effective = mode === "all" ? projects.map(p => p.id) : selected;

  const toggle = (id: string) =>
    setSelected(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));

  return (
    <MobileSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Proje Erişimi"
      description={
        companyWide
          ? "Şirket geneli roller tüm projeleri görür. Buradan ek proje görevleri atayabilirsiniz."
          : "Kullanıcı yalnızca seçtiğiniz projelere erişebilir."
      }
      variant="form"
      footer={
        <div className="flex items-center gap-2">
          <span className="text-[12.5px] text-muted-foreground flex-1">
            {effective.length === 0
              ? "Proje seçilmedi"
              : `${effective.length} projeye erişebilir`}
          </span>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="h-12 px-4 rounded-[13px] border border-border text-[15px] font-medium text-foreground active:bg-muted"
          >
            İptal
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onSave(effective)}
            className="h-12 px-5 rounded-[13px] bg-primary text-primary-foreground text-[15px] font-semibold disabled:opacity-45 active:opacity-90"
          >
            {busy ? "Kaydediliyor…" : "Kaydet"}
          </button>
        </div>
      }
    >
      <div className="flex gap-1.5 p-1 rounded-[13px] bg-muted/50 mb-3">
        {(["all", "specific"] as const).map(m => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={cn(
              "flex-1 h-10 rounded-[10px] text-[14px] font-medium",
              mode === m ? "bg-card text-foreground shadow-sm" : "text-muted-foreground",
            )}
          >
            {m === "all" ? "Tüm projeler" : "Belirli projeler"}
          </button>
        ))}
      </div>

      {mode === "specific" && (
        <>
          <div className="relative mb-2.5">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Proje ara"
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

          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={() => setSelected(projects.map(p => p.id))}
              className="text-[13px] text-primary font-medium"
            >
              Tümünü seç
            </button>
            <button
              type="button"
              onClick={() => setSelected([])}
              className="text-[13px] text-muted-foreground font-medium"
            >
              Seçimi temizle
            </button>
          </div>

          {filtered.length === 0 ? (
            <p className="text-[14px] text-muted-foreground py-6 text-center">Proje bulunamadı.</p>
          ) : (
            <div className="rounded-[16px] border border-border/70 overflow-hidden divide-y divide-border/60">
              {filtered.map(p => {
                const active = selected.includes(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => toggle(p.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3.5 min-h-[56px] py-2.5 text-left",
                      active ? "bg-primary/[0.06]" : "active:bg-muted/60",
                    )}
                  >
                    <span
                      className={cn(
                        "h-5 w-5 rounded-[6px] border flex items-center justify-center shrink-0",
                        active ? "bg-primary border-primary" : "border-border",
                      )}
                    >
                      {active && <Check className="w-3.5 h-3.5 text-primary-foreground" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] text-foreground truncate">{p.name}</span>
                      <span className="block text-[12.5px] text-muted-foreground truncate mt-0.5">
                        {[p.status, p.location].filter(Boolean).join(" · ") || "Detay yok"}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}

      {mode === "all" && (
        <p className="text-[13.5px] text-muted-foreground leading-relaxed py-2">
          Kullanıcı şirketin {projects.length} projesinin tamamına erişebilir. Yeni açılan projeler de
          otomatik olarak bu erişime dahil olur.
        </p>
      )}
    </MobileSheet>
  );
}

export default ProjectAccessSheet;
