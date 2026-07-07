import { useEffect, useState } from "react";
import { CheckCircle2, Circle, ArrowRight, Rocket } from "lucide-react";
import {
  loadSetupProgress, completionPercent, TOTAL_SETUP_STEPS, isSetupComplete,
} from "@/lib/setupProgress";

const STEP_LABELS: Record<number, string> = {
  1: "Firma",
  2: "İlk Proje",
  3: "Personel",
  4: "Tedarikçi",
  5: "Belgeler",
  6: "Finansal Hesaplar",
  7: "E-posta",
  8: "WhatsApp Business",
  9: "AI Ayarları",
};

export const WorkspaceSetupCard = () => {
  const [progress, setProgress] = useState(() => loadSetupProgress());

  useEffect(() => {
    const h = () => setProgress(loadSetupProgress());
    window.addEventListener("setup-progress-changed", h);
    window.addEventListener("storage", h);
    return () => {
      window.removeEventListener("setup-progress-changed", h);
      window.removeEventListener("storage", h);
    };
  }, []);

  if (isSetupComplete()) return null;

  const pct = completionPercent(progress);
  const stepIds = Array.from({ length: TOTAL_SETUP_STEPS }, (_, i) => i + 1);

  const continueSetup = () => {
    // Route to Settings then open the Workspace Setup tab.
    window.dispatchEvent(new CustomEvent("navigate-tab", { detail: "settings" }));
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent("open-workspace-setup"));
    }, 50);
  };

  return (
    <section className="rounded-xl bg-card/60 border border-border/60 p-4 lg:p-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Rocket className="w-4 h-4 text-[#FF6B2B]" />
            <h3 className="text-[14px] font-semibold text-foreground">Workspace Setup</h3>
          </div>
          <p className="text-[12px] text-muted-foreground">
            {pct}% tamamlandı · Kaldığınız yerden devam edin
          </p>
        </div>
        <button
          onClick={continueSetup}
          className="px-3 py-2 rounded-lg text-[12.5px] font-semibold text-white flex items-center gap-1"
          style={{ backgroundColor: "#FF6B2B" }}
        >
          Continue Setup <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="h-1.5 rounded-full bg-muted overflow-hidden mt-3">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: "#FF6B2B" }}
        />
      </div>

      <ul className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-x-4 gap-y-2">
        {stepIds.map((id) => {
          const done = progress.completed.includes(id);
          return (
            <li key={id} className="flex items-center gap-1.5 text-[12px] min-w-0">
              {done ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              ) : (
                <Circle className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
              )}
              <span className={done ? "text-foreground truncate" : "text-muted-foreground truncate"}>
                {STEP_LABELS[id]}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
};

export default WorkspaceSetupCard;
