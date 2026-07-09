// Sprint M1.6 — Fleet quick actions FAB. Bottom-right, safe-area aware.
import { useState } from "react";
import { Plus, Fuel, Wrench, Users, ArrowUpRight, Camera } from "lucide-react";

export const FleetFAB = () => {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="fixed z-40 flex flex-col items-end gap-2"
      style={{ right: "1.5rem", bottom: "calc(1.5rem + env(safe-area-inset-bottom))" }}
    >
      {open && (
        <div className="flex flex-col gap-2 mb-1 animate-in fade-in slide-in-from-bottom-2 duration-200">
          {[
            { label: "Yakıt Kaydı", icon: Fuel },
            { label: "Bakım Oluştur", icon: Wrench },
            { label: "Operatör Ata", icon: Users },
            { label: "Ekipman Transferi", icon: ArrowUpRight },
            { label: "Muayene Yükle", icon: Camera },
          ].map(a => (
            <button
              key={a.label}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 pl-3 pr-4 h-11 min-h-[44px] rounded-full bg-card border border-border text-fs-xs text-foreground/85 hover:bg-muted shadow-lg"
            >
              <a.icon className="w-3.5 h-3.5 text-[#FF6B2B]" /> {a.label}
            </button>
          ))}
        </div>
      )}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-12 h-12 rounded-full bg-gradient-to-br from-[#FF6B2B] to-[#FF8A4B] text-white shadow-xl shadow-[#FF6B2B]/25 flex items-center justify-center hover:scale-105 transition"
        aria-label="Hızlı işlem"
      >
        <Plus className={`w-5 h-5 transition ${open ? "rotate-45" : ""}`} />
      </button>
    </div>
  );
};

export default FleetFAB;
