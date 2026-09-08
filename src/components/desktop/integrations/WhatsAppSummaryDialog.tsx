import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import WhatsAppSummaryPanel from "./WhatsAppSummaryPanel";

/** WhatsApp Yönetici Özeti ayarları — hem entegrasyonlar hem portföy ekranından açılır. */
export default function WhatsAppSummaryDialog({
  open, onOpenChange,
}: { open: boolean; onOpenChange: (v: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[17px]">WhatsApp Yönetici Özeti</DialogTitle>
          <DialogDescription className="text-[13px] leading-relaxed">
            Uygulamayı açmadan, belirlediğiniz saatte kâr durumunuzu ve en önemli 3 konuyu WhatsApp'tan alın.
          </DialogDescription>
        </DialogHeader>
        <WhatsAppSummaryPanel />
      </DialogContent>
    </Dialog>
  );
}
