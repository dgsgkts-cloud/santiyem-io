// Sprint M1.4 — Floating Action Button for quick create. Preserves existing no-op behavior.
import { useState } from "react";
import { ClipboardList, Plus, ShoppingCart, Users, X } from "lucide-react";

const actions = [
  { icon: ClipboardList, label: "Yeni Talep", color: "text-[#FF6B2B]" },
  { icon: Users, label: "Yeni Tedarikçi", color: "text-blue-400" },
  { icon: ShoppingCart, label: "Yeni Sipariş", color: "text-emerald-400" },
];

export const ProcurementQuickCreateFAB = () => {
  const [open, setOpen] = useState(false);
  return (
    <div className="fixed bottom-6 right-6 sm:bottom-8 sm:right-8 z-40 flex flex-col items-end gap-2 safe-area-bottom">
      {open &&
        actions.map((a) => (
          <button
            key={a.label}
            className="min-h-[40px] px-3 py-2 rounded-full bg-card border border-border shadow-xl flex items-center gap-2 hover:border-border/60 animate-in fade-in slide-in-from-bottom-2"
          >
            <a.icon className={`w-4 h-4 ${a.color}`} />
            <span className="text-fs-xs text-foreground">{a.label}</span>
          </button>
        ))}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-12 h-12 rounded-full bg-gradient-to-br from-[#FF6B2B] to-[#E55A20] shadow-xl shadow-[#FF6B2B]/30 flex items-center justify-center hover:scale-105 transition-transform"
        aria-label={open ? "Kapat" : "Hızlı oluştur"}
      >
        {open ? (
          <X className="w-5 h-5 text-white" />
        ) : (
          <Plus className="w-5 h-5 text-white" />
        )}
      </button>
    </div>
  );
};

export default ProcurementQuickCreateFAB;
