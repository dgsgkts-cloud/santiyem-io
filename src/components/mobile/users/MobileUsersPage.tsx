import { useMemo, useState } from "react";
import {
  ArrowLeft, Ban, Mail, Pencil, RotateCcw, SlidersHorizontal, Trash2, UserPlus, Users, ShieldCheck, FolderOpen, Search, X,
} from "lucide-react";
import { useUser } from "@/contexts/UserContext";
import { useCompanyUsers, type CompanyUser } from "@/hooks/useCompanyUsers";
import { MobileActionRows, type MobileActionRowItem } from "@/components/mobile/sheets/MobileActionRows";
import { MobileSheet } from "@/components/mobile/sheets/MobileSheet";
import { MobileConfirmSheet } from "@/components/mobile/sheets/MobileConfirmSheet";
import { UserListRow } from "./UserListRow";
import { TeamSummary } from "./TeamSummary";
import { UserFilterSheet, type UserFilter } from "./UserFilterSheet";
import { InviteUserSheet } from "./InviteUserSheet";
import { EditUserSheet } from "./EditUserSheet";
import { UserDetailSheet } from "./UserDetailSheet";
import { AdvancedPermissionsSheet } from "./AdvancedPermissionsSheet";
import { ProjectAccessSheet } from "./ProjectAccessSheet";
import type { ProjectRole } from "@/lib/projectPermissions";
import { roleMeta } from "@/lib/companyAccess";

/**
 * SPRINT 41C — mobile Users / roles / permissions experience.
 * Company membership and project-scoped access are both surfaced, because
 * both are actually enforced by row level security.
 */
