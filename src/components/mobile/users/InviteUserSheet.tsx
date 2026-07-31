import { useEffect, useMemo, useState } from "react";
import { MobileSheet } from "@/components/mobile/sheets/MobileSheet";
import { FormFooter, SelectorField, TextAreaField, TextField } from "@/components/mobile/materials/fieldKit";
import { RoleSelectorSheet } from "./RoleSelectorSheet";
import { ProjectAccessSheet } from "./ProjectAccessSheet";
import { isValidEmail, roleMeta, type AccessRoleId } from "@/lib/companyAccess";
import type { AccessProject, CompanyUser, SeatInfo } from "@/hooks/useCompanyUsers";

/** SPRINT 41C — focused invite form sheet (one column, labels above fields). */
export function InviteUserSheet({
  open, onOpenChange, projects, users, seats, busy, onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  projects: AccessProject[];
  users: CompanyUser[];
  seats: SeatInfo;
  busy: boolean;
  onSubmit: (p: { fullName: string; email: string; role: AccessRoleId; projectIds: string[]; message?: string }) => Promise<boolean>;
}) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AccessRoleId>("site_engineer");
  const [projectIds, setProjectIds] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [roleSheet, setRoleSheet] = useState(false);
  const [projectSheet, setProjectSheet] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);

  const meta = roleMeta(role);
  const dirty = !!fullName || !!email || projectIds.length > 0 || !!message;

  useEffect(() => {
    if (open) return;
    setFullName(""); setEmail(""); setRole("site_engineer");
    setProjectIds([]); setMessage(""); setEmailError(null); setConfirmClose(false);
  }, [open]);

  const duplicate = useMemo(
    () => users.some(u => (u.email ?? "").toLowerCase() === email.trim().toLowerCase() && !!email.trim()),
    [users, email],
  );

  const seatBlocked = meta.scope === "company" && seats.full;
  const valid =
    fullName.trim().length > 1 &&
    isValidEmail(email) &&
    !duplicate &&
    !seatBlocked &&
    (!meta.requiresProjects || projectIds.length > 0);

  const submit = async () => {
    if (!isValidEmail(email)) { setEmailError("Geçerli bir e-posta adresi girin."); return; }
    if (duplicate) { setEmailError("Bu kişi ekibinizde veya davet listesinde zaten var."); return; }
    setEmailError(null);
    const ok = await onSubmit({ fullName: fullName.trim(), email: email.trim(), role, projectIds, message: message.trim() || undefined });
    if (ok) onOpenChange(false);
  };

  const projectSummary = projectIds.length
    ? `${projectIds.length} proje seçildi`
    : meta.scope === "company"
      ? "Tüm şirket projeleri (rol gereği)"
      : null;

  return (
    <>
      <MobileSheet
        open={open}
        onOpenChange={onOpenChange}
        title="Kullanıcı Davet Et"
        description="Davet edilen kişi bu e-posta ile kayıt olduğunda erişimi otomatik açılır."
        variant="form"
        guardClose={dirty && !confirmClose}
        onGuardedClose={() => setConfirmClose(true)}
        footer={
          <>
            {confirmClose && (
              <p className="text-[12.5px] text-amber-400 mb-2">
                Kaydedilmemiş bilgiler var. Kapatmak için tekrar deneyin.
              </p>
            )}
            <FormFooter
              onCancel={() => onOpenChange(false)}
              onSubmit={submit}
              submitLabel="Daveti Gönder"
              disabled={!valid}
              busy={busy}
            />
          </>
        }
      >
        <div className="flex flex-col gap-3.5 pb-2">
          <TextField label="Ad Soyad" value={fullName} onChange={setFullName} placeholder="Örn. Ahmet Yılmaz" required />
          <TextField
            label="E-posta"
            value={email}
            onChange={v => { setEmail(v); setEmailError(null); }}
            placeholder="ornek@sirket.com"
            type="email"
            required
            error={emailError ?? (duplicate ? "Bu kişi ekibinizde veya davet listesinde zaten var." : null)}
          />
          <SelectorField
            label="Rol"
            value={meta.label}
            placeholder="Rol seçin"
            onOpen={() => setRoleSheet(true)}
            required
            hint={meta.description}
          />
          <SelectorField
            label="Proje erişimi"
            value={projectSummary}
            placeholder="Proje seçin"
            onOpen={() => setProjectSheet(true)}
            required={meta.requiresProjects}
            error={meta.requiresProjects && projectIds.length === 0 ? "Bu rol için en az bir proje seçin." : null}
          />
          <TextAreaField
            label="Kişisel mesaj (opsiyonel)"
            value={message}
            onChange={setMessage}
            placeholder="Davet e-postasına eklenecek kısa not"
          />
          {seatBlocked && (
            <p className="text-[12.5px] text-primary leading-snug">
              Mevcut paketiniz {seats.limit} kullanıcı destekliyor. Şirket geneli rol vermek için paketinizi
              yükseltin ya da proje bazlı bir rol seçin.
            </p>
          )}
        </div>
      </MobileSheet>

      <RoleSelectorSheet
        open={roleSheet}
        onOpenChange={setRoleSheet}
        value={role}
        onSelect={id => {
          setRole(id);
          if (!roleMeta(id).requiresProjects) setProjectIds([]);
        }}
      />

      <ProjectAccessSheet
        open={projectSheet}
        onOpenChange={setProjectSheet}
        projects={projects}
        value={projectIds}
        companyWide={meta.scope === "company"}
        onSave={ids => { setProjectIds(ids); setProjectSheet(false); }}
      />
    </>
  );
}

export default InviteUserSheet;
