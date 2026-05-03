import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";
import { Button } from "@/components/ui/button";
import { Clock, AlertTriangle, Sparkles } from "lucide-react";
import UpgradeModal from "@/components/UpgradeModal";

const PAID_STATUSES = new Set(["active", "cancelled"]);

const TrialBanner = () => {
  const { user, plan } = useUser();
  const [loading, setLoading] = useState(true);
  const [trialEnd, setTrialEnd] = useState<Date | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [planName, setPlanName] = useState<string>("");
  const [showUpgrade, setShowUpgrade] = useState(false);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("user_subscriptions")
        .select("status, trial_end, plan_name")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cancelled) return;
      if (data) {
        setStatus(data.status);
        setTrialEnd(data.trial_end ? new Date(data.trial_end) : null);
        setPlanName(data.plan_name || "");
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user]);

  if (loading) return null;

  // Already paid → never show
  if (plan && plan !== "free" && status && PAID_STATUSES.has(status)) return null;
  if (status === "active") return null;

  // No subscription record at all → no trial yet, don't show
  if (!trialEnd) return null;

  const now = new Date();
  const msLeft = trialEnd.getTime() - now.getTime();
  const daysLeft = Math.max(0, Math.ceil(msLeft / 86400000));
  const expired = msLeft <= 0;

  // Color levels
  let tone: "ok" | "warn" | "danger" | "expired" = "ok";
  if (expired) tone = "expired";
  else if (daysLeft <= 3) tone = "danger";
  else if (daysLeft < 7) tone = "warn";

  const styles = {
    ok:      { bar: "border-primary/30 bg-primary/5",          text: "text-primary",     icon: "text-primary",     dot: "#FF6B2B" },
    warn:    { bar: "border-amber-500/40 bg-amber-500/5",      text: "text-amber-500",   icon: "text-amber-500",   dot: "#F59E0B" },
    danger:  { bar: "border-red-500/40 bg-red-500/5",          text: "text-red-500",     icon: "text-red-500",     dot: "#EF4444" },
    expired: { bar: "border-red-500/60 bg-red-500/10",         text: "text-red-500",     icon: "text-red-500",     dot: "#EF4444" },
  }[tone];

  const Icon = expired || tone === "danger" ? AlertTriangle : Clock;

  return (
    <>
      <div
        className={`rounded-xl border ${styles.bar} px-4 py-3 lg:py-3.5 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4`}
        role="status"
      >
        <div className="flex items-start sm:items-center gap-3 flex-1 min-w-0">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: `${styles.dot}1A` }}
          >
            <Icon className={`w-4 h-4 ${styles.icon}`} />
          </div>
          <div className="min-w-0 flex-1">
            {expired ? (
              <>
                <div className={`text-sm font-semibold ${styles.text}`}>
                  Denemeniz sona erdi
                </div>
                <div className="text-[12px] text-muted-foreground mt-0.5">
                  Tüm özelliklere erişmek için bir plan seçin.
                </div>
              </>
            ) : (
              <>
                <div className={`text-sm font-semibold ${styles.text}`}>
                  Denemenizin bitmesine {daysLeft} gün kaldı
                </div>
                <div className="text-[12px] text-muted-foreground mt-0.5">
                  {planName ? `${planName} planı ` : ""}deneme süreniz{" "}
                  {trialEnd.toLocaleDateString("tr-TR", { day: "numeric", month: "long" })} tarihinde sona erecek.
                </div>
              </>
            )}
          </div>
        </div>
        <Button
          size="sm"
          className="w-full sm:w-auto shrink-0 min-h-[44px] sm:min-h-0"
          variant={expired ? "default" : tone === "danger" ? "default" : "outline"}
          onClick={() => setShowUpgrade(true)}
        >
          <Sparkles className="w-3.5 h-3.5 mr-1" />
          {expired ? "Planı Yükselt" : "Planımı Yükselt"}
        </Button>
      </div>

      <UpgradeModal
        open={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        feature="Aboneliğinizi başlatmak için bir plan seçin"
        requiresOffice={false}
      />
    </>
  );
};

export default TrialBanner;
