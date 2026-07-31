import { useEffect, useState } from "react";
import { MobileSheet } from "@/components/mobile/sheets/MobileSheet";
import { FormFooter, SelectorField, TextField } from "@/components/mobile/materials/fieldKit";
import { RoleSelectorSheet } from "./RoleSelectorSheet";
import { ProjectAccessSheet } from "./ProjectAccessSheet";
import { roleMeta, STATUS_META, type AccessRoleId } from "@/lib/companyAccess";
import type { ProjectRole } from "@/lib/projectPermissions";
import type { AccessProject, CompanyUser } from "@/hooks/useCompanyUsers";
import { cn } from "@/lib/utils";
import { Lock } from "lucide-react";

/**
 * SPRINT 41C — content-driven edit sheet. Company-wide membership can be
 * suspended / re-activated; project roles and project access are editable
 * because the backend enforces both.
 */
export function EditUserSheet({
  open, onOpenChange, user, projects, busy, canManage,
  onSaveProjectAccess, onSaveRole, onToggleStatus,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  user: CompanyUser | null;
  projects: AccessProject[];
  busy: boolean;
  canManage: boolean;
  onSaveProjectAccess: (u: CompanyUser, ids: string[], role: ProjectRole) => Promise<void> | void;
  onSaveRole: (u: CompanyUser, role: ProjectRole) => Promise<void> | void;
  onToggleStatus: (u: CompanyUser, suspended: boolean) => Promise<void> | void;
}) {
  const [role, setRole] = useState<AccessRoleId>("site_engineer");
  const [projectIds, setProjectIds] = useState<string[]>([]);
  const [roleSheet, setRoleSheet] = useState(false);
  const [projectSheet, setProjectSheet] = useState(false);
  const [warn, setWarn] = useState(false);

  useEffect(() => {
    if (!user) return;
    setRole(user.role);
    setProjectIds(user.projectIds);
    setWarn(false);
  }, [user, open]);

  if (!user) return null;

  const meta = roleMeta(role);
  const companyScope = user.isCompanyMember;
  const dirty =
    role !== user.role ||
    projectIds.length !== user.projectIds.length ||
    projectIds.some(id => !user.projectIds.includes(id));

  const save = async () => {
    const projectRole = (meta.scope === "project" ? role : "manager") as ProjectRole;
    if (role !== user.role && meta.scope === "project" && user.projectIds.length) {
      await onSaveRole(user, projectRole);
    }
    if (
      projectIds.length !== user.projectIds.length ||
      projectIds.some(id => !user.projectIds.includes(id))
    ) {
      await onSaveProjectAccess(user, projectIds, projectRole);
    }
    onOpenChange(false);
  };

  return (
    <>
      <MobileSheet
        open={open}
        onOpenChange={onOpenChange}
        title="Kullanıcıyı Düzenle"
        description={`${user.name} için rol, proje erişimi ve durum.`}
        variant="form"
        guardClose={dirty && !warn}
        onGuardedClose={() => setWarn(true)}
        footer={
          <>
            {warn && (
              <p className="text-[12.5px] text-amber-400 mb-2">
                Kaydedilmemiş değişiklikler var. Kapatmak için tekrar deneyin.
              </p>
            )}
            <FormFooter
              onCancel={() => onOpenChange(false)}
              onSubmit={save}
              submitLabel="Kaydet"
              disabled={!dirty || !canManage}
              busy={busy}
            />
          </>
        }
      >
        <div className="flex flex-col gap-3.5 pb-2">
          <TextField label="Ad Soyad" value={user.name} onChange={() => {}} disabled />
          <TextField label="E-posta" value={user.email ?? "—"} onChange={() => {}} disabled />

          {user.isOwner ? (
            <div className="rounded-[13px] border border-border/70 bg-background/40 p-3 flex items-start gap-2.5">
              <Lock className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <p className="text-[12.5px] text-muted-foreground leading-snug">
                Şirket sahibinin rolü ve durumu buradan değiştirilemez. Sahiplik devri ayrı bir
                onaylı işlem gerektirir.
              </p>
            </div>
          ) : (
            <>
              <SelectorField
                label="Rol"
                value={roleMeta(role).label}
                placeholder="Rol seçin"
                onOpen={() => canManage && setRoleSheet(true)}
                hint={roleMeta(role).description}
              />
              <SelectorField
                label="Proje erişimi"
                value={
                  projectIds.length
                    ? `${projectIds.length} projeye erişebilir`
                    : companyScope
                      ? "Tüm şirket projeleri (rol gereği)"
                      : null
                }
                placeholder="Proje seçin"
                onOpen={() => canManage && setProjectSheet(true)}
              />

              {user.memberId && (
                <div className="rounded-[16px] border border-border/70 bg-background/40 p-3.5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[14px] font-medium text-foreground">Erişim durumu</p>
                      <p className={cn("text-[12.5px] mt-0.5", STATUS_META[user.status].text)}>
                        {STATUS_META[user.status].label}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={!canManage || user.isSelf || busy}
                      onClick={() => onToggleStatus(user, user.status !== "suspended")}
                      className={cn(
                        "h-11 px-3.5 rounded-[12px] text-[14px] font-semibold disabled:opacity-45",
                        user.status === "suspended"
                          ? "bg-primary text-primary-foreground"
                          : "border border-border text-foreground active:bg-muted",
                      )}
                    >
                      {user.status === "suspended" ? "Erişimi Yeniden Aç" : "Askıya Al"}
                    </button>
                  </div>
                  {user.isSelf && (
                    <p className="text-[12px] text-muted-foreground mt-2">
                      Kendi erişiminizi askıya alamazsınız.
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </MobileSheet>

      <RoleSelectorSheet open={roleSheet} onOpenChange={setRoleSheet} value={role} onSelect={setRole} />
      <ProjectAccessSheet
        open={projectSheet}
        onOpenChange={setProjectSheet}
        projects={projects}
        value={projectIds}
        companyWide={companyScope}
        onSave={ids => { setProjectIds(ids); setProjectSheet(false); }}
      />
    </>
  );
}

export default EditUserSheet;
