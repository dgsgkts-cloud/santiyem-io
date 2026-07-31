import { MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { initials, roleMeta, STATUS_META } from "@/lib/companyAccess";
import type { CompanyUser } from "@/hooks/useCompanyUsers";

/** SPRINT 41C — 76px user row: avatar, name, e-mail, role badge, status, overflow. */
export function UserListRow({
  user, onOpen, onOverflow,
}: { user: CompanyUser; onOpen: () => void; onOverflow: () => void }) {
  const role = roleMeta(user.role);
  const status = STATUS_META[user.status];

  return (
    <div className="flex items-center gap-3 pl-3.5 pr-1 min-h-[76px] active:bg-muted/40">
      <button
        type="button"
        onClick={onOpen}
        className="flex items-center gap-3 flex-1 min-w-0 py-3 text-left"
      >
        <span
          className="h-11 w-11 rounded-full flex items-center justify-center shrink-0 text-[13px] font-bold"
          style={{ backgroundColor: `${role.color}1F`, color: role.color }}
          aria-hidden
        >
          {initials(user.name, user.email)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5 min-w-0">
            <span className="text-[16px] font-semibold text-foreground truncate">{user.name}</span>
            {user.isOwner && (
              <span className="text-[10.5px] font-semibold text-primary border border-primary/40 rounded-[6px] px-1 py-px shrink-0">
                Sahip
              </span>
            )}
          </span>
          {user.email && user.email !== user.name && (
            <span className="block text-[13px] text-muted-foreground truncate mt-0.5">{user.email}</span>
          )}
          <span className="flex items-center gap-2 mt-1 min-w-0">
            <span
              className="text-[11.5px] font-medium rounded-[6px] px-1.5 py-px truncate max-w-[52%]"
              style={{ backgroundColor: `${role.color}14`, color: role.color }}
            >
              {role.label}
            </span>
            <span className="flex items-center gap-1 shrink-0">
              <span className={cn("h-1.5 w-1.5 rounded-full", status.dot)} />
              <span className={cn("text-[11.5px]", status.text)}>{status.label}</span>
            </span>
          </span>
        </span>
      </button>
      <button
        type="button"
        onClick={onOverflow}
        aria-label={`${user.name} için işlemler`}
        className="h-11 w-11 rounded-[12px] flex items-center justify-center text-muted-foreground active:bg-muted shrink-0"
      >
        <MoreHorizontal className="w-5 h-5" />
      </button>
    </div>
  );
}

export default UserListRow;