export function MobileUsersPage({ onBack }: { onBack?: () => void }) {
  const { user } = useUser();
  const {
    loading, busy, users, projects, seats, counts, isOwner,
    inviteUser, resendInvitation, cancelInvitation,
    setSuspended, removeAccess, setProjectAccess, updateProjectRole,
    loadPermissions, setPermission,
  } = useCompanyUsers();

  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<UserFilter>({ status: "all", role: "all" });
  const [filterSheet, setFilterSheet] = useState(false);
  const [inviteSheet, setInviteSheet] = useState(false);
  const [selected, setSelected] = useState<CompanyUser | null>(null);
  const [overflow, setOverflow] = useState(false);
  const [detail, setDetail] = useState(false);
  const [edit, setEdit] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  const [projectSheet, setProjectSheet] = useState(false);
  const [suspendConfirm, setSuspendConfirm] = useState(false);
  const [removeConfirm, setRemoveConfirm] = useState(false);
  const [cancelConfirm, setCancelConfirm] = useState(false);

  const current = selected ? users.find(u => u.key === selected.key) ?? selected : null;

  const filtered = useMemo(() => {
    const s = q.trim().toLocaleLowerCase("tr");
    return users
      .filter(u => {
        if (filter.status !== "all") {
          if (filter.status === "invited" && !(u.status === "invited" || u.status === "expired")) return false;
          if (filter.status !== "invited" && u.status !== filter.status) return false;
        }
        if (filter.role !== "all" && u.role !== filter.role) return false;
        if (!s) return true;
        return (
          u.name.toLocaleLowerCase("tr").includes(s) ||
          (u.email ?? "").toLocaleLowerCase("tr").includes(s)
        );
      })
      .sort((a, b) => Number(b.isOwner) - Number(a.isOwner) || a.name.localeCompare(b.name, "tr"));
  }, [users, q, filter]);

  const activeFilters = (filter.status !== "all" ? 1 : 0) + (filter.role !== "all" ? 1 : 0);
  const openPlan = () => window.dispatchEvent(new CustomEvent("open-subscription"));

  const overflowItems: MobileActionRowItem[] = current
    ? [
        {
          id: "detail",
          label: "Profili Gör",
          description: "Rol, proje erişimi ve yetki özeti",
          icon: <Users className="w-[18px] h-[18px]" />,
          tone: "neutral",
          onSelect: () => { setOverflow(false); setDetail(true); },
        },
        ...(isOwner && current.kind === "member" && !current.isOwner
          ? [{
              id: "edit",
              label: "Düzenle",
              description: "Rol ve proje erişimini değiştir",
              icon: <Pencil className="w-[18px] h-[18px]" />,
              tone: "primary" as const,
              onSelect: () => { setOverflow(false); setEdit(true); },
            }]
          : []),
        ...(isOwner && current.kind === "member" && !current.isOwner
          ? [{
              id: "projects",
              label: "Proje Erişimi",
              description: "Hangi projelere erişeceğini seç",
              icon: <FolderOpen className="w-[18px] h-[18px]" />,
              tone: "info" as const,
              onSelect: () => { setOverflow(false); setProjectSheet(true); },
            }]
          : []),
        {
          id: "permissions",
          label: "Yetkileri Gör",
          description: "Modül bazlı yetki özeti",
          icon: <ShieldCheck className="w-[18px] h-[18px]" />,
          tone: "success",
          onSelect: () => { setOverflow(false); setAdvanced(true); },
        },
        ...(current.kind === "invitation"
          ? [{
              id: "resend",
              label: "Daveti Yeniden Gönder",
              description: "Geçerlilik süresini uzatır ve bağlantıyı kopyalar",
              icon: <RotateCcw className="w-[18px] h-[18px]" />,
              tone: "warning" as const,
              onSelect: () => { setOverflow(false); resendInvitation(current); },
            }]
          : []),
        ...(current.kind === "invitation" && isOwner
          ? [{
              id: "cancel",
              label: "Daveti İptal Et",
              icon: <X className="w-[18px] h-[18px]" />,
              destructive: true,
              onSelect: () => { setOverflow(false); setCancelConfirm(true); },
            }]
          : []),
        ...(isOwner && current.memberId && !current.isOwner && !current.isSelf
          ? [{
              id: "suspend",
              label: current.status === "suspended" ? "Erişimi Yeniden Aç" : "Askıya Al",
              icon: <Ban className="w-[18px] h-[18px]" />,
              tone: "warning" as const,
              destructive: current.status !== "suspended",
              onSelect: () => {
                setOverflow(false);
                if (current.status === "suspended") setSuspended(current, false);
                else setSuspendConfirm(true);
              },
            }]
          : []),
        ...(isOwner && current.kind === "member" && !current.isOwner && !current.isSelf
          ? [{
              id: "remove",
              label: "Erişimi Kaldır",
              icon: <Trash2 className="w-[18px] h-[18px]" />,
              destructive: true,
              onSelect: () => { setOverflow(false); setRemoveConfirm(true); },
            }]
          : []),
      ]
    : [];

  return (
    <div className="flex flex-col gap-5 pb-2">
      {/* 1 · header */}
      <div className="flex items-center gap-2">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label="Geri"
            className="h-11 w-11 -ml-1.5 rounded-[12px] flex items-center justify-center text-foreground active:bg-muted shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <h1 className="flex-1 text-[25px] font-semibold text-foreground leading-tight truncate">
          Kullanıcılar
        </h1>
        {isOwner && (
          <button
            type="button"
            onClick={() => setInviteSheet(true)}
            aria-label="Kullanıcı davet et"
            className="h-11 w-11 rounded-[13px] bg-primary text-primary-foreground flex items-center justify-center active:opacity-90 shrink-0"
          >
            <UserPlus className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* 2 · team summary */}
      <TeamSummary
        seats={seats}
        activeCount={counts.active}
        invitedCount={counts.invited}
        onOpenPlan={openPlan}
      />

      {/* 3 · search + single filter action */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="İsim veya e-posta ara"
            aria-label="Kullanıcı ara"
            className="w-full h-12 pl-9 pr-9 rounded-[13px] bg-card border border-border text-[16px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
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
        <button
          type="button"
          onClick={() => setFilterSheet(true)}
          aria-label="Filtrele"
          className="relative h-12 w-12 rounded-[13px] border border-border bg-card flex items-center justify-center text-foreground active:bg-muted shrink-0"
        >
          <SlidersHorizontal className="w-[18px] h-[18px]" />
          {activeFilters > 0 && (
            <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
              {activeFilters}
            </span>
          )}
        </button>
      </div>

      {/* 4 · list */}
      {loading ? (
        <div className="flex flex-col gap-2">
          {[0, 1, 2].map(i => (
            <div key={i} className="h-[76px] rounded-[16px] border border-border/70 bg-card animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        users.length <= 1 ? (
          <div className="rounded-[16px] border border-border/70 bg-card px-4 py-8 text-center">
            <span className="h-12 w-12 rounded-[16px] bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
              <Users className="w-6 h-6" />
            </span>
            <p className="text-[16px] font-semibold text-foreground">Ekibinizi oluşturun</p>
            <p className="text-[13.5px] text-muted-foreground mt-1.5 leading-snug">
              Projeleri ve görevleri paylaşmak için çalışma arkadaşlarınızı davet edin.
            </p>
            {isOwner && (
              <button
                type="button"
                onClick={() => setInviteSheet(true)}
                className="mt-4 h-12 px-5 rounded-[13px] bg-primary text-primary-foreground text-[15px] font-semibold active:opacity-90"
              >
                Kullanıcı Davet Et
              </button>
            )}
          </div>
        ) : (
          <div className="rounded-[16px] border border-border/70 bg-card px-4 py-8 text-center">
            <p className="text-[15px] font-medium text-foreground">Sonuç bulunamadı</p>
            <p className="text-[13px] text-muted-foreground mt-1">
              Aramayı veya filtreleri değiştirmeyi deneyin.
            </p>
          </div>
        )
      ) : (
        <div className="rounded-[16px] border border-border/70 bg-card overflow-hidden divide-y divide-border/60">
          {filtered.map(u => (
            <UserListRow
              key={u.key}
              user={u}
              onOpen={() => { setSelected(u); setDetail(true); }}
              onOverflow={() => { setSelected(u); setOverflow(true); }}
            />
          ))}
        </div>
      )}

      {/* action menu */}
      <MobileSheet
        open={overflow}
        onOpenChange={setOverflow}
        title={current?.name ?? "Kullanıcı"}
        description={current ? `${roleMeta(current.role).label} · ${current.email ?? ""}` : undefined}
        variant="action"
      >
        <MobileActionRows items={overflowItems} />
      </MobileSheet>

      <UserFilterSheet open={filterSheet} onOpenChange={setFilterSheet} value={filter} onChange={setFilter} />

      <InviteUserSheet
        open={inviteSheet}
        onOpenChange={setInviteSheet}
        projects={projects}
        users={users}
        seats={seats}
        busy={busy}
        onSubmit={inviteUser}
      />

      <UserDetailSheet
        open={detail}
        onOpenChange={setDetail}
        user={current}
        projects={projects}
        canManage={isOwner}
        onEdit={() => { setDetail(false); setEdit(true); }}
        onProjectAccess={() => { setDetail(false); setProjectSheet(true); }}
        onSuspend={() => {
          setDetail(false);
          if (current?.status === "suspended") setSuspended(current, false);
          else setSuspendConfirm(true);
        }}
        onRemove={() => { setDetail(false); setRemoveConfirm(true); }}
        onAdvanced={() => { setDetail(false); setAdvanced(true); }}
        loadPermissions={loadPermissions}
      />

      <EditUserSheet
        open={edit}
        onOpenChange={setEdit}
        user={current}
        projects={projects}
        busy={busy}
        canManage={isOwner}
        onSaveProjectAccess={setProjectAccess}
        onSaveRole={updateProjectRole}
        onToggleStatus={(u, suspend) => (suspend ? setSuspendConfirm(true) : setSuspended(u, false))}
      />

      <ProjectAccessSheet
        open={projectSheet}
        onOpenChange={setProjectSheet}
        projects={projects}
        value={current?.projectIds ?? []}
        companyWide={current?.isCompanyMember}
        busy={busy}
        onSave={async ids => {
          if (!current) return;
          const role = (current.projectRoles[current.projectIds[0] ?? ""] ??
            (current.isCompanyMember ? "manager" : current.role)) as ProjectRole;
          await setProjectAccess(current, ids, role);
          setProjectSheet(false);
        }}
      />

      <AdvancedPermissionsSheet
        open={advanced}
        onOpenChange={setAdvanced}
        user={current}
        projects={projects}
        currentUserId={user?.id ?? null}
        loadPermissions={loadPermissions}
        setPermission={setPermission}
      />

      <MobileConfirmSheet
        open={suspendConfirm}
        onOpenChange={setSuspendConfirm}
        title="Kullanıcıyı askıya al"
        description="Bu kullanıcı geçici olarak sisteme erişemeyecek. Kayıtları silinmeyecek."
        confirmLabel="Askıya Al"
        cancelLabel="İptal"
        tone="danger"
        busy={busy}
        onConfirm={async () => {
          if (current) await setSuspended(current, true);
          setSuspendConfirm(false);
        }}
      />

      <MobileConfirmSheet
        open={removeConfirm}
        onOpenChange={setRemoveConfirm}
        title="Erişimi kaldır"
        description="Bu kullanıcının şirket erişimi kaldırılacak. Geçmiş kayıtları korunacak ancak yeniden giriş yapamayacak."
        confirmLabel="Erişimi Kaldır"
        cancelLabel="İptal"
        tone="danger"
        busy={busy}
        onConfirm={async () => {
          if (current) await removeAccess(current);
          setRemoveConfirm(false);
        }}
      />

      <MobileConfirmSheet
        open={cancelConfirm}
        onOpenChange={setCancelConfirm}
        title="Daveti iptal et"
        description="Davet bağlantısı geçersiz olacak ve bu kişi ekibinize katılamayacak. Yeniden davet edebilirsiniz."
        confirmLabel="Daveti İptal Et"
        cancelLabel="Vazgeç"
        tone="danger"
        busy={busy}
        onConfirm={async () => {
          if (current) await cancelInvitation(current);
          setCancelConfirm(false);
        }}
      />

      {!isOwner && !loading && (
        <p className="flex items-start gap-2 text-[12.5px] text-muted-foreground leading-snug">
          <Mail className="w-4 h-4 shrink-0 mt-px" />
          Kullanıcı davet etme ve rol değiştirme yetkisi şirket sahibine aittir.
        </p>
      )}
    </div>
  );
}

export default MobileUsersPage;
