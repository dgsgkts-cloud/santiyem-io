// Sprint UI-OPT-1 — Dedicated setup experience.
// Moves the full onboarding wizard off the dashboard into its own /setup page.
// Frontend only — reuses FirstRunWizard (inline) and existing setup progress
// store. No backend / schema / business-logic changes.

import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { PageShell } from "@/components/ui/responsive";
import FirstRunWizard from "@/components/desktop/FirstRunWizard";

const SetupPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <PageShell
        title="Şirket Kurulum Sihirbazı"
        subtitle="Şirketinizi hazırlayın ve tüm modülleri kullanmaya başlayın."
        actions={
          <button
            onClick={() => navigate("/dashboard")}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 h-11 min-h-[44px] text-fs-sm text-foreground hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Dashboard'a Dön
          </button>
        }
        maxWidth={960}
      >
        <FirstRunWizard inline />
      </PageShell>
    </div>
  );
};

export default SetupPage;
