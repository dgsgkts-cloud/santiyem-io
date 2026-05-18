import { useState, useCallback, useEffect, useRef } from "react";
import { Check, X, Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";
import { toast } from "sonner";
import { cleanupIyzicoOverlay, listenForIyzicoClose } from "@/lib/iyzicoCleanup";
import { isNativePlatform, openIyzicoCheckoutNative } from "@/lib/iyzicoCheckout";

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
  const [trialUsed, setTrialUsed] = useState(false);
  const [trialCheckLoading, setTrialCheckLoading] = useState(true);
  const { user } = useUser();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const cleanup = listenForIyzicoClose();
    return cleanup;
  }, []);

  useEffect(() => {
    if (!user || !open) return;
    let cancelled = false;
    setTrialCheckLoading(true);
    (async () => {
      try {
        const { data, error } = await supabase
          .from("user_subscriptions")
          .select("status, trial_start, trial_end")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (cancelled) return;
        if (error) {
          toast.error("Deneme durumu kontrol edilemedi, lütfen tekrar deneyin.");
        } else if (data && (data.trial_start || data.trial_end || ["trialing","trial_expired","expired","cancelled","active"].includes(data.status))) {
          setTrialUsed(true);
        }
      } catch {
        if (!cancelled) toast.error("Deneme durumu kontrol edilemedi, lütfen tekrar deneyin.");
      } finally {
        if (!cancelled) setTrialCheckLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user, open]);

  // Focus trap + ESC close
  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    closeBtnRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); onClose(); return; }
      if (e.key !== "Tab" || !dialogRef.current) return;
      const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previouslyFocused?.focus?.();
    };
  }, [open, onClose]);

  const goToPlans = () => {
    onClose();
    try { sessionStorage.setItem("pricing_open_compare", "1"); } catch {}
    window.dispatchEvent(new CustomEvent("navigate-tab", { detail: "pricing" }));
  };

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
      const native = isNativePlatform();
      const { data, error } = await supabase.functions.invoke("create-trial-payment", {
        body: { planKey, yearly: false, native },
      });
      if (error || data?.error) { toast.error(data?.error || "İşlem başlatılamadı"); return; }
      const handled = await openIyzicoCheckoutNative(data);
      if (handled) { onClose(); return; }
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
      const native = isNativePlatform();
      const { data, error } = await supabase.functions.invoke("create-iyzico-payment", {
        body: { planKey, yearly: false, native },
      });
      if (error || data?.error) { toast.error(data?.error || "Ödeme başlatılamadı"); return; }
      const handled = await openIyzicoCheckoutNative(data);
      if (handled) { onClose(); return; }
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
      <div className="fixed inset-0 z-[200] bg-black/60" onClick={onClose} aria-hidden="true" />
      <div className="fixed inset-0 z-[201] flex items-center justify-center p-4 overflow-y-auto">
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="upgrade-modal-title"
          className="w-full max-w-sm sm:max-w-md rounded-2xl border border-white/10 p-5 sm:p-6 my-auto outline-none"
          style={{ backgroundColor: "#1A1F2E" }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 id="upgrade-modal-title" className="text-base sm:text-lg font-bold text-white">Planınızı Yükseltin</h3>
            <button
              ref={closeBtnRef}
              onClick={onClose}
              aria-label="Kapat"
              className="text-white/40 hover:text-white p-2 -m-2 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-sm text-white/60 mb-4">
            <strong className="text-white">{feature}</strong>{" "}
            özelliğine erişmek için planınızı yükseltmeniz gerekir.
          </p>
          <div className="space-y-2 mb-5">
            {(requiresOffice
              ? ["Ekip görevi atama", "Ortak proje takibi", "Sınırsız hakediş", "AI Proje Analizi", "Öncelikli destek"]
              : ["Sınırsız AI Asistan", "Sınırsız aktif proje · 3 hakediş/ay", "Şantiye günlüğü — sınırsız", "PDF — firma başlığı + imza alanı"]
            ).map((f, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-white/80">
                <Check className="w-4 h-4 text-green-500 shrink-0" /> <span>{f}</span>
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-2">
            {trialCheckLoading ? (
              <div className="w-full h-11 rounded-md bg-white/5 flex items-center justify-center text-sm text-white/60">
                <Loader2 size={16} className="animate-spin mr-2" /> Deneme durumu kontrol ediliyor…
              </div>
            ) : (
              <>
                {!trialUsed && (
                  <Button
                    onClick={() => handleTrial(planKey)}
                    disabled={loadingPlan !== null}
                    className="w-full h-11 font-semibold text-white focus-visible:ring-2 focus-visible:ring-white/40"
                    style={{ backgroundColor: "#FF6B2B" }}
                  >
                    {loadingPlan === `trial-${planKey}` && <Loader2 size={16} className="animate-spin mr-1" />}
                    14 Gün Ücretsiz Dene — {planName}
                  </Button>
                )}
                <Button
                  onClick={() => handleDirectPurchase(planKey)}
                  disabled={loadingPlan !== null}
                  className={`w-full h-11 font-semibold text-white focus-visible:ring-2 focus-visible:ring-white/40 ${trialUsed ? "" : "bg-transparent border border-white/20 hover:bg-white/5"}`}
                  style={trialUsed ? { backgroundColor: "#FF6B2B" } : undefined}
                >
                  {loadingPlan === `direct-${planKey}` && <Loader2 size={16} className="animate-spin mr-1" />}
                  Hemen Başla — {planPrice}₺/ay
                </Button>
              </>
            )}
            <button
              onClick={goToPlans}
              disabled={loadingPlan !== null}
              className="w-full h-11 sm:h-10 text-sm text-white/70 hover:text-white inline-flex items-center justify-center gap-1.5 transition rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 disabled:opacity-50"
            >
              Tüm Planları Gör <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <div className="mt-3 p-3 rounded-lg border border-white/10" style={{ backgroundColor: "rgba(255,107,43,0.05)" }}>
              <p className="text-xs text-white/70 text-center leading-relaxed">
                {!trialUsed ? (
                  <>
                    🔒 <strong className="text-white">Kartınızı doğrulamak için 1₺ tahsil edilecek, hemen iade edilecektir.</strong><br />
                    14 gün sonra aylık ₺{planPrice} otomatik tahsil edilir.<br />
                    İstediğiniz zaman iptal edebilirsiniz.<br />
                    <strong className="text-orange-400">⚠️ Ödeme formunda "Kartımı Kaydet" kutucuğunu mutlaka işaretleyin — aksi halde deneme başlatılamaz.</strong>
                  </>
                ) : (
                  <>
                    🔒 Aylık ₺{planPrice} tahsil edilir. İstediğiniz zaman iptal edebilirsiniz.
                  </>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default UpgradeModal;
