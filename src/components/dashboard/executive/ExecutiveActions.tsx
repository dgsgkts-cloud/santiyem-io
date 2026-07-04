import {
  Eye,
  ListPlus,
  Bell,
  Wallet,
  Package,
  ShoppingCart,
  Send,
  Users,
  UserPlus,
  CalendarPlus,
  FolderOpen,
  GanttChartSquare,
  Search,
  CheckCircle2,
  type LucideIcon,
} from "lucide-react";
import {
  useActionExecutor,
  type AIAction,
  type AIActionPriority,
  type AIActionType,
} from "@/hooks/useActionExecutor";

export type ExecutiveCardType =
  | "payment"
  | "material"
  | "personnel"
  | "project"
  | "risk";

export interface ExecutiveActionsContext {
  /** Optional project scope for the card. */
  projectId?: string;
  /** Optional label/title used for created tasks & messages. */
  subject?: string;
  /** Optional counterparty phone / email for future WA-Email-ERP hooks. */
  contact?: { phone?: string; email?: string };
}

interface ButtonSpec {
  id: string;
  label: string;
  icon: LucideIcon;
  variant?: "primary" | "default" | "danger";
  build: (ctx: ExecutiveActionsContext) => AIAction;
}

const mk = (
  id: string,
  label: string,
  type: AIActionType,
  priority: AIActionPriority,
  icon: LucideIcon,
  opts: {
    variant?: ButtonSpec["variant"];
    confirmationRequired?: boolean;
    description?: string;
    route?: string;
    expectedImpact?: string;
    payload?: (ctx: ExecutiveActionsContext) => Record<string, unknown>;
  } = {},
): ButtonSpec => ({
  id,
  label,
  icon,
  variant: opts.variant,
  build: (ctx) => ({
    id: `${id}-${ctx.projectId ?? "root"}`,
    label,
    type,
    priority,
    icon: icon.displayName?.toLowerCase(),
    description: opts.description,
    confirmationRequired: opts.confirmationRequired,
    route: opts.route,
    expectedImpact: opts.expectedImpact,
    payload: {
      ...(opts.payload?.(ctx) ?? {}),
      projectId: ctx.projectId,
      subject: ctx.subject,
    },
  }),
});

