// Sprint 37 — Actionable Responses.
// Turns an AI answer into elegant next-step actions based on what it talked about.

import { useMemo } from "react";
import {
  FolderOpen,
  Receipt,
  Package,
  Wallet,
  NotebookPen,
  BellPlus,
  Users,
  ArrowUpRight,
} from "lucide-react";

const goTab = (tab: string) =>
  window.dispatchEvent(new CustomEvent("navigate-tab", { detail: tab }));

interface FollowUpAction {
  id: string;
  label: string;
  icon: typeof FolderOpen;
  run: () => void;
}

const RULES: { id: string; keywords: string[]; label: string; icon: typeof FolderOpen; tab: string }[] = [
  { id: "projects", keywords: ["proje", "şantiye", "ilerleme", "takvim"], label: "Projeyi Aç", icon: FolderOpen, tab: "projects" },
  { id: "hakedis", keywords: ["hakediş", "hakedis", "metraj", "imalat bedeli"], label: "Hakediş Oluştur", icon: Receipt, tab: "hakedis" },
  { id: "materials", keywords: ["malzeme", "stok", "sipariş", "depo"], label: "Malzeme Stoğunu Aç", icon: Package, tab: "materials" },
  { id: "payments", keywords: ["ödeme", "tahsilat", "nakit", "kasa", "çek", "vade", "fatura"], label: "Geciken Ödemeler", icon: Wallet, tab: "payments-kasa" },
  { id: "diary", keywords: ["günlük", "puantaj", "saha", "hava"], label: "Şantiye Günlüğü", icon: NotebookPen, tab: "site-diary" },
  { id: "personnel", keywords: ["personel", "işçi", "ekip", "taşeron"], label: "Personeli Aç", icon: Users, tab: "personnel" },
];

export function deriveResponseActions(content: string): FollowUpAction[] {
  const text = content.toLocaleLowerCase("tr-TR");
  const matched = RULES.filter((r) => r.keywords.some((k) => text.includes(k)))
    .slice(0, 3)
    .map((r) => ({ id: r.id, label: r.label, icon: r.icon, run: () => goTab(r.tab) }));

  matched.push({
    id: "reminder",
    label: "Hatırlatma Oluştur",
    icon: BellPlus,
    run: () => window.dispatchEvent(new CustomEvent("open-reminders")),
  });

  return matched;
}

const AIResponseActions = ({ content }: { content: string }) => {
  const actions = useMemo(() => deriveResponseActions(content), [content]);
  if (actions.length <= 1) return null;

  return (
    <div className="mt-2 flex flex-wrap gap-2 pl-11 animate-fade-in">
      {actions.map((a) => (
        <button
          key={a.id}
          onClick={a.run}
          className="group inline-flex items-center gap-1.5 rounded-control border border-border/70 bg-card/60 px-3 py-1.5 text-[12px] font-medium text-foreground/90 transition-all hover:border-primary/40 hover:bg-primary/10 hover:text-primary active:scale-[0.98]"
        >
          <a.icon className="h-3.5 w-3.5" />
          {a.label}
          <ArrowUpRight className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
        </button>
      ))}
    </div>
  );
};

export default AIResponseActions;
