import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MessageSquare, Mail, Smartphone, Bell } from "lucide-react";
import { DEMO_PREVIEW_EVENT, type DemoPreviewPayload } from "@/lib/demoMode";

const CHANNEL_ICON: Record<string, typeof Mail> = {
  email: Mail, whatsapp: MessageSquare, sms: Smartphone, push: Bell,
};

const CHANNEL_LABEL: Record<string, string> = {
  email: "E-posta", whatsapp: "WhatsApp", sms: "SMS", push: "Push Bildirim",
  teams: "Teams", slack: "Slack",
};

/** Demo-mode external message preview — nothing is actually delivered. */
export const DemoMessagePreview = () => {
  const [payload, setPayload] = useState<DemoPreviewPayload | null>(null);

  useEffect(() => {
    const handler = (e: Event) => setPayload((e as CustomEvent<DemoPreviewPayload>).detail);
    window.addEventListener(DEMO_PREVIEW_EVENT, handler);
    return () => window.removeEventListener(DEMO_PREVIEW_EVENT, handler);
  }, []);

  if (!payload) return null;
  const Icon = CHANNEL_ICON[payload.channel] ?? MessageSquare;

  return (
    <Dialog open onOpenChange={() => setPayload(null)}>
      <DialogContent className="max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="text-[15px]">Demo Modu — Mesaj gönderilmedi.</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2">
            <Icon className="h-4 w-4" style={{ color: "#FF6B2B" }} />
            <span className="text-[12px] font-semibold text-foreground">
              {CHANNEL_LABEL[payload.channel] ?? payload.channel}
            </span>
            <span className="ml-auto text-[11px] text-muted-foreground">
              {new Date(payload.timestamp).toLocaleString("tr-TR")}
            </span>
          </div>
          <Row label="Alıcı" value={payload.recipientName ? `${payload.recipientName} — ${payload.recipient}` : payload.recipient} />
          {payload.project && <Row label="Proje" value={payload.project} />}
          {payload.subject && <Row label="Konu" value={payload.subject} />}
          <div>
            <p className="mb-1 text-[11px] font-medium text-muted-foreground">Mesaj</p>
            <div className="max-h-52 overflow-y-auto whitespace-pre-wrap rounded-lg border border-border bg-card px-3 py-2 text-[12px] leading-relaxed text-foreground">
              {payload.body}
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Demo hesabında gerçek WhatsApp / e-posta / SMS gönderimi yapılmaz, kredi harcanmaz.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-start gap-2">
    <span className="w-16 shrink-0 text-[11px] font-medium text-muted-foreground">{label}</span>
    <span className="text-[12px] text-foreground break-all">{value}</span>
  </div>
);

export default DemoMessagePreview;
