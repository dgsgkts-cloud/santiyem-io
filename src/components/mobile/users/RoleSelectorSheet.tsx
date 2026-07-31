import { Check } from "lucide-react";
import { MobileSheet } from "@/components/mobile/sheets/MobileSheet";
import { ASSIGNABLE_ROLES, type AccessRoleId } from "@/lib/companyAccess";
import { cn } from "@/lib/utils";

/**
 * SPRINT 41C — role selector sheet (never a floating dropdown on mobile).
 * "Askıda" is a status, not a role, so it never appears here.
 */
export function RoleSelectorSheet({
  open, onOpenChange, value, onSelect, disabledIds = [],
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  value: AccessRoleId;
  onSelect: (id: AccessRoleId) => void;
  disabledIds?: AccessRoleId[];
}) {
  return (
    <MobileSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Rol Seçin"
      description="Rol, kullanıcının hangi verilere erişebileceğini belirler."
      variant="selector"
    >
      <div className="rounded-[16px] border border-border/70 overflow-hidden divide-y divide-border/60 mb-1">
        {ASSIGNABLE_ROLES.map(role => {
          const active = role.id === value;
          const disabled = disabledIds.includes(role.id);
          return (
            <button
              key={role.id}
              type="button"
              disabled={disabled}
              onClick={() => { onSelect(role.id); onOpenChange(false); }}
              className={cn(
                "w-full flex items-start gap-3 px-3.5 py-3 text-left min-h-[64px]",
                active && "bg-primary/[0.07]",
                disabled ? "opacity-45" : "active:bg-muted/60",
              )}
            >
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: role.color }} />
                  <span className="text-[15.5px] font-medium text-foreground">{role.label}</span>
                  <span className="text-[11px] text-muted-foreground border border-border rounded-[6px] px-1 py-px">
                    {role.scope === "company" ? "Şirket geneli" : "Proje bazlı"}
                  </span>
                </span>
                <span className="block text-[12.5px] text-muted-foreground leading-snug mt-1">
                  {role.description}
                </span>
              </span>
              {active && <Check className="w-4 h-4 text-primary shrink-0 mt-1" />}
            </button>
          );
        })}
      </div>
    </MobileSheet>
  );
}

export default RoleSelectorSheet;
