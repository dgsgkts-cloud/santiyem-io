// "Onaya Gönder" — explicit approver selection dialog.
// Nothing is submitted until a valid approver is resolved (spec §1–§4).
import { useEffect, useMemo, useState } from "react";
import { Check, Loader2, Search, ShieldAlert, UserCheck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { daysFromNow, fmtTRY, type Request } from "./procurementConstants";
import {
  NO_APPROVER_MESSAGE,
  submitButtonCopy,
  type ApproverCandidate,
} from "./approvalPolicy";
import type { ApproverResolution } from "./useRequestApprovers";

const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex items-start justify-between gap-3 py-1.5 border-b border-border/60 last:border-0">
    <span className="text-fs-xs uppercase tracking-wide text-muted-foreground">{label}</span>
    <span className="text-fs-sm text-foreground text-right min-w-0">{value}</span>
  </div>
);

export interface SubmitPayload {
  approver: ApproverCandidate | null;
  dueDate?: string;
  note?: string;
}

export const SubmitForApprovalDialog = ({
  request,
  resolution,
  loading,
  onCancel,
  onConfirm,
  onManagePermissions,
}: {
  request: Request | null;
  resolution: ApproverResolution;
  loading: boolean;
  onCancel: () => void;
  onConfirm: (payload: SubmitPayload) => void;
  onManagePermissions: () => void;
}) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [due, setDue] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!request) return;
    setQuery("");
    setNote("");
    const d = new Date();
    d.setDate(d.getDate() + 3);
    setDue(d.toISOString().slice(0, 10));
  }, [request?.id]);

  // Auto-select when there is exactly one valid approver (still displayed).
  useEffect(() => {
    setSelectedId(resolution.auto?.userId ?? null);
  }, [resolution.auto?.userId, request?.id]);

  const selected = useMemo(
    () => resolution.candidates.find((c) => c.userId === selectedId) ?? null,
    [resolution.candidates, selectedId]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("tr-TR");
    if (!q) return resolution.candidates;
    return resolution.candidates.filter(
      (c) =>
        c.name.toLocaleLowerCase("tr-TR").includes(q) ||
        c.roleLabel.toLocaleLowerCase("tr-TR").includes(q) ||
        c.scopeLabel.toLocaleLowerCase("tr-TR").includes(q)
    );
  }, [resolution.candidates, query]);

  const noApprover = !resolution.loading && resolution.candidates.length === 0;
  const valid = !!selected;

  return (
    <Dialog open={!!request} onOpenChange={(v) => !v && !loading && onCancel()}>
      <DialogContent className="sm:max-w-md max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Talebi onaya gönder</DialogTitle>
          <DialogDescription>
            {noApprover
              ? "Onay akışı başlatılamıyor."
              : "Talep, aşağıda görünen onaylayıcıya iletilecek ve durumu “onay bekliyor” olarak güncellenecek."}
          </DialogDescription>
        </DialogHeader>

        {resolution.loading && (
          <div className="flex items-center gap-2 py-6 text-fs-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> Onaylayıcılar yükleniyor…
          </div>
        )}

        {noApprover && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 flex gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-fs-sm text-foreground">
              {NO_APPROVER_MESSAGE}
              <div className="text-fs-xs text-muted-foreground mt-1">
                Onay yetkisi olan aktif bir kullanıcı tanımlayın veya mevcut yetkileri
                güncelleyin.
              </div>
            </div>
          </div>
        )}

        {!resolution.loading && !noApprover && request && (
          <div className="space-y-4">
            <div className="rounded-xl border border-[#FF6B2B]/30 bg-[#FF6B2B]/5 p-3">
              <div className="flex items-center gap-2 text-fs-xs uppercase tracking-wide text-muted-foreground">
                <UserCheck className="w-3.5 h-3.5" /> Onaylayacak kişi
              </div>
              <div className="text-fs-base font-semibold text-foreground mt-1">
                {selected ? selected.name : "Seçim yapılmadı"}
              </div>
              <div className="text-fs-xs text-muted-foreground mt-0.5">
                Rol: {selected ? selected.roleLabel : "—"}
                {selected ? ` · ${selected.scopeLabel}` : ""}
                {selected?.isSelf ? " · kendi talebinizi onaylayabilirsiniz" : ""}
              </div>
              {resolution.auto && !resolution.canChange && (
                <div className="text-fs-xs text-muted-foreground mt-1">
                  Tek geçerli onaylayıcı olduğu için otomatik seçildi.
                </div>
              )}
            </div>

            {resolution.canChange && (
              <div className="space-y-1.5">
                <Label htmlFor="approver-search">Onaylayıcı seçin *</Label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="approver-search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="İsim veya rol ara"
                    className="pl-9"
                  />
                </div>
                <div
                  role="listbox"
                  aria-label="Onaylayıcı adayları"
                  className="max-h-52 overflow-y-auto rounded-xl border border-border divide-y divide-border/60"
                >
                  {filtered.map((c) => {
                    const on = c.userId === selectedId;
                    return (
                      <button
                        key={c.userId}
                        type="button"
                        role="option"
                        aria-selected={on}
                        onClick={() => setSelectedId(c.userId)}
                        className={cn(
                          "w-full text-left px-3 min-h-[48px] py-2 flex items-center justify-between gap-2 transition-colors",
                          on ? "bg-[#FF6B2B]/10" : "hover:bg-muted/50"
                        )}
                      >
                        <span className="min-w-0">
                          <span className="block text-fs-sm text-foreground truncate">
                            {c.name}
                            {c.isSelf && " (siz)"}
                          </span>
                          <span className="block text-fs-xs text-muted-foreground truncate">
                            {c.roleLabel} · {c.scopeLabel}
                          </span>
                        </span>
                        {on && <Check className="w-4 h-4 text-[#FF6B2B] shrink-0" />}
                      </button>
                    );
                  })}
                  {filtered.length === 0 && (
                    <div className="p-3 text-fs-xs text-muted-foreground">
                      Aramanıza uygun onaylayıcı yok.
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-0">
              <Row label="Talep No" value={<span className="font-mono">{request.no}</span>} />
              <Row label="Proje" value={request.project} />
              <Row label="Talep Eden" value={request.requester} />
              <Row label="Tutar / Bütçe" value={fmtTRY(request.budget)} />
              <Row label="İhtiyaç Tarihi" value={daysFromNow(request.needBy)} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="approval-due">Son onay tarihi</Label>
                <Input
                  id="approval-due"
                  type="date"
                  value={due}
                  onChange={(e) => setDue(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="approval-note">Not (opsiyonel)</Label>
                <Textarea
                  id="approval-note"
                  rows={2}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Onaylayıcıya iletilecek açıklama"
                />
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          {noApprover ? (
            <>
              <Button variant="ghost" onClick={onCancel}>
                Kapat
              </Button>
              <Button onClick={onManagePermissions}>Yetkileri Düzenle</Button>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={onCancel} disabled={loading}>
                Vazgeç
              </Button>
              <Button
                onClick={() =>
                  onConfirm({ approver: selected, dueDate: due, note: note.trim() || undefined })
                }
                disabled={loading || !valid}
                aria-busy={loading}
              >
                {loading && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
                {submitButtonCopy(selected?.name, selected?.roleLabel)}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
