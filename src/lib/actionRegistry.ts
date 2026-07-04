import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type ActionPriority = "immediate" | "today" | "this-week" | "optional";
export type ActionKind =
  | "open-tab"
  | "open-project"
  | "create-task"
  | "whatsapp"
  | "email"
  | "phone"
  | "export-pdf"
  | "export-excel"
  | "custom";

export interface ActionDef {
  id: string;
  label: string;
  kind: ActionKind;
  variant?: "primary" | "default" | "danger";
  /** If true, button asks for inline confirmation before firing. */
  confirm?: boolean;
  /** Payload consumed by the registry executor. */
  payload?: Record<string, unknown>;
}

export interface ExecuteContext {
  onTabChange: (tab: string) => void;
  onProjectSelect?: (projectId: string) => void;
}

/**
 * Reusable execution registry. Handlers are wired to the minimum viable
 * behavior today (open tab, mailto:, wa.me, insert task). PDF/Excel/Calendar
 * hooks stay as clearly-labelled placeholders so the UI never changes when we
 * plug real integrations in later.
 */
export async function executeAction(action: ActionDef, ctx: ExecuteContext): Promise<void> {
  try {
    switch (action.kind) {
      case "open-tab": {
        const tab = (action.payload?.tab as string) || "dashboard";
        ctx.onTabChange(tab);
        return;
      }
      case "open-project": {
        const pid = action.payload?.projectId as string | undefined;
        if (pid && ctx.onProjectSelect) ctx.onProjectSelect(pid);
        else ctx.onTabChange("projects");
        return;
      }
      case "create-task": {
        const title = (action.payload?.title as string) || "Yeni Görev";
        const due = (action.payload?.dueDate as string) || null;
        const projectId = action.payload?.projectId as string | undefined;
        const { data: userRes } = await supabase.auth.getUser();
        if (!userRes?.user) {
          toast.error("Oturum bulunamadı");
          return;
        }
        const { error } = await supabase.from("tasks").insert({
          title,
          created_by: userRes.user.id,
          project_id: projectId ?? null,
          status: "todo",
          priority: (action.payload?.priority as string) || "high",
          due_date: due,
        } as never);
        if (error) {
          toast.error("Görev oluşturulamadı");
          return;
        }
        toast.success("Görev oluşturuldu");
        window.dispatchEvent(new CustomEvent("executive-brief-refresh"));
        return;
      }
      case "whatsapp": {
        const phone = String(action.payload?.phone || "").replace(/\D/g, "");
        const text = encodeURIComponent(String(action.payload?.text || ""));
        const base = phone ? `https://wa.me/${phone}` : "https://wa.me/";
        window.open(text ? `${base}?text=${text}` : base, "_blank", "noopener");
        return;
      }
      case "email": {
        const to = String(action.payload?.to || "");
        const subject = encodeURIComponent(String(action.payload?.subject || ""));
        const body = encodeURIComponent(String(action.payload?.body || ""));
        window.location.href = `mailto:${to}?subject=${subject}&body=${body}`;
        return;
      }
      case "phone": {
        const phone = String(action.payload?.phone || "");
        window.location.href = `tel:${phone}`;
        return;
      }
      case "export-pdf":
        toast.info("PDF dışa aktarma yakında hazır.");
        return;
      case "export-excel":
        toast.info("Excel dışa aktarma yakında hazır.");
        return;
      case "custom": {
        const fn = action.payload?.run as (() => void | Promise<void>) | undefined;
        if (typeof fn === "function") await fn();
        return;
      }
    }
  } catch (e) {
    console.error("[actionRegistry] execute failed", e);
    toast.error("İşlem başarısız");
  }
}
