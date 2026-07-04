import { useState } from "react";
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
import { executeAction, type ActionDef, type ExecuteContext } from "@/lib/actionRegistry";
import { toast } from "sonner";

export type ExecutiveCardType =
  | "payment"
  | "material"
  | "personnel"
  | "project"
  | "risk";

export interface ExecutiveActionsContext extends ExecuteContext {
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
  confirm?: boolean;
  build: (ctx: ExecutiveActionsContext) => ActionDef;
}

const PLACEHOLDER = (id: string, label: string, msg: string, icon: LucideIcon, variant?: ButtonSpec["variant"]): ButtonSpec => ({
  id,
  label,
  icon,
  variant,
  build: () => ({
    id,
    label,
    kind: "custom",
    variant,
    payload: { run: () => toast.info(msg) },
  }),
});

const openTab = (
  id: string,
  label: string,
  tab: string,
  icon: LucideIcon,
  variant?: ButtonSpec["variant"],
): ButtonSpec => ({
  id,
  label,
  icon,
  variant,
  build: () => ({ id, label, kind: "open-tab", variant, payload: { tab } }),
});

const CARD_ACTIONS: Record<ExecutiveCardType, ButtonSpec[]> = {
  payment: [
    {
      id: "pay-view",
      label: "Detay",
      icon: Eye,
      variant: "primary",
      build: (ctx) => ({
        id: "pay-view",
        label: "Detay",
        kind: ctx.projectId ? "open-project" : "open-tab",
        variant: "primary",
        payload: { tab: "payments-kasa", projectId: ctx.projectId },
      }),
    },
    {
      id: "pay-task",
      label: "Görev Oluştur",
      icon: ListPlus,
      build: (ctx) => ({
        id: "pay-task",
        label: "Görev Oluştur",
        kind: "create-task",
        payload: {
          title: ctx.subject ? `Ödeme takibi: ${ctx.subject}` : "Ödeme takibi",
          projectId: ctx.projectId,
          priority: "high",
        },
      }),
    },
    {
      id: "pay-remind",
      label: "Hatırlatma Gönder",
      icon: Bell,
      build: (ctx) => ({
        id: "pay-remind",
        label: "Hatırlatma Gönder",
        kind: ctx.contact?.phone ? "whatsapp" : "custom",
        payload: ctx.contact?.phone
          ? {
              phone: ctx.contact.phone,
              text: `Merhaba, ${ctx.subject ?? "ödeme"} hakkında hatırlatmak isterim.`,
            }
          : { run: () => toast.info("Hatırlatma modülü yakında hazır") },
      }),
    },
    openTab("pay-open", "Ödemeyi Aç", "payments-kasa", Wallet),
  ],
  material: [
    openTab("mat-view", "Stoğu Gör", "materials", Package, "primary"),
    {
      id: "mat-purchase",
      label: "Satın Alma Talebi",
      icon: ShoppingCart,
      build: (ctx) => ({
        id: "mat-purchase",
        label: "Satın Alma Talebi",
        kind: "create-task",
        payload: {
          title: ctx.subject ? `Satın alma: ${ctx.subject}` : "Satın alma talebi",
          projectId: ctx.projectId,
          priority: "high",
        },
      }),
    },
    PLACEHOLDER(
      "mat-notify",
      "Satın Almaya Bildir",
      "Satın alma bildirim akışı yakında hazır",
      Send,
    ),
  ],
  personnel: [
    openTab("per-view", "Personeli Gör", "workers", Users, "primary"),
    {
      id: "per-assign",
      label: "İşçi Ata",
      icon: UserPlus,
      build: (ctx) => ({
        id: "per-assign",
        label: "İşçi Ata",
        kind: "create-task",
        payload: {
          title: ctx.subject ? `Ekip ataması: ${ctx.subject}` : "Ekip ataması",
          projectId: ctx.projectId,
          priority: "medium",
        },
      }),
    },
    PLACEHOLDER(
      "per-meeting",
      "Toplantı Oluştur",
      "Takvim entegrasyonu yakında hazır",
      CalendarPlus,
    ),
  ],
  project: [
    {
      id: "prj-open",
      label: "Projeyi Aç",
      icon: FolderOpen,
      variant: "primary",
      build: (ctx) => ({
        id: "prj-open",
        label: "Projeyi Aç",
        kind: ctx.projectId ? "open-project" : "open-tab",
        variant: "primary",
        payload: { tab: "projects", projectId: ctx.projectId },
      }),
    },
    openTab("prj-timeline", "Zaman Çizelgesi", "tasks", GanttChartSquare),
    {
      id: "prj-task",
      label: "Görev Ata",
      icon: ListPlus,
      build: (ctx) => ({
        id: "prj-task",
        label: "Görev Ata",
        kind: "create-task",
        payload: {
          title: ctx.subject ? `İş: ${ctx.subject}` : "Yeni proje görevi",
          projectId: ctx.projectId,
          priority: "medium",
        },
      }),
    },
  ],
  risk: [
    openTab("risk-inv", "İncele", "reports", Search, "primary"),
    {
      id: "risk-task",
      label: "Görev Oluştur",
      icon: ListPlus,
      build: (ctx) => ({
        id: "risk-task",
        label: "Görev Oluştur",
        kind: "create-task",
        payload: {
          title: ctx.subject ? `Risk: ${ctx.subject}` : "Risk aksiyonu",
          projectId: ctx.projectId,
          priority: "high",
        },
      }),
    },
    {
      id: "risk-resolve",
      label: "Çözüldü İşaretle",
      icon: CheckCircle2,
      variant: "danger",
      confirm: true,
      build: () => ({
        id: "risk-resolve",
        label: "Çözüldü İşaretle",
        kind: "custom",
        variant: "danger",
        confirm: true,
        payload: {
          run: () => {
            toast.success("Risk çözüldü olarak işaretlendi");
            window.dispatchEvent(new CustomEvent("executive-brief-refresh"));
          },
        },
      }),
    },
  ],
};

