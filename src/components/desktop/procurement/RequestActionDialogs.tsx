// Purchase-request action dialogs: approve confirmation, reject (reason required),
// RFQ preparation. All copy is Turkish; dialogs trap focus via shadcn Dialog and
// Escape closes without executing.
import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { daysFromNow, fmtTRY, type Request, type Supplier } from "./procurementConstants";
import { StatusPill } from "./procurementUi";

const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex items-start justify-between gap-3 py-1.5 border-b border-border/60 last:border-0">
    <span className="text-fs-xs uppercase tracking-wide text-muted-foreground">{label}</span>
    <span className="text-fs-sm text-foreground text-right">{value}</span>
  </div>
);

const REJECT_REASONS = [
  "Bütçe uygun değil",
  "Teknik şartname eksik",
  "İhtiyaç tarihi gerçekçi değil",
  "Alternatif tedarik mevcut",
  "Diğer",
];

export const ApproveRequestDialog = ({
  request,
  loading,
  onCancel,
  onConfirm,
}: {
  request: Request | null;
  loading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) => (
  <Dialog open={!!request} onOpenChange={(v) => !v && !loading && onCancel()}>
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Satın alma talebi onaylansın mı?</DialogTitle>
        <DialogDescription>
          Onay sonrası talep tedarik sürecine geçer ve onay kaydı tutulur.
        </DialogDescription>
      </DialogHeader>
      {request && (
        <div className="space-y-0">
          <Row label="Talep No" value={<span className="font-mono">{request.no}</span>} />
          <Row label="Malzeme / Kategori" value={request.category} />
          <Row label="Proje" value={request.project} />
          <Row
            label="Talep Edilen Miktar"
            value={
              request.items?.length
                ? request.items.map((i) => `${i.qty} ${i.unit}`).join(" · ")
                : "—"
            }
          />
          <Row label="Bütçe" value={fmtTRY(request.budget)} />
          <Row label="Talep Eden" value={request.requester} />
          <Row label="Mevcut Durum" value={<StatusPill status={request.status} />} />
        </div>
      )}
      <DialogFooter className="gap-2">
        <Button variant="ghost" onClick={onCancel} disabled={loading}>
          Vazgeç
        </Button>
        <Button onClick={onConfirm} disabled={loading} aria-busy={loading}>
          {loading && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />} Onayla
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

export const RejectRequestDialog = ({
  request,
  loading,
  onCancel,
  onConfirm,
}: {
  request: Request | null;
  loading: boolean;
  onCancel: () => void;
  onConfirm: (reason: string, note?: string) => void;
}) => {
  const [reason, setReason] = useState("");
  const [custom, setCustom] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (request) {
      setReason("");
      setCustom("");
      setNote("");
    }
  }, [request?.id]);

  const finalReason = reason === "Diğer" ? custom : reason;
  const valid = !!finalReason.trim();

  return (
    <Dialog open={!!request} onOpenChange={(v) => !v && !loading && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Talebi reddet</DialogTitle>
          <DialogDescription>
            {request?.no} numaralı talep reddedilecek. Talep silinmez, red nedeni kayda geçer.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="reject-reason">Red nedeni *</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger id="reject-reason" aria-required>
                <SelectValue placeholder="Neden seçin" />
              </SelectTrigger>
              <SelectContent>
                {REJECT_REASONS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {reason === "Diğer" && (
              <Input
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                placeholder="Red nedenini yazın"
                aria-label="Red nedeni açıklaması"
              />
            )}
            {!valid && (
              <p className="text-fs-xs text-muted-foreground">Red nedeni zorunludur.</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="reject-note">Not (opsiyonel)</Label>
            <Textarea
              id="reject-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Talep sahibine iletilecek ek açıklama"
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={onCancel} disabled={loading}>
            Vazgeç
          </Button>
          <Button
            variant="destructive"
            onClick={() => onConfirm(finalReason.trim(), note)}
            disabled={loading || !valid}
            aria-busy={loading}
          >
            {loading && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />} Talebi Reddet
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export const RfqPrepareDialog = ({
  request,
  suppliers,
  loading,
  onCancel,
  onConfirm,
}: {
  request: Request | null;
  suppliers: Supplier[];
  loading: boolean;
  onCancel: () => void;
  onConfirm: (payload: { suppliers: string[]; deadline: string; notes?: string }) => void;
}) => {
  const [selected, setSelected] = useState<string[]>([]);
  const [deadline, setDeadline] = useState("");
  const [notes, setNotes] = useState("");

  const candidates = useMemo(
    () =>
      suppliers.filter((s) => !request || s.category === request.category).length > 0
        ? suppliers.filter((s) => !request || s.category === request.category)
        : suppliers,
    [suppliers, request?.category]
  );

  useEffect(() => {
    if (request) {
      setSelected([]);
      setNotes("");
      const d = new Date();
      d.setDate(d.getDate() + 7);
      setDeadline(d.toISOString().slice(0, 10));
    }
  }, [request?.id]);

  const items = request?.items ?? [];
  const valid = items.length > 0 && selected.length > 0 && !!deadline;

  return (
    <Dialog open={!!request} onOpenChange={(v) => !v && !loading && onCancel()}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Teklif talebi (RFQ) hazırla</DialogTitle>
          <DialogDescription>
            {request?.no} · {request?.project} — tedarikçilere gönderim ayrı ve onaylı bir adımdır.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <div className="text-fs-xs uppercase text-muted-foreground mb-1.5">Kalemler</div>
            <div className="rounded-lg border border-border divide-y divide-border/60">
              {items.length === 0 && (
                <div className="p-3 text-fs-sm text-muted-foreground">
                  Bu talepte geçerli kalem yok, RFQ oluşturulamaz.
                </div>
              )}
              {items.map((it) => (
                <div key={it.name} className="p-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-fs-sm text-foreground">{it.name}</div>
                    {it.spec && (
                      <div className="text-fs-xs text-muted-foreground">{it.spec}</div>
                    )}
                  </div>
                  <div className="text-fs-sm text-foreground whitespace-nowrap">
                    {it.qty} {it.unit}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Row label="Teslim Yeri" value={request?.deliveryLocation ?? "—"} />
            <Row
              label="İstenen Teslim"
              value={request ? daysFromNow(request.needBy) : "—"}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Tedarikçiler *</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {candidates.map((s) => {
                const on = selected.includes(s.name);
                return (
                  <button
                    key={s.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() =>
                      setSelected((p) =>
                        on ? p.filter((n) => n !== s.name) : [...p, s.name]
                      )
                    }
                    className={cn(
                      "min-h-[44px] px-3 rounded-xl border text-fs-sm text-left transition-colors",
                      on
                        ? "border-[#FF6B2B]/50 bg-[#FF6B2B]/10 text-foreground"
                        : "border-border bg-muted/30 text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {s.name}
                    <span className="ml-1 text-fs-xs text-muted-foreground">({s.score})</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="rfq-deadline">Teklif son tarihi *</Label>
            <Input
              id="rfq-deadline"
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="rfq-notes">Notlar (opsiyonel)</Label>
            <Textarea
              id="rfq-notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Teknik açıklama, ödeme koşulu vb."
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={onCancel} disabled={loading}>
            Vazgeç
          </Button>
          <Button
            onClick={() => onConfirm({ suppliers: selected, deadline, notes })}
            disabled={loading || !valid}
            aria-busy={loading}
          >
            {loading && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />} RFQ Oluştur
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export const PlanUnavailableDialog = ({
  open,
  onClose,
  onReviewPlan,
}: {
  open: boolean;
  onClose: () => void;
  onReviewPlan: () => void;
}) => (
  <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
    <DialogContent className="sm:max-w-sm">
      <DialogHeader>
        <DialogTitle>Bu özellik mevcut paketinizde kullanılamıyor.</DialogTitle>
        <DialogDescription>
          Satın alma iş akışını kullanmak için planınızı yükseltebilirsiniz.
        </DialogDescription>
      </DialogHeader>
      <DialogFooter className="gap-2">
        <Button variant="ghost" onClick={onClose}>
          Kapat
        </Button>
        <Button onClick={onReviewPlan}>Planı İncele</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);
