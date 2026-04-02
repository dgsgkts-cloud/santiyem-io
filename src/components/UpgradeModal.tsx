import { useState, useCallback } from "react";
import { Check, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";
import { toast } from "sonner";

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  feature: string;
  requiresOffice?: boolean;
}

const UpgradeModal = ({ open, onClose, feature, requiresOffice }: UpgradeModalProps) => {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const { user } = useUser();

  const handlePurchase = useCallback(async (planKey: string) => {
    if (!user) {
      toast.error("Lütfen önce giriş yapın");
      return;
    }
    setLoadingPlan(planKey);
    try {
      const { data, error } = await supabase.functions.invoke("create-iyzico-payment", {
        body: { planKey, yearly: false },
      });
      if (error || data?.error) {
        toast.error(data?.error || "Ödeme başlatılamadı");
        return;
      }
      onClose();
      // Inject iyzico checkout form
      let checkoutDiv = document.getElementById("iyzico-checkout-container-modal");
      if (!checkoutDiv) {
        checkoutDiv = document.createElement("div");
        checkoutDiv.id = "iyzico-checkout-container-modal";
        checkoutDiv.className = "fixed inset-0 z-[300] bg-black/80 flex items-center justify-center p-4";
        document.body.appendChild(checkoutDiv);
      }
      checkoutDiv.innerHTML = data.checkoutFormContent;
      checkoutDiv.style.display = "flex";
      const scripts = checkoutDiv.querySelectorAll("script");
      scripts.forEach((oldScript) => {
        const newScript = document.createElement("script");
        if (oldScript.src) newScript.src = oldScript.src;
        else newScript.textContent = oldScript.textContent;
        document.body.appendChild(newScript);
      });
    } catch (err) {
      console.error(err);
      toast.error("Ödeme başlatılırken bir hata oluştu");
    } finally {
      setLoadingPlan(null);
    }
  }, [user, onClose]);

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-[200] bg-black/60" onClick={onClose} />
      <div className="fixed inset-0 z-[201] flex items-center justify-center p-4">
        <div className="w-full max-w-sm rounded-2xl border border-white/10 p-6" style={{ backgroundColor: "#1A1F2E" }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white">Planınızı Yükseltin</h3>
            <button onClick={onClose} className="text-white/40 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-sm text-white/60 mb-4">
            <strong className="text-white">{feature}</strong>{" "}
            özelliğine erişmek için planınızı yükseltmeniz gerekir.
          </p>
          <div className="space-y-2 mb-6">
            {(requiresOffice
              ? ["Ekip görevi atama", "Ortak proje takibi", "Sınırsız hakediş", "AI Proje Analizi", "Öncelikli destek"]
              : ["Sınırsız AI Asistan", "1 proje · 3 hakediş/ay", "Şantiye günlüğü — sınırsız", "PDF — firma başlığı + imza alanı"]
            ).map((f, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-white/80">
                <Check className="w-4 h-4 text-green-500" /> {f}
              </div>
            ))}
          </div>
          <div className="space-y-2">
            <Button
              onClick={() => handlePurchase("pro")}
              disabled={loadingPlan !== null}
              className="w-full h-11 font-semibold text-white"
              style={{ backgroundColor: "#FF6B2B" }}
            >
              {loadingPlan === "pro" && <Loader2 size={16} className="animate-spin mr-1" />}
              Profesyonel'e Geç — 499₺/ay
            </Button>
            {requiresOffice && (
              <Button
                onClick={() => handlePurchase("team")}
                disabled={loadingPlan !== null}
                className="w-full h-11 font-semibold bg-transparent border border-[#FF6B2B] text-[#FF6B2B] hover:bg-[#FF6B2B]/10"
              >
                {loadingPlan === "team" && <Loader2 size={16} className="animate-spin mr-1" />}
                Ekip Planı — 1.499₺/ay
              </Button>
            )}
            <p className="text-center text-xs text-white/40">14 gün ücretsiz deneme</p>
          </div>
        </div>
      </div>
    </>
  );
};

export default UpgradeModal;
