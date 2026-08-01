// Dialogs supporting the purchase-request edit flow:
// unsaved changes, delete draft, withdraw from approval, stale (concurrent) edit.
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

export const UnsavedChangesDialog = ({
  open,
  onKeepEditing,
  onDiscard,
}: {
  open: boolean;
  onKeepEditing: () => void;
  onDiscard: () => void;
}) => (
  <Dialog open={open} onOpenChange={(v) => !v && onKeepEditing()}>
    <DialogContent className="sm:max-w-sm">
      <DialogHeader>
        <DialogTitle>Kaydedilmemiş değişiklikleriniz var</DialogTitle>
        <DialogDescription>
          Bu ekrandan çıkarsanız yaptığınız değişiklikler kaybolur.
        </DialogDescription>
      </DialogHeader>
      <DialogFooter className="gap-2">
        <Button variant="outline" onClick={onKeepEditing} className="min-h-[44px]">
          Düzenlemeye Devam Et
        </Button>
        <Button variant="destructive" onClick={onDiscard} className="min-h-[44px]">
          Değişiklikleri Sil
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

export const DeleteDraftDialog = ({
  open,
  loading,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  loading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) => (
  <Dialog open={open} onOpenChange={(v) => !v && !loading && onCancel()}>
    <DialogContent className="sm:max-w-sm">
      <DialogHeader>
        <DialogTitle>Bu taslak talep silinsin mi?</DialogTitle>
        <DialogDescription>Bu işlem geri alınamaz.</DialogDescription>
      </DialogHeader>
      <DialogFooter className="gap-2">
        <Button variant="ghost" onClick={onCancel} disabled={loading} className="min-h-[44px]">
          Vazgeç
        </Button>
        <Button
          variant="destructive"
          onClick={onConfirm}
          disabled={loading}
          aria-busy={loading}
          className="min-h-[44px]"
        >
          {loading && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />} Talebi Sil
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

export const WithdrawApprovalDialog = ({
  open,
  approverName,
  loading,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  approverName?: string | null;
  loading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) => (
  <Dialog open={open} onOpenChange={(v) => !v && !loading && onCancel()}>
    <DialogContent className="sm:max-w-sm">
      <DialogHeader>
        <DialogTitle>Talep onay sürecinden geri çekilsin mi?</DialogTitle>
        <DialogDescription>
          {approverName
            ? `${approverName} için oluşturulan onay isteği iptal edilir, talep taslak durumuna döner ve düzenlenebilir hâle gelir. Onay geçmişi silinmez.`
            : "Talep taslak durumuna döner ve düzenlenebilir hâle gelir. Onay geçmişi silinmez."}
        </DialogDescription>
      </DialogHeader>
      <DialogFooter className="gap-2">
        <Button variant="ghost" onClick={onCancel} disabled={loading} className="min-h-[44px]">
          Vazgeç
        </Button>
        <Button onClick={onConfirm} disabled={loading} aria-busy={loading} className="min-h-[44px]">
          {loading && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />} Onaydan Geri Çek
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

export const StaleRequestDialog = ({
  open,
  onReload,
  onReview,
}: {
  open: boolean;
  onReload: () => void;
  onReview: () => void;
}) => (
  <Dialog open={open} onOpenChange={() => onReview()}>
    <DialogContent className="sm:max-w-sm">
      <DialogHeader>
        <DialogTitle>Bu talep başka bir kullanıcı tarafından güncellendi</DialogTitle>
        <DialogDescription>
          Kaydetmeye devam etmek diğer kullanıcının değişikliklerini geçersiz kılabilir.
        </DialogDescription>
      </DialogHeader>
      <DialogFooter className="gap-2">
        <Button variant="outline" onClick={onReview} className="min-h-[44px]">
          Değişikliklerimi İncele
        </Button>
        <Button onClick={onReload} className="min-h-[44px]">
          Güncel Veriyi Yükle
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);
