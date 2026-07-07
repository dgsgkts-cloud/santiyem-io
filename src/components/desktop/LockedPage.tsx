// Sprint 28.6 — Premium locked-state page.
// Rendered by the central access guard for any tab the user can't currently
// access. Presents a clear reason and next-step actions (upgrade / setup /
// dashboard) instead of a bare 404.

import { Lock, HardHat, Sparkles, ArrowRight, Home, MessageCircle, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { LockReason } from "@/lib/accessControl";

interface LockedPageProps {
  reason: Exclude<LockReason, "ok" | "loading">;
  moduleName: string;
  setupPercent?: number;
}

const nav = (tab: string) =>
  window.dispatchEvent(new CustomEvent("navigate-tab", { detail: tab }));

const openWorkspaceSetup = () => {
  window.dispatchEvent(new CustomEvent("open-workspace-setup"));
  nav("dashboard");
};

const openContact = () => {
  const w = window.open("https://wa.me/905333771156", "_blank", "noopener,noreferrer");
  if (!w) window.location.href = "mailto:destek@santiyem.io";
};

const LockedPage = ({ reason, moduleName, setupPercent = 0 }: LockedPageProps) => {
  const isSetup = reason === "setup-required";
  const isExpired = reason === "subscription-expired";

  const title = isSetup
    ? "🏗 Kurulum Tamamlanmadı"
    : isExpired
      ? "🔒 Denemeniz Sona Erdi"
      : "🔒 Özellik Kullanılamıyor";

  const description = isSetup
    ? `${moduleName} modülü, şirket kurulumunuzu tamamladıktan sonra kullanılabilir. Firma bilgileri, projeler ve finansal ayarlar tamamlandığında bu modül otomatik olarak açılır.`
    : isExpired
      ? `${moduleName} modülüne erişebilmek için aktif bir abonelik gerekiyor. Plan yükseltmesi veya ödeme sonrası özellik anında açılır.`
      : `${moduleName} modülü mevcut planınızda kullanılamıyor. Daha üst bir plana yükselterek anında erişim sağlayabilirsiniz.`;

  const Icon = isSetup ? HardHat : isExpired ? Sparkles : Lock;
  const accent = isSetup ? "#3B82F6" : isExpired ? "#EF4444" : "#FF6B2B";

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        <div
          className="rounded-2xl border border-border bg-card overflow-hidden shadow-2xl"
          style={{ background: `linear-gradient(180deg, ${accent}0F 0%, transparent 40%), hsl(var(--card))` }}
        >
          {/* Illustration header */}
          <div className="flex flex-col items-center pt-10 pb-6 px-6 text-center relative">
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center mb-5 relative"
              style={{ backgroundColor: `${accent}1A`, boxShadow: `0 0 40px ${accent}33` }}
            >
              <Icon className="w-10 h-10" style={{ color: accent }} />
              <span
                className="absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-white text-[11px] font-bold"
                style={{ backgroundColor: accent }}
              >
                <Lock className="w-3 h-3" />
              </span>
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              {title}
            </h1>
            <p className="text-sm text-muted-foreground max-w-md leading-relaxed">{description}</p>

            {isSetup && (
              <div className="mt-5 w-full max-w-sm">
                <div className="flex items-center justify-between text-[11px] mb-1.5">
                  <span className="text-muted-foreground uppercase tracking-wider font-semibold">Kurulum İlerlemesi</span>
                  <span className="font-mono font-semibold" style={{ color: accent }}>%{setupPercent}</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: "hsl(var(--muted))" }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${setupPercent}%`, background: `linear-gradient(90deg, ${accent}, ${accent}CC)` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="px-6 pb-8 pt-2 flex flex-col sm:flex-row gap-3 justify-center">
            {isSetup ? (
              <>
                <Button onClick={openWorkspaceSetup} className="gap-2" style={{ backgroundColor: accent, color: "#FFF" }}>
                  <HardHat className="w-4 h-4" /> Kuruluma Git <ArrowRight className="w-4 h-4" />
                </Button>
                <Button variant="outline" onClick={() => nav("dashboard")} className="gap-2">
                  <Home className="w-4 h-4" /> Ana Sayfa
                </Button>
              </>
            ) : (
              <>
                <Button onClick={() => nav("pricing")} className="gap-2" style={{ backgroundColor: accent, color: "#FFF" }}>
                  <Sparkles className="w-4 h-4" /> Planı Yükselt
                </Button>
                <Button variant="outline" onClick={() => nav("pricing")} className="gap-2">
                  <CreditCard className="w-4 h-4" /> Ödeme Yap
                </Button>
                <Button variant="ghost" onClick={openContact} className="gap-2">
                  <MessageCircle className="w-4 h-4" /> İletişime Geç
                </Button>
              </>
            )}
          </div>

          {/* Fine print */}
          <div
            className="px-6 py-3 border-t border-border text-[11px] text-muted-foreground flex items-center justify-between"
            style={{ backgroundColor: "hsl(var(--muted) / 0.3)" }}
          >
            <span>
              {isSetup
                ? "Kurulumu tamamladığınızda tüm operasyonel modüller otomatik açılır."
                : "Plan yükseltme anında etkinleşir. İptal ya da soru için 7/24 destek."}
            </span>
            <button onClick={() => nav("dashboard")} className="underline hover:text-foreground transition-colors">
              Dashboard'a dön
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LockedPage;
