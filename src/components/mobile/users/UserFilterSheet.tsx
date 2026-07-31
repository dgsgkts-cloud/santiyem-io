import { MobileSheet } from "@/components/mobile/sheets/MobileSheet";
import { ASSIGNABLE_ROLES, STATUS_META, type AccessRoleId, type UserStatus } from "@/lib/companyAccess";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type UserFilter = { status: UserStatus | "all"; role: AccessRoleId | "all" };

/** SPRINT 41C — single filter sheet instead of multi-row chip walls. */
export function UserFilterSheet({
  open, onOpenChange, value, onChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  value: UserFilter;
  onChange: (f: UserFilter) => void;
}) {
  const statuses: { id: UserStatus | "all"; label: string }[] = [
    { id: "all", label: "Tümü" },
    { id: "active", label: STATUS_META.active.label },
    { id: "invited", label: STATUS_META.invited.label },
    { id: "suspended", label: STATUS_META.suspended.label },
  ];

  const Row = ({ label, active, onSelect }: { label: string; active: boolean; onSelect: () => void }) => (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full flex items-center gap-3 px-3.5 min-h-[50px] text-left",
        active ? "bg-primary/[0.06]" : "active:bg-muted/60",
      )}
    >
      <span className="flex-1 text-[15px] text-foreground">{label}</span>
      {active && <Check className="w-4 h-4 text-primary" />}
    </button>
  );

  return (
    <MobileSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Filtrele"
      description="Durum ve role göre kullanıcıları süzün."
      variant="selector"
      footer={
        <button
          type="button"
          onClick={() => { onChange({ status: "all", role: "all" }); onOpenChange(false); }}
          className="w-full h-12 rounded-[13px] border border-border text-[15px] font-medium text-foreground active:bg-muted"
        >
          Filtreleri temizle
        </button>
      }
    >
      <p className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">Durum</p>
      <div className="rounded-[16px] border border-border/70 overflow-hidden divide-y divide-border/60 mb-4">
        {statuses.map(s => (
          <Row
            key={s.id}
            label={s.label}
            active={value.status === s.id}
            onSelect={() => onChange({ ...value, status: s.id })}
          />
        ))}
      </div>

      <p className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">Rol</p>
      <div className="rounded-[16px] border border-border/70 overflow-hidden divide-y divide-border/60">
        <Row label="Tümü" active={value.role === "all"} onSelect={() => onChange({ ...value, role: "all" })} />
        {ASSIGNABLE_ROLES.map(r => (
          <Row
            key={r.id}
            label={r.label}
            active={value.role === r.id}
            onSelect={() => onChange({ ...value, role: r.id })}
          />
        ))}
      </div>
    </MobileSheet>
  );
}

export default UserFilterSheet;
