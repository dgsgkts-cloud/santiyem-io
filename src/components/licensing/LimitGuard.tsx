// Sprint 29.0 — LimitGuard. Wraps a call-to-action (create button, "add"
// row) and shows the UpgradeDialog when the tenant would exceed a plan
// quota. Super Admin and Demo always bypass.
import { cloneElement, isValidElement, ReactElement, ReactNode, useState } from "react";
import { useLicense, type LicenseLimits } from "@/lib/licenseStore";
import { UpgradeDialog } from "./UpgradeDialog";

interface LimitGuardProps {
  limit: keyof LicenseLimits;
  current: number;
  /** Single actionable child (button/link). onClick will be intercepted. */
  children: ReactElement<{ onClick?: (e: any) => void; disabled?: boolean }>;
  /** Optional custom messaging for the dialog. */
  title?: string;
  description?: string;
  /** Extra guard: also block if this feature is unavailable. */
  fallback?: ReactNode;
}

const LIMIT_LABELS: Record<keyof LicenseLimits, string> = {
  projects: "aktif proje",
  personnel: "personel",
  warehouses: "depo",
  aiPerDay: "AI isteği/gün",
  companies: "şirket",
};

export const LimitGuard = ({
  limit, current, children, title, description,
}: LimitGuardProps) => {
  const license = useLicense();
  const [open, setOpen] = useState(false);

  const allowed = license.isWithinLimit(limit, current);
  const max = license.limits[limit];
  const label = LIMIT_LABELS[limit];

  const handleGuardedClick = (e: any) => {
    if (!allowed) {
      e?.preventDefault?.();
      e?.stopPropagation?.();
      setOpen(true);
      return;
    }
    children.props.onClick?.(e);
  };

  const child = isValidElement(children)
    ? cloneElement(children, { onClick: handleGuardedClick })
    : children;

  return (
    <>
      {child}
      <UpgradeDialog
        open={open}
        onOpenChange={setOpen}
        title={title ?? "Plan limiti aşıldı"}
        description={
          description ??
          `Mevcut planınız en fazla ${max === -1 ? "sınırsız" : max} ${label} destekliyor. Daha yüksek bir plana geçerek limiti kaldırabilirsiniz.`
        }
      />
    </>
  );
};

export default LimitGuard;