const CARD_ACTIONS: Record<ExecutiveCardType, ButtonSpec[]> = {
  payment: [
    mk("pay-view", "Detay", "open_payment", "critical", Eye, {
      variant: "primary",
      route: "/odemeler-kasa",
      description: "Bekleyen ödeme detayına git",
      expectedImpact: "Tedarikçi gecikmesini önler",
      payload: (c) => ({ paymentId: (c as any).paymentId }),
    }),
    mk("pay-task", "Görev Oluştur", "create_task", "high", ListPlus, {
      confirmationRequired: true,
      description: "Ödeme takibi görevi oluştur",
      expectedImpact: "Ödeme takibi netleşir",
      payload: (c) => ({
        title: c.subject ? `Ödeme takibi: ${c.subject}` : "Ödeme takibi",
        priority: "high",
      }),
    }),
    mk("pay-remind", "Hatırlatma Gönder", "send_whatsapp", "high", Bell, {
      confirmationRequired: true,
      description: "İlgili taşerona WhatsApp hatırlatması gönder",
      expectedImpact: "Tahsilat/ödeme hızlanır",
      payload: (c) => ({
        phone: c.contact?.phone,
        body: `Merhaba, ${c.subject ?? "ödeme"} hakkında hatırlatmak isterim.`,
      }),
    }),
    mk("pay-open", "Ödemeyi Aç", "open_payment", "medium", Wallet, {
      route: "/odemeler-kasa",
      description: "Ödemeler & Kasa ekranını aç",
      expectedImpact: "Genel ödeme durumunu görürsün",
    }),
  ],
  material: [
    mk("mat-view", "Stoğu Gör", "open_inventory", "high", Package, {
      variant: "primary",
      route: "/malzemeler",
      description: "Malzeme envanterine git",
      expectedImpact: "Stok durumunu değerlendirirsin",
    }),
    mk("mat-purchase", "Satın Alma Talebi", "create_purchase_request", "critical", ShoppingCart, {
      confirmationRequired: true,
      description: "Satın alma talebi başlat",
      expectedImpact: "Malzeme sıkışmasını azaltır",
      payload: (c) => ({
        title: c.subject ? `Satın alma: ${c.subject}` : "Satın alma talebi",
      }),
    }),
    mk("mat-notify", "Satın Almaya Bildir", "send_email", "medium", Send, {
      confirmationRequired: true,
      description: "Satın alma sorumlusuna bilgi e-postası gönder",
      expectedImpact: "Tedarik sürecini hızlandırır",
      payload: (c) => ({
        email: c.contact?.email,
        subject: c.subject ? `Kritik stok: ${c.subject}` : "Kritik stok bildirimi",
      }),
    }),
  ],
  personnel: [
    mk("per-view", "Personeli Gör", "open_personnel", "high", Users, {
      variant: "primary",
      route: "/personel",
      description: "Personel listesine git",
    }),
    mk("per-assign", "İşçi Ata", "create_task", "medium", UserPlus, {
      confirmationRequired: true,
      description: "Ekip ataması için görev oluştur",
      expectedImpact: "Sahaya kaynak yönlendirir",
      payload: (c) => ({
        title: c.subject ? `Ekip ataması: ${c.subject}` : "Ekip ataması",
        priority: "medium",
      }),
    }),
    mk("per-meeting", "Toplantı Oluştur", "create_meeting", "medium", CalendarPlus, {
      confirmationRequired: true,
      description: "Takvim üzerinde toplantı planla",
      expectedImpact: "Ekip koordinasyonu artar",
    }),
  ],
  project: [
    mk("prj-open", "Projeyi Aç", "open_project", "high", FolderOpen, {
      variant: "primary",
      route: "/projeler",
      description: "Proje detayına git",
      expectedImpact: "Proje ilerlemesini görürsün",
    }),
    mk("prj-timeline", "Zaman Çizelgesi", "open_task", "medium", GanttChartSquare, {
      description: "Görev/zaman çizelgesini aç",
    }),
    mk("prj-task", "Görev Ata", "create_task", "medium", ListPlus, {
      confirmationRequired: true,
      description: "Proje için yeni görev oluştur",
      expectedImpact: "İlerlemeyi hızlandırır",
      payload: (c) => ({
        title: c.subject ? `İş: ${c.subject}` : "Yeni proje görevi",
        priority: "medium",
      }),
    }),
  ],
  risk: [
    mk("risk-inv", "İncele", "open_report", "high", Search, {
      variant: "primary",
      route: "/dashboard",
      description: "Rapor ekranında ilgili riski incele",
    }),
    mk("risk-task", "Görev Oluştur", "create_task", "critical", ListPlus, {
      confirmationRequired: true,
      description: "Risk için aksiyon görevi oluştur",
      expectedImpact: "Risk mitigasyonu başlar",
      payload: (c) => ({
        title: c.subject ? `Risk: ${c.subject}` : "Risk aksiyonu",
        priority: "high",
      }),
    }),
    mk("risk-resolve", "Çözüldü İşaretle", "open_report", "low", CheckCircle2, {
      variant: "danger",
      confirmationRequired: true,
      description: "Riski çözüldü olarak işaretle",
      expectedImpact: "Risk listesinden düşer",
    }),
  ],
};

interface ExecutiveActionsProps {
  type: ExecutiveCardType;
  ctx: ExecutiveActionsContext;
  extra?: ButtonSpec[];
  className?: string;
}

/**
 * Reusable inline action bar. Buttons are declarative; execution
 * flows through the single `useActionExecutor()` engine so future
 * WhatsApp/Email/Calendar/ERP integrations plug in without any
 * change to this component.
 */
export function ExecutiveActions({ type, ctx, extra, className }: ExecutiveActionsProps) {
  const specs = [...CARD_ACTIONS[type], ...(extra ?? [])];
  const { execute, isBusy } = useActionExecutor();

  return (
    <div className={`flex flex-wrap gap-1.5 ${className ?? ""}`}>
      {specs.map((spec) => {
        const Icon = spec.icon;
        const action = spec.build(ctx);
        const busy = isBusy(action.id);
        const primary = spec.variant === "primary";
        const danger = spec.variant === "danger";
        const base =
          "inline-flex items-center gap-1.5 text-[12px] px-2.5 py-1.5 rounded-md border transition-colors disabled:opacity-60";
        const style = primary
          ? "border-primary/40 bg-primary/10 text-primary hover:bg-primary/15"
          : danger
          ? "border-destructive/40 text-destructive hover:bg-destructive/10"
          : "border-border text-foreground/80 hover:bg-muted hover:border-border/80";
        return (
          <button
            key={spec.id}
            type="button"
            onClick={() => execute(action)}
            disabled={busy}
            className={`${base} ${style}`}
            title={spec.label}
          >
            <Icon className="w-3.5 h-3.5" />
            {busy ? "…" : spec.label}
          </button>
        );
      })}
    </div>
  );
}

export default ExecutiveActions;
