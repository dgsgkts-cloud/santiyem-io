import { useState } from "react";
import { Plug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { INTEGRATIONS, STATUS_LABELS, type IntegrationDef } from "@/lib/integrationsConfig";
import { useWhatsAppConnection } from "@/hooks/useWhatsAppConnection";
import WhatsAppSummaryDialog from "./integrations/WhatsAppSummaryDialog";

export default function IntegrationsPage() {
  const [whatsappOpen, setWhatsappOpen] = useState(false);
  const { connection } = useWhatsAppConnection();
  const whatsappConnected = connection?.status === "connected";

  const isConnected = (i: IntegrationDef) => (i.id === "whatsapp" ? whatsappConnected : false);
  const open = (i: IntegrationDef) => {
    if (i.id === "whatsapp") setWhatsappOpen(true);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 py-6 md:py-8">
      <header className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Plug className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1
            className="text-[22px] md:text-[26px] font-semibold text-foreground tracking-tight"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Entegrasyonlar
          </h1>
          <p className="mt-1 text-[13.5px] leading-relaxed text-muted-foreground max-w-xl">
            Şantiyem AI'ı kullandığınız kanallara bağlayın.
          </p>
        </div>
      </header>

      <div className="mt-6 space-y-2.5">
        {INTEGRATIONS.map((i) => {
          const Icon = i.icon;
          const connected = isConnected(i);
          return (
            <div
              key={i.id}
              className="flex items-center gap-3 rounded-xl border border-border bg-card p-3.5"
            >
              <div className="w-10 h-10 rounded-lg border border-border bg-muted/40 flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-[15px] font-semibold text-foreground truncate">{i.name}</h2>
                  <span
                    className="inline-flex items-center gap-1.5 text-[12px] font-semibold"
                    style={{ color: connected ? "#22C55E" : "hsl(var(--muted-foreground))" }}
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ background: connected ? "#22C55E" : "hsl(var(--muted-foreground) / 0.5)" }}
                    />
                    {STATUS_LABELS[connected ? "connected" : "not_connected"]}
                  </span>
                </div>
                <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted-foreground">
                  {i.description}
                </p>
              </div>
              <Button
                size="sm"
                variant={connected ? "outline" : "default"}
                className="h-10 min-h-[40px] text-[13px] shrink-0"
                onClick={() => open(i)}
              >
                {connected ? (i.manageLabel ?? "Yönet") : (i.actionLabel ?? "Bağla")}
              </Button>
            </div>
          );
        })}
      </div>

      <WhatsAppSummaryDialog open={whatsappOpen} onOpenChange={setWhatsappOpen} />
    </div>
  );
}
