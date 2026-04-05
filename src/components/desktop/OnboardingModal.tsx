import { useState } from "react";
import { X } from "lucide-react";
import { useProjects } from "@/hooks/useProjects";
import { toast } from "sonner";

interface OnboardingModalProps {
  open: boolean;
  onClose: () => void;
}

const ONBOARDING_KEY = "santiyem_onboarding_done";

export const shouldShowOnboarding = (createdAt?: string): boolean => {
  if (localStorage.getItem(ONBOARDING_KEY)) return false;
  if (!createdAt) return false;
  const created = new Date(createdAt);
  const now = new Date();
  const diffHours = (now.getTime() - created.getTime()) / (1000 * 60 * 60);
  return diffHours < 48;
};

export const markOnboardingDone = () => {
  localStorage.setItem(ONBOARDING_KEY, "true");
};

const OnboardingModal = ({ open, onClose }: OnboardingModalProps) => {
  const [step, setStep] = useState(1);
  const [companyName, setCompanyName] = useState("");
  const [phone, setPhone] = useState("");
  const [projectName, setProjectName] = useState("");
  const [clientName, setClientName] = useState("");
  const { addProject } = useProjects();

  if (!open) return null;

  const handleClose = () => {
    markOnboardingDone();
    onClose();
  };

  const handleCreateProject = async () => {
    if (projectName.trim() && clientName.trim()) {
      await addProject({
        name: projectName.trim(),
        client: clientName.trim(),
        location: "",
        manager: "",
        site_responsible: "",
        description: "",
        budget: "",
        start_date: "",
        end_date: "",
      });
      toast.success("✅ Proje başarıyla oluşturuldu!");
    }
    handleClose();
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={handleClose} />
      <div className="relative w-full max-w-md rounded-2xl p-6 bg-card border border-border">
        <button onClick={handleClose} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
          <X className="w-4 h-4" />
        </button>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {[1, 2, 3].map(s => (
            <div key={s} className="w-2 h-2 rounded-full transition-all" style={{ backgroundColor: s === step ? "#FF6B2B" : s < step ? "#22C55E" : "hsl(var(--muted))" }} />
          ))}
        </div>

        {step === 1 && (
          <div className="text-center space-y-4">
            <div className="text-5xl">🎉</div>
            <h2 className="text-xl font-bold text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Şantiyem'e Hoş Geldiniz!
            </h2>
            <p className="text-sm text-muted-foreground">
              Şantiyenizi yönetmek artık çok kolay. Başlamak için 3 kısa adım var.
            </p>
            <button
              onClick={() => setStep(2)}
              className="w-full py-3 rounded-xl text-sm font-semibold text-white"
              style={{ backgroundColor: "#FF6B2B" }}
            >
              Başlayalım →
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-foreground text-center" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Firma bilgilerinizi girin
            </h2>
            <p className="text-sm text-muted-foreground text-center">
              PDF çıktılarınızda firma adınız ve logonuz görünsün.
            </p>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Firma Adı</label>
                <input
                  value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                  placeholder="örn: ABC Yapı A.Ş."
                  className="w-full px-3 py-3 rounded-lg text-sm bg-background border border-border text-foreground placeholder:text-muted-foreground outline-none focus:border-[#FF6B2B]"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Telefon</label>
                <input
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="örn: 0532 123 45 67"
                  className="w-full px-3 py-3 rounded-lg text-sm bg-background border border-border text-foreground placeholder:text-muted-foreground outline-none focus:border-[#FF6B2B]"
                />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setStep(3)}
                className="flex-1 py-3 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                Atla
              </button>
              <button
                onClick={() => {
                  if (companyName.trim()) {
                    try {
                      const existing = JSON.parse(localStorage.getItem("santiyem_company") || "{}");
                      localStorage.setItem("santiyem_company", JSON.stringify({ ...existing, name: companyName.trim(), phone: phone.trim() }));
                    } catch {}
                  }
                  setStep(3);
                }}
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-white"
                style={{ backgroundColor: "#FF6B2B" }}
              >
                Devam →
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-foreground text-center" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              İlk projenizi ekleyin
            </h2>
            <p className="text-sm text-muted-foreground text-center">
              Proje adı ve müşteri bilgisini girin, hemen başlayın.
            </p>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Proje Adı</label>
                <input
                  value={projectName}
                  onChange={e => setProjectName(e.target.value)}
                  placeholder="örn: Villa Projesi - Çeşme"
                  className="w-full px-3 py-3 rounded-lg text-sm bg-background border border-border text-foreground placeholder:text-muted-foreground outline-none focus:border-[#FF6B2B]"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Müşteri Adı</label>
                <input
                  value={clientName}
                  onChange={e => setClientName(e.target.value)}
                  placeholder="örn: Mehmet Bey / ABC Yapı A.Ş."
                  className="w-full px-3 py-3 rounded-lg text-sm bg-background border border-border text-foreground placeholder:text-muted-foreground outline-none focus:border-[#FF6B2B]"
                />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleClose}
                className="flex-1 py-3 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                Daha Sonra
              </button>
              <button
                onClick={handleCreateProject}
                disabled={!projectName.trim() || !clientName.trim()}
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-40"
                style={{ backgroundColor: "#FF6B2B" }}
              >
                Projeyi Oluştur ve Başla
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OnboardingModal;
