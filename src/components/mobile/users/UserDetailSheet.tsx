import { useEffect, useState } from "react";
import { MobileSheet } from "@/components/mobile/sheets/MobileSheet";
import {
  companyPermissionGroups, formatDate, initials, projectPermissionGroups,
  roleMeta, STATUS_META, type PermissionGroup,
} from "@/lib/companyAccess";
import type { PermissionKey, ProjectRole } from "@/lib/projectPermissions";
import type { AccessProject, CompanyUser } from "@/hooks/useCompanyUsers";
import { ChevronRight, Check, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

/** SPRINT 41C — user detail with progressive disclosure. */
export function UserDetailSheet({
  open, onOpenChange, user, projects, canManage,
  onEdit, onProjectAccess, onSuspend, onRemove, onAdvanced, loadPermissions,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  user: CompanyUser | null;
  projects: AccessProject[];
  canManage: boolean;
  onEdit: () => void;
  onProjectAccess: () => void;
  onSuspend: () => void;
  onRemove: () => void;
  onAdvanced: () => void;
  loadPermissions: (userId: string, projectId: string) => Promise<Partial<Record<PermissionKey, boolean>>>;
}) {
  const [groups, setGroups] = useState<PermissionGroup[]>([]);

  useEffect(() => {
    if (!open || !user) return;
    if (user.isCompanyMember) {
      setGroups(companyPermissionGroups(user.isOwner));
      return;
    }
    const first = user.projectIds[0];
    const role = (user.projectRoles[first ?? ""] ?? user.role) as ProjectRole;
    if (!user.userId || !first) {
      setGroups(projectPermissionGroups(role));
      return;
    }
    loadPermissions(user.userId, first).then(ov => setGroups(projectPermissionGroups(role, ov)));
  }, [open, user, loadPermissions]);

  if (!user) return null;
  const meta = roleMeta(user.role);
  const status = STATUS_META[user.status];
  const scopedProjects = projects.filter(p => user.projectIds.includes(p.id));

  const Row = ({ label, onClick, tone }: { label: string; onClick: () => void; tone?: "danger" }) => (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3.5 min-h-[52px] text-left active:bg-muted/60"
    >
      <span className={cn("flex-1 text-[15px]", tone === "danger" ? "text-rose-400" : "text-foreground")}>
        {label}
      </span>
      <ChevronRight className="w-4 h-4 text-muted-foreground/60" />
    </button>
  );

  return (
    <MobileSheet
      open={open}
      onOpenChange={onOpenChange}
      title={user.name}
      description={user.email ?? "Kullanıcı detayı"}
      variant="detail"
    >
      <div className="flex flex-col gap-4 pb-2">
        <div className="flex items-center gap-3">
          <span
            className="h-14 w-14 rounded-full flex items-center justify-center text-[16px] font-bold shrink-0"
            style={{ backgroundColor: `${meta.color}1F`, color: meta.color }}
          >
            {initials(user.name, user.email)}
          </span>
          <div className="min-w-0">
            <p className="text-[13px] text-muted-foreground truncate">{user.email ?? "E-posta yok"}</p>
            <div className="flex items-center gap-2 mt-1">
              <span
                className="text-[12px] font-medium rounded-[6px] px-1.5 py-px"
                style={{ backgroundColor: `${meta.color}14`, color: meta.color }}
              >
                {meta.label}
              </span>
              <span className="flex items-center gap-1">
                <span className={cn("h-1.5 w-1.5 rounded-full", status.dot)} />
                <span className={cn("text-[12px]", status.text)}>{status.label}</span>
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-[16px] border border-border/70 bg-background/40 p-3.5">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
            Proje Erişimi
          </p>
          {user.isCompanyMember ? (
            <p className="text-[13.5px] text-foreground/90">
              Şirketin tüm projelerine erişebilir{scopedProjects.length ? ` · ${scopedProjects.length} projede görevli` : ""}.
            </p>
          ) : scopedProjects.length ? (
            <p className="text-[13.5px] text-foreground/90">
              {scopedProjects.length} projeye erişebilir: {scopedProjects.map(p => p.name).join(", ")}
            </p>
          ) : (
            <p className="text-[13.5px] text-muted-foreground">Henüz proje atanmadı.</p>
          )}
        </div>

        <div>
          <p className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
            Yetki Özeti
          </p>
          <div className="rounded-[16px] border border-border/70 divide-y divide-border/60">
            {groups.map(g => (
              <div key={g.module} className="px-3.5 py-3">
                <p className="text-[13.5px] font-medium text-foreground mb-1.5">{g.module}</p>
                <div className="flex flex-col gap-1">
                  {g.lines.map(l => (
                    <span key={l.label} className="flex items-center gap-2 text-[13px]">
                      {l.allowed
                        ? <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        : <Minus className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
                      <span className={l.allowed ? "text-foreground/90" : "text-muted-foreground"}>
                        {l.label}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[16px] border border-border/70 bg-background/40 px-3.5 py-3">
          <p className="text-[12.5px] text-muted-foreground">
            {user.kind === "invitation"
              ? `Davet ${formatDate(user.invitedAt)} tarihinde gönderildi · Geçerlilik ${formatDate(user.expiresAt)}`
              : user.joinedAt
                ? `Ekibe katıldı: ${formatDate(user.joinedAt)}`
                : "Proje bazlı erişim"}
          </p>
          <p className="text-[12.5px] text-muted-foreground mt-1">
            Bildirim tercihleri kullanıcının kendi hesap ayarlarından yönetilir.
          </p>
        </div>

        {canManage && (
          <div className="rounded-[16px] border border-border/70 overflow-hidden divide-y divide-border/60">
            {!user.isOwner && <Row label="Düzenle" onClick={onEdit} />}
            {!user.isOwner && <Row label="Proje Erişimi" onClick={onProjectAccess} />}
            <Row label="Ayrıntılı Yetkiler" onClick={onAdvanced} />
            {!user.isOwner && !user.isSelf && user.memberId && (
              <Row
                label={user.status === "suspended" ? "Erişimi Yeniden Aç" : "Askıya Al"}
                onClick={onSuspend}
              />
            )}
            {!user.isOwner && !user.isSelf && (
              <Row label="Erişimi Kaldır" onClick={onRemove} tone="danger" />
            )}
          </div>
        )}
      </div>
    </MobileSheet>
  );
}

export default UserDetailSheet;
