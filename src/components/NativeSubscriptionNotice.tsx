import { Lock } from "lucide-react";
import { NATIVE_SUB_NOTICE } from "@/lib/nativeGuards";

/**
 * Plain, non-clickable subscription notice for native (iOS/Android) builds.
 * No links, no buttons — Apple IAP rules forbid steering to external payment.
 */
const NativeSubscriptionNotice = ({ variant = "panel" }: { variant?: "panel" | "inline" }) => {
  if (variant === "inline") {
    return (
      <p className="text-sm text-muted-foreground text-center leading-relaxed px-4 py-3 select-text">
        {NATIVE_SUB_NOTICE}
      </p>
    );
  }
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="max-w-sm w-full rounded-2xl border border-border bg-card p-6 text-center">
        <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
          <Lock className="w-5 h-5 text-muted-foreground" />
        </div>
        <h3 className="text-base font-semibold text-foreground mb-2">Abonelik gerekli</h3>
        <p className="text-sm text-muted-foreground leading-relaxed select-text">
          {NATIVE_SUB_NOTICE}
        </p>
      </div>
    </div>
  );
};

export default NativeSubscriptionNotice;
