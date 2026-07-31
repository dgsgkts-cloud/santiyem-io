import { useEffect, useState } from "react";
import { MobileSheet } from "@/components/mobile/sheets/MobileSheet";
import { TUNABLE_KEYS, FINANCIAL_KEYS, roleDefaultPermission, type PermissionKey, type ProjectRole } from "@/lib/projectPermissions";
import type { AccessProject, CompanyUser } from "@/hooks/useCompanyUsers";
import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * SPRINT 41C — advanced (granular) permissions. Only the keys the backend
 * enforces via `project_member_permissions` / `has_project_permission` are
 * exposed; financial keys stay locked unless the acting user owns the project.
 */
export function AdvancedPermissionsSheet({
  open, onOpenChange, user, projects, currentUserId,
  loadPermissions, setPermission,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  user: CompanyUser | null;
  projects: AccessProject[];
  currentUserId: string | null;
  loadPermissions: (userId: string, projectId: string) => Promise<Partial<Record<PermissionKey, boolean>>>;
  setPermission: (userId: string, projectId: string, key: PermissionKey, granted: boolean) => Promise<boolean>;
}) {
  const scoped = projects.filter(p => user?.projectIds.includes(p.id));
  const [projectId, setProjectId] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<Partial<Record<PermissionKey, boolean>>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setProjectId(scoped[0]?.id ?? null);
  }, [open, scoped.length]);

  useEffect(() => {
    if (!open || !user?.userId || !projectId) return;
    setLoading(true);
    loadPermissions(user.userId, projectId).then(v => { setOverrides(v); setLoading(false); });
  }, [open, user?.userId, projectId, loadPermissions]);

  if (!user) return null;

  const role = (user.projectRoles[projectId ?? ""] ?? user.role) as ProjectRole;
  const project = scoped.find(p => p.id === projectId);
  const ownsProject = !!project && project.ownerId === currentUserId;

  const value = (key: PermissionKey) =>
    key in overrides ? overrides[key] === true : roleDefaultPermission(role, key);

  const toggle = async (key: PermissionKey) => {
    if (!user.userId || !projectId) return;
    const next = !value(key);
    setOverrides(o => ({ ...o, [key]: next }));
    const ok = await setPermission(user.userId, projectId, key, next);
    if (!ok) setOverrides(o => ({ ...o, [key]: !next }));
  };

  return (
    <MobileSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Ayrıntılı Yetkiler"
      description="Rol şablonunun üzerine proje bazlı ince ayar yapın."
      variant="form"
    >
      {scoped.length === 0 ? (
        <p className="text-[14px] text-muted-foreground py-6 text-center leading-relaxed">
          Bu kullanıcının proje bazlı görevi yok. Ayrıntılı yetkiler yalnızca projeye atanmış
          kullanıcılar için tanımlanabilir.
        </p>
      ) : (
        <div className="flex flex-col gap-3.5 pb-2">
          <div className="flex gap-1.5 overflow-x-auto -mx-1 px-1 pb-1">
            {scoped.map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => setProjectId(p.id)}
                className={cn(
                  "h-10 px-3 rounded-[12px] text-[13.5px] whitespace-nowrap border",
                  p.id === projectId
                    ? "border-primary/50 bg-primary/10 text-primary font-medium"
                    : "border-border text-muted-foreground",
                )}
              >
                {p.name}
              </button>
            ))}
          </div>

          {loading ? (
            <p className="text-[13.5px] text-muted-foreground py-4">Yetkiler yükleniyor…</p>
          ) : (
            <div className="rounded-[16px] border border-border/70 overflow-hidden divide-y divide-border/60">
              {TUNABLE_KEYS.map(t => {
                const locked = FINANCIAL_KEYS.includes(t.key) && !ownsProject;
                const on = value(t.key);
                return (
                  <div key={t.key} className="flex items-center gap-3 px-3.5 min-h-[56px] py-2.5">
                    <span className="min-w-0 flex-1">
                      <span className="block text-[14.5px] text-foreground">{t.label}</span>
                      {locked && (
                        <span className="block text-[12px] text-muted-foreground mt-0.5">
                          Finansal yetkiler yalnızca proje sahibi tarafından değiştirilir.
                        </span>
                      )}
                    </span>
                    {locked ? (
                      <Lock className="w-4 h-4 text-muted-foreground shrink-0" />
                    ) : (
                      <button
                        type="button"
                        role="switch"
                        aria-checked={on}
                        aria-label={t.label}
                        onClick={() => toggle(t.key)}
                        className={cn(
                          "relative w-[48px] h-[28px] rounded-full transition-colors shrink-0",
                          on ? "bg-primary" : "bg-muted",
                        )}
                      >
                        <span
                          className={cn(
                            "absolute top-[3px] h-[22px] w-[22px] rounded-full bg-background transition-all",
                            on ? "left-[23px]" : "left-[3px]",
                          )}
                        />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </MobileSheet>
  );
}

export default AdvancedPermissionsSheet;
