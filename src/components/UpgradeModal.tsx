import { useState, useCallback, useEffect } from "react";
import { Check, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";
import { toast } from "sonner";
import { cleanupIyzicoOverlay, listenForIyzicoClose } from "@/lib/iyzicoCleanup";

const PAYMENT_DISABLED = false;

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  feature: string;
  requiresOffice?: boolean;
}

const UpgradeModal = ({ open, onClose, feature, requiresOffice }: UpgradeModalProps) => {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [showPaymentDisabled, setShowPaymentDisabled] = useState(false);
  const { user } = useUser();

  useEffect(() => {
    const cleanup = listenForIyzicoClose();
    return cleanup;
  }, []);

  const openCheckoutForm = (data: any) => {
    onClose();
    // Clean any previous iyzico elements first
    cleanupIyzicoOverlay();

    const checkoutDiv = document.createElement("div");
    checkoutDiv.id = "iyzico-checkout-container-modal";
    checkoutDiv.style.cssText = "position:fixed;inset:0;z-index:300;background:rgba(0,0,0,0.8);display:flex;align-items:center;justify-content:center;padding:16px;";
    document.body.appendChild(checkoutDiv);

    checkoutDiv.innerHTML = data.checkoutFormContent;
    checkoutDiv.onclick = (e) => {
      if (e.target === checkoutDiv) cleanupIyzicoOverlay();
    };
    const scripts = checkoutDiv.querySelectorAll("script");
    scripts.forEach((oldScript) => {
      const newScript = document.createElement("script");
      if (oldScript.src) newScript.src = oldScript.src;
      else newScript.textContent = oldScript.textContent;
      document.body.appendChild(newScript);
    });
  };

  const handleTrial = useCallback(async (planKey: string) => {
    if (PAYMENT_DISABLED) { setShowPaymentDisabled(true); onClose(); return; }
    if (!user) { toast.error("Lütfen önce giriş yapın"); return; }
    setLoadingPlan(`trial-${planKey}`);
    try {
      const { data, error } = await supabase.functions.invoke("create-trial-payment", {
        body: { planKey, yearly: false },
      });
      if (error || data?.error) { toast.error(data?.error || "İşlem başlatılamadı"); return; }
      openCheckoutForm(data);
    } catch (err) {
      console.error(err);
      toast.error("İşlem başlatılırken bir hata oluştu");
    } finally { setLoadingPlan(null); }
  }, [user, onClose]);

  const handleDirectPurchase = useCallback(async (planKey: string) => {
    if (PAYMENT_DISABLED) { setShowPaymentDisabled(true); onClose(); return; }
    if (!user) { toast.error("Lütfen önce giriş yapın"); return; }
    setLoadingPlan(`direct-${planKey}`);
    try {
      const { data, error } = await supabase.functions.invoke("create-iyzico-payment", {
        body: { planKey, yearly: false },
      });
      if (error || data?.error) { toast.error(data?.error || "Ödeme başlatılamadı"); return; }
      openCheckoutForm(data);
    } catch (err) {
      console.error(err);
      toast.error("Ödeme başlatılırken bir hata oluştu");
    } finally { setLoadingPlan(null); }
  }, [user, onClose]);

  if (!open && !showPaymentDisabled) return null;

  const planKey = requiresOffice ? "team" : "pro";
  const planPrice = requiresOffice ? "1.499" : "499";
  const planName = requiresOffice ? "Ekip" : "Profesyonel";

  if (showPaymentDisabled) {
    return (
      <>
        <div className="fixed inset-0 z-[200] bg-black/60" onClick={() => setShowPaymentDisabled(false)} />
        <div className="fixed inset-0 z-[201] flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 text-center">
            <h3 className="text-lg font-bold text-foreground mb-3">Ödeme Sistemi Güncelleniyor</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Ödeme sistemimiz yakında aktif olacak. Şu an ücretsiz planla kullanmaya devam edebilirsiniz.
              Bilgilendirilmek için{" "}
              <a href="mailto:info@santiyem.io" className="text-primary underline">info@santiyem.io</a>{" "}
              adresine e-posta gönderin.
            </p>
            <Button onClick={() => setShowPaymentDisabled(false)} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
              Tamam
            </Button>
          </div>
        </div>
      </>
    );
  }

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
              : ["Sınırsız AI Asistan", "Sınırsız aktif proje · 3 hakediş/ay", "Şantiye günlüğü — sınırsız", "PDF — firma başlığı + imza alanı"]
            ).map((f, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-white/80">
                <Check className="w-4 h-4 text-green-500" /> {f}
              </div>
            ))}
          </div>
          <div className="space-y-2">
            <Button
              onClick={() => handleTrial(planKey)}
              disabled={loadingPlan !== null}
              className="w-full h-11 font-semibold text-white"
              style={{ backgroundColor: "#FF6B2B" }}
            >
              {loadingPlan === `trial-${planKey}` && <Loader2 size={16} className="animate-spin mr-1" />}
              14 Gün Ücretsiz Dene — {planName}
            </Button>
            <Button
              onClick={() => handleDirectPurchase(planKey)}
              disabled={loadingPlan !== null}
              className="w-full h-11 font-semibold bg-transparent border border-white/20 text-white hover:bg-white/5"
            >
              {loadingPlan === `direct-${planKey}` && <Loader2 size={16} className="animate-spin mr-1" />}
              Hemen Başla — {planPrice}₺/ay
            </Button>
            <div className="mt-3 p-3 rounded-lg border border-white/10" style={{ backgroundColor: "rgba(255,107,43,0.05)" }}>
              <p className="text-xs text-white/70 text-center leading-relaxed">
                🔒 <strong className="text-white">Bugün ücret alınmaz.</strong> Kartınız güvenle kaydedilir.<br />
                14 gün sonra aylık ₺{planPrice} otomatik tahsil edilir.<br />
                İstediğiniz zaman iptal edebilirsiniz.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default UpgradeModal;
