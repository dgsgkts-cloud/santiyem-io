// Reason-capturing dialog for delivery discrepancies and returns.
import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  open: boolean;
  kind: "discrepancy" | "return";
  deliveryNo: string;
  onCancel: () => void;
  onConfirm: (note: string) => Promise<void> | void;
}

export const DeliveryNoteDialog = ({
  open,
  kind,
  deliveryNo,
  onCancel,
  onConfirm,
}: Props) => {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setNote("");
      setBusy(false);
    }
  }, [open]);

  const isReturn = kind === "return";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !busy && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isReturn ? "İade Süreci Başlat" : "Uyuşmazlık Bildir"}
          </DialogTitle>
          <DialogDescription>
            {deliveryNo ? `${deliveryNo} · ` : ""}
            {isReturn
              ? "İade nedenini yazın. Sevkiyat “İade Sürecinde” olarak işaretlenecek."
              : "Eksik, hasarlı veya farklı gelen kalemleri açıklayın. İlgililere bildirim gönderilir."}
          </DialogDescription>
        </DialogHeader>
        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={4}
          placeholder={
            isReturn
              ? "Örn: 20 torba çimento nem almış, tedarikçiye iade edilecek."
              : "Örn: 100 adet sipariş edildi, 92 adet geldi; 3 adet hasarlı."
          }
          className="text-fs-sm"
        />
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onCancel} disabled={busy}>
            Vazgeç
          </Button>
          <Button
            disabled={busy || note.trim().length < 5}
            onClick={async () => {
              setBusy(true);
              try {
                await onConfirm(note.trim());
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy
              ? "Kaydediliyor…"
              : isReturn
              ? "İade Sürecini Başlat"
              : "Uyuşmazlığı Kaydet"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DeliveryNoteDialog;
