import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/* -----------------------------------------------------------------------
 * Shared action contract — mirrors the Construction Brain `actions` block
 * (see supabase/functions/chat/index.ts). This is the single source of
 * truth for every executable AI action in the client.
 * --------------------------------------------------------------------- */

export type AIActionType =
  | "open_project"
  | "open_payment"
  | "open_material"
  | "open_personnel"
  | "open_task"
  | "create_task"
  | "create_purchase_request"
  | "create_meeting"
  | "send_whatsapp"
  | "send_email"
  | "export_pdf"
  | "export_excel"
  | "open_inventory"
  | "open_report";

export type AIActionPriority = "critical" | "high" | "medium" | "low";

export interface AIAction {
  id: string;
  label: string;
  type: AIActionType;
  priority?: AIActionPriority;
  icon?: string;
  description?: string;
  confirmationRequired?: boolean;
  route?: string;
  expectedImpact?: string;
  payload?: Record<string, unknown> & {
    projectId?: string;
    paymentId?: string;
    materialId?: string;
    workerId?: string;
    taskId?: string;
    title?: string;
    subject?: string;
    body?: string;
    phone?: string;
    email?: string;
    dueDate?: string;
    priority?: string;
    tab?: string;
  };
}

export interface ExecutorResult {
  ok: boolean;
  message?: string;
}

type Handler = (action: AIAction) => Promise<ExecutorResult> | ExecutorResult;

/* -----------------------------------------------------------------------
 * Navigation primitive — uses the app-wide `navigate-tab` CustomEvent so
 * the executor stays decoupled from the router.
 * --------------------------------------------------------------------- */
const goToTab = (tab: string) => {
  window.dispatchEvent(new CustomEvent("navigate-tab", { detail: tab }));
};

const openProjectDetail = (projectId?: string) => {
  if (projectId) {
    window.dispatchEvent(
      new CustomEvent("open-project", { detail: { projectId } }),
    );
  }
  goToTab("projects");
};

const comingSoon = (label: string): ExecutorResult => {
  toast.info(`${label} — yakında hazır olacak.`);
  return { ok: true, message: "coming-soon" };
};

/* -----------------------------------------------------------------------
 * Handler registry. New integrations (WhatsApp API, Email, Calendar, ERP,
 * Accounting) plug in here without changing any UI.
 * --------------------------------------------------------------------- */
const HANDLERS: Record<AIActionType, Handler> = {
  open_project: async (a) => {
    openProjectDetail(a.payload?.projectId);
    return { ok: true };
  },
  open_payment: async (a) => {
    goToTab("payments-kasa");
    if (a.payload?.paymentId) {
      window.dispatchEvent(
        new CustomEvent("open-payment", { detail: { paymentId: a.payload.paymentId } }),
      );
    }
    return { ok: true };
  },
  open_material: async (a) => {
    goToTab("materials");
    if (a.payload?.materialId) {
      window.dispatchEvent(
        new CustomEvent("open-material", { detail: { materialId: a.payload.materialId } }),
      );
    }
    return { ok: true };
  },
  open_personnel: async (a) => {
    goToTab("workers");
    if (a.payload?.workerId) {
      window.dispatchEvent(
        new CustomEvent("open-personnel", { detail: { workerId: a.payload.workerId } }),
      );
    }
    return { ok: true };
  },
  open_task: async (a) => {
    goToTab("tasks");
    if (a.payload?.taskId) {
      window.dispatchEvent(
        new CustomEvent("open-task", { detail: { taskId: a.payload.taskId } }),
      );
    }
    return { ok: true };
  },
  open_inventory: async () => {
    goToTab("materials");
    return { ok: true };
  },
  open_report: async () => {
    goToTab("reports");
    return { ok: true };
  },
  create_task: async (a) => {
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes?.user) return { ok: false, message: "Oturum bulunamadı" };
    const { error } = await supabase.from("tasks").insert({
      title: a.payload?.title ?? a.label ?? "Yeni görev",
      created_by: userRes.user.id,
      project_id: (a.payload?.projectId as string) ?? null,
      status: "todo",
      priority: (a.payload?.priority as string) ?? "high",
      due_date: (a.payload?.dueDate as string) ?? null,
    } as never);
    if (error) return { ok: false, message: error.message };
    window.dispatchEvent(new CustomEvent("executive-brief-refresh"));
    return { ok: true, message: "Görev oluşturuldu" };
  },
  create_purchase_request: () => comingSoon("Satın alma talebi"),
  create_meeting: () => comingSoon("Takvim entegrasyonu"),
  send_whatsapp: async (a) => {
    const phone = String(a.payload?.phone ?? "").replace(/\D/g, "");
    if (!phone) return comingSoon("WhatsApp entegrasyonu");
    const text = encodeURIComponent(String(a.payload?.body ?? a.description ?? ""));
    window.open(
      text ? `https://wa.me/${phone}?text=${text}` : `https://wa.me/${phone}`,
      "_blank",
      "noopener",
    );
    return { ok: true };
  },
  send_email: async (a) => {
    const to = String(a.payload?.email ?? "");
    if (!to) return comingSoon("E-posta entegrasyonu");
    const subject = encodeURIComponent(String(a.payload?.subject ?? a.label ?? ""));
    const body = encodeURIComponent(String(a.payload?.body ?? a.description ?? ""));
    window.location.href = `mailto:${to}?subject=${subject}&body=${body}`;
    return { ok: true };
  },
  export_pdf: () => comingSoon("PDF dışa aktarma"),
  export_excel: () => comingSoon("Excel dışa aktarma"),
};