interface ExecutiveActionsProps {
  type: ExecutiveCardType;
  ctx: ExecutiveActionsContext;
  /** Optional extra actions appended after the presets. */
  extra?: ButtonSpec[];
  className?: string;
}

/**
 * Reusable inline action bar for executive cards. The button set is
 * driven entirely by `type`, so future WhatsApp/Email/Calendar/ERP
 * integrations can be plugged in via the actionRegistry without touching
 * this component's UI contract.
 */
export function ExecutiveActions({ type, ctx, extra, className }: ExecutiveActionsProps) {
  const specs = [...CARD_ACTIONS[type], ...(extra ?? [])];
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const run = async (spec: ButtonSpec) => {
    const action = spec.build(ctx);
    if ((spec.confirm || action.confirm) && confirmingId !== spec.id) {
      setConfirmingId(spec.id);
      return;
    }
    setConfirmingId(null);
    setBusyId(spec.id);
    await executeAction(action, ctx);
    setBusyId(null);
  };

  return (
    <div className={`flex flex-wrap gap-1.5 ${className ?? ""}`}>
      {specs.map((spec) => {
        const Icon = spec.icon;
        const confirming = confirmingId === spec.id;
        const busy = busyId === spec.id;
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
            onClick={() => run(spec)}
            disabled={busy}
            className={`${base} ${style}`}
            title={spec.label}
          >
            <Icon className="w-3.5 h-3.5" />
            {busy ? "…" : confirming ? "Onayla" : spec.label}
          </button>
        );
      })}
      {confirmingId && (
        <button
          type="button"
          onClick={() => setConfirmingId(null)}
          className="text-[12px] px-2.5 py-1.5 rounded-md text-muted-foreground hover:text-foreground"
        >
          Vazgeç
        </button>
      )}
    </div>
  );
}

export default ExecutiveActions;
