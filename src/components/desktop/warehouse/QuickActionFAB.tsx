// DEPO — hızlı işlem FAB'ı. Arkasında kayıt katmanı olan işlemler etkin;
// altyapısı Faz 2'de gelecek işlemler devre dışı ve nedeni belirtilir.
import { useState } from "react";
import {
  Plus, X, ArrowDownToLine, ArrowUpFromLine, ArrowLeftRight, Wrench, ClipboardCheck,
} from "lucide-react";
import type { StockActionKind } from "./StockActionDialogs";

export const QuickActionFAB = ({ onAction }: { onAction?: (kind: Exclude<StockActionKind, null>) => void }) => {
  const [open, setOpen] = useState(false);

  const actions: {
    icon: any; label: string; color: string;
    run?: () => void; disabledHint?: string;
  }[] = [
    { icon: ArrowDownToLine, label: "Mal Kabulü", color: "text-emerald-400", run: () => onAction?.("receipt") },
    { icon: ArrowUpFromLine, label: "Malzeme Çıkışı", color: "text-red-400", run: () => onAction?.("issue") },
    { icon: ArrowLeftRight, label: "Transfer", color: "text-blue-400", disabledHint: "Transfer altyapısı henüz tamamlanmadı" },
    { icon: Wrench, label: "Ekipman Zimmetle", color: "text-amber-400", disabledHint: "Zimmet altyapısı henüz tamamlanmadı" },
    { icon: ClipboardCheck, label: "Sayım", color: "text-[#FF6B2B]", disabledHint: "Sayım altyapısı henüz tamamlanmadı" },
  ];

  return (
    <div className="fixed bottom-6 right-4 sm:bottom-8 sm:right-8 z-40 flex flex-col items-end gap-2 safe-area-bottom">
      {open && actions.map(a => (
        <button
          key={a.label}
          onClick={() => { if (a.run) { a.run(); setOpen(false); } }}
          disabled={!a.run}
          title={a.disabledHint}
          aria-label={a.disabledHint ? `${a.label} — ${a.disabledHint}` : a.label}
          className="px-3 min-h-[44px] rounded-full bg-card border border-border shadow-xl flex items-center gap-2 hover:border-foreground/20 transition-colors duration-[220ms] animate-in fade-in slide-in-from-bottom-2 disabled:opacity-45 disabled:cursor-not-allowed"
        >
          <a.icon className={`w-4 h-4 ${a.color}`} />
          <span className="text-fs-xs text-foreground">{a.label}</span>
        </button>
      ))}
      <button
        onClick={() => setOpen(o => !o)}
        aria-label={open ? "Kapat" : "Hızlı işlem menüsü"}
        className="w-12 h-12 min-h-[44px] rounded-full bg-gradient-to-br from-[#FF6B2B] to-[#E55A20] shadow-xl shadow-[#FF6B2B]/30 flex items-center justify-center hover:scale-105 transition-transform duration-[220ms]"
      >
        {open ? <X className="w-5 h-5 text-white" /> : <Plus className="w-5 h-5 text-white" />}
      </button>
    </div>
  );
};

export default QuickActionFAB;
