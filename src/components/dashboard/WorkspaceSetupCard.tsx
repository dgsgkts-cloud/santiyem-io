// Sprint UI-OPT-1 — Compact dashboard summary card.
// The detailed onboarding experience lives at /setup. This card only surfaces
// a title, short description, completion count and primary CTA — no step
// grids, progress details, ETAs or status pills on the dashboard.

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Rocket } from "lucide-react";
import {
  loadSetupProgress, completionPercent, TOTAL_SETUP_STEPS, isSetupComplete,
  type SetupProgress,
} from "@/lib/setupProgress";

export const WorkspaceSetupCard = () => {
  const navigate = useNavigate();
  const [progress, setProgress] = useState<SetupProgress>(() => loadSetupProgress());

  useEffect(() => {
    const h = () => setProgress(loadSetupProgress());
    window.addEventListener("setup-progress-changed", h);
    window.addEventListener("storage", h);
    return () => {
      window.removeEventListener("setup-progress-changed", h);
      window.removeEventListener("storage", h);
    };
  }, []);

  // Hide entirely once the user has finished the onboarding.
  if (isSetupComplete()) return null;

  const completedCount = progress.completed.length;
  const pct = completionPercent(progress);

  const goToSetup = () => navigate("/setup");

  return (
    <section
      className="relative rounded-2xl border border-border bg-card p-4 sm:p-5 overflow-hidden"
      aria-label="Şirket Kurulum Sihirbazı"
    >
      {/* subtle ember accent */}
      <div className="absolute -top-16 -right-16 w-40 h-40 rounded-full bg-[#FF6B2B]/10 blur-3xl pointer-events-none" />

      <div className="relative flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="hidden sm:flex w-11 h-11 rounded-xl bg-[#FF6B2B]/15 border border-[#FF6B2B]/30 items-center justify-center shrink-0">
          <Rocket className="w-5 h-5 text-[#FF6B2B]" />
        </div>

        <div className="min-w-0 flex-1">
          <h2
            className="text-fs-md font-semibold text-foreground tracking-tight"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Şirket Kurulum Sihirbazı
          </h2>
          <p className="text-fs-sm text-muted-foreground mt-0.5 line-clamp-2">
            Şirketinizi hazırlayın ve tüm modülleri kullanmaya başlayın.
          </p>
          <div className="mt-2 text-fs-xs text-muted-foreground">
            <span className="text-foreground font-medium tabular-nums">
              {completedCount} / {TOTAL_SETUP_STEPS}
            </span>{" "}
            adım tamamlandı
          </div>

          {/* thin progress bar — permitted on all breakpoints, kept minimal */}
          <div className="mt-2 h-1 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${pct}%`,
                background: "linear-gradient(90deg, #FF6B2B, #FF8A55)",
              }}
            />
          </div>
        </div>

        <button
          onClick={goToSetup}
          className="w-full sm:w-auto shrink-0 inline-flex items-center justify-center gap-2 rounded-xl px-4 h-11 min-h-[44px] text-fs-sm font-semibold text-white transition-transform hover:scale-[1.02] active:scale-[0.99]"
          style={{
            background: "linear-gradient(135deg, #FF6B2B, #E55A20)",
            boxShadow: "0 10px 24px -12px rgba(255,107,43,0.55)",
          }}
        >
          Kuruluma Devam Et <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </section>
  );
};

export default WorkspaceSetupCard;
