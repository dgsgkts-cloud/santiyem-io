import { useState } from "react";
import { Plug, ArrowRight, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  INTEGRATIONS, UPCOMING_INTEGRATIONS, STATUS_LABELS, CATEGORY_LABELS,
  countConnected, countAvailable, type IntegrationDef,
} from "@/lib/integrationsConfig";

const StatusBadge = ({ status }: { status: IntegrationDef["status"] }) => {
  const tone =
    status === "connected"
      ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
      : status === "coming_soon"
        ? "bg-muted text-muted-foreground border-border"
        : "bg-primary/10 text-primary border-primary/20";
  return (
    <span className={`inline-flex items-center h-6 px-2.5 rounded-full border text-[11px] font-semibold ${tone}`}>
      {STATUS_LABELS[status]}
    </span>
  );
};

const SummaryStat = ({ label, value }: { label: string; value: number }) => (
  <div className="flex-1 min-w-[140px] rounded-xl border border-border bg-card px-4 py-3">
    <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</div>
    <div className="mt-1 text-[22px] font-semibold text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
      {value}
    </div>
  </div>
);

const IntegrationCard = ({
  integration, onConnect,
}: { integration: IntegrationDef; onConnect: (i: IntegrationDef) => void }) => {
  const Icon = integration.icon;
  return (
    <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3 transition-colors hover:border-primary/30">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg border border-border bg-muted/40 flex items-center justify-center shrink-0">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-[15px] font-semibold text-foreground truncate">{integration.name}</h3>
            <StatusBadge status={integration.status} />
          </div>
          <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{integration.description}</p>
          <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground/80">
            <span>{CATEGORY_LABELS[integration.category]}</span>
            {integration.provider && (
              <>
                <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
                <span>Altyapı: {integration.provider}</span>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="flex justify-end">
        {integration.isAvailable ? (
          <Button size="sm" className="h-9 text-[13px]" onClick={() => onConnect(integration)}>
            {integration.actionLabel ?? "Bağla"}
            <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
          </Button>
        ) : (
          <Button size="sm" variant="outline" className="h-9 text-[13px]" disabled>
            Yakında
          </Button>
        )}
      </div>
    </div>
  );
};

export default function IntegrationsPage() {
  const [setupFor, setSetupFor] = useState<IntegrationDef | null>(null);

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 md:py-8">
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
            Şantiyem AI'ı kullandığınız servislerle bağlayın ve operasyonlarınızı otomatikleştirin.
          </p>
        </div>
      </header>

      <div className="mt-5 flex flex-wrap gap-3">
        <SummaryStat label="Bağlı entegrasyonlar" value={countConnected()} />
        <SummaryStat label="Kullanılabilir entegrasyonlar" value={countAvailable()} />
      </div>

      <section className="mt-7">
        <h2 className="text-[12px] uppercase tracking-wider font-semibold text-muted-foreground">
          Entegrasyonlar
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {INTEGRATIONS.map((i) => (
            <IntegrationCard key={i.id} integration={i} onConnect={setSetupFor} />
          ))}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-[12px] uppercase tracking-wider font-semibold text-muted-foreground">
          Yakında
        </h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {UPCOMING_INTEGRATIONS.map((u) => {
            const Icon = u.icon;
            return (
              <div
                key={u.id}
                className="flex items-center gap-3 rounded-lg border border-dashed border-border px-3 py-2.5"
              >
                <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-[13.5px] font-medium text-foreground">{u.name}</div>
                  <div className="text-[11.5px] text-muted-foreground truncate">{u.description}</div>
                </div>
                <span className="text-[10.5px] uppercase tracking-wider font-semibold text-muted-foreground shrink-0">
                  Yakında
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <Dialog open={!!setupFor} onOpenChange={(o) => !o && setSetupFor(null)}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="text-[17px]">
              {setupFor?.name} bağlantı kurulumu
            </DialogTitle>
            <DialogDescription className="text-[13px] leading-relaxed">
              {setupFor?.provider
                ? `Bağlantı ${setupFor.provider} altyapısı üzerinden kurulacak.`
                : "Bağlantı kurulumu sonraki adımda tamamlanacak."}
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border border-border bg-muted/30 p-3 flex gap-2.5">
            <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <p className="text-[12.5px] leading-relaxed text-muted-foreground">
              Bu ekran şu an yalnızca kurulum akışının başlangıcıdır. Gerçek bağlantı,
              kimlik doğrulama ve bildirim yönlendirmesi bir sonraki entegrasyon adımında
              devreye alınacak. Henüz aktif bir bağlantı oluşturulmadı.
            </p>
          </div>
          <div className="flex justify-end">
            <Button variant="outline" size="sm" className="h-9" onClick={() => setSetupFor(null)}>
              Kapat
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