/* -----------------------------------------------------------------------
 * Provider + hook. The provider owns the confirmation dialog so callers
 * only await `execute(action)`.
 * --------------------------------------------------------------------- */
interface PendingConfirm {
  action: AIAction;
  resolve: (confirmed: boolean) => void;
}

interface ExecutorApi {
  execute: (action: AIAction) => Promise<ExecutorResult>;
  isBusy: (id: string) => boolean;
}

const ActionExecutorContext = createContext<ExecutorApi | null>(null);

export function ActionExecutorProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingConfirm | null>(null);
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const busyRef = useRef(busy);
  busyRef.current = busy;

  const askConfirm = useCallback((action: AIAction) => {
    return new Promise<boolean>((resolve) => {
      setPending({ action, resolve });
    });
  }, []);

  const resolvePending = (confirmed: boolean) => {
    setPending((prev) => {
      prev?.resolve(confirmed);
      return null;
    });
  };

  const execute = useCallback<ExecutorApi["execute"]>(
    async (action) => {
      if (action.confirmationRequired) {
        const ok = await askConfirm(action);
        if (!ok) return { ok: false, message: "İptal edildi" };
      }
      const handler = HANDLERS[action.type];
      if (!handler) {
        toast.error(`Desteklenmeyen aksiyon: ${action.type}`);
        return { ok: false, message: "unsupported" };
      }
      setBusy((b) => ({ ...b, [action.id]: true }));
      try {
        const result = await handler(action);
        if (result.ok && result.message !== "coming-soon") {
          toast.success(result.message ?? `✓ ${action.label}`);
        } else if (!result.ok) {
          toast.error(result.message ?? "İşlem başarısız");
        }
        return result;
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Beklenmeyen hata";
        console.error("[useActionExecutor] handler failed", action.type, e);
        toast.error(msg);
        return { ok: false, message: msg };
      } finally {
        setBusy((b) => {
          const next = { ...b };
          delete next[action.id];
          return next;
        });
      }
    },
    [askConfirm],
  );

  const isBusy = useCallback((id: string) => !!busyRef.current[id], []);

  const api = useMemo<ExecutorApi>(() => ({ execute, isBusy }), [execute, isBusy]);

  return (
    <ActionExecutorContext.Provider value={api}>
      {children}
      <AlertDialog open={!!pending} onOpenChange={(o) => !o && resolvePending(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{pending?.action.label ?? "Onay"}</AlertDialogTitle>
            <AlertDialogDescription>
              {pending?.action.description ??
                "Bu aksiyonu gerçekleştirmek istediğinizden emin misiniz?"}
              {pending?.action.expectedImpact && (
                <span className="block mt-2 text-xs text-muted-foreground">
                  Beklenen etki: {pending.action.expectedImpact}
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => resolvePending(false)}>Vazgeç</AlertDialogCancel>
            <AlertDialogAction onClick={() => resolvePending(true)}>Onayla</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ActionExecutorContext.Provider>
  );
}

/**
 * Single execution engine for every AI action. Components must never
 * invoke navigation / Supabase writes / mailto / wa.me directly — always
 * dispatch through `execute(action)` so confirmation, feedback, busy
 * state, and future integrations flow through one place.
 */
export function useActionExecutor(): ExecutorApi {
  const ctx = useContext(ActionExecutorContext);
  if (!ctx) {
    throw new Error("useActionExecutor must be used inside <ActionExecutorProvider>");
  }
  return ctx;
}
